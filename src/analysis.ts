// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Ben Richardson — https://benrichardson.dev
// Additional terms under AGPL-3.0 section 7(b) apply; see ADDITIONAL-TERMS.md.
// Pure functions that surface genuine insights from the data. Unit-tested.
import type { DataStore } from './types';

export interface Insight {
  severity: 'info' | 'notable' | 'headline';
  title: string;
  detail: string;
  metric: string;
}

/** Percentage change of the last value vs the value `back` snapshots earlier. */
export function pctChangeOverSnapshots(series: number[], back: number): number | null {
  const last = series[series.length - 1];
  const ref = series[series.length - 1 - back];
  if (ref === undefined || ref <= 0) return null;
  return (last - ref) / ref;
}

/** Peak value and its index in a series. */
export function peak(series: number[]): { value: number; index: number } {
  let value = -Infinity, index = 0;
  series.forEach((v, i) => { if (v > value) { value = v; index = i; } });
  return { value, index };
}

/** Herfindahl-style concentration: share held by the single largest contributor. */
export function topShare(pairs: { latest: number }[]): number {
  const total = pairs.reduce((a, b) => a + b.latest, 0);
  if (total <= 0) return 0;
  const max = Math.max(...pairs.map((p) => p.latest));
  return max / total;
}

function fmt(n: number): string {
  return Math.round(n).toLocaleString('en-AU');
}
function pct(f: number): string {
  return (f >= 0 ? '+' : '') + (f * 100).toFixed(1) + '%';
}

/** Snapshots covering roughly one year (monthly recent, quarterly older). */
function snapsPerYear(dates: string[]): number {
  if (dates.length < 2) return 4;
  const last = new Date(dates[dates.length - 1]).getTime();
  const prev = new Date(dates[dates.length - 2]).getTime();
  const days = (last - prev) / 86_400_000;
  return days > 60 ? 4 : 12; // quarterly vs monthly cadence
}

export function computeInsights(store: DataStore): Insight[] {
  const { meta, countries, categories } = store;
  const out: Insight[] = [];
  const perYear = snapsPerYear(meta.dates);
  const realCountries = countries.filter((c) => c.iso3);

  // 1. total growth over the whole record
  const growth = (meta.totalLatest - meta.totalEarliest) / meta.totalEarliest;
  out.push({
    severity: 'headline',
    title: 'The temporary population has grown by ' + pct(growth),
    detail: `From ${fmt(meta.totalEarliest)} temporary visa holders in ${new Date(meta.earliestDate).getFullYear()} to ${fmt(meta.totalLatest)} today — an extra ${fmt(meta.totalLatest - meta.totalEarliest)} people.`,
    metric: fmt(meta.totalLatest),
  });

  // 2. biggest source nationality
  const top = realCountries[0];
  if (top) {
    out.push({
      severity: 'headline',
      title: `${top.name} is the largest source`,
      detail: `${fmt(top.latest)} temporary visa holders are ${top.name} citizens — ${((top.latest / meta.totalLatest) * 100).toFixed(1)}% of everyone here on a temporary visa.`,
      metric: fmt(top.latest),
    });
  }

  // 3. fastest-growing sizeable nationality (YoY), min 3,000 holders
  const growers = realCountries
    .filter((c) => c.latest >= 3000)
    .map((c) => ({ c, d: pctChangeOverSnapshots(c.series, perYear) }))
    .filter((x): x is { c: typeof realCountries[0]; d: number } => x.d !== null)
    .sort((a, b) => b.d - a.d);
  if (growers[0]) {
    out.push({
      severity: 'notable',
      title: `${growers[0].c.name} is the fastest-growing nationality`,
      detail: `Up ${pct(growers[0].d)} over the last year to ${fmt(growers[0].c.latest)} holders — the biggest year-on-year rise among sizeable nationalities.`,
      metric: pct(growers[0].d),
    });
  }
  // fastest-falling
  const fallers = growers.filter((x) => x.d < 0).sort((a, b) => a.d - b.d);
  if (fallers[0]) {
    out.push({
      severity: 'notable',
      title: `${fallers[0].c.name} is falling fastest`,
      detail: `Down ${pct(fallers[0].d)} over the last year to ${fmt(fallers[0].c.latest)} holders.`,
      metric: pct(fallers[0].d),
    });
  }

  // 4. largest visa category + its concentration
  const bigCat = categories[0];
  if (bigCat) {
    const share = topShare(bigCat.topCountries);
    out.push({
      severity: 'info',
      title: `${bigCat.name} is the biggest visa category`,
      detail: `${fmt(bigCat.latest)} holders. Its single largest nationality makes up ${(share * 100).toFixed(0)}% of the category.`,
      metric: fmt(bigCat.latest),
    });
  }

  // 5. COVID collapse & rebound for Working Holiday Makers
  const whm = categories.find((c) => c.name === 'Working Holiday Maker');
  if (whm) {
    const pk = peak(whm.series);
    const trough = Math.min(...whm.series);
    if (pk.value > 0) {
      out.push({
        severity: 'notable',
        title: 'Working Holiday Makers collapsed and rebounded',
        detail: `Working-holiday numbers fell to a low of ${fmt(trough)} during COVID border closures and now stand at ${fmt(whm.latest)} — still ${pct((whm.latest - pk.value) / pk.value)} versus their pre-COVID peak of ${fmt(pk.value)}.`,
        metric: fmt(whm.latest),
      });
    }
  }

  // 6. bridging backlog
  const bridging = categories.find((c) => c.name === 'Bridging');
  if (bridging) {
    const chg = pctChangeOverSnapshots(bridging.series, perYear);
    out.push({
      severity: 'info',
      title: 'People waiting on a decision (bridging visas)',
      detail: `${fmt(bridging.latest)} people are on bridging visas${chg !== null ? `, ${pct(chg)} on a year ago` : ''} — a proxy for how many visa decisions and appeals are pending.`,
      metric: fmt(bridging.latest),
    });
  }

  // 7. secondary (family) share overall
  const primary = countries.reduce((a, c) => a + c.primary, 0);
  const secondary = countries.reduce((a, c) => a + c.secondary, 0);
  if (primary + secondary > 0) {
    out.push({
      severity: 'info',
      title: 'Family members on temporary visas',
      detail: `${((secondary / (primary + secondary)) * 100).toFixed(0)}% of temporary visa holders (${fmt(secondary)} people) are secondary applicants — partners and children included on someone else's visa.`,
      metric: `${((secondary / (primary + secondary)) * 100).toFixed(0)}%`,
    });
  }

  return out;
}
