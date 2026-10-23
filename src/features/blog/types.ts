export interface BlogLabel {
  id: string;
  label: string;
}
export interface BlogMedia {
  src: string;
  alt: string;
  width: number;
  height: number;
  variants?: { src: string; width: number }[];
  srcDark?: string;
  preview?: {
    src: string;
    alt: string;
    width: number;
    height: number;
    variants?: { src: string; width: number }[];
    focalPoint?: { x: number; y: number };
  };
}
export interface BlogSource {
  id: string;
  label: string;
  publicHref: string;
}
export interface BlogPost {
  id: string;
  title: string;
  summary: string;
  kind: 'internal' | 'external';
  href: string;
  publishedAt: string;
  author?: string;
  categoryId?: string;
  tagIds: string[];
  technicalKeywords: string[];
  pullRequestRefs: { repository: string; number: number; href: string }[];
  cover?: BlogMedia;
  readingMinutes?: number;
  relatedIds: string[];
  evidenceIds: string[];
  resources: { label: string; href: string }[];
}
export interface BlogChannel {
  id: string;
  kind: 'wechat' | 'zhihu';
  title: string;
  description: string;
  href?: string;
  contactLabel?: string;
  contactValue?: string;
  qr?: BlogMedia;
}
export interface BlogIndex {
  posts: BlogPost[];
  categories: BlogLabel[];
  tags: BlogLabel[];
  featuredId?: string;
  channels: BlogChannel[];
  sources: BlogSource[];
  preview: boolean;
}
export interface BlogQuery {
  q: string;
  category: string;
  tag: string;
  page: number;
}
