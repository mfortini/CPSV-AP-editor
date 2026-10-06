import { formatDurationLabel } from "../domain/schedaModel";
import type { AppLang, VocabEntry } from "../domain/types";
import { findVocabLabel } from "../vocabs/load";

export type IoLane =
  | "input"
  | "service"
  | "output"
  | "org"
  | "duration"
  | "cost";

export type IoNode = {
  id: string;
  label: string;
  heading: string;
  headingLines: string[];
  detail: string;
  lines: string[];
  type: string;
  lane: IoLane;
  x: number;
  y: number;
  w: number;
  h: number;
};

export type IoVocabs = {
  inputTypes?: VocabEntry[];
  outputTypes?: VocabEntry[];
  concepts?: VocabEntry[];
};

export type IoEdge = {
  from: string;
  to: string;
  kind: "input-service" | "service-output" | "service-meta";
};

export type IoLayout = {
  nodes: IoNode[];
  edges: IoEdge[];
  width: number;
  height: number;
  serviceId: string | null;
};

function asList(value: unknown): unknown[] {
  if (value == null) return [];
  return Array.isArray(value) ? value : [value];
}

function refId(value: unknown): string | null {
  if (!value) return null;
  if (typeof value === "string") return value;
  if (typeof value === "object" && value && "@id" in value) {
    return String((value as { "@id": string })["@id"]);
  }
  return null;
}

function refIds(value: unknown): string[] {
  return asList(value)
    .map((entry) => refId(entry))
    .filter((id): id is string => Boolean(id));
}

function readLit(value: unknown, preferLang: "it" | "en" = "it"): string {
  if (value == null) return "";
  if (typeof value === "string") return value.trim();
  if (Array.isArray(value)) {
    const tagged = value
      .map((entry) => {
        if (!entry || typeof entry !== "object") {
          const text = readLit(entry, preferLang);
          return text ? { lang: "", text } : null;
        }
        const obj = entry as { "@language"?: string; "@value"?: unknown };
        if (obj["@value"] != null) {
          return {
            lang: String(obj["@language"] || "")
              .toLowerCase()
              .slice(0, 2),
            text: String(obj["@value"]).trim(),
          };
        }
        return null;
      })
      .filter((entry): entry is { lang: string; text: string } =>
        Boolean(entry?.text),
      );
    const preferred = tagged.find((entry) => entry.lang === preferLang);
    if (preferred) return preferred.text;
    const it = tagged.find((entry) => entry.lang === "it");
    if (it) return it.text;
    return tagged[0]?.text || "";
  }
  if (typeof value === "object" && value && "@value" in value) {
    return String((value as { "@value": unknown })["@value"] ?? "").trim();
  }
  return "";
}

function readDuration(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "object" && value && "@value" in value) {
    return String((value as { "@value": unknown })["@value"] ?? "").trim();
  }
  return "";
}

function nodeType(node: Record<string, unknown>): string {
  const type = node["@type"];
  if (Array.isArray(type)) return String(type[0] || "Resource");
  return String(type || "Resource");
}

function isPublicService(node: Record<string, unknown>): boolean {
  const types = asList(node["@type"]).map(String);
  return types.some(
    (t) => t === "cpsv:PublicService" || t.endsWith("PublicService"),
  );
}

function isInput(node: Record<string, unknown>): boolean {
  return nodeType(node).includes("Input");
}

function isOutput(node: Record<string, unknown>): boolean {
  return nodeType(node).includes("Output");
}

function titleOf(node: Record<string, unknown>, lang: "it" | "en"): string {
  return (
    readLit(node["dct:title"], lang) ||
    readLit(node["cpsv:name"], lang) ||
    readLit(node["dct:description"], lang) ||
    String(node["@id"] || "")
  );
}

function detailOf(node: Record<string, unknown>, lang: "it" | "en"): string {
  return (
    readLit(node["dct:description"], lang) ||
    readLit(node["dct:abstract"], lang) ||
    ""
  );
}

