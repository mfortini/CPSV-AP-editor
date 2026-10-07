export type AppLang = "it" | "en";

/** Testo localizzato IT/EN (campi narrativi della scheda). */
export type LocalizedString = {
  it: string;
  en: string;
};

export type TypedItem = {
  text: LocalizedString;
  typeId: string;
};

export type SuggestionField = "inputType" | "outputType" | "duration" | "cost" | "orgId";

export type ProcessingTime = {
  text: LocalizedString;
  kind: string;
  amount: number | string;
  duration: string;
};

export type Cost = {
  text: LocalizedString;
  amount: number | string;
  currency: string;
};

export type Draft = {
  serviceId: string;
  title: LocalizedString;
  abstract: LocalizedString;
  description: LocalizedString;
  orgId: string;
  orgName: LocalizedString;
  orgHomepage: string;
  audience: LocalizedString;
  inputs: TypedItem[];
  outputs: TypedItem[];
  processingTime: ProcessingTime;
  cost: Cost;
  pageUrl: string;
  onlineUrls: string[];
  lifeEvents: string[];
  themes: string[];
  ioServiceId: string;
  howTo: LocalizedString;
};

export type JsonLdDocument = {
  "@context"?: Record<string, string> | unknown;
  "@graph": Record<string, unknown>[];
};

export type VocabLabels = { it: string; en: string };

export type VocabEntry = { id: string; labels: VocabLabels };

export type AppView = "editor" | "scheda" | "grafo" | "sorgente" | "vocabolari";
