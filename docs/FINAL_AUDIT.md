# Fact Atlas final submission audit / 最终提交审计

Audit date / 审计日期：**2026-07-15**  
Target / 目标：AI³ Growth Hackathon 2026 · Track 3 — Gonka: AI for Society

## Product / 产品

- [x] Mobile and desktop expose Relay, Atlas, and Signals as one coherent product.
- [x] Relay contains both direct Verification and the four-role Evidence Council.
- [x] Eight Signals topic agents rank current public news through Gonka; importance is never labeled truth.
- [x] Text, public URL, and PNG/JPEG/WebP input paths are present.
- [x] All semantic inference routes through GonkaRouter.
- [x] Kimi-K2.6 and MiniMax-M2.7 have distinct investigator/skeptic roles.
- [x] Truth Score is deterministic code: 55% model consensus + 45% source-weighted evidence.
- [x] Evidence source indexes are validated before scoring.
- [x] Gonka upstream request IDs are preserved unchanged.
- [x] Preview mode labels itself and keeps request IDs null.
- [x] One structured retry handles intermittent malformed JSON without hiding the failed call.
- [x] Mapbox dark globe, bright verdict nodes, and browser-local storage are integrated.
- [x] Coordinates require explicit user confirmation; unverifiable locations remain unplaced.

## Security and reliability / 安全与可靠性

- [x] URL scheme, embedded credentials, DNS results, redirects, private ranges, localhost, link-local, and `.local` are guarded.
- [x] Remote pages, evidence excerpts, and previous model drafts are labeled untrusted in prompts.
- [x] API key remains server-side, ignored by Git, and absent from `/api/health`.
- [x] Images are type-allowlisted and size-bounded.
- [x] `npm run verify`: TypeScript clean, 40/40 tests across 10 files pass, production client and Worker build pass.
- [x] `npm audit --audit-level=low`: zero known vulnerabilities.

## Production / 生产部署

- [x] Public demo returns HTTP 200 and `/api/health` reports `liveReady: true`.
- [x] Public smoke run: live mode, Refuted, Truth Score 18, confidence 93%, 5 sources.
- [x] Both model cards contain non-null Gonka Request IDs.
- [x] Public Signals run returned five current AI candidates with a real Gonka scout receipt.
- [x] Public Mapbox configuration is enabled with the dark-v11 style; the public token is delivered only through the server route.
- [x] Public page browser console contains no errors or warnings.
- [x] Desktop layout, card arrows, keyboard navigation, mobile three-tab navigation, and touch-friendly Mapbox controls are present.
- [x] Mobile Atlas has no horizontal overflow and the Mapbox canvas fills its 390px stage.

## Video / 视频

- [x] Duration: exactly 150.000 seconds.
- [x] Format: 1920×1080, 30fps, H.264 video, AAC 48kHz stereo audio.
- [x] Chinese narration and burned-in English subtitles.
- [x] Real verdict, five sources, both models, and two real request IDs appear on screen.
- [x] No API key, email, phone, password, or unrelated tab appears.
- [x] A separate 150-second clean picture master is included for the participant's own narration.
- [x] Chinese, English, and bilingual SRT subtitle masters are included.
- [x] Public GitHub release contains the Fact Atlas bilingual MP4, clean MP4, cover, and three subtitle files.
- [x] Public release page and direct MP4 work without authentication; the direct MP4 returned an anonymous HTTP 206 range response.

## Remaining participant-only actions / 仅参赛者本人完成

- [ ] Enter team member name(s), phone, and email in the private submission form.
- [ ] Review and confirm the organizer's authorization/consent checkbox.
- [ ] Perform the final form submission before the organizer's cutoff.

These items are intentionally not stored in the public repository. / 上述私人信息与授权确认不会写入公开仓库。
