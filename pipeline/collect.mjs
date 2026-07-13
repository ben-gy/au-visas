// Temporary Visa Holders — data pipeline.
//
// Source: "Temporary visa holders in Australia" (BP0019), Dept of Home Affairs,
// published MONTHLY on data.gov.au (CC BY 2.5 AU). The workbook is an Excel
// PIVOT TABLE; the full unaggregated fact table (~300k rows) lives inside the
// embedded pivot CACHE. We unzip the .xlsx, read the pivot cache XML, parse it
// into records of (snapshotDate, visaCategory, visaSubclass, visaType,
// applicantType, citizenshipCountry, holders), then roll it up into compact
// JSON the browser can load.
//
// Run: `node pipeline/collect.mjs` (writes to public/data/).

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { unzipSync, strFromU8 } from 'fflate';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, '..', 'public', 'data');
const CKAN = 'https://data.gov.au/data/api/3/action/package_show?id=temporary-entrants-visa-holders';
const UA = 'Mozilla/5.0 (au-visas data pipeline; +https://au-visas.benrichardson.dev)';

const log = (...a) => console.log('[collect]', ...a);

async function findLatestXlsxUrl() {
  const res = await fetch(CKAN, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`CKAN ${res.status}`);
  const json = await res.json();
  const resources = json.result.resources || [];
  // The stock workbook is the XLSX whose name starts with "BP0019".
  const xlsx = resources
    .filter((r) => (r.format || '').toUpperCase() === 'XLSX' && /BP0019/i.test(r.name || ''))
    .sort((a, b) => String(b.name).localeCompare(String(a.name)));
  if (!xlsx.length) throw new Error('No BP0019 XLSX resource found');
  return { url: xlsx[0].url, name: xlsx[0].name, licence: json.result.license_title };
}

// Parse the ISO date shared items and the records from the pivot cache.
function parsePivotCache(files) {
  const defName = Object.keys(files).find((f) => /pivotCacheDefinition\d*\.xml$/i.test(f));
  const recName = Object.keys(files).find((f) => /pivotCacheRecords\d*\.xml$/i.test(f));
  if (!defName || !recName) throw new Error('Pivot cache not found in workbook');
  const defXml = strFromU8(files[defName]);
  const recXml = strFromU8(files[recName]);

  // Field order + shared items per field, in document order. Split on the
  // cacheField element boundary — the lookahead prevents splitting on the
  // `<cacheFields>` container tag (which would inject a phantom leading field
  // and shift every record cell by one).
  const fields = [];
  const parts = defXml.split(/<cacheField(?=[\s>])/).slice(1);
  // Shared items may carry extra attributes (e.g. <s v="X" u="1"/>), so match
  // the whole element then pull `v` out — a strict `v="..."`-only regex silently
  // drops those items and corrupts the shared-index lookup.
  const itemRe = /<(s|d|n|b|e|m)\b([^>]*?)\/?>/g;
  for (const part of parts) {
    const nameM = part.match(/name="([^"]*)"/);
    const name = nameM ? decodeXml(nameM[1]) : '';
    const shared = [];
    const siM = part.match(/<sharedItems[\s\S]*?<\/sharedItems>/);
    if (siM) {
      let im;
      itemRe.lastIndex = 0;
      while ((im = itemRe.exec(siM[0])) !== null) {
        if (im[1] === 'm' || im[1] === 'e') { shared.push(null); continue; }
        const vm = im[2].match(/\bv="([^"]*)"/);
        shared.push(vm ? decodeXml(vm[1]) : null);
      }
    }
    fields.push({ name, shared });
  }

  const idxOf = (n) => fields.findIndex((f) => f.name === n);
  const order = {
    date: idxOf('Snapshot Date'),
    category: idxOf('Visa Category'),
    subclass: idxOf('Visa Subclass'),
    type: idxOf('Visa Type'),
    applicant: idxOf('Applicant Type'),
    country: idxOf('Citizenship Country'),
    holders: idxOf('Visa Holders'),
  };
  for (const [k, v] of Object.entries(order)) if (v < 0) throw new Error(`Missing pivot field: ${k}`);

  const records = [];
  // Each record: <r>...children in field order...</r>
  const recRe = /<r>([\s\S]*?)<\/r>/g;
  const childRe = /<(x|n|s|d|b|e|m)\b([^>]*?)\/?>/g;
  let rm;
  while ((rm = recRe.exec(recXml)) !== null) {
    const cells = [];
    let cm;
    childRe.lastIndex = 0;
    while ((cm = childRe.exec(rm[1])) !== null) {
      const tag = cm[1];
      const vm = cm[2].match(/\bv="([^"]*)"/);
      const v = vm ? vm[1] : undefined;
      if (tag === 'x') {
        const fieldShared = fields[cells.length].shared;
        cells.push(fieldShared[Number(v)] ?? null);
      } else if (tag === 'm' || tag === 'e') {
        cells.push(null);
      } else {
        cells.push(v !== undefined ? decodeXml(v) : null);
      }
    }
    records.push({
      date: normDate(cells[order.date]),
      category: cells[order.category] || 'Not specified',
      subclass: cells[order.subclass] || 'Not specified',
      type: cells[order.type] || 'Not specified',
      applicant: cells[order.applicant] || 'Primary',
      country: cells[order.country] || 'Not Specified',
      holders: Number(cells[order.holders]) || 0,
    });
  }
  return records;
}

