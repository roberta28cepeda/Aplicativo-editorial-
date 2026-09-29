import { createClient } from "@/lib/supabase/server";
import DesempenhoClient from "./DesempenhoClient";
import type { BrandProfile, Idea, Post } from "@/types/db";

export default async function DesempenhoPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: profiles }, { data: posts }, { data: ideas }] =
    await Promise.all([
      supabase
        .schema("editorial")
        .from("brand_profiles")
        .select("*")
        .eq("archived", false)
        .order("created_at", { ascending: true }),
      supabase
        .schema("editorial")
        .from("posts")
        .select("*")
        .order("scheduled_date", { ascending: false }),
      supabase
        .schema("editorial")
        .from("ideas")
        .select("*")
        .order("created_at", { ascending: false }),
    ]);

  return (
    <DesempenhoClient
      profiles={(profiles as BrandProfile[]) ?? []}
      initialPosts={(posts as Post[]) ?? []}
      ideas={(ideas as Idea[]) ?? []}
      userId={user!.id}
    />
  );
}
