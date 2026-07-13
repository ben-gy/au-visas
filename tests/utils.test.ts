import { describe, expect, it } from 'vitest';
import { logScale, sequentialColor } from '../src/colors';
import { sparklinePaths } from '../src/utils/svg';
import { niceCeil } from '../src/utils/linechart';
import { yoyChange, seriesAt } from '../src/data';

describe('logScale', () => {
  it('is 0 at zero value', () => { expect(logScale(0, 1000)).toBe(0); });
  it('is 1 at the max', () => { expect(logScale(1000, 1000)).toBeCloseTo(1, 6); });
  it('is monotonic', () => { expect(logScale(500, 1000)).toBeGreaterThan(logScale(100, 1000)); });
  it('guards zero max', () => { expect(logScale(5, 0)).toBe(0); });
});

describe('sequentialColor', () => {
  it('returns an rgb string', () => { expect(sequentialColor(0.5)).toMatch(/^rgb\(\d+, \d+, \d+\)$/); });
  it('clamps out-of-range input', () => {
    expect(sequentialColor(-1)).toBe(sequentialColor(0));
    expect(sequentialColor(2)).toBe(sequentialColor(1));
  });
});

describe('sparklinePaths', () => {
  it('produces finite coordinates within the box', () => {
    const { line, lastX, lastY } = sparklinePaths([1, 5, 2, 8, 3], 100, 30);
    expect(line.length).toBeGreaterThan(0);
    expect(Number.isFinite(lastX) && Number.isFinite(lastY)).toBe(true);
    expect(lastX).toBeLessThanOrEqual(100);
    expect(lastY).toBeGreaterThanOrEqual(0);
    expect(lastY).toBeLessThanOrEqual(30);
    expect(line).not.toMatch(/NaN/);
  });
  it('handles empty series', () => {
    expect(sparklinePaths([], 100, 30)).toEqual({ line: '', area: '', lastX: 0, lastY: 30 });
  });
});

describe('niceCeil', () => {
  it('rounds up to a nice number', () => {
    expect(niceCeil(2880320)).toBe(5000000);
    expect(niceCeil(736688)).toBe(1000000);
    expect(niceCeil(45)).toBe(50);
  });
});

describe('yoyChange', () => {
  const dates = ['2024-05-31', '2025-05-31', '2026-05-31'];
  it('finds the same-month prior year', () => {
    const r = yoyChange([100, 150, 180], dates);
    expect(r).not.toBeNull();
    expect(r!.delta).toBeCloseTo(0.2, 5);
  });
  it('returns null with too little data', () => { expect(yoyChange([100], ['2026-05-31'])).toBeNull(); });
});

describe('seriesAt', () => {
  it('reads safely out of range', () => {
    expect(seriesAt([1, 2, 3], 1)).toBe(2);
    expect(seriesAt([1, 2, 3], 9)).toBe(0);
  });
});
