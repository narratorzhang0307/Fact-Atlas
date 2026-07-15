export const MAPBOX_STYLE = "mapbox://styles/mapbox/dark-v11";

export function getMapboxConfig(env = typeof process === "undefined" ? {} : process.env) {
  const token = String(env.MAPBOX_PUBLIC_TOKEN || env.VITE_MAPBOX_TOKEN || "").trim();
  return {
    enabled: token.startsWith("pk."),
    token: token.startsWith("pk.") ? token : null,
    style: MAPBOX_STYLE,
  };
}
