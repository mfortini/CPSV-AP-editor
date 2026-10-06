import { describe, expect, it } from "vitest";
import {
  buildHash,
  compressJson,
  decompressJson,
  parseHash,
} from "./hashDoc";

describe("hashDoc", () => {
  it("parses and builds hash state", () => {
    const hash = buildHash({
      lang: "en",
      view: "sorgente",
      doc: "abc",
    });
    expect(hash.startsWith("#")).toBe(true);
    const parsed = parseHash(hash);
    expect(parsed.lang).toBe("en");
    expect(parsed.view).toBe("sorgente");
    expect(parsed.doc).toBe("abc");
  });

  it("roundtrips gzip base64url JSON-LD", async () => {
    const doc = {
      "@context": { cpsv: "https://w3id.org/italia/onto/CPSV#" },
      "@graph": [
        {
          "@id": "https://example.org/servizi/test/",
          "@type": "cpsv:PublicService",
          "dct:title": { "@language": "it", "@value": "Prova" },
        },
      ],
    };
    const compressed = await compressJson(doc);
    expect(compressed).not.toContain("+");
    expect(compressed).not.toContain("/");
    const restored = await decompressJson(compressed);
    expect(restored["@graph"][0]["@id"]).toBe("https://example.org/servizi/test/");
  });
});
