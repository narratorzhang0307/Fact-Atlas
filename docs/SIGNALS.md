# Signals dated editions

Signals is a date-bounded discovery layer, not a truth oracle. A topic Agent scans public news sources, deterministic Skills constrain the date window and remove duplicates, and GonkaRouter ranks up to five consequential candidates. Each candidate is still an unverified claim until the user sends it through FactRelay.

## Why dated snapshots exist

A cold news scan may spend tens of seconds on upstream retrieval and inference. Repeating that work for every topic switch creates avoidable latency and can produce slightly different editions for the same date. A validated snapshot makes a completed daily edition reproducible:

1. generate all eight topic editions through the normal live path;
2. retain the original sources, bilingual claim text, Gonka request ID, model, and trace;
3. reject incomplete or malformed editions;
4. compute a SHA-256 content hash for every topic file;
5. compile the eight editions into an immutable runtime module.

The server lookup order is:

```text
Aliyun OSS date bundle -> embedded snapshot -> process memory -> live public scan + Gonka ranking
```

An OSS hit returns `cacheHit: true` and `cacheLayer: "oss"`; an embedded snapshot returns `cacheLayer: "snapshot"`. A process-memory hit returns `cacheLayer: "memory"`; a newly generated edition returns `cacheLayer: "runtime"`.

The browser has a separate rolling buffer:

```text
session memory -> 72-hour device buffer -> Signals API
```

It stores at most 24 editions, matching three dates across eight topics. Every record retains the original edition date, sources, ranking receipt, and model trace. A record expires after 72 hours, malformed records are ignored, and storage failures fall back to the network without claiming a cache hit. This buffer contains public Signals editions only; private Atlas evidence remains under the separate Atlas storage model.

## Aliyun OSS rolling cache

OSS stores one public, read-only JSON object per UTC date at `${SIGNAL_CACHE_BASE_URL}/YYYY-MM-DD.json`. Each object contains all eight topic editions. The service attempts this layer only for today and the previous two UTC dates, holds a validated object in process memory for ten minutes, and falls through on a missing object, timeout, oversize payload, invalid JSON, or contract failure.

Before returning even one topic, the loader requires all eight editions to retain matching dates and topics, one to five bilingual cards, public source URLs, a non-empty Gonka Request ID, and a completed `GonkaRouter` trace step. OSS contains no credentials and no private Atlas records. It improves availability; it does not certify the truth of a card.

## Snapshot contract

Every topic file must satisfy all of these checks before it can be compiled:

- `mode` is `live`;
- topic and selected UTC date match the requested edition;
- one to five signal cards are present;
- a Gonka request ID is present;
- the trace contains a completed `GonkaRouter` step;
- every card has English and Chinese headline, claim, and significance text;
- every card retains a public source URL.

The compiler adds snapshot metadata with the date, original generation time, signal count, and source-file hash. The API returns a fresh structured clone so one request cannot mutate later responses.

## Build or refresh a date

Collect the eight live JSON responses in one directory, named `ai.json`, `technology.json`, `finance.json`, `climate.json`, `science.json`, `health.json`, `culture.json`, and `policy.json`. Then run:

```bash
npm run signals:snapshot -- YYYY-MM-DD INPUT_DIR server/signal-snapshot.mjs
```

The command fails closed if any receipt, trace, bilingual field, source URL, topic, or date is missing. Run `npm run verify` after rebuilding the module.

To validate and compile every `YYYY-MM-DD` directory under one root, including a three-day preload set, run:

```bash
npm run signals:snapshot -- --root INPUT_ROOT server/signal-snapshot.mjs
```

The root mode discovers date directories, validates all eight topic files inside each date, sorts dates deterministically, and emits one immutable lookup module. Three days therefore require 24 independently validated editions; a partially captured day fails the entire build.

After compiling the validated runtime module, generate one uploadable OSS object per date:

```bash
npm run signals:oss -- --all OUTPUT_DIR
```

Upload the resulting `YYYY-MM-DD.json` files under the configured OSS root with `Content-Type: application/json` and an immutable cache policy. Do not upload raw partial days. The production service needs only the public `SIGNAL_CACHE_BASE_URL`; OSS write credentials never enter this repository or the runtime.

## Client behavior

After the first snapshot response, the Signals UI quietly fetches the seven sibling topics for the same date into an in-browser memory map and the 72-hour device buffer. Subsequent topic changes and app reopenings can therefore restore recent cards without hiding the current deck. A manual refresh bypasses the client buffer and keeps the visible cards on screen while the request is in flight.

The UI labels OSS hits `ALIYUN OSS · 云端三日缓存`, embedded snapshots `PRELOADED · 已预载`, and persistent client hits `3-DAY DEVICE BUFFER · 三日设备缓冲`. All three still display the original Gonka receipt, source dates, and edition date. Importance remains a news-priority score and is never presented as a Truth Score.

## Current bundled edition

The repository currently bundles the UTC edition for `2026-07-15`: eight topic Agents and 37 bilingual cards. The compiler and OSS exporter are ready for a rolling three-date preload, but a date is published only after all eight live editions pass the receipt and trace contract. OSS, snapshot, and device-buffer data contain no API keys or private user information.

## Current production object

The complete `2026-07-15` bundle is publicly readable at:

```text
https://last-night-on-earth.oss-cn-hangzhou.aliyuncs.com/fact-atlas/signals/2026-07-15.json
```

Its verified SHA-256 is `1771e683e603487f1b039df62a2422cc97d7a8984d1f7d92c8cee08993379434`. A public read-back returned `application/json`, 86,537 bytes, and the same digest as the generated local object. Both production runtimes subsequently returned `cacheLayer: "oss"`, `cacheHit: true`, a non-empty Gonka request ID, and a completed GonkaRouter trace. Only this complete date is currently published; the rolling window does not invent or duplicate missing days.
