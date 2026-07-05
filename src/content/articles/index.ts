import type { Article } from './types';
import { article as article1 } from './the-body-doesn-t-keep-the-score-a-neuroscientific-rewrite-of-trauma';
import { article as article2 } from './how-ocd-therapy-works';

export type { Article };

export const articles: Article[] = [article1, article2];

export function getArticle(slug: string): Article | undefined {
  return articles.find(a => a.slug === slug);
}
