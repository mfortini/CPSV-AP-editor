import { describe, expect, it } from "vitest";
import { parseVocabMap, vocabLabel } from "./load";

describe("vocab labels", () => {
  it("parses bilingual maps and resolves by language", () => {
    const entries = parseVocabMap({
      "https://example.org/a": { it: "Ciao", en: "Hello" },
      "https://example.org/b": "Solo italiano legacy",
    });
    expect(vocabLabel(entries[0], "en")).toBe("Hello");
    expect(vocabLabel(entries[0], "it")).toBe("Ciao");
    expect(vocabLabel(entries[1], "en")).toBe("Solo italiano legacy");
  });
});
