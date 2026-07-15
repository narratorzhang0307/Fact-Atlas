import type { DailySignalBrief, SignalTopic } from "./types";

export const SIGNAL_BUFFER_TTL_MS = 3 * 24 * 60 * 60 * 1000;
export const SIGNAL_BUFFER_MAX_EDITIONS = 24;
export const SIGNAL_BUFFER_STORAGE_KEY = "factatlas.signals.v1";

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
  editions: Record<string, StoredEdition>;
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

function validBrief(value: unknown, topic: SignalTopic, date: string): value is DailySignalBrief {
  if (!value || typeof value !== "object") return false;
  const brief = value as Partial<DailySignalBrief>;
  return brief.topic === topic
    && brief.calendar?.selectedDate === date
    && Array.isArray(brief.signals)
    && typeof brief.brief === "string";
}

export function loadSignalBrief(
  topic: SignalTopic,
  date: string,
  storage: StorageLike | null = browserStorage(),
  now = Date.now(),
): DailySignalBrief | null {
  if (!storage) return null;
  const stored = readBuffer(storage).editions[editionKey(topic, date)];
  if (!stored || now - stored.savedAt > SIGNAL_BUFFER_TTL_MS || !validBrief(stored.brief, topic, date)) return null;
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
      .filter(([key, value]) => key !== currentKey && now - value.savedAt <= SIGNAL_BUFFER_TTL_MS)
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
