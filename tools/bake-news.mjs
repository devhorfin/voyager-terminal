// Snapshot the NASA Voyager blog feed into data/news.json (fallback if the live fetch fails in the browser)
import { writeFileSync } from 'node:fs';
const xml = await (await fetch('https://science.nasa.gov/blogs/voyager/feed/')).text();
const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map(m => {
  const b = m[1]; const g = (tag) => { const r = b.match(new RegExp(`<${tag}>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?<\\/${tag}>`)); return r ? r[1].trim() : ''; };
  const desc = g('description').replace(/<[^>]+>/g, '').replace(/&#8217;/g, '’').replace(/&#8220;|&#8221;/g, '"').replace(/&amp;/g, '&').replace(/&#160;|&nbsp;/g, ' ').replace(/&#8230;/g, '…').replace(/\s+/g, ' ').trim();
  return { title: g('title').replace(/&#8217;/g, '’').replace(/&amp;/g, '&'), url: g('link'), date: new Date(g('pubDate')).toISOString(), summary: desc.slice(0, 260) };
});
writeFileSync(new URL('../data/news.json', import.meta.url), JSON.stringify({ meta: { source: 'https://science.nasa.gov/blogs/voyager/feed/', baked: new Date().toISOString() }, items }));
console.log('news items', items.length, items[0]);