/** Spezza il testo in righe per la scheda SVG. */
export function wrapLines(
  text: string,
  maxChars: number,
  maxLines = 3,
): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return [];

  const lines: string[] = [];
  let current = "";
  let wordIndex = 0;

  const pushTruncated = (value: string) => {
    const clipped =
      value.length > maxChars ? `${value.slice(0, maxChars - 1)}…` : value;
    lines.push(clipped);
  };

  while (wordIndex < words.length && lines.length < maxLines) {
    const word = words[wordIndex]!;
    const next = current ? `${current} ${word}` : word;
    if (next.length <= maxChars) {
      current = next;
      wordIndex += 1;
      continue;
    }
    if (current) {
      lines.push(current);
      current = "";
      continue;
    }
    // Parola più lunga della riga: tronca
    pushTruncated(word);
    wordIndex += 1;
    current = "";
  }
  if (current && lines.length < maxLines) lines.push(current);

  const consumed = lines.join(" ").replace(/…/g, "");
  const full = words.join(" ");
  if (full.length > consumed.length && lines.length) {
    const last = lines[lines.length - 1]!;
    if (!last.endsWith("…")) {
      lines[lines.length - 1] =
        last.length >= maxChars
          ? `${last.slice(0, maxChars - 1)}…`
          : `${last}…`;
    }
  }
  return lines.slice(0, maxLines);
}

function cardHeight(lineCount: number, base = 56, lineH = 16): number {
  return Math.max(base, 28 + lineCount * lineH + 12);
}

function localName(id: string): string {
  const trimmed = id.replace(/\/+$/, "");
  const hash = trimmed.lastIndexOf("#");
  const slash = trimmed.lastIndexOf("/");
  return trimmed.slice(Math.max(hash, slash) + 1) || id;
}

function conceptLabel(
  entries: VocabEntry[] | undefined,
  id: string,
  lang: AppLang,
): string {
  if (!id) return "";
  const label = findVocabLabel(entries, id, lang);
  if (!label || label === id) return localName(id);
  return label;
}

function ioConceptHeading(
  node: Record<string, unknown>,
  lane: "input" | "output",
  lang: AppLang,
  vocabs?: IoVocabs,
): string {
  const typeId = refId(node["dct:type"]) || "";
  const conceptId = refId(node["cv:supportsConcept"]) || "";
  const typeEntries =
    lane === "input" ? vocabs?.inputTypes : vocabs?.outputTypes;
  const typeLabel = conceptLabel(typeEntries, typeId, lang);
  const concept = conceptLabel(vocabs?.concepts, conceptId, lang);
  return [typeLabel, concept].filter(Boolean).join(" · ");
}

function makeNode(opts: {
  id: string;
  label: string;
  heading?: string;
  detail?: string;
  type: string;
  lane: IoLane;
  x: number;
  y: number;
  w: number;
  maxChars: number;
  maxLines?: number;
  baseH?: number;
}): IoNode {
  const heading = (opts.heading || "").trim();
  const headingLines = heading ? wrapLines(heading, opts.maxChars, 2) : [];
  const detail =
    opts.detail && opts.detail !== opts.label ? opts.detail : "";
  const maxLines = opts.maxLines ?? 3;
  const labelLines = wrapLines(opts.label, opts.maxChars, maxLines);
  const detailLines = detail ? wrapLines(detail, opts.maxChars, 1) : [];
  const lines = detailLines.length
    ? [...labelLines.slice(0, Math.max(1, maxLines - 1)), ...detailLines]
    : labelLines;
  const body =
    lines.length || headingLines.length
      ? lines
      : [opts.label.slice(0, opts.maxChars)];
  const h = cardHeight(
    Math.max(headingLines.length + body.length, 1),
    opts.baseH ?? 56,
    headingLines.length ? 15 : 16,
  );
  return {
    id: opts.id,
    label: opts.label,
    heading,
    headingLines,
    detail,
    lines: body,
    type: opts.type,
    lane: opts.lane,
    x: opts.x,
    y: opts.y,
    w: opts.w,
    h,
  };
}

function stackLane(
  items: IoNode[],
  x: number,
  centerY: number,
  gap: number,
) {
  const total =
    items.reduce((sum, node) => sum + node.h, 0) +
    Math.max(0, items.length - 1) * gap;
  let y = centerY - total / 2;
  for (const node of items) {
    node.x = x;
    node.y = y + node.h / 2;
    y += node.h + gap;
  }
}

