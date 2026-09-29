import { createClient } from "@/lib/supabase/server";
import ConexoesClient from "./ConexoesClient";
import { isInstagramConfigured } from "@/lib/social/instagram";
import type { BrandProfile, SocialConnection } from "@/types/db";

export default async function ConexoesPage() {
  const supabase = await createClient();

  const [{ data: connections }, { data: profiles }] = await Promise.all([
    supabase
      .schema("editorial")
      .from("social_connections")
      .select(
        "id, user_id, brand_profile_id, provider, external_account_id, external_username, profile_picture_url, page_id, connected_at",
      )
      .order("connected_at", { ascending: false }),
    supabase
      .schema("editorial")
      .from("brand_profiles")
      .select("*")
      .eq("archived", false)
      .order("created_at", { ascending: true }),
  ]);

  return (
    <ConexoesClient
      initialConnections={(connections as SocialConnection[]) ?? []}
      profiles={(profiles as BrandProfile[]) ?? []}
      instagramConfigured={isInstagramConfigured()}
    />
  );
}
