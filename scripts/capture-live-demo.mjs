import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const DEFAULT_CLAIM = "The Great Wall of China is visible from the Moon with the naked eye.";
const args = process.argv.slice(2);

function valueAfter(flag, fallback) {
  const index = args.indexOf(flag);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
}

const baseUrl = valueAfter("--base-url", "http://localhost:5173").replace(/\/$/, "");
const claim = valueAfter("--claim", DEFAULT_CLAIM);
const output = valueAfter("--output", "");

const response = await fetch(`${baseUrl}/api/verify`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ kind: "text", content: claim }),
});
const result = await response.json();

if (!response.ok) {
  throw new Error(`Verification failed (${response.status}): ${result?.error?.code ?? "UNKNOWN"} ${result?.error?.message ?? ""}`);
}
if (result.mode !== "live" || result.models?.length !== 2) {
  throw new Error("Expected one live result with two model analyses.");
}
if (result.models.some((model) => !model.requestId)) {
  throw new Error("Live result is missing an upstream Gonka Request ID.");
}

if (output) {
  const destination = resolve(output);
  await mkdir(dirname(destination), { recursive: true });
  await writeFile(destination, `${JSON.stringify(result, null, 2)}\n`);
}

console.log(JSON.stringify({
  mode: result.mode,
  verdict: result.verdict,
  truthScore: result.truthScore,
  confidence: result.confidence,
  sources: result.sources.length,
  models: result.models.map((model) => ({
    model: model.model,
    requestIdPresent: Boolean(model.requestId),
    durationMs: model.durationMs,
    usage: model.usage,
  })),
}, null, 2));
