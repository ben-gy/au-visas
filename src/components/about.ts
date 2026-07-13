import type { DataStore } from '../types';
import { GLOSSARY } from '../glossary';
import { formatFullDate, formatNumber } from '../format';
import { el } from '../utils/svg';

let overlay: HTMLDivElement | null = null;

export function openAbout(store: DataStore): void {
  if (overlay) overlay.remove();
  overlay = el('div', { class: 'modal-overlay' }) as HTMLDivElement;

  const glossaryHtml = GLOSSARY.map(
    (g) => `<div class="gl-row"><dt>${g.term}</dt><dd>${g.definition}</dd></div>`,
  ).join('');

  const modal = el('div', { class: 'modal', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'About' });
  modal.innerHTML = `
    <button type="button" class="modal-close" aria-label="Close">×</button>
    <h2>About this tool</h2>
    <p class="lead">A searchable, mappable view of every <strong>temporary visa holder</strong> in Australia — how many people are here on each visa, which nationality they hold, and how those numbers have moved over 14 years.</p>

    <h3>What the data is</h3>
    <p>This is <em>stock</em> data: a point-in-time count of everyone holding a temporary visa on the snapshot date, broken down by visa category, subclass, primary/secondary applicant and country of citizenship. It is <strong>not</strong> the number of visas granted — a person is counted once, on the snapshot day. Australian citizens and permanent residents are excluded.</p>

    <h3>Where it comes from</h3>
    <p>The Department of Home Affairs publishes it as the <a href="${store.meta.sourceUrl}" target="_blank" rel="noopener">“Temporary visa holders in Australia” (BP0019)</a> workbook on data.gov.au, released <strong>monthly</strong> under the ${store.meta.licence} licence. The figures come from Home Affairs visa systems and are de-identified.</p>
    <ul class="about-facts">
      <li><span>Latest snapshot</span><strong>${formatFullDate(store.meta.latestDate)}</strong></li>
      <li><span>Total temporary visa holders</span><strong>${formatNumber(store.meta.totalLatest)}</strong></li>
      <li><span>History</span><strong>${new Date(store.meta.earliestDate).getFullYear()} – ${new Date(store.meta.latestDate).getFullYear()} · ${store.meta.dates.length} snapshots</strong></li>
      <li><span>Nationalities</span><strong>${store.meta.countryCount} countries</strong></li>
    </ul>

    <h3>Caveats</h3>
    <ul class="about-caveats">
      <li>Small counts (1–4) are rounded by the source for privacy, so tiny values are approximate.</li>
      <li>Citizenship is not birthplace or residence — a person is counted by the passport they hold.</li>
      <li>Some “citizenship” values (Refugee, Stateless, Not Specified) are not countries and are left off the world map, though they remain in totals and tables.</li>
      <li>Hong Kong, Macau and Taiwan are reported separately from mainland China, matching the source.</li>
    </ul>

    <h3>Glossary</h3>
    <dl class="glossary">${glossaryHtml}</dl>
  `;

  overlay.append(modal);
  document.body.append(overlay);
  document.body.style.overflow = 'hidden';

  const close = () => {
    overlay?.remove();
    overlay = null;
    document.body.style.overflow = '';
  };
  modal.querySelector('.modal-close')!.addEventListener('click', close);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
  document.addEventListener('keydown', function esc(e) {
    if (e.key === 'Escape') { close(); document.removeEventListener('keydown', esc); }
  });
}
