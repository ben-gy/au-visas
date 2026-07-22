// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Ben Richardson — https://benrichardson.dev
// Additional terms under AGPL-3.0 section 7(b) apply; see ADDITIONAL-TERMS.md.
// Formatting helpers. All display numbers use these.

export function formatNumber(n: number): string {
  if (!isFinite(n)) return '—';
  return Math.round(n).toLocaleString('en-AU');
}

/** Compact form for axis labels / tiles: 1.2M, 736k, 512. */
export function formatCompact(n: number): string {
  if (!isFinite(n)) return '—';
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return (n / 1_000_000).toFixed(abs >= 10_000_000 ? 0 : 1) + 'M';
  if (abs >= 1_000) return Math.round(n / 1_000) + 'k';
  return String(Math.round(n));
}

export function formatPercent(fraction: number, dp = 1): string {
  if (!isFinite(fraction)) return '—';
  return (fraction * 100).toFixed(dp) + '%';
}

/** Signed percentage change with + / − and a leading arrow-free style. */
export function formatDelta(fraction: number, dp = 1): string {
  if (!isFinite(fraction)) return '—';
  const pct = fraction * 100;
  const sign = pct > 0 ? '+' : '';
  return `${sign}${pct.toFixed(dp)}%`;
}

/** Turn "2026-05-31" into "May 2026". */
export function formatMonthYear(iso: string): string {
  const d = new Date(iso + 'T00:00:00Z');
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-AU', { month: 'short', year: 'numeric', timeZone: 'UTC' });
}

/** Turn "2026-05-31" into "31 May 2026". */
export function formatFullDate(iso: string): string {
  const d = new Date(iso + 'T00:00:00Z');
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
}

export function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}
