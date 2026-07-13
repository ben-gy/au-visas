import { describe, expect, it } from 'vitest';
import { pctChangeOverSnapshots, peak, topShare, computeInsights } from '../src/analysis';
import type { DataStore } from '../src/types';

describe('pctChangeOverSnapshots', () => {
  it('computes change over N snapshots back', () => {
    expect(pctChangeOverSnapshots([100, 110, 120], 2)).toBeCloseTo(0.2, 5);
  });
  it('returns null when reference missing', () => {
    expect(pctChangeOverSnapshots([120], 4)).toBeNull();
  });
  it('returns null when reference is zero', () => {
    expect(pctChangeOverSnapshots([0, 50], 1)).toBeNull();
  });
  it('handles decline', () => {
    expect(pctChangeOverSnapshots([200, 100], 1)).toBeCloseTo(-0.5, 5);
  });
});

describe('peak', () => {
  it('finds max and index', () => { expect(peak([3, 9, 4, 9, 2])).toEqual({ value: 9, index: 1 }); });
  it('single element', () => { expect(peak([7])).toEqual({ value: 7, index: 0 }); });
});

describe('topShare', () => {
  it('largest contributor share', () => {
    expect(topShare([{ latest: 80 }, { latest: 20 }])).toBeCloseTo(0.8, 5);
  });
  it('empty is zero', () => { expect(topShare([])).toBe(0); });
});

function fixture(): DataStore {
  const dates = ['2024-05-31', '2025-05-31', '2026-05-31'];
  const countries = [
    { raw: 'India', name: 'India', iso3: 'IND', latest: 300, series: [100, 200, 300], categories: { Student: 200, Bridging: 100 }, primary: 200, secondary: 100, rank: 1 },
    { raw: 'China (mainland)', name: 'China (mainland)', iso3: 'CHN', latest: 250, series: [260, 255, 250], categories: { Student: 250 }, primary: 250, secondary: 0, rank: 2 },
  ];
  const categories = [
    { name: 'Student', latest: 450, series: [200, 350, 450], primary: 400, secondary: 50, subclasses: [{ name: '500 Student', latest: 450 }], topCountries: [{ name: 'China (mainland)', iso3: 'CHN', latest: 250 }, { name: 'India', iso3: 'IND', latest: 200 }] },
    { name: 'Bridging', latest: 100, series: [50, 80, 100], primary: 90, secondary: 10, subclasses: [{ name: 'Bridging Visas', latest: 100 }], topCountries: [{ name: 'India', iso3: 'IND', latest: 100 }] },
    { name: 'Working Holiday Maker', latest: 60, series: [90, 20, 60], primary: 60, secondary: 0, subclasses: [{ name: '417', latest: 60 }], topCountries: [{ name: 'India', iso3: 'IND', latest: 60 }] },
  ];
  return {
    meta: {
      source: 's', sourceUrl: 'u', workbook: 'w', licence: 'l', generatedAt: '', dates,
      latestDate: '2026-05-31', earliestDate: '2024-05-31', totalByDate: [360, 455, 550],
      totalLatest: 550, totalEarliest: 360, categoryNames: ['Student', 'Bridging', 'Working Holiday Maker'], countryCount: 2,
    },
    countries, categories, subclasses: [],
    countryByIso: new Map(countries.map((c) => [c.iso3!, c])),
  } as DataStore;
}

describe('computeInsights', () => {
  const insights = computeInsights(fixture());
  it('produces multiple insights', () => { expect(insights.length).toBeGreaterThanOrEqual(5); });
  it('headline names the largest source', () => {
    expect(insights.some((i) => i.title.includes('India') && i.severity === 'headline')).toBe(true);
  });
  it('detects the WHM collapse-and-rebound', () => {
    expect(insights.some((i) => i.title.includes('Working Holiday'))).toBe(true);
  });
  it('every insight has a metric string', () => {
    expect(insights.every((i) => typeof i.metric === 'string' && i.metric.length > 0)).toBe(true);
  });
});
