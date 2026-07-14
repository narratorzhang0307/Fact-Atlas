import {
  AlertTriangle,
  ArrowUpRight,
  BrainCircuit,
  Check,
  CircleHelp,
  Clock3,
  Copy,
  DatabaseZap,
  Fingerprint,
  GitCompareArrows,
  Search,
  ShieldCheck,
  X,
} from "lucide-react";
import { useState, type CSSProperties } from "react";
import type { EvidenceSource, SourceStance, TraceStep, VerificationResult, Verdict } from "../types";

const VERDICT_LABEL: Record<Verdict, string> = {
  supported: "Supported",
  refuted: "Refuted",
  mixed: "Mixed evidence",
  insufficient: "Insufficient evidence",
};

const STANCE_LABEL: Record<SourceStance, string> = {
  support: "Supports",
  refute: "Refutes",
  context: "Context",
};

const STAGE_LABEL: Record<string, string> = {
  "claim-extraction": "Extract claim from article",
  "vision-claim-extraction": "Read claim from image",
  "evidence-retrieval": "Retrieve live evidence",
  "investigator-analysis": "Kimi investigation",
  "skeptic-cross-check": "MiniMax cross-check",
};

function formatModel(model: string) {
  return model.split("/").at(-1) ?? model;
}

function formatDate(value: string | null) {
  if (!value) return "Date not supplied";
  const date = new Date(value);
  return Number.isNaN(date.valueOf())
    ? value
    : new Intl.DateTimeFormat("en", { year: "numeric", month: "short", day: "numeric" }).format(date);
}

function stanceIcon(stance: SourceStance) {
  if (stance === "support") return <Check size={15} />;
  if (stance === "refute") return <X size={15} />;
  return <CircleHelp size={15} />;
}

function SourceCard({ source, index }: { source: EvidenceSource; index: number }) {
  return (
    <article className="source-card">
      <div className="source-number">{String(index + 1).padStart(2, "0")}</div>
      <div className="source-main">
        <div className="source-meta">
          <span>{source.publisher}</span>
          <span>{formatDate(source.publishedAt)}</span>
        </div>
        <a href={source.url} target="_blank" rel="noreferrer">
          {source.title} <ArrowUpRight size={15} />
        </a>
        <p>{source.snippet}</p>
        <div className="source-assessment">
          <span className={`stance ${source.stance}`}>{stanceIcon(source.stance)} {STANCE_LABEL[source.stance]}</span>
          <span>{source.reliability}% source confidence</span>
          <span className="assessment-reason">{source.reason}</span>
        </div>
      </div>
    </article>
  );
}

function TraceRow({ step, preview }: { step: TraceStep; preview: boolean }) {
  const isModel = Boolean(step.model);
  return (
    <li className="trace-row">
      <div className="trace-icon">{isModel ? <BrainCircuit size={17} /> : <Search size={17} />}</div>
      <div className="trace-copy">
        <strong>{STAGE_LABEL[step.stage] ?? step.stage}</strong>
        <span>{step.provider}{step.model ? ` · ${formatModel(step.model)}` : ""}</span>
      </div>
      <div className="trace-proof">
        {step.requestId ? (
          <code title={step.requestId}>{step.requestId}</code>
        ) : (
          <span>{preview && isModel ? "No ID in preview" : "Non-AI step"}</span>
        )}
        <small>{step.durationMs === null ? "—" : `${(step.durationMs / 1000).toFixed(1)}s`}</small>
      </div>
    </li>
  );
}

