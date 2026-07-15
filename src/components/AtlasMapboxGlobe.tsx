import mapboxgl, { type GeoJSONSource, type Marker } from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { MapPin, Orbit } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { VERDICT_COLOR, type AtlasLink, type AtlasNode } from "../atlas";

interface Props {
  nodes: AtlasNode[];
  links: AtlasLink[];
  selectedId: string;
  centerLng: number;
  onSelect: (id: string) => void;
}

interface MapConfig {
  enabled: boolean;
  token: string | null;
  style: string;
}

function linkData(nodes: AtlasNode[], links: AtlasLink[]): GeoJSON.FeatureCollection<GeoJSON.LineString> {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  return {
    type: "FeatureCollection",
    features: links.flatMap((link) => {
      const from = byId.get(link.from)?.placement;
      const to = byId.get(link.to)?.placement;
      if (!from || !to) return [];
      return [{
        type: "Feature",
        properties: { kind: link.kind, label: link.label },
        geometry: { type: "LineString", coordinates: [[from.lng, from.lat], [to.lng, to.lat]] },
      } satisfies GeoJSON.Feature<GeoJSON.LineString>];
    }),
  };
}

export function AtlasMapboxGlobe({ nodes, links, selectedId, centerLng, onSelect }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<Marker[]>([]);
  const onSelectRef = useRef(onSelect);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => { onSelectRef.current = onSelect; }, [onSelect]);

  useEffect(() => {
    let disposed = false;
    let loaded = false;
    let observer: ResizeObserver | null = null;
    void fetch("/api/map-config").then(async (response) => {
      const config = await response.json() as MapConfig;
      if (disposed || !containerRef.current) return;
      if (!config.enabled || !config.token) {
        setError("Mapbox public token is not configured. · 尚未配置 Mapbox 公开令牌。");
        return;
      }
      mapboxgl.accessToken = config.token;
      const map = new mapboxgl.Map({
        container: containerRef.current,
        style: config.style,
        projection: "globe",
        center: [centerLng, 18],
        zoom: 1.45,
        minZoom: 0.7,
        maxZoom: 9,
        attributionControl: false,
        antialias: true,
      });
      map.addControl(new mapboxgl.AttributionControl({ compact: true }), "bottom-right");
      mapRef.current = map;
      map.on("style.load", () => {
        map.setFog({
          color: "rgba(10,11,10,0.18)",
          "high-color": "#151a17",
          "space-color": "#090a08",
          "horizon-blend": 0.04,
          "star-intensity": 0.08,
        });
      });
      map.on("load", () => {
        loaded = true;
        if (!disposed) setReady(true);
        map.resize();
      });
      map.on("error", (event) => {
        if (!loaded && !disposed) setError(event.error?.message || "Mapbox globe could not load. · Mapbox 地球加载失败。");
      });
      observer = new ResizeObserver(() => map.resize());
      observer.observe(containerRef.current);
    }).catch(() => setError("Map configuration could not load. · 地图配置加载失败。"));

    return () => {
      disposed = true;
      observer?.disconnect();
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];
      mapRef.current?.remove();
      mapRef.current = null;
    };
  // The map is created once; subsequent center changes use easeTo below.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!ready || !mapRef.current) return;
    mapRef.current.easeTo({ center: [centerLng, mapRef.current.getCenter().lat], duration: 650 });
  }, [centerLng, ready]);

  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = nodes.flatMap((node) => {
      if (!node.placement) return [];
      const element = document.createElement("button");
      element.type = "button";
      element.className = `atlas-map-marker${selectedId === node.id ? " selected" : ""}`;
      element.style.setProperty("--marker-color", VERDICT_COLOR[node.result.verdict]);
      element.setAttribute("aria-label", `${node.result.claim} — ${node.placement.label}`);
      element.innerHTML = `<span>${node.result.truthScore}</span>`;
      element.addEventListener("click", () => onSelectRef.current(node.id));
      return [new mapboxgl.Marker({ element, anchor: "bottom" }).setLngLat([node.placement.lng, node.placement.lat]).addTo(map)];
    });

    const data = linkData(nodes, links);
    const source = map.getSource("atlas-links") as GeoJSONSource | undefined;
    if (source) {
      source.setData(data);
    } else {
      map.addSource("atlas-links", { type: "geojson", data });
      map.addLayer({
        id: "atlas-links-layer",
        type: "line",
        source: "atlas-links",
        paint: {
          "line-color": ["match", ["get", "kind"], "shared-evidence", "#b8ff5c", "#bcecf2"],
          "line-width": 2,
          "line-opacity": 0.72,
          "line-dasharray": [2, 2],
        },
      });
    }
  }, [links, nodes, ready, selectedId]);

  const placedCount = nodes.filter((node) => node.placement).length;
  return (
    <div className="atlas-mapbox-stage">
      <div className="atlas-mapbox-canvas" ref={containerRef} />
      {!ready && <div className="atlas-mapbox-fallback" aria-live="polite"><div className="atlas-fallback-sphere" /><Orbit size={20} /><strong>{error || "Loading dark knowledge globe… · 正在加载深色知识地球"}</strong><span>The Atlas remains usable even if the basemap is unavailable. · 底图暂不可用时，知识节点仍可保存。</span></div>}
      {ready && !placedCount && <div className="atlas-empty-globe"><MapPin size={22} /><strong>No fabricated coordinates · 不伪造坐标</strong><span>Confirm a place below, or keep the fact in orbit. · 在下方确认地点，或把事实留在轨道。</span></div>}
      {ready && <span className="atlas-mapbox-badge">MAPBOX DARK GLOBE · 深色知识底图</span>}
    </div>
  );
}
