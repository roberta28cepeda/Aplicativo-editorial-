"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { uploadMedia } from "@/lib/supabase/storage";
import MediaThumb from "@/components/MediaThumb";
import type { BrandPlatform, BrandProfile } from "@/types/db";
import { BRAND_PLATFORM_COLOR, BRAND_PLATFORM_LABEL } from "@/types/db";

const EMPTY_FORM = {
  name: "",
  platform: "instagram" as BrandPlatform,
  handle: "",
  niche: "",
  tone_of_voice: "",
  target_audience: "",
  brand_colors: "",
  differentiators: "",
  notes: "",
};

export default function ProfilesClient({
  initialProfiles,
  userId,
}: {
  initialProfiles: BrandProfile[];
  userId: string;
}) {
  const [profiles, setProfiles] = useState<BrandProfile[]>(initialProfiles);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<BrandProfile | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [logoFile, setLogoFile] = useState<File | null>(null);

  const grouped: Record<BrandPlatform, BrandProfile[]> = {
    instagram: [],
    linkedin: [],
    google_business: [],
    outro: [],
  };
  for (const p of profiles) {
    if (!p.archived) grouped[p.platform].push(p);
  }

  function openNew() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setLogoFile(null);
    setModalOpen(true);
  }

  function openEdit(profile: BrandProfile) {
    setEditing(profile);
    setForm({
      name: profile.name,
      platform: profile.platform,
      handle: profile.handle ?? "",
      niche: profile.niche ?? "",
      tone_of_voice: profile.tone_of_voice ?? "",
      target_audience: profile.target_audience ?? "",
      brand_colors: profile.brand_colors.join(", "),
      differentiators: profile.differentiators ?? "",
      notes: profile.notes ?? "",
    });
    setLogoFile(null);
    setModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const supabase = createClient();

    try {
      let logo_path = editing?.logo_path ?? null;
      if (logoFile) {
        logo_path = await uploadMedia(userId, "logos", logoFile);
      }

      const payload = {
        name: form.name.trim() || "Perfil sem nome",
        platform: form.platform,
        handle: form.handle.trim() || null,
        niche: form.niche.trim() || null,
        tone_of_voice: form.tone_of_voice.trim() || null,
        target_audience: form.target_audience.trim() || null,
        brand_colors: form.brand_colors
          .split(",")
          .map((c) => c.trim())
          .filter(Boolean),
        differentiators: form.differentiators.trim() || null,
        notes: form.notes.trim() || null,
        logo_path,
      };

      if (editing) {
        const { data, error } = await supabase
          .schema("editorial")
          .from("brand_profiles")
          .update(payload)
          .eq("id", editing.id)
          .select()
          .single();
        if (error) throw error;
        setProfiles((prev) =>
          prev.map((p) => (p.id === editing.id ? (data as BrandProfile) : p)),
        );
      } else {
        const { data, error } = await supabase
          .schema("editorial")
          .from("brand_profiles")
          .insert({ ...payload, user_id: userId })
          .select()
          .single();
        if (error) throw error;
        setProfiles((prev) => [...prev, data as BrandProfile]);
      }

      setModalOpen(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Não foi possível salvar.");
    } finally {
      setSaving(false);
    }
  }

  async function handleArchive(profile: BrandProfile) {
    if (!confirm(`Arquivar "${profile.name}"? Ideias e posts continuam salvos.`))
      return;
    const supabase = createClient();
    const { error } = await supabase
      .schema("editorial")
      .from("brand_profiles")
      .update({ archived: true })
      .eq("id", profile.id);
    if (error) {
      alert(error.message);
      return;
    }
    setProfiles((prev) =>
      prev.map((p) => (p.id === profile.id ? { ...p, archived: true } : p)),
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Perfis de marca</h1>
          <p className="text-sm text-neutral-500">
            Cada conta (Instagram, LinkedIn, Google) fica separada aqui. Ideias
            e calendário nunca se misturam entre perfis.
          </p>
        </div>
        <button
          onClick={openNew}
          className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700"
        >
          + Novo perfil
        </button>
      </div>

      {(Object.keys(grouped) as BrandPlatform[]).map((platform) => (
        <div key={platform} className="mb-6">
          <h2 className="mb-2 text-sm font-semibold text-neutral-700">
            {BRAND_PLATFORM_LABEL[platform]} ({grouped[platform].length})
          </h2>
          {grouped[platform].length === 0 ? (
            <p className="text-xs text-neutral-400">Nenhum perfil ainda.</p>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {grouped[platform].map((profile) => (
                <button
                  key={profile.id}
                  onClick={() => openEdit(profile)}
                  className="flex items-start gap-3 rounded-lg border border-neutral-200 bg-white p-3 text-left hover:border-neutral-400"
                >
                  <MediaThumb
                    path={profile.logo_path}
                    alt={profile.name}
                    className="h-10 w-10 shrink-0 rounded-full object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {profile.name}
                    </p>
                    {profile.handle && (
                      <p className="truncate text-xs text-neutral-500">
                        {profile.handle}
                      </p>
                    )}
                    <span
                      className={`mt-1 inline-block rounded-full px-1.5 py-0.5 text-[10px] ${BRAND_PLATFORM_COLOR[profile.platform]}`}
                    >
                      {BRAND_PLATFORM_LABEL[profile.platform]}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      ))}

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-5 shadow-lg">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-semibold">
                {editing ? "Editar perfil" : "Novo perfil"}
              </h2>
              <button
                onClick={() => setModalOpen(false)}
                className="text-neutral-400 hover:text-neutral-700"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-neutral-600">
                    Nome do perfil
                  </label>
                  <input
                    required
                    value={form.name}
                    onChange={(e) =>
                      setForm({ ...form, name: e.target.value })
                    }
                    placeholder="Ex: Loja Aurora"
                    className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-neutral-600">
                    Plataforma
                  </label>
                  <select
                    value={form.platform}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        platform: e.target.value as BrandPlatform,
                      })
                    }
                    className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-500"
                  >
                    {Object.entries(BRAND_PLATFORM_LABEL).map(
                      ([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ),
                    )}
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-600">
                  @ / URL da conta
                </label>
                <input
                  value={form.handle}
                  onChange={(e) =>
                    setForm({ ...form, handle: e.target.value })
                  }
                  placeholder="@loja_aurora ou linkedin.com/company/aurora"
                  className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-500"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-600">
                  Nicho / segmento
                </label>
                <input
                  value={form.niche}
                  onChange={(e) =>
                    setForm({ ...form, niche: e.target.value })
                  }
                  placeholder="Ex: moda feminina plus size"
                  className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-500"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-600">
                  Tom de voz
                </label>
                <input
                  value={form.tone_of_voice}
                  onChange={(e) =>
                    setForm({ ...form, tone_of_voice: e.target.value })
                  }
                  placeholder="Ex: descontraído, acolhedor, direto"
                  className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-500"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-600">
                  Público-alvo
                </label>
                <input
                  value={form.target_audience}
                  onChange={(e) =>
                    setForm({ ...form, target_audience: e.target.value })
                  }
                  placeholder="Ex: mulheres 25-45, classe B, região sul"
                  className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-500"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-600">
                  Cores da marca (separadas por vírgula)
                </label>
                <input
                  value={form.brand_colors}
                  onChange={(e) =>
                    setForm({ ...form, brand_colors: e.target.value })
                  }
                  placeholder="#1a1a2e, #e94560, branco"
                  className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-500"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-600">
                  Diferenciais / o que essa marca vende
                </label>
                <textarea
                  value={form.differentiators}
                  onChange={(e) =>
                    setForm({ ...form, differentiators: e.target.value })
                  }
                  rows={2}
                  className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-500"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-600">
                  Notas gerais
                </label>
                <textarea
                  value={form.notes}
                  onChange={(e) =>
                    setForm({ ...form, notes: e.target.value })
                  }
                  rows={2}
                  className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-500"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-600">
                  Logo (opcional)
                </label>
                {editing?.logo_path && (
                  <MediaThumb
                    path={editing.logo_path}
                    alt="Logo atual"
                    className="mb-2 h-16 w-16 rounded-full object-cover"
                  />
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setLogoFile(e.target.files?.[0] ?? null)}
                  className="w-full text-xs"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50"
                >
                  {saving ? "Salvando..." : "Salvar"}
                </button>
                {editing && (
                  <button
                    type="button"
                    onClick={() => handleArchive(editing)}
                    className="rounded-md border border-neutral-200 px-3 py-2 text-sm font-medium text-neutral-500 hover:bg-neutral-50"
                  >
                    Arquivar
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
