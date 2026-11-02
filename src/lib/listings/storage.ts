"use client";
/**
 * Small localStorage-backed stores (saved cars, recently viewed, saved searches,
 * preferred city). Hydration-safe: the server snapshot is always empty/default.
 */
import { useCallback, useSyncExternalStore } from "react";

const EVT = "wowcars-storage";

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable */
  }
  window.dispatchEvent(new CustomEvent(EVT, { detail: key }));
}

function subscribe(cb: () => void) {
  window.addEventListener(EVT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(EVT, cb);
    window.removeEventListener("storage", cb);
  };
}

// Snapshot caching so useSyncExternalStore gets a stable reference.
const cache = new Map<string, { raw: string | null; value: unknown }>();
function snapshot<T>(key: string, fallback: T): T {
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(key);
  } catch {
    raw = null;
  }
  const hit = cache.get(key);
  if (hit && hit.raw === raw) return hit.value as T;
  const value = raw ? (JSON.parse(raw) as T) : fallback;
  cache.set(key, { raw, value });
  return value;
}

function useStored<T>(key: string, fallback: T): T {
  return useSyncExternalStore(
    subscribe,
    () => snapshot(key, fallback),
    () => fallback,
  );
}

/* ---------------- saved cars ---------------- */
const SAVED_KEY = "wowcars-saved-cars";
const EMPTY: string[] = [];

export function useSavedCars() {
  const saved = useStored<string[]>(SAVED_KEY, EMPTY);
  const toggle = useCallback((code: string) => {
    const cur = read<string[]>(SAVED_KEY, []);
    write(SAVED_KEY, cur.includes(code) ? cur.filter((c) => c !== code) : [code, ...cur]);
  }, []);
  return { saved, toggle, isSaved: (code: string) => saved.includes(code) };
}

/* ---------------- recently viewed ---------------- */
const RECENT_KEY = "wowcars-recently-viewed";

export function useRecentlyViewed() {
  return useStored<string[]>(RECENT_KEY, EMPTY);
}

export function pushRecentlyViewed(code: string) {
  const cur = read<string[]>(RECENT_KEY, []);
  write(RECENT_KEY, [code, ...cur.filter((c) => c !== code)].slice(0, 12));
}

/* ---------------- saved searches ---------------- */
const SEARCH_KEY = "wowcars-saved-searches";
export interface SavedSearch { query: string; label: string; savedAt: string }
const EMPTY_SEARCHES: SavedSearch[] = [];

export function useSavedSearches() {
  const list = useStored<SavedSearch[]>(SEARCH_KEY, EMPTY_SEARCHES);
  const save = useCallback((s: SavedSearch) => {
    const cur = read<SavedSearch[]>(SEARCH_KEY, []);
    write(SEARCH_KEY, [s, ...cur.filter((x) => x.query !== s.query)].slice(0, 10));
  }, []);
  return { list, save, has: (query: string) => list.some((x) => x.query === query) };
}

/* ---------------- preferred city ---------------- */
const CITY_KEY = "wowcars-city";
export const DEFAULT_CITY = "Bengaluru";

export function useCity() {
  const city = useStored<string>(CITY_KEY, DEFAULT_CITY);
  const setCity = useCallback((c: string) => write(CITY_KEY, c), []);
  return { city, setCity };
}
