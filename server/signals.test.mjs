import { describe, expect, it } from "vitest";
import { getDailySignals, normalizeSignalRanking, SIGNAL_TOPICS } from "./signals.mjs";
import { getSignalSnapshot, hasSignalSnapshot } from "./signal-snapshot.mjs";
import { resolveSignalDate, runGlobalPublicScanSkill } from "./signal-skills.mjs";

const SOURCES = [
  { title: "Alpha", url: "https://example.com/a", publisher: "Example A", publishedAt: "2026-07-15", origin: "Test" },
  { title: "Beta", url: "https://example.com/b", publisher: "Example B", publishedAt: "2026-07-15", origin: "Test" },
];

describe("signal scout", () => {
  it("exposes bounded public-interest topic agents", () => {
    expect(Object.keys(SIGNAL_TOPICS)).toEqual(["ai", "technology", "finance", "climate", "science", "health", "culture", "policy"]);
  });

  it("serves a validated dated snapshot without network or runtime credentials", async () => {
    let networkCalls = 0;
    const result = await getDailySignals("technology", "2026-07-15", {}, {
      now: new Date("2026-07-15T12:00:00.000Z"),
      searchNewsEvidence: async () => {
        networkCalls += 1;
        return SOURCES;
      },
    });

    expect(hasSignalSnapshot("technology", "2026-07-15")).toBe(true);
    expect(result.cacheHit).toBe(true);
    expect(result.cacheLayer).toBe("snapshot");
    expect(result.snapshot.signalCount).toBe(result.signals.length);
    expect(result.requestId).toMatch(/^devshard-/);
    expect(networkCalls).toBe(0);
  });

  it("prefers a validated OSS date bundle and preserves the original receipt", async () => {
    const date = "2026-07-15";
    const editions = Object.fromEntries(Object.keys(SIGNAL_TOPICS).map((topic) => [topic, getSignalSnapshot(topic, date)]));
    const result = await getDailySignals("culture", date, { SIGNAL_CACHE_BASE_URL: "https://cache.example/fact-atlas/signals" }, {
      now: new Date("2026-07-16T12:00:00.000Z"),
      fetchImpl: async () => Response.json({ version: 1, date, editions }),
    });
    expect(result.cacheHit).toBe(true);
    expect(result.cacheLayer).toBe("oss");
    expect(result.requestId).toMatch(/^devshard-/);
  });

  it("returns isolated snapshot copies so request consumers cannot mutate the cache", async () => {
    const first = await getDailySignals("ai", "2026-07-15", {}, { now: new Date("2026-07-15T12:00:00.000Z") });
    const originalHeadline = first.signals[0].headline;
    first.signals[0].headline = "mutated";
    const second = await getDailySignals("ai", "2026-07-15", {}, { now: new Date("2026-07-15T12:00:00.000Z") });
    expect(second.signals[0].headline).toBe(originalHeadline);
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

  it("retries one transient empty Gonka response with the same model and preserves the failed attempt", async () => {
    let calls = 0;
    const result = await getDailySignals("ai", "2026-07-15", { GONKA_API_KEY: "test" }, {
      skipCache: true,
      now: new Date("2026-07-15T12:00:00.000Z"),
      searchNewsEvidence: async () => SOURCES,
      callGonka: async (options) => {
        calls += 1;
        if (calls === 1) throw new Error("GonkaRouter returned an empty model response.");
        return {
          text: JSON.stringify({ brief: "Recovered", briefZh: "已恢复", signals: [{ sourceIndex: 1, importance: 88, claim: "A checkable claim about Alpha" }] }),
          requestId: "gonka-retry-receipt",
          model: options.model,
          usage: { inputTokens: 1, outputTokens: 1 },
          trace: { stage: options.purpose, provider: "GonkaRouter", model: options.model, requestId: "gonka-retry-receipt", startedAt: "2026-07-15T00:00:00.000Z", durationMs: 10, status: "complete" },
        };
      },
    });

    expect(calls).toBe(2);
    expect(result.requestId).toBe("gonka-retry-receipt");
    expect(result.trace.map((step) => [step.stage, step.status])).toEqual([
      ["daily-signal-ranking", "partial"],
      ["daily-signal-ranking-response-retry", "complete"],
    ]);
  });

  it("bounds the selectable archive to a deterministic 30-day window", () => {
    expect(resolveSignalDate("2026-07-01", new Date("2026-07-15T12:00:00.000Z"))).toMatchObject({
      selectedDate: "2026-07-01",
      minDate: "2026-06-16",
      maxDate: "2026-07-15",
      historyDays: 30,
      coverageStart: "2026-06-25",
      coverageEnd: "2026-07-01",
      coverageDays: 7,
    });
    expect(() => resolveSignalDate("2026-06-01", new Date("2026-07-15T12:00:00.000Z"))).toThrow("between");
  });

  it("drops aggregator results outside the selected edition date before inference", async () => {
    const result = await runGlobalPublicScanSkill(
      SIGNAL_TOPICS.ai,
      resolveSignalDate("2026-07-15", new Date("2026-07-15T12:00:00.000Z")),
      {
        searchGlobalNewsEvidence: async () => [
          SOURCES[0],
          { ...SOURCES[1], title: "Inside window", publishedAt: "2026-07-09T10:00:00.000Z" },
          { ...SOURCES[1], title: "Outside window", publishedAt: "2026-07-08T10:00:00.000Z" },
          { ...SOURCES[1], title: "Undated", publishedAt: null },
        ],
      },
    );
    expect(result).toHaveLength(2);
    expect(result[0].title).toBe("Alpha");
    expect(result[1].title).toBe("Inside window");
  });

  it("rejects unsupported topics before network access", async () => {
    await expect(getDailySignals("rumors", "2026-07-15", { GONKA_API_KEY: "test" }, { skipCache: true })).rejects.toMatchObject({ code: "INVALID_TOPIC" });
  });
});
