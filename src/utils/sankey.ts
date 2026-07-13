// Pure Sankey column layout. Given node values, a column height and a gap,
// return a { y, h } box per node — stacked top-to-bottom, heights proportional
// to value, no overlap, all inside [0, height]. Exported separately so it can
// be unit-tested with positional assertions (see tests/sankey.test.ts).

export interface Slot { y: number; h: number }

export function layoutColumn(values: number[], height: number, gap: number, minH = 1): Slot[] {
  const n = values.length;
  if (n === 0) return [];
  const total = values.reduce((a, b) => a + Math.max(0, b), 0);
  const avail = Math.max(0, height - (n - 1) * gap);
  const scale = total > 0 ? avail / total : 0;
  const slots: Slot[] = [];
  let y = 0;
  for (let i = 0; i < n; i++) {
    const h = total > 0 ? Math.max(minH, Math.max(0, values[i]) * scale) : avail / n;
    slots.push({ y, h });
    y += h + gap;
  }
  // If min-height padding pushed the stack past `height`, compress proportionally.
  const used = y - gap;
  if (used > height + 1e-6 && used > 0) {
    const factor = (height - (n - 1) * gap) / (used - (n - 1) * gap);
    let yy = 0;
    for (const s of slots) { s.h = Math.max(0, s.h * factor); s.y = yy; yy += s.h + gap; }
  }
  return slots;
}
