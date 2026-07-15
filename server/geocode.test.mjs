import { describe, expect, it, vi } from "vitest";
import { geocodePlace } from "./geocode.mjs";

describe("non-AI place lookup", () => {
  it("validates the query before making a request", async () => {
    const request = vi.fn();
    await expect(geocodePlace("x", { request })).rejects.toMatchObject({ code: "INVALID_PLACE_QUERY", status: 400 });
    expect(request).not.toHaveBeenCalled();
  });

  it("normalizes valid candidates and rejects invalid coordinates", async () => {
    const request = vi.fn(async () => new Response(JSON.stringify([
      { place_id: 1, lat: "40.4319", lon: "116.5704", display_name: "Great Wall, Beijing, China", type: "monument" },
      { place_id: 2, lat: "999", lon: "0", display_name: "Invalid" },
    ]), { status: 200, headers: { "Content-Type": "application/json" } }));
    await expect(geocodePlace("Great Wall", { request })).resolves.toEqual([{
      id: "1",
      label: "Great Wall, Beijing, China",
      lat: 40.4319,
      lng: 116.5704,
      precision: "exact",
      source: "OpenStreetMap Nominatim",
    }]);
    expect(String(request.mock.calls[0][0])).toContain("q=Great+Wall");
  });

  it("turns upstream failures into a safe visible error", async () => {
    await expect(geocodePlace("Beijing", { request: async () => new Response("", { status: 429 }) }))
      .rejects.toMatchObject({ code: "GEOCODER_UNAVAILABLE", status: 502 });
  });
});
