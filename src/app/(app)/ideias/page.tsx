import { createClient } from "@/lib/supabase/server";
import IdeasClient from "./IdeasClient";
import type { BrandProfile, Idea } from "@/types/db";

export default async function IdeiasPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: ideas }, { data: profiles }] = await Promise.all([
    supabase
      .schema("editorial")
      .from("ideas")
      .select("*")
      .order("created_at", { ascending: false }),
    supabase
      .schema("editorial")
      .from("brand_profiles")
      .select("*")
      .eq("archived", false)
      .order("created_at", { ascending: true }),
  ]);

  return (
    <IdeasClient
      initialIdeas={(ideas as Idea[]) ?? []}
      profiles={(profiles as BrandProfile[]) ?? []}
      userId={user!.id}
    />
  );
}
