# Temporary Visa Holders

**How many people live in Australia on each temporary visa — by nationality, visa type and over 14 years of official data.**

🔗 **Live:** [https://au-visas.benrichardson.dev](https://au-visas.benrichardson.dev)

## What is this?

Australia has around 2.9 million people living here on a *temporary* visa — international students, skilled workers, working-holiday backpackers, visitors, people on bridging visas, and New Zealanders. The Department of Home Affairs publishes exactly how many, broken down by visa category, subclass, and country of citizenship, once a month. The problem: it's buried inside an Excel *pivot-table* workbook that ordinary people can't open, let alone explore.

This tool turns 14½ years of that data (59 snapshots from December 2011 to May 2026) into a fast, searchable, mappable interface. You can look up any of 218 nationalities and see how its numbers have moved, watch the Working Holiday Maker population collapse during COVID border closures and rebound to a record high, see which visa each nationality tends to hold, and read the biggest movers automatically surfaced as insights.

The data is *stock* data — a point-in-time count of who held each visa on the snapshot day, not the number of visas granted over a period. It excludes Australian citizens and permanent residents.

## Who is this for?

International students and their families, prospective migrants and migration agents, journalists and demographers, and anyone curious about the real numbers behind Australia's immigration debate — presented factually, with no spin, on desktop or phone.

## Data Sources

| Source | What it provides | Update frequency |
|--------|-------------------|-----------------|
| [Temporary visa holders in Australia (BP0019)](https://data.gov.au/data/dataset/temporary-entrants-visa-holders) — Dept of Home Affairs via data.gov.au | Point-in-time counts by visa category, subclass, type, primary/secondary applicant and citizenship country | Monthly (CC BY 2.5 AU) |
| [Natural Earth](https://www.naturalearthdata.com/) 1:50m admin-0 countries | World boundaries for the choropleth, joined by ISO A3 | Static |

## Features

- **Insights** — auto-detected headline findings: largest source nationality, fastest-growing and fastest-falling, the COVID collapse-and-rebound, bridging backlog, family share.
- **World map** — Leaflet choropleth shaded by how many of each country's citizens hold an Australian temporary visa; hover for exact figures, click to drill down.
- **Nationalities** — every country ranked, with a 14-year sparkline and dominant visa type; search, sort, and click through.
- **Visa types** — nested treemap of all 11 categories and their subclasses, with a breakdown panel of subclasses and top nationalities per category.
- **Trends** — stacked-area / line chart of every category across 59 snapshots.
- **Matrix** — nationality × visa-type heatmap showing who dominates which visa.
- **Flow** — Sankey diagram from the largest nationalities to the visas they hold.
- **Drill-down** — a hash-linkable profile panel for any nationality (rank, share, year-on-year change, full trend, visa-type mix).

## Tech Stack

- **Runtime:** Vanilla TypeScript
- **Build:** Vite 6
- **Testing:** Vitest (61 tests, including positional layout tests for the treemap and Sankey)
- **Hosting:** GitHub Pages (static, no backend)
- **Data:** GitHub Actions pipeline (monthly)
- **Libraries:** Leaflet (map); all charts are hand-rolled SVG. `fflate` is used only in the pipeline to unzip the source workbook.

## Local Development

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Run tests
npm test

# Production build
npm run build

# Preview production build
npm run preview

# Refresh the data from data.gov.au
cd pipeline && npm install && node collect.mjs
```

## How it works

The source `.xlsx` is an Excel pivot table; the full ~300,000-row fact table lives inside its embedded pivot *cache*. The pipeline (`pipeline/collect.mjs`) downloads the latest workbook from data.gov.au, unzips it, parses the pivot cache XML, and rolls it up into compact JSON in `public/data/` (per-country series, per-category series, per-subclass series, and a metadata file). A monthly GitHub Actions workflow re-runs the pipeline and commits refreshed data; the front end fetches those JSON files at load and renders every view client-side.

## License

MIT (code). Data © Commonwealth of Australia under CC BY 2.5 AU; boundaries © Natural Earth (public domain).
