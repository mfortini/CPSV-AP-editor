import { afterEach, describe, expect, it, vi } from "vitest";
import sparqlFixture from "./__fixtures__/sparql-cpv.json";
import ttlFixture from "./__fixtures__/cpv-sample.ttl?raw";
import {
  loadConceptsRemote,
  mapSparqlBindings,
  parseCpvTtl,
} from "./sparqlConcepts";

describe("mapSparqlBindings", () => {
  it("maps CPV rows and skips non-CPV URIs", () => {
    const entries = mapSparqlBindings(sparqlFixture);
    expect(entries).toHaveLength(2);
    expect(entries.map((e) => e.id.split("/").pop())).toEqual([
      "taxCode",
      "givenName",
    ]);
    expect(entries[0].labels).toEqual({ it: "codice fiscale", en: "tax code" });
  });
});

describe("parseCpvTtl", () => {
  it("extracts DatatypeProperty labels and ignores classes", () => {
    const entries = parseCpvTtl(ttlFixture);
    expect(entries.map((e) => e.id.split("/").pop())).toEqual([
      "taxCode",
      "familyName",
      "givenName",
    ]);
    expect(entries.find((e) => e.id.endsWith("Person"))).toBeUndefined();
    expect(entries.find((e) => e.id.endsWith("taxCode"))?.labels).toEqual({
      it: "codice fiscale",
      en: "tax code",
    });
  });
});

describe("loadConceptsRemote", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    sessionStorage.clear();
  });

  it("uses SPARQL when available and caches the result", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      headers: { get: () => "application/sparql-results+json" },
      json: async () => sparqlFixture,
      clone() {
        return this;
      },
      text: async () => JSON.stringify(sparqlFixture),
    });
    vi.stubGlobal("fetch", fetchMock);

    const first = await loadConceptsRemote();
    expect(first.source).toBe("sparql");
    expect(first.entries.length).toBe(2);

    const second = await loadConceptsRemote();
    expect(second.source).toBe("cache");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("falls back to TTL when SPARQL fails", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("schema.gov.it/sparql")) {
        return {
          ok: false,
          status: 503,
          headers: { get: () => "text/html" },
          clone() {
            return this;
          },
          text: async () => "<html>down</html>",
          json: async () => ({}),
        };
      }
      if (url.includes("CPV-AP_IT.ttl")) {
        return {
          ok: true,
          status: 200,
          headers: { get: () => "text/turtle" },
          text: async () => ttlFixture,
          clone() {
            return this;
          },
          json: async () => ({}),
        };
      }
      throw new Error(`unexpected fetch ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await loadConceptsRemote();
    expect(result.source).toBe("ttl");
    expect(result.entries.some((e) => e.id.endsWith("taxCode"))).toBe(true);
  });

  it("falls back to local JSON when remote sources fail", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("concepts.json")) {
        return {
          ok: true,
          status: 200,
          headers: { get: () => "application/json" },
          json: async () => ({
            "https://w3id.org/italia/onto/CPV/taxCode": {
              it: "Codice fiscale",
              en: "Tax code",
            },
          }),
          clone() {
            return this;
          },
          text: async () => "",
        };
      }
      return {
        ok: false,
        status: 500,
        headers: { get: () => "text/plain" },
        clone() {
          return this;
        },
        text: async () => "fail",
        json: async () => ({}),
      };
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await loadConceptsRemote();
    expect(result.source).toBe("local");
    expect(result.entries).toHaveLength(1);
  });
});
