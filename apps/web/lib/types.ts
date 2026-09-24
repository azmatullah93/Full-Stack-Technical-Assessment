export interface Person {
  id: string;
  name: string;
  color: string;
}
export interface SiteSummary {
  address: string;
  title: string;
  authorId: string;
  publishedAt: string;
}
export interface Site extends SiteSummary {
  html: string;
}
export interface SearchResult extends SiteSummary {
  excerpt: string;
}
export type VisitSource = 'typed' | 'link' | 'back' | 'forward' | 'history' | 'search';
export interface Visit {
  id: string;
  personId: string;
  address: string;
  title: string;
  source: VisitSource;
  outcome: 'found' | 'missing';
  visitedAt: string;
}
export interface HistoryPage {
  items: Visit[];
  nextCursor: string | null;
}
export type NewVisit = Omit<Visit, 'visitedAt'>;
