import { describe, expect, it } from "vitest";
import { getDailySignals, normalizeSignalRanking, SIGNAL_TOPICS } from "./signals.mjs";
import { resolveSignalDate } from "./signal-skills.mjs";

const SOURCES = [
  { title: "Alpha", url: "https://example.com/a", publisher: "Example A", publishedAt: "2026-07-15", origin: "Test" },
  { title: "Beta", url: "https://example.com/b", publisher: "Example B", publishedAt: "2026-07-15", origin: "Test" },
];

describe("signal scout", () => {
  it("exposes bounded public-interest topic agents", () => {
    expect(Object.keys(SIGNAL_TOPICS)).toEqual(["ai", "technology", "finance", "climate", "science", "health", "culture", "policy"]);
  });

  it("rejects invented and duplicate source indexes", () => {
    const result = normalizeSignalRanking({ signals: [
      { sourceIndex: 1, importance: 120, claim: "A checkable claim about Alpha", headline: "Alpha" },
      { sourceIndex: 1, importance: 90, claim: "Duplicate" },
      { sourceIndex: 9, importance: 80, claim: "Invented source" },
    ] }, SOURCES);
    expect(result.signals).toHaveLength(1);
    expect(result.signals[0].importance).toBe(100);
    expect(result.signals[0].source.url).toBe("https://example.com/a");
  });

  it("falls back to ranked priority when a model returns an ordinal instead of a score", () => {
    const result = normalizeSignalRanking({ signals: [
      { sourceIndex: 1, importance: 1, claim: "A checkable claim about Alpha" },
      { sourceIndex: 2, importance: 2, claim: "A checkable claim about Beta" },
    ] }, SOURCES);
    expect(result.signals.map((signal) => signal.importance)).toEqual([92, 84]);
  });

  it("keeps Gonka receipt provenance on a live ranking", async () => {
    const result = await getDailySignals("ai", "2026-07-15", { GONKA_API_KEY: "test" }, {
      skipCache: true,
      now: new Date("2026-07-15T12:00:00.000Z"),
      searchNewsEvidence: async () => SOURCES,
      callGonka: async (options) => ({
        text: JSON.stringify({ brief: "Brief", briefZh: "简报", signals: [{ sourceIndex: 2, importance: 87, headline: "Beta", headlineZh: "Beta", claim: "A checkable claim about Beta", claimZh: "关于 Beta 的可核验主张", why: "Material", whyZh: "重要" }] }),
        requestId: "gonka-test-receipt",
        model: options.model,
        usage: { inputTokens: 1, outputTokens: 1 },
        trace: { stage: options.purpose, provider: "GonkaRouter", model: options.model, requestId: "gonka-test-receipt", startedAt: "2026-07-15T00:00:00.000Z", durationMs: 10, status: "complete" },
      }),
    });
    expect(result.mode).toBe("live");
    expect(result.requestId).toBe("gonka-test-receipt");
    expect(result.signals[0].sourceIndex).toBe(2);
    expect(result.calendar.selectedDate).toBe("2026-07-15");
    expect(result.agentSystem.topicAgent.id).toBe("ai-topic-agent");
    expect(result.agentSystem.skills.map((skill) => skill.id)).toContain("relay-handoff");
  });

  it("bounds the selectable archive to a deterministic 30-day window", () => {
    expect(resolveSignalDate("2026-07-01", new Date("2026-07-15T12:00:00.000Z"))).toMatchObject({
      selectedDate: "2026-07-01",
      minDate: "2026-06-16",
      maxDate: "2026-07-15",
      historyDays: 30,
    });
    expect(() => resolveSignalDate("2026-06-01", new Date("2026-07-15T12:00:00.000Z"))).toThrow("between");
  });

  it("rejects unsupported topics before network access", async () => {
    await expect(getDailySignals("rumors", "2026-07-15", { GONKA_API_KEY: "test" }, { skipCache: true })).rejects.toMatchObject({ code: "INVALID_TOPIC" });
  });
});
