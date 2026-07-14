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
    await expect(response.json()).resolves.toMatchObject({ ok: true, liveReady: false });
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
});
