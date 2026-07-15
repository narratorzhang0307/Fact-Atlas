# Fact Atlas PWA / 手机安装与离线边界

Fact Atlas is delivered as a progressive web app so the same verified-knowledge workflow can run in a desktop browser, a mobile browser, or a standalone home-screen window.

Fact Atlas 是一个可安装的渐进式 Web 应用：桌面浏览器、手机浏览器和主屏幕独立窗口共用同一套事实核验流程。

## Installation / 安装

### iPhone and iPad

1. Open the canonical HTTPS URL in Safari.
2. Tap **Share**.
3. Choose **Add to Home Screen**.
4. Confirm with **Add**.

Safari does not expose the Chromium `beforeinstallprompt` event. The in-product install button therefore opens a short, platform-specific guide instead of pretending that it can invoke the native sheet.

### Android

1. Open the canonical HTTPS URL in Chrome, Edge, or another install-capable browser.
2. Use the browser menu and select **Install app** or **Add to Home screen**.
3. When `beforeinstallprompt` is available, the in-product install button invokes the browser-owned prompt.

## Installability contract

The app ships:

- a valid `manifest.webmanifest` with `display: standalone`;
- 192×192 and 512×512 icons;
- a 512×512 maskable icon;
- a 180×180 Apple touch icon;
- a root-scoped service worker;
- `launch_handler: focus-existing` to avoid duplicate standalone windows;
- a same-origin start URL and canonical HTTPS scope.

The web server returns the manifest as `application/manifest+json`, serves `sw.js` with `Service-Worker-Allowed: /`, and disables intermediary caching for `index.html`, the manifest, and the service worker.

## Cache boundary / 缓存边界

The service worker has two deliberately different policies:

| Request | Strategy | Reason |
| --- | --- | --- |
| App navigation | Network first, cached shell fallback | Open the interface offline without pinning an old release forever |
| Versioned same-origin assets | Cache first with background refresh | Assets are content-addressed by the Vite filename hash |
| `/api/*` | Network only | Evidence, receipts, news, health, geocoding, and map configuration must remain current |
| Cross-origin resources | Browser default | The service worker does not turn third-party responses into trusted offline data |

Offline means **the interface can open**. It never means that a cached verdict should be presented as fresh evidence.

## First-launch resilience

On installation, the worker caches the app shell and parses the built `index.html` for its current Vite asset URLs. This avoids a blank first standalone launch when the device loses connectivity immediately after installation.

## Update lifecycle

1. A page load registers `/sw.js` with `updateViaCache: "none"`.
2. The registration requests an update check.
3. The new worker primes its own versioned cache.
4. Activation removes caches from older Fact Atlas releases.
5. Existing clients are claimed without waiting for another navigation.

## Mobile navigation

Below the desktop breakpoint, the product uses a fixed safe-area-aware three-tab bar:

- **Relay / 探索** — active verification and Evidence Council;
- **Atlas / 星图** — private Mapbox knowledge globe;
- **Signals / 发现** — dated specialist-agent briefings.

All fixed UI uses `env(safe-area-inset-*)` so the install guide and navigation remain reachable around notches and home indicators.

## Verification checklist

```bash
npm run verify
NODE_ENV=production HOST=127.0.0.1 PORT=5173 node server.mjs
curl -I http://127.0.0.1:5173/manifest.webmanifest
curl -I http://127.0.0.1:5173/sw.js
```

Production validation should also confirm:

- HTTPS has a trusted certificate and no mixed content;
- the manifest start URL resolves to the canonical host;
- install UI works at a 390×844 viewport;
- standalone launch retains Relay, Atlas, and Signals navigation;
- disabling the network still opens the shell while live API calls fail visibly.
