import type { Draft, JsonLdDocument, SuggestionField } from "./types";
import * as model from "./schedaModel";
import * as suggest from "./schedaSuggest";

export const emptyDraft = model.emptyDraft as () => Draft;
export const emptyTypedItem = model.emptyTypedItem;
export const emptyLoc = model.emptyLoc;
export const normalizeLoc = model.normalizeLoc as (
  value: unknown,
) => { it: string; en: string };
export const pickLoc = model.pickLoc as (
  value: unknown,
  lang?: "it" | "en",
) => string;
export const locHasContent = model.locHasContent as (value: unknown) => boolean;
export const normalizeDraft = model.normalizeDraft as (draft: Draft) => Draft;
export const formToDocument = model.formToDocument as (draft: Draft) => JsonLdDocument;
export const documentToForm = model.documentToForm as (
  doc: JsonLdDocument,
  serviceId?: string | null,
) => Draft;
export const validateDraft = model.validateDraft as (draft: Draft) => string[];
export const parseJsonLdText = model.parseJsonLdText as (text: string) => JsonLdDocument;
export const listPublicServices = model.listPublicServices as (
  doc: JsonLdDocument,
) => { id: string; title: string }[];
export const serviceSlice = model.serviceSlice as (
  doc: JsonLdDocument,
  serviceId: string,
) => JsonLdDocument;
export const filenameForDraft = model.filenameForDraft as (draft: Draft) => string;
export const playgroundUrl = model.playgroundUrl as (document: JsonLdDocument) => string;
export const labelMapEntries = model.labelMapEntries as (
  map: Record<string, string>,
) => { id: string; label: string }[];
export const applySuggestions = suggest.applySuggestions as (draft: Draft) => {
  draft: Draft;
  changed: number;
  fields: SuggestionField[];
};
