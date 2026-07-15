import { useCallback, useEffect, useState } from "react";
import { formatProductHash, parseProductHash, type ProductLocation, type ProductView, type RelayPane } from "./navigation";

export function preferredScrollBehavior(): ScrollBehavior {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
}

export function useProductNavigation() {
  const [location, setLocation] = useState<ProductLocation>(() => parseProductHash(window.location.hash));

  useEffect(() => {
    const syncLocation = () => setLocation(parseProductHash(window.location.hash));
    const canonicalHash = formatProductHash(parseProductHash(window.location.hash));
    if (window.location.hash !== canonicalHash) window.history.replaceState({}, "", canonicalHash);
    window.addEventListener("popstate", syncLocation);
    window.addEventListener("hashchange", syncLocation);
    return () => {
      window.removeEventListener("popstate", syncLocation);
      window.removeEventListener("hashchange", syncLocation);
    };
  }, []);

  const navigate = useCallback((next: ProductLocation) => {
    setLocation(next);
    const nextHash = formatProductHash(next);
    if (window.location.hash !== nextHash) window.history.pushState({}, "", nextHash);
    window.scrollTo({ top: 0, behavior: preferredScrollBehavior() });
  }, []);

  const selectView = useCallback((view: ProductView) => {
    navigate({ view, relayPane: "verify" });
  }, [navigate]);

  const selectRelayPane = useCallback((relayPane: RelayPane) => {
    navigate({ view: "relay", relayPane });
  }, [navigate]);

  return { location, selectView, selectRelayPane };
}
