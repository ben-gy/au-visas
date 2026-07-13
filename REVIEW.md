# Temporary Visa Holders — Build Review

This file exists only to create a reviewable PR. All code is already deployed on `main`.

**Merge this PR to acknowledge the build.** Closing without merging is also fine.

## Links

- **GitHub Pages:** https://ben-gy.github.io/au-visas/ *(redirects to custom domain once DNS is set)*
- **Custom domain:** https://au-visas.benrichardson.dev

## What it is

An interactive explorer for Australia's temporary visa population — 2.88 million holders across 218 nationalities, 11 visa categories and 66 subclasses, over 59 monthly/quarterly snapshots from Dec 2011 to May 2026. The data is extracted from the embedded pivot cache inside the Dept of Home Affairs BP0019 Excel workbook (CC BY 2.5 AU), refreshed monthly by a GitHub Actions pipeline.

Seven views: Insights (auto-detected), world choropleth (Leaflet), nationalities leaderboard with sparklines, category→subclass treemap, stacked-area trends, nationality×visa matrix, nationality→visa Sankey flow — plus a hash-linkable per-nationality drill-down.

## DNS setup

Already provisioned in Cloudflare (`benrichardson.dev` zone):

| Type | Name | Target | Proxy |
|------|------|--------|-------|
| CNAME | `au-visas` | `ben-gy.github.io` | DNS only (grey cloud) |
