import { ArrowRight, Github, Network, Radio, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { ClaimComposer } from "./components/ClaimComposer";
import { ResultView } from "./components/ResultView";
import type { ApiError, HealthStatus, InputKind, VerificationResult } from "./types";

async function getJson<T>(response: Response): Promise<T> {
  const body = await response.json();
  if (!response.ok) {
    const apiError = body as ApiError;
    const error = new Error(apiError.error?.message || `Request failed with ${response.status}.`);
    error.name = apiError.error?.code || "REQUEST_FAILED";
    if (apiError.error?.details) error.message += ` ${apiError.error.details}`;
    throw error;
  }
  return body as T;
}

export default function App() {
  const [kind, setKind] = useState<InputKind>("text");
  const [content, setContent] = useState("");
  const [imageDataUrl, setImageDataUrl] = useState("");
  const [imageName, setImageName] = useState("");
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loadPreview = async () => {
    try {
      setError("");
      setResult(await getJson<VerificationResult>(await fetch("/api/demo")));
    } catch (previewError) {
      setError(previewError instanceof Error ? previewError.message : "Could not load the preview.");
    }
  };

  useEffect(() => {
    void Promise.all([
      fetch("/api/health").then(getJson<HealthStatus>).then(setHealth),
      fetch("/api/demo").then(getJson<VerificationResult>).then(setResult),
    ]).catch((startupError) => {
      setError(startupError instanceof Error ? startupError.message : "FactRelay could not start.");
    });
  }, []);

  const runVerification = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, content, ...(kind === "image" ? { imageDataUrl } : {}) }),
      });
      setResult(await getJson<VerificationResult>(response));
      window.setTimeout(() => document.querySelector("[data-testid='result-view']")?.scrollIntoView({ behavior: "smooth", block: "start" }), 40);
    } catch (verificationError) {
      setError(verificationError instanceof Error ? verificationError.message : "Verification failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-shell">
      <div className="product-frame">
        <header className="site-header">
          <a className="brand" href="#top" aria-label="FactRelay home">
            <span className="brand-mark"><Network size={19} /></span>
            <span>FactRelay</span>
          </a>
          <div className="header-status" aria-label="Network status">
            <span className={health?.liveReady ? "pulse-dot connected" : "pulse-dot"} />
            {health?.liveReady ? "Gonka live · 已连接" : "Preview · 预览"}
          </div>
          <div className="header-meta">
            <span><ShieldCheck size={15} /> Auditable by design</span>
            <a href="https://github.com/narratorzhang0307/FactRelay" target="_blank" rel="noreferrer">
              <Github size={16} /> <span>GitHub</span>
            </a>
          </div>
        </header>

        <main id="top">
          <section className="hero">
            <div className="hero-copy">
              <span className="hero-eyebrow"><Radio size={14} /> Case intelligence on Gonka · Gonka 事实核查</span>
              <h1>Question the claim.<br /><em>Keep the receipts.</em></h1>
              <p className="hero-cn">质疑主张，保留每一张推理回执。</p>
              <p>
                One public claim enters. Independent evidence, two adversarial models, and a replayable
                inference trail come back.
              </p>
              <div className="hero-tags" aria-label="Product capabilities">
                <span># live evidence</span>
                <span># two-model review</span>
                <span># request IDs</span>
              </div>
            </div>

            <div className="relay-console" aria-label="FactRelay verification route">
              <div className="relay-console-head">
                <span>Relay status</span>
                <strong>{health?.liveReady ? "LIVE" : "PREVIEW"}</strong>
              </div>
              <div className="relay-console-stat">
                <strong>02</strong>
                <span>models challenge<br />every verdict</span>
              </div>
              <div className="relay-route">
                <div><span>01</span><strong>Sources</strong></div>
                <ArrowRight size={16} />
                <div><span>02</span><strong>Challenge</strong></div>
                <ArrowRight size={16} />
                <div><span>03</span><strong>Proof</strong></div>
              </div>
            </div>
          </section>

          <div className={health?.liveReady ? "network-strip connected" : "network-strip"}>
            <span><i /> {health?.liveReady ? "GonkaRouter connected · 已连接" : "Interface preview · 界面预览"}</span>
            <span>Kimi-K2.6 × MiniMax-M2.7</span>
            <span>{health?.liveReady ? "Real request IDs · 真实回执" : "Add a Gonka key · 待接入密钥"}</span>
          </div>

          <section className="workspace" aria-label="Fact checking workspace">
            <aside>
              <ClaimComposer
                kind={kind}
                content={content}
                imageDataUrl={imageDataUrl}
                imageName={imageName}
                loading={loading}
                liveReady={Boolean(health?.liveReady)}
                onKindChange={setKind}
                onContentChange={setContent}
                onImageChange={(dataUrl, name) => {
                  setImageDataUrl(dataUrl);
                  setImageName(name);
                }}
                onSubmit={() => void runVerification()}
                onPreview={() => void loadPreview()}
              />
            </aside>
            <div className="result-column">
              {error && (
                <div className="error-banner" role="alert">
                  <strong>Verification paused</strong>
                  <span>{error}</span>
                  {!health?.liveReady && <small>Add `GONKA_API_KEY` to `.env.local`, then restart the server.</small>}
                </div>
              )}
              {loading && (
                <div className="loading-card card" aria-live="polite">
                  <div className="loading-orbit"><span /><i /></div>
                  <div>
                    <span className="section-kicker">Live run in progress</span>
                    <h2>Two models are testing the evidence.</h2>
                    <p>FactRelay is retrieving sources, running the investigator, then asking the skeptic to challenge it.</p>
                  </div>
                </div>
              )}
              {!loading && result && <ResultView result={result} />}
            </div>
          </section>
        </main>

        <footer>
          <span>FactRelay · AI³ Growth Hackathon 2026</span>
          <span>AI inference exclusively through GonkaRouter</span>
        </footer>
      </div>
    </div>
  );
}
