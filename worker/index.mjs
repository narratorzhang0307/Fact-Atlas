import { DEMO_RESULT } from "../server/demo.mjs";
import {
  GonkaError,
} from "../server/gonka.mjs";
import { verifyClaim } from "../server/verify.mjs";
import { geocodePlace } from "../server/geocode.mjs";
import { getDailySignals } from "../server/signals.mjs";
import { getMapboxConfig } from "../server/map-config.mjs";
import { createFixedWindowLimiter } from "../server/rate-limit.mjs";
import { buildRuntimeHealth, normalizeApiError, signalResponseMetadata } from "../server/runtime-contract.mjs";

const MAX_BODY_BYTES = 7_500_000;
const inferenceLimiter = createFixedWindowLimiter();

function json(body, status = 200, cacheControl = "no-store", extraHeaders = {}) {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": cacheControl, "X-Content-Type-Options": "nosniff", ...extraHeaders },
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
  inferenceLimiter.check(key);
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
        return json(buildRuntimeHealth(env));
      }
      if (request.method === "GET" && url.pathname === "/api/demo") return json(DEMO_RESULT);
      if (request.method === "GET" && url.pathname === "/api/geocode") {
        return json({ candidates: await geocodePlace(url.searchParams.get("q")) });
      }
      if (request.method === "GET" && url.pathname === "/api/map-config") return json(getMapboxConfig(env));
      if (request.method === "GET" && url.pathname === "/api/signals") {
        const topic = url.searchParams.get("topic") || "ai";
        const date = url.searchParams.get("date") || new Date().toISOString().slice(0, 10);
        const signals = await getDailySignals(
          topic,
          date,
          env,
          { beforeLive: () => enforceRateLimit(request) },
        );
        const metadata = signalResponseMetadata(signals);
        return json(
          signals,
          200,
          metadata.cacheControl,
          metadata.headers,
        );
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
      const normalized = normalizeApiError(error);
      return json(normalized.body, normalized.status, "no-store", normalized.headers);
    }
  },
};

export default worker;
