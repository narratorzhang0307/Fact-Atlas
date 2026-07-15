import { describe, expect, it } from "vitest";
import {
  loadSignalBrief,
  saveSignalBrief,
  SIGNAL_BUFFER_MAX_EDITIONS,
  SIGNAL_BUFFER_STORAGE_KEY,
  SIGNAL_BUFFER_TTL_MS,
} from "./signal-cache";
import type { DailySignalBrief, SignalTopic } from "./types";

class MemoryStorage {
  values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
}

function brief(topic: SignalTopic, date: string): DailySignalBrief {
  return {
    mode: "live",
    generatedAt: `${date}T00:00:00.000Z`,
    topic,
    topicLabel: topic,
    topicLabelZh: topic,
    agent: "Test agent",
    calendar: { selectedDate: date, minDate: date, maxDate: date, timezone: "UTC", historyDays: 30, coverageStart: date, coverageEnd: date, coverageDays: 7 },
    agentSystem: { mainAgent: { id: "main", name: "Main", responsibility: "route" }, topicAgent: { id: "topic", name: "Topic", responsibility: "scan", skills: [] }, skills: [] },
    model: "test",
    requestId: "request-test",
    cacheHit: false,
    brief: `Brief for ${topic}`,
    briefZh: `简报 ${topic}`,
    signals: [],
  };
}

describe("three-day Signals device buffer", () => {
  it("restores a saved edition during the 72-hour window", () => {
    const storage = new MemoryStorage();
    expect(saveSignalBrief(brief("ai", "2026-07-15"), storage, 1_000)).toBe(true);
    expect(loadSignalBrief("ai", "2026-07-15", storage, 1_000 + SIGNAL_BUFFER_TTL_MS)).toMatchObject({ topic: "ai" });
  });

  it("expires an edition after the three-day window", () => {
    const storage = new MemoryStorage();
    saveSignalBrief(brief("finance", "2026-07-14"), storage, 1_000);
    expect(loadSignalBrief("finance", "2026-07-14", storage, 1_001 + SIGNAL_BUFFER_TTL_MS)).toBeNull();
  });

  it("rejects corrupt or mismatched cached editions", () => {
    const storage = new MemoryStorage();
    storage.setItem(SIGNAL_BUFFER_STORAGE_KEY, JSON.stringify({ version: 1, editions: { "2026-07-15:ai": { savedAt: 1_000, brief: { topic: "policy" } } } }));
    expect(loadSignalBrief("ai", "2026-07-15", storage, 1_001)).toBeNull();
  });

  it("caps storage at eight topics across three daily editions", () => {
    const storage = new MemoryStorage();
    const topics: SignalTopic[] = ["ai", "technology", "finance", "climate", "science", "health", "culture", "policy"];
    for (let day = 1; day <= 4; day += 1) {
      for (const topic of topics) saveSignalBrief(brief(topic, `2026-07-${String(day).padStart(2, "0")}`), storage, day * 1_000);
    }
    const stored = JSON.parse(storage.getItem(SIGNAL_BUFFER_STORAGE_KEY) || "null");
    expect(Object.keys(stored.editions)).toHaveLength(SIGNAL_BUFFER_MAX_EDITIONS);

    saveSignalBrief(brief("policy", "2026-07-04"), storage, 5_000);
    const refreshed = JSON.parse(storage.getItem(SIGNAL_BUFFER_STORAGE_KEY) || "null");
    expect(Object.keys(refreshed.editions)).toHaveLength(SIGNAL_BUFFER_MAX_EDITIONS);
  });
});
