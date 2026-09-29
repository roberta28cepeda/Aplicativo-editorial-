"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { uploadMedia } from "@/lib/supabase/storage";
import MediaThumb from "@/components/MediaThumb";
import type {
  BrandProfile,
  Idea,
  Platform,
  Post,
  PostStatus,
  PostType,
} from "@/types/db";
import {
  METRIC_FIELDS,
  PLATFORM_LABEL,
  POST_STATUS_LABEL,
  POST_TYPE_LABEL,
} from "@/types/db";

export default function PostModal({
  post,
  defaultDate,
  defaultBrandProfileId,
  ideas,
  profiles,
  userId,
  onClose,
  onSaved,
  onDeleted,
}: {
  post: Post | null;
  defaultDate: string | null;
  defaultBrandProfileId?: string | null;
  ideas: Idea[];
  profiles: BrandProfile[];
  userId: string;
  onClose: () => void;
  onSaved: (post: Post) => void;
  onDeleted: (id: string) => void;
}) {
  const [title, setTitle] = useState(post?.title ?? "");
  const [brandProfileId, setBrandProfileId] = useState(
    post?.brand_profile_id ?? defaultBrandProfileId ?? "",
  );
  const [ideaId, setIdeaId] = useState(post?.idea_id ?? "");
  const [caption, setCaption] = useState(post?.caption ?? "");
  const [platform, setPlatform] = useState<Platform>(
    post?.platform ?? "instagram",
  );
  const [postType, setPostType] = useState<PostType>(post?.post_type ?? "feed");
  const [scheduledDate, setScheduledDate] = useState(
    post?.scheduled_date ?? defaultDate ?? "",
  );
  const [status, setStatus] = useState<PostStatus>(post?.status ?? "idea");
  const [tagsInput, setTagsInput] = useState((post?.tags ?? []).join(", "));
  const [file, setFile] = useState<File | null>(null);
  const [artPath, setArtPath] = useState(post?.art_path ?? null);
  const [saving, setSaving] = useState(false);
  const [generatingArt, setGeneratingArt] = useState(false);
  const [metrics, setMetrics] = useState<Record<string, string>>({
    metric_reach: post?.metric_reach?.toString() ?? "",
    metric_likes: post?.metric_likes?.toString() ?? "",
    metric_comments: post?.metric_comments?.toString() ?? "",
    metric_saves: post?.metric_saves?.toString() ?? "",
    metric_shares: post?.metric_shares?.toString() ?? "",
  });

  async function handleGenerateArt() {
    if (!post) return;
    setGeneratingArt(true);
    try {
      const res = await fetch("/api/ai/art", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target: "post", id: post.id }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Falha ao gerar arte.");
      setArtPath(body.record.art_path);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Falha ao gerar arte.");
    } finally {
      setGeneratingArt(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const supabase = createClient();

    try {
      let finalArtPath = artPath;
      if (file) {
        finalArtPath = await uploadMedia(userId, "posts", file);
      }

      const tags = tagsInput
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      const payload = {
        title: title.trim() || "Post sem título",
        brand_profile_id: brandProfileId || null,
        idea_id: ideaId || null,
        caption: caption.trim() || null,
        platform,
        post_type: postType,
        scheduled_date: scheduledDate || null,
        status,
        tags,
        art_path: finalArtPath,
        metric_reach: metrics.metric_reach ? Number(metrics.metric_reach) : null,
        metric_likes: metrics.metric_likes ? Number(metrics.metric_likes) : null,
        metric_comments: metrics.metric_comments
          ? Number(metrics.metric_comments)
          : null,
        metric_saves: metrics.metric_saves ? Number(metrics.metric_saves) : null,
        metric_shares: metrics.metric_shares
          ? Number(metrics.metric_shares)
          : null,
      };

      if (post) {
        const { data, error } = await supabase
          .schema("editorial")
          .from("posts")
          .update(payload)
          .eq("id", post.id)
          .select()
          .single();
        if (error) throw error;
        onSaved(data as Post);
      } else {
        const { data, error } = await supabase
          .schema("editorial")
          .from("posts")
          .insert({ ...payload, user_id: userId })
          .select()
          .single();
        if (error) throw error;
        onSaved(data as Post);
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "Não foi possível salvar.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!post) return;
    if (!confirm(`Excluir o post "${post.title}"?`)) return;
    const supabase = createClient();
    const { error } = await supabase
      .schema("editorial")
      .from("posts")
      .delete()
      .eq("id", post.id);
    if (error) {
      alert(error.message);
      return;
    }
    onDeleted(post.id);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-5 shadow-lg">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold">
            {post ? "Editar post" : "Novo post"}
          </h2>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-700"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-600">
              Título
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
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
              Vincular a uma ideia (opcional)
            </label>
            <select
              value={ideaId}
              onChange={(e) => setIdeaId(e.target.value)}
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-500"
            >
              <option value="">Nenhuma</option>
              {ideas.map((idea) => (
                <option key={idea.id} value={idea.id}>
                  {idea.title}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-600">
                Data
              </label>
              <input
                type="date"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-600">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as PostStatus)}
                className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-500"
              >
                {Object.entries(POST_STATUS_LABEL).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-600">
                Plataforma
              </label>
              <select
                value={platform}
                onChange={(e) => setPlatform(e.target.value as Platform)}
                className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-500"
              >
                {Object.entries(PLATFORM_LABEL).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-600">
                Formato
              </label>
              <select
                value={postType}
                onChange={(e) => setPostType(e.target.value as PostType)}
                className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-500"
              >
                {Object.entries(POST_TYPE_LABEL).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-600">
              Legenda
            </label>
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              rows={3}
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
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-500"
            />
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between">
              <label className="block text-xs font-medium text-neutral-600">
                Arte do post
              </label>
              {post && (
                <button
                  type="button"
                  onClick={handleGenerateArt}
                  disabled={generatingArt}
                  className="rounded-md bg-violet-50 px-2 py-0.5 text-[11px] font-medium text-violet-700 hover:bg-violet-100 disabled:opacity-50"
                >
                  {generatingArt ? "Gerando..." : "✨ Gerar com IA"}
                </button>
              )}
            </div>
            {artPath && (
              <MediaThumb
                path={artPath}
                alt="Arte atual"
                className="mb-2 h-32 w-full rounded-md object-cover"
              />
            )}
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                setFile(e.target.files?.[0] ?? null);
                setArtPath(null);
              }}
              className="w-full text-xs"
            />
          </div>

          {post && (status === "posted" || post.status === "posted") && (
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-600">
                Desempenho (preencha depois de publicar)
              </label>
              <div className="grid grid-cols-3 gap-2">
                {METRIC_FIELDS.map((field) => (
                  <div key={field.key}>
                    <label className="mb-0.5 block text-[10px] text-neutral-500">
                      {field.label}
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={metrics[field.key as string]}
                      onChange={(e) =>
                        setMetrics({
                          ...metrics,
                          [field.key as string]: e.target.value,
                        })
                      }
                      className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm outline-none focus:border-neutral-500"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center gap-2 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50"
            >
              {saving ? "Salvando..." : "Salvar"}
            </button>
            {post && (
              <button
                type="button"
                onClick={handleDelete}
                className="rounded-md border border-red-200 px-3 py-2 text-sm font-medium text-red-500 hover:bg-red-50"
              >
                Excluir
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
