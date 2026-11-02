// astro.js — orbital maths for the Voyager observatory. Plain ES module, no dependencies.
// Frames: heliocentric ecliptic J2000, units AU and AU/day (matches the baked JPL Horizons table).

export const AU_KM = 149597870.7;
export const AU_MI = 92955807.3;
export const C_KM_S = 299792.458;
export const DAY_S = 86400;
export const J2000 = 2451545.0;

export const jdNow = () => Date.now() / 86400000 + 2440587.5;
export const dateToJD = (d) => d.getTime() / 86400000 + 2440587.5;
export const jdToDate = (jd) => new Date((jd - 2440587.5) * 86400000);
export const isoToJD = (iso) => dateToJD(new Date(iso));

// ---------- Planets: Keplerian elements (Standish, JPL approximate positions 1800–2050) ----------
// [a, e, I, L, longPeri, longNode] + rates per Julian century. Degrees for angles.
export const PLANETS = [
  { id: 'mercury', name: 'Mercury', radiusAU: 1.631e-5, el: [0.38709927, 0.20563593, 7.00497902, 252.25032350, 77.45779628, 48.33076593], rate: [0.00000037, 0.00001906, -0.00594749, 149472.67411175, 0.16047689, -0.12534081], color: '#9a9a9a' },
  { id: 'venus', name: 'Venus', radiusAU: 4.045e-5, el: [0.72333566, 0.00677672, 3.39467605, 181.97909950, 131.60246718, 76.67984255], rate: [0.00000390, -0.00004107, -0.00078890, 58517.81538729, 0.00268329, -0.27769418], color: '#d9c18a' },
  { id: 'earth', name: 'Earth', radiusAU: 4.263e-5, el: [1.00000261, 0.01671123, -0.00001531, 100.46457166, 102.93768193, 0.0], rate: [0.00000562, -0.00004392, -0.01294668, 35999.37244981, 0.32327364, 0.0], color: '#6fa8ff' },
  { id: 'mars', name: 'Mars', radiusAU: 2.266e-5, el: [1.52371034, 0.09339410, 1.84969142, -4.55343205, -23.94362959, 49.55953891], rate: [0.00001847, 0.00007882, -0.00813131, 19140.30268499, 0.44441088, -0.29257343], color: '#d07a4a' },
  { id: 'jupiter', name: 'Jupiter', radiusAU: 4.779e-4, el: [5.20288700, 0.04838624, 1.30439695, 34.39644051, 14.72847983, 100.47390909], rate: [-0.00011607, -0.00013253, -0.00183714, 3034.74612775, 0.21252668, 0.20469106], color: '#d8b08a' },
  { id: 'saturn', name: 'Saturn', radiusAU: 4.027e-4, el: [9.53667594, 0.05386179, 2.48599187, 49.95424423, 92.59887831, 113.66242448], rate: [-0.00125060, -0.00050991, 0.00193609, 1222.49362201, -0.41897216, -0.28867794], color: '#e3cf9a' },
  { id: 'uranus', name: 'Uranus', radiusAU: 1.709e-4, el: [19.18916464, 0.04725744, 0.77263783, 313.23810451, 170.95427630, 74.01692503], rate: [-0.00196176, -0.00004397, -0.00242939, 428.48202785, 0.40805281, 0.04240589], color: '#9fd7e0' },
  { id: 'neptune', name: 'Neptune', radiusAU: 1.655e-4, el: [30.06992276, 0.00859048, 1.77004347, -55.12002969, 44.96476227, 131.78422574], rate: [0.00026291, 0.00005105, 0.00035372, 218.45945325, -0.32241464, -0.00508664], color: '#5f7fd8' },
];
export const SUN_RADIUS_AU = 0.00465047;

