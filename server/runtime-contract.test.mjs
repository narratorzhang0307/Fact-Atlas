import { describe, expect, it } from "vitest";
import { GonkaError } from "./gonka.mjs";
import { buildRuntimeHealth, normalizeApiError, signalResponseMetadata } from "./runtime-contract.mjs";

describe("shared runtime contract", () => {
  it("builds the same public health payload from either runtime environment", () => {
    expect(buildRuntimeHealth({ GONKA_API_KEY: "secret", SIGNAL_CACHE_BASE_URL: "https://cache.example" })).toMatchObject({
      ok: true,
      liveReady: true,
      signalCacheReady: true,
      provider: "GonkaRouter",
    });
  });

  it("describes immutable and live Signal editions consistently", () => {
    expect(signalResponseMetadata({ cacheLayer: "oss", calendar: { selectedDate: "2026-07-15" } })).toEqual({
      cacheControl: "public, max-age=86400, immutable",
      headers: { "X-Fact-Atlas-Cache": "oss", "X-Fact-Atlas-Edition": "2026-07-15" },
    });
    expect(signalResponseMetadata({ cacheLayer: "runtime", calendar: { selectedDate: "2026-07-16" } }).cacheControl).toBe("no-store");
  });

  it("keeps expected Gonka errors while hiding unexpected server details", () => {
    expect(normalizeApiError(new GonkaError("Key missing.", { status: 503, code: "GONKA_API_KEY_MISSING" }))).toMatchObject({
      status: 503,
      body: { error: { code: "GONKA_API_KEY_MISSING", message: "Key missing." } },
    });
    expect(normalizeApiError(new Error("database password leaked"))).toMatchObject({
      status: 500,
      body: { error: { code: "INTERNAL_ERROR", message: "Unexpected server error." } },
    });
  });

  it("normalizes Retry-After for public rate-limit responses", () => {
    const error = new GonkaError("Too many requests.", { status: 429, code: "RATE_LIMITED", details: { retryAfterSeconds: 17 } });
    expect(normalizeApiError(error).headers).toEqual({ "Retry-After": "17" });
  });
});
