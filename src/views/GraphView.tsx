import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Container } from "design-react-kit";
import { useStore } from "../app/store";
import { buildServiceIoLayout, type IoLane, type IoNode } from "../graph/serviceIoLayout";

const COLORS: Record<string, string> = {
  service: "#0066cc",
  input: "#008758",
  output: "#9b5900",
  org: "#207ab7",
  duration: "#5b6b7c",
  cost: "#5b6b7c",
  edge: "#5c6f82",
  metaEdge: "#8ba3b8",
  lane: "#c5d6e6",
  canvas: "#ffffff",
};

function laneFill(lane: IoLane) {
  return COLORS[lane] || COLORS.service;
}

function edgePath(from: IoNode, to: IoNode, kind: string) {
  if (kind === "service-meta") {
    const goingUp = to.y < from.y;
    const x1 = from.x;
    const y1 = goingUp ? from.y - from.h / 2 : from.y + from.h / 2;
    const x2 = to.x;
    const y2 = goingUp ? to.y + to.h / 2 : to.y - to.h / 2;
    return `M ${x1} ${y1} L ${x2} ${y2}`;
  }
  const x1 = from.x + from.w / 2;
  const x2 = to.x - to.w / 2;
  const y1 = from.y;
  const y2 = to.y;
  const midX = (x1 + x2) / 2;
  return `M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`;
}

function NodeText({ node }: { node: IoNode }) {
  const heading = node.headingLines || [];
  const lines = (node.lines.length ? node.lines : node.label ? [node.label] : []).filter(
    Boolean,
  );
  const headingSize = 10;
  const fontSize = node.lane === "service" ? 13 : 11;
  const headingH = headingSize + 4;
  const lineH = fontSize + 3;
  const total = heading.length * headingH + lines.length * lineH;
  let cursor = -total / 2 + (heading.length ? headingSize : fontSize) * 0.35;
  return (
    <text fill="#fff" textAnchor="middle">
      {heading.map((line, index) => {
        const y = cursor;
        cursor += headingH;
        return (
          <tspan
            key={`${node.id}-h-${index}`}
            x={0}
            y={y}
            fontSize={headingSize}
            fontWeight={700}
            letterSpacing="0.02em"
          >
            {line}
          </tspan>
        );
      })}
      {lines.map((line, index) => {
        const y = cursor;
        cursor += lineH;
        return (
          <tspan
            key={`${node.id}-${index}`}
            x={0}
            y={y}
            fontSize={fontSize}
            fontWeight={node.lane === "service" ? 600 : 500}
          >
            {line}
          </tspan>
        );
      })}
    </text>
  );
}

