# Contributing

## Development setup

```bash
npm ci
cp .env.example .env.local
npm run dev
```

Never commit `.env.local`. Live Gonka and Mapbox configuration is optional for most UI work; the labeled preview fixture remains available without credentials.

## Change discipline

- Keep retrieval, inference, deterministic scoring, and storage as distinct layers.
- Route every new semantic model call through the Gonka client.
- Preserve disagreement and upstream request IDs instead of flattening traces into prose.
- Do not add automatic Atlas placement or invented geographic relationships.
- Keep `/api/*` network-only in the service worker.
- Add focused tests for scoring, parsing, SSRF boundaries, agent contracts, or cache behavior when those areas change.

## Before a pull request

```bash
npm run verify
npm audit --audit-level=low
git diff --check
```

For responsive UI changes, also inspect the desktop layout and a 390×844 mobile viewport. For PWA changes, run a production server and verify the manifest and service-worker response headers.
