import {
  ArrowRight,
  ArrowUpRight,
  Bot,
  BrainCircuit,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
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
  Sparkles,
  Wrench,
} from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { loadSignalBrief, saveSignalBrief } from "../signal-cache";
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

const briefCache = new Map<string, DailySignalBrief>();

function utcDate(offset = 0): string {
  const value = new Date();
  value.setUTCDate(value.getUTCDate() + offset);
  return value.toISOString().slice(0, 10);
}

async function getBrief(topic: SignalTopic, date: string, signal?: AbortSignal): Promise<DailySignalBrief> {
  const response = await fetch(`/api/signals?topic=${topic}&date=${encodeURIComponent(date)}`, { signal });
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
  const [selectedDate, setSelectedDate] = useState(() => utcDate());
  const [brief, setBrief] = useState<DailySignalBrief | null>(null);
  const [activeSignalIndex, setActiveSignalIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [bufferLayer, setBufferLayer] = useState<"memory" | "device" | "network" | null>(null);
  const touchStartX = useRef<number | null>(null);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    const editionKey = `${selectedDate}:${topic}`;
    const memoryCached = refreshKey === 0 ? briefCache.get(editionKey) : null;
    const deviceCached = refreshKey === 0 && !memoryCached ? loadSignalBrief(topic, selectedDate) : null;
    const cached = memoryCached || deviceCached;
    if (cached) {
      briefCache.set(editionKey, cached);
      setBrief(cached);
      setActiveSignalIndex(0);
      setLoading(false);
      setError("");
      setBufferLayer(memoryCached ? "memory" : "device");
      return () => { active = false; };
    }
    setLoading(true);
    setError("");
    setBufferLayer(null);
    if (refreshKey === 0) setBrief(null);
    setActiveSignalIndex(0);
    void getBrief(topic, selectedDate, controller.signal).then((value) => {
      briefCache.set(editionKey, value);
      saveSignalBrief(value);
      if (active) {
        setBrief(value);
        setBufferLayer("network");
      }
      if (value.cacheLayer === "snapshot") {
        for (const item of TOPICS) {
          const siblingKey = `${selectedDate}:${item.id}`;
          if (briefCache.has(siblingKey)) continue;
          void getBrief(item.id, selectedDate, controller.signal).then((sibling) => {
            if (sibling.cacheLayer === "snapshot") {
              briefCache.set(siblingKey, sibling);
              saveSignalBrief(sibling);
            }
          }).catch(() => undefined);
        }
      }
    }).catch((reason) => {
      if (reason instanceof DOMException && reason.name === "AbortError") return;
      if (active) setError(reason instanceof Error ? reason.message : "Signal scan failed. · 情报检索失败。");
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => {
      active = false;
      controller.abort();
    };
  }, [topic, selectedDate, refreshKey]);

  const signals = brief?.signals || [];
  const activeSignal = signals[activeSignalIndex];
  const moveSignal = (direction: -1 | 1) => {
    if (signals.length < 2) return;
    setActiveSignalIndex((current) => (current + direction + signals.length) % signals.length);
  };

  return (
    <div className="signals-root">
      <section className="signals-section" aria-labelledby="signals-title">
        <header className="signals-heading">
          <div>
            <span className="hero-eyebrow"><RadioTower size={14} /> Signal Desk · 个人中立新闻终端</span>
            <h2 id="signals-title">One topic. One day. <em>No feed flood.</em></h2>
            <p>Choose a specialist agent and a date, then review one consequential signal at a time. Swipe on mobile or use the arrows on desktop. · 选择主题 Agent 与日期，一次只审阅一条重要信息；手机滑动，网页箭头翻阅。</p>
          </div>
          <div className="signals-principle"><ShieldCheck size={20} /><span>Importance is not truth.<small>重要性评分不是真实度评分。</small></span></div>
        </header>

        <div className="signals-pipeline" aria-label="Signal to knowledge pipeline · 情报入库流程">
          <span><b>01</b> Supervisor routes<small>主 Agent 路由</small></span><ArrowRight size={17} />
          <span><b>02</b> Topic agent scouts<small>主题 Agent 检索</small></span><ArrowRight size={17} />
          <span><b>03</b> Skills filter<small>Skills 去重排序</small></span><ArrowRight size={17} />
          <span><b>04</b> Relay verifies<small>核验后入库</small></span>
        </div>

        <div className="signals-agent-grid" role="group" aria-label="Topic agents · 主题侦察员">
          {TOPICS.map((item) => (
            <button
              type="button"
              key={item.id}
              className={topic === item.id ? "active" : ""}
              aria-pressed={topic === item.id}
              aria-label={`${item.label} · ${item.labelZh}`}
              onClick={() => {
                setRefreshKey(0);
                setTopic(item.id);
              }}
              style={{ "--agent-color": item.color } as React.CSSProperties}
            >
              <i>{item.icon}</i><span>{item.label}<small>{item.labelZh}</small></span><em>SUBAGENT</em><Bot size={15} />
            </button>
          ))}
        </div>

        <div className="signals-orchestrator" aria-label="Agent orchestration · Agent 编排">
          <span><Bot size={15} /><b>Signal Supervisor</b><small>全球信号主理人</small></span>
          <ArrowRight size={15} />
          <span><ScanSearch size={15} /><b>{brief?.agent || TOPICS.find((item) => item.id === topic)?.label}</b><small>当前主题子 Agent</small></span>
          <ArrowRight size={15} />
          <span><Wrench size={15} /><b>{brief?.agentSystem.skills.length || 6} bounded Skills</b><small>检索 · 日期 · 去重 · 排序</small></span>
          <ArrowRight size={15} />
          <span><ShieldCheck size={15} /><b>Human verification gate</b><small>人工选择后进入 FactRelay</small></span>
        </div>

        <div className="signals-browser">
          <div className="signals-browser-toolbar">
            <label className="signals-date-picker">
              <span><CalendarDays size={15} /> EDITION DATE · 简报日期</span>
              <input
                type="date"
                value={selectedDate}
                min={brief?.calendar.minDate || utcDate(-29)}
                max={brief?.calendar.maxDate || utcDate()}
                onChange={(event) => {
                  setRefreshKey(0);
                  setSelectedDate(event.target.value);
                }}
              />
              {brief ? <small>SOURCE WINDOW · 来源窗口 {brief.calendar.coverageStart} → {brief.calendar.coverageEnd}</small> : null}
            </label>
            <div className="signals-edition-meta">
              <span>{brief?.topicLabel || TOPICS.find((item) => item.id === topic)?.label}<small>{brief?.topicLabelZh || TOPICS.find((item) => item.id === topic)?.labelZh}</small></span>
              <strong>{signals.length ? `${String(activeSignalIndex + 1).padStart(2, "0")} / ${String(signals.length).padStart(2, "0")}` : "— / —"}</strong>
            </div>
            <button className="signals-refresh" type="button" onClick={() => setRefreshKey((value) => value + 1)} disabled={loading} aria-label="Refresh selected edition · 刷新当前简报"><RefreshCw size={16} /><span>Refresh<small>刷新</small></span></button>
          </div>

          {brief ? (
            <div className="signals-brief-strip">
              <Sparkles size={16} />
              <p><b>{brief.brief}</b><span>{brief.briefZh}</span></p>
              <div className="signals-cache-meta">
                <span className={brief.cacheLayer === "snapshot" ? "signals-cache-badge snapshot" : "signals-cache-badge"}>
                  {bufferLayer === "device" ? "3-DAY DEVICE BUFFER · 三日设备缓冲" : brief.cacheLayer === "snapshot" ? "PRELOADED · 已预载" : bufferLayer === "memory" || brief.cacheHit ? "SESSION CACHE · 会话缓存" : "LIVE EDITION · 实时简报"}
                </span>
                <code title={brief.requestId || "No receipt returned"}>{brief.requestId || "No Gonka receipt · 未返回回执"}</code>
              </div>
            </div>
          ) : null}

          {loading && !brief ? <div className="signals-loading signals-loading-wide"><i /><strong>Opening the {selectedDate} edition…</strong><span>正在读取日期简报；已预载日期直接命中快照，未缓存日期才启动实时 Agent。</span></div> : null}
          {loading && brief ? <div className="signals-refreshing"><RefreshCw size={15} />Refreshing this edition without hiding the cards · 卡片保持可见，正在更新简报</div> : null}
          {error && !brief ? <div className="signals-error signals-error-wide"><strong>Scout paused · 侦察已暂停</strong><span>{error}</span><button type="button" onClick={() => setRefreshKey((value) => value + 1)}>Try again · 重试</button></div> : null}
          {error && brief ? <div className="signals-refreshing">The cached edition remains available · 刷新未完成，已缓存简报仍可浏览</div> : null}
          {brief && !loading && !error && signals.length === 0 ? <div className="signals-empty"><RadioTower size={24} /><strong>No qualified signals for this edition. · 当日暂无合格信号</strong><span>Try another topic or date; the Agent will not invent a card to fill the feed. · 请切换主题或日期，Agent 不会为了填充信息流而虚构内容。</span></div> : null}

          {activeSignal && brief ? (
            <div className="signal-deck-stage">
              <button className="signal-deck-arrow previous" type="button" onClick={() => moveSignal(-1)} disabled={signals.length < 2} aria-label="Previous signal · 上一条"><ChevronLeft size={25} /></button>
              <div className="signal-deck-stack" data-position={`${activeSignalIndex + 1}-${signals.length}`} aria-live="polite">
                <article
                  className="signal-card signal-card-active"
                  key={activeSignal.id}
                  tabIndex={0}
                  aria-label={`Signal ${activeSignalIndex + 1} of ${signals.length}`}
                  onKeyDown={(event) => {
                    if (event.key === "ArrowLeft") moveSignal(-1);
                    if (event.key === "ArrowRight") moveSignal(1);
                  }}
                  onTouchStart={(event) => { touchStartX.current = event.touches[0]?.clientX ?? null; }}
                  onTouchEnd={(event) => {
                    if (touchStartX.current === null) return;
                    const distance = event.changedTouches[0]?.clientX - touchStartX.current;
                    touchStartX.current = null;
                    if (Math.abs(distance) > 44) moveSignal(distance > 0 ? -1 : 1);
                  }}
                >
                  <div className={activeSignal.source.imageUrl ? "signal-image" : "signal-image signal-image-empty"}>
                    {activeSignal.source.imageUrl ? <img src={activeSignal.source.imageUrl} alt="" loading="lazy" referrerPolicy="no-referrer" /> : <><RadioTower size={28} /><span>{brief.topicLabel}<small>{brief.topicLabelZh}</small></span></>}
                    <b>{activeSignal.source.publisher}</b>
                    <time>{brief.calendar.selectedDate} · UTC EDITION</time>
                  </div>
                  <div className="signal-index"><span>BLOCK {String(activeSignalIndex + 1).padStart(2, "0")}</span><strong>{activeSignal.importance}</strong><small>IMPORTANCE<br />重要性</small></div>
                  <div className="signal-copy">
                    <div className="signal-source"><Newspaper size={14} /><span>{activeSignal.source.publisher}</span><time>{readableDate(activeSignal.source.publishedAt)}</time></div>
                    <h3>{activeSignal.headline}<small>{activeSignal.headlineZh}</small></h3>
                    <p>{activeSignal.why}<span>{activeSignal.whyZh}</span></p>
                    <div className="signal-claim"><b>CHECKABLE CLAIM · 待核验主张</b><span>{activeSignal.claim}</span><small>{activeSignal.claimZh}</small></div>
                    <div className="signal-actions"><button type="button" onClick={() => onInvestigate(activeSignal)}>Verify & add to Atlas · 核验后加入知识星球<ArrowRight size={15} /></button><a href={activeSignal.source.url} target="_blank" rel="noreferrer">Open source · 原文<ArrowUpRight size={14} /></a></div>
                  </div>
                </article>
              </div>
              <button className="signal-deck-arrow next" type="button" onClick={() => moveSignal(1)} disabled={signals.length < 2} aria-label="Next signal · 下一条"><ChevronRight size={25} /></button>
              <div className="signal-deck-progress" aria-label="Signal position · 情报位置">
                {signals.map((signal, index) => <button type="button" key={signal.id} className={index === activeSignalIndex ? "active" : ""} aria-current={index === activeSignalIndex ? "step" : undefined} onClick={() => setActiveSignalIndex(index)} aria-label={`Open signal ${index + 1} · 打开第 ${index + 1} 条`} />)}
                <span>Use arrows or swipe · 使用箭头或滑动</span>
              </div>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
