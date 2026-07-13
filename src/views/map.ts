import L from 'leaflet';
import type { AppCtx } from '../main';
import { sequentialColor, logScale } from '../colors';
import { formatNumber } from '../format';
import { infoIcon, glossaryLink } from '../glossary';

const BASE = import.meta.env.BASE_URL || '/';

export function renderMap(host: HTMLElement, ctx: AppCtx): void {
  const { store } = ctx;
  const maxVal = store.countries.filter((c) => c.iso3).reduce((m, c) => Math.max(m, c.latest), 1);

  const wrap = document.createElement('div');
  wrap.className = 'view view-map';
  wrap.innerHTML = `
    <header class="view-head">
      <h1>Where they come from</h1>
      <p class="sub">Each country shaded by how many of its ${glossaryLink('citizens', 'Citizenship country')} ${infoIcon('Citizenship country')} hold an Australian temporary visa. Hover for the figure, click a country to open its profile.</p>
    </header>
    <div class="map-shell">
      <div class="map-canvas" id="map-canvas"></div>
      <div class="map-legend" id="map-legend"></div>
    </div>
    <p class="map-note">Grey countries have no recorded temporary visa holders in the latest snapshot. Non-country citizenships (Refugee, Stateless, Not Specified) are excluded from the map but remain in totals and the nationalities table.</p>`;

  host.append(wrap);

  const canvas = wrap.querySelector<HTMLElement>('#map-canvas')!;
  const map = L.map(canvas, { minZoom: 1, maxZoom: 7, zoomControl: true, scrollWheelZoom: false, worldCopyJump: true });
  map.attributionControl.setPrefix(false);
  map.setView([15, 20], 2);

  L.tileLayer('https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png', {
    attribution: 'Tiles © CARTO · Boundaries © Natural Earth',
    subdomains: 'abcd',
    minZoom: 1,
    maxZoom: 7,
  }).addTo(map);

  fetch(`${BASE}data/world.geojson`)
    .then((r) => { if (!r.ok) throw new Error('Could not load boundaries'); return r.json(); })
    .then((geo) => {
      const layer = L.geoJSON(geo, {
        style: (f: any) => {
          const c = store.countryByIso.get(f!.properties.iso3);
          const v = c?.latest ?? 0;
          return {
            fillColor: v > 0 ? sequentialColor(logScale(v, maxVal)) : '#e2e8f0',
            fillOpacity: v > 0 ? 0.88 : 0.5,
            color: '#ffffff',
            weight: 0.5,
          };
        },
        onEachFeature: (f: any, lyr: any) => {
          const iso = f.properties.iso3;
          const c = store.countryByIso.get(iso);
          const v = c?.latest ?? 0;
          const label = c
            ? `<strong>${c.name}</strong><br>${formatNumber(v)} temporary visa holders<br><span class="mt-rank">Rank #${c.rank} of ${store.meta.countryCount}</span>`
            : `<strong>${f.properties.name}</strong><br>No recorded holders`;
          lyr.bindTooltip(label, { sticky: true, className: 'map-tip' });
          lyr.on({
            mouseover: () => lyr.setStyle({ weight: 1.8, color: '#0f172a' }),
            mouseout: () => layer.resetStyle(lyr),
            click: () => { if (c) ctx.openCountry(c.iso3, c.raw); },
          });
        },
      }).addTo(map);

      const fit = () => { map.invalidateSize(); };
      const ro = new ResizeObserver(() => { if (canvas.clientHeight > 50) { fit(); ro.disconnect(); } });
      ro.observe(canvas);
      setTimeout(fit, 300);
    })
    .catch(() => {
      canvas.innerHTML = '<div class="map-error">Could not load the world map. The table and other views still work.</div>';
    });

  // legend
  const legend = wrap.querySelector<HTMLElement>('#map-legend')!;
  const stops = [0.02, 0.25, 0.5, 0.75, 1];
  const vals = stops.map((s) => Math.round(Math.exp(s * Math.log(maxVal + 1)) - 1));
  legend.innerHTML = `<span class="ml-title">Temporary visa holders</span>` +
    stops.map((s, i) => `<span class="ml-stop"><i style="background:${sequentialColor(s)}"></i>${abbr(vals[i])}</span>`).join('') +
    `<span class="ml-stop"><i style="background:#e2e8f0"></i>none</span>`;
}

function abbr(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1000) return Math.round(n / 1000) + 'k';
  return String(n);
}
