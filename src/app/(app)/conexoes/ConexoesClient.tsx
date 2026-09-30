"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { BrandProfile, SocialConnection } from "@/types/db";

export default function ConexoesClient({
  initialConnections,
  profiles,
  instagramConfigured,
}: {
  initialConnections: SocialConnection[];
  profiles: BrandProfile[];
  instagramConfigured: boolean;
}) {
  const [connections, setConnections] =
    useState<SocialConnection[]>(initialConnections);
  const searchParams = useSearchParams();
  const error = searchParams.get("error");
  const connectedCount = searchParams.get("connected");
  const router = useRouter();

  const instagramProfiles = profiles.filter((p) => p.platform === "instagram");

  const [showManual, setShowManual] = useState(false);
  const [manualToken, setManualToken] = useState("");
  const [manualSaving, setManualSaving] = useState(false);
  const [manualError, setManualError] = useState<string | null>(null);
  const [manualSuccess, setManualSuccess] = useState<string | null>(null);

  async function handleManualConnect(e: React.FormEvent) {
    e.preventDefault();
    setManualSaving(true);
    setManualError(null);
    setManualSuccess(null);
    try {
      const res = await fetch("/api/auth/instagram/manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ access_token: manualToken.trim() }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Falha ao conectar.");
      setManualSuccess(
        `${body.connected} conta(s) conectada(s)! Atualizando a lista...`,
      );
      setManualToken("");
      router.refresh();
    } catch (err) {
      setManualError(err instanceof Error ? err.message : "Falha ao conectar.");
    } finally {
      setManualSaving(false);
    }
  }

  async function handleAssign(connectionId: string, brandProfileId: string) {
    const supabase = createClient();
    const { error: updateError } = await supabase
      .schema("editorial")
      .from("social_connections")
      .update({ brand_profile_id: brandProfileId || null })
      .eq("id", connectionId);

    if (updateError) {
      alert(updateError.message);
      return;
    }

    setConnections((prev) =>
      prev.map((c) =>
        c.id === connectionId
          ? { ...c, brand_profile_id: brandProfileId || null }
          : c,
      ),
    );
  }

  async function handleDisconnect(connection: SocialConnection) {
    if (
      !confirm(
        `Desconectar @${connection.external_username ?? connection.external_account_id}?`,
      )
    )
      return;
    const supabase = createClient();
    const { error: deleteError } = await supabase
      .schema("editorial")
      .from("social_connections")
      .delete()
      .eq("id", connection.id);

    if (deleteError) {
      alert(deleteError.message);
      return;
    }
    setConnections((prev) => prev.filter((c) => c.id !== connection.id));
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <div className="mb-5">
        <h1 className="text-xl font-semibold">Conexões</h1>
        <p className="text-sm text-neutral-500">
          Conecte suas contas do Instagram Business de verdade (login oficial
          da Meta) para eu poder ler os dados de desempenho delas.
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {decodeURIComponent(error)}
        </div>
      )}
      {connectedCount && (
        <div className="mb-4 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">
          {connectedCount} conta(s) do Instagram conectada(s) com sucesso!
          Associe cada uma a um perfil abaixo.
        </div>
      )}

      {!instagramConfigured && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          As variáveis <code>META_APP_ID</code> e <code>META_APP_SECRET</code>{" "}
          ainda não foram configuradas no projeto — o botão de conectar não
          vai funcionar até isso ser adicionado.
        </div>
      )}

      <a
        href="/api/auth/instagram/start"
        className="mb-3 inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-pink-500 to-amber-500 px-4 py-2 text-sm font-medium text-white hover:opacity-90"
      >
        📷 Conectar com Instagram
      </a>

      <div className="mb-6">
        <button
          onClick={() => setShowManual((v) => !v)}
          className="text-xs text-neutral-500 underline hover:text-neutral-700"
        >
          {showManual
            ? "Esconder"
            : "O login automático não achou sua conta? Conectar com um token manual"}
        </button>

        {showManual && (
          <div className="mt-3 rounded-lg border border-neutral-200 bg-white p-4">
            <p className="mb-2 text-xs text-neutral-600">
              Gere um token direto no{" "}
              <a
                href="https://developers.facebook.com/tools/explorer/"
                target="_blank"
                rel="noreferrer"
                className="text-blue-600 underline"
              >
                Graph API Explorer
              </a>{" "}
              da Meta:
            </p>
            <ol className="mb-3 list-decimal space-y-1 pl-4 text-xs text-neutral-600">
              <li>
                Selecione o app <strong>&quot;Calendario Editorial app&quot;</strong> no
                menu &quot;Meta App&quot; no topo
              </li>
              <li>
                No menu &quot;User or Page&quot;, escolha a{" "}
                <strong>Página</strong> certa (ex: Leactis, leactis.consultoria)
              </li>
              <li>
                Em &quot;Add a permission&quot;, adicione: <code>pages_show_list</code>,{" "}
                <code>pages_read_engagement</code>, <code>instagram_basic</code>
              </li>
              <li>
                Clique em <strong>&quot;Generate Access Token&quot;</strong> e autorize
              </li>
              <li>Copie o token gerado e cole abaixo</li>
            </ol>
            <form onSubmit={handleManualConnect} className="flex gap-2">
              <input
                value={manualToken}
                onChange={(e) => setManualToken(e.target.value)}
                placeholder="Cole o token de acesso aqui"
                required
                className="flex-1 rounded-md border border-neutral-300 px-3 py-2 text-xs outline-none focus:border-neutral-500"
              />
              <button
                type="submit"
                disabled={manualSaving}
                className="rounded-md bg-neutral-900 px-3 py-2 text-xs font-medium text-white hover:bg-neutral-700 disabled:opacity-50"
              >
                {manualSaving ? "Conectando..." : "Conectar"}
              </button>
            </form>
            {manualError && (
              <p className="mt-2 text-xs text-red-600">{manualError}</p>
            )}
            {manualSuccess && (
              <p className="mt-2 text-xs text-green-600">{manualSuccess}</p>
            )}
          </div>
        )}
      </div>

      <h2 className="mb-2 text-sm font-semibold text-neutral-700">
        Contas conectadas ({connections.length})
      </h2>

      {connections.length === 0 ? (
        <p className="text-xs text-neutral-400">
          Nenhuma conta conectada ainda.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {connections.map((conn) => (
            <div
              key={conn.id}
              className="flex items-center gap-3 rounded-lg border border-neutral-200 bg-white p-3"
            >
              {conn.profile_picture_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={conn.profile_picture_url}
                  alt={conn.external_username ?? ""}
                  className="h-10 w-10 shrink-0 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-xs text-neutral-400">
                  IG
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  @{conn.external_username ?? conn.external_account_id}
                </p>
                <p className="text-xs text-neutral-400">
                  conectado em{" "}
                  {new Date(conn.connected_at).toLocaleDateString("pt-BR")}
                </p>
              </div>
              <select
                value={conn.brand_profile_id ?? ""}
                onChange={(e) => handleAssign(conn.id, e.target.value)}
                className="rounded-md border border-neutral-300 px-2 py-1.5 text-xs outline-none focus:border-neutral-500"
              >
                <option value="">Vincular a um perfil...</option>
                {instagramProfiles.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <button
                onClick={() => handleDisconnect(conn)}
                className="rounded-md border border-neutral-200 px-2 py-1.5 text-xs text-red-500 hover:bg-red-50"
              >
                Desconectar
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
