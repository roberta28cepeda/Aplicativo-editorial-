import { createClient } from "@/lib/supabase/server";
import ProfilesClient from "./ProfilesClient";
import type { BrandProfile } from "@/types/db";

export default async function PerfisPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profiles } = await supabase
    .schema("editorial")
    .from("brand_profiles")
    .select("*")
    .order("created_at", { ascending: true });

  return (
    <ProfilesClient
      initialProfiles={(profiles as BrandProfile[]) ?? []}
      userId={user!.id}
    />
  );
}
