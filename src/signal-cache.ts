import type { DailySignalBrief, SignalTopic } from "./types";

export const SIGNAL_BUFFER_TTL_MS = 3 * 24 * 60 * 60 * 1000;
export const SIGNAL_BUFFER_MAX_EDITIONS = 24;
export const SIGNAL_BUFFER_STORAGE_KEY = "factatlas.signals.v1";
const SIGNAL_BUFFER_CLOCK_SKEW_MS = 5 * 60 * 1000;
const SIGNAL_TOPICS: SignalTopic[] = ["ai", "technology", "finance", "climate", "science", "health", "culture", "policy"];

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

interface StoredEdition {
  savedAt: number;
  brief: DailySignalBrief;
}

interface SignalBuffer {
  version: 1;
  editions: Record<string, unknown>;
}

function editionKey(topic: SignalTopic, date: string): string {
  return `${date}:${topic}`;
}

function browserStorage(): StorageLike | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function readBuffer(storage: StorageLike): SignalBuffer {
  try {
    const parsed = JSON.parse(storage.getItem(SIGNAL_BUFFER_STORAGE_KEY) || "null") as Partial<SignalBuffer> | null;
    if (parsed?.version === 1 && parsed.editions && typeof parsed.editions === "object") {
      return { version: 1, editions: parsed.editions };
    }
  } catch {
    // A corrupt or unavailable cache is treated as empty.
  }
  return { version: 1, editions: {} };
}

function isHttpUrl(value: unknown): value is string {
  if (typeof value !== "string") return false;
  try {
    const url = new URL(value);
    return (url.protocol === "https:" || url.protocol === "http:") && !url.username && !url.password;
  } catch {
    return false;
  }
}

function validSignal(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  const signal = value as DailySignalBrief["signals"][number];
  return typeof signal.id === "string"
    && Number.isInteger(signal.sourceIndex)
    && Number.isFinite(signal.importance)
    && signal.importance >= 0
    && signal.importance <= 100
    && typeof signal.headline === "string"
    && typeof signal.headlineZh === "string"
    && typeof signal.claim === "string"
    && typeof signal.claimZh === "string"
    && typeof signal.why === "string"
    && typeof signal.whyZh === "string"
    && Boolean(signal.source && typeof signal.source.publisher === "string" && isHttpUrl(signal.source.url))
    && (signal.source.imageUrl === null || isHttpUrl(signal.source.imageUrl));
}

function validBrief(value: unknown, topic: SignalTopic, date: string): value is DailySignalBrief {
  if (!value || typeof value !== "object") return false;
  const brief = value as Partial<DailySignalBrief>;
  return brief.mode === "live"
    && SIGNAL_TOPICS.includes(topic)
    && brief.topic === topic
    && brief.calendar?.selectedDate === date
    && typeof brief.generatedAt === "string"
    && !Number.isNaN(Date.parse(brief.generatedAt))
    && typeof brief.brief === "string"
    && typeof brief.briefZh === "string"
    && typeof brief.cacheHit === "boolean"
    && Array.isArray(brief.signals)
    && brief.signals.length <= 5
    && brief.signals.every(validSignal);
}

function validStoredEdition(value: unknown, topic: SignalTopic, date: string, now: number): value is StoredEdition {
  if (!value || typeof value !== "object") return false;
  const stored = value as Partial<StoredEdition>;
  return typeof stored.savedAt === "number"
    && Number.isFinite(stored.savedAt)
    && stored.savedAt <= now + SIGNAL_BUFFER_CLOCK_SKEW_MS
    && now - stored.savedAt <= SIGNAL_BUFFER_TTL_MS
    && validBrief(stored.brief, topic, date);
}

export function loadSignalBrief(
  topic: SignalTopic,
  date: string,
  storage: StorageLike | null = browserStorage(),
  now = Date.now(),
): DailySignalBrief | null {
  if (!storage) return null;
  const stored = readBuffer(storage).editions[editionKey(topic, date)];
  if (!validStoredEdition(stored, topic, date, now)) return null;
  return stored.brief;
}

export function saveSignalBrief(
  brief: DailySignalBrief,
  storage: StorageLike | null = browserStorage(),
  now = Date.now(),
): boolean {
  if (!storage || !validBrief(brief, brief.topic, brief.calendar.selectedDate)) return false;
  try {
    const buffer = readBuffer(storage);
    const currentKey = editionKey(brief.topic, brief.calendar.selectedDate);
    const freshEntries = Object.entries(buffer.editions)
      .filter(([key, value]) => {
        if (key === currentKey) return false;
        const [date, topic] = key.split(":") as [string, SignalTopic];
        return validStoredEdition(value, topic, date, now);
      })
      .map(([key, value]) => [key, value as StoredEdition] as const)
      .sort(([, left], [, right]) => right.savedAt - left.savedAt)
      .slice(0, SIGNAL_BUFFER_MAX_EDITIONS - 1);
    buffer.editions = Object.fromEntries(freshEntries);
    buffer.editions[currentKey] = { savedAt: now, brief };
    storage.setItem(SIGNAL_BUFFER_STORAGE_KEY, JSON.stringify(buffer));
    return true;
  } catch {
    return false;
  }
}
