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
  const [referenceImages, setReferenceImages] = useState<string[]>([]);
  const [newReferenceFiles, setNewReferenceFiles] = useState<File[]>([]);

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
    setReferenceImages([]);
    setNewReferenceFiles([]);
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
    setReferenceImages(profile.reference_images ?? []);
    setNewReferenceFiles([]);
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

      const newPaths = await Promise.all(
        newReferenceFiles.map((f) => uploadMedia(userId, "references", f)),
      );
      const finalReferenceImages = [...referenceImages, ...newPaths];

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
        reference_images: finalReferenceImages,
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
          <p className="text-sm text-ink-soft">
            Cada conta (Instagram, LinkedIn, Google) fica separada aqui. Ideias
            e calendário nunca se misturam entre perfis.
          </p>
        </div>
        <button
          onClick={openNew}
          className="rounded-lg bg-orange px-4 py-2 text-sm font-medium text-white hover:bg-orange-deep"
        >
          + Novo perfil
        </button>
      </div>

      {(Object.keys(grouped) as BrandPlatform[]).map((platform) => (
        <div key={platform} className="mb-6">
          <h2 className="mb-2 text-sm font-semibold text-ink-soft">
            {BRAND_PLATFORM_LABEL[platform]} ({grouped[platform].length})
          </h2>
          {grouped[platform].length === 0 ? (
            <p className="text-xs text-[#a09b8f]">Nenhum perfil ainda.</p>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {grouped[platform].map((profile) => (
                <button
                  key={profile.id}
                  onClick={() => openEdit(profile)}
                  className="flex items-start gap-3 rounded-lg border border-line bg-cream p-3 text-left hover:border-neutral-400"
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
                      <p className="truncate text-xs text-ink-soft">
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
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-cream p-5 shadow-lg">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-semibold">
                {editing ? "Editar perfil" : "Novo perfil"}
              </h2>
              <button
                onClick={() => setModalOpen(false)}
                className="text-[#a09b8f] hover:text-ink-soft"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-ink-soft">
                    Nome do perfil
                  </label>
                  <input
                    required
                    value={form.name}
                    onChange={(e) =>
                      setForm({ ...form, name: e.target.value })
                    }
                    placeholder="Ex: Loja Aurora"
                    className="w-full rounded-md border border-line px-3 py-2 text-sm outline-none focus:border-orange"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-ink-soft">
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
                    className="w-full rounded-md border border-line px-3 py-2 text-sm outline-none focus:border-orange"
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
                <label className="mb-1 block text-xs font-medium text-ink-soft">
                  @ / URL da conta
                </label>
                <input
                  value={form.handle}
                  onChange={(e) =>
                    setForm({ ...form, handle: e.target.value })
                  }
                  placeholder="@loja_aurora ou linkedin.com/company/aurora"
                  className="w-full rounded-md border border-line px-3 py-2 text-sm outline-none focus:border-orange"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-ink-soft">
                  Nicho / segmento
                </label>
                <input
                  value={form.niche}
                  onChange={(e) =>
                    setForm({ ...form, niche: e.target.value })
                  }
                  placeholder="Ex: moda feminina plus size"
                  className="w-full rounded-md border border-line px-3 py-2 text-sm outline-none focus:border-orange"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-ink-soft">
                  Tom de voz
                </label>
                <input
                  value={form.tone_of_voice}
                  onChange={(e) =>
                    setForm({ ...form, tone_of_voice: e.target.value })
                  }
                  placeholder="Ex: descontraído, acolhedor, direto"
                  className="w-full rounded-md border border-line px-3 py-2 text-sm outline-none focus:border-orange"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-ink-soft">
                  Público-alvo
                </label>
                <input
                  value={form.target_audience}
                  onChange={(e) =>
                    setForm({ ...form, target_audience: e.target.value })
                  }
                  placeholder="Ex: mulheres 25-45, classe B, região sul"
                  className="w-full rounded-md border border-line px-3 py-2 text-sm outline-none focus:border-orange"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-ink-soft">
                  Cores da marca (separadas por vírgula)
                </label>
                <input
                  value={form.brand_colors}
                  onChange={(e) =>
                    setForm({ ...form, brand_colors: e.target.value })
                  }
                  placeholder="#1a1a2e, #e94560, branco"
                  className="w-full rounded-md border border-line px-3 py-2 text-sm outline-none focus:border-orange"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-ink-soft">
                  Diferenciais / o que essa marca vende
                </label>
                <textarea
                  value={form.differentiators}
                  onChange={(e) =>
                    setForm({ ...form, differentiators: e.target.value })
                  }
                  rows={2}
                  className="w-full rounded-md border border-line px-3 py-2 text-sm outline-none focus:border-orange"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-ink-soft">
                  Notas gerais
                </label>
                <textarea
                  value={form.notes}
                  onChange={(e) =>
                    setForm({ ...form, notes: e.target.value })
                  }
                  rows={2}
                  className="w-full rounded-md border border-line px-3 py-2 text-sm outline-none focus:border-orange"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-ink-soft">
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

              <div>
                <label className="mb-1 block text-xs font-medium text-ink-soft">
                  Prints de modelos de arte / referências visuais
                </label>
                <p className="mb-2 text-[11px] text-[#a09b8f]">
                  Anexe exemplos do estilo de arte que você gosta para esse
                  perfil — a IA usa essas referências para gerar artes
                  parecidas.
                </p>
                {referenceImages.length > 0 && (
                  <div className="mb-2 grid grid-cols-4 gap-2">
                    {referenceImages.map((path) => (
                      <div key={path} className="relative">
                        <MediaThumb
                          path={path}
                          alt="Referência de arte"
                          className="h-16 w-full rounded-md object-cover"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setReferenceImages((prev) =>
                              prev.filter((p) => p !== path),
                            )
                          }
                          className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-cream text-[10px] text-red-500 shadow"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) =>
                    setNewReferenceFiles(Array.from(e.target.files ?? []))
                  }
                  className="w-full text-xs"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 rounded-md bg-orange px-3 py-2 text-sm font-medium text-white hover:bg-orange-deep disabled:opacity-50"
                >
                  {saving ? "Salvando..." : "Salvar"}
                </button>
                {editing && (
                  <button
                    type="button"
                    onClick={() => handleArchive(editing)}
                    className="rounded-md border border-line px-3 py-2 text-sm font-medium text-ink-soft hover:bg-paper-deep"
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
