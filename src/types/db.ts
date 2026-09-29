export type IdeaStatus = "inbox" | "planned" | "archived";
export type PostStatus = "idea" | "draft" | "art_ready" | "scheduled" | "posted";
export type PostType = "feed" | "reel" | "story" | "carousel";
export type Platform = "instagram" | "tiktok" | "facebook" | "linkedin" | "outro";
export type BrandPlatform = "instagram" | "linkedin" | "google_business" | "outro";

export interface BrandProfile {
  id: string;
  user_id: string;
  name: string;
  platform: BrandPlatform;
  handle: string | null;
  niche: string | null;
  tone_of_voice: string | null;
  target_audience: string | null;
  brand_colors: string[];
  differentiators: string | null;
  notes: string | null;
  logo_path: string | null;
  reference_images: string[];
  archived: boolean;
  last_analysis: string | null;
  last_analysis_at: string | null;
  created_at: string;
}

export interface SocialConnection {
  id: string;
  user_id: string;
  brand_profile_id: string | null;
  provider: "instagram";
  external_account_id: string;
  external_username: string | null;
  profile_picture_url: string | null;
  page_id: string | null;
  connected_at: string;
}

export interface Idea {
  id: string;
  user_id: string;
  brand_profile_id: string | null;
  source_url: string | null;
  image_path: string | null;
  title: string;
  notes: string | null;
  tags: string[];
  status: IdeaStatus;
  ai_generated: boolean;
  created_at: string;
}

export interface Post {
  id: string;
  user_id: string;
  idea_id: string | null;
  brand_profile_id: string | null;
  title: string;
  caption: string | null;
  platform: Platform;
  post_type: PostType;
  scheduled_date: string | null;
  status: PostStatus;
  art_path: string | null;
  tags: string[];
  ai_generated: boolean;
  metric_reach: number | null;
  metric_likes: number | null;
  metric_comments: number | null;
  metric_saves: number | null;
  metric_shares: number | null;
  created_at: string;
  updated_at: string;
}

export const METRIC_FIELDS: { key: keyof Post; label: string }[] = [
  { key: "metric_reach", label: "Alcance" },
  { key: "metric_likes", label: "Curtidas" },
  { key: "metric_comments", label: "Comentários" },
  { key: "metric_saves", label: "Salvamentos" },
  { key: "metric_shares", label: "Compartilhamentos" },
];

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

export const BRAND_PLATFORM_LABEL: Record<BrandPlatform, string> = {
  instagram: "Instagram",
  linkedin: "LinkedIn (Página de Empresa)",
  google_business: "Google Perfil da Empresa",
  outro: "Outro",
};

export const BRAND_PLATFORM_COLOR: Record<BrandPlatform, string> = {
  instagram: "bg-pink-100 text-pink-700",
  linkedin: "bg-sky-100 text-sky-700",
  google_business: "bg-yellow-100 text-yellow-800",
  outro: "bg-neutral-200 text-neutral-700",
};
