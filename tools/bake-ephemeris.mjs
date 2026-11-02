// Bake Voyager 1 + 2 heliocentric ecliptic state vectors from JPL Horizons into data/ephemeris.json
// Units: AU and AU/day. Rows: [jd, x, y, z, vx, vy, vz]. Dense (1 day) through the planetary flybys, 10 days after.
import { writeFileSync } from 'node:fs';
const H = 'https://ssd.jpl.nasa.gov/api/horizons.api';
async function pull(id, start, stop, step) {
  const q = new URLSearchParams({ format: 'text', COMMAND: `'${id}'`, OBJ_DATA: 'NO', MAKE_EPHEM: 'YES',
    EPHEM_TYPE: 'VECTORS', CENTER: "'500@10'", START_TIME: `'${start}'`, STOP_TIME: `'${stop}'`,
    STEP_SIZE: `'${step}'`, VEC_TABLE: "'2'", OUT_UNITS: "'AU-D'", REF_PLANE: "'ECLIPTIC'", CSV_FORMAT: "'YES'" });
  const txt = await (await fetch(`${H}?${q}`)).text();
  const body = txt.split('$$SOE')[1]?.split('$$EOE')[0];
  if (!body) throw new Error('no SOE for ' + id + ' ' + start + '\n' + txt.slice(0, 500));
  return body.trim().split('\n').map(l => {
    const c = l.split(',').map(s => s.trim());
    return [+c[0], +c[2], +c[3], +c[4], +c[5], +c[6], +c[7]].map((v, i) => i === 0 ? +v.toFixed(3) : +v.toFixed(i < 4 ? 5 : 7));
  });
}
const out = { meta: { source: 'JPL Horizons API (ssd-api.jpl.nasa.gov)', frame: 'heliocentric ecliptic J2000', units: 'AU, AU/day', baked: new Date().toISOString(), note: 'Horizons has no Voyager ephemeris after 2100-01-01; positions after that are extrapolated by the site and labelled PROJECTED.' } };
out.v1 = [...await pull('-31', '1977-09-06', '1981-12-31', '1 d'), ...await pull('-31', '1982-01-10', '2099-12-31', '10 d')];
out.v2 = [...await pull('-32', '1977-08-21', '1989-12-31', '1 d'), ...await pull('-32', '1990-01-10', '2099-12-31', '10 d')];
writeFileSync(new URL('../data/ephemeris.json', import.meta.url), JSON.stringify(out));
console.log('v1 rows', out.v1.length, 'v2 rows', out.v2.length, 'first', out.v1[0], 'last', out.v1.at(-1));
