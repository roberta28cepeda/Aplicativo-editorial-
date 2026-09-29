import { createClient } from "@/lib/supabase/server";
import CalendarClient from "./CalendarClient";
import type { Idea, Post } from "@/types/db";

export default async function CalendarioPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: posts }, { data: ideas }] = await Promise.all([
    supabase.schema("editorial").from("posts").select("*"),
    supabase
      .schema("editorial")
      .from("ideas")
      .select("*")
      .order("created_at", { ascending: false }),
  ]);

  return (
    <CalendarClient
      initialPosts={(posts as Post[]) ?? []}
      ideas={(ideas as Idea[]) ?? []}
      userId={user!.id}
    />
  );
}
