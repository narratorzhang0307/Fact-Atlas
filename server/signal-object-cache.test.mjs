import { describe, expect, it } from "vitest";
import { getSignalObjectCache } from "./signal-object-cache.mjs";

const TOPICS = ["ai", "technology", "finance", "climate", "science", "health", "culture", "policy"];

function edition(topic, date) {
  return {
    mode: "live",
    generatedAt: `${date}T08:00:00.000Z`,
    topic,
    topicLabel: topic,
    topicLabelZh: topic,
    agent: `${topic} agent`,
    calendar: { selectedDate: date },
    agentSystem: {},
    model: "test",
    requestId: `gonka-${topic}`,
    trace: [{ provider: "GonkaRouter", status: "complete" }],
    cacheHit: false,
    brief: "Brief",
    briefZh: "简报",
    signals: [{ headline: "Headline", headlineZh: "标题", claim: "Checkable claim", claimZh: "可核验主张", why: "Material", whyZh: "重要", source: { url: "https://example.com" } }],
  };
}

function bundle(date) {
  return { version: 1, date, editions: Object.fromEntries(TOPICS.map((topic) => [topic, edition(topic, date)])) };
}

describe("Signals OSS object cache", () => {
  it("returns a validated recent edition with its Gonka receipt", async () => {
    const result = await getSignalObjectCache("finance", "2026-07-15", { SIGNAL_CACHE_BASE_URL: "https://cache.example/signals/" }, {
      now: new Date("2026-07-16T12:00:00.000Z"),
      skipMemory: true,
      fetchImpl: async (url) => {
        expect(url).toBe("https://cache.example/signals/2026-07-15.json");
        return Response.json(bundle("2026-07-15"));
      },
    });
    expect(result).toMatchObject({ topic: "finance", requestId: "gonka-finance", cacheHit: true, cacheLayer: "oss" });
  });

  it("ignores objects outside the rolling three-day window", async () => {
    let calls = 0;
    const result = await getSignalObjectCache("ai", "2026-07-13", { SIGNAL_CACHE_BASE_URL: "https://cache.example/signals" }, {
      now: new Date("2026-07-16T12:00:00.000Z"),
      fetchImpl: async () => { calls += 1; return Response.json(bundle("2026-07-13")); },
    });
    expect(result).toBeNull();
    expect(calls).toBe(0);
  });

  it("fails closed when any topic is missing its completed Gonka trace", async () => {
    const invalid = bundle("2026-07-16");
    invalid.editions.policy.trace = [];
    const result = await getSignalObjectCache("ai", "2026-07-16", { SIGNAL_CACHE_BASE_URL: "https://cache.example/signals" }, {
      now: new Date("2026-07-16T12:00:00.000Z"),
      skipMemory: true,
      fetchImpl: async () => Response.json(invalid),
    });
    expect(result).toBeNull();
  });

  it("falls through quietly when OSS is unavailable", async () => {
    const result = await getSignalObjectCache("ai", "2026-07-16", { SIGNAL_CACHE_BASE_URL: "https://cache.example/signals" }, {
      now: new Date("2026-07-16T12:00:00.000Z"),
      skipMemory: true,
      fetchImpl: async () => { throw new Error("offline"); },
    });
    expect(result).toBeNull();
  });
});
