"use client";

import { useMemo } from "react";
import Link from "next/link";
import type { BrandProfile, Idea, Post } from "@/types/db";
import {
  BRAND_PLATFORM_COLOR,
  POST_STATUS_COLOR,
  POST_STATUS_LABEL,
} from "@/types/db";

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function startOfMonthISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

export default function DashboardClient({
  profiles,
  ideas,
  posts,
  userEmail,
}: {
  profiles: BrandProfile[];
  ideas: Idea[];
  posts: Post[];
  userEmail: string;
}) {
  const profileById = useMemo(() => {
    const map = new Map<string, BrandProfile>();
    for (const p of profiles) map.set(p.id, p);
    return map;
  }, [profiles]);

  const today = todayISO();
  const monthStart = startOfMonthISO();

  const inboxIdeasCount = ideas.filter((i) => i.status === "inbox").length;

  const upcomingPosts = useMemo(
    () =>
      posts
        .filter(
          (p) =>
            p.status !== "posted" && p.scheduled_date && p.scheduled_date >= today,
        )
        .sort((a, b) => (a.scheduled_date ?? "").localeCompare(b.scheduled_date ?? ""))
        .slice(0, 6),
    [posts, today],
  );

  const postedThisMonthCount = posts.filter(
    (p) =>
      p.status === "posted" &&
      p.scheduled_date &&
      p.scheduled_date >= monthStart,
  ).length;

  const needsArt = useMemo(
    () =>
      posts.filter(
        (p) =>
          !p.art_path &&
          p.status !== "posted" &&
          p.scheduled_date &&
          p.scheduled_date >= today,
      ),
    [posts, today],
  );

  const recentIdeas = ideas.slice(0, 5);

  const stats = [
    { label: "Perfis ativos", value: profiles.length },
    { label: "Ideias no inbox", value: inboxIdeasCount },
    { label: "Posts agendados", value: upcomingPosts.length },
    { label: "Publicados este mês", value: postedThisMonthCount },
  ];

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Visão geral</h1>
          <p className="text-sm text-ink-soft">Bem-vinda de volta, {userEmail}</p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/ideias"
            className="rounded-lg border border-line bg-cream px-3 py-2 text-xs font-medium text-ink-soft hover:bg-paper-deep"
          >
            + Nova ideia
          </Link>
          <Link
            href="/calendario"
            className="rounded-lg bg-orange px-3 py-2 text-xs font-medium text-white hover:bg-orange-deep"
          >
            + Novo post
          </Link>
        </div>
      </div>

      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((s) => (
          <div
            key={s.label}
            className="rounded-xl border border-line bg-cream p-4"
          >
            <p className="text-2xl font-semibold text-ink">{s.value}</p>
            <p className="text-xs text-ink-soft">{s.label}</p>
          </div>
        ))}
      </div>

      {needsArt.length > 0 && (
        <div className="mb-8 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <h2 className="mb-2 text-sm font-semibold text-amber-900">
            ⚠️ {needsArt.length} post(s) agendado(s) ainda sem arte
          </h2>
          <div className="flex flex-col gap-1">
            {needsArt.slice(0, 4).map((p) => (
              <div key={p.id} className="text-xs text-amber-800">
                <span className="font-medium">{p.scheduled_date}</span> —{" "}
                {p.title}
                {p.brand_profile_id && profileById.get(p.brand_profile_id) && (
                  <span> · {profileById.get(p.brand_profile_id)!.name}</span>
                )}
              </div>
            ))}
          </div>
          <Link
            href="/calendario"
            className="mt-2 inline-block text-xs font-medium text-amber-900 underline"
          >
            Resolver no calendário →
          </Link>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-ink-soft">
              Próximos posts
            </h2>
            <Link
              href="/calendario"
              className="text-xs text-blue-600 hover:underline"
            >
              Ver calendário
            </Link>
          </div>
          {upcomingPosts.length === 0 ? (
            <p className="rounded-lg border border-dashed border-line p-4 text-xs text-[#a09b8f]">
              Nada agendado ainda. Crie um post no calendário.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {upcomingPosts.map((post) => (
                <div
                  key={post.id}
                  className="flex items-center justify-between gap-2 rounded-lg border border-line bg-cream p-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink">
                      {post.title}
                    </p>
                    <p className="text-xs text-[#a09b8f]">
                      {post.scheduled_date}
                      {post.brand_profile_id &&
                        profileById.get(post.brand_profile_id) &&
                        ` · ${profileById.get(post.brand_profile_id)!.name}`}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${POST_STATUS_COLOR[post.status]}`}
                  >
                    {POST_STATUS_LABEL[post.status]}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-ink-soft">
              Ideias recentes
            </h2>
            <Link href="/ideias" className="text-xs text-blue-600 hover:underline">
              Ver todas
            </Link>
          </div>
          {recentIdeas.length === 0 ? (
            <p className="rounded-lg border border-dashed border-line p-4 text-xs text-[#a09b8f]">
              Nenhuma ideia salva ainda.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {recentIdeas.map((idea) => (
                <div
                  key={idea.id}
                  className="rounded-lg border border-line bg-cream p-3"
                >
                  <p className="truncate text-sm font-medium text-ink">
                    {idea.title}
                  </p>
                  {idea.brand_profile_id &&
                    profileById.get(idea.brand_profile_id) && (
                      <span
                        className={`mt-1 inline-block rounded-full px-1.5 py-0.5 text-[10px] font-medium ${BRAND_PLATFORM_COLOR[profileById.get(idea.brand_profile_id)!.platform]}`}
                      >
                        {profileById.get(idea.brand_profile_id)!.name}
                      </span>
                    )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {profiles.length > 0 && (
        <div className="mt-8">
          <h2 className="mb-2 text-sm font-semibold text-ink-soft">Perfis</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {profiles.map((p) => {
              const profilePosts = posts.filter((post) => post.brand_profile_id === p.id);
              const profileIdeas = ideas.filter((i) => i.brand_profile_id === p.id);
              return (
                <Link
                  key={p.id}
                  href="/perfis"
                  className="rounded-lg border border-line bg-cream p-3 hover:border-neutral-400"
                >
                  <p className="truncate text-sm font-medium">{p.name}</p>
                  <span
                    className={`mt-1 inline-block rounded-full px-1.5 py-0.5 text-[10px] ${BRAND_PLATFORM_COLOR[p.platform]}`}
                  >
                    {p.platform}
                  </span>
                  <p className="mt-2 text-[11px] text-[#a09b8f]">
                    {profilePosts.length} posts · {profileIdeas.length} ideias
                  </p>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
