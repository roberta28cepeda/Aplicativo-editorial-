"use client";

import { useMemo, useState } from "react";
import PostModal from "@/components/PostModal";
import type { Idea, Post } from "@/types/db";
import { POST_STATUS_COLOR, POST_STATUS_LABEL } from "@/types/db";

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MONTHS = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

function pad(n: number) {
  return n.toString().padStart(2, "0");
}

function toISODate(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function buildMonthGrid(monthStart: Date) {
  const firstWeekday = monthStart.getDay();
  const gridStart = new Date(monthStart);
  gridStart.setDate(gridStart.getDate() - firstWeekday);

  const days: Date[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    days.push(d);
  }
  return days;
}

export default function CalendarClient({
  initialPosts,
  ideas,
  userId,
}: {
  initialPosts: Post[];
  ideas: Idea[];
  userId: string;
}) {
  const [posts, setPosts] = useState<Post[]>(initialPosts);
  const [monthStart, setMonthStart] = useState(() => startOfMonth(new Date()));
  const [modalState, setModalState] = useState<{
    open: boolean;
    post: Post | null;
    defaultDate: string | null;
  }>({ open: false, post: null, defaultDate: null });

  const today = toISODate(new Date());
  const days = useMemo(() => buildMonthGrid(monthStart), [monthStart]);

  const postsByDate = useMemo(() => {
    const map = new Map<string, Post[]>();
    for (const post of posts) {
      if (!post.scheduled_date) continue;
      const list = map.get(post.scheduled_date) ?? [];
      list.push(post);
      map.set(post.scheduled_date, list);
    }
    return map;
  }, [posts]);

  const unscheduled = useMemo(
    () => posts.filter((p) => !p.scheduled_date),
    [posts],
  );

  function openNewPost(date: string) {
    setModalState({ open: true, post: null, defaultDate: date });
  }

  function openEditPost(post: Post) {
    setModalState({ open: true, post, defaultDate: null });
  }

  function closeModal() {
    setModalState({ open: false, post: null, defaultDate: null });
  }

  function handleSaved(saved: Post) {
    setPosts((prev) => {
      const exists = prev.some((p) => p.id === saved.id);
      return exists
        ? prev.map((p) => (p.id === saved.id ? saved : p))
        : [saved, ...prev];
    });
    closeModal();
  }

  function handleDeleted(id: string) {
    setPosts((prev) => prev.filter((p) => p.id !== id));
    closeModal();
  }

  function changeMonth(offset: number) {
    setMonthStart((prev) => {
      const next = new Date(prev);
      next.setMonth(next.getMonth() + offset);
      return startOfMonth(next);
    });
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6 lg:flex-row">
      <div className="flex-1">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-xl font-semibold">
            {MONTHS[monthStart.getMonth()]} {monthStart.getFullYear()}
          </h1>
          <div className="flex items-center gap-1">
            <button
              onClick={() => changeMonth(-1)}
              className="rounded-md border border-neutral-200 px-2 py-1 text-sm hover:bg-neutral-100"
            >
              ‹
            </button>
            <button
              onClick={() => setMonthStart(startOfMonth(new Date()))}
              className="rounded-md border border-neutral-200 px-2 py-1 text-xs hover:bg-neutral-100"
            >
              Hoje
            </button>
            <button
              onClick={() => changeMonth(1)}
              className="rounded-md border border-neutral-200 px-2 py-1 text-sm hover:bg-neutral-100"
            >
              ›
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 overflow-hidden rounded-lg border border-neutral-200 bg-white">
          {WEEKDAYS.map((day) => (
            <div
              key={day}
              className="border-b border-neutral-200 bg-neutral-50 px-2 py-1.5 text-center text-xs font-medium text-neutral-500"
            >
              {day}
            </div>
          ))}

          {days.map((day) => {
            const iso = toISODate(day);
            const isCurrentMonth = day.getMonth() === monthStart.getMonth();
            const dayPosts = postsByDate.get(iso) ?? [];

            return (
              <div
                key={iso}
                className={`group relative min-h-[100px] border-b border-r border-neutral-100 p-1.5 last:border-r-0 ${
                  isCurrentMonth ? "bg-white" : "bg-neutral-50"
                }`}
              >
                <div className="mb-1 flex items-center justify-between">
                  <span
                    className={`text-xs ${
                      iso === today
                        ? "flex h-5 w-5 items-center justify-center rounded-full bg-neutral-900 font-semibold text-white"
                        : isCurrentMonth
                          ? "text-neutral-600"
                          : "text-neutral-300"
                    }`}
                  >
                    {day.getDate()}
                  </span>
                  <button
                    onClick={() => openNewPost(iso)}
                    className="hidden rounded px-1 text-xs text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 group-hover:block"
                  >
                    +
                  </button>
                </div>

                <div className="flex flex-col gap-1">
                  {dayPosts.map((post) => (
                    <button
                      key={post.id}
                      onClick={() => openEditPost(post)}
                      className={`truncate rounded px-1.5 py-0.5 text-left text-[11px] font-medium ${POST_STATUS_COLOR[post.status]}`}
                      title={post.title}
                    >
                      {post.title}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <aside className="w-full shrink-0 lg:w-64">
        <h2 className="mb-2 text-sm font-semibold text-neutral-700">
          Sem data definida ({unscheduled.length})
        </h2>
        <div className="flex flex-col gap-2">
          {unscheduled.length === 0 && (
            <p className="text-xs text-neutral-400">
              Tudo por aqui já tem uma data marcada.
            </p>
          )}
          {unscheduled.map((post) => (
            <button
              key={post.id}
              onClick={() => openEditPost(post)}
              className="rounded-md border border-neutral-200 bg-white p-2 text-left hover:border-neutral-400"
            >
              <p className="truncate text-xs font-medium">{post.title}</p>
              <span
                className={`mt-1 inline-block rounded-full px-1.5 py-0.5 text-[10px] ${POST_STATUS_COLOR[post.status]}`}
              >
                {POST_STATUS_LABEL[post.status]}
              </span>
            </button>
          ))}
        </div>

        <button
          onClick={() => openNewPost(today)}
          className="mt-4 w-full rounded-md border border-dashed border-neutral-300 px-3 py-2 text-xs font-medium text-neutral-500 hover:border-neutral-400 hover:text-neutral-700"
        >
          + Novo post
        </button>
      </aside>

      {modalState.open && (
        <PostModal
          post={modalState.post}
          defaultDate={modalState.defaultDate}
          ideas={ideas}
          userId={userId}
          onClose={closeModal}
          onSaved={handleSaved}
          onDeleted={handleDeleted}
        />
      )}
    </div>
  );
}
