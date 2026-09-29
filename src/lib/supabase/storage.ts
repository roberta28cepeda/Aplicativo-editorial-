import { createClient } from "@/lib/supabase/client";

const BUCKET = "editorial-media";

export async function uploadMedia(userId: string, folder: string, file: File) {
  const supabase = createClient();
  const ext = file.name.split(".").pop();
  const path = `${userId}/${folder}/${crypto.randomUUID()}${ext ? `.${ext}` : ""}`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
  });

  if (error) throw error;
  return path;
}

export async function getSignedUrl(path: string, expiresIn = 3600) {
  const supabase = createClient();
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, expiresIn);

  if (error) throw error;
  return data.signedUrl;
}

export async function removeMedia(path: string) {
  const supabase = createClient();
  await supabase.storage.from(BUCKET).remove([path]);
}
