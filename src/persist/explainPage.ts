export const EXPLAIN_PARAM = "spiegazione";

export function isExplainSearch(search: string): boolean {
  return new URLSearchParams(search).has(EXPLAIN_PARAM);
}

/** Path, query e fragment senza `spiegazione`. */
export function withoutExplainSearch(href: string, base = "http://localhost"): string {
  const url = new URL(href, base);
  url.searchParams.delete(EXPLAIN_PARAM);
  return `${url.pathname}${url.search}${url.hash}`;
}
