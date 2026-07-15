export const PRODUCT_VIEWS = ["relay", "atlas", "signals"] as const;

export type ProductView = (typeof PRODUCT_VIEWS)[number];
export type RelayPane = "verify" | "council";

export interface ProductLocation {
  view: ProductView;
  relayPane: RelayPane;
}

export const DEFAULT_PRODUCT_LOCATION: ProductLocation = {
  view: "relay",
  relayPane: "verify",
};

export function parseProductHash(hash: string): ProductLocation {
  const route = hash.replace(/^#\/?/, "").replace(/\/+$/, "").toLowerCase();
  if (route === "relay/council" || route === "council") {
    return { view: "relay", relayPane: "council" };
  }
  if (route === "atlas") return { view: "atlas", relayPane: "verify" };
  if (route === "signals") return { view: "signals", relayPane: "verify" };
  return DEFAULT_PRODUCT_LOCATION;
}

export function formatProductHash(location: ProductLocation): string {
  if (location.view === "relay" && location.relayPane === "council") return "#relay/council";
  return `#${location.view}`;
}
