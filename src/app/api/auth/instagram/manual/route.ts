import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { fetchConnectedInstagramAccounts } from "@/lib/social/instagram";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const { access_token } = await request.json();
  if (!access_token || typeof access_token !== "string") {
    return NextResponse.json(
      { error: "access_token é obrigatório." },
      { status: 400 },
    );
  }

  try {
    const { accounts, pagesFound } =
      await fetchConnectedInstagramAccounts(access_token);

    if (accounts.length === 0) {
      const detail = pagesFound.length
        ? `Páginas encontradas: ${pagesFound.map((p) => p.name).join(", ")} — nenhuma tem Instagram Business vinculado.`
        : "Nenhuma Página do Facebook foi encontrada para esse token.";
      return NextResponse.json(
        { error: `Nenhuma conta de Instagram Business encontrada. ${detail}` },
        { status: 404 },
      );
    }

    const rows = accounts.map((acc) => ({
      user_id: user.id,
      provider: "instagram" as const,
      external_account_id: acc.igAccountId,
      external_username: acc.igUsername,
      profile_picture_url: acc.profilePictureUrl,
      page_id: acc.pageId,
      page_access_token: acc.pageAccessToken,
      token_expires_at: null,
      connected_at: new Date().toISOString(),
    }));

    const { error: upsertError } = await supabase
      .schema("editorial")
      .from("social_connections")
      .upsert(rows, { onConflict: "user_id,provider,external_account_id" });

    if (upsertError) {
      return NextResponse.json({ error: upsertError.message }, { status: 500 });
    }

    return NextResponse.json({ connected: accounts.length });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Falha ao conectar." },
      { status: 502 },
    );
  }
}
