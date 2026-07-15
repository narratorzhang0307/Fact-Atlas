const SIGNAL_CACHE_TOPICS = ["ai", "technology", "finance", "climate", "science", "health", "culture", "policy"];
const CACHE_WINDOW_DAYS = 3;
const CACHE_TTL_MS = 10 * 60 * 1000;
const MAX_BUNDLE_BYTES = 5_000_000;
const bundleMemory = new Map();

function isRecentDate(date, now) {
  const selected = Date.parse(`${date}T00:00:00.000Z`);
  const currentDate = now.toISOString().slice(0, 10);
  const current = Date.parse(`${currentDate}T00:00:00.000Z`);
  const ageDays = (current - selected) / 86_400_000;
  return Number.isInteger(ageDays) && ageDays >= 0 && ageDays < CACHE_WINDOW_DAYS;
}

function isValidEdition(edition, topic, date) {
  return edition?.mode === "live"
    && edition.topic === topic
    && edition.calendar?.selectedDate === date
    && typeof edition.requestId === "string"
    && edition.requestId.length > 0
    && Array.isArray(edition.trace)
    && edition.trace.some((step) => step?.provider === "GonkaRouter" && step?.status === "complete")
    && Array.isArray(edition.signals)
    && edition.signals.length >= 1
    && edition.signals.length <= 5
    && edition.signals.every((signal) => signal?.headline
      && signal?.headlineZh
      && signal?.claim
      && signal?.claimZh
      && signal?.why
      && signal?.whyZh
      && signal?.source?.url);
}

function isValidBundle(bundle, date) {
  return bundle?.version === 1
    && bundle.date === date
    && bundle.editions
    && SIGNAL_CACHE_TOPICS.every((topic) => isValidEdition(bundle.editions[topic], topic, date));
}

function rememberBundle(key, bundle, now) {
  bundleMemory.set(key, { bundle, savedAt: now.getTime() });
  while (bundleMemory.size > CACHE_WINDOW_DAYS) bundleMemory.delete(bundleMemory.keys().next().value);
}

export async function getSignalObjectCache(topic, date, env = {}, runtime = {}) {
  const baseUrl = String(env.SIGNAL_CACHE_BASE_URL || "").trim().replace(/\/$/, "");
  const now = runtime.now instanceof Date ? runtime.now : new Date();
  if (!baseUrl || !SIGNAL_CACHE_TOPICS.includes(topic) || !isRecentDate(date, now)) return null;

  const objectUrl = `${baseUrl}/${date}.json`;
  const remembered = bundleMemory.get(objectUrl);
  if (!runtime.skipMemory && remembered && now.getTime() - remembered.savedAt <= CACHE_TTL_MS) {
    return { ...structuredClone(remembered.bundle.editions[topic]), cacheHit: true, cacheLayer: "oss" };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), runtime.timeoutMs || 3_000);
  try {
    const response = await (runtime.fetchImpl || fetch)(objectUrl, {
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
    if (!response.ok || Number(response.headers.get("content-length") || 0) > MAX_BUNDLE_BYTES) return null;
    const body = await response.text();
    if (new TextEncoder().encode(body).byteLength > MAX_BUNDLE_BYTES) return null;
    const bundle = JSON.parse(body);
    if (!isValidBundle(bundle, date)) return null;
    rememberBundle(objectUrl, bundle, now);
    return { ...structuredClone(bundle.editions[topic]), cacheHit: true, cacheLayer: "oss" };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
