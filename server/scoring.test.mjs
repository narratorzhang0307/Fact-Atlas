import { describe, expect, it } from "vitest";
import { calculateTruthScore } from "./scoring.mjs";

function verdict(verdict, confidence, stances) {
  return {
    verdict,
    confidence,
    evidenceAssessments: stances.map((stance, index) => ({
      sourceIndex: index + 1,
      stance,
      reliability: 90,
    })),
  };
}

describe("deterministic Truth Score", () => {
  it("scores corroborated support high", () => {
    const result = calculateTruthScore(
      [verdict("supported", 94, ["support", "support", "context"]), verdict("supported", 88, ["support", "support", "support"])],
      3,
    );
    expect(result.verdict).toBe("supported");
    expect(result.truthScore).toBeGreaterThan(80);
  });

  it("scores corroborated refutation low", () => {
    const result = calculateTruthScore(
      [verdict("refuted", 96, ["refute", "refute"]), verdict("refuted", 91, ["refute", "refute"])],
      2,
    );
    expect(result.verdict).toBe("refuted");
    expect(result.truthScore).toBeLessThan(20);
  });

  it("refuses false precision when evidence is missing", () => {
    const result = calculateTruthScore(
      [verdict("supported", 99, []), verdict("supported", 99, [])],
      0,
    );
    expect(result.verdict).toBe("insufficient");
    expect(result.truthScore).toBeGreaterThan(50);
    expect(result.truthScore).toBeLessThan(70);
    expect(result.confidence).toBeLessThanOrEqual(48);
  });

  it("makes disagreement visible", () => {
    const result = calculateTruthScore(
      [verdict("supported", 90, ["support", "context"]), verdict("refuted", 90, ["refute", "context"])],
      2,
    );
    expect(result.verdict).toBe("mixed");
    expect(result.breakdown.modelAgreement).toBeLessThan(20);
  });
});