export function GraphView() {
  const { t, i18n } = useTranslation();
  const { document, vocabs } = useStore();
  const lang = i18n.language?.startsWith("en") ? "en" : "it";
  const layout = useMemo(
    () =>
      buildServiceIoLayout(document, lang, {
        inputTypes: vocabs?.inputTypes,
        outputTypes: vocabs?.outputTypes,
      }),
    [document, lang, vocabs],
  );

  if (!layout.serviceId) {
    return (
      <Container className="py-4">
        <h2 className="h3">{t("graph.heading")}</h2>
        <p>{t("graph.empty")}</p>
      </Container>
    );
  }

  const inputs = layout.nodes.filter((n) => n.lane === "input");
  const outputs = layout.nodes.filter((n) => n.lane === "output");
  const metas = layout.nodes.filter((n) =>
    n.lane === "org" || n.lane === "duration" || n.lane === "cost",
  );
  const service = layout.nodes.find((n) => n.lane === "service");

  return (
    <Container className="py-4">
      <h2 className="h3">{t("graph.heading")}</h2>

      <div className="graph-io-wrap border rounded bg-white overflow-auto">
        <svg
          viewBox={`0 0 ${layout.width} ${layout.height}`}
          width="100%"
          role="img"
          aria-label={t("graph.heading")}
        >
          <rect width={layout.width} height={layout.height} fill={COLORS.canvas} />
          <line
            x1={320}
            y1={36}
            x2={320}
            y2={layout.height - 20}
            stroke={COLORS.lane}
            strokeWidth={1}
            strokeDasharray="4 4"
          />
          <line
            x1={layout.width - 320}
            y1={36}
            x2={layout.width - 320}
            y2={layout.height - 20}
            stroke={COLORS.lane}
            strokeWidth={1}
            strokeDasharray="4 4"
          />

          <text x={160} y={28} textAnchor="middle" className="graph-io-lane-title">
            {t("graph.inputs")}
          </text>
          <text
            x={layout.width / 2}
            y={28}
            textAnchor="middle"
            className="graph-io-lane-title"
          >
            {t("graph.service")}
          </text>
          <text
            x={layout.width - 160}
            y={28}
            textAnchor="middle"
            className="graph-io-lane-title"
          >
            {t("graph.outputs")}
          </text>

          <defs>
            <marker
              id="arrow"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill={COLORS.edge} />
            </marker>
          </defs>

          {layout.edges.map((edge, index) => {
            const from = layout.nodes.find((n) => n.id === edge.from);
            const to = layout.nodes.find((n) => n.id === edge.to);
            if (!from || !to) return null;
            return (
              <path
                key={`${edge.from}-${edge.to}-${index}`}
                d={edgePath(from, to, edge.kind)}
                fill="none"
                stroke={edge.kind === "service-meta" ? COLORS.metaEdge : COLORS.edge}
                strokeWidth={edge.kind === "service-meta" ? 1.25 : 1.75}
                strokeDasharray={edge.kind === "service-meta" ? "3 3" : undefined}
                markerEnd={edge.kind === "service-meta" ? undefined : "url(#arrow)"}
              />
            );
          })}

          {layout.nodes.map((node) => (
            <g key={node.id} transform={`translate(${node.x}, ${node.y})`}>
              <rect
                x={-node.w / 2}
                y={-node.h / 2}
                width={node.w}
                height={node.h}
                rx={12}
                fill={laneFill(node.lane)}
              />
              <NodeText node={node} />
              <title>
                {[node.heading, node.label, node.id].filter(Boolean).join("\n")}
              </title>
            </g>
          ))}
        </svg>
      </div>

      <div className="row g-3 mt-3">
        <div className="col-md-4">
          <h3 className="h6">{t("graph.inputs")}</h3>
          <ul className="small">
            {inputs.length ? (
              inputs.map((node) => (
                <li key={node.id}>
                  <strong>{node.heading || node.label}</strong>
                  {node.heading && node.label ? ` — ${node.label}` : ""}
                  {!node.heading && node.detail ? ` — ${node.detail}` : ""}
                </li>
              ))
            ) : (
              <li className="text-secondary">{t("graph.none")}</li>
            )}
          </ul>
        </div>
        <div className="col-md-4">
          <h3 className="h6">{t("graph.service")}</h3>
          <ul className="small">
            {service ? (
              <li>
                <strong>{service.label}</strong>
              </li>
            ) : null}
            {metas.map((node) => (
              <li key={node.id}>
                <span className="text-secondary">{t(`graph.${node.lane}`)}:</span>{" "}
                {node.label}
                {node.detail ? ` — ${node.detail}` : ""}
              </li>
            ))}
            {!metas.length ? (
              <li className="text-secondary">{t("graph.metaNone")}</li>
            ) : null}
          </ul>
        </div>
        <div className="col-md-4">
          <h3 className="h6">{t("graph.outputs")}</h3>
          <ul className="small">
            {outputs.length ? (
              outputs.map((node) => (
                <li key={node.id}>
                  <strong>{node.heading || node.label}</strong>
                  {node.heading && node.label ? ` — ${node.label}` : ""}
                  {!node.heading && node.detail ? ` — ${node.detail}` : ""}
                </li>
              ))
            ) : (
              <li className="text-secondary">{t("graph.none")}</li>
            )}
          </ul>
        </div>
      </div>
    </Container>
  );
}
