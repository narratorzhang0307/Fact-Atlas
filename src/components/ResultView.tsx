import {
  AlertTriangle,
  ArrowUpRight,
  BrainCircuit,
  Check,
  ChevronLeft,
  ChevronRight,
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
import { useRef, useState, type CSSProperties } from "react";
import type { EvidenceSource, SourceStance, TraceStep, VerificationResult, Verdict } from "../types";

const VERDICT_LABEL: Record<Verdict, string> = {
  supported: "Supported",
  refuted: "Refuted",
  mixed: "Mixed evidence",
  insufficient: "Insufficient evidence",
};

const VERDICT_ZH: Record<Verdict, string> = {
  supported: "证据支持",
  refuted: "事实不符",
  mixed: "证据不一",
  insufficient: "证据不足",
};

const STANCE_LABEL: Record<SourceStance, string> = {
  support: "Supports",
  refute: "Refutes",
  context: "Context",
};

const STANCE_ZH: Record<SourceStance, string> = {
  support: "支持",
  refute: "反驳",
  context: "背景",
};

const STAGE_LABEL: Record<string, string> = {
  "claim-extraction": "Extract claim from article",
  "vision-claim-extraction": "Read claim from image",
  "evidence-retrieval": "Retrieve live evidence",
  "investigator-analysis": "Kimi investigation",
  "skeptic-cross-check": "MiniMax cross-check",
};

const STAGE_ZH: Record<string, string> = {
  "claim-extraction": "提取文章主张",
  "vision-claim-extraction": "读取图片主张",
  "evidence-retrieval": "检索实时证据",
  "investigator-analysis": "Kimi 调查",
  "skeptic-cross-check": "MiniMax 交叉质疑",
};

const ROLE_ZH: Record<string, string> = {
  Investigator: "调查方",
  Skeptic: "质疑方",
};

function formatModel(model: string) {
  return model.split("/").at(-1) ?? model;
}

function formatDate(value: string | null) {
  if (!value) return "Date not supplied · 未提供日期";
  const date = new Date(value);
  return Number.isNaN(date.valueOf())
    ? value
    : `${new Intl.DateTimeFormat("en", { year: "numeric", month: "short", day: "numeric" }).format(date)} · ${new Intl.DateTimeFormat("zh-CN", { year: "numeric", month: "long", day: "numeric" }).format(date)}`;
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
          <span className={`stance ${source.stance}`}>{stanceIcon(source.stance)} {STANCE_LABEL[source.stance]} · {STANCE_ZH[source.stance]}</span>
          <span>{source.reliability}% source confidence · 来源可信度</span>
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
        <small>{STAGE_ZH[step.stage] ?? "执行步骤"}</small>
        <span>{step.provider}{step.model ? ` · ${formatModel(step.model)}` : ""}</span>
      </div>
      <div className="trace-proof">
        {step.requestId ? (
          <code title={step.requestId}>{step.requestId}</code>
        ) : (
          <span>{preview && isModel ? "No ID in preview · 预览无回执" : "Non-AI step · 非 AI 步骤"}</span>
        )}
        <small>{step.durationMs === null ? "—" : `${(step.durationMs / 1000).toFixed(1)}s`}</small>
      </div>
    </li>
  );
}

function BlockStamp({ number, label, proof }: { number: string; label: string; proof: string }) {
  return (
    <div className="block-stamp">
      <span>Block {number} · {label}</span>
      <code>{proof}</code>
    </div>
  );
}

