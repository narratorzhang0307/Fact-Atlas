import { describe, expect, it } from "vitest";
import { createFixedWindowLimiter } from "./rate-limit.mjs";

describe("fixed-window inference limiter", () => {
  it("allows the configured budget and returns a bounded retry interval", () => {
    const limiter = createFixedWindowLimiter({ windowMs: 10_000, maxRuns: 2 });
    limiter.check("client", 1_000);
    limiter.check("client", 2_000);
    expect(() => limiter.check("client", 3_000)).toThrow(expect.objectContaining({
      status: 429,
      code: "RATE_LIMITED",
      details: { retryAfterSeconds: 8 },
    }));
  });

  it("resets expired windows and bounds retained client keys", () => {
    const limiter = createFixedWindowLimiter({ windowMs: 1_000, maxRuns: 1, maxKeys: 2 });
    limiter.check("expired", 0);
    limiter.check("active", 1_500);
    limiter.check("new", 1_600);
    expect(limiter.size).toBe(2);
    expect(() => limiter.check("active", 1_700)).toThrow(expect.objectContaining({ code: "RATE_LIMITED" }));
    expect(() => limiter.check("active", 2_501)).not.toThrow();
  });
});
