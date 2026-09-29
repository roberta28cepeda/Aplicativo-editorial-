export type IdeaStatus = "inbox" | "planned" | "archived";
export type PostStatus = "idea" | "draft" | "art_ready" | "scheduled" | "posted";
export type PostType = "feed" | "reel" | "story" | "carousel";
export type Platform = "instagram" | "tiktok" | "facebook" | "linkedin" | "outro";

export interface Idea {
  id: string;
  user_id: string;
  source_url: string | null;
  image_path: string | null;
  title: string;
  notes: string | null;
  tags: string[];
  status: IdeaStatus;
  created_at: string;
}

export interface Post {
  id: string;
  user_id: string;
  idea_id: string | null;
  title: string;
  caption: string | null;
  platform: Platform;
  post_type: PostType;
  scheduled_date: string | null;
  status: PostStatus;
  art_path: string | null;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export const POST_STATUS_LABEL: Record<PostStatus, string> = {
  idea: "Ideia",
  draft: "Rascunho",
  art_ready: "Arte pronta",
  scheduled: "Agendado",
  posted: "Publicado",
};

export const POST_STATUS_COLOR: Record<PostStatus, string> = {
  idea: "bg-neutral-200 text-neutral-700",
  draft: "bg-blue-100 text-blue-700",
  art_ready: "bg-purple-100 text-purple-700",
  scheduled: "bg-amber-100 text-amber-800",
  posted: "bg-green-100 text-green-700",
};

export const POST_TYPE_LABEL: Record<PostType, string> = {
  feed: "Feed",
  reel: "Reel",
  story: "Stories",
  carousel: "Carrossel",
};

export const PLATFORM_LABEL: Record<Platform, string> = {
  instagram: "Instagram",
  tiktok: "TikTok",
  facebook: "Facebook",
  linkedin: "LinkedIn",
  outro: "Outro",
};

export const IDEA_STATUS_LABEL: Record<IdeaStatus, string> = {
  inbox: "Inbox",
  planned: "Planejada",
  archived: "Arquivada",
};