export function ResultView({ result }: { result: VerificationResult }) {
  const [copied, setCopied] = useState(false);
  const [activeBlock, setActiveBlock] = useState(0);
  const touchStartX = useRef<number | null>(null);
  const preview = result.mode === "preview";
  const scoreStyle = { "--score-angle": `${result.truthScore * 3.6}deg` } as CSSProperties;
  const shortCaseId = result.id.replace(/^fr_|^preview_/, "").slice(-12).toUpperCase();
  const blockCount = 4 + (result.missingEvidence.length > 0 ? 1 : 0);

  const moveToBlock = (index: number) => {
    setActiveBlock(Math.max(0, Math.min(blockCount - 1, index)));
  };

  const finishSwipe = (clientX: number) => {
    if (touchStartX.current === null) return;
    const distance = clientX - touchStartX.current;
    if (Math.abs(distance) >= 48) moveToBlock(activeBlock + (distance < 0 ? 1 : -1));
    touchStartX.current = null;
  };

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
          Preview fixture · 界面预览数据 — contains no live Gonka Request IDs / 不含真实 Gonka 回执。
        </div>
      )}

      <nav className="chain-index" aria-label="Evidence block chain · 证据区块链路">
        <div className="chain-index-title">
          <Fingerprint size={16} />
          <span>Evidence chain <small>证据区块链路</small></span>
        </div>
        <div className="chain-index-links">
          <button type="button" className={activeBlock === 0 ? "active" : ""} onClick={() => moveToBlock(0)}><b>01</b><span>Verdict <small>结论</small></span></button>
          <button type="button" className={activeBlock === 1 ? "active" : ""} onClick={() => moveToBlock(1)}><b>02</b><span>Sources <small>来源</small></span></button>
          <button type="button" className={activeBlock === 2 ? "active" : ""} onClick={() => moveToBlock(2)}><b>03</b><span>Review <small>审查</small></span></button>
          <button type="button" className={activeBlock === 3 ? "active" : ""} onClick={() => moveToBlock(3)}><b>04</b><span>Proof <small>回执</small></span></button>
          {result.missingEvidence.length > 0 && (
            <button type="button" className={activeBlock === 4 ? "active" : ""} onClick={() => moveToBlock(4)}><b>05</b><span>Gaps <small>缺口</small></span></button>
          )}
        </div>
      </nav>

      <div className="chain-deck-shell">
        <button
          type="button"
          className="deck-arrow deck-arrow-left"
          aria-label="Previous block · 上一个区块"
          disabled={activeBlock === 0}
          onClick={() => moveToBlock(activeBlock - 1)}
        >
          <ChevronLeft size={21} />
        </button>
        <div
          className={`chain-deck deck-active-${activeBlock + 1}`}
          tabIndex={0}
          role="group"
          aria-label={`Evidence block ${activeBlock + 1} of ${blockCount} · 证据区块 ${activeBlock + 1}/${blockCount}`}
          onKeyDown={(event) => {
            if (event.key === "ArrowLeft") moveToBlock(activeBlock - 1);
            if (event.key === "ArrowRight") moveToBlock(activeBlock + 1);
          }}
          onTouchStart={(event) => { touchStartX.current = event.changedTouches[0]?.clientX ?? null; }}
          onTouchEnd={(event) => finishSwipe(event.changedTouches[0]?.clientX ?? 0)}
        >
          <div className="deck-card" hidden={activeBlock !== 0}>
            <section className={`verdict-card card verdict-${result.verdict}`}>
        <div className="verdict-topline">
          <div className="block-heading">
            <BlockStamp number="01" label="Verdict · 结论" proof={`FR#${shortCaseId}`} />
            <span className="section-kicker"><ShieldCheck size={14} /> Verification result · 核查结果</span>
          </div>
          <button type="button" className="copy-button" onClick={copyReport}>
            {copied ? <Check size={15} /> : <Copy size={15} />} {copied ? "Copied · 已复制" : "Copy · 复制报告"}
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
            <div className="verdict-label-row">
              <div className={`verdict-pill ${result.verdict}`}>{VERDICT_LABEL[result.verdict]} · {VERDICT_ZH[result.verdict]}</div>
              <div className={`verdict-seal seal-${result.verdict}`} aria-label={`${VERDICT_LABEL[result.verdict]} case seal`}>
                <span>{VERDICT_LABEL[result.verdict]}</span>
                <small>{VERDICT_ZH[result.verdict]} · {preview ? "预览案" : "实时案"}</small>
              </div>
            </div>
            <h2>{result.claim}</h2>
            <p>{result.summary}</p>
            <div className="confidence-row">
              <span>Decision confidence · 结论信心</span>
              <div className="confidence-track"><i style={{ width: `${result.confidence}%` }} /></div>
              <strong>{result.confidence}%</strong>
            </div>
          </div>
        </div>
        <div className="score-breakdown">
          {[
            ["Model consensus · 模型共识", result.scoring.modelConsensus],
            ["Evidence balance · 证据平衡", result.scoring.evidenceBalance],
            ["Source coverage · 来源覆盖", result.scoring.sourceCoverage],
            ["Model agreement · 模型一致", result.scoring.modelAgreement],
          ].map(([label, value]) => (
            <div key={label}>
              <span>{label}</span>
              <strong>{value}</strong>
            </div>
          ))}
          <p><GitCompareArrows size={15} /> {result.scoring.formula}</p>
        </div>
            </section>
          </div>

          <div className="deck-card" hidden={activeBlock !== 1}>
            <section className="result-section card">
        <div className="result-section-head">
          <div>
            <BlockStamp number="02" label="Sources · 来源" proof={`${result.sources.length} SOURCES`} />
            <div className="result-title-line">
              <span className="panel-number">02</span>
              <span className="section-kicker"><DatabaseZap size={14} /> Evidence ledger · 证据账本</span>
            </div>
            <h2>{result.sources.length} retrievable sources <span className="heading-zh">可追溯来源</span></h2>
          </div>
          <span className="section-note">Source numbers are the only citations models may use. · 模型只能引用账本中的来源编号。</span>
        </div>
        <div className="source-list">
          {result.sources.length ? result.sources.map((source, index) => (
            <SourceCard key={source.id} source={source} index={index} />
          )) : <p className="empty-state">No live sources were retrieved. The score is intentionally pulled toward uncertainty. · 未检索到实时来源，系统会主动将评分拉回不确定区间。</p>}
        </div>
            </section>
          </div>

          <div className="deck-card" hidden={activeBlock !== 2}>
            <section className="result-section card">
        <div className="result-section-head">
          <div>
            <BlockStamp number="03" label="Consensus · 共识" proof={`${result.models.length} MODELS`} />
            <div className="result-title-line">
              <span className="panel-number">03</span>
              <span className="section-kicker"><BrainCircuit size={14} /> Adversarial review · 对抗审查</span>
            </div>
            <h2>Two models, distinct responsibilities <span className="heading-zh">双模型分工</span></h2>
          </div>
          <span className="section-note">Agreement is measured; disagreement is preserved. · 衡量共识，同时保留分歧。</span>
        </div>
        <div className="model-grid">
          {result.models.map((model) => (
            <article className="model-card" key={model.role}>
              <div className="model-head">
                <div>
                  <span>{model.role} · {ROLE_ZH[model.role] ?? "审查方"}</span>
                  <h3>{formatModel(model.model)}</h3>
                </div>
                <div className={`mini-verdict ${model.verdict}`}>{VERDICT_LABEL[model.verdict]} · {VERDICT_ZH[model.verdict]}</div>
              </div>
              <p>{model.summary}</p>
              <ol>
                {model.reasoning.map((reason) => <li key={reason}>{reason}</li>)}
              </ol>
              <div className="model-proof">
                <div><Fingerprint size={15} /><span>Gonka Request ID · Gonka 请求回执</span></div>
                <code>{model.requestId ?? "Not available in preview · 预览中不可用"}</code>
              </div>
              <div className="model-foot">
                <span>{model.confidence}% confidence · 信心</span>
                <span><Clock3 size={13} /> {model.durationMs === null ? "Preview · 预览" : `${(model.durationMs / 1000).toFixed(1)}s`}</span>
              </div>
            </article>
          ))}
        </div>
            </section>
          </div>

          <div className="deck-card" hidden={activeBlock !== 3}>
            <section className="result-section card">
        <div className="result-section-head">
          <div>
            <BlockStamp number="04" label="Receipts · 回执" proof={`${result.trace.length} STEPS`} />
            <div className="result-title-line">
              <span className="panel-number">04</span>
              <span className="section-kicker"><Fingerprint size={14} /> Provenance trace · 溯源轨迹</span>
            </div>
            <h2>Replayable execution path <span className="heading-zh">可重放执行路径</span></h2>
          </div>
          <span className="section-note">Only upstream IDs are labeled as Gonka requests. · 仅上游真实回执会标记为 Gonka 请求。</span>
        </div>
        <ol className="trace-list">
          {result.trace.map((step, index) => <TraceRow key={`${step.stage}-${index}`} step={step} preview={preview} />)}
        </ol>
            </section>
          </div>

          {result.missingEvidence.length > 0 && (
            <div className="deck-card" hidden={activeBlock !== 4}>
              <section className="missing-card card">
                <BlockStamp number="05" label="Open gaps · 证据缺口" proof={`${result.missingEvidence.length} ITEMS`} />
                <div className="result-title-line">
                  <span className="panel-number">05</span>
                  <span className="section-kicker"><AlertTriangle size={14} /> What could change this result · 待补证据</span>
                </div>
                <ul>{result.missingEvidence.map((item) => <li key={item}>{item}</li>)}</ul>
              </section>
            </div>
          )}
        </div>
        <button
          type="button"
          className="deck-arrow deck-arrow-right"
          aria-label="Next block · 下一个区块"
          disabled={activeBlock === blockCount - 1}
          onClick={() => moveToBlock(activeBlock + 1)}
        >
          <ChevronRight size={21} />
        </button>
      </div>
      <div className="deck-progress" aria-live="polite">
        <span>Block {String(activeBlock + 1).padStart(2, "0")} / {String(blockCount).padStart(2, "0")}</span>
        <i><b style={{ width: `${((activeBlock + 1) / blockCount) * 100}%` }} /></i>
        <small>Use arrows or swipe · 使用箭头或滑动</small>
      </div>
    </div>
  );
}
