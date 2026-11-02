// log.js — Mission Log overlay: Catalysts (curated, NASA-linked), Updates (NASA blog RSS, live), Health (instrument board).
// Plain ES module; used by index.html (via app.js) and basic.html.

export const HEALTH = {
  updated: '2026-04-17', source: 'https://science.nasa.gov/mission/voyager/where-are-voyager-1-and-voyager-2-now/',
  rows: [
    ['Magnetometer (MAG)', 'on', 'on'],
    ['Plasma Wave Subsystem (PWS)', 'on', 'on'],
    ['Cosmic Ray Subsystem (CRS)', 'off · 25 Feb 2025, to save power', 'on'],
    ['Low-Energy Charged Particles (LECP)', 'off · 17 Apr 2026, to save power', 'off · 24 Mar 2025'],
    ['Plasma Science (PLS)', 'off · 2007, degraded', 'off · 26 Sep 2024'],
    ['Imaging Science (ISS)', 'off · 14 Feb 1990', 'off · 1989'],
    ['IR Interferometer (IRIS)', 'off · 1998', 'off · 2007'],
    ['Photopolarimeter (PPS)', 'off · 1980, degraded', 'off · 1991, degraded'],
    ['Planetary Radio Astronomy (PRA)', 'off · 2008', 'off · 2008'],
    ['Ultraviolet Spectrometer (UVS)', 'off · 2016', 'off · 1998'],
  ],
  power: 'Three radioisotope thermoelectric generators; output falls about 4 watts per year and is below half the launch value (NASA, Apr 2026).',
};

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const FEED = 'https://science.nasa.gov/blogs/voyager/feed/';

export async function loadCatalysts() { return (await (await fetch('./data/catalysts.json')).json()).items; }

/** Live NASA blog feed (CORS is open on science.nasa.gov); falls back to the baked snapshot in data/news.json. */
export async function loadNews() {
  try {
    const ctrl = new AbortController(); const t = setTimeout(() => ctrl.abort(), 8000);
    const xml = await (await fetch(FEED, { signal: ctrl.signal })).text(); clearTimeout(t);
    const doc = new DOMParser().parseFromString(xml, 'text/xml');
    const items = [...doc.querySelectorAll('item')].map((it) => {
      const g = (tag) => (it.getElementsByTagName(tag)[0]?.textContent || '').trim();
      const tmp = document.createElement('div'); tmp.innerHTML = g('description'); const t2 = document.createElement('textarea'); t2.innerHTML = (tmp.textContent || ''); const summary = t2.value.replace(/\s+/g, ' ').trim().slice(0, 260);
      return { title: g('title'), url: g('link'), date: new Date(g('pubDate')).toISOString(), summary };
    }).filter(x => x.title && x.url);
    if (items.length) return { items, live: true };
  } catch (e) { /* fall through */ }
  const j = await (await fetch('./data/news.json')).json(); return { items: j.items, live: false, baked: j.meta.baked };
}

const fmtDate = (iso) => { const d = new Date(iso); return isNaN(d) ? iso : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }); };
const yearOfIso = (iso) => parseInt(iso.slice(0, iso.indexOf('-', 1)), 10);
function whenLabel(c) {
  const y = yearOfIso(c.date);
  if (c.precision === 'exact') return fmtDate(c.date) + (c.date.includes('T10:16:07') ? ' · 10:16:07 UTC' : '');
  if (y > 2200) return `~${y.toLocaleString('en-US')} AD`;
  if (c.precision === 'approx' && c.kind === 'engineering' && y === new Date().getUTCFullYear()) return 'coming weeks';
  return `~${y}`;
}
function countdown(c, now = Date.now()) {
  const y = yearOfIso(c.date); const ms = (y > 9999 ? Date.UTC(y, 0, 1) : new Date(c.date).getTime()) - now;
  if (ms <= 0) return 'passed';
  const d = ms / 86400000;
  if (d < 1) { const h = Math.floor(ms / 3600000), m = Math.floor(ms % 3600000 / 60000), s = Math.floor(ms % 60000 / 1000); return `${h}h ${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`; }
  if (d < 60) { const dd = Math.floor(d), h = Math.floor((d - dd) * 24); return `${dd}d ${h}h`; }
  if (d < 3650) return `${(d / 365.25).toFixed(1)} years`;
  return `${Math.round(d / 365.25).toLocaleString('en-US')} years`;
}

export function renderCatalysts(items, now = Date.now()) {
  return items.map((c) => {
    const past = (yearOfIso(c.date) > 9999 ? Date.UTC(yearOfIso(c.date), 0, 1) : new Date(c.date).getTime()) < now;
    const tag = c.kind === 'projected' ? '<i class="tg p">projected</i>' : c.precision === 'exact' ? '<i class="tg n">NASA date</i>' : '<i class="tg">NASA estimate</i>';
    return `<article class="cat ${past ? 'past' : ''} ${c.kind}"><div class="cat-w"><time>${esc(whenLabel(c))}</time><b data-cd="${esc(c.date)}">${past ? 'passed' : countdown(c, now)}</b></div>
      <div class="cat-b"><h4>${esc(c.title)}${tag}</h4><p>${esc(c.body)}</p><a href="${esc(c.url)}" target="_blank" rel="noopener">${esc(c.source)} ↗</a></div></article>`;
  }).join('');
}
export function tickCountdowns(root, items) {
  const now = Date.now(); const byDate = Object.fromEntries(items.map(c => [c.date, c]));
  for (const b of root.querySelectorAll('[data-cd]')) { const c = byDate[b.dataset.cd]; if (c) b.textContent = countdown(c, now); }
}
export function renderNews(res) {
  const head = `<p class="src">${res.live ? 'Live from science.nasa.gov/blogs/voyager' : 'Snapshot of science.nasa.gov/blogs/voyager · ' + fmtDate(res.baked || '')}</p>`;
  return head + res.items.slice(0, 12).map((n) => `<article class="news"><time>${esc(fmtDate(n.date))}</time><div><h4><a href="${esc(n.url)}" target="_blank" rel="noopener">${esc(n.title)}</a></h4><p>${esc(n.summary)}</p></div></article>`).join('');
}
export function renderHealth() {
  return `<table class="health"><thead><tr><th>Instrument</th><th>Voyager 1</th><th>Voyager 2</th></tr></thead><tbody>${HEALTH.rows.map(([n, a, b]) =>
    `<tr><td>${esc(n)}</td><td class="${a === 'on' ? 'on' : 'off'}">${esc(a)}</td><td class="${b === 'on' ? 'on' : 'off'}">${esc(b)}</td></tr>`).join('')}</tbody></table>
    <p class="src">${esc(HEALTH.power)} · <a href="${HEALTH.source}" target="_blank" rel="noopener">NASA status table, updated ${fmtDate(HEALTH.updated)} ↗</a></p>`;
}