export function ResultView({ result }: { result: VerificationResult }) {
  const [copied, setCopied] = useState(false);
  const preview = result.mode === "preview";
  const scoreStyle = { "--score-angle": `${result.truthScore * 3.6}deg` } as CSSProperties;

  const copyReport = async () => {
    const report = `${result.claim}\n\nTruth Score: ${result.truthScore}/100 · ${VERDICT_LABEL[result.verdict]}\n${result.summary}\n\nSources:\n${result.sources.map((source, index) => `${index + 1}. ${source.title} — ${source.url}`).join("\n")}`;
    await navigator.clipboard.writeText(report);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  return (
    <div className="result-stack" data-testid="result-view">
      {preview && (
        <div className="preview-banner">
          <AlertTriangle size={16} />
          Preview fixture — useful for exploring the interface, but it contains no live Gonka Request IDs.
        </div>
      )}

      <section className={`verdict-card card verdict-${result.verdict}`}>
        <div className="verdict-topline">
          <span className="section-kicker"><ShieldCheck size={14} /> Verification result</span>
          <button type="button" className="copy-button" onClick={copyReport}>
            {copied ? <Check size={15} /> : <Copy size={15} />} {copied ? "Copied" : "Copy report"}
          </button>
        </div>
        <div className="verdict-grid">
          <div className="score-ring" style={scoreStyle} aria-label={`Truth Score ${result.truthScore} out of 100`}>
            <div>
              <strong>{result.truthScore}</strong>
              <span>/ 100</span>
            </div>
          </div>
          <div className="verdict-copy">
            <div className={`verdict-pill ${result.verdict}`}>{VERDICT_LABEL[result.verdict]}</div>
            <h2>{result.claim}</h2>
            <p>{result.summary}</p>
            <div className="confidence-row">
              <span>Decision confidence</span>
              <div className="confidence-track"><i style={{ width: `${result.confidence}%` }} /></div>
              <strong>{result.confidence}%</strong>
            </div>
          </div>
        </div>
        <div className="score-breakdown">
          {[
            ["Model consensus", result.scoring.modelConsensus],
            ["Evidence balance", result.scoring.evidenceBalance],
            ["Source coverage", result.scoring.sourceCoverage],
            ["Model agreement", result.scoring.modelAgreement],
          ].map(([label, value]) => (
            <div key={label}>
              <span>{label}</span>
              <strong>{value}</strong>
            </div>
          ))}
          <p><GitCompareArrows size={15} /> {result.scoring.formula}</p>
        </div>
      </section>

      <section className="result-section card">
        <div className="result-section-head">
          <div>
            <span className="section-kicker"><DatabaseZap size={14} /> Evidence ledger</span>
            <h2>{result.sources.length} retrievable sources</h2>
          </div>
          <span className="section-note">Source numbers are the only citations models may use.</span>
        </div>
        <div className="source-list">
          {result.sources.length ? result.sources.map((source, index) => (
            <SourceCard key={source.id} source={source} index={index} />
          )) : <p className="empty-state">No live sources were retrieved. The score is intentionally pulled toward uncertainty.</p>}
        </div>
      </section>

      <section className="result-section card">
        <div className="result-section-head">
          <div>
            <span className="section-kicker"><BrainCircuit size={14} /> Adversarial review</span>
            <h2>Two models, distinct responsibilities</h2>
          </div>
          <span className="section-note">Agreement is measured; disagreement is preserved.</span>
        </div>
        <div className="model-grid">
          {result.models.map((model) => (
            <article className="model-card" key={model.role}>
              <div className="model-head">
                <div>
                  <span>{model.role}</span>
                  <h3>{formatModel(model.model)}</h3>
                </div>
                <div className={`mini-verdict ${model.verdict}`}>{VERDICT_LABEL[model.verdict]}</div>
              </div>
              <p>{model.summary}</p>
              <ol>
                {model.reasoning.map((reason) => <li key={reason}>{reason}</li>)}
              </ol>
              <div className="model-proof">
                <div><Fingerprint size={15} /><span>Gonka Request ID</span></div>
                <code>{model.requestId ?? "Not available in preview"}</code>
              </div>
              <div className="model-foot">
                <span>{model.confidence}% confidence</span>
                <span><Clock3 size={13} /> {model.durationMs === null ? "Preview" : `${(model.durationMs / 1000).toFixed(1)}s`}</span>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="result-section card">
        <div className="result-section-head">
          <div>
            <span className="section-kicker"><Fingerprint size={14} /> Provenance trace</span>
            <h2>Replayable execution path</h2>
          </div>
          <span className="section-note">Only upstream IDs are labeled as Gonka requests.</span>
        </div>
        <ol className="trace-list">
          {result.trace.map((step, index) => <TraceRow key={`${step.stage}-${index}`} step={step} preview={preview} />)}
        </ol>
      </section>

      {result.missingEvidence.length > 0 && (
        <section className="missing-card card">
          <span className="section-kicker"><AlertTriangle size={14} /> What could change this result</span>
          <ul>{result.missingEvidence.map((item) => <li key={item}>{item}</li>)}</ul>
        </section>
      )}
    </div>
  );
}
