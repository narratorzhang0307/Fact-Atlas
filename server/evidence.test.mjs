import { describe, expect, it, vi } from "vitest";
import {
  assertPublicUrl,
  curatedEvidenceUrls,
  dedupeSources,
  fetchUrlEvidence,
  parseBingNewsRss,
  parseGoogleNewsRss,
  searchGlobalNewsEvidence,
  searchNewsEvidence,
} from "./evidence.mjs";

describe("evidence parsing", () => {
  it("parses Google News RSS into bounded sources", () => {
    const xml = `<rss xmlns:media="http://search.yahoo.com/mrss/"><channel><item><title><![CDATA[Claim checked - Publisher]]></title><link>https://news.google.com/a</link><pubDate>Tue, 14 Jul 2026 10:00:00 GMT</pubDate><description>Evidence summary</description><media:thumbnail url="https://images.example/news.jpg"/><source url="https://publisher.example">Publisher</source></item></channel></rss>`;
    const sources = parseGoogleNewsRss(xml);
    expect(sources).toHaveLength(1);
    expect(sources[0]).toMatchObject({ publisher: "Publisher", title: "Claim checked - Publisher", imageUrl: "https://images.example/news.jpg" });
  });

  it("parses Bing News RSS and preserves its named publisher", () => {
    const xml = `<rss xmlns:News="https://www.bing.com/news"><channel><item><title>Claim checked</title><link>https://www.bing.com/news/click</link><pubDate>Tue, 14 Jul 2026 10:00:00 GMT</pubDate><description><![CDATA[<img src="https://images.example/bing.jpg">Evidence summary]]></description><News:Source>Example News</News:Source></item></channel></rss>`;
    expect(parseBingNewsRss(xml)).toMatchObject([{
      publisher: "Example News",
      origin: "Bing News RSS",
      title: "Claim checked",
      imageUrl: "https://images.example/bing.jpg",
    }]);
  });

  it("deduplicates repeated publisher/title pairs", () => {
    const source = { title: "Same", publisher: "Publisher", url: "https://example.com/a" };
    expect(dedupeSources([source, { ...source, url: "https://example.com/b" }])).toHaveLength(1);
  });

  it("uses authoritative live seeds only for the reproducible Great Wall starter", () => {
    expect(curatedEvidenceUrls("The Great Wall is visible from the Moon.")).toHaveLength(4);
    expect(curatedEvidenceUrls("Octopuses have three hearts.")).toEqual([]);
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

  it("merges dated multi-region feeds into one deduplicated public packet", async () => {
    const xml = `<rss><channel><item><title>Global signal</title><link>https://news.example/a</link><pubDate>Wed, 15 Jul 2026 08:00:00 GMT</pubDate><description>Evidence</description><source url="https://publisher.example">Publisher</source></item></channel></rss>`;
    const requested = [];
    const sources = await searchGlobalNewsEvidence(
      { en: "artificial intelligence", zh: "人工智能" },
      "2026-07-15",
      {
        fetchImpl: async (url) => {
          requested.push(String(url));
          return new Response(xml, { status: 200, headers: { "Content-Type": "application/xml" } });
        },
      },
    );
    expect(requested).toHaveLength(4);
    expect(requested.every((url) => url.includes("after%3A2026-07-15") && url.includes("before%3A2026-07-16"))).toBe(true);
    expect(sources).toHaveLength(1);
    expect(sources[0].origin).toContain("US/en");
  });
});
