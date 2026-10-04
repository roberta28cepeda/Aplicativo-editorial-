import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAnthropicClient, IDEAS_MODEL } from "@/lib/ai/anthropic";
import type { BrandProfile, Post } from "@/types/db";

function formatPost(post: Post) {
  const metrics = [
    post.metric_reach != null ? `alcance ${post.metric_reach}` : null,
    post.metric_likes != null ? `curtidas ${post.metric_likes}` : null,
    post.metric_comments != null ? `comentários ${post.metric_comments}` : null,
    post.metric_saves != null ? `salvamentos ${post.metric_saves}` : null,
    post.metric_shares != null ? `compart. ${post.metric_shares}` : null,
  ]
    .filter(Boolean)
    .join(", ");

  return `- [${post.scheduled_date ?? "sem data"}] "${post.title}" (${post.post_type}) — tags: ${post.tags.join(", ") || "nenhuma"}${metrics ? ` — métricas: ${metrics}` : " — sem métricas registradas"}`;
}

function buildPrompt(
  profile: BrandProfile,
  postedPosts: Post[],
  upcomingPosts: Post[],
) {
  return `Você é uma estrategista de conteúdo para redes sociais no Brasil, analisando o histórico de uma conta específica para sugerir melhorias reais.

Perfil da marca (leve TODAS essas particularidades em conta — a análise e as sugestões precisam ser específicas deste perfil, nunca genéricas e nunca aplicáveis a qualquer conta):
- Nome: ${profile.name}
- Plataforma: ${profile.platform} (ajuste a leitura ao formato: Instagram valoriza visual/engajamento, LinkedIn valoriza autoridade/profissionalismo da página da empresa, Google Perfil da Empresa valoriza informação local/atualizações práticas)
- Nicho: ${profile.niche ?? "não informado"}
- Tom de voz: ${profile.tone_of_voice ?? "não informado"}
- Público-alvo: ${profile.target_audience ?? "não informado"}
- Diferenciais: ${profile.differentiators ?? "não informado"}
- Notas gerais (particularidades específicas deste perfil, trate como restrições/contexto obrigatório): ${profile.notes ?? "nenhuma"}

Posts já publicados (histórico, mais recente primeiro):
${postedPosts.length ? postedPosts.map(formatPost).join("\n") : "(nenhum post publicado registrado ainda)"}

Posts já planejados para os próximos dias (não repita esses temas):
${upcomingPosts.length ? upcomingPosts.map(formatPost).join("\n") : "(nada planejado ainda)"}

Tarefa: analise esses dados com honestidade. Se houver poucos posts ou poucas métricas registradas, diga isso claramente em vez de inventar padrões. Não afirme "melhor dia/horário" sem dados suficientes que sustentem isso.

Responda SOMENTE com um JSON válido, sem markdown ao redor, no formato exato:
{
  "analysis": "análise em texto corrido (pode usar markdown simples com ## e -), cobrindo: o que parece funcionar (ou nota sobre dados insuficientes), buracos no calendário planejado, e recomendações práticas",
  "suggested_ideas": [
    {"title": "título curto", "notes": "por que essa ideia faz sentido agora, baseado na análise", "format": "feed|reel|story|carousel", "tags": ["tag1"]}
  ]
}

Gere entre 3 e 5 suggested_ideas.`;
}

function parseAnalysis(text: string) {
  const cleaned = text.trim().replace(/^```json\s*/i, "").replace(/```$/, "");
  const parsed = JSON.parse(cleaned);
  if (typeof parsed.analysis !== "string" || !Array.isArray(parsed.suggested_ideas)) {
    throw new Error("Resposta da IA em formato inesperado.");
  }
  return parsed as {
    analysis: string;
    suggested_ideas: { title: string; notes: string; format: string; tags: string[] }[];
  };
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

  const today = new Date().toISOString().slice(0, 10);

  const [{ data: postedPosts }, { data: upcomingPosts }] = await Promise.all([
    supabase
      .schema("editorial")
      .from("posts")
      .select("*")
      .eq("brand_profile_id", brand_profile_id)
      .eq("status", "posted")
      .order("scheduled_date", { ascending: false })
      .limit(30),
    supabase
      .schema("editorial")
      .from("posts")
      .select("*")
      .eq("brand_profile_id", brand_profile_id)
      .neq("status", "posted")
      .gte("scheduled_date", today)
      .order("scheduled_date", { ascending: true })
      .limit(20),
  ]);

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
    (postedPosts as Post[]) ?? [],
    (upcomingPosts as Post[]) ?? [],
  );

  let result;
  try {
    const response = await anthropic.messages.create({
      model: IDEAS_MODEL,
      max_tokens: 3000,
      messages: [{ role: "user", content: prompt }],
    });
    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      throw new Error("A IA não retornou texto.");
    }
    result = parseAnalysis(textBlock.text);
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? `Falha ao analisar: ${err.message}`
            : "Falha ao analisar.",
      },
      { status: 502 },
    );
  }

  const ideaRows = result.suggested_ideas.map((idea) => ({
    user_id: user.id,
    brand_profile_id,
    title: idea.title,
    notes: idea.notes,
    tags: Array.isArray(idea.tags) ? idea.tags : [],
    ai_generated: true,
    status: "inbox" as const,
  }));

  const [{ data: insertedIdeas }] = await Promise.all([
    ideaRows.length
      ? supabase.schema("editorial").from("ideas").insert(ideaRows).select()
      : Promise.resolve({ data: [] }),
    supabase
      .schema("editorial")
      .from("brand_profiles")
      .update({
        last_analysis: result.analysis,
        last_analysis_at: new Date().toISOString(),
      })
      .eq("id", brand_profile_id),
  ]);

  return NextResponse.json({
    analysis: result.analysis,
    suggested_ideas: insertedIdeas ?? [],
  });
}
