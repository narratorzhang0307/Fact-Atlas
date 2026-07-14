import { describe, expect, it } from "vitest";
import { normalizeModelVerdict, parseJsonObject } from "./json.mjs";

describe("model JSON parsing", () => {
  it("parses a fenced JSON response", () => {
    expect(parseJsonObject('```json\n{"verdict":"supported"}\n```')).toEqual({
      verdict: "supported",
    });
  });

  it("extracts JSON surrounded by prose", () => {
    expect(parseJsonObject('Result follows: {"confidence":72} done.')).toEqual({ confidence: 72 });
  });

  it("drops hallucinated source indexes", () => {
    const normalized = normalizeModelVerdict(
      {
        verdict: "supported",
        confidence: 110,
        evidenceAssessments: [
          { sourceIndex: 1, stance: "support", reliability: 90, reason: "Primary source" },
          { sourceIndex: 7, stance: "support", reliability: 90, reason: "Does not exist" },
        ],
      },
      2,
    );
    expect(normalized.confidence).toBe(100);
    expect(normalized.evidenceAssessments).toHaveLength(1);
  });
});
