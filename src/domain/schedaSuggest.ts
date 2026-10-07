// @ts-nocheck
/** Euristiche testo libero → campi tipizzati (solo slot vuoti). */

import {
  composeDuration,
  parseDurationUi,
  formatDurationLabel,
  normalizeLoc,
  pickLoc,
} from "./schedaModel";

export { composeDuration, parseDurationUi, formatDurationLabel };

const IO = "https://w3id.org/italia/controlled-vocabulary/classifications-for-public-services/service-input-output";

const INPUT_RULES = [
  { typeId: `${IO}/IDDEC`, re: /carta\s+d['’]?identit|documento\s+di\s+identit|\bcie\b|passaporto|carta\s+identit|identit[aà]/i },
  { typeId: `${IO}/REQ`, re: /istanza|domanda|richiesta|modulo\s+di\s+richiesta|formular/i },
  { typeId: `${IO}/PAYMENTDEC`, re: /ricevut|quietanza|pagamento\s+effettuato|marca\s+da\s+bollo|attestazione\s+di\s+pagamento/i },
  { typeId: `${IO}/CERT`, re: /certificat|attestazion|attestato/i },
  { typeId: `${IO}/AUTHACT`, re: /autorizzazion|atto\s+autorizz|permesso|licenza/i },
  { typeId: `${IO}/CODE`, re: /codice\s+fiscale|\bcf\b|codice\s+identific|\bspid\b|pin\b/i },
  { typeId: `${IO}/ADMINDOC`, re: /documentazione\s+amministr|visura|estratto|dichiarazion|autocertificazion/i },
  { typeId: `${IO}/OTHDOC`, re: /documento|documentazione|pdf\b|allegat/i },
];

const OUTPUT_RULES = [
  { typeId: `${IO}/CERT`, re: /certificat|attestato|attestazion/i },
  { typeId: `${IO}/AUTHACT`, re: /autorizzazion|permesso|licenza|atto\s+autorizz/i },
  { typeId: `${IO}/PAYMENTDEC`, re: /bollettin|pagamento|pago\s*pa|f24|quietanza/i },
  { typeId: `${IO}/CODE`, re: /codice|protocollo|identificativo/i },
  { typeId: `${IO}/IDDEC`, re: /carta|tessera|documento\s+di\s+identit/i },
  { typeId: `${IO}/REQ`, re: /ricevuta\s+di\s+richiesta|conferma\s+di\s+invio/i },
  { typeId: `${IO}/ADMINDOC`, re: /documentazione|visura|estratto|dichiarazion/i },
  { typeId: `${IO}/OTHDOC`, re: /document|scaric|pdf|esito|pratica/i },
];

function itemTypeId(item) {
  if (!item || typeof item === "string") return "";
  return String(item.typeId || "").trim();
}

export function suggestInputType(text) {
  const t = String(text || "");
  for (const rule of INPUT_RULES) {
    if (rule.re.test(t)) return rule.typeId;
  }
  return "";
}

export function suggestOutputType(text) {
  const t = String(text || "");
  for (const rule of OUTPUT_RULES) {
    if (rule.re.test(t)) return rule.typeId;
  }
  return "";
}

/** @returns {{ amount: number|null, currency: string }} */
export function suggestCost(text) {
  const t = String(text || "").toLocaleLowerCase("it");
  if (!t.trim()) return { amount: null, currency: "" };
  if (/gratuit|a\s+titolo\s+gratuit|senza\s+costi|non\s+ha\s+costo|nessun\s+costo|gratis/.test(t)) {
    return { amount: 0, currency: "EUR" };
  }
  const match =
    t.match(/(?:€|eur(?:o)?)\s*(\d+(?:[.,]\d{1,2})?)/i) ||
    t.match(/(\d+(?:[.,]\d{1,2})?)\s*(?:€|eur(?:o)?)/i);
  if (match) {
    const amount = Number(String(match[1]).replace(",", "."));
    if (!Number.isNaN(amount)) return { amount, currency: "EUR" };
  }
  return { amount: null, currency: "" };
}

/** URI canoniche IndicePA (ente / AOO). */
export const IPA_PA_BASE = "http://indicepa.gov.it/pa";

/**
 * @param {string} codiceIPA
 * @param {string} [codiceAOO]
 * @returns {string}
 */
export function buildIpaUri(codiceIPA, codiceAOO = "") {
  const ipa = String(codiceIPA || "")
    .trim()
    .toLowerCase()
    .replace(/^\/+|\/+$/g, "");
  if (!ipa) return "";
  const aoo = String(codiceAOO || "")
    .trim()
    .replace(/^\/+|\/+$/g, "");
  if (aoo) return `${IPA_PA_BASE}/${ipa}/aoo/${aoo}`;
  return `${IPA_PA_BASE}/${ipa}`;
}

/**
 * Estrae codice IPA e AOO da un @id o da testo libero.
 * @returns {{ codiceIPA: string, codiceAOO: string } | null}
 */
export function parseIpaRef(value) {
  const raw = String(value || "").trim();
  if (!raw) return null;

  const url = raw.match(
    /https?:\/\/(?:www\.)?indicepa\.gov\.it\/pa\/([A-Za-z0-9._-]+)(?:\/aoo\/([A-Za-z0-9._-]+))?/i,
  );
  if (url) {
    return {
      codiceIPA: url[1].toLowerCase(),
      codiceAOO: url[2] ? String(url[2]) : "",
    };
  }

  const path = raw.match(
    /(?:^|\/)pa\/([A-Za-z0-9._-]+)(?:\/aoo\/([A-Za-z0-9._-]+))?\/?$/i,
  );
  if (path) {
    return {
      codiceIPA: path[1].toLowerCase(),
      codiceAOO: path[2] ? String(path[2]) : "",
    };
  }

  const slashAoo = raw.match(
    /^([A-Za-z][A-Za-z0-9._-]{0,20})\/aoo\/([A-Za-z0-9._-]+)$/i,
  );
  if (slashAoo) {
    return {
      codiceIPA: slashAoo[1].toLowerCase(),
      codiceAOO: slashAoo[2],
    };
  }

  const explicit = raw.match(
    /(?:codice\s*)?ipa\s*[:=]\s*([A-Za-z][A-Za-z0-9._-]{0,20})(?:\s*(?:\/|,|;|\||\s+)\s*(?:codice\s*)?aoo\s*[:=]\s*([A-Za-z0-9._-]+))?/i,
  );
  if (explicit) {
    return {
      codiceIPA: explicit[1].toLowerCase(),
      codiceAOO: explicit[2] ? String(explicit[2]) : "",
    };
  }

  const aooOnly = raw.match(
    /(?:codice\s*)?aoo\s*[:=]\s*([A-Za-z0-9._-]+)/i,
  );
  const ipaNearAoo = raw.match(
    /(?:cod(?:ice)?\s*(?:amm|ipa)|cod_amm)\s*[:=]\s*([A-Za-z][A-Za-z0-9._-]{0,20})/i,
  );
  if (ipaNearAoo) {
    return {
      codiceIPA: ipaNearAoo[1].toLowerCase(),
      codiceAOO: aooOnly ? aooOnly[1] : "",
    };
  }

  // Solo codice nudo nel campo (es. c_h501, agid, inps)
  if (/^[A-Za-z][A-Za-z0-9._-]{1,20}$/.test(raw) && !raw.includes("://")) {
    return { codiceIPA: raw.toLowerCase(), codiceAOO: "" };
  }

  // Prefissi IPA tipici nel nome ente: (c_h501) o c_h501
  const prefixed = raw.match(
    /\b((?:c|m|r|p|uf|ist|acr|prc|uss)_[a-z0-9]{1,12})\b/i,
  );
  if (prefixed) {
    return {
      codiceIPA: prefixed[1].toLowerCase(),
      codiceAOO: aooOnly ? aooOnly[1] : "",
    };
  }

  return null;
}

function isPlaceholderOrgId(value) {
  const v = String(value || "").trim().toLowerCase();
  if (!v) return true;
  return (
    v === "https://example.org/" ||
    v === "http://example.org/" ||
    v === "https://example.org" ||
    v === "http://example.org"
  );
}

/**
 * Suggerisce/normalizza l'@id ente come URI IndicePA.
 * @returns {string} URI o "" se nessun suggerimento
 */
export function suggestOrgId(orgId, orgName = "", orgHomepage = "") {
  const current = String(orgId || "").trim();
  const fromCurrent = parseIpaRef(current);
  if (fromCurrent) {
    const uri = buildIpaUri(fromCurrent.codiceIPA, fromCurrent.codiceAOO);
    if (uri && uri !== current) return uri;
    // già URI IPA canonica
    if (uri === current) return "";
    return "";
  }

  if (!isPlaceholderOrgId(current) && current.includes("://")) {
    // URL custom non-IPA: non sovrascrivere
    return "";
  }

  const haystack = [orgName, orgHomepage, current].filter(Boolean).join("\n");
  const parsed = parseIpaRef(haystack);
  if (!parsed) return "";
  return buildIpaUri(parsed.codiceIPA, parsed.codiceAOO);
}

/** @returns {string} xsd:duration or "" */
export function suggestDuration(text) {
  const t = String(text || "").toLocaleLowerCase("it");
  if (!t.trim()) return "";
  if (/immediat|istantane|in\s+tempo\s+reale|online\s+subito/.test(t)) return "PT0S";
  if (/\bora\b|1\s*h\b|un['’]?\s*ora/.test(t) && !/giorn/.test(t)) return "PT1H";
  const rangeDays = t.match(/(\d+)\s*[-–—]\s*(\d+)\s*giorn/);
  if (rangeDays) {
    const max = Math.max(Number(rangeDays[1]), Number(rangeDays[2]));
    if (max > 0) return `P${max}D`;
  }
  const days = t.match(/(\d+)\s*giorn/);
  if (days) {
    const n = Number(days[1]);
    if (n > 0) return `P${n}D`;
  }
  const weeks = t.match(/(\d+)\s*settiman/);
  if (weeks) {
    const n = Number(weeks[1]);
    if (n > 0) return `P${n}W`;
  }
  const months = t.match(/(\d+)\s*mes[ei]/);
  if (months) {
    const n = Number(months[1]);
    if (n > 0) return `P${n}M`;
  }
  return "";
}

/**
 * Applica suggerimenti solo agli slot tipizzati vuoti.
 * @returns {{ draft: object, changed: number, fields: string[] }}
 */
export function applySuggestions(draft) {
  const next = structuredClone(draft);
  let changed = 0;
  const fields = [];

  next.inputs = (next.inputs || []).map((item) => {
    const textLoc = normalizeLoc(typeof item === "string" ? item : item?.text);
    const text = pickLoc(textLoc);
    let typeId = itemTypeId(item);
    const base =
      typeof item === "string"
        ? { text: textLoc, typeId: "" }
        : { ...item, text: textLoc, typeId };
    if (!text) return base;
    if (!typeId) {
      const suggested = suggestInputType(text);
      if (suggested) {
        typeId = suggested;
        changed += 1;
        if (!fields.includes("inputType")) fields.push("inputType");
      }
    }
    return { ...base, text: textLoc, typeId };
  });

  next.outputs = (next.outputs || []).map((item) => {
    const textLoc = normalizeLoc(typeof item === "string" ? item : item?.text);
    const text = pickLoc(textLoc);
    let typeId = itemTypeId(item);
    const base =
      typeof item === "string"
        ? { text: textLoc, typeId: "" }
        : { ...item, text: textLoc, typeId };
    if (!text) return base;
    if (!typeId) {
      const suggested = suggestOutputType(text);
      if (suggested) {
        typeId = suggested;
        changed += 1;
        if (!fields.includes("outputType")) fields.push("outputType");
      }
    }
    return { ...base, text: textLoc, typeId };
  });

  const timeLoc = normalizeLoc(
    typeof next.processingTime === "string"
      ? next.processingTime
      : next.processingTime?.text,
  );
  const timeText = pickLoc(timeLoc);
  const timeKind =
    typeof next.processingTime === "object" ? String(next.processingTime?.kind || "") : "";
  const timeDuration =
    typeof next.processingTime === "object" ? String(next.processingTime?.duration || "") : "";
  if (timeText && !timeKind && !timeDuration) {
    const duration = suggestDuration(timeText);
    if (duration) {
      const parsed = parseDurationUi(duration);
      next.processingTime = {
        text: timeLoc,
        duration,
        kind: parsed.kind,
        amount: parsed.amount,
      };
      changed += 1;
      fields.push("duration");
    }
  } else if (typeof next.processingTime === "string") {
    next.processingTime = {
      text: timeLoc,
      kind: "",
      amount: "",
      duration: "",
    };
  } else if (next.processingTime) {
    next.processingTime = { ...next.processingTime, text: timeLoc };
  }

  const costLoc = normalizeLoc(
    typeof next.cost === "string" ? next.cost : next.cost?.text,
  );
  const costText = pickLoc(costLoc);
  const costAmount =
    typeof next.cost === "object" && next.cost?.amount != null && next.cost.amount !== ""
      ? next.cost.amount
      : null;
  const costCurrency =
    typeof next.cost === "object" ? String(next.cost?.currency || "") : "";
  if (costText && (costAmount == null || costAmount === "")) {
    const suggested = suggestCost(costText);
    if (suggested.amount != null) {
      next.cost = {
        text: costLoc,
        amount: suggested.amount,
        currency: costCurrency || suggested.currency || "EUR",
      };
      changed += 1;
      fields.push("cost");
    } else {
      next.cost = { text: costLoc, amount: "", currency: costCurrency || "EUR" };
    }
  } else if (typeof next.cost === "string") {
    next.cost = { text: costLoc, amount: costAmount ?? "", currency: costCurrency || "EUR" };
  } else if (next.cost) {
    next.cost = { ...next.cost, text: costLoc };
  }

  next.orgName = normalizeLoc(next.orgName);
  const suggestedOrgId = suggestOrgId(
    next.orgId,
    pickLoc(next.orgName),
    next.orgHomepage,
  );
  if (suggestedOrgId && suggestedOrgId !== String(next.orgId || "").trim()) {
    next.orgId = suggestedOrgId;
    changed += 1;
    fields.push("orgId");
  }

  return { draft: next, changed, fields };
}
