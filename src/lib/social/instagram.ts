const GRAPH_VERSION = "v21.0";
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_VERSION}`;

const SCOPES = [
  "instagram_basic",
  "instagram_manage_insights",
  "pages_show_list",
  "pages_read_engagement",
].join(",");

function requireCredentials() {
  const appId = process.env.META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;
  if (!appId || !appSecret) {
    throw new Error(
      "META_APP_ID / META_APP_SECRET não configuradas. Adicione as chaves nas variáveis de ambiente do projeto.",
    );
  }
  return { appId, appSecret };
}

export function isInstagramConfigured() {
  return !!(process.env.META_APP_ID && process.env.META_APP_SECRET);
}

export function getInstagramAuthUrl(redirectUri: string, state: string) {
  const { appId } = requireCredentials();
  const url = new URL(`https://www.facebook.com/${GRAPH_VERSION}/dialog/oauth`);
  url.searchParams.set("client_id", appId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("state", state);
  url.searchParams.set("scope", SCOPES);
  url.searchParams.set("response_type", "code");
  return url.toString();
}

async function graphGet(path: string, params: Record<string, string>) {
  const url = new URL(`${GRAPH_BASE}${path}`);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  const res = await fetch(url.toString());
  const json = await res.json();
  if (!res.ok || json.error) {
    throw new Error(
      json.error?.message ?? `Falha na chamada ao Graph API (${res.status}).`,
    );
  }
  return json;
}

export async function exchangeCodeForUserToken(
  code: string,
  redirectUri: string,
) {
  const { appId, appSecret } = requireCredentials();
  const json = await graphGet("/oauth/access_token", {
    client_id: appId,
    client_secret: appSecret,
    redirect_uri: redirectUri,
    code,
  });
  return json.access_token as string;
}

export async function exchangeForLongLivedToken(shortLivedToken: string) {
  const { appId, appSecret } = requireCredentials();
  const json = await graphGet("/oauth/access_token", {
    grant_type: "fb_exchange_token",
    client_id: appId,
    client_secret: appSecret,
    fb_exchange_token: shortLivedToken,
  });
  return {
    accessToken: json.access_token as string,
    expiresIn: json.expires_in as number | undefined,
  };
}

export interface ConnectedInstagramAccount {
  pageId: string;
  pageName: string;
  pageAccessToken: string;
  igAccountId: string;
  igUsername: string | null;
  profilePictureUrl: string | null;
}

export async function fetchConnectedInstagramAccounts(
  userAccessToken: string,
): Promise<ConnectedInstagramAccount[]> {
  const pagesResponse = await graphGet("/me/accounts", {
    access_token: userAccessToken,
    fields: "id,name,access_token",
  });

  const pages = (pagesResponse.data ?? []) as {
    id: string;
    name: string;
    access_token: string;
  }[];

  const accounts: ConnectedInstagramAccount[] = [];

  for (const page of pages) {
    try {
      const pageDetails = await graphGet(`/${page.id}`, {
        access_token: page.access_token,
        fields: "instagram_business_account{id,username,profile_picture_url}",
      });

      const igAccount = pageDetails.instagram_business_account;
      if (igAccount?.id) {
        accounts.push({
          pageId: page.id,
          pageName: page.name,
          pageAccessToken: page.access_token,
          igAccountId: igAccount.id,
          igUsername: igAccount.username ?? null,
          profilePictureUrl: igAccount.profile_picture_url ?? null,
        });
      }
    } catch {
      // Página sem Instagram Business vinculado ou sem permissão; ignora.
    }
  }

  return accounts;
}
