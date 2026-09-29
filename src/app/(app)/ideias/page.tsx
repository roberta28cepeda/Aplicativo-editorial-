import { createClient } from "@/lib/supabase/server";
import IdeasClient from "./IdeasClient";
import type { Idea } from "@/types/db";

export default async function IdeiasPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: ideas } = await supabase
    .schema("editorial")
    .from("ideas")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <IdeasClient
      initialIdeas={(ideas as Idea[]) ?? []}
      userId={user!.id}
    />
  );
}
