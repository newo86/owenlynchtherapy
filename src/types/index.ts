export interface SanitySlug {
  current: string;
}

export interface Post {
  _id: string;
  title: string;
  slug: SanitySlug;
  excerpt?: string;
  publishedAt: string;
  imageUrl?: string;
  imageAlt?: string;
  body?: PortableTextBlock[];
}

// Minimal PortableText block type — extend when rendering body content
export interface PortableTextBlock {
  _type: string;
  _key: string;
  children?: PortableTextSpan[];
  markDefs?: unknown[];
  style?: string;
}

export interface PortableTextSpan {
  _type: 'span';
  _key: string;
  text: string;
  marks?: string[];
}