function decodeXml(s) {
  return s
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'").replace(/&amp;/g, '&');
}
function normDate(s) {
  if (!s) return '';
  return String(s).slice(0, 10); // YYYY-MM-DD
}

function buildOutputs(records, meta, countryMeta) {
  // Distinct snapshot dates (sorted ascending).
  const dates = [...new Set(records.map((r) => r.date))].filter(Boolean).sort();
  const dateIndex = new Map(dates.map((d, i) => [d, i]));
  const latest = dates[dates.length - 1];

  // ---- totals by date
  const totalByDate = new Array(dates.length).fill(0);

  // ---- per country: series (by date) + latest category breakdown + primary/secondary
  const countries = new Map(); // rawName -> agg
  const ensureCountry = (raw) => {
    if (!countries.has(raw)) {
      const cm = countryMeta[raw] || { iso3: null, label: raw };
      countries.set(raw, {
        raw, name: cm.label, iso3: cm.iso3,
        series: new Array(dates.length).fill(0),
        categories: {}, // latest snapshot only
        primary: 0, secondary: 0, // latest snapshot only
      });
    }
    return countries.get(raw);
  };

  // ---- per category: series + latest subclass + latest applicant split + latest top countries
  const categories = new Map();
  const ensureCategory = (name) => {
    if (!categories.has(name)) {
      categories.set(name, {
        name, series: new Array(dates.length).fill(0),
        subclasses: {}, primary: 0, secondary: 0, byCountry: {},
      });
    }
    return categories.get(name);
  };

  // ---- per subclass: series + category + latest applicant split
  const subclasses = new Map();
  const ensureSubclass = (name, category) => {
    if (!subclasses.has(name)) {
      subclasses.set(name, { name, category, series: new Array(dates.length).fill(0), primary: 0, secondary: 0 });
    }
    return subclasses.get(name);
  };

  for (const r of records) {
    const di = dateIndex.get(r.date);
    if (di === undefined) continue;
    totalByDate[di] += r.holders;

    const c = ensureCountry(r.country);
    c.series[di] += r.holders;

    const cat = ensureCategory(r.category);
    cat.series[di] += r.holders;

    const sub = ensureSubclass(r.subclass, r.category);
    sub.series[di] += r.holders;

    if (r.date === latest) {
      c.categories[r.category] = (c.categories[r.category] || 0) + r.holders;
      if (r.applicant === 'Secondary') { c.secondary += r.holders; cat.secondary += r.holders; sub.secondary += r.holders; }
      else { c.primary += r.holders; cat.primary += r.holders; sub.primary += r.holders; }
      cat.subclasses[r.subclass] = (cat.subclasses[r.subclass] || 0) + r.holders;
      cat.byCountry[r.country] = (cat.byCountry[r.country] || 0) + r.holders;
    }
  }

  // finalize countries
  const countryList = [...countries.values()]
    .map((c) => ({
      raw: c.raw, name: c.name, iso3: c.iso3,
      latest: c.series[c.series.length - 1],
      series: c.series,
      categories: c.categories,
      primary: c.primary, secondary: c.secondary,
    }))
    .filter((c) => c.latest > 0 || c.series.some((v) => v > 0))
    .sort((a, b) => b.latest - a.latest);
  countryList.forEach((c, i) => { c.rank = i + 1; });

  // finalize categories
  const categoryList = [...categories.values()]
    .map((c) => ({
      name: c.name,
      latest: c.series[c.series.length - 1],
      series: c.series,
      primary: c.primary, secondary: c.secondary,
      subclasses: Object.entries(c.subclasses).map(([name, v]) => ({ name, latest: v })).sort((a, b) => b.latest - a.latest),
      topCountries: Object.entries(c.byCountry)
        .map(([raw, v]) => ({ name: (countryMeta[raw]?.label || raw), iso3: countryMeta[raw]?.iso3 || null, latest: v }))
        .sort((a, b) => b.latest - a.latest).slice(0, 12),
    }))
    .sort((a, b) => b.latest - a.latest);

  // finalize subclasses
  const subclassList = [...subclasses.values()]
    .map((s) => ({ name: s.name, category: s.category, latest: s.series[s.series.length - 1], series: s.series, primary: s.primary, secondary: s.secondary }))
    .sort((a, b) => b.latest - a.latest);

  const metaOut = {
    ...meta,
    generatedAt: new Date().toISOString(),
    dates,
    latestDate: latest,
    earliestDate: dates[0],
    totalByDate,
    totalLatest: totalByDate[totalByDate.length - 1],
    totalEarliest: totalByDate[0],
    categoryNames: categoryList.map((c) => c.name),
    countryCount: countryList.filter((c) => c.iso3).length,
  };

  return { metaOut, countryList, categoryList, subclassList };
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const countryMeta = JSON.parse(await readFile(join(__dirname, 'country-meta.json'), 'utf8'));

  log('locating latest workbook…');
  const { url, name, licence } = await findLatestXlsxUrl();
  log('downloading', name);
  const buf = new Uint8Array(await (await fetch(url, { headers: { 'User-Agent': UA } })).arrayBuffer());
  log('workbook bytes', buf.length);

  log('unzipping + parsing pivot cache…');
  const files = unzipSync(buf, {
    filter: (f) => /pivotCache(Definition|Records)\d*\.xml$/i.test(f.name),
  });
  const records = parsePivotCache(files);
  log('parsed records', records.length);
  if (records.length < 10000) throw new Error(`Suspiciously few records (${records.length}) — aborting`);

  const meta = {
    source: 'Department of Home Affairs — Temporary visa holders in Australia (BP0019)',
    sourceUrl: 'https://data.gov.au/data/dataset/temporary-entrants-visa-holders',
    workbook: name,
    licence: licence || 'CC BY 2.5 AU',
  };
  const { metaOut, countryList, categoryList, subclassList } = buildOutputs(records, meta, countryMeta);

  await writeFile(join(OUT, 'meta.json'), JSON.stringify(metaOut));
  await writeFile(join(OUT, 'countries.json'), JSON.stringify(countryList));
  await writeFile(join(OUT, 'categories.json'), JSON.stringify(categoryList));
  await writeFile(join(OUT, 'subclasses.json'), JSON.stringify(subclassList));

  log('latest snapshot', metaOut.latestDate, 'total', metaOut.totalLatest.toLocaleString());
  log('countries', countryList.length, 'categories', categoryList.length, 'subclasses', subclassList.length);
  log('done.');
}

main().catch((e) => { console.error('[collect] FATAL', e); process.exit(1); });
