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

function imageFromItem(item) {
  const raw = item.match(/<media:content[^>]+url=["']([^"']+)["'][^>]*>/i)?.[1]
    || item.match(/<media:thumbnail[^>]+url=["']([^"']+)["'][^>]*>/i)?.[1]
    || item.match(/<enclosure[^>]+url=["']([^"']+)["'][^>]+type=["']image\//i)?.[1]
    || item.match(/<img[^>]+src=["']([^"']+)["'][^>]*>/i)?.[1]
    || "";
  const decoded = decodeEntities(raw).trim();
  try {
    const url = new URL(decoded);
    return new Set(["http:", "https:"]).has(url.protocol) ? url.toString() : null;
  } catch {
    return null;
  }
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
      imageUrl: imageFromItem(item),
      origin: "Google News RSS",
    };
  }).filter((item) => item.url);
}

export function parseBingNewsRss(xml, limit = 6) {
  const items = String(xml).match(/<item>[\s\S]*?<\/item>/gi) ?? [];
  return items.slice(0, limit).map((item, index) => {
    const url = textFromTag(item, "link");
    const publisher = textFromTag(item, "News:Source") || (() => {
      try {
        return new URL(url).hostname.replace(/^www\./, "");
      } catch {
        return "Unknown publisher";
      }
    })();
    return {
      id: `bing-news-${index + 1}`,
      title: textFromTag(item, "title") || "Untitled source",
      url,
      publisher,
      publisherUrl: "https://www.bing.com/news",
      publishedAt: textFromTag(item, "pubDate") || null,
      snippet: textFromTag(item, "description") || textFromTag(item, "title"),
      imageUrl: imageFromItem(item),
      origin: "Bing News RSS",
    };
  }).filter((item) => item.url);
}

async function fetchRssSources(url, parser, limit, signal, origin, fetchImpl = fetch) {
  const response = await fetchImpl(url, {
    // Cloudflare Workers reject attempts to set the restricted User-Agent header.
    headers: { Accept: "application/rss+xml, application/xml, text/xml" },
    signal,
  });
  if (!response.ok) throw new Error(`Evidence search returned ${response.status}.`);
  const sources = parser(await response.text(), limit).map((source) => ({ ...source, origin: origin || source.origin }));
  if (!sources.length) throw new Error("Evidence search returned no usable sources.");
  return sources;
}

export async function searchNewsEvidence(query, { limit = 6, signal } = {}) {
  const cleanQuery = String(query).replace(/\s+/g, " ").trim().slice(0, 320);
  if (!cleanQuery) return [];
  const isChinese = /[\u3400-\u9fff]/.test(cleanQuery);
  const params = isChinese
    ? "hl=zh-CN&gl=CN&ceid=CN:zh-Hans"
    : "hl=en-US&gl=US&ceid=US:en";
  const encodedQuery = encodeURIComponent(cleanQuery);
  const googleUrl = `https://news.google.com/rss/search?q=${encodedQuery}&${params}`;
  const bingUrl = `https://www.bing.com/news/search?q=${encodedQuery}&format=rss&mkt=en-US&setlang=en-US`;

  try {
    return await Promise.any([
      fetchRssSources(googleUrl, parseGoogleNewsRss, limit, signal),
      fetchRssSources(bingUrl, parseBingNewsRss, limit, signal),
    ]);
  } catch {
    throw new Error("Public news evidence search is temporarily unavailable.");
  }
}

function nextUtcDate(date) {
  const value = new Date(`${date}T00:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + 1);
  return value.toISOString().slice(0, 10);
}

function datedQuery(query, date) {
  return `${String(query).trim()} after:${date} before:${nextUtcDate(date)}`;
}

export async function searchGlobalNewsEvidence(queries, date, { limit = 12, signal, fetchImpl = fetch } = {}) {
  const englishQuery = datedQuery(queries?.en || queries?.zh || "", date);
  const chineseQuery = datedQuery(queries?.zh || queries?.en || "", date);
  if (!englishQuery.trim() || !chineseQuery.trim()) return [];

  const feeds = [
    {
      url: `https://news.google.com/rss/search?q=${encodeURIComponent(englishQuery)}&hl=en-US&gl=US&ceid=US:en`,
      parser: parseGoogleNewsRss,
      origin: "Google News RSS · US/en",
    },
    {
      url: `https://news.google.com/rss/search?q=${encodeURIComponent(englishQuery)}&hl=en-GB&gl=GB&ceid=GB:en`,
      parser: parseGoogleNewsRss,
      origin: "Google News RSS · GB/en",
    },
    {
      url: `https://news.google.com/rss/search?q=${encodeURIComponent(chineseQuery)}&hl=zh-CN&gl=CN&ceid=CN:zh-Hans`,
      parser: parseGoogleNewsRss,
      origin: "Google News RSS · CN/zh",
    },
    {
      url: `https://www.bing.com/news/search?q=${encodeURIComponent(englishQuery)}&format=rss&mkt=en-US&setlang=en-US`,
      parser: parseBingNewsRss,
      origin: "Bing News RSS · US/en",
    },
  ];

  const perFeedLimit = Math.max(4, Math.ceil(limit / 2));
  const settled = await Promise.allSettled(feeds.map((feed) => (
    fetchRssSources(feed.url, feed.parser, perFeedLimit, signal, feed.origin, fetchImpl)
  )));
  const merged = settled.flatMap((result) => result.status === "fulfilled" ? result.value : []);
  if (!merged.length) throw new Error("Global public news search is temporarily unavailable.");
  return dedupeSources(merged, limit);
}

