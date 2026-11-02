export interface VideoItem {
  id: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  channelTitle: string;
  channelId: string;
  channelAvatar?: string;
  publishedAt: string;
  viewCount?: string;
  likeCount?: string;
  duration?: string;
  categoryId?: string;
  tags?: string[];
}

export interface CommentItem {
  id: string;
  authorName: string;
  authorAvatar: string;
  textDisplay: string;
  publishedAt: string;
  likeCount: number;
}

export interface CategoryOption {
  id: string;
  label: string;
  categoryId?: string;
  query?: string;
}
