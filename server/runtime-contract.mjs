import {
  DEFAULT_GONKA_BASE_URL,
  DEFAULT_KIMI_MODEL,
  DEFAULT_MINIMAX_MODEL,
  GonkaError,
} from "./gonka.mjs";

export function buildRuntimeHealth(env = {}) {
  return {
    ok: true,
    liveReady: Boolean(env.GONKA_API_KEY),
    signalCacheReady: Boolean(env.SIGNAL_CACHE_BASE_URL),
    provider: "GonkaRouter",
    baseUrl: env.GONKA_BASE_URL || DEFAULT_GONKA_BASE_URL,
    models: [env.KIMI_MODEL || DEFAULT_KIMI_MODEL, env.MINIMAX_MODEL || DEFAULT_MINIMAX_MODEL],
  };
}

export function signalResponseMetadata(signals) {
  const immutable = signals?.cacheLayer === "snapshot" || signals?.cacheLayer === "oss";
  return {
    cacheControl: immutable ? "public, max-age=86400, immutable" : "no-store",
    headers: {
      "X-Fact-Atlas-Cache": signals?.cacheLayer || "runtime",
      "X-Fact-Atlas-Edition": signals?.calendar?.selectedDate || "unknown",
    },
  };
}

export function normalizeApiError(error) {
  const status = Number(error?.status) || 500;
  const retryAfterSeconds = status === 429 ? Number(error?.details?.retryAfterSeconds) || 60 : null;
  return {
    status,
    body: {
      error: {
        code: error?.code || "INTERNAL_ERROR",
        message: status >= 500 && !(error instanceof GonkaError) ? "Unexpected server error." : error?.message || "Unexpected server error.",
        ...(error?.details ? { details: error.details } : {}),
      },
    },
    headers: retryAfterSeconds ? { "Retry-After": String(retryAfterSeconds) } : {},
  };
}
