"use client";

import { useCallback, useSyncExternalStore } from "react";

function subscribe(query: string, callback: () => void) {
  const media = window.matchMedia(query);
  media.addEventListener("change", callback);
  return () => media.removeEventListener("change", callback);
}

function getSnapshot(query: string) {
  return window.matchMedia(query).matches;
}

function getServerSnapshot() {
  return false;
}

export function useMediaQuery(query: string) {
  const subscribeFn = useCallback((callback: () => void) => subscribe(query, callback), [query]);
  const snapshotFn = useCallback(() => getSnapshot(query), [query]);

  return useSyncExternalStore(subscribeFn, snapshotFn, getServerSnapshot);
}
