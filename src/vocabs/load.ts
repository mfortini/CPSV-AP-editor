import type { AppLang, VocabEntry, VocabLabels } from "../domain/types";
import {
  loadConceptsRemote,
  type ConceptsSource,
} from "./sparqlConcepts";

export type { ConceptsSource };

export type VocabBundle = {
  lifeEvents: VocabEntry[];
  themes: VocabEntry[];
  inputTypes: VocabEntry[];
  outputTypes: VocabEntry[];
  concepts: VocabEntry[];
  conceptsSource: ConceptsSource;
};

type RawVocabMap = Record<string, string | VocabLabels>;

function normalizeLabels(value: string | VocabLabels): VocabLabels {
  if (typeof value === "string") {
    return { it: value, en: value };
  }
  return {
    it: value.it || value.en || "",
    en: value.en || value.it || "",
  };
}

export function parseVocabMap(map: RawVocabMap): VocabEntry[] {
  return Object.entries(map || {}).map(([id, value]) => ({
    id,
    labels: normalizeLabels(value),
  }));
}

export function vocabLabel(entry: VocabEntry | undefined, lang: AppLang, fallback = ""): string {
  if (!entry) return fallback;
  return entry.labels[lang] || entry.labels.it || entry.labels.en || fallback;
}

export function findVocabLabel(
  entries: VocabEntry[] | undefined,
  id: string,
  lang: AppLang,
): string {
  return vocabLabel(entries?.find((entry) => entry.id === id), lang, id);
}

async function loadMap(path: string): Promise<VocabEntry[]> {
  const response = await fetch(path);
  if (!response.ok) return [];
  return parseVocabMap((await response.json()) as RawVocabMap);
}

export async function loadVocabs(): Promise<VocabBundle> {
  const [lifeEvents, themes, inputTypes, outputTypes, conceptsResult] =
    await Promise.all([
      loadMap("./vocabs/life-events.json"),
      loadMap("./vocabs/themes.json"),
      loadMap("./vocabs/input-types.json"),
      loadMap("./vocabs/output-types.json"),
      loadConceptsRemote(),
    ]);
  return {
    lifeEvents,
    themes,
    inputTypes,
    outputTypes,
    concepts: conceptsResult.entries,
    conceptsSource: conceptsResult.source,
  };
}
