import { createClient } from "@/lib/supabase/server";
import CalendarClient from "./CalendarClient";
import type { BrandProfile, Idea, Post } from "@/types/db";

export default async function CalendarioPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: posts }, { data: ideas }, { data: profiles }] =
    await Promise.all([
      supabase.schema("editorial").from("posts").select("*"),
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
    <CalendarClient
      initialPosts={(posts as Post[]) ?? []}
      ideas={(ideas as Idea[]) ?? []}
      profiles={(profiles as BrandProfile[]) ?? []}
      userId={user!.id}
    />
  );
}
