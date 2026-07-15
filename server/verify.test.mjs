import { describe, expect, it, vi } from "vitest";
import { callGonkaJson, verifyClaim } from "./verify.mjs";

function result(text, id, purpose = "investigator-analysis") {
  return {
    text,
    requestId: id,
    model: "test/model",
    usage: { inputTokens: 1, outputTokens: 1 },
    trace: {
      stage: purpose,
      provider: "GonkaRouter",
      model: "test/model",
      requestId: id,
      startedAt: "2026-07-15T00:00:00.000Z",
      durationMs: 10,
      status: "complete",
    },
  };
}

describe("structured Gonka output", () => {
  it("retries once with the same model when the first output is not JSON", async () => {
    const request = vi
      .fn()
      .mockResolvedValueOnce(result("I cannot format that response.", "req-first"))
      .mockResolvedValueOnce(result('{"verdict":"refuted"}', "req-retry", "investigator-analysis-json-retry"));
    const trace = [];

    const output = await callGonkaJson({
      model: "test/model",
      messages: [{ role: "user", content: "Return JSON." }],
      purpose: "investigator-analysis",
    }, { request, trace });

    expect(output.parsed).toEqual({ verdict: "refuted" });
    expect(output.call.requestId).toBe("req-retry");
    expect(request).toHaveBeenCalledTimes(2);
    expect(request.mock.calls[1][0].model).toBe("test/model");
    expect(request.mock.calls[1][0].temperature).toBe(0);
    expect(request.mock.calls[1][0].messages.at(-2).content).toContain("UNTRUSTED PREVIOUS OUTPUT");
    expect(trace.map((step) => [step.requestId, step.status])).toEqual([
      ["req-first", "partial"],
      ["req-retry", "complete"],
    ]);
  });

  it("fails explicitly after one invalid retry", async () => {
    const request = vi
      .fn()
      .mockResolvedValueOnce(result("no object", "req-first"))
      .mockResolvedValueOnce(result("still no object", "req-retry", "skeptic-cross-check-json-retry"));

    await expect(callGonkaJson({
      model: "test/model",
      messages: [],
      purpose: "skeptic-cross-check",
    }, { request, trace: [] })).rejects.toMatchObject({
      code: "GONKA_INVALID_JSON",
      status: 422,
    });
  });

  it("returns the executable main-agent, subagent, and Skill contract with every live result", async () => {
    const modelVerdict = JSON.stringify({
      verdict: "supported",
      confidence: 91,
      summary: "Two independent sources support the bounded claim.",
      reasoning: ["The sources independently converge."],
      missingEvidence: [],
      evidenceAssessments: [
        { sourceIndex: 1, stance: "support", reliability: 92, reason: "Direct report" },
        { sourceIndex: 2, stance: "support", reliability: 88, reason: "Independent corroboration" },
      ],
    });
    const request = vi.fn()
      .mockResolvedValueOnce(result(modelVerdict, "req-investigator"))
      .mockResolvedValueOnce(result(modelVerdict, "req-skeptic", "skeptic-cross-check"));
    const sources = [
      { id: "source-1", title: "Primary report", url: "https://example.com/primary", publisher: "Example One", publishedAt: "2026-07-15", snippet: "A direct report.", origin: "Test search" },
      { id: "source-2", title: "Independent review", url: "https://example.org/review", publisher: "Example Two", publishedAt: "2026-07-15", snippet: "An independent review.", origin: "Test search" },
    ];

    const output = await verifyClaim(
      { kind: "text", content: "A sufficiently bounded public claim for verification." },
      { GONKA_API_KEY: "test" },
      { callGonka: request, searchNewsEvidence: async () => sources },
    );

    expect(output.agentSystem.mainAgent.id).toBe("relay-supervisor");
    expect(output.agentSystem.subagents.map((agent) => agent.id)).toEqual([
      "intake", "evidence-scout", "investigator", "skeptic", "judge", "receipt",
    ]);
    expect(output.agentSystem.skills.at(-1)).toMatchObject({ id: "atlas-gate", kind: "human-gated" });
    expect(output.models.map((model) => model.requestId)).toEqual(["req-investigator", "req-skeptic"]);
  });
});
