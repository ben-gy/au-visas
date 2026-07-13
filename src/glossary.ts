// Plain-language definitions for every piece of jargon in the UI.
// Rendered as clickable ℹ info icons via the glossary tooltip in main.ts.

export interface GlossaryTerm {
  term: string;
  definition: string;
}

export const GLOSSARY: GlossaryTerm[] = [
  {
    term: 'Temporary visa holder',
    definition:
      'A person in Australia on a visa that grants a temporary right to stay — students, workers, working-holiday makers, visitors, bridging visas and New Zealand citizens. It excludes Australian citizens and permanent residents.',
  },
  {
    term: 'Stock',
    definition:
      'A point-in-time count — how many people held each visa on the snapshot date. It is not the number of visas granted over a period; a person is counted once, on the day the snapshot was taken.',
  },
  {
    term: 'Snapshot date',
    definition:
      'The single day the count was taken. Earlier data is quarterly (end of March, June, September, December); recent data is monthly.',
  },
  {
    term: 'Visa category',
    definition:
      'A broad grouping of visas by purpose — e.g. Student, Visitor, Working Holiday Maker, Skilled Employment. Each category contains one or more visa subclasses.',
  },
  {
    term: 'Visa subclass',
    definition:
      'The specific numbered visa a person holds, such as subclass 500 (Student), 482 (Skills in Demand / TSS), 485 (Temporary Graduate) or 417/462 (Working Holiday).',
  },
  {
    term: 'Special Category visa',
    definition:
      'The subclass 444 visa held by New Zealand citizens, granted automatically on arrival. It lets them live and work in Australia indefinitely, which is why it is by far the largest single group.',
  },
  {
    term: 'Bridging visa',
    definition:
      'A temporary visa that keeps a person lawfully in Australia while another visa application or an appeal is being decided. A large bridging population usually reflects a backlog of pending decisions.',
  },
  {
    term: 'Temporary Graduate visa',
    definition:
      'The subclass 485 visa, which lets recent international graduates stay and work in Australia for a few years after finishing their studies.',
  },
  {
    term: 'Working Holiday Maker',
    definition:
      'The subclass 417 and 462 visas, which let young people from partner countries travel and work in Australia for up to a year or more. Numbers collapsed during COVID border closures and have since rebounded.',
  },
  {
    term: 'Primary vs secondary applicant',
    definition:
      'The primary applicant is the person the visa was granted to; secondary applicants are family members (partners, children) included on the same visa.',
  },
  {
    term: 'Citizenship country',
    definition:
      'The country a visa holder is a citizen of — not necessarily where they were born or last lived. Some values (Refugee, Stateless, Not Specified) are not countries and are excluded from the map.',
  },
  {
    term: 'PALM scheme',
    definition:
      'The Pacific Australia Labour Mobility scheme, which brings workers from Pacific island nations and Timor-Leste to fill Australian jobs — visible as the large Vanuatu, Fiji and Solomon Islands share of the Other Employment category.',
  },
];

export const GLOSSARY_MAP = new Map(GLOSSARY.map((g) => [g.term, g.definition]));

/** Inline clickable ℹ icon that opens the glossary definition for `term`. */
export function infoIcon(term: string): string {
  if (!GLOSSARY_MAP.has(term)) return '';
  return `<button type="button" class="ginfo" data-term="${term}" aria-label="What is ${term}?">i</button>`;
}

/** Wrap visible text as a dotted-underline glossary link for `term`. */
export function glossaryLink(text: string, term: string): string {
  if (!GLOSSARY_MAP.has(term)) return text;
  return `<span class="glink" data-term="${term}" role="button" tabindex="0">${text}</span>`;
}
