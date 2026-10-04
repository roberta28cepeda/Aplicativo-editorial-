import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAnthropicClient, IDEAS_MODEL } from "@/lib/ai/anthropic";
import type { BrandProfile } from "@/types/db";

function buildPrompt(profile: BrandProfile, recentTitles: string[]) {
  const colors = profile.brand_colors.length
    ? profile.brand_colors.join(", ")
    : "não informadas";
  const today = new Date().toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  return `Você é um estrategista de conteúdo para redes sociais no Brasil. Hoje é ${today}.

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

Antes de gerar as ideias, use a busca na web para encontrar: tendências e notícias atuais do nicho dessa marca (últimas semanas), e datas comemorativas ou eventos relevantes do calendário brasileiro nos próximos 30 dias que façam sentido para esse nicho. Baseie pelo menos 2 das 5 ideias nisso que você encontrar.

Gere exatamente 5 ideias de conteúdo novas, específicas para este perfil (nunca genéricas tipo "dica do dia" sem contexto). Cada ideia deve ter potencial real de engajamento para o público-alvo descrito.

Cuidado com conformidade: não gere textos com promessas de resultado garantido, comparações diretas com concorrentes, ou alegações médicas/financeiras/jurídicas categóricas. Se o tema tocar em área regulada (saúde, direito, finanças), inclua uma nota em "notes" sugerindo revisão por um profissional antes de publicar.

Responda SOMENTE com um JSON válido, sem markdown, no formato exato (nada de texto antes ou depois do JSON):
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

function extractIdeasJson(blocks: { type: string; text?: string }[]) {
  const textBlocks = blocks.filter(
    (b): b is { type: "text"; text: string } => b.type === "text",
  );
  for (let i = textBlocks.length - 1; i >= 0; i--) {
    try {
      return parseIdeas(textBlocks[i].text);
    } catch {
      continue;
    }
  }
  throw new Error("A IA não retornou uma lista de ideias válida.");
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
      max_tokens: 4000,
      tools: [{ type: "web_search_20260209", name: "web_search", max_uses: 5 }],
      messages: [{ role: "user", content: prompt }],
    });
    generated = extractIdeasJson(response.content);
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
