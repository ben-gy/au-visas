// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Ben Richardson — https://benrichardson.dev
// Additional terms under AGPL-3.0 section 7(b) apply; see ADDITIONAL-TERMS.md.
// One colour per visa category, reused across EVERY view (table pills, treemap,
// trend lines, matrix, flow). Colour-blind-aware qualitative set.

const CATEGORY_COLORS: Record<string, string> = {
  'Special Category': '#64748b', // NZ 444 — slate
  'Student': '#2563eb', // blue
  'Bridging': '#d97706', // amber
  'Visitor': '#7c3aed', // violet
  'Temporary Graduate': '#059669', // emerald
  'Temporary Resident (Skilled Employment)': '#0891b2', // cyan
  'Working Holiday Maker': '#ea580c', // orange
  'Temporary Resident (Other Employment)': '#a16207', // brown
  'Crew and Transit': '#475569', // dark slate
  'Other Temporary': '#db2777', // pink
  'Temporary Protection': '#dc2626', // red
  // legacy categories that may appear in older snapshots
  'Temporary Resident (Skilled)': '#0e7490',
  'Temporary Resident (Other)': '#854d0e',
  'Onshore Protection': '#b91c1c',
  'Offshore Humanitarian': '#9f1239',
};

const FALLBACK = '#94a3b8';

export function categoryColor(name: string): string {
  return CATEGORY_COLORS[name] ?? FALLBACK;
}

/** Sequential blue-green scale for the choropleth / heatmap. t in [0,1]. */
export function sequentialColor(t: number): string {
  const x = Math.max(0, Math.min(1, t));
  // interpolate through a light→teal→deep-navy ramp
  const stops = [
    [235, 245, 249], // #ebf5f9
    [153, 217, 217], // teal-light
    [45, 162, 168], // teal
    [15, 97, 118], // deep teal
    [8, 47, 73], // navy
  ];
  const seg = x * (stops.length - 1);
  const i = Math.min(stops.length - 2, Math.floor(seg));
  const f = seg - i;
  const a = stops[i];
  const b = stops[i + 1];
  const r = Math.round(a[0] + (b[0] - a[0]) * f);
  const g = Math.round(a[1] + (b[1] - a[1]) * f);
  const bl = Math.round(a[2] + (b[2] - a[2]) * f);
  return `rgb(${r}, ${g}, ${bl})`;
}

/** Perceptual scale using a log transform (visa counts span 6 orders of magnitude). */
export function logScale(value: number, max: number): number {
  if (value <= 0 || max <= 0) return 0;
  return Math.log(value + 1) / Math.log(max + 1);
}
