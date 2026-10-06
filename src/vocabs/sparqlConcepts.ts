import type { VocabEntry, VocabLabels } from "../domain/types";

export type ConceptsSource = "sparql" | "ttl" | "local" | "cache";

export type ConceptsLoadResult = {
  entries: VocabEntry[];
  source: ConceptsSource;
};

const SPARQL_ENDPOINT = "https://schema.gov.it/sparql";
const CPV_TTL_URL =
  "https://raw.githubusercontent.com/italia/dati-semantic-assets/master/Ontologie/CPV/latest/CPV-AP_IT.ttl";
const LOCAL_CONCEPTS_PATH = "./vocabs/concepts.json";
const CACHE_KEY = "cpsv-concepts-v1";
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const FETCH_TIMEOUT_MS = 15_000;
const CPV_PREFIX = "https://w3id.org/italia/onto/CPV/";

const CPV_PROPERTIES_QUERY = `
PREFIX owl: <http://www.w3.org/2002/07/owl#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
SELECT DISTINCT ?uri ?labelIt ?labelEn WHERE {
  ?uri a ?type .
  FILTER(?type IN (owl:DatatypeProperty, owl:ObjectProperty))
  FILTER(STRSTARTS(STR(?uri), "${CPV_PREFIX}"))
  OPTIONAL {
    ?uri rdfs:label ?labelIt .
    FILTER(LANGMATCHES(LANG(?labelIt), "it"))
  }
  OPTIONAL {
    ?uri rdfs:label ?labelEn .
    FILTER(LANGMATCHES(LANG(?labelEn), "en"))
  }
}
ORDER BY ?uri
`.trim();

type SparqlBinding = {
  type: string;
  value: string;
  "xml:lang"?: string;
};

type SparqlResults = {
  results?: {
    bindings?: Array<Record<string, SparqlBinding | undefined>>;
  };
};

type CachePayload = {
  at: number;
  source: Exclude<ConceptsSource, "cache">;
  entries: VocabEntry[];
};

function localName(uri: string): string {
  const hash = uri.lastIndexOf("#");
  const slash = uri.lastIndexOf("/");
  return uri.slice(Math.max(hash, slash) + 1) || uri;
}

function normalizeLabels(it: string, en: string, fallbackId: string): VocabLabels {
  const itLabel = it.trim() || en.trim() || localName(fallbackId);
  const enLabel = en.trim() || itLabel;
  return { it: itLabel, en: enLabel };
}

function sortEntries(entries: VocabEntry[]): VocabEntry[] {
  return [...entries].sort((a, b) =>
    a.labels.it.localeCompare(b.labels.it, "it", { sensitivity: "base" }),
  );
}

export function mapSparqlBindings(data: SparqlResults): VocabEntry[] {
  const bindings = data.results?.bindings || [];
  const byId = new Map<string, VocabEntry>();

  for (const row of bindings) {
    const uri = row.uri?.value;
    if (!uri || !uri.startsWith(CPV_PREFIX)) continue;
    const labels = normalizeLabels(
      row.labelIt?.value || "",
      row.labelEn?.value || "",
      uri,
    );
    byId.set(uri, { id: uri, labels });
  }

  return sortEntries([...byId.values()]);
}

export function parseCpvTtl(ttl: string): VocabEntry[] {
  const blocks = ttl.split(/\n(?=###\s+https:\/\/w3id\.org\/italia\/onto\/CPV\/)/);
  const byId = new Map<string, VocabEntry>();

  for (const block of blocks) {
    const header = block.match(
      /^###\s+(https:\/\/w3id\.org\/italia\/onto\/CPV\/[A-Za-z][\w]*)/,
    );
    if (!header) continue;
    if (!/owl:(?:Datatype|Object)Property\b/.test(block)) continue;

    const uri = header[1];
    let it = "";
    let en = "";
    const labelGroup = block.match(
      /rdfs:label\s+((?:"(?:\\.|[^"\\])*"@[a-z]{2}\s*,?\s*)+)/,
    );
    const labelSource = labelGroup?.[1] || block;
    for (const [, text, lang] of labelSource.matchAll(
      /"((?:\\.|[^"\\])*)"@(it|en)/g,
    )) {
      if (lang === "it" && !it) it = text;
      if (lang === "en" && !en) en = text;
    }

    byId.set(uri, { id: uri, labels: normalizeLabels(it, en, uri) });
  }

  return sortEntries([...byId.values()]);
}

