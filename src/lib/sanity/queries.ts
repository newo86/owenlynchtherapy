import { groq } from 'next-sanity';

export const allPostsQuery = groq`
  *[_type == "post"] | order(publishedAt desc) {
    _id,
    title,
    slug,
    excerpt,
    publishedAt,
    "imageUrl": mainImage.asset->url
  }
`;

export const postBySlugQuery = groq`
  *[_type == "post" && slug.current == $slug][0] {
    _id,
    title,
    slug,
    excerpt,
    publishedAt,
    body,
    "imageUrl": mainImage.asset->url,
    "imageAlt": mainImage.alt
  }
`;

export const allPostSlugsQuery = groq`
  *[_type == "post"] { "slug": slug.current }
`;
