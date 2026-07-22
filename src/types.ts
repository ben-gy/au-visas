// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Ben Richardson — https://benrichardson.dev
// Additional terms under AGPL-3.0 section 7(b) apply; see ADDITIONAL-TERMS.md.
export interface Meta {
  source: string;
  sourceUrl: string;
  workbook: string;
  licence: string;
  generatedAt: string;
  dates: string[];
  latestDate: string;
  earliestDate: string;
  totalByDate: number[];
  totalLatest: number;
  totalEarliest: number;
  categoryNames: string[];
  countryCount: number;
}

export interface Country {
  raw: string;
  name: string;
  iso3: string | null;
  latest: number;
  series: number[];
  categories: Record<string, number>;
  primary: number;
  secondary: number;
  rank: number;
}

export interface CategoryTopCountry {
  name: string;
  iso3: string | null;
  latest: number;
}

export interface Category {
  name: string;
  latest: number;
  series: number[];
  primary: number;
  secondary: number;
  subclasses: { name: string; latest: number }[];
  topCountries: CategoryTopCountry[];
}

export interface Subclass {
  name: string;
  category: string;
  latest: number;
  series: number[];
  primary: number;
  secondary: number;
}

export interface DataStore {
  meta: Meta;
  countries: Country[];
  categories: Category[];
  subclasses: Subclass[];
  countryByIso: Map<string, Country>;
}

export type ViewId = 'insights' | 'map' | 'countries' | 'types' | 'trends' | 'matrix' | 'flow';