function readCache(): ConceptsLoadResult | null {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachePayload;
    if (!parsed?.entries?.length || typeof parsed.at !== "number") return null;
    if (Date.now() - parsed.at > CACHE_TTL_MS) return null;
    return { entries: parsed.entries, source: "cache" };
  } catch {
    return null;
  }
}

function writeCache(entries: VocabEntry[], source: Exclude<ConceptsSource, "cache">) {
  try {
    const payload: CachePayload = { at: Date.now(), source, entries };
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(payload));
  } catch {
    // ignore quota / private mode
  }
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit = {},
  timeoutMs = FETCH_TIMEOUT_MS,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function fetchFromSparql(): Promise<VocabEntry[]> {
  const url = new URL(SPARQL_ENDPOINT);
  url.searchParams.set("query", CPV_PROPERTIES_QUERY);
  const response = await fetchWithTimeout(url.toString(), {
    headers: { Accept: "application/sparql-results+json" },
  });
  if (!response.ok) {
    throw new Error(`SPARQL HTTP ${response.status}`);
  }
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("json") && !contentType.includes("sparql-results")) {
    // schema.gov.it may return HTML error pages with 200/503
    const preview = (await response.clone().text()).slice(0, 80).toLowerCase();
    if (preview.includes("<!doctype") || preview.includes("<html")) {
      throw new Error("SPARQL returned HTML");
    }
  }
  const data = (await response.json()) as SparqlResults;
  const entries = mapSparqlBindings(data);
  if (!entries.length) throw new Error("SPARQL returned no CPV concepts");
  return entries;
}

async function fetchFromTtl(): Promise<VocabEntry[]> {
  const response = await fetchWithTimeout(CPV_TTL_URL, {
    headers: { Accept: "text/turtle,text/plain,*/*" },
  });
  if (!response.ok) throw new Error(`TTL HTTP ${response.status}`);
  const entries = parseCpvTtl(await response.text());
  if (!entries.length) throw new Error("TTL parser found no CPV concepts");
  return entries;
}

async function fetchFromLocal(): Promise<VocabEntry[]> {
  const response = await fetch(LOCAL_CONCEPTS_PATH);
  if (!response.ok) return [];
  const map = (await response.json()) as Record<
    string,
    string | VocabLabels
  >;
  return sortEntries(
    Object.entries(map || {}).map(([id, value]) => {
      if (typeof value === "string") {
        return { id, labels: normalizeLabels(value, value, id) };
      }
      return {
        id,
        labels: normalizeLabels(value.it || "", value.en || "", id),
      };
    }),
  );
}

/** Load CPV concepts: cache → SPARQL → GitHub TTL → local JSON. */
export async function loadConceptsRemote(): Promise<ConceptsLoadResult> {
  const cached = readCache();
  if (cached) return cached;

  try {
    const entries = await fetchFromSparql();
    writeCache(entries, "sparql");
    return { entries, source: "sparql" };
  } catch (error) {
    console.warn("[concepts] SPARQL unavailable, trying TTL", error);
  }

  try {
    const entries = await fetchFromTtl();
    writeCache(entries, "ttl");
    return { entries, source: "ttl" };
  } catch (error) {
    console.warn("[concepts] TTL unavailable, using local fallback", error);
  }

  const entries = await fetchFromLocal();
  return { entries, source: "local" };
}
