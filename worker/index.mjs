import { DEMO_RESULT } from "../server/demo.mjs";
import {
  DEFAULT_GONKA_BASE_URL,
  DEFAULT_KIMI_MODEL,
  DEFAULT_MINIMAX_MODEL,
  GonkaError,
} from "../server/gonka.mjs";
import { verifyClaim } from "../server/verify.mjs";
import { geocodePlace } from "../server/geocode.mjs";
import { getDailySignals } from "../server/signals.mjs";
import { hasSignalSnapshot } from "../server/signal-snapshot.mjs";
import { getMapboxConfig } from "../server/map-config.mjs";

const MAX_BODY_BYTES = 7_500_000;
const WINDOW_MS = 10 * 60 * 1000;
const MAX_RUNS_PER_WINDOW = 6;
const requestWindows = new Map();

function json(body, status = 200, cacheControl = "no-store") {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": cacheControl },
  });
}

async function readJson(request) {
  const declaredSize = Number(request.headers.get("content-length") ?? 0);
  if (declaredSize > MAX_BODY_BYTES) {
    throw new GonkaError("Request body is too large.", { status: 413, code: "PAYLOAD_TOO_LARGE" });
  }
  const text = await request.text();
  if (new TextEncoder().encode(text).byteLength > MAX_BODY_BYTES) {
    throw new GonkaError("Request body is too large.", { status: 413, code: "PAYLOAD_TOO_LARGE" });
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new GonkaError("Request body must be valid JSON.", { status: 400, code: "INVALID_JSON" });
  }
}

function enforceRateLimit(request) {
  const key = request.headers.get("cf-connecting-ip") || "anonymous";
  const now = Date.now();
  const current = requestWindows.get(key);
  if (!current || now - current.startedAt >= WINDOW_MS) {
    requestWindows.set(key, { startedAt: now, count: 1 });
    return;
  }
  if (current.count >= MAX_RUNS_PER_WINDOW) {
    throw new GonkaError("Too many verification runs. Please try again later.", {
      status: 429,
      code: "RATE_LIMITED",
    });
  }
  current.count += 1;
}

async function serveApp(request, env) {
  let response = await env.ASSETS.fetch(request);
  if (response.status === 404) {
    response = await env.ASSETS.fetch(new Request(new URL("/index.html", request.url), request));
  }
  if (!(response.headers.get("content-type") ?? "").includes("text/html")) return response;

  const origin = new URL(request.url).origin;
  const headers = new Headers(response.headers);
  headers.set("Cache-Control", "no-cache");
  return new Response((await response.text()).replaceAll("https://factrelay.invalid", origin), {
    status: response.status,
    headers,
  });
}

const worker = {
  async fetch(request, env) {
    const url = new URL(request.url);
    try {
      if (request.method === "GET" && url.pathname === "/api/health") {
        return json({
          ok: true,
          liveReady: Boolean(env.GONKA_API_KEY),
          signalCacheReady: Boolean(env.SIGNAL_CACHE_BASE_URL),
          provider: "GonkaRouter",
          baseUrl: env.GONKA_BASE_URL || DEFAULT_GONKA_BASE_URL,
          models: [env.KIMI_MODEL || DEFAULT_KIMI_MODEL, env.MINIMAX_MODEL || DEFAULT_MINIMAX_MODEL],
        });
      }
      if (request.method === "GET" && url.pathname === "/api/demo") return json(DEMO_RESULT);
      if (request.method === "GET" && url.pathname === "/api/geocode") {
        return json({ candidates: await geocodePlace(url.searchParams.get("q")) });
      }
      if (request.method === "GET" && url.pathname === "/api/map-config") return json(getMapboxConfig(env));
      if (request.method === "GET" && url.pathname === "/api/signals") {
        const topic = url.searchParams.get("topic") || "ai";
        const date = url.searchParams.get("date") || new Date().toISOString().slice(0, 10);
        if (!hasSignalSnapshot(topic, date)) enforceRateLimit(request);
        const signals = await getDailySignals(
          topic,
          date,
          env,
        );
        return json(signals, 200, signals.cacheLayer === "snapshot" || signals.cacheLayer === "oss" ? "public, max-age=86400, immutable" : "no-store");
      }
      if (request.method === "POST" && url.pathname === "/api/verify") {
        enforceRateLimit(request);
        return json(await verifyClaim(await readJson(request), env));
      }
      if (url.pathname.startsWith("/api/")) {
        return json({ error: { code: "NOT_FOUND", message: "API route not found." } }, 404);
      }
      return serveApp(request, env);
    } catch (error) {
      const status = Number(error?.status) || 500;
      return json({
        error: {
          code: error?.code || "INTERNAL_ERROR",
          message: status >= 500 && !(error instanceof GonkaError) ? "Unexpected server error." : error.message,
          ...(error?.details ? { details: error.details } : {}),
        },
      }, status);
    }
  },
};

export default worker;
