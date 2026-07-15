import { Check, ChevronLeft, ChevronRight, ExternalLink, Globe2, MapPin, Orbit, Search, Trash2 } from "lucide-react";
import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import {
  buildAtlasLinks,
  loadAtlasNodes,
  removeAtlasNode,
  saveAtlasNode,
  subscribeAtlas,
  VERDICT_COLOR,
  type AtlasNode,
  type AtlasPlacement,
} from "../atlas";
import type { VerificationResult } from "../types";

const AtlasMapboxGlobe = lazy(() => import("./AtlasMapboxGlobe").then((module) => ({ default: module.AtlasMapboxGlobe })));

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

const ORBIT_POSITIONS = [
  { left: "12%", top: "20%" },
  { left: "80%", top: "16%" },
  { left: "85%", top: "70%" },
  { left: "14%", top: "76%" },
] as const;

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
          <span className="hero-eyebrow"><Orbit size={14} /> Fact Atlas · 知识星球</span>
          <h2 id="atlas-title">Verify a claim. <em>Place only what survives.</em></h2>
          <p>FactRelay turns verified claims into a private spatial knowledge lineage—without inventing a location. · 把核验后的主张变成可验证的个人知识地图，但绝不虚构坐标。</p>
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
            <Suspense fallback={<div className="atlas-mapbox-fallback"><div className="atlas-fallback-sphere" /><Orbit size={20} /><strong>Loading dark knowledge globe… · 正在加载深色知识地球</strong></div>}>
              <AtlasMapboxGlobe nodes={nodes} links={links} selectedId={selectedId} centerLng={centerLng} onSelect={setSelectedId} />
            </Suspense>

            {unplaced.length > 0 && (
              <div className="atlas-orbit" aria-label="Unplaced facts · 未落位事实">
                {unplaced.slice(0, 4).map((node, index) => (
                  <button key={node.id} type="button" style={ORBIT_POSITIONS[index]} onClick={() => setSelectedId(node.id)} title={node.result.claim}>
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
            <h3>{currentSaved ? "This case is in your Atlas." : "Place the current case."}<small>{currentSaved ? "当前案例已进入知识星球。" : "把当前核验结果放入知识星球。"}</small></h3>
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
            ) : <p className="atlas-no-case">Your private Atlas is empty. Saving a fact stores its full evidence snapshot in this browser. · 你的私人知识星球还是空的；保存后，完整证据快照只留在当前浏览器。</p>}
          </article>
        </div>
      </div>
    </section>
  );
}