const D2R = Math.PI / 180;
function kepler(M, e) { // M radians → E radians
  let E = e < 0.8 ? M : Math.PI;
  for (let i = 0; i < 12; i++) { const d = (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E)); E -= d; if (Math.abs(d) < 1e-9) break; }
  return E;
}
/** Heliocentric ecliptic position [x,y,z] in AU for a planet at Julian date jd. */
export function planetPosition(p, jd) {
  const T = (jd - J2000) / 36525;
  const [a, e, I, L, wb, O] = p.el.map((v, i) => v + p.rate[i] * T);
  const w = wb - O; let M = ((L - wb) % 360 + 540) % 360 - 180;
  const E = kepler(M * D2R, e);
  const xp = a * (Math.cos(E) - e), yp = a * Math.sqrt(1 - e * e) * Math.sin(E);
  const cw = Math.cos(w * D2R), sw = Math.sin(w * D2R), cO = Math.cos(O * D2R), sO = Math.sin(O * D2R), cI = Math.cos(I * D2R), sI = Math.sin(I * D2R);
  return [
    (cw * cO - sw * sO * cI) * xp + (-sw * cO - cw * sO * cI) * yp,
    (cw * sO + sw * cO * cI) * xp + (-sw * sO + cw * cO * cI) * yp,
    (sw * sI) * xp + (cw * sI) * yp,
  ];
}
/** Approximate heliocentric velocity (AU/day) by central difference. */
export function planetVelocity(p, jd, h = 0.05) {
  const a = planetPosition(p, jd - h), b = planetPosition(p, jd + h);
  return [(b[0] - a[0]) / (2 * h), (b[1] - a[1]) / (2 * h), (b[2] - a[2]) / (2 * h)];
}

// ---------- Spacecraft: baked Horizons rows [jd, x, y, z, vx, vy, vz] ----------
export class Trajectory {
  constructor(rows, label) { this.rows = rows; this.label = label; this.jd0 = rows[0][0]; this.jd1 = rows[rows.length - 1][0]; }
  index(jd) { // largest i with rows[i].jd <= jd
    const r = this.rows; let lo = 0, hi = r.length - 1;
    while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (r[mid][0] <= jd) lo = mid; else hi = mid - 1; }
    return lo;
  }
  /** State at jd: {pos:[AU], vel:[AU/day], status:'fitted'|'projected'|'prelaunch'} using cubic Hermite between rows. */
  state(jd) {
    const r = this.rows;
    if (jd <= this.jd0) { const a = r[0]; return { pos: [a[1], a[2], a[3]], vel: [a[4], a[5], a[6]], status: 'prelaunch' }; }
    if (jd >= this.jd1) { // hyperbolic escape: effectively straight-line coasting at the asymptotic velocity
      const a = r[r.length - 1], dt = jd - this.jd1;
      return { pos: [a[1] + a[4] * dt, a[2] + a[5] * dt, a[3] + a[6] * dt], vel: [a[4], a[5], a[6]], status: 'projected' };
    }
    const i = this.index(jd), a = r[i], b = r[Math.min(i + 1, r.length - 1)];
    const h = b[0] - a[0] || 1, t = (jd - a[0]) / h, t2 = t * t, t3 = t2 * t;
    const h00 = 2 * t3 - 3 * t2 + 1, h10 = t3 - 2 * t2 + t, h01 = -2 * t3 + 3 * t2, h11 = t3 - t2;
    const pos = [0, 0, 0], vel = [0, 0, 0];
    for (let k = 0; k < 3; k++) {
      pos[k] = h00 * a[1 + k] + h10 * h * a[4 + k] + h01 * b[1 + k] + h11 * h * b[4 + k];
      vel[k] = a[4 + k] + (b[4 + k] - a[4 + k]) * t;
    }
    return { pos, vel, status: 'fitted' };
  }
  /** Sampled polyline between two dates (AU), n points, for drawing. */
  sample(jdA, jdB, n) { const out = []; for (let i = 0; i < n; i++) out.push(this.state(jdA + (jdB - jdA) * i / (n - 1)).pos); return out; }
}

export const len3 = (v) => Math.hypot(v[0], v[1], v[2]);
export const sub3 = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const dot3 = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

