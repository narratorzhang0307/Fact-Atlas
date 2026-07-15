# Operations guide / 运维指南

## Health model

`GET /api/health` is the primary readiness endpoint. It reports configured model IDs and whether the server has the credentials required for live inference. It never returns credential values.

```bash
curl -fsS http://127.0.0.1:3013/api/health
curl -fsS https://fact-atlas.throughtheglass.art/api/health
```

Both checks matter: the first isolates the Node process, while the second covers DNS, TLS, Nginx, and the application together.

## Routine release

```bash
git pull --ff-only
npm ci
npm run verify
DEPLOY_HOST=root@43.98.248.74 DEPLOY_KEY=/path/to/key ./deploy/online/deploy.sh
```

Then verify the root page, manifest, service worker, health endpoint, preview fixture, and one live inference route.

## Logs

```bash
pm2 status fact-atlas
pm2 logs fact-atlas --lines 150 --nostream
sudo tail -n 150 /var/log/nginx/error.log
sudo journalctl -u nginx --since "30 minutes ago" --no-pager
```

Before sharing logs, remove user-submitted claims, remote page excerpts, request identifiers, IP addresses, and any accidental credential material.

## Expected failure classes

| Symptom | Likely layer | First check |
| --- | --- | --- |
| 502 from Nginx | Node process or loopback port | `curl 127.0.0.1:3013/api/health` |
| Root loads but verification fails | Gonka credential, provider, or evidence retrieval | PM2 log plus structured API error code |
| Atlas has no basemap | Mapbox public token or Mapbox network access | `/api/map-config` and browser console |
| Installed app shows old shell | Service-worker update lifecycle | manifest/SW cache headers and cache version |
| Signals is empty | Date window, RSS availability, or Gonka ranking | `/api/signals?...` response and trace |

## Security-sensitive incidents

If a server-side key may have leaked:

1. rotate it at the provider;
2. replace the value in `/root/fact-atlas/.env`;
3. run `NODE_ENV=production pm2 restart fact-atlas --update-env`;
4. verify health and one live call;
5. inspect Git history and logs before declaring containment.

Never place a replacement key in an issue, commit, screenshot, shell transcript, or browser URL.

## Availability boundary

The PWA shell can open offline, but verification, Signals, geocoding, receipts, and Mapbox configuration require a current network response. This is intentional: availability must not make stale evidence appear current.

## Regression check for a shared host

Before and after a release, record the status, PID, and restart count of existing PM2 processes. After the release, request the established public virtual hosts and confirm their status codes are unchanged. The Fact Atlas release is complete only when its own health checks pass and neighboring services remain stable.
