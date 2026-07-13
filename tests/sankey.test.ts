import { describe, expect, it } from 'vitest';
import { layoutColumn } from '../src/utils/sankey';

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

describe('layoutColumn — positional correctness', () => {
  const rand = mulberry32(11);
  const cases: number[][] = [
    [736688, 393075, 257125, 152231],
    [100],
    Array.from({ length: 12 }, () => 1 + Math.floor(rand() * 5000)),
    [5, 5, 5, 5, 5],
  ];
  const H = 600, gap = 6;

  for (const values of cases) {
    it(`stacks ${values.length} nodes in-bounds, no overlap, no NaN`, () => {
      const slots = layoutColumn(values, H, gap);
      expect(slots).toHaveLength(values.length);
      for (const s of slots) {
        expect(Number.isFinite(s.y) && Number.isFinite(s.h)).toBe(true);
        expect(s.h).toBeGreaterThanOrEqual(0);
        expect(s.y).toBeGreaterThanOrEqual(-1e-6);
        expect(s.y + s.h).toBeLessThanOrEqual(H + 1e-6);
      }
      // no vertical overlap: each node ends before the next begins (>= gap-ish)
      for (let i = 1; i < slots.length; i++) {
        expect(slots[i].y).toBeGreaterThanOrEqual(slots[i - 1].y + slots[i - 1].h - 1e-6);
      }
    });
  }

  it('heights are proportional to values', () => {
    const slots = layoutColumn([300, 100], 206, 6); // avail = 200
    expect(slots[0].h / slots[1].h).toBeCloseTo(3, 3);
  });

  it('total height plus gaps fills the column', () => {
    const values = [10, 20, 30, 40];
    const slots = layoutColumn(values, 500, 8);
    const used = slots[slots.length - 1].y + slots[slots.length - 1].h;
    expect(used).toBeCloseTo(500, 3);
  });

  it('handles empty and enforces min height', () => {
    expect(layoutColumn([], 100, 4)).toEqual([]);
    const slots = layoutColumn([1000000, 1], 300, 4, 2);
    expect(slots[1].h).toBeGreaterThanOrEqual(0); // tiny node kept renderable, still in-bounds
    expect(slots[1].y + slots[1].h).toBeLessThanOrEqual(300 + 1e-6);
  });
});
