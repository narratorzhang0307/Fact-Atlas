import { createReadStream, existsSync, readFileSync, statSync } from "node:fs";
import { lookup } from "node:dns/promises";
import { createServer } from "node:http";
import { isIP } from "node:net";
import { basename, extname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { DEMO_RESULT } from "./server/demo.mjs";
import {
  GonkaError,
} from "./server/gonka.mjs";
import { verifyClaim } from "./server/verify.mjs";
import { geocodePlace } from "./server/geocode.mjs";
import { getDailySignals } from "./server/signals.mjs";
import { getMapboxConfig } from "./server/map-config.mjs";
import { createFixedWindowLimiter } from "./server/rate-limit.mjs";
import { buildRuntimeHealth, normalizeApiError, signalResponseMetadata } from "./server/runtime-contract.mjs";

const ROOT = fileURLToPath(new URL(".", import.meta.url));
const DIST_ROOT = resolve(ROOT, "dist");
const DIST = existsSync(resolve(DIST_ROOT, "client/index.html"))
  ? resolve(DIST_ROOT, "client")
  : DIST_ROOT;
const IS_PRODUCTION = process.env.NODE_ENV === "production";
const inferenceLimiter = createFixedWindowLimiter();

function clientKey(request) {
  const forwarded = request.headers["x-forwarded-for"];
  const firstForwarded = Array.isArray(forwarded) ? forwarded[0] : forwarded?.split(",")[0];
  return firstForwarded?.trim() || request.socket.remoteAddress || "anonymous";
}

async function resolveHost(hostname) {
  const cleanHostname = hostname.replace(/^\[|\]$/g, "");
  if (isIP(cleanHostname)) return [cleanHostname];
  return (await lookup(cleanHostname, { all: true, verbatim: true })).map((entry) => entry.address);
}

function loadEnvFile(path) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const match = line.match(/^([A-Z][A-Z0-9_]*)=(.*)$/);
    if (!match || process.env[match[1]] !== undefined) continue;
    process.env[match[1]] = match[2].trim().replace(/^(['"])(.*)\1$/, "$2");
  }
}

loadEnvFile(resolve(ROOT, ".env"));
loadEnvFile(resolve(ROOT, ".env.local"));

function sendJson(response, status, body, headers = {}) {
  const payload = JSON.stringify(body);
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(payload),
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    ...headers,
  });
  response.end(payload);
}

async function readJson(request, maxBytes = 7_500_000) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > maxBytes) throw new GonkaError("Request body is too large.", { status: 413, code: "PAYLOAD_TOO_LARGE" });
    chunks.push(chunk);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new GonkaError("Request body must be valid JSON.", { status: 400, code: "INVALID_JSON" });
  }
}

function contentType(path) {
  return {
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".webp": "image/webp",
    ".json": "application/json; charset=utf-8",
    ".webmanifest": "application/manifest+json; charset=utf-8",
  }[extname(path)] || "application/octet-stream";
}

function serveProduction(request, response) {
  const pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
  let filePath = resolve(DIST, `.${pathname}`);
  if (!filePath.startsWith(DIST)) {
    response.writeHead(403).end();
    return;
  }
  if (!existsSync(filePath) || statSync(filePath).isDirectory()) filePath = resolve(DIST, "index.html");
  const filename = basename(filePath);
  const updateSensitive = filename === "index.html" || filename === "sw.js" || filename === "manifest.webmanifest";
  const headers = {
    "Content-Type": contentType(filePath),
    "Cache-Control": updateSensitive ? "no-cache" : "public, max-age=31536000, immutable",
    "X-Content-Type-Options": "nosniff",
  };
  if (filename === "sw.js") headers["Service-Worker-Allowed"] = "/";
  response.writeHead(200, headers);
  createReadStream(filePath).pipe(response);
}

const vite = IS_PRODUCTION
  ? null
  : await import("vite").then(({ createServer: createViteServer }) =>
      createViteServer({ server: { middlewareMode: true }, appType: "spa" }),
    );

const server = createServer(async (request, response) => {
  const url = new URL(request.url, "http://localhost");
  try {
    if (request.method === "GET" && url.pathname === "/api/health") {
      sendJson(response, 200, buildRuntimeHealth(process.env));
      return;
    }
    if (request.method === "GET" && url.pathname === "/api/demo") {
      sendJson(response, 200, DEMO_RESULT);
      return;
    }
    if (request.method === "GET" && url.pathname === "/api/geocode") {
      sendJson(response, 200, { candidates: await geocodePlace(url.searchParams.get("q")) });
      return;
    }
    if (request.method === "GET" && url.pathname === "/api/map-config") {
      sendJson(response, 200, getMapboxConfig(process.env));
      return;
    }
    if (request.method === "GET" && url.pathname === "/api/signals") {
      const signals = await getDailySignals(
        url.searchParams.get("topic") || "ai",
        url.searchParams.get("date") || "",
        process.env,
        { beforeLive: () => inferenceLimiter.check(clientKey(request)) },
      );
      const metadata = signalResponseMetadata(signals);
      sendJson(response, 200, signals, {
        "Cache-Control": metadata.cacheControl,
        ...metadata.headers,
      });
      return;
    }
    if (request.method === "POST" && url.pathname === "/api/verify") {
      inferenceLimiter.check(clientKey(request));
      const body = await readJson(request);
      sendJson(response, 200, await verifyClaim(body, process.env, { resolveHost }));
      return;
    }
    if (url.pathname.startsWith("/api/")) {
      sendJson(response, 404, { error: { code: "NOT_FOUND", message: "API route not found." } });
      return;
    }
    if (IS_PRODUCTION) {
      serveProduction(request, response);
      return;
    }
    vite.middlewares(request, response, (error) => {
      if (error) sendJson(response, 500, { error: { code: "VITE_ERROR", message: error.message } });
    });
  } catch (error) {
    const normalized = normalizeApiError(error);
    sendJson(response, normalized.status, normalized.body, normalized.headers);
  }
});

const port = Number(process.env.PORT) || 5173;
const host = process.env.HOST || "0.0.0.0";
server.listen(port, host, () => {
  console.log(`FactRelay ${IS_PRODUCTION ? "production" : "development"} server: http://${host}:${port}`);
});
