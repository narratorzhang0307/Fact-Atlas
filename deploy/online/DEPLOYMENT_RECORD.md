# Production deployment record

Initial deployment: 2026-07-15 (Asia/Shanghai)

Latest verified release: 2026-07-16 (Asia/Shanghai), Git `dda0321`

## Public endpoints

- Canonical product: <https://fact-atlas.throughtheglass.art>
- Public Sites mirror, version 21: <https://factrelay-ai3-2026.yediqizhang37.chatgpt.site>
- Compatibility redirect: `http://fact_atlas.throughtheglass.art` → canonical HTTPS host
- Health: <https://fact-atlas.throughtheglass.art/api/health>
- Signals OSS object: <https://last-night-on-earth.oss-cn-hangzhou.aliyuncs.com/fact-atlas/signals/2026-07-15.json>

The canonical A record resolves to `43.98.248.74`. The Let's Encrypt certificate covers only the DNS-valid hyphenated hostname and expires on 2026-10-13; Certbot renewal is scheduled on the host.

## Isolation

| Resource | Value |
| --- | --- |
| Directory | `/root/fact-atlas` |
| Process | `fact-atlas` |
| Listener | `127.0.0.1:3013` |
| Nginx file | `/etc/nginx/conf.d/fact-atlas.conf` |
| Environment | `/root/fact-atlas/.env`, mode `0600` |

The initial deployment added one isolated PM2 process. The latest release reloaded only `fact-atlas`; all 12 pre-existing PM2 processes retained their original PID, restart count, and online status before and after the release.

## Production checks

- HTTPS root: HTTP/2 `200`
- Manifest: `application/manifest+json`, `display: standalone`
- Service worker: `no-cache`, root scope allowed
- Mapbox runtime configuration: enabled with a browser-safe public token
- Gonka health: live-ready with Kimi-K2.6 and MiniMax-M2.7
- Signals health: `signalCacheReady: true` on the canonical host and Sites mirror
- Signals object: `2026-07-15`, eight topics, 37 bilingual cards, public read-back digest matched the generated object
- Signals API: both runtimes returned `cacheLayer: "oss"`, the original Gonka request ID, and a completed trace
- Mobile viewport: 390×844 with safe-area install sheet and three-tab navigation
- Atlas: Mapbox dark globe loaded
- Signals: topic selector, edition date, and bounded agent pipeline loaded
- Existing public virtual hosts: 14 checked, all returned HTTP `200`

## Live verification smoke result

The public API completed the built-in Great Wall/Moon claim as a real Gonka run:

| Field | Result |
| --- | --- |
| Mode | `live` |
| Verdict | `refuted` |
| Truth Score | `18` |
| Decision confidence | `89` |
| Retrieved sources | `5` |
| Model request IDs | present for both roles |
| Trace steps | three `complete` steps |

No credential values are stored in this record.

## OSS release evidence

| Field | Result |
| --- | --- |
| Object size | `86,537` bytes |
| Content type | `application/json` |
| SHA-256 | `1771e683e603487f1b039df62a2422cc97d7a8984d1f7d92c8cee08993379434` |
| Server lookup order | OSS → embedded snapshot → process memory → live scan |
| Browser buffer | up to three dates × eight topics, 72-hour expiry |
| Private Atlas data in OSS | none |

Sites version 21 was published from Git commit `dda0321552cec68415d5c5cb3d207cc6ba49db61` with environment revision 3. The canonical Node deployment and the Sites worker both passed health, PWA manifest, service-worker, and OSS-hit checks.
