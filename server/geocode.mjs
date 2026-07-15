import { GonkaError } from "./gonka.mjs";

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
const USER_AGENT = "FactRelay/0.1 (+https://github.com/narratorzhang0307/FactRelay)";

export async function geocodePlace(rawQuery, { request = fetch, signal } = {}) {
  const query = String(rawQuery || "").trim();
  if (query.length < 2 || query.length > 160) {
    throw new GonkaError("Place query must contain 2–160 characters.", { status: 400, code: "INVALID_PLACE_QUERY" });
  }

  const url = new URL(NOMINATIM_URL);
  url.searchParams.set("q", query);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("limit", "5");

  let response;
  try {
    response = await request(url, {
      headers: {
        Accept: "application/json",
        "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.7",
        "User-Agent": USER_AGENT,
      },
      signal,
    });
  } catch (error) {
    throw new GonkaError("Place lookup is temporarily unavailable.", {
      status: 502,
      code: "GEOCODER_UNAVAILABLE",
      details: error instanceof Error ? error.message : String(error),
    });
  }
  if (!response.ok) {
    throw new GonkaError("Place lookup is temporarily unavailable.", { status: 502, code: "GEOCODER_UNAVAILABLE" });
  }

  const payload = await response.json();
  if (!Array.isArray(payload)) return [];
  return payload.flatMap((item) => {
    const lat = Number(item?.lat);
    const lng = Number(item?.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) return [];
    const type = String(item?.type || item?.addresstype || "");
    const precision = ["house", "building", "attraction", "museum", "monument"].includes(type)
      ? "exact"
      : ["country", "state"].includes(type) ? "country" : "regional";
    return [{
      id: String(item?.place_id || `${lat},${lng}`),
      label: String(item?.display_name || query).slice(0, 240),
      lat,
      lng,
      precision,
      source: "OpenStreetMap Nominatim",
    }];
  });
}
