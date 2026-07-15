import { describe, expect, it } from "vitest";
import { formatProductHash, parseProductHash } from "./navigation";

describe("product navigation", () => {
  it("maps durable hashes to the three product views", () => {
    expect(parseProductHash("#relay")).toEqual({ view: "relay", relayPane: "verify" });
    expect(parseProductHash("#/atlas/")).toEqual({ view: "atlas", relayPane: "verify" });
    expect(parseProductHash("#signals")).toEqual({ view: "signals", relayPane: "verify" });
  });

  it("preserves the Evidence Council as a Relay subview", () => {
    expect(parseProductHash("#relay/council")).toEqual({ view: "relay", relayPane: "council" });
    expect(formatProductHash({ view: "relay", relayPane: "council" })).toBe("#relay/council");
  });

  it("falls back safely for legacy or unknown anchors", () => {
    expect(parseProductHash("#top")).toEqual({ view: "relay", relayPane: "verify" });
    expect(parseProductHash("#unknown")).toEqual({ view: "relay", relayPane: "verify" });
  });
});
