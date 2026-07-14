# FactRelay

**Traceable multi-model fact checking, powered by GonkaRouter.**

FactRelay checks public claims without asking users to trust one opaque model. It retrieves current public evidence, gives two Gonka models opposing responsibilities, computes a deterministic Truth Score, and exposes the upstream request ID for every AI inference.

> AI³ Growth Hackathon 2026 · Track 3: Gonka — AI for Society

## Why it exists

Most AI fact checkers return a confident paragraph. That hides three important questions:

1. Which sources actually address the claim?
2. Did independent models agree, or did one merely echo the other?
3. Can a reviewer prove which inference requests produced the result?

FactRelay turns those questions into the interface.

## What the demo shows

- **Text, URL, and image input.** Kimi-K2.6 can extract a claim from an article or screenshot.
- **Current public evidence.** A non-AI retrieval layer gathers Google News RSS results and the submitted page.
- **Adversarial model roles.** Kimi investigates; MiniMax challenges source laundering, missing context, and causal leaps.
- **Deterministic Truth Score.** The final score is calculated by code from model verdicts, source stance, coverage, and disagreement.
- **Real Gonka receipts.** The UI displays the unmodified `id` returned by GonkaRouter for each model call.
- **Honest preview mode.** The bundled preview is clearly labeled and never fabricates request IDs.

## Gonka integration

All AI inference goes through the OpenAI-compatible GonkaRouter endpoint:

```text
https://api.gonkarouter.io/v1/chat/completions
```

Default models:

| Responsibility | Gonka model ID |
| --- | --- |
| Visual claim extraction + investigator | `moonshotai/Kimi-K2.6` |
| Adversarial cross-check | `MiniMaxAI/MiniMax-M2.7` |

The backend preserves `response.id` as `requestId`. Local run IDs such as `fr_…` are kept separate and are never presented as Gonka provenance.

## Verification pipeline

```mermaid
flowchart LR
    A[Text / URL / image] --> B[Claim extraction]
    B --> C[Live evidence retrieval]
    C --> D[Kimi investigator]
    D --> E[MiniMax skeptic]
    D --> F[Deterministic scorer]
    E --> F
    C --> F
    F --> G[Truth Score + evidence ledger + Gonka request IDs]
```

Retrieval does not use another AI provider. It fetches public HTML and RSS. Every inference step uses GonkaRouter.

## Truth Score

The score is not a number requested from a model.

```text
combined signal = 55% model consensus + 45% source-weighted evidence
Truth Score      = 50 + 50 × combined signal
```

Additional rules:

- Each source is counted once even when both models cite it.
- Hallucinated source indexes are rejected before scoring.
- Fewer than two assessed sources pulls the score toward 50.
- Model disagreement lowers decision confidence and remains visible.
- Two `insufficient` verdicts can never produce a confident true/false label.

The implementation and tests live in [`server/scoring.mjs`](server/scoring.mjs) and [`server/scoring.test.mjs`](server/scoring.test.mjs).

## Run locally

Requirements: Node.js 20 or newer.

```bash
npm install
cp .env.example .env.local
# add GONKA_API_KEY to .env.local
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

Without a key, the full interface remains available through an explicitly labeled preview fixture. Live verification returns a clear `GONKA_API_KEY_MISSING` error instead of simulated AI output.

## Environment variables

| Variable | Required | Default |
| --- | --- | --- |
| `GONKA_API_KEY` | For live runs | — |
| `GONKA_BASE_URL` | No | `https://api.gonkarouter.io/v1` |
| `KIMI_MODEL` | No | `moonshotai/Kimi-K2.6` |
| `MINIMAX_MODEL` | No | `MiniMaxAI/MiniMax-M2.7` |
| `PORT` | No | `5173` |

## Quality checks

```bash
npm run verify
npm audit --audit-level=low
```

`npm run verify` runs strict TypeScript checking, unit tests, and the production build.

## API

| Method | Route | Purpose |
| --- | --- | --- |
| `GET` | `/api/health` | Readiness and configured model IDs; never returns the key |
| `GET` | `/api/demo` | Clearly labeled non-live preview fixture |
| `POST` | `/api/verify` | Run the complete verification pipeline |

Example request:

```json
{
  "kind": "text",
  "content": "The Eiffel Tower becomes taller during hot weather because metal expands."
}
```

## Safety and integrity

- Submitted URLs are restricted to public HTTP(S) hosts; private and local network addresses are blocked.
- Redirect destinations are revalidated to reduce SSRF risk.
- Remote page content and model drafts are explicitly treated as untrusted prompt data.
- Images are restricted to PNG, JPEG, or WebP and capped at 5 MB.
- API keys stay server-side and are excluded from Git.
- The project does not claim that an inference receipt proves a statement true; it proves which Gonka request produced the analysis.

## Documentation

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — implementation and trust boundaries
- [`docs/SUBMISSION.md`](docs/SUBMISSION.md) — submission copy and video plan

## License

MIT
