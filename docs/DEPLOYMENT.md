# Isolated deployment / 隔离式部署

The reference deployment runs Fact Atlas as an independent Node process behind Nginx. It does not share a working directory, process name, environment file, loopback port, or Nginx configuration file with another application.

## Resource boundary

| Resource | Fact Atlas value |
| --- | --- |
| Canonical host | `fact-atlas.throughtheglass.art` |
| Application directory | `/root/fact-atlas` |
| PM2 process | `fact-atlas` |
| Loopback listener | `127.0.0.1:3013` |
| Environment file | `/root/fact-atlas/.env` with mode `0600` |
| Nginx file | `/etc/nginx/conf.d/fact-atlas.conf` |
| Certificate directory | `/etc/letsencrypt/live/fact-atlas.throughtheglass.art/` |

The underscore form `fact_atlas.throughtheglass.art` may be retained only as a plain-HTTP compatibility redirect. TLS certificates and PWA canonical URLs use the DNS-valid hyphenated label.

## DNS and TLS

Create one A record:

```text
fact-atlas.throughtheglass.art  A  43.98.248.74
```

After public DNS resolves, install the repository Nginx configuration and request a certificate:

```bash
sudo nginx -t
sudo systemctl reload nginx
sudo certbot --nginx -d fact-atlas.throughtheglass.art --redirect
```

Run `nginx -t` before every reload. A reload is used instead of a restart so unrelated virtual hosts continue serving traffic.

## Secrets

Create `/root/fact-atlas/.env` directly on the host and restrict it to the owner:

```dotenv
GONKA_API_KEY=replace-me
MAPBOX_PUBLIC_TOKEN=pk.replace-me
HOST=127.0.0.1
PORT=3013
```

```bash
chmod 600 /root/fact-atlas/.env
```

Never copy `.env` into a release archive, Git commit, Nginx file, browser bundle, or health response. `MAPBOX_PUBLIC_TOKEN` is designed for browser use; the Gonka key is not.

## Application deployment

From a trusted workstation:

```bash
DEPLOY_HOST=root@43.98.248.74 \
DEPLOY_KEY=/absolute/path/to/server.pem \
./deploy/online/deploy.sh
```

The script:

1. runs the full local verification suite;
2. creates only `/root/fact-atlas`;
3. synchronizes `dist/`, `server/`, `server.mjs`, and the PM2 definition;
4. starts or reloads only the `fact-atlas` process;
5. checks `127.0.0.1:3013/api/health`.

It does not use a wildcard `pm2 restart all`, does not delete the remote application root, and does not edit Nginx.

## Nginx

[`deploy/online/nginx-fact-atlas.conf`](../deploy/online/nginx-fact-atlas.conf) proxies only the canonical virtual host to `127.0.0.1:3013`. The application server owns asset cache headers; Nginx adds transport and browser hardening headers.

## Rollback

Deploy the desired Git revision with the same script. PM2 reloads the one process after file synchronization. If a release fails its loopback health check:

1. inspect `pm2 logs fact-atlas --lines 150`;
2. redeploy the last known-good revision;
3. rerun the loopback check;
4. run `nginx -t` only if proxy configuration changed.

Do not solve an application failure by restarting unrelated PM2 processes or by rewriting shared Nginx files.
