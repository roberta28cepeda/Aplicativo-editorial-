import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateImagePng } from "@/lib/ai/openaiImage";
import type { BrandProfile } from "@/types/db";

function buildImagePrompt(
  title: string,
  notes: string | null,
  profile: BrandProfile | null,
) {
  const colors = profile?.brand_colors.length
    ? `Paleta de cores predominante: ${profile.brand_colors.join(", ")}.`
    : "";
  const niche = profile?.niche ? `Nicho/segmento: ${profile.niche}.` : "";

  return `Crie uma arte visual limpa e moderna para redes sociais (estilo post de Instagram/LinkedIn), sem nenhum texto legível na imagem — foco puramente visual/conceitual, pois o texto será adicionado depois por fora.

Conceito do post: "${title}"${notes ? ` — ${notes}` : ""}
${niche}
${colors}

Estilo: fotografia ou ilustração profissional, composição limpa, boa área negativa para eventual sobreposição de texto depois, sem marcas d'água, sem letras ou palavras na imagem.`;
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const { target, id } = await request.json();
  if (target !== "idea" && target !== "post") {
    return NextResponse.json(
      { error: "target deve ser 'idea' ou 'post'." },
      { status: 400 },
    );
  }
  if (!id) {
    return NextResponse.json({ error: "id é obrigatório." }, { status: 400 });
  }

  const table = target === "idea" ? "ideas" : "posts";
  const { data: record, error: fetchError } = await supabase
    .schema("editorial")
    .from(table)
    .select("*")
    .eq("id", id)
    .single();

  if (fetchError || !record) {
    return NextResponse.json({ error: "Registro não encontrado." }, {
      status: 404,
    });
  }

  let profile: BrandProfile | null = null;
  if (record.brand_profile_id) {
    const { data: profileData } = await supabase
      .schema("editorial")
      .from("brand_profiles")
      .select("*")
      .eq("id", record.brand_profile_id)
      .single();
    profile = (profileData as BrandProfile) ?? null;
  }

  const captionOrNotes = target === "idea" ? record.notes : record.caption;

  let imageBuffer;
  try {
    const prompt = buildImagePrompt(record.title, captionOrNotes, profile);
    imageBuffer = await generateImagePng(prompt);
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Falha ao gerar a arte.",
      },
      { status: 502 },
    );
  }

  const path = `${user.id}/ai-art/${crypto.randomUUID()}.png`;
  const { error: uploadError } = await supabase.storage
    .from("editorial-media")
    .upload(path, imageBuffer, { contentType: "image/png" });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const pathColumn = target === "idea" ? "image_path" : "art_path";
  const { data: updated, error: updateError } = await supabase
    .schema("editorial")
    .from(table)
    .update({ [pathColumn]: path, ai_generated: true })
    .eq("id", id)
    .select()
    .single();

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ record: updated });
}
