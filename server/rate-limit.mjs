import { GonkaError } from "./gonka.mjs";

export function createFixedWindowLimiter({ windowMs = 10 * 60 * 1000, maxRuns = 6, maxKeys = 10_000 } = {}) {
  const windows = new Map();

  function prune(now) {
    for (const [key, value] of windows) {
      if (now - value.startedAt >= windowMs) windows.delete(key);
    }
    while (windows.size >= maxKeys) windows.delete(windows.keys().next().value);
  }

  return {
    check(rawKey, now = Date.now()) {
      const key = String(rawKey || "anonymous").slice(0, 200);
      let current = windows.get(key);
      if (!current || now - current.startedAt >= windowMs) {
        if (windows.size >= maxKeys) prune(now);
        current = { startedAt: now, count: 0 };
        windows.set(key, current);
      }
      if (current.count >= maxRuns) {
        const retryAfterSeconds = Math.max(1, Math.ceil((current.startedAt + windowMs - now) / 1000));
        throw new GonkaError("Too many inference runs. Please try again later.", {
          status: 429,
          code: "RATE_LIMITED",
          details: { retryAfterSeconds },
        });
      }
      current.count += 1;
    },
    get size() {
      return windows.size;
    },
  };
}
