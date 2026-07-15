import { Check, ChevronLeft, ChevronRight, ExternalLink, Globe2, MapPin, Orbit, Search, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import {
  buildAtlasLinks,
  loadAtlasNodes,
  projectToGlobe,
  removeAtlasNode,
  saveAtlasNode,
  subscribeAtlas,
  VERDICT_COLOR,
  type AtlasNode,
  type AtlasPlacement,
} from "../atlas";
import type { VerificationResult } from "../types";

interface GeocodeCandidate {
  id: string;
  label: string;
  lat: number;
  lng: number;
  precision: AtlasPlacement["precision"];
  source: string;
}

interface Props {
  currentResult: VerificationResult | null;
  onOpenResult: (result: VerificationResult) => void;
}

const VERDICT_LABEL = {
  supported: "Supported · 获支持",
  refuted: "Refuted · 事实不符",
  mixed: "Mixed · 证据混合",
  insufficient: "Insufficient · 证据不足",
} as const;

function shortPlace(label: string): string {
  return label.split(",").slice(0, 2).join(", ").slice(0, 48);
}

export function FactAtlas({ currentResult, onOpenResult }: Props) {
  const [nodes, setNodes] = useState<AtlasNode[]>(loadAtlasNodes);
  const [selectedId, setSelectedId] = useState("");
  const [centerLng, setCenterLng] = useState(105);
  const [query, setQuery] = useState("");
  const [candidates, setCandidates] = useState<GeocodeCandidate[]>([]);
  const [lookupBusy, setLookupBusy] = useState(false);
  const [lookupError, setLookupError] = useState("");

  useEffect(() => subscribeAtlas(() => setNodes(loadAtlasNodes())), []);
  useEffect(() => {
    if (!selectedId && nodes[0]) setSelectedId(nodes[0].id);
    if (selectedId && !nodes.some((node) => node.id === selectedId)) setSelectedId(nodes[0]?.id || "");
  }, [nodes, selectedId]);
  useEffect(() => {
    setCandidates([]);
    setLookupError("");
    setQuery(currentResult?.claim.toLowerCase().includes("great wall") ? "Great Wall of China" : "");
  }, [currentResult?.id, currentResult?.claim]);

  const links = useMemo(() => buildAtlasLinks(nodes), [nodes]);
  const projected = useMemo(() => new Map(nodes.flatMap((node) => {
    if (!node.placement) return [];
    const point = projectToGlobe(node.placement, centerLng);
    return [[node.id, point] as const];
  })), [nodes, centerLng]);
  const selected = nodes.find((node) => node.id === selectedId) || null;
  const currentSaved = currentResult ? nodes.some((node) => node.id === currentResult.id) : false;
  const placedCount = nodes.filter((node) => node.placement).length;
  const unplaced = nodes.filter((node) => !node.placement);

  const rotate = (direction: -1 | 1) => setCenterLng((value) => {
    const next = value + direction * 30;
    return ((next + 180) % 360 + 360) % 360 - 180;
  });

  const lookup = async () => {
    if (query.trim().length < 2) return;
    setLookupBusy(true);
    setLookupError("");
    setCandidates([]);
    try {
      const response = await fetch(`/api/geocode?q=${encodeURIComponent(query.trim())}`);
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error?.message || "Place lookup failed. · 地点检索失败。");
      setCandidates(Array.isArray(payload.candidates) ? payload.candidates : []);
      if (!payload.candidates?.length) setLookupError("No place matched. Save it unplaced or try a broader name. · 未找到地点，可留在轨道或换一个更宽泛的名称。");
    } catch (error) {
      setLookupError(error instanceof Error ? error.message : "Place lookup failed. · 地点检索失败。");
    } finally {
      setLookupBusy(false);
    }
  };

  const store = (placement: AtlasPlacement | null) => {
    if (!currentResult) return;
    const node = saveAtlasNode(currentResult, placement);
    setNodes(loadAtlasNodes());
    setSelectedId(node.id);
    if (placement) setCenterLng(placement.lng);
    setCandidates([]);
  };

  return (
    <section className="atlas-section" id="atlas" aria-labelledby="atlas-title">
      <header className="atlas-heading">
        <div>
          <span className="hero-eyebrow"><Orbit size={14} /> Fact Atlas · 事实星图</span>
          <h2 id="atlas-title">Verify a claim. <em>Place only what survives.</em></h2>
          <p>FactRelay turns verified claims into a private spatial knowledge lineage—without inventing a location. · 把核验后的主张变成私人空间知识谱系，但绝不虚构坐标。</p>
        </div>
        <div className="atlas-stats" aria-label="Fact Atlas statistics">
          <div><strong>{nodes.length}</strong><span>Saved facts<br />已存事实</span></div>
          <div><strong>{placedCount}</strong><span>Placed<br />已落位</span></div>
          <div><strong>{links.length}</strong><span>Explainable links<br />可解释关系</span></div>
        </div>
      </header>

      <div className="atlas-grid">
        <div className="atlas-globe-card">
          <div className="atlas-toolbar">
            <span><Globe2 size={15} /> Private knowledge globe · 私人知识地球</span>
            <div>
              <button type="button" onClick={() => rotate(-1)} aria-label="Rotate globe left · 向左旋转"><ChevronLeft size={17} /></button>
              <code>{centerLng >= 0 ? `${Math.round(centerLng)}°E` : `${Math.abs(Math.round(centerLng))}°W`}</code>
              <button type="button" onClick={() => rotate(1)} aria-label="Rotate globe right · 向右旋转"><ChevronRight size={17} /></button>
            </div>
          </div>

          <div className="atlas-globe-wrap">
            <svg className="atlas-globe" viewBox="0 0 600 600" role="img" aria-label="Interactive globe of verified fact nodes · 已核验事实节点地球">
              <defs>
                <radialGradient id="atlas-ocean" cx="35%" cy="28%" r="78%">
                  <stop offset="0" stopColor="#38374d" />
                  <stop offset=".58" stopColor="#181914" />
                  <stop offset="1" stopColor="#090a08" />
                </radialGradient>
                <clipPath id="atlas-sphere"><circle cx="300" cy="300" r="232" /></clipPath>
              </defs>
              <circle cx="312" cy="315" r="232" fill="#7865ff" opacity=".92" />
              <circle cx="300" cy="300" r="232" fill="url(#atlas-ocean)" stroke="#f8f7f2" strokeWidth="3" />
              <g clipPath="url(#atlas-sphere)" className="atlas-grid-lines">
                {[128, 206, 300, 394, 472].map((cy, index) => <ellipse key={`lat-${cy}`} cx="300" cy={cy} rx={Math.sqrt(Math.max(0, 232 ** 2 - (cy - 300) ** 2))} ry={index === 2 ? 0 : 18} />)}
                {[-62, -31, 0, 31, 62].map((rotation) => <ellipse key={`lng-${rotation}`} cx="300" cy="300" rx="72" ry="232" transform={`rotate(${rotation} 300 300)`} />)}
                <path className="atlas-land" d="M208 142l48 18 30 39-16 32 26 36-22 35-53-13-25-38-42-24 12-47zM340 154l61 8 35 32-7 42 31 24-18 35-43-2-27 45-17 63-39 10-28-41 14-39-23-41 23-28 6-48zM410 386l52 24 19 48-31 38-58-11-17-52z" />
              </g>

              {links.map((link) => {
                const from = projected.get(link.from);
                const to = projected.get(link.to);
                if (!from?.visible || !to?.visible) return null;
                return <line key={`${link.from}-${link.to}`} className={`atlas-link atlas-link-${link.kind}`} x1={300 + from.x * 232} y1={300 + from.y * 232} x2={300 + to.x * 232} y2={300 + to.y * 232} />;
              })}

              {nodes.map((node) => {
                const point = projected.get(node.id);
                if (!point?.visible) return null;
                const x = 300 + point.x * 232;
                const y = 300 + point.y * 232;
                const color = VERDICT_COLOR[node.result.verdict];
                return (
                  <g key={node.id} className={`atlas-node ${selectedId === node.id ? "selected" : ""}`} transform={`translate(${x} ${y})`} onClick={() => setSelectedId(node.id)} role="button" tabIndex={0} aria-label={`${node.result.claim} — ${node.placement?.label}`}>
                    <circle r="19" fill={color} opacity=".2" />
                    <circle r="9" fill={color} stroke="#11120f" strokeWidth="3" />
                    <text x="14" y="-13">{node.result.truthScore}</text>
                  </g>
                );
              })}
            </svg>

            {!placedCount && (
              <div className="atlas-empty-globe">
                <MapPin size={22} />
                <strong>No fabricated coordinates · 不伪造坐标</strong>
                <span>Confirm a place below, or keep the fact in orbit. · 在下方确认地点，或把事实留在轨道。</span>
              </div>
            )}

            {unplaced.length > 0 && (
              <div className="atlas-orbit" aria-label="Unplaced facts · 未落位事实">
                {unplaced.slice(0, 4).map((node, index) => (
                  <button key={node.id} type="button" style={{ "--orbit-index": index } as CSSProperties} onClick={() => setSelectedId(node.id)} title={node.result.claim}>
                    {node.result.truthScore}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="atlas-legend">
            {Object.entries(VERDICT_COLOR).map(([verdict, color]) => <span key={verdict}><i style={{ background: color }} />{VERDICT_LABEL[verdict as keyof typeof VERDICT_LABEL]}</span>)}
          </div>
        </div>

        <div className="atlas-side">
          <article className="atlas-save-card">
            <span className="block-stamp"><span>NEW NODE · 新节点</span><code>{currentResult ? currentResult.id.slice(-10).toUpperCase() : "NO CASE"}</code></span>
            <h3>{currentSaved ? "This case is in your Atlas." : "Place the current case."}<small>{currentSaved ? "当前案例已进入事实星图。" : "把当前核验结果放入星图。"}</small></h3>
            {currentResult ? (
              <>
                <p className="atlas-current-claim">{currentResult.claim}</p>
                <div className="atlas-current-meta"><span style={{ background: VERDICT_COLOR[currentResult.verdict] }}>{currentResult.truthScore}</span><strong>{VERDICT_LABEL[currentResult.verdict]}</strong><small>{currentResult.mode === "live" ? "Live receipts preserved · 已保留真实回执" : "Preview fixture · 预览样例"}</small></div>
                <form onSubmit={(event) => { event.preventDefault(); void lookup(); }} className="atlas-place-form">
                  <label htmlFor="atlas-place">Place name · 地点名称</label>
                  <div><input id="atlas-place" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Great Wall of China / 中国长城" /><button type="submit" disabled={lookupBusy || query.trim().length < 2}><Search size={15} />{lookupBusy ? "…" : "Find · 查找"}</button></div>
                </form>
                {lookupError && <p className="atlas-lookup-error">{lookupError}</p>}
                {candidates.length > 0 && <div className="atlas-candidates">{candidates.map((candidate) => (
                  <button key={candidate.id} type="button" onClick={() => store({ label: candidate.label, lat: candidate.lat, lng: candidate.lng, precision: candidate.precision, confirmedByUser: true })}>
                    <MapPin size={15} /><span><strong>{shortPlace(candidate.label)}</strong><small>{candidate.lat.toFixed(4)}, {candidate.lng.toFixed(4)} · {candidate.source}</small></span><Check size={15} />
                  </button>
                ))}</div>}
                <button type="button" className="atlas-unplaced-button" onClick={() => store(null)}><Orbit size={15} /> Save unplaced · 暂不落位</button>
              </>
            ) : <p className="atlas-no-case">Run or open a verification first. · 请先运行或打开一个核验案例。</p>}
          </article>

          <article className="atlas-node-card">
            <span className="block-stamp"><span>SELECTED · 已选节点</span><code>{selected ? selected.savedAt.slice(0, 10) : "EMPTY"}</code></span>
            {selected ? (
              <>
                <div className="atlas-node-score" style={{ background: VERDICT_COLOR[selected.result.verdict] }}><strong>{selected.result.truthScore}</strong><span>/100</span></div>
                <h3>{selected.result.claim}</h3>
                <p>{selected.result.summary}</p>
                <div className="atlas-node-facts">
                  <span><MapPin size={13} />{selected.placement ? shortPlace(selected.placement.label) : "Unplaced orbit · 未落位轨道"}</span>
                  <span><ExternalLink size={13} />{selected.result.sources.length} sources · 来源</span>
                  <span><Orbit size={13} />{selected.result.trace.filter((step) => step.requestId).length} Gonka receipts · 回执</span>
                </div>
                <div className="atlas-node-actions">
                  <button type="button" onClick={() => onOpenResult(selected.result)}>Open evidence chain · 打开证据链</button>
                  <button type="button" aria-label="Remove fact node · 删除事实节点" onClick={() => { removeAtlasNode(selected.id); setNodes(loadAtlasNodes()); }}><Trash2 size={15} /></button>
                </div>
              </>
            ) : <p className="atlas-no-case">Your private Atlas is empty. Saving a fact stores its full evidence snapshot in this browser. · 你的私人星图还是空的；保存后，完整证据快照只留在当前浏览器。</p>}
          </article>
        </div>
      </div>
    </section>
  );
}
