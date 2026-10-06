import { gunzipSync, gzipSync, strFromU8, strToU8 } from "fflate";
import type { AppLang, AppView, JsonLdDocument } from "../domain/types";

export const DOC_SOFT_LIMIT = 8_000;

export type HashState = {
  lang: AppLang;
  view: AppView;
  doc: string | null;
};

const VIEWS: AppView[] = ["editor", "scheda", "grafo", "sorgente", "vocabolari"];

function isView(value: string | null): value is AppView {
  return Boolean(value && VIEWS.includes(value as AppView));
}

function isLang(value: string | null): value is AppLang {
  return value === "it" || value === "en";
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i += 1) {
    binary += String.fromCharCode(bytes[i]!);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlToBytes(base64url: string): Uint8Array {
  let b64 = base64url.replace(/-/g, "+").replace(/_/g, "/");
  while (b64.length % 4) b64 += "=";
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export function parseHash(hash: string = window.location.hash): HashState {
  const raw = hash.replace(/^#/, "").trim();
  const params = new URLSearchParams(raw);
  const langParam = params.get("lang");
  const viewParam = params.get("view");
  const lang: AppLang = isLang(langParam) ? langParam : "it";
  const view: AppView = isView(viewParam) ? viewParam : "editor";
  const doc = params.get("doc");
  return { lang, view, doc: doc && doc.length ? doc : null };
}

export function buildHash({ lang, view, doc }: HashState): string {
  const params = new URLSearchParams();
  params.set("lang", lang);
  params.set("view", view);
  if (doc) params.set("doc", doc);
  return `#${params.toString()}`;
}

/** gzip + base64url del JSON-LD scheda corrente. */
export async function compressJson(value: unknown): Promise<string> {
  const jsonString = JSON.stringify(value);
  const compressed = gzipSync(strToU8(jsonString), { level: 9 });
  return bytesToBase64Url(compressed);
}

export async function decompressJson(base64url: string): Promise<JsonLdDocument> {
  const bytes = base64UrlToBytes(base64url);
  const text = strFromU8(gunzipSync(bytes));
  const data = JSON.parse(text) as JsonLdDocument;
  if (!data || typeof data !== "object" || !Array.isArray(data["@graph"])) {
    throw new Error("Documento decompresso non valido.");
  }
  return data;
}

export function writeHash(state: HashState, { replace = true } = {}): void {
  const next = `${window.location.pathname}${window.location.search}${buildHash(state)}`;
  if (replace) {
    window.history.replaceState(null, "", next);
  } else {
    window.history.pushState(null, "", next);
  }
}
