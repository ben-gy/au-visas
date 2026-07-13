# Site Plan: Temporary Visa Holders

## Overview
- **Name:** Temporary Visa Holders
- **Repo name:** au-visas
- **Tagline:** How many people are living in Australia on each temporary visa — by nationality, visa type and over 14 years.

### Naming Convention
Plain topic name, no country code. Country (`AU`) lives in the index entry and renders as a flag.

## Target Audience
International students and their families, prospective migrants, migration agents, journalists, demographers, and any Australian curious about "how many people are here on a student / working-holiday / skilled visa, and where are they from?" Light, calm, factual — immigration is a charged topic, so the tone stays neutral and data-first, never alarmist.

## Value Proposition
There is no consumer-friendly, interactive view of the official temporary-entrant "stock" data. The government publishes it only as a monthly Excel pivot-table workbook that ordinary people can't open or explore. This turns 14.5 years of it into a searchable, mappable, chartable tool: pick a nationality and see the trend; pick a visa type and see which countries fill it; watch Working Holiday Makers collapse in COVID and rebound.

## Data Sources
| Source | URL | What it provides | Update frequency | Auth required? |
|--------|-----|-------------------|-----------------|----------------|
| Temporary visa holders in Australia (BP0019), Dept of Home Affairs via data.gov.au | https://data.gov.au/data/dataset/temporary-entrants-visa-holders | Point-in-time count of every temporary visa holder by visa category, subclass, type, applicant type (primary/secondary) and citizenship country, 59 snapshots Dec-2011 → May-2026 | Monthly | No (CC BY 2.5 AU) |
| Natural Earth 50m admin-0 countries | naturalearthdata.com (nvkelso/natural-earth-vector) | World country boundaries for the choropleth (simplified to 217 KB, joined by ISO A3) | Static | No |

## Key Features
1. **World choropleth** (Leaflet) — where temporary visa holders come from, sequential-blue shaded by citizenship, hover for exact count + rank, click to drill down.
2. **Nationalities leaderboard/table** — all 224 countries ranked, 14-year sparkline each, searchable, click-through drill-down.
3. **Visa types treemap + bars** — the 15 categories and 81 subclasses sized by holders.
4. **Trends over time** — stacked-area / multi-line of the whole population and each category across 59 snapshots (COVID collapse & rebound is the story).
5. **Country × visa-category matrix heatmap** — which nationalities dominate which visa types.
6. **Flow (Sankey)** — top nationalities → visa categories.
7. **Insights** — auto-detected: biggest source, fastest-growing YoY, most concentrated visa type, largest post-COVID rebound, primary-vs-secondary split.
8. **Per-nationality drill-down** (hash `#c=IND`) — category breakdown, subclass list, full trend, primary/secondary, rank vs others.

## Target Audience (detailed)
Mostly general public and students on desktop or phone, moderate tech skill, arriving via search ("how many indian students in australia", "working holiday visa numbers"). Some domain experts (migration agents, journalists) who want the matrix/flow and drill-downs. Emotionally neutral utility — answer the number fast, let the curious dig.

## Style Direction
**Tone:** civic / authoritative, calm.
**Colour palette:** light background (warm near-white), deep navy text, teal primary accent, sequential blues for the choropleth and heatmap. Category colours are a fixed, colour-blind-aware qualitative set reused across every view. No red/green alarm colours for the population itself.
**UI density:** balanced — readable cards and generous headers, but dense sortable tables and a full-bleed map.
**Dark/light theme:** light.
**Reference sites for tone:** abs.gov.au data explorers, ourworldindata.org country pages.

## Technical Architecture
- **Stack:** Vanilla TypeScript + Vite.
- **Data strategy:** pipeline. Source is released **monthly**, so cron is **monthly** (the fastest allowed), staggered to day 9. Pipeline downloads the latest BP0019 XLSX, extracts the embedded pivot **cache** (the full 303k-row fact table hidden inside the workbook), aggregates to compact JSON in `public/data/`.
- **Key libraries:** Leaflet (map). fflate (pipeline-only, to unzip the xlsx). Everything else hand-rolled SVG.

## Layout
Fixed light header (logo + view tabs + About/? button). Full-width main area per view, `max-width: 1600px`. Sticky footer with attribution + directory backlink. Drill-down is a slide-in right panel with hash routing. Panels stack < 768px; map and table go full-height on desktop.

## Pages/Views
Single page, tabbed views: Insights · Map · Nationalities · Visa Types · Trends · Matrix · Flow. Plus the slide-in nationality drill-down.

## Visualization Strategy
- **World choropleth (Leaflet + real GeoJSON)** — "where do they come from?" Nothing else shows the global spread; sequential blue by count, hover tooltip everywhere, click → drill-down.
- **Nationalities table with sparklines** — "how has my country changed?" Sortable by latest / growth; 14-yr sparkline reveals COVID dip per country.
- **Treemap of categories→subclasses** — "what's the composition right now?" Squarified (patterns/treemap.ts), area = holders, colour = category.
- **Trends stacked area / lines** — "how did the whole system move over 14 years?" The COVID collapse and rebound and the post-2022 student surge are only visible here.
- **Country × category matrix heatmap** — "which nationality dominates which visa?" Instantly shows e.g. WHM = UK/France/Germany, Student = India/China/Nepal.
- **Sankey flow (nationality → category)** — "where does each nationality's population go?" Ribbon width = holders.
- **Histogram/distribution** is not meaningful here (counts, not a spread of a measured variable), so it's replaced by the matrix + flow which suit this categorical-relational shape.
Litmus test: this view set (world-origin map + nationality trends + visa-type composition + nationality×visa matrix/flow) is specific to a "population by origin × category over time" dataset — it would not transplant unchanged onto, say, a procurement dataset.