/** Everything the HUD needs for one craft at one instant. */
export function telemetry(traj, jd) {
  const s = traj.state(jd);
  const earth = PLANETS.find(p => p.id === 'earth');
  const ePos = planetPosition(earth, jd), eVel = planetVelocity(earth, jd);
  const rel = sub3(s.pos, ePos), relV = sub3(s.vel, eVel);
  const distEarthAU = len3(rel), distSunAU = len3(s.pos);
  const rangeRateKmS = dot3(rel, relV) / distEarthAU * AU_KM / DAY_S;
  const speedSunKmS = len3(s.vel) * AU_KM / DAY_S;
  return {
    jd, status: s.status, pos: s.pos, vel: s.vel,
    distEarthAU, distEarthKm: distEarthAU * AU_KM, distEarthMi: distEarthAU * AU_MI,
    distSunAU, distSunKm: distSunAU * AU_KM,
    speedSunKmS, rangeRateKmS,
    lightTimeS: distEarthAU * AU_KM / C_KM_S,
  };
}

// ---------- Gliese 445 (AC+79 3888): Gaia DR3 astrometry via SIMBAD, straight-line motion, no gravity ----------
export const LY_AU = 63241.077;
export const GLIESE445 = (() => {
  const d2r = Math.PI / 180, AU_PC = 206264.806, KMS_TO_AUD = DAY_S / AU_KM;
  const ra = 176.922445 * d2r, dec = 78.691160 * d2r, dpc = 1000 / 190.3251, pmra = 0.748418, pmde = 0.480804, rv = -111.51;
  const r = [Math.cos(dec) * Math.cos(ra), Math.cos(dec) * Math.sin(ra), Math.sin(dec)], e = [-Math.sin(ra), Math.cos(ra), 0], n = [-Math.sin(dec) * Math.cos(ra), -Math.sin(dec) * Math.sin(ra), Math.cos(dec)];
  const vt = 4.74047 * dpc, v = [0, 1, 2].map(i => (rv * r[i] + vt * pmra * e[i] + vt * pmde * n[i]) * KMS_TO_AUD), p = r.map(x => x * dpc * AU_PC);
  const eps = 23.4392911 * d2r, rot = q => [q[0], Math.cos(eps) * q[1] + Math.sin(eps) * q[2], -Math.sin(eps) * q[1] + Math.cos(eps) * q[2]];
  return { name: 'Gliese 445', pos0: rot(p), vel: rot(v), epoch: J2000, distLy0: Math.hypot(...p) / LY_AU, source: 'Gaia DR3 (SIMBAD): plx 190.33 mas, pm 748/481 mas/yr, RV −111.5 km/s' };
})();
export function gliesePos(jd) { const t = jd - GLIESE445.epoch; return GLIESE445.pos0.map((x, i) => x + GLIESE445.vel[i] * t); }
/** Closest approach of a craft to Gliese 445 (projected, coarse scan then refine). */
export function glieseEncounter(traj, fromJD) {
  let best = { jd: 0, ly: 1e99, starSunLy: 0 };
  const scan = (a, b, step) => { for (let jd = a; jd <= b; jd += step) { const s = traj.state(jd).pos, g = gliesePos(jd); const d = Math.hypot(s[0] - g[0], s[1] - g[1], s[2] - g[2]) / LY_AU; if (d < best.ly) best = { jd, ly: d, starSunLy: len3(g) / LY_AU }; } };
  scan(fromJD, fromJD + 120000 * 365.25, 100 * 365.25); scan(best.jd - 100 * 365.25, best.jd + 100 * 365.25, 365.25);
  return best;
}
export const yearOf = (jd) => Math.floor(2000 + (jd - J2000) / 365.25);

export function fmtInt(n) { return Math.round(n).toLocaleString('en-US'); }
export function fmtHMS(sec) {
  sec = Math.max(0, sec); const d = Math.floor(sec / 86400), h = Math.floor(sec % 86400 / 3600), m = Math.floor(sec % 3600 / 60), s = Math.floor(sec % 60);
  return { d, h, m, s };
}
export function fmtLightTime(sec) { const t = fmtHMS(sec); return `${t.d ? t.d + 'd ' : ''}${t.h}h ${String(t.m).padStart(2, '0')}m ${String(t.s).padStart(2, '0')}s`; }
export function fmtDate(jd) { return jdToDate(jd).toISOString().slice(0, 10); }
