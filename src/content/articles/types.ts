export interface Article {
  slug: string;
  title: string;
  seoTitle: string;
  seoDescription: string;
  excerpt: string;
  category: string | null;
  author: string;
  publishedAt: string;
  updatedAt: string;
  featuredImage?: { src: string; alt: string };
  bodyHtml: string;
  referencesHtml: string | null;
}
