import { createClient } from "@/lib/supabase/server";
import DashboardClient from "./DashboardClient";
import type { BrandProfile, Idea, Post } from "@/types/db";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: profiles }, { data: ideas }, { data: posts }] =
    await Promise.all([
      supabase
        .schema("editorial")
        .from("brand_profiles")
        .select("*")
        .eq("archived", false)
        .order("created_at", { ascending: true }),
      supabase
        .schema("editorial")
        .from("ideas")
        .select("*")
        .order("created_at", { ascending: false }),
      supabase.schema("editorial").from("posts").select("*"),
    ]);

  return (
    <DashboardClient
      profiles={(profiles as BrandProfile[]) ?? []}
      ideas={(ideas as Idea[]) ?? []}
      posts={(posts as Post[]) ?? []}
      userEmail={user!.email ?? ""}
    />
  );
}
