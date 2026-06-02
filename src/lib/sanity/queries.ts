import { groq } from 'next-sanity';

export const allPostsQuery = groq`
  *[_type == "post" && defined(publishedAt)] | order(publishedAt desc) {
    _id,
    title,
    slug,
    author,
    excerpt,
    category,
    publishedAt,
    "featuredImageUrl": featuredImage.asset->url,
    "featuredImageAlt": featuredImage.alt
  }
`;

export const postBySlugQuery = groq`
  *[_type == "post" && slug.current == $slug][0] {
    _id,
    title,
    slug,
    author,
    excerpt,
    category,
    publishedAt,
    "body": body[]{
      ...,
      _type == "image" => {
        ...,
        "asset": asset->{ url, _id }
      }
    },
    references,
    seoTitle,
    seoDescription,
    "featuredImageUrl": featuredImage.asset->url,
    "featuredImageAlt": featuredImage.alt
  }
`;

export const allPostSlugsQuery = groq`
  *[_type == "post" && defined(publishedAt)] { "slug": slug.current }
`;
