import { describe, expect, it } from 'vitest';
import { formatNumber, formatCompact, formatPercent, formatDelta, formatMonthYear, slugify } from '../src/format';

describe('formatNumber', () => {
  it('adds thousands separators', () => { expect(formatNumber(2880320)).toBe('2,880,320'); });
  it('handles zero', () => { expect(formatNumber(0)).toBe('0'); });
  it('rounds decimals', () => { expect(formatNumber(1234.7)).toBe('1,235'); });
  it('handles non-finite', () => { expect(formatNumber(NaN)).toBe('—'); });
});

describe('formatCompact', () => {
  it('millions', () => { expect(formatCompact(2880320)).toBe('2.9M'); });
  it('tens of millions round', () => { expect(formatCompact(12000000)).toBe('12M'); });
  it('thousands', () => { expect(formatCompact(736688)).toBe('737k'); });
  it('small', () => { expect(formatCompact(512)).toBe('512'); });
  it('non-finite', () => { expect(formatCompact(Infinity)).toBe('—'); });
});

describe('formatPercent / formatDelta', () => {
  it('percent one dp', () => { expect(formatPercent(0.256)).toBe('25.6%'); });
  it('delta adds sign', () => { expect(formatDelta(0.1)).toBe('+10.0%'); });
  it('negative delta', () => { expect(formatDelta(-0.05)).toBe('-5.0%'); });
  it('zero delta has no plus for negatives only', () => { expect(formatDelta(0)).toBe('0.0%'); });
});

describe('formatMonthYear', () => {
  it('formats ISO date', () => { expect(formatMonthYear('2026-05-31')).toBe('May 2026'); });
  it('returns input on garbage', () => { expect(formatMonthYear('not-a-date')).toBe('not-a-date'); });
});

describe('slugify', () => {
  it('kebab-cases', () => { expect(slugify('China (mainland)')).toBe('china-mainland'); });
  it('trims dashes', () => { expect(slugify('  Hello!  ')).toBe('hello'); });
});
