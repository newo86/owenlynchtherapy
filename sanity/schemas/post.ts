import { defineField, defineType } from 'sanity';

export const postSchema = defineType({
  name: 'post',
  title: 'Blog Post',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      validation: (r) => r.required().max(100),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: { source: 'title', maxLength: 96 },
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'author',
      title: 'Author',
      type: 'string',
      initialValue: 'Owen Lynch',
    }),
    defineField({
      name: 'publishedAt',
      title: 'Published at',
      type: 'datetime',
      initialValue: () => new Date().toISOString(),
    }),
    defineField({
      name: 'excerpt',
      title: 'Excerpt',
      type: 'text',
      rows: 3,
      description: 'Short summary shown on blog listing cards and in meta description. Max 200 characters.',
      validation: (r) => r.max(200),
    }),
    defineField({
      name: 'featuredImage',
      title: 'Featured Image',
      type: 'image',
      options: { hotspot: true },
      fields: [
        defineField({
          name: 'alt',
          title: 'Alt text',
          type: 'string',
          validation: (r) => r.required(),
        }),
      ],
    }),
    defineField({
      name: 'category',
      title: 'Category',
      type: 'string',
      options: {
        list: [
          { title: 'OCD', value: 'OCD' },
          { title: 'Anxiety', value: 'Anxiety' },
          { title: 'ADHD', value: 'ADHD' },
          { title: 'Autism', value: 'Autism' },
          { title: 'Depression', value: 'Depression' },
          { title: 'Relationships', value: 'Relationships' },
          { title: 'LGBTQ+ Mental Health', value: 'LGBTQ+ Mental Health' },
          { title: 'General', value: 'General' },
        ],
      },
    }),
    defineField({
      name: 'body',
      title: 'Body',
      type: 'array',
      of: [
        {
          type: 'block',
          styles: [
            { title: 'Normal', value: 'normal' },
            { title: 'Heading 2', value: 'h2' },
            { title: 'Heading 3', value: 'h3' },
            { title: 'Quote', value: 'blockquote' },
          ],
          marks: {
            decorators: [
              { title: 'Bold', value: 'strong' },
              { title: 'Italic', value: 'em' },
            ],
            annotations: [
              {
                name: 'link',
                type: 'object',
                title: 'Link',
                fields: [
                  defineField({ name: 'href', type: 'string', title: 'URL' }),
                  defineField({ name: 'blank', type: 'boolean', title: 'Open in new tab' }),
                ],
              },
            ],
          },
        },
        {
          type: 'image',
          options: { hotspot: true },
          fields: [
            defineField({ name: 'alt', type: 'string', title: 'Alt text' }),
            defineField({ name: 'caption', type: 'string', title: 'Caption' }),
          ],
        },
      ],
    }),
    defineField({
      name: 'seoTitle',
      title: 'SEO Title (optional override)',
      type: 'string',
      description: 'Overrides the page <title> tag if set.',
    }),
    defineField({
      name: 'seoDescription',
      title: 'SEO Description (optional override)',
      type: 'text',
      rows: 2,
      description: 'Overrides the meta description if set.',
      validation: (r) => r.max(160),
    }),
    defineField({
      name: 'references',
      title: 'References',
      type: 'array',
      of: [
        {
          type: 'object',
          fields: [
            defineField({ name: 'authors', title: 'Authors', type: 'text', rows: 2 }),
            defineField({ name: 'year', title: 'Year', type: 'string' }),
            defineField({ name: 'title', title: 'Title', type: 'string' }),
            defineField({ name: 'journal', title: 'Journal or Book', type: 'string' }),
            defineField({ name: 'volume', title: 'Volume', type: 'string' }),
            defineField({ name: 'issue', title: 'Issue', type: 'string' }),
            defineField({ name: 'pages', title: 'Pages', type: 'string' }),
            defineField({ name: 'doi', title: 'DOI', type: 'string' }),
          ],
          preview: {
            select: { title: 'authors', subtitle: 'year' },
          },
        },
      ],
    }),
  ],
  preview: {
    select: {
      title: 'title',
      media: 'featuredImage',
      subtitle: 'publishedAt',
    },
  },
});
