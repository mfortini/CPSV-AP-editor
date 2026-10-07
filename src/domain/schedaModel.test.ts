import { describe, expect, it } from "vitest";
import {
  applySuggestions,
  documentToForm,
  emptyDraft,
  formToDocument,
  listPublicServices,
  parseJsonLdText,
  pickLoc,
  serviceSlice,
  validateDraft,
} from "./index";

describe("scheda model", () => {
  it("roundtrips bilingual form to JSON-LD and back", () => {
    const draft = {
      ...emptyDraft(),
      serviceId: "https://example.org/servizi/anagrafe/",
      title: { it: "Carta d'identità", en: "Identity card" },
      abstract: { it: "Rilascio CIE", en: "CIE issuance" },
      description: { it: "Servizio di rilascio", en: "Issuance service" },
      orgId: "https://example.org/",
      orgName: { it: "Comune di Esempio", en: "Example Municipality" },
      orgHomepage: "https://example.org/",
      audience: { it: "Cittadini", en: "Citizens" },
      inputs: [
        {
          text: { it: "Documento di identità", en: "Identity document" },
          typeId: "",
        },
      ],
      lifeEvents: [
        "https://w3id.org/italia/controlled-vocabulary/classifications-for-public-services/life-business-event/life-event/9",
      ],
    };
    const doc = formToDocument(draft);
    const title = doc["@graph"].find((n) => n["@type"] === "cpsv:PublicService")?.[
      "dct:title"
    ];
    expect(Array.isArray(title)).toBe(true);
    const back = documentToForm(doc);
    expect(back.title.it).toBe("Carta d'identità");
    expect(back.title.en).toBe("Identity card");
    expect(back.orgName.en).toBe("Example Municipality");
    expect(back.inputs[0].text.it).toBe("Documento di identità");
    expect(back.lifeEvents).toHaveLength(1);
    expect(validateDraft(back)).toEqual([]);
  });

  it("accepts title in only one language", () => {
    const draft = {
      ...emptyDraft(),
      serviceId: "https://example.org/s/",
      title: { it: "", en: "Only English" },
    };
    expect(validateDraft(draft)).toEqual([]);
    const back = documentToForm(formToDocument(draft));
    expect(pickLoc(back.title, "en")).toBe("Only English");
  });

  it("picks one service slice from a multi-service catalog", () => {
    const doc = parseJsonLdText(
      JSON.stringify({
        "@context": {},
        "@graph": [
          {
            "@id": "https://example.org/a/",
            "@type": "cpsv:PublicService",
            "dct:title": { "@language": "it", "@value": "A" },
          },
          {
            "@id": "https://example.org/b/",
            "@type": "cpsv:PublicService",
            "dct:title": { "@language": "it", "@value": "B" },
          },
        ],
      }),
    );
    expect(listPublicServices(doc)).toHaveLength(2);
    const slice = serviceSlice(doc, "https://example.org/b/");
    expect(listPublicServices(slice)).toHaveLength(1);
    expect(documentToForm(slice).title.it).toBe("B");
  });

  it("suggests structure for free-text inputs", () => {
    const draft = {
      ...emptyDraft(),
      title: { it: "Test", en: "" },
      serviceId: "https://example.org/s/",
      inputs: [
        {
          text: { it: "Codice fiscale del richiedente", en: "" },
          typeId: "",
        },
      ],
      processingTime: {
        text: { it: "3 giorni", en: "" },
        kind: "",
        amount: "",
        duration: "",
      },
      cost: { text: { it: "gratuito", en: "" }, amount: "", currency: "EUR" },
    };
    const { changed, draft: next } = applySuggestions(draft);
    expect(changed).toBeGreaterThan(0);
    expect(next.inputs[0].typeId).toBeTruthy();
    expect(next.processingTime.kind).toBe("days");
    expect(next.cost.amount).toBe(0);
  });

  it("drops cv:supportsConcept on import", () => {
    const back = documentToForm(
      parseJsonLdText(
        JSON.stringify({
          "@context": {},
          "@graph": [
            {
              "@id": "https://example.org/s/",
              "@type": "cpsv:PublicService",
              "dct:title": { "@language": "it", "@value": "Servizio" },
              "cpsv:hasInput": { "@id": "https://example.org/s/#input-0" },
            },
            {
              "@id": "https://example.org/s/#input-0",
              "@type": "cpsv:Input",
              "dct:description": { "@language": "it", "@value": "Codice fiscale" },
              "dct:type": {
                "@id": "https://w3id.org/italia/controlled-vocabulary/classifications-for-public-services/service-input-output/CODE",
              },
              "cv:supportsConcept": {
                "@id": "https://w3id.org/italia/onto/CPV/taxCode",
              },
            },
          ],
        }),
      ),
    );
    expect(back.inputs[0].text.it).toBe("Codice fiscale");
    expect(back.inputs[0].typeId).toContain("/CODE");
    expect(JSON.stringify(formToDocument(back))).not.toContain("supportsConcept");
  });

  it("normalizes legacy string fields", () => {
    const back = documentToForm(
      formToDocument({
        ...emptyDraft(),
        // @ts-expect-error legacy string title
        title: "Solo stringa",
        serviceId: "https://example.org/s/",
      }),
    );
    expect(back.title.it).toBe("Solo stringa");
  });
});
