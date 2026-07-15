import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { SIGNAL_SNAPSHOT_DATES, getSignalSnapshot } from "../server/signal-snapshot.mjs";

const TOPICS = ["ai", "technology", "finance", "climate", "science", "health", "culture", "policy"];
const [mode, target] = process.argv.slice(2);

if (mode !== "--all" || !target) {
  throw new Error("Usage: node scripts/build-signal-oss-bundles.mjs --all OUTPUT_DIR");
}

const outputDirectory = resolve(target);
mkdirSync(outputDirectory, { recursive: true });

for (const date of SIGNAL_SNAPSHOT_DATES) {
  const editions = Object.fromEntries(TOPICS.map((topic) => {
    const edition = getSignalSnapshot(topic, date);
    if (!edition) throw new Error(`Missing validated snapshot for ${date}:${topic}`);
    return [topic, edition];
  }));
  const bundle = {
    version: 1,
    date,
    generatedAt: new Date().toISOString(),
    editions,
  };
  writeFileSync(resolve(outputDirectory, `${date}.json`), `${JSON.stringify(bundle, null, 2)}\n`);
}

console.log(`Wrote ${SIGNAL_SNAPSHOT_DATES.length} validated OSS date bundles to ${outputDirectory}`);
