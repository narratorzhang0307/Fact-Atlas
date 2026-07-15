import { describe, expect, it } from "vitest";
import {
  ATLAS_STORAGE_KEY,
  buildAtlasLinks,
  clearAtlas,
  greatCircleKm,
  loadAtlasNodes,
  projectToGlobe,
  removeAtlasNode,
  saveAtlasNode,
  type AtlasPlacement,
} from "./atlas";
import type { VerificationResult } from "./types";

class MemoryStorage {
  values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
  removeItem(key: string) { this.values.delete(key); }
}

class UnavailableStorage extends MemoryStorage {
  setItem(): void { throw new Error("storage blocked"); }
}

function result(id: string, url = "https://example.com/source"): VerificationResult {
  return {
    id,
    createdAt: "2026-07-15T00:00:00.000Z",
    mode: "live",
    inputKind: "text",
    claim: `Claim ${id}`,
    verdict: "supported",
    truthScore: 88,
    confidence: 91,
    summary: "Summary",
    scoring: { modelConsensus: 90, evidenceBalance: 85, sourceCoverage: 80, modelAgreement: 95, formula: "deterministic" },
    sources: [{ id: "s1", title: "Source", url, publisher: "Example", publishedAt: null, snippet: "", origin: "test", stance: "support", reliability: 90, reason: "" }],
    models: [],
    missingEvidence: [],
    trace: [],
  };
}

const beijing: AtlasPlacement = { label: "Beijing", lat: 39.9, lng: 116.4, precision: "regional", confirmedByUser: true };

describe("Fact Atlas local model", () => {
  it("stores a complete verification snapshot and replaces duplicates", () => {
    const storage = new MemoryStorage();
    saveAtlasNode(result("fr_one"), beijing, storage, new Date("2026-07-15T01:00:00Z"));
    saveAtlasNode({ ...result("fr_one"), truthScore: 92 }, beijing, storage, new Date("2026-07-15T02:00:00Z"));
    expect(loadAtlasNodes(storage)).toHaveLength(1);
    expect(loadAtlasNodes(storage)[0]).toMatchObject({ id: "fr_one", result: { truthScore: 92 }, placement: { confirmedByUser: true } });
  });

  it("rejects invalid coordinates instead of inventing a map position", () => {
    const storage = new MemoryStorage();
    expect(() => saveAtlasNode(result("fr_bad"), { ...beijing, lat: 120 }, storage)).toThrow("Invalid Atlas placement");
    expect(storage.getItem(ATLAS_STORAGE_KEY)).toBeNull();
  });

  it("allows an explicitly unplaced fact and supports removal", () => {
    const storage = new MemoryStorage();
    saveAtlasNode(result("fr_unplaced"), null, storage);
    expect(loadAtlasNodes(storage)[0].placement).toBeNull();
    removeAtlasNode("fr_unplaced", storage);
    expect(loadAtlasNodes(storage)).toEqual([]);
    clearAtlas(storage);
    expect(storage.getItem(ATLAS_STORAGE_KEY)).toBeNull();
  });

  it("reports a failed write instead of pretending the fact was saved", () => {
    expect(() => saveAtlasNode(result("fr_blocked"), null, new UnavailableStorage())).toThrow("Atlas storage is unavailable");
    expect(() => saveAtlasNode(result("fr_missing"), null, null)).toThrow("Atlas storage is unavailable");
  });

  it("rejects malformed or unsafe evidence snapshots from browser storage", () => {
    const storage = new MemoryStorage();
    const unsafe = result("fr_unsafe", "javascript:alert(1)");
    storage.setItem(ATLAS_STORAGE_KEY, JSON.stringify([{ id: unsafe.id, savedAt: "2026-07-15T00:00:00.000Z", placement: null, result: unsafe }]));
    expect(loadAtlasNodes(storage)).toEqual([]);
    expect(() => saveAtlasNode(unsafe, null, storage)).toThrow("Invalid verification result");

    const mismatched = result("fr_result");
    storage.setItem(ATLAS_STORAGE_KEY, JSON.stringify([{ id: "fr_node", savedAt: "2026-07-15T00:00:00.000Z", placement: null, result: mismatched }]));
    expect(loadAtlasNodes(storage)).toEqual([]);
  });

  it("links only explainable shared evidence or nearby nodes", () => {
    const storage = new MemoryStorage();
    const a = saveAtlasNode(result("fr_a"), beijing, storage);
    const b = saveAtlasNode(result("fr_b"), { ...beijing, label: "Great Wall", lat: 40.43, lng: 116.57 }, storage);
    const c = saveAtlasNode(result("fr_c", "https://other.example/source"), { ...beijing, label: "Paris", lat: 48.86, lng: 2.35 }, storage);
    expect(buildAtlasLinks([a, b, c])).toEqual([{ from: "fr_a", to: "fr_b", kind: "shared-evidence", label: "Shared source · 共用来源" }]);
    expect(greatCircleKm(beijing, b.placement!)).toBeLessThan(100);
  });

  it("projects front-side coordinates and hides the back hemisphere", () => {
    expect(projectToGlobe({ lat: 39.9, lng: 116.4 }, 105)).toMatchObject({ visible: true });
    expect(projectToGlobe({ lat: 39.9, lng: -73.9 }, 105)).toMatchObject({ visible: false });
  });
});
