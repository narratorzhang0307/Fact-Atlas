import { createReadStream, existsSync, readFileSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { DEMO_RESULT } from "./server/demo.mjs";
import {
  DEFAULT_GONKA_BASE_URL,
  DEFAULT_KIMI_MODEL,
  DEFAULT_MINIMAX_MODEL,
  GonkaError,
} from "./server/gonka.mjs";
import { verifyClaim } from "./server/verify.mjs";

const ROOT = fileURLToPath(new URL(".", import.meta.url));
const DIST = resolve(ROOT, "dist");
const IS_PRODUCTION = process.env.NODE_ENV === "production";

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

function sendJson(response, status, body) {
  const payload = JSON.stringify(body);
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(payload),
    "Cache-Control": "no-store",
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
  response.writeHead(200, {
    "Content-Type": contentType(filePath),
    "Cache-Control": filePath.endsWith("index.html") ? "no-cache" : "public, max-age=31536000, immutable",
  });
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
      sendJson(response, 200, {
        ok: true,
        liveReady: Boolean(process.env.GONKA_API_KEY),
        provider: "GonkaRouter",
        baseUrl: process.env.GONKA_BASE_URL || DEFAULT_GONKA_BASE_URL,
        models: [
          process.env.KIMI_MODEL || DEFAULT_KIMI_MODEL,
          process.env.MINIMAX_MODEL || DEFAULT_MINIMAX_MODEL,
        ],
      });
      return;
    }
    if (request.method === "GET" && url.pathname === "/api/demo") {
      sendJson(response, 200, DEMO_RESULT);
      return;
    }
    if (request.method === "POST" && url.pathname === "/api/verify") {
      const body = await readJson(request);
      sendJson(response, 200, await verifyClaim(body, process.env));
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
    const status = Number(error?.status) || 500;
    sendJson(response, status, {
      error: {
        code: error?.code || "INTERNAL_ERROR",
        message: status >= 500 && !(error instanceof GonkaError) ? "Unexpected server error." : error.message,
        ...(error?.details ? { details: error.details } : {}),
      },
    });
  }
});

const port = Number(process.env.PORT) || 5173;
server.listen(port, "0.0.0.0", () => {
  console.log(`FactRelay ${IS_PRODUCTION ? "production" : "development"} server: http://localhost:${port}`);
});