export function curatedEvidenceUrls(claim) {
  const normalized = String(claim).toLowerCase();
  if (!normalized.includes("great wall") || !/(moon|lunar)/.test(normalized)) return [];
  return [
    "https://www.nasa.gov/image-article/great-wall/",
    "https://www.nasa.gov/space-science-and-astrobiology-at-ames/interesting-fact-of-the-month-current/interesting-fact-of-the-month-2020/",
    "https://www.esa.int/ESA_Multimedia/Images/2021/05/Great_Wall_of_China_from_space",
    "https://www.smithsonianmag.com/history/sticky-rice-mortar-view-space-and-more-fun-facts-about-chinas-great-wall-180962197/",
  ];
}

function isPrivateIp(address) {
  const normalized = String(address).toLowerCase().replace(/^\[|\]$/g, "");
  if (normalized === "::" || normalized === "::1" || normalized === "0.0.0.0") return true;
  if (/^(fc|fd)/.test(normalized) || /^fe[89ab]/.test(normalized)) return true;
  if (normalized.includes(":")) {
    const mappedIpv4 = normalized.match(/(?:^|:)ffff:(\d+\.\d+\.\d+\.\d+)$/)?.[1];
    return mappedIpv4 ? isPrivateIp(mappedIpv4) : false;
  }
  if (!/^\d{1,3}(?:\.\d{1,3}){3}$/.test(normalized)) return false;
  const parts = normalized.split(".").map(Number);
  if (parts.some((part) => part < 0 || part > 255)) return true;
  const [a, b] = parts;
  return (
    a === 10 ||
    a === 127 ||
    a === 0 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168)
  );
}

export async function assertPublicUrl(rawUrl, resolveHost) {
  let url;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new Error("Enter a valid public URL.");
  }
  if (!new Set(["http:", "https:"]).has(url.protocol)) throw new Error("Only HTTP and HTTPS URLs are supported.");
  if (url.username || url.password) throw new Error("URLs containing credentials are not supported.");
  const hostname = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (hostname === "localhost" || hostname.endsWith(".localhost") || hostname.endsWith(".local")) {
    throw new Error("Local URLs are not supported.");
  }
  if (isPrivateIp(hostname)) throw new Error("Private network URLs are not supported.");
  const addresses = resolveHost ? await resolveHost(hostname) : [];
  if (resolveHost && (!addresses.length || addresses.some(isPrivateIp))) {
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

export async function fetchUrlEvidence(rawUrl, { signal, resolveHost } = {}) {
  let current = await assertPublicUrl(rawUrl, resolveHost);
  let response;

  for (let redirects = 0; redirects <= 3; redirects += 1) {
    response = await fetch(current, {
      redirect: "manual",
      headers: { Accept: "text/html,application/xhtml+xml" },
      signal,
    });
    if (![301, 302, 303, 307, 308].includes(response.status)) break;
    const location = response.headers.get("location");
    if (!location) throw new Error("The submitted page redirected without a destination.");
    current = await assertPublicUrl(new URL(location, current).toString(), resolveHost);
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
  const seenTitles = new Set();
  const seenUrls = new Set();
  return sources.filter((source) => {
    const titleKey = String(source.title || "")
      .toLowerCase()
      .replace(/\s+/g, " ")
      .replace(/\s[-–—|]\s[^-–—|]{2,80}$/, "")
      .trim();
    let urlKey = String(source.url || "");
    try {
      const parsed = new URL(urlKey);
      parsed.hash = "";
      ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"].forEach((key) => parsed.searchParams.delete(key));
      urlKey = parsed.toString();
    } catch {
      urlKey = "";
    }
    if (!urlKey || !titleKey || seenTitles.has(titleKey) || seenUrls.has(urlKey)) return false;
    seenTitles.add(titleKey);
    seenUrls.add(urlKey);
    return true;
  }).slice(0, limit);
}