export function buildServiceIoLayout(
  document: {
    "@graph"?: Record<string, unknown>[];
  },
  lang: AppLang = "it",
  vocabs?: IoVocabs,
): IoLayout {
  const graph = Array.isArray(document["@graph"]) ? document["@graph"] : [];
  const byId = new Map<string, Record<string, unknown>>();
  for (const node of graph) {
    if (node?.["@id"]) byId.set(String(node["@id"]), node);
  }

  const service =
    graph.find((node) => isPublicService(node)) ||
    graph.find((node) => String(node["@type"] || "").includes("PublicService"));

  if (!service) {
    return { nodes: [], edges: [], width: 960, height: 320, serviceId: null };
  }

  const serviceId = String(service["@id"]);
  const inputNodes = refIds(service["cpsv:hasInput"])
    .map((id) => byId.get(id))
    .filter((node): node is Record<string, unknown> => Boolean(node));
  const outputNodes = [
    ...refIds(service["cpsv:hasOutput"]),
    ...refIds(service["cpsv:producesOutput"]),
  ]
    .map((id) => byId.get(id))
    .filter((node): node is Record<string, unknown> => Boolean(node));

  if (!inputNodes.length) {
    for (const node of graph) {
      if (isInput(node) && node["@id"] !== serviceId) inputNodes.push(node);
    }
  }
  if (!outputNodes.length) {
    for (const node of graph) {
      if (isOutput(node) && node["@id"] !== serviceId) outputNodes.push(node);
    }
  }

  const orgId =
    refId(service["cv:hasCompetentAuthority"]) ||
    refId(service["cpsv:producedBy"]);
  const orgNode = orgId ? byId.get(orgId) : null;

  const timeId = refId(asList(service["cpsv:hasProcessingTime"])[0]);
  const timeNode = timeId ? byId.get(timeId) : null;

  const costRaw = service["cpsv:hasCost"];
  const costId = refId(costRaw);
  const costNode = costId ? byId.get(costId) : null;
  const costLiteral = !costId ? readLit(costRaw, lang) : "";

  const width = 960;
  const centerX = width / 2;
  const leftX = 160;
  const rightX = width - 160;
  const serviceW = 280;
  const ioW = 220;
  const metaW = 200;
  const metaGap = 14;
  const vGap = 28;

  const nodes: IoNode[] = [];
  const edges: IoEdge[] = [];

  const serviceNode = makeNode({
    id: serviceId,
    label: titleOf(service, lang) || "PublicService",
    detail: detailOf(service, lang),
    type: "cpsv:PublicService",
    lane: "service",
    x: centerX,
    y: 0, // set after measuring stack
    w: serviceW,
    maxChars: 28,
    maxLines: 4,
    baseH: 72,
  });

  let orgIo: IoNode | null = null;
  if (orgNode) {
    orgIo = makeNode({
      id: String(orgNode["@id"]),
      label: titleOf(orgNode, lang) || "Ente",
      detail: readLit(orgNode["foaf:homepage"], lang),
      type: nodeType(orgNode),
      lane: "org",
      x: centerX,
      y: 0,
      w: metaW,
      maxChars: 22,
      maxLines: 3,
      baseH: 52,
    });
  }

  let timeIo: IoNode | null = null;
  if (timeNode) {
    const duration = readDuration(timeNode["cv:value"]);
    const durationLabel = duration ? formatDurationLabel(duration) : "";
    const desc = detailOf(timeNode, lang) || readLit(timeNode["dct:title"], lang);
    timeIo = makeNode({
      id: String(timeNode["@id"]),
      label: durationLabel || desc || "Durata",
      detail: durationLabel && desc ? desc : "",
      type: nodeType(timeNode),
      lane: "duration",
      x: 0,
      y: 0,
      w: metaW,
      maxChars: 20,
      maxLines: 3,
      baseH: 52,
    });
  }

  let costIo: IoNode | null = null;
  if (costNode) {
    const amount = costNode["cv:value"];
    const currency =
      typeof costNode["cv:currency"] === "string"
        ? costNode["cv:currency"]
        : readLit(costNode["cv:currency"], lang) || "EUR";
    const amountLabel =
      amount === 0 || amount === "0" || typeof amount === "number"
        ? `${amount} ${currency}`.trim()
        : "";
    const desc = detailOf(costNode, lang) || readLit(costNode["dct:title"], lang);
    costIo = makeNode({
      id: String(costNode["@id"]),
      label: amountLabel || desc || "Costo",
      detail: amountLabel && desc ? desc : "",
      type: nodeType(costNode),
      lane: "cost",
      x: 0,
      y: 0,
      w: metaW,
      maxChars: 20,
      maxLines: 3,
      baseH: 52,
    });
  } else if (costLiteral) {
    costIo = makeNode({
      id: `${serviceId}#cost-literal`,
      label: costLiteral,
      type: "cv:Cost",
      lane: "cost",
      x: 0,
      y: 0,
      w: metaW,
      maxChars: 20,
      maxLines: 3,
      baseH: 52,
    });
  }

  const topPad = 48;
  const orgH = orgIo?.h ?? 0;
  const belowMetas = [timeIo, costIo].filter(Boolean) as IoNode[];
  const belowRowH = belowMetas.reduce((max, n) => Math.max(max, n.h), 0);
  const belowBlock = belowMetas.length ? belowRowH + vGap : 0;

  const inputCards = inputNodes.map((node, index) => {
    const id = String(node["@id"] || `input-${index}`);
    const heading = ioConceptHeading(node, "input", lang, vocabs);
    const content =
      readLit(node["dct:title"], lang) ||
      readLit(node["cpsv:name"], lang) ||
      readLit(node["dct:description"], lang);
    return makeNode({
      id,
      heading,
      label: content && content !== heading ? content : "",
      detail: "",
      type: nodeType(node),
      lane: "input",
      x: leftX,
      y: 0,
      w: ioW,
      maxChars: 22,
      maxLines: 3,
      baseH: heading ? 72 : 64,
    });
  });
  const outputCards = outputNodes.map((node, index) => {
    const id = String(node["@id"] || `output-${index}`);
    const heading = ioConceptHeading(node, "output", lang, vocabs);
    const content =
      readLit(node["dct:title"], lang) ||
      readLit(node["cpsv:name"], lang) ||
      readLit(node["dct:description"], lang);
    return makeNode({
      id,
      heading,
      label: content && content !== heading ? content : "",
      detail: "",
      type: nodeType(node),
      lane: "output",
      x: rightX,
      y: 0,
      w: ioW,
      maxChars: 22,
      maxLines: 3,
      baseH: heading ? 72 : 64,
    });
  });

  const laneStackH = (cards: IoNode[]) =>
    cards.reduce((sum, node) => sum + node.h, 0) +
    Math.max(0, cards.length - 1) * vGap;
  const ioStackH = Math.max(laneStackH(inputCards), laneStackH(outputCards), 72);
  const centerStackH =
    (orgH ? orgH + vGap : 0) + serviceNode.h + (belowBlock ? belowBlock : 0);
  const contentH = Math.max(ioStackH, centerStackH);
  const centerY = topPad + contentH / 2;
  const height = Math.max(400, topPad + contentH + 80);

  // Place service at visual center of the I/O lanes
  serviceNode.y = centerY;
  if (orgIo) {
    orgIo.y = serviceNode.y - serviceNode.h / 2 - vGap - orgIo.h / 2;
  }
  if (belowMetas.length === 1) {
    belowMetas[0]!.x = centerX;
    belowMetas[0]!.y =
      serviceNode.y + serviceNode.h / 2 + vGap + belowMetas[0]!.h / 2;
  } else if (belowMetas.length === 2) {
    const [a, b] = belowMetas;
    a!.x = centerX - metaW / 2 - metaGap / 2;
    b!.x = centerX + metaW / 2 + metaGap / 2;
    const y = serviceNode.y + serviceNode.h / 2 + vGap + belowRowH / 2;
    a!.y = y;
    b!.y = y;
  }

  nodes.push(serviceNode);
  if (orgIo) {
    nodes.push(orgIo);
    edges.push({ from: serviceId, to: orgIo.id, kind: "service-meta" });
  }
  for (const meta of belowMetas) {
    nodes.push(meta);
    edges.push({ from: serviceId, to: meta.id, kind: "service-meta" });
  }

  stackLane(inputCards, leftX, centerY, vGap);
  for (const io of inputCards) {
    nodes.push(io);
    edges.push({ from: io.id, to: serviceId, kind: "input-service" });
  }

  stackLane(outputCards, rightX, centerY, vGap);
  for (const io of outputCards) {
    nodes.push(io);
    edges.push({ from: serviceId, to: io.id, kind: "service-output" });
  }

  return { nodes, edges, width, height, serviceId };
}
