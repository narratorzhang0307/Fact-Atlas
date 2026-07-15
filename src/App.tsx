import { Archive, ChevronLeft, ChevronRight, FileSearch, Gavel, Github, Globe2, Radio, RadioTower, type LucideIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { ClaimComposer } from "./components/ClaimComposer";
import { ResultView } from "./components/ResultView";
import { FactAtlas } from "./components/FactAtlas";
import { SignalDesk } from "./components/SignalDesk";
import { EvidenceCouncil } from "./components/EvidenceCouncil";
import { PwaInstall } from "./components/PwaInstall";
import { AgentOrchestration } from "./components/AgentOrchestration";
import { formatProductHash, parseProductHash, type ProductLocation, type ProductView, type RelayPane } from "./navigation";
import type { ApiError, HealthStatus, InputKind, VerificationResult } from "./types";

async function getJson<T>(response: Response): Promise<T> {
  const body = await response.json();
  if (!response.ok) {
    const apiError = body as ApiError;
    const error = new Error(apiError.error?.message || `Request failed with ${response.status}. · 请求失败（${response.status}）`);
    error.name = apiError.error?.code || "REQUEST_FAILED";
    if (apiError.error?.details) error.message += ` ${apiError.error.details}`;
    throw error;
  }
  return body as T;
}

const HERO_BLOCKS = [
  {
    number: "01",
    label: "Sources",
    labelZh: "来源",
    title: "evidence before every answer",
    titleZh: "证据先于每一个回答",
    detail: "current public sources · 当前公开来源",
  },
  {
    number: "02",
    label: "Challenge",
    labelZh: "质疑",
    title: "models challenge every verdict",
    titleZh: "模型质疑每一个结论",
    detail: "Kimi investigator × MiniMax skeptic · 调查方 × 质疑方",
  },
  {
    number: "03",
    label: "Proof",
    labelZh: "回执",
    title: "receipts keep the trail replayable",
    titleZh: "回执让推理轨迹可重放",
    detail: "upstream request IDs · 上游请求回执",
  },
] as const;

const PRODUCT_VIEWS: Array<{ id: ProductView; label: string; labelZh: string; Icon: LucideIcon }> = [
  { id: "relay", label: "Relay", labelZh: "探索", Icon: FileSearch },
  { id: "atlas", label: "Atlas", labelZh: "星图", Icon: Globe2 },
  { id: "signals", label: "Signals", labelZh: "发现", Icon: RadioTower },
];

function ProductTabs({
  activeView,
  className,
  iconSize,
  onSelect,
}: {
  activeView: ProductView;
  className: string;
  iconSize: number;
  onSelect: (view: ProductView) => void;
}) {
  return (
    <nav className={className} aria-label={className === "mobile-tabbar" ? "Mobile product tabs · 手机端产品标签" : "Product views · 产品视图"}>
      {PRODUCT_VIEWS.map(({ id, label, labelZh, Icon }) => (
        <button
          type="button"
          key={id}
          className={activeView === id ? "active" : ""}
          aria-current={activeView === id ? "page" : undefined}
          aria-controls={`${id}-view`}
          onClick={() => onSelect(id)}
        >
          <Icon size={iconSize} />
          <span>{label}<small>{labelZh}</small></span>
        </button>
      ))}
    </nav>
  );
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
  const [heroBlockIndex, setHeroBlockIndex] = useState(1);
  const [productLocation, setProductLocation] = useState<ProductLocation>(() => parseProductHash(window.location.hash));
  const heroTouchStartX = useRef<number | null>(null);
  const heroBlock = HERO_BLOCKS[heroBlockIndex];
  const { view: activeView, relayPane } = productLocation;

  const navigateProduct = (next: ProductLocation, replace = false) => {
    setProductLocation(next);
    const nextHash = formatProductHash(next);
    if (window.location.hash !== nextHash) {
      window.history[replace ? "replaceState" : "pushState"]({}, "", nextHash);
    }
  };

  const selectProductView = (view: ProductView) => {
    navigateProduct({ view, relayPane: "verify" });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const selectRelayPane = (nextPane: RelayPane) => {
    navigateProduct({ view: "relay", relayPane: nextPane });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const moveHeroBlock = (direction: -1 | 1) => {
    setHeroBlockIndex((current) => (current + direction + HERO_BLOCKS.length) % HERO_BLOCKS.length);
  };

  const loadPreview = async () => {
    try {
      setError("");
      setResult(await getJson<VerificationResult>(await fetch("/api/demo")));
    } catch (previewError) {
      setError(previewError instanceof Error ? previewError.message : "Could not load the preview. · 无法加载预览。");
    }
  };

  useEffect(() => {
    const syncLocation = () => setProductLocation(parseProductHash(window.location.hash));
    window.addEventListener("popstate", syncLocation);
    window.addEventListener("hashchange", syncLocation);
    if (window.location.hash !== formatProductHash(productLocation)) {
      window.history.replaceState({}, "", formatProductHash(productLocation));
    }
    return () => {
      window.removeEventListener("popstate", syncLocation);
      window.removeEventListener("hashchange", syncLocation);
    };
  }, []);

  useEffect(() => {
    void Promise.all([
      fetch("/api/health").then(getJson<HealthStatus>).then(setHealth),
      fetch("/api/demo").then(getJson<VerificationResult>).then(setResult),
    ]).catch((startupError) => {
      setError(startupError instanceof Error ? startupError.message : "FactRelay could not start. · FactRelay 无法启动。");
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
      setError(verificationError instanceof Error ? verificationError.message : "Verification failed. · 核查失败。");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-shell">
      <div className="product-frame">
        <header className="site-header">
          <a className="brand" href="#relay" aria-label="Fact Atlas home" onClick={(event) => { event.preventDefault(); selectProductView("relay"); }}>
            <span className="brand-mark"><Globe2 size={19} /></span>
            <span className="brand-copy"><strong>Fact Atlas</strong><small>知识星球 · powered by FactRelay</small></span>
          </a>
          <ProductTabs activeView={activeView} className="product-nav" iconSize={14} onSelect={selectProductView} />
          <div className="header-meta">
            <div className="header-runtime" aria-label="Runtime status · 运行状态">
              <span className="header-status"><i className={health?.liveReady ? "pulse-dot connected" : "pulse-dot"} />{health?.liveReady ? "Gonka live · 已连接" : "Preview · 预览"}</span>
              <span className={health?.signalCacheReady ? "header-status cache-ready" : "header-status"}><i className={health?.signalCacheReady ? "pulse-dot cache" : "pulse-dot"} />{health?.signalCacheReady ? "3-day cache · 三日缓存" : "Local cache · 本地缓存"}</span>
            </div>
            <PwaInstall />
            <a href="https://github.com/narratorzhang0307/Fact-Atlas" target="_blank" rel="noreferrer">
              <Github size={16} /> <span>GitHub</span>
            </a>
          </div>
        </header>

        <main id="top" className={`view-${activeView}`}>
          {activeView === "relay" && <div id="relay-view">
          <nav className="relay-pane-tabs" aria-label="FactRelay views · FactRelay 视图">
            <button type="button" className={relayPane === "verify" ? "active" : ""} aria-pressed={relayPane === "verify"} onClick={() => selectRelayPane("verify")}><FileSearch size={16} /><span>Verification<small>事实核验</small></span></button>
            <button type="button" className={relayPane === "council" ? "active" : ""} aria-pressed={relayPane === "council"} onClick={() => selectRelayPane("council")}><Gavel size={16} /><span>Evidence Council<small>多方审理</small></span></button>
          </nav>
          {relayPane === "verify" ? <>
          <section className="hero">
            <div className="hero-copy">
              <span className="hero-eyebrow"><Radio size={14} /> FactRelay engine on Gonka · Gonka 事实中继</span>
              <h1>Build a knowledge world.<br /><em>Every fact keeps receipts.</em></h1>
              <p className="hero-cn">做一张可验证的个人知识地图，让每条事实保留推理回执。</p>
              <p>
                One public claim enters. Independent evidence, two adversarial models, and a replayable
                inference trail come back.
              </p>
              <p className="hero-description-zh">输入一条公开主张，获得独立证据、双模型对抗审查与可重放的推理轨迹。</p>
              <div className="hero-tags" aria-label="Product capabilities">
                <span># live evidence · 实时证据</span>
                <span># two-model review · 双模型审查</span>
                <span># request IDs · 推理回执</span>
                <span># private fact atlas · 私人事实星图</span>
              </div>
            </div>

            <div className={`relay-deck-shell relay-deck-active-${heroBlockIndex + 1}`}>
              <div
                className="relay-console"
                aria-label={`FactRelay route block ${heroBlock.number} of ${HERO_BLOCKS.length}: ${heroBlock.label}`}
                tabIndex={0}
                onKeyDown={(event) => {
                  if (event.key === "ArrowLeft") moveHeroBlock(-1);
                  if (event.key === "ArrowRight") moveHeroBlock(1);
                }}
                onTouchStart={(event) => { heroTouchStartX.current = event.touches[0]?.clientX ?? null; }}
                onTouchEnd={(event) => {
                  if (heroTouchStartX.current === null) return;
                  const distance = event.changedTouches[0]?.clientX - heroTouchStartX.current;
                  heroTouchStartX.current = null;
                  if (Math.abs(distance) > 42) moveHeroBlock(distance > 0 ? -1 : 1);
                }}
              >
                <div className="relay-console-head">
                  <span>Relay block · 中继区块</span>
                  <div className="relay-head-actions">
                    <button type="button" onClick={() => moveHeroBlock(-1)} aria-label="Previous relay block · 上一个区块"><ChevronLeft size={15} /></button>
                    <strong>{health?.liveReady ? "LIVE · 实时" : "PREVIEW · 预览"}</strong>
                    <button type="button" onClick={() => moveHeroBlock(1)} aria-label="Next relay block · 下一个区块"><ChevronRight size={15} /></button>
                  </div>
                </div>
                <div className="relay-console-stat" key={heroBlock.number} aria-live="polite">
                  <strong>{heroBlock.number}</strong>
                  <span>{heroBlock.title}<small>{heroBlock.titleZh}</small><em>{heroBlock.detail}</em></span>
                </div>
                <div className="relay-card-payload" key={`payload-${heroBlock.number}`}>
                  {heroBlockIndex === 0 && (
                    <div className="relay-source-preview" aria-label="Illustrative evidence source previews · 证据来源示意">
                      <div><i className="source-visual source-visual-orbit" role="img" aria-label="Illustrative orbital image · 轨道图像示意" /><span>IMAGE · 图像</span><strong>Visual source</strong></div>
                      <div><i className="source-visual source-visual-page" role="img" aria-label="Illustrative public page · 公开网页示意" /><span>LINK · 链接</span><strong>Public page</strong></div>
                      <div><i className="source-visual source-visual-text" role="img" aria-label="Illustrative text source · 文本来源示意" /><span>TEXT · 文本</span><strong>Source excerpt</strong></div>
                    </div>
                  )}
                  {heroBlockIndex === 1 && (
                    <div className="relay-model-preview" aria-label="Two-model adversarial review · 双模型对抗审查">
                      <div><span>INVESTIGATOR · 调查方</span><strong>Kimi-K2.6</strong></div>
                      <b aria-hidden="true">×</b>
                      <div><span>SKEPTIC · 质疑方</span><strong>MiniMax-M2.7</strong></div>
                    </div>
                  )}
                  {heroBlockIndex === 2 && (
                    <div className="relay-proof-preview" aria-label="Gonka request receipt preview · Gonka 请求回执预览">
                      <span>GONKA REQUEST ID · GONKA 请求回执</span>
                      <code>{health?.liveReady ? "generated on every live run · 每次实时核查生成" : "live runs only — never fabricated · 仅实时生成，绝不伪造"}</code>
                    </div>
                  )}
                </div>
                <div className="relay-route" aria-label="Select a relay block">
                  {HERO_BLOCKS.map((block, index) => (
                    <button
                      type="button"
                      className={index === heroBlockIndex ? "active" : ""}
                      aria-current={index === heroBlockIndex ? "step" : undefined}
                      onClick={() => setHeroBlockIndex(index)}
                      key={block.number}
                    >
                      <span>{block.number}</span>
                      <strong>{block.label} · {block.labelZh}</strong>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <div className={health?.liveReady ? "network-strip connected" : "network-strip"}>
            <span><i /> {health?.liveReady ? "GonkaRouter connected · 已连接" : "Interface preview · 界面预览"}</span>
            <span>Kimi-K2.6 × MiniMax-M2.7</span>
            <span>{health?.liveReady ? "Real request IDs · 真实回执" : "Add a Gonka key · 待接入密钥"}</span>
          </div>

          <AgentOrchestration system={result?.agentSystem} />

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
                  <strong>Verification paused · 核查已暂停</strong>
                  <span>{error}</span>
                  {!health?.liveReady && <small>Add `GONKA_API_KEY` to `.env.local`, then restart the server. · 添加密钥后重启服务。</small>}
                </div>
              )}
              {loading && (
                <div className="loading-card card" aria-live="polite">
                  <div className="loading-orbit"><span /><i /></div>
                  <div>
                    <span className="section-kicker">Live run in progress · 实时核查中</span>
                    <h2>Two models are testing the evidence. <span className="heading-zh">双模型正在审查证据。</span></h2>
                    <p>FactRelay is retrieving sources, running the investigator, then asking the skeptic to challenge it. · FactRelay 正在检索来源，先运行调查方，再由质疑方交叉检查。</p>
                  </div>
                </div>
              )}
              {!loading && result && <>
                <ResultView result={result} />
                <div className="result-next-actions">
                  <button type="button" onClick={() => selectProductView("atlas")}><Archive size={16} /><span>Place in Fact Atlas<small>写入知识星球</small></span></button>
                  <button type="button" onClick={() => selectRelayPane("council")}><Gavel size={16} /><span>Open Evidence Council<small>进入多方审理</small></span></button>
                </div>
              </>}
            </div>
          </section>
          </> : <EvidenceCouncil result={result} onGoRelay={() => selectRelayPane("verify")} onGoAtlas={() => selectProductView("atlas")} />}
          </div>}

          {activeView === "atlas" && <div id="atlas-view"><FactAtlas
            currentResult={result}
            onOpenResult={(atlasResult) => {
              setResult(atlasResult);
              selectProductView("relay");
              window.setTimeout(() => document.querySelector("[data-testid='result-view']")?.scrollIntoView({ behavior: "smooth", block: "start" }), 40);
            }}
          /></div>}
          {activeView === "signals" && <div id="signals-view"><SignalDesk
            onInvestigate={(signal) => {
              setKind("text");
              setContent(signal.claim);
              setImageDataUrl("");
              setImageName("");
              setError("");
              selectProductView("relay");
              window.setTimeout(() => document.querySelector(".workspace")?.scrollIntoView({ behavior: "smooth", block: "start" }), 40);
            }}
          /></div>}
        </main>

        <ProductTabs activeView={activeView} className="mobile-tabbar" iconSize={21} onSelect={selectProductView} />

        <footer>
          <span>Fact Atlas · Relay → Atlas ← Signals · 两种知识路径，一个私人星球</span>
          <span>AI inference exclusively through GonkaRouter · AI 推理仅通过 GonkaRouter</span>
        </footer>
      </div>
    </div>
  );
}
