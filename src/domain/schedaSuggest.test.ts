import { describe, expect, it } from "vitest";
import {
  applySuggestions,
  buildIpaUri,
  parseIpaRef,
  suggestOrgId,
} from "./schedaSuggest";
import { emptyDraft } from "./schedaModel";

describe("IPA org id", () => {
  it("builds PA and AOO URIs", () => {
    expect(buildIpaUri("c_h501")).toBe("http://indicepa.gov.it/pa/c_h501");
    expect(buildIpaUri("c_h501", "AOOC")).toBe(
      "http://indicepa.gov.it/pa/c_h501/aoo/AOOC",
    );
  });

  it("parses bare codes, URLs and labels", () => {
    expect(parseIpaRef("c_h501")).toEqual({
      codiceIPA: "c_h501",
      codiceAOO: "",
    });
    expect(parseIpaRef("https://www.indicepa.gov.it/pa/agid/aoo/AOOAGID")).toEqual({
      codiceIPA: "agid",
      codiceAOO: "AOOAGID",
    });
    expect(parseIpaRef("Comune di Roma (c_h501)")).toEqual({
      codiceIPA: "c_h501",
      codiceAOO: "",
    });
    expect(parseIpaRef("IPA: m_l186 AOO: AOOMIM")).toEqual({
      codiceIPA: "m_l186",
      codiceAOO: "AOOMIM",
    });
  });

  it("suggests URI from bare code or org name", () => {
    expect(suggestOrgId("inps")).toBe("http://indicepa.gov.it/pa/inps");
    expect(suggestOrgId("https://example.org/", "Comune (c_h501)")).toBe(
      "http://indicepa.gov.it/pa/c_h501",
    );
    expect(suggestOrgId("https://altro.org/ente")).toBe("");
    expect(
      suggestOrgId("http://indicepa.gov.it/pa/c_h501"),
    ).toBe("");
  });

  it("applies IPA suggestion with structure button", () => {
    const { draft, changed } = applySuggestions({
      ...emptyDraft(),
      orgId: "c_h501",
      orgName: { it: "Comune di Roma", en: "Municipality of Rome" },
    });
    expect(changed).toBeGreaterThan(0);
    expect(draft.orgId).toBe("http://indicepa.gov.it/pa/c_h501");
  });
});
