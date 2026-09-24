import type { HistoryPage, NewVisit, Person, SearchResult, Site, SiteSummary } from './types';

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api${path}`, {
      ...options,
      headers: { 'Content-Type': 'application/json', ...options?.headers },
      cache: 'no-store',
    });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') throw error;
    throw new ApiError('The small web is out of reach. Check your connection and try again.', 0);
  }
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    const message = Array.isArray(body?.message) ? body.message.join(' ') : body?.message;
    throw new ApiError(
      typeof message === 'string'
        ? message
        : 'The server could not complete this request. Please try again.',
      response.status,
    );
  }
  return response.json() as Promise<T>;
}

export const api = {
  people: () => request<Person[]>('/people'),
  directory: () => request<SiteSummary[]>('/sites'),
  site: (address: string, signal?: AbortSignal) =>
    request<Site>(`/sites/${encodeURIComponent(address)}`, { signal }),
  search: (query: string, signal?: AbortSignal) =>
    request<SearchResult[]>(`/search?q=${encodeURIComponent(query)}`, { signal }),
  history: (personId: string, cursor?: string, signal?: AbortSignal) =>
    request<HistoryPage>(
      `/people/${encodeURIComponent(personId)}/history${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ''}`,
      { signal },
    ),
  visit: (visit: NewVisit) =>
    request<{ id: string }>('/visits', { method: 'POST', body: JSON.stringify(visit) }),
  publish: (site: Omit<Site, 'publishedAt'>) =>
    request<Site>('/sites', { method: 'POST', body: JSON.stringify(site) }),
};

export function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.';
}
