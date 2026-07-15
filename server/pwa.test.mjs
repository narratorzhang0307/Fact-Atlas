import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

const root = new URL("../", import.meta.url);

describe("installable PWA shell", () => {
  it("declares standalone mobile icons and a product shortcut", async () => {
    const manifest = JSON.parse(await readFile(new URL("public/manifest.webmanifest", root), "utf8"));
    expect(manifest.display).toBe("standalone");
    expect(manifest.start_url).toBe("/?source=pwa");
    expect(manifest.prefer_related_applications).toBe(false);
    expect(manifest.launch_handler.client_mode).toBe("focus-existing");
    expect(manifest.icons).toEqual(expect.arrayContaining([
      expect.objectContaining({ sizes: "192x192", purpose: "any" }),
      expect.objectContaining({ sizes: "512x512", purpose: "maskable" }),
    ]));
    expect(manifest.shortcuts[0].url).toBe("/#top");
  });

  it("keeps every verification and signal API request network-only", async () => {
    const worker = await readFile(new URL("public/sw.js", root), "utf8");
    expect(worker).toContain('const CACHE_VERSION = "fact-atlas-v2"');
    expect(worker).toContain("assetUrls");
    expect(worker).toContain("cache.addAll([...new Set(assetUrls)])");
    expect(worker).toContain('url.pathname.startsWith("/api/")');
    expect(worker).toContain("event.respondWith(fetch(request))");
    expect(worker).not.toMatch(/cache\.put\([^\n]*\/api\//);
  });

  it("serves the Vite client build with update-safe PWA headers", async () => {
    const server = await readFile(new URL("server.mjs", root), "utf8");
    expect(server).toContain('resolve(DIST_ROOT, "client/index.html")');
    expect(server).toContain('".webmanifest": "application/manifest+json; charset=utf-8"');
    expect(server).toContain('filename === "sw.js"');
    expect(server).toContain('headers["Service-Worker-Allowed"] = "/"');
  });
});
