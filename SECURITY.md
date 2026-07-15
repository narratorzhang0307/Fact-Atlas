# Security policy

## Supported version

Security fixes are applied to the current `main` branch and the production deployment built from it.

## Reporting a vulnerability

Please open a private GitHub security advisory for this repository. Do not include active API keys, private user data, full request logs, or exploit traffic against the public service. A useful report includes the affected route, expected boundary, observed behavior, and a minimal non-destructive reproduction.

## Security model

- Gonka credentials are read only by the server and are never returned by configuration or health endpoints.
- Submitted URLs are limited to public HTTP(S) destinations; local, private, link-local, and redirect destinations are revalidated.
- Remote content and model drafts are treated as untrusted prompt data.
- Images are restricted by media type and size.
- Model source indexes are validated before scoring.
- Atlas history is browser-local and is not uploaded by the application server.
- Atlas nodes and Signals device-buffer entries are schema-checked again when read from browser storage; malformed timestamps, score ranges, record IDs, coordinates, and non-HTTP(S) source links are rejected.
- The OSS cache contains only validated public Signals editions. It never stores user claims, Atlas history, API keys, or OSS write credentials.
- OSS roots require HTTPS outside loopback development, redirects are rejected, payload size is bounded, and concurrent reads of one date are coalesced.
- Public verification and live Signals inference share a six-runs-per-ten-minutes client limit in both production runtimes. The limiter retains at most 10,000 client keys and returns `Retry-After` on rejection.
- The service worker never caches `/api/*` responses.
- Production listens on a loopback port and is exposed only through the dedicated Nginx virtual host.

An inference receipt identifies the Gonka request that produced an analysis. It is provenance evidence, not a cryptographic proof that the underlying claim is true.
