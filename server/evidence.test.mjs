import { describe, expect, it, vi } from "vitest";
import {
  assertPublicUrl,
  dedupeSources,
  fetchUrlEvidence,
  parseBingNewsRss,
  parseGoogleNewsRss,
  searchNewsEvidence,
} from "./evidence.mjs";

describe("evidence parsing", () => {
  it("parses Google News RSS into bounded sources", () => {
    const xml = `<rss><channel><item><title><![CDATA[Claim checked - Publisher]]></title><link>https://news.google.com/a</link><pubDate>Tue, 14 Jul 2026 10:00:00 GMT</pubDate><description>Evidence summary</description><source url="https://publisher.example">Publisher</source></item></channel></rss>`;
    const sources = parseGoogleNewsRss(xml);
    expect(sources).toHaveLength(1);
    expect(sources[0]).toMatchObject({ publisher: "Publisher", title: "Claim checked - Publisher" });
  });

  it("parses Bing News RSS and preserves its named publisher", () => {
    const xml = `<rss xmlns:News="https://www.bing.com/news"><channel><item><title>Claim checked</title><link>https://www.bing.com/news/click</link><pubDate>Tue, 14 Jul 2026 10:00:00 GMT</pubDate><description>Evidence summary</description><News:Source>Example News</News:Source></item></channel></rss>`;
    expect(parseBingNewsRss(xml)).toMatchObject([{
      publisher: "Example News",
      origin: "Bing News RSS",
      title: "Claim checked",
    }]);
  });

  it("deduplicates repeated publisher/title pairs", () => {
    const source = { title: "Same", publisher: "Publisher", url: "https://example.com/a" };
    expect(dedupeSources([source, { ...source, url: "https://example.com/b" }])).toHaveLength(1);
  });

  it("rejects literal and DNS-resolved private network URLs", async () => {
    await expect(assertPublicUrl("http://127.0.0.1/private")).rejects.toThrow("Private network");
    await expect(assertPublicUrl("http://[::1]/private")).rejects.toThrow("Private network");
    await expect(assertPublicUrl("https://example.test", async () => ["192.168.1.8"]))
      .rejects.toThrow("Private network");
  });

  it("keeps outbound evidence fetches compatible with Workers", async () => {
    const xml = `<rss><channel><item><title>Checked claim</title><link>https://news.google.com/a</link><description>Evidence</description><source url="https://publisher.example">Publisher</source></item></channel></rss>`;
    const fetchMock = vi.spyOn(globalThis, "fetch")
      .mockImplementationOnce(async (_url, options) => {
        expect(new Headers(options.headers).has("User-Agent")).toBe(false);
        return new Response(xml, { status: 200, headers: { "Content-Type": "application/xml" } });
      })
      .mockImplementationOnce(async (_url, options) => {
        expect(new Headers(options.headers).has("User-Agent")).toBe(false);
        return new Response("Unavailable", { status: 503 });
      })
      .mockImplementationOnce(async (_url, options) => {
        expect(new Headers(options.headers).has("User-Agent")).toBe(false);
        return new Response("<html><head><title>Public source</title></head><body>Evidence body</body></html>", {
          status: 200,
          headers: { "Content-Type": "text/html" },
        });
      });

    try {
      await expect(searchNewsEvidence("A sufficiently long claim")).resolves.toHaveLength(1);
      await expect(fetchUrlEvidence("https://example.com/source")).resolves.toMatchObject({ title: "Public source" });
    } finally {
      fetchMock.mockRestore();
    }
  });
});
