import { describe, expect, it } from "vitest";
import { buildServiceIoLayout, wrapLines } from "./serviceIoLayout";

describe("wrapLines", () => {
  it("wraps long labels onto multiple lines", () => {
    const lines = wrapLines("Richiesta di certificato anagrafico storico", 16, 3);
    expect(lines.length).toBeGreaterThan(1);
    expect(lines.every((line) => line.length <= 17)).toBe(true);
  });
});

describe("serviceIoLayout", () => {
  it("places service center, inputs left, outputs right", () => {
    const layout = buildServiceIoLayout({
      "@graph": [
        {
          "@id": "https://example.org/s/",
          "@type": "cpsv:PublicService",
          "dct:title": { "@value": "Servizio" },
          "cpsv:hasInput": { "@id": "https://example.org/s/#input-0" },
          "cpsv:hasOutput": { "@id": "https://example.org/s/#output-0" },
        },
        {
          "@id": "https://example.org/s/#input-0",
          "@type": "cpsv:Input",
          "dct:description": { "@value": "Documento" },
        },
        {
          "@id": "https://example.org/s/#output-0",
          "@type": "cpsv:Output",
          "dct:description": { "@value": "Certificato" },
        },
      ],
    });

    const service = layout.nodes.find((n) => n.lane === "service");
    const input = layout.nodes.find((n) => n.lane === "input");
    const output = layout.nodes.find((n) => n.lane === "output");
    expect(service).toBeTruthy();
    expect(input).toBeTruthy();
    expect(output).toBeTruthy();
    expect(input!.x).toBeLessThan(service!.x);
    expect(output!.x).toBeGreaterThan(service!.x);
  });

  it("places organisation above and duration/cost below the service", () => {
    const layout = buildServiceIoLayout({
      "@graph": [
        {
          "@id": "https://example.org/s/",
          "@type": "cpsv:PublicService",
          "dct:title": { "@value": "Servizio lungo con titolo che va a capo" },
          "cv:hasCompetentAuthority": { "@id": "https://example.org/s/#ente" },
          "cpsv:hasProcessingTime": { "@id": "https://example.org/s/#time" },
          "cpsv:hasCost": { "@id": "https://example.org/s/#cost" },
          "cpsv:hasInput": { "@id": "https://example.org/s/#input-0" },
          "cpsv:hasOutput": { "@id": "https://example.org/s/#output-0" },
        },
        {
          "@id": "https://example.org/s/#ente",
          "@type": "cv:PublicOrganisation",
          "dct:title": { "@value": "Comune di Esempio" },
        },
        {
          "@id": "https://example.org/s/#time",
          "@type": "cpsv:ServiceProcessingTime",
          "dct:description": { "@value": "Entro 30 giorni" },
          "cv:value": { "@type": "xsd:duration", "@value": "P30D" },
        },
        {
          "@id": "https://example.org/s/#cost",
          "@type": "cv:Cost",
          "dct:description": { "@value": "Marca da bollo" },
          "cv:value": 16,
          "cv:currency": "EUR",
        },
        {
          "@id": "https://example.org/s/#input-0",
          "@type": "cpsv:Input",
          "dct:description": { "@value": "Documento di identità valido" },
        },
        {
          "@id": "https://example.org/s/#output-0",
          "@type": "cpsv:Output",
          "dct:description": { "@value": "Certificato" },
        },
      ],
    });

    const service = layout.nodes.find((n) => n.lane === "service")!;
    const org = layout.nodes.find((n) => n.lane === "org")!;
    const duration = layout.nodes.find((n) => n.lane === "duration")!;
    const cost = layout.nodes.find((n) => n.lane === "cost")!;

    expect(org.y).toBeLessThan(service.y);
    expect(duration.y).toBeGreaterThan(service.y);
    expect(cost.y).toBeGreaterThan(service.y);
    expect(Math.abs(org.x - service.x)).toBeLessThan(1);
    expect(service.lines.length).toBeGreaterThan(1);
  });

  it("shows type and CPV concept names on I/O cards", () => {
    const layout = buildServiceIoLayout(
      {
        "@graph": [
          {
            "@id": "https://example.org/s/",
            "@type": "cpsv:PublicService",
            "dct:title": { "@value": "Servizio" },
            "cpsv:hasInput": { "@id": "https://example.org/s/#input-0" },
            "cpsv:hasOutput": { "@id": "https://example.org/s/#output-0" },
          },
          {
            "@id": "https://example.org/s/#input-0",
            "@type": "cpsv:Input",
            "dct:description": {
              "@value": "Se desideri ricevere l'estratto via email",
            },
            "dct:type": {
              "@id": "https://w3id.org/italia/controlled-vocabulary/classifications-for-public-services/service-input-output/ADMINDOC",
            },
            "cv:supportsConcept": {
              "@id": "https://w3id.org/italia/onto/CPV/taxCode",
            },
          },
          {
            "@id": "https://example.org/s/#output-0",
            "@type": "cpsv:Output",
            "dct:description": { "@value": "Gli estratti dello stato civile" },
            "dct:type": {
              "@id": "https://w3id.org/italia/controlled-vocabulary/classifications-for-public-services/service-input-output/CERT",
            },
          },
        ],
      },
      "it",
      {
        inputTypes: [
          {
            id: "https://w3id.org/italia/controlled-vocabulary/classifications-for-public-services/service-input-output/ADMINDOC",
            labels: { it: "Documento amministrativo", en: "Administrative document" },
          },
        ],
        outputTypes: [
          {
            id: "https://w3id.org/italia/controlled-vocabulary/classifications-for-public-services/service-input-output/CERT",
            labels: { it: "Certificato", en: "Certificate" },
          },
        ],
        concepts: [
          {
            id: "https://w3id.org/italia/onto/CPV/taxCode",
            labels: { it: "codice fiscale", en: "tax code" },
          },
        ],
      },
    );

    const input = layout.nodes.find((n) => n.lane === "input")!;
    const output = layout.nodes.find((n) => n.lane === "output")!;
    expect(input.heading).toBe("Documento amministrativo · codice fiscale");
    expect(input.headingLines[0]).toContain("Documento");
    expect(input.lines.join(" ")).toContain("estratto");
    expect(output.heading).toBe("Certificato");
    expect(output.lines.join(" ")).toContain("estratti");
  });
});
