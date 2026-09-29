import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAnthropicClient, IDEAS_MODEL } from "@/lib/ai/anthropic";
import type { BrandProfile } from "@/types/db";

function buildPrompt(profile: BrandProfile, recentTitles: string[]) {
  const colors = profile.brand_colors.length
    ? profile.brand_colors.join(", ")
    : "não informadas";

  return `Você é um estrategista de conteúdo para redes sociais no Brasil.

Perfil da marca:
- Nome: ${profile.name}
- Plataforma: ${profile.platform}
- Nicho: ${profile.niche ?? "não informado"}
- Tom de voz: ${profile.tone_of_voice ?? "não informado"}
- Público-alvo: ${profile.target_audience ?? "não informado"}
- Cores da marca: ${colors}
- Diferenciais: ${profile.differentiators ?? "não informado"}
- Notas gerais: ${profile.notes ?? "nenhuma"}

Ideias já usadas recentemente (NÃO repita temas iguais a estes):
${recentTitles.length ? recentTitles.map((t) => `- ${t}`).join("\n") : "(nenhuma ainda)"}

Gere exatamente 5 ideias de conteúdo novas, específicas para este perfil (nunca genéricas tipo "dica do dia" sem contexto). Cada ideia deve ter potencial real de engajamento para o público-alvo descrito.

Responda SOMENTE com um JSON válido, sem markdown, no formato exato:
[
  {"title": "título curto e chamativo", "notes": "explicação de 1-2 frases de como executar e por que funciona para essa marca", "format": "feed|reel|story|carousel", "tags": ["tag1", "tag2"]}
]`;
}

function parseIdeas(text: string) {
  const cleaned = text.trim().replace(/^```json\s*/i, "").replace(/```$/, "");
  const parsed = JSON.parse(cleaned);
  if (!Array.isArray(parsed)) throw new Error("Resposta da IA não é uma lista.");
  return parsed as {
    title: string;
    notes: string;
    format: string;
    tags: string[];
  }[];
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const { brand_profile_id } = await request.json();
  if (!brand_profile_id) {
    return NextResponse.json(
      { error: "brand_profile_id é obrigatório." },
      { status: 400 },
    );
  }

  const { data: profile, error: profileError } = await supabase
    .schema("editorial")
    .from("brand_profiles")
    .select("*")
    .eq("id", brand_profile_id)
    .single();

  if (profileError || !profile) {
    return NextResponse.json(
      { error: "Perfil de marca não encontrado." },
      { status: 404 },
    );
  }

  const { data: recentIdeas } = await supabase
    .schema("editorial")
    .from("ideas")
    .select("title")
    .eq("brand_profile_id", brand_profile_id)
    .order("created_at", { ascending: false })
    .limit(15);

  let anthropic;
  try {
    anthropic = getAnthropicClient();
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erro de configuração." },
      { status: 503 },
    );
  }

  const prompt = buildPrompt(
    profile as BrandProfile,
    (recentIdeas ?? []).map((i) => i.title),
  );

  let generated;
  try {
    const response = await anthropic.messages.create({
      model: IDEAS_MODEL,
      max_tokens: 2000,
      messages: [{ role: "user", content: prompt }],
    });
    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      throw new Error("A IA não retornou texto.");
    }
    generated = parseIdeas(textBlock.text);
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? `Falha ao gerar ideias: ${err.message}`
            : "Falha ao gerar ideias.",
      },
      { status: 502 },
    );
  }

  const rows = generated.map((idea) => ({
    user_id: user.id,
    brand_profile_id,
    title: idea.title,
    notes: idea.notes,
    tags: Array.isArray(idea.tags) ? idea.tags : [],
    ai_generated: true,
    status: "inbox" as const,
  }));

  const { data: inserted, error: insertError } = await supabase
    .schema("editorial")
    .from("ideas")
    .insert(rows)
    .select();

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({ ideas: inserted });
}
