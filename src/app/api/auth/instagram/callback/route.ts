import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  exchangeCodeForUserToken,
  exchangeForLongLivedToken,
  fetchConnectedInstagramAccounts,
} from "@/lib/social/instagram";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const oauthError = searchParams.get("error_description");

  const redirectTo = (params: Record<string, string>) => {
    const url = new URL("/conexoes", origin);
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }
    return NextResponse.redirect(url);
  };

  if (oauthError) {
    return redirectTo({ error: oauthError });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login", origin));
  }

  const cookieStore = request.headers.get("cookie") ?? "";
  const expectedState = cookieStore
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith("ig_oauth_state="))
    ?.split("=")[1];

  if (!code || !state || !expectedState || state !== expectedState) {
    return redirectTo({ error: "Falha na verificação de segurança (state)." });
  }

  try {
    const redirectUri = new URL("/api/auth/instagram/callback", origin).toString();
    const shortLivedToken = await exchangeCodeForUserToken(code, redirectUri);
    const { accessToken: longLivedToken, expiresIn } =
      await exchangeForLongLivedToken(shortLivedToken);

    const { accounts, pagesFound } =
      await fetchConnectedInstagramAccounts(longLivedToken);

    if (accounts.length === 0) {
      const detail = pagesFound.length
        ? `Páginas encontradas: ${pagesFound.map((p) => p.name).join(", ")} — nenhuma tem Instagram Business vinculado.`
        : "Nenhuma Página do Facebook foi encontrada para esse login.";
      return redirectTo({
        error: `Login feito, mas nenhuma conta de Instagram Business foi encontrada. ${detail}`,
      });
    }

    const tokenExpiresAt = expiresIn
      ? new Date(Date.now() + expiresIn * 1000).toISOString()
      : null;

    const rows = accounts.map((acc) => ({
      user_id: user.id,
      provider: "instagram" as const,
      external_account_id: acc.igAccountId,
      external_username: acc.igUsername,
      profile_picture_url: acc.profilePictureUrl,
      page_id: acc.pageId,
      page_access_token: acc.pageAccessToken,
      token_expires_at: tokenExpiresAt,
      connected_at: new Date().toISOString(),
    }));

    const { error: upsertError } = await supabase
      .schema("editorial")
      .from("social_connections")
      .upsert(rows, { onConflict: "user_id,provider,external_account_id" });

    if (upsertError) {
      return redirectTo({ error: upsertError.message });
    }

    return redirectTo({ connected: String(accounts.length) });
  } catch (err) {
    return redirectTo({
      error: err instanceof Error ? err.message : "Falha ao conectar.",
    });
  }
}
