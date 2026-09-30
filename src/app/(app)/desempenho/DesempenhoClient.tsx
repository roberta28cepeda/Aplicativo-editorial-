"use client";

import { useMemo, useState } from "react";
import PostModal from "@/components/PostModal";
import SimpleMarkdown from "@/components/SimpleMarkdown";
import type { BrandProfile, Idea, Post } from "@/types/db";
import { METRIC_FIELDS, POST_STATUS_COLOR, POST_STATUS_LABEL } from "@/types/db";

export default function DesempenhoClient({
  profiles,
  initialPosts,
  ideas,
  userId,
}: {
  profiles: BrandProfile[];
  initialPosts: Post[];
  ideas: Idea[];
  userId: string;
}) {
  const [posts, setPosts] = useState<Post[]>(initialPosts);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(
    profiles[0]?.id ?? null,
  );
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [lastResult, setLastResult] = useState<{
    analysis: string;
    newIdeasCount: number;
  } | null>(null);

  const selectedProfile = profiles.find((p) => p.id === selectedProfileId) ?? null;

  const postedPosts = useMemo(() => {
    if (!selectedProfileId) return [];
    return posts
      .filter(
        (p) => p.brand_profile_id === selectedProfileId && p.status === "posted",
      )
      .sort((a, b) =>
        (b.scheduled_date ?? "").localeCompare(a.scheduled_date ?? ""),
      );
  }, [posts, selectedProfileId]);

  const upcomingCount = useMemo(() => {
    if (!selectedProfileId) return 0;
    const today = new Date().toISOString().slice(0, 10);
    return posts.filter(
      (p) =>
        p.brand_profile_id === selectedProfileId &&
        p.status !== "posted" &&
        p.scheduled_date &&
        p.scheduled_date >= today,
    ).length;
  }, [posts, selectedProfileId]);

  async function handleAnalyze() {
    if (!selectedProfileId) return;
    setAnalyzing(true);
    setLastResult(null);
    try {
      const res = await fetch("/api/ai/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brand_profile_id: selectedProfileId }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Falha ao analisar.");
      setLastResult({
        analysis: body.analysis,
        newIdeasCount: body.suggested_ideas?.length ?? 0,
      });
    } catch (err) {
      alert(err instanceof Error ? err.message : "Falha ao analisar.");
    } finally {
      setAnalyzing(false);
    }
  }

  function handleSaved(updated: Post) {
    setPosts((prev) =>
      prev.some((p) => p.id === updated.id)
        ? prev.map((p) => (p.id === updated.id ? updated : p))
        : [updated, ...prev],
    );
    setEditingPost(null);
  }

  if (profiles.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10 text-center text-sm text-ink-soft">
        Cadastre pelo menos um perfil de marca em{" "}
        <a href="/perfis" className="text-blue-600 hover:underline">
          Perfis
        </a>{" "}
        para usar a análise de desempenho.
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <div className="mb-5">
        <h1 className="text-xl font-semibold">Desempenho</h1>
        <p className="text-sm text-ink-soft">
          Registre os números de posts já publicados e peça uma análise com
          sugestões de calendário e melhorias.
        </p>
      </div>

      <div className="mb-4 flex flex-wrap gap-1">
        {profiles.map((p) => (
          <button
            key={p.id}
            onClick={() => {
              setSelectedProfileId(p.id);
              setLastResult(null);
            }}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
              selectedProfileId === p.id
                ? "bg-orange text-white"
                : "bg-cream text-ink-soft hover:bg-paper-deep"
            }`}
          >
            {p.name}
          </button>
        ))}
      </div>

      {selectedProfile && (
        <>
          <div className="mb-4 flex items-center justify-between rounded-lg border border-line bg-cream p-3">
            <div className="text-xs text-ink-soft">
              <strong className="text-ink">
                {postedPosts.length}
              </strong>{" "}
              posts publicados registrados ·{" "}
              <strong className="text-ink">{upcomingCount}</strong>{" "}
              posts planejados à frente
            </div>
            <button
              onClick={handleAnalyze}
              disabled={analyzing}
              className="rounded-md bg-violet-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-violet-500 disabled:opacity-50"
            >
              {analyzing
                ? "Analisando..."
                : "🧠 Analisar e sugerir melhorias"}
            </button>
          </div>

          {(lastResult || selectedProfile.last_analysis) && (
            <div className="mb-6 rounded-lg border border-violet-200 bg-violet-50/50 p-4">
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-violet-900">
                  Análise
                </h2>
                {!lastResult && selectedProfile.last_analysis_at && (
                  <span className="text-[10px] text-[#a09b8f]">
                    gerada em{" "}
                    {new Date(
                      selectedProfile.last_analysis_at,
                    ).toLocaleDateString("pt-BR")}
                  </span>
                )}
              </div>
              <SimpleMarkdown
                text={lastResult?.analysis ?? selectedProfile.last_analysis ?? ""}
              />
              {lastResult && lastResult.newIdeasCount > 0 && (
                <p className="mt-3 text-xs text-violet-700">
                  ✨ {lastResult.newIdeasCount} novas ideias foram adicionadas
                  ao{" "}
                  <a href="/ideias" className="underline">
                    banco de ideias
                  </a>{" "}
                  com base nessa análise.
                </p>
              )}
            </div>
          )}

          <h2 className="mb-2 text-sm font-semibold text-ink-soft">
            Posts publicados
          </h2>
          {postedPosts.length === 0 ? (
            <p className="text-xs text-[#a09b8f]">
              Nenhum post com status &quot;Publicado&quot; ainda para este
              perfil. Marque um post como publicado no calendário e volte
              aqui para registrar os números.
            </p>
          ) : (
            <div className="overflow-hidden rounded-lg border border-line bg-cream">
              <table className="w-full text-left text-xs">
                <thead className="bg-paper-deep text-ink-soft">
                  <tr>
                    <th className="px-3 py-2 font-medium">Post</th>
                    <th className="px-3 py-2 font-medium">Data</th>
                    {METRIC_FIELDS.map((f) => (
                      <th key={f.key as string} className="px-3 py-2 font-medium">
                        {f.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {postedPosts.map((post) => (
                    <tr
                      key={post.id}
                      onClick={() => setEditingPost(post)}
                      className="cursor-pointer border-t border-line hover:bg-paper-deep"
                    >
                      <td className="px-3 py-2">
                        <span className="font-medium text-ink">
                          {post.title}
                        </span>
                        <span
                          className={`ml-2 rounded-full px-1.5 py-0.5 text-[10px] ${POST_STATUS_COLOR[post.status]}`}
                        >
                          {POST_STATUS_LABEL[post.status]}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-ink-soft">
                        {post.scheduled_date ?? "—"}
                      </td>
                      {METRIC_FIELDS.map((f) => (
                        <td key={f.key as string} className="px-3 py-2 text-ink-soft">
                          {(post[f.key] as number | null) ?? "—"}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {editingPost && (
        <PostModal
          post={editingPost}
          defaultDate={null}
          defaultBrandProfileId={selectedProfileId}
          ideas={ideas}
          profiles={profiles}
          userId={userId}
          onClose={() => setEditingPost(null)}
          onSaved={handleSaved}
          onDeleted={(id) => {
            setPosts((prev) => prev.filter((p) => p.id !== id));
            setEditingPost(null);
          }}
        />
      )}
    </div>
  );
}
