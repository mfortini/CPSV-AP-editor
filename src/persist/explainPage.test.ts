import { describe, expect, it } from "vitest";
import { isExplainSearch, withoutExplainSearch } from "./explainPage";

describe("explain page query", () => {
  it("recognizes the spiegazione parameter", () => {
    expect(isExplainSearch("?spiegazione")).toBe(true);
    expect(isExplainSearch("?spiegazione=1")).toBe(true);
    expect(isExplainSearch("")).toBe(false);
    expect(isExplainSearch("?foo=spiegazione")).toBe(false);
  });

  it("drops only the spiegazione parameter and keeps the fragment", () => {
    expect(
      withoutExplainSearch(
        "http://localhost/CPSV-AP-editor/?spiegazione&x=1#lang=it&view=editor&doc=abc",
      ),
    ).toBe("/CPSV-AP-editor/?x=1#lang=it&view=editor&doc=abc");
    expect(
      withoutExplainSearch("http://localhost/?spiegazione#lang=en&view=scheda"),
    ).toBe("/#lang=en&view=scheda");
  });
});
