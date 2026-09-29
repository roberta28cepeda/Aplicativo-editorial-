"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { uploadMedia, removeMedia } from "@/lib/supabase/storage";
import MediaThumb from "@/components/MediaThumb";
import type { BrandProfile, Idea, IdeaStatus } from "@/types/db";
import { BRAND_PLATFORM_COLOR, IDEA_STATUS_LABEL } from "@/types/db";

const FILTERS: { key: "all" | IdeaStatus; label: string }[] = [
  { key: "all", label: "Todas" },
  { key: "inbox", label: "Inbox" },
  { key: "planned", label: "Planejadas" },
  { key: "archived", label: "Arquivadas" },
];

export default function IdeasClient({
  initialIdeas,
  profiles,
  userId,
}: {
  initialIdeas: Idea[];
  profiles: BrandProfile[];
  userId: string;
}) {
  const router = useRouter();
  const [ideas, setIdeas] = useState<Idea[]>(initialIdeas);
  const [filter, setFilter] = useState<"all" | IdeaStatus>("all");
  const [profileFilter, setProfileFilter] = useState<"all" | string>("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [generatingIdeas, setGeneratingIdeas] = useState(false);
  const [generatingArtFor, setGeneratingArtFor] = useState<string | null>(
    null,
  );

  const [title, setTitle] = useState("");
  const [brandProfileId, setBrandProfileId] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const profileById = useMemo(() => {
    const map = new Map<string, BrandProfile>();
    for (const p of profiles) map.set(p.id, p);
    return map;
  }, [profiles]);

  const visibleIdeas = useMemo(() => {
    return ideas.filter((i) => {
      if (filter !== "all" && i.status !== filter) return false;
      if (profileFilter !== "all" && i.brand_profile_id !== profileFilter)
        return false;
      return true;
    });
  }, [ideas, filter, profileFilter]);

  function resetForm() {
    setTitle("");
    setBrandProfileId("");
    setSourceUrl("");
    setNotes("");
    setTagsInput("");
    setFile(null);
  }

  async function handleAddIdea(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const supabase = createClient();

    try {
      let image_path: string | null = null;
      if (file) {
        image_path = await uploadMedia(userId, "ideas", file);
      }

      const tags = tagsInput
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      const { data, error } = await supabase
        .schema("editorial")
        .from("ideas")
        .insert({
          user_id: userId,
          brand_profile_id: brandProfileId || null,
          title: title.trim() || "Ideia sem título",
          source_url: sourceUrl.trim() || null,
          notes: notes.trim() || null,
          tags,
          image_path,
        })
        .select()
        .single();

      if (error) throw error;

      setIdeas((prev) => [data as Idea, ...prev]);
      resetForm();
      setModalOpen(false);
    } catch (err) {
      alert(
        err instanceof Error ? err.message : "Não foi possível salvar a ideia.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(idea: Idea) {
    if (!confirm(`Excluir a ideia "${idea.title}"?`)) return;
    const supabase = createClient();
    const { error } = await supabase
      .schema("editorial")
      .from("ideas")
      .delete()
      .eq("id", idea.id);

    if (error) {
      alert(error.message);
      return;
    }
    if (idea.image_path) {
      removeMedia(idea.image_path).catch(() => {});
    }
    setIdeas((prev) => prev.filter((i) => i.id !== idea.id));
  }

  async function handleArchiveToggle(idea: Idea) {
    const newStatus: IdeaStatus =
      idea.status === "archived" ? "inbox" : "archived";
    const supabase = createClient();
    const { error } = await supabase
      .schema("editorial")
      .from("ideas")
      .update({ status: newStatus })
      .eq("id", idea.id);

    if (error) {
      alert(error.message);
      return;
    }
    setIdeas((prev) =>
      prev.map((i) => (i.id === idea.id ? { ...i, status: newStatus } : i)),
    );
  }

  async function handleUseInCalendar(idea: Idea) {
    const supabase = createClient();
    const { error } = await supabase.schema("editorial").from("posts").insert({
      user_id: userId,
      idea_id: idea.id,
      brand_profile_id: idea.brand_profile_id,
      title: idea.title,
      caption: idea.notes,
      tags: idea.tags,
      status: "idea",
    });

    if (error) {
      alert(error.message);
      return;
    }

    await supabase
      .schema("editorial")
      .from("ideas")
      .update({ status: "planned" })
      .eq("id", idea.id);

    setIdeas((prev) =>
      prev.map((i) => (i.id === idea.id ? { ...i, status: "planned" } : i)),
    );
    router.push("/calendario");
  }

  async function handleGenerateIdeas() {
    if (profileFilter === "all") return;
    setGeneratingIdeas(true);
    try {
      const res = await fetch("/api/ai/ideas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brand_profile_id: profileFilter }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Falha ao gerar ideias.");
      setIdeas((prev) => [...body.ideas, ...prev]);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Falha ao gerar ideias.");
    } finally {
      setGeneratingIdeas(false);
    }
  }

  async function handleGenerateArt(idea: Idea) {
    setGeneratingArtFor(idea.id);
    try {
      const res = await fetch("/api/ai/art", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target: "idea", id: idea.id }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Falha ao gerar arte.");
      setIdeas((prev) =>
        prev.map((i) => (i.id === idea.id ? (body.record as Idea) : i)),
      );
    } catch (err) {
      alert(err instanceof Error ? err.message : "Falha ao gerar arte.");
    } finally {
      setGeneratingArtFor(null);
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Banco de ideias</h1>
          <p className="text-sm text-neutral-500">
            Salve posts do Instagram (link ou print) e outras inspirações aqui.
          </p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700"
        >
          + Nova ideia
        </button>
      </div>

      <div className="mb-3 flex flex-wrap gap-1">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
              filter === f.key
                ? "bg-neutral-900 text-white"
                : "bg-white text-neutral-600 hover:bg-neutral-100"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {profiles.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-1">
          <button
            onClick={() => setProfileFilter("all")}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
              profileFilter === "all"
                ? "bg-neutral-900 text-white"
                : "bg-white text-neutral-600 hover:bg-neutral-100"
            }`}
          >
            Todos os perfis
          </button>
          {profiles.map((p) => (
            <button
              key={p.id}
              onClick={() => setProfileFilter(p.id)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                profileFilter === p.id
                  ? "bg-neutral-900 text-white"
                  : "bg-white text-neutral-600 hover:bg-neutral-100"
              }`}
            >
              {p.name}
            </button>
          ))}
          {profileFilter !== "all" && (
            <button
              onClick={handleGenerateIdeas}
              disabled={generatingIdeas}
              className="rounded-md bg-violet-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-violet-500 disabled:opacity-50"
            >
              {generatingIdeas
                ? "Gerando..."
                : "✨ Gerar 5 ideias com IA para este perfil"}
            </button>
          )}
        </div>
      )}

      {visibleIdeas.length === 0 ? (
        <div className="rounded-lg border border-dashed border-neutral-300 p-10 text-center text-sm text-neutral-500">
          Nenhuma ideia aqui ainda. Clique em &quot;+ Nova ideia&quot; para
          colar um link do Instagram ou subir um print de um post salvo.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visibleIdeas.map((idea) => (
            <div
              key={idea.id}
              className="flex flex-col overflow-hidden rounded-lg border border-neutral-200 bg-white"
            >
              <MediaThumb
                path={idea.image_path}
                alt={idea.title}
                className="h-40 w-full object-cover"
              />
              <div className="flex flex-1 flex-col gap-2 p-3">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-sm font-semibold leading-snug">
                    {idea.title}
                  </h3>
                  <div className="flex shrink-0 gap-1">
                    {idea.ai_generated && (
                      <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-medium text-violet-700">
                        ✨ IA
                      </span>
                    )}
                    <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-medium text-neutral-600">
                      {IDEA_STATUS_LABEL[idea.status]}
                    </span>
                  </div>
                </div>

                {idea.brand_profile_id &&
                  profileById.get(idea.brand_profile_id) && (
                    <span
                      className={`inline-block w-fit rounded-full px-1.5 py-0.5 text-[10px] font-medium ${BRAND_PLATFORM_COLOR[profileById.get(idea.brand_profile_id)!.platform]}`}
                    >
                      {profileById.get(idea.brand_profile_id)!.name}
                    </span>
                  )}

                {idea.source_url && (
                  <a
                    href={idea.source_url}
                    target="_blank"
                    rel="noreferrer"
                    className="truncate text-xs text-blue-600 hover:underline"
                  >
                    {idea.source_url}
                  </a>
                )}

                {idea.notes && (
                  <p className="line-clamp-3 text-xs text-neutral-600">
                    {idea.notes}
                  </p>
                )}

                {idea.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {idea.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] text-neutral-500"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}

                {!idea.image_path && (
                  <button
                    onClick={() => handleGenerateArt(idea)}
                    disabled={generatingArtFor === idea.id}
                    className="w-fit rounded-md bg-violet-50 px-2 py-1 text-[11px] font-medium text-violet-700 hover:bg-violet-100 disabled:opacity-50"
                  >
                    {generatingArtFor === idea.id
                      ? "Gerando arte..."
                      : "✨ Gerar arte com IA"}
                  </button>
                )}

                <div className="mt-auto flex items-center gap-2 pt-2">
                  <button
                    onClick={() => handleUseInCalendar(idea)}
                    className="flex-1 rounded-md bg-neutral-900 px-2 py-1.5 text-xs font-medium text-white hover:bg-neutral-700"
                  >
                    Usar no calendário
                  </button>
                  <button
                    onClick={() => handleArchiveToggle(idea)}
                    title={
                      idea.status === "archived" ? "Desarquivar" : "Arquivar"
                    }
                    className="rounded-md border border-neutral-200 px-2 py-1.5 text-xs text-neutral-600 hover:bg-neutral-50"
                  >
                    {idea.status === "archived" ? "↺" : "⤓"}
                  </button>
                  <button
                    onClick={() => handleDelete(idea)}
                    title="Excluir"
                    className="rounded-md border border-neutral-200 px-2 py-1.5 text-xs text-red-500 hover:bg-red-50"
                  >
                    ✕
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-lg">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-semibold">Nova ideia</h2>
              <button
                onClick={() => {
                  setModalOpen(false);
                  resetForm();
                }}
                className="text-neutral-400 hover:text-neutral-700"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddIdea} className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-600">
                  Título
                </label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: Reel de bastidores"
                  className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-500"
                />
              </div>

              {profiles.length > 0 && (
                <div>
                  <label className="mb-1 block text-xs font-medium text-neutral-600">
                    Perfil / conta
                  </label>
                  <select
                    value={brandProfileId}
                    onChange={(e) => setBrandProfileId(e.target.value)}
                    className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-500"
                  >
                    <option value="">Sem perfil definido</option>
                    {profiles.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-600">
                  Link do post salvo (Instagram, etc.)
                </label>
                <input
                  value={sourceUrl}
                  onChange={(e) => setSourceUrl(e.target.value)}
                  placeholder="https://www.instagram.com/p/..."
                  className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-500"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-600">
                  Print / imagem de referência
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  className="w-full text-xs"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-600">
                  Notas
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  placeholder="Por que essa ideia é boa, como adaptar pro seu perfil..."
                  className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-500"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-600">
                  Tags (separadas por vírgula)
                </label>
                <input
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  placeholder="reels, bastidores, engajamento"
                  className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-500"
                />
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50"
              >
                {saving ? "Salvando..." : "Salvar ideia"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
