import { describe, expect, it } from "vitest";
import worker from "./index.mjs";

function env(overrides = {}) {
  return {
    ASSETS: {
      fetch: async (request) => new Response(
        '<html><meta property="og:image" content="https://factrelay.invalid/og.png"><div id="root"></div></html>',
        { headers: { "Content-Type": "text/html; charset=utf-8" } },
      ),
    },
    ...overrides,
  };
}

describe("Sites worker", () => {
  it("reports whether live Gonka verification is configured", async () => {
    const response = await worker.fetch(new Request("https://factrelay.example/api/health"), env());
    await expect(response.json()).resolves.toMatchObject({ ok: true, liveReady: false, signalCacheReady: false });
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
  });

  it("serves the bilingual preview fixture", async () => {
    const response = await worker.fetch(new Request("https://factrelay.example/api/demo"), env());
    await expect(response.json()).resolves.toMatchObject({ mode: "preview", truthScore: 9 });
  });

  it("keeps live verification unavailable without a server-side key", async () => {
    const response = await worker.fetch(new Request("https://factrelay.example/api/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: "text", content: "A sufficiently long factual claim." }),
    }), env());
    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({ error: { code: "GONKA_API_KEY_MISSING" } });
  });

  it("uses the incoming host for absolute social-preview metadata", async () => {
    const response = await worker.fetch(new Request("https://factrelay.example/case/one"), env());
    expect(await response.text()).toContain("https://factrelay.example/og.png");
  });

  it("exposes cache provenance headers for a dated snapshot", async () => {
    const response = await worker.fetch(new Request("https://factrelay.example/api/signals?topic=ai&date=2026-07-15", {
      headers: { "cf-connecting-ip": "192.0.2.10" },
    }), env());
    expect(response.status).toBe(200);
    expect(response.headers.get("x-fact-atlas-cache")).toBe("snapshot");
    expect(response.headers.get("x-fact-atlas-edition")).toBe("2026-07-15");
  });

  it("rate-limits repeated inference attempts with Retry-After", async () => {
    let response;
    for (let count = 0; count < 7; count += 1) {
      response = await worker.fetch(new Request("https://factrelay.example/api/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json", "cf-connecting-ip": "192.0.2.77" },
        body: JSON.stringify({ kind: "text", content: "A sufficiently long factual claim for rate-limit testing." }),
      }), env());
    }
    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toMatch(/^\d+$/);
    await expect(response.json()).resolves.toMatchObject({ error: { code: "RATE_LIMITED" } });
  });
});
