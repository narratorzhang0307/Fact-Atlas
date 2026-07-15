# Online deployment assets

These files deploy Fact Atlas into a dedicated `/root/fact-atlas` directory and `fact-atlas` PM2 process on loopback port `3013`.

- `deploy.sh` verifies locally, synchronizes the isolated application files, reloads only `fact-atlas`, and checks loopback health.
- `ecosystem.config.cjs` defines the one-process PM2 boundary.
- `nginx-bootstrap.conf` is the temporary HTTP virtual host used before certificate issuance.
- `nginx-fact-atlas.conf` is the final HTTPS virtual host.

The deployment script never copies an environment file. Provision `/root/fact-atlas/.env` separately with mode `0600` before the first run. See [`../../docs/DEPLOYMENT.md`](../../docs/DEPLOYMENT.md) for the full sequence and rollback procedure.
