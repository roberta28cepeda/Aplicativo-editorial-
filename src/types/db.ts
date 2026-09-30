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
  idea: "bg-[#e9e6df] text-[#777871]",
  draft: "bg-[#ebe3ef] text-[#75617e]",
  art_ready: "bg-[#e9e2ed] text-[#70607c]",
  scheduled: "bg-[#f8dfd5] text-[#a85032]",
  posted: "bg-[#e1ede3] text-[#58745d]",
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
  instagram: "bg-[#f8dfd5] text-[#a85032]",
  linkedin: "bg-[#e9e2ed] text-[#70607c]",
  google_business: "bg-[#f3e6c9] text-[#8a6a1e]",
  outro: "bg-[#e9e6df] text-[#777871]",
};
