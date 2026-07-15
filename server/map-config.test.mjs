import { describe, expect, it } from "vitest";
import { getMapboxConfig, MAPBOX_STYLE } from "./map-config.mjs";

describe("Mapbox public configuration", () => {
  it("exposes only public browser tokens", () => {
    expect(getMapboxConfig({ MAPBOX_PUBLIC_TOKEN: "pk.public-test" })).toEqual({ enabled: true, token: "pk.public-test", style: MAPBOX_STYLE });
    expect(getMapboxConfig({ MAPBOX_PUBLIC_TOKEN: "sk.secret-test" })).toEqual({ enabled: false, token: null, style: MAPBOX_STYLE });
  });

  it("supports the Pocket Earth local environment variable", () => {
    expect(getMapboxConfig({ VITE_MAPBOX_TOKEN: "pk.pocket-earth" }).enabled).toBe(true);
  });
});
