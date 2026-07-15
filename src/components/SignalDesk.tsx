import {
  ArrowRight,
  ArrowUpRight,
  Bot,
  BrainCircuit,
  Cpu,
  FlaskConical,
  Landmark,
  Leaf,
  HeartPulse,
  Building2,
  Scale,
  Newspaper,
  RadioTower,
  RefreshCw,
  ScanSearch,
  ShieldCheck,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import type { ApiError, DailySignal, DailySignalBrief, SignalTopic } from "../types";

interface Props {
  onInvestigate: (signal: DailySignal) => void;
}

const TOPICS: Array<{ id: SignalTopic; label: string; labelZh: string; icon: ReactNode; color: string }> = [
  { id: "ai", label: "AI", labelZh: "人工智能", icon: <BrainCircuit size={19} />, color: "var(--lime)" },
  { id: "technology", label: "Technology", labelZh: "科技", icon: <Cpu size={19} />, color: "var(--violet)" },
  { id: "finance", label: "Finance", labelZh: "金融", icon: <Landmark size={19} />, color: "var(--yellow)" },
  { id: "climate", label: "Climate", labelZh: "气候能源", icon: <Leaf size={19} />, color: "var(--cyan)" },
  { id: "science", label: "Science", labelZh: "科学", icon: <FlaskConical size={19} />, color: "var(--pink)" },
  { id: "health", label: "Health & Bio", labelZh: "健康生命", icon: <HeartPulse size={19} />, color: "#ff756d" },
  { id: "culture", label: "Cities & Culture", labelZh: "城市文化", icon: <Building2 size={19} />, color: "#d3c0ff" },
  { id: "policy", label: "Policy & Society", labelZh: "政策社会", icon: <Scale size={19} />, color: "#b8d2ff" },
];

async function getBrief(topic: SignalTopic): Promise<DailySignalBrief> {
  const response = await fetch(`/api/signals?topic=${topic}`);
  const payload = await response.json();
  if (!response.ok) {
    const error = payload as ApiError;
    throw new Error(error.error?.message || "The signal scout is temporarily unavailable. · 情报侦察员暂时不可用。");
  }
  return payload as DailySignalBrief;
}

function readableDate(value: string | null): string {
  if (!value) return "Date not supplied · 日期未提供";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(date);
}

export function SignalDesk({ onInvestigate }: Props) {
  const [topic, setTopic] = useState<SignalTopic>("ai");
  const [brief, setBrief] = useState<DailySignalBrief | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    void getBrief(topic).then((value) => {
      if (active) setBrief(value);
    }).catch((reason) => {
      if (active) setError(reason instanceof Error ? reason.message : "Signal scan failed. · 情报检索失败。");
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [topic, refreshKey]);

  return (
    <div className="signals-root">
        <section className="signals-section" aria-labelledby="signals-title">
          <header className="signals-heading">
            <div>
              <span className="hero-eyebrow"><RadioTower size={14} /> Signal Desk · 个人中立新闻终端</span>
              <h2 id="signals-title">Let agents scout. <em>You decide what matters.</em></h2>
              <p>Topic agents scan global public news, use Gonka to rank what may matter, and hand every candidate back to you. Nothing reaches the Atlas until FactRelay performs a deeper two-model review. · 主题 Agent 先筛选全球公开信息；你再选择值得深度核验、最终落位的知识。</p>
            </div>
            <div className="signals-principle"><ShieldCheck size={20} /><span>Importance is not truth.<small>重要性评分不是真实度评分。</small></span></div>
          </header>

          <div className="signals-pipeline" aria-label="Signal to knowledge pipeline · 情报入库流程">
            <span><b>01</b> Agents scout<small>全球筛选</small></span><ArrowRight size={17} />
            <span><b>02</b> You select<small>主动选择</small></span><ArrowRight size={17} />
            <span><b>03</b> Council verifies<small>交叉核验</small></span><ArrowRight size={17} />
            <span><b>04</b> Atlas remembers<small>知识落位</small></span>
          </div>

          <div className="signals-agent-grid" role="group" aria-label="Topic agents · 主题侦察员">
            {TOPICS.map((item) => (
              <button type="button" key={item.id} className={topic === item.id ? "active" : ""} onClick={() => setTopic(item.id)} style={{ "--agent-color": item.color } as React.CSSProperties}>
                <i>{item.icon}</i><span>{item.label}<small>{item.labelZh}</small></span><Bot size={15} />
              </button>
            ))}
          </div>

          <div className="signals-board">
            <aside className="signals-brief-card">
              <div className="signals-brief-top"><span><ScanSearch size={15} /> TODAY'S SCOUT · 今日侦察</span><button type="button" onClick={() => setRefreshKey((value) => value + 1)} disabled={loading} aria-label="Refresh signal brief · 刷新情报"><RefreshCw size={15} /></button></div>
              {loading && !brief ? <div className="signals-loading"><i /><strong>Scanning public signals…</strong><span>Gonka 正在进行第一道中立筛选。</span></div> : null}
              {error ? <div className="signals-error"><strong>Scout paused · 侦察已暂停</strong><span>{error}</span><button type="button" onClick={() => setRefreshKey((value) => value + 1)}>Try again · 重试</button></div> : null}
              {brief ? <>
                <span className="signals-agent-name">{brief.agent}</span>
                <h3>{brief.topicLabel}<small>{brief.topicLabelZh}</small></h3>
                <p>{brief.brief}</p><p>{brief.briefZh}</p>
                <dl><div><dt>Model · 模型</dt><dd>{brief.model.split("/").pop()}</dd></div><div><dt>Updated · 更新</dt><dd>{new Date(brief.generatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</dd></div></dl>
                <div className="signals-receipt"><span>GONKA SCOUT RECEIPT · 筛选回执</span><code>{brief.requestId || "No receipt returned · 未返回回执"}</code></div>
                <small className="signals-cache-note">{brief.cacheHit ? "Daily cache · 今日缓存" : "Fresh public scan · 实时扫描"}</small>
              </> : null}
            </aside>

            <div className="signals-list" aria-live="polite">
              {brief?.signals.map((signal, index) => (
                <article className="signal-card" key={signal.id}>
                  <div className={signal.source.imageUrl ? "signal-image" : "signal-image signal-image-empty"}>
                    {signal.source.imageUrl ? <img src={signal.source.imageUrl} alt="" loading="lazy" referrerPolicy="no-referrer" /> : <><RadioTower size={28} /><span>{brief.topicLabel}<small>{brief.topicLabelZh}</small></span></>}
                    <b>{signal.source.publisher}</b>
                  </div>
                  <div className="signal-index"><span>{String(index + 1).padStart(2, "0")}</span><strong>{signal.importance}</strong><small>IMPORTANCE<br />重要性</small></div>
                  <div className="signal-copy">
                    <div className="signal-source"><Newspaper size={14} /><span>{signal.source.publisher}</span><time>{readableDate(signal.source.publishedAt)}</time></div>
                    <h3>{signal.headline}<small>{signal.headlineZh}</small></h3>
                    <p>{signal.why}<span>{signal.whyZh}</span></p>
                    <div className="signal-claim"><b>CHECKABLE CLAIM · 待核验主张</b><span>{signal.claim}</span><small>{signal.claimZh}</small></div>
                    <div className="signal-actions"><button type="button" onClick={() => onInvestigate(signal)}>Deep verify in FactRelay · 进入深度核验<ArrowRight size={15} /></button><a href={signal.source.url} target="_blank" rel="noreferrer">Open source · 原文<ArrowUpRight size={14} /></a></div>
                  </div>
                </article>
              ))}
              {loading && brief ? <div className="signals-refreshing"><RefreshCw size={16} /> Refreshing this agent's daily brief… · 正在刷新今日简报</div> : null}
            </div>
          </div>
        </section>
    </div>
  );
}
