// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Ben Richardson — https://benrichardson.dev
// Additional terms under AGPL-3.0 section 7(b) apply; see ADDITIONAL-TERMS.md.
import type { Category, Country, DataStore, Meta, Subclass } from './types';

const BASE = import.meta.env.BASE_URL || '/';

async function loadJson<T>(path: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(`${BASE}data/${path}`, { signal });
  if (!res.ok) throw new Error(`Failed to load ${path} (${res.status})`);
  return res.json() as Promise<T>;
}

export async function loadData(signal?: AbortSignal): Promise<DataStore> {
  const [meta, countries, categories, subclasses] = await Promise.all([
    loadJson<Meta>('meta.json', signal),
    loadJson<Country[]>('countries.json', signal),
    loadJson<Category[]>('categories.json', signal),
    loadJson<Subclass[]>('subclasses.json', signal),
  ]);
  const countryByIso = new Map<string, Country>();
  for (const c of countries) if (c.iso3) countryByIso.set(c.iso3, c);
  return { meta, countries, categories, subclasses, countryByIso };
}

/** Value at a given date index (safe). */
export function seriesAt(series: number[], idx: number): number {
  return series[idx] ?? 0;
}

/** Year-on-year change: latest vs the snapshot ~12 months earlier. */
export function yoyChange(series: number[], dates: string[]): { from: number; to: number; delta: number } | null {
  if (series.length < 2) return null;
  const lastIdx = series.length - 1;
  const targetYear = new Date(dates[lastIdx]).getFullYear() - 1;
  let refIdx = -1;
  for (let i = lastIdx - 1; i >= 0; i--) {
    if (new Date(dates[i]).getFullYear() === targetYear) { refIdx = i; break; }
  }
  if (refIdx < 0) refIdx = Math.max(0, lastIdx - 4);
  const from = series[refIdx];
  const to = series[lastIdx];
  if (from <= 0) return null;
  return { from, to, delta: (to - from) / from };
}
