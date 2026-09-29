import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getInstagramAuthUrl, isInstagramConfigured } from "@/lib/social/instagram";

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (!isInstagramConfigured()) {
    const url = new URL("/conexoes", request.url);
    url.searchParams.set(
      "error",
      "META_APP_ID / META_APP_SECRET não configuradas ainda.",
    );
    return NextResponse.redirect(url);
  }

  const state = crypto.randomUUID();
  const redirectUri = new URL("/api/auth/instagram/callback", request.url)
    .toString();
  const authUrl = getInstagramAuthUrl(redirectUri, state);

  const response = NextResponse.redirect(authUrl);
  response.cookies.set("ig_oauth_state", state, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });
  return response;
}
