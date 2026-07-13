// Tiny DOM + SVG helpers shared across views. No dependencies.

export const SVGNS = 'http://www.w3.org/2000/svg';

export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Record<string, string> = {},
  ...children: (Node | string)[]
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') node.className = v;
    else if (k === 'html') node.innerHTML = v;
    else node.setAttribute(k, v);
  }
  for (const c of children) node.append(typeof c === 'string' ? document.createTextNode(c) : c);
  return node;
}

export function svgEl(tag: string, attrs: Record<string, string | number> = {}): SVGElement {
  const node = document.createElementNS(SVGNS, tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, String(v));
  return node;
}

/**
 * Build a compact sparkline path string for a series in a WxH box.
 * Returns { line, area, lastX, lastY } path data.
 */
export function sparklinePaths(
  series: number[],
  w: number,
  h: number,
  pad = 1,
): { line: string; area: string; lastX: number; lastY: number } {
  const n = series.length;
  if (n === 0) return { line: '', area: '', lastX: 0, lastY: h };
  const max = Math.max(...series, 1);
  const min = Math.min(...series, 0);
  const range = max - min || 1;
  const dx = n > 1 ? (w - pad * 2) / (n - 1) : 0;
  const pts = series.map((v, i) => {
    const x = pad + i * dx;
    const y = pad + (1 - (v - min) / range) * (h - pad * 2);
    return [x, y] as [number, number];
  });
  const line = pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
  const area = `${line} L${pts[n - 1][0].toFixed(1)} ${h} L${pts[0][0].toFixed(1)} ${h} Z`;
  return { line, area, lastX: pts[n - 1][0], lastY: pts[n - 1][1] };
}

/** Inline SVG sparkline as an HTML string. */
export function sparklineSvg(series: number[], w = 90, h = 26, color = '#0f766e'): string {
  const { line, area, lastX, lastY } = sparklinePaths(series, w, h, 2);
  return `<svg class="spark" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" aria-hidden="true">
    <path d="${area}" fill="${color}" opacity="0.12"/>
    <path d="${line}" fill="none" stroke="${color}" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"/>
    <circle cx="${lastX.toFixed(1)}" cy="${lastY.toFixed(1)}" r="1.8" fill="${color}"/>
  </svg>`;
}

export function clear(node: HTMLElement): void {
  while (node.firstChild) node.removeChild(node.firstChild);
}
