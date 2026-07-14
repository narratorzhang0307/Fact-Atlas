import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

const USER_AGENT = "FactRelay/0.1 (+https://github.com/narratorzhang0307/FactRelay)";

export function decodeEntities(value) {
  return String(value ?? "")
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)));
}

function textFromTag(block, tag) {
  const match = block.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return decodeEntities(match?.[1] ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

export function parseGoogleNewsRss(xml, limit = 6) {
  const items = String(xml).match(/<item>[\s\S]*?<\/item>/gi) ?? [];
  return items.slice(0, limit).map((item, index) => {
    const sourceMatch = item.match(/<source(?:\s+url="([^"]+)")?>([\s\S]*?)<\/source>/i);
    const publisher = decodeEntities(sourceMatch?.[2] ?? "Unknown publisher").replace(/<[^>]+>/g, "").trim();
    const publisherUrl = decodeEntities(sourceMatch?.[1] ?? "");
    return {
      id: `news-${index + 1}`,
      title: textFromTag(item, "title") || "Untitled source",
      url: textFromTag(item, "link"),
      publisher,
      publisherUrl,
      publishedAt: textFromTag(item, "pubDate") || null,
      snippet: textFromTag(item, "description") || textFromTag(item, "title"),
      origin: "Google News RSS",
    };
  }).filter((item) => item.url);
}

export async function searchNewsEvidence(query, { limit = 6, signal } = {}) {
  const cleanQuery = String(query).replace(/\s+/g, " ").trim().slice(0, 320);
  if (!cleanQuery) return [];
  const isChinese = /[\u3400-\u9fff]/.test(cleanQuery);
  const params = isChinese
    ? "hl=zh-CN&gl=CN&ceid=CN:zh-Hans"
    : "hl=en-US&gl=US&ceid=US:en";
  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(cleanQuery)}&${params}`;
  const response = await fetch(url, {
    headers: { "User-Agent": USER_AGENT, Accept: "application/rss+xml, application/xml, text/xml" },
    signal,
  });
  if (!response.ok) throw new Error(`Evidence search returned ${response.status}.`);
  return parseGoogleNewsRss(await response.text(), limit);
}

function isPrivateIp(address) {
  if (address === "::1" || address === "0.0.0.0") return true;
  const normalized = address.toLowerCase();
  if (normalized.startsWith("fc") || normalized.startsWith("fd") || normalized.startsWith("fe80:")) return true;
  if (!isIP(address) || address.includes(":")) return false;
  const [a, b] = address.split(".").map(Number);
  return (
    a === 10 ||
    a === 127 ||
    a === 0 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168)
  );
}

async function assertPublicUrl(rawUrl) {
  let url;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new Error("Enter a valid public URL.");
  }
  if (!new Set(["http:", "https:"]).has(url.protocol)) throw new Error("Only HTTP and HTTPS URLs are supported.");
  if (url.username || url.password) throw new Error("URLs containing credentials are not supported.");
  if (url.hostname === "localhost" || url.hostname.endsWith(".local")) throw new Error("Local URLs are not supported.");
  const addresses = await lookup(url.hostname, { all: true, verbatim: true });
  if (!addresses.length || addresses.some((entry) => isPrivateIp(entry.address))) {
    throw new Error("Private network URLs are not supported.");
  }
  return url;
}

function metaContent(html, key) {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const patterns = [
    new RegExp(`<meta[^>]+(?:property|name)=["']${escaped}["'][^>]+content=["']([^"']+)["'][^>]*>`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${escaped}["'][^>]*>`, "i"),
  ];
  for (const pattern of patterns) {
    const value = html.match(pattern)?.[1];
    if (value) return decodeEntities(value).trim();
  }
  return "";
}

function htmlToText(html) {
  return decodeEntities(
    html
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
      .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
      .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, " ")
      .replace(/<[^>]+>/g, " "),
  ).replace(/\s+/g, " ").trim();
}

export async function fetchUrlEvidence(rawUrl, { signal } = {}) {
  let current = await assertPublicUrl(rawUrl);
  let response;

  for (let redirects = 0; redirects <= 3; redirects += 1) {
    response = await fetch(current, {
      redirect: "manual",
      headers: { "User-Agent": USER_AGENT, Accept: "text/html,application/xhtml+xml" },
      signal,
    });
    if (![301, 302, 303, 307, 308].includes(response.status)) break;
    const location = response.headers.get("location");
    if (!location) throw new Error("The submitted page redirected without a destination.");
    current = await assertPublicUrl(new URL(location, current).toString());
  }

  if (!response?.ok) throw new Error(`The submitted page returned ${response?.status ?? "an error"}.`);
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("text/html") && !contentType.includes("application/xhtml+xml")) {
    throw new Error("The submitted URL is not an HTML page.");
  }
  const declaredSize = Number(response.headers.get("content-length") ?? 0);
  if (declaredSize > 2_000_000) throw new Error("The submitted page is too large to inspect safely.");

  const html = (await response.text()).slice(0, 2_000_000);
  const title =
    metaContent(html, "og:title") ||
    decodeEntities(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "").trim() ||
    current.hostname;
  const description = metaContent(html, "og:description") || metaContent(html, "description");
  const text = htmlToText(html).slice(0, 18_000);

  return {
    id: "submitted-page",
    title: title.slice(0, 300),
    url: current.toString(),
    publisher: current.hostname.replace(/^www\./, ""),
    publisherUrl: `${current.protocol}//${current.host}`,
    publishedAt: metaContent(html, "article:published_time") || null,
    snippet: (description || text.slice(0, 700)).slice(0, 900),
    articleText: text,
    origin: "Submitted URL",
  };
}

export function dedupeSources(sources, limit = 7) {
  const seen = new Set();
  return sources.filter((source) => {
    const key = `${source.publisher}|${source.title}`.toLowerCase();
    if (!source.url || seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, limit);
}
