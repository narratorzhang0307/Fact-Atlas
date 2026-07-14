import { describe, expect, it } from "vitest";
import { dedupeSources, parseGoogleNewsRss } from "./evidence.mjs";

describe("evidence parsing", () => {
  it("parses Google News RSS into bounded sources", () => {
    const xml = `<rss><channel><item><title><![CDATA[Claim checked - Publisher]]></title><link>https://news.google.com/a</link><pubDate>Tue, 14 Jul 2026 10:00:00 GMT</pubDate><description>Evidence summary</description><source url="https://publisher.example">Publisher</source></item></channel></rss>`;
    const sources = parseGoogleNewsRss(xml);
    expect(sources).toHaveLength(1);
    expect(sources[0]).toMatchObject({ publisher: "Publisher", title: "Claim checked - Publisher" });
  });

  it("deduplicates repeated publisher/title pairs", () => {
    const source = { title: "Same", publisher: "Publisher", url: "https://example.com/a" };
    expect(dedupeSources([source, { ...source, url: "https://example.com/b" }])).toHaveLength(1);
  });
});
