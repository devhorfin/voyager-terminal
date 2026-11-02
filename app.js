// VOYAGER 1 — Live Interstellar Observatory · scene + HUD (v0.3: cinematic batch)
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { Line2 } from 'three/addons/lines/Line2.js';
import { LineGeometry } from 'three/addons/lines/LineGeometry.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import { Lensflare, LensflareElement } from 'three/addons/objects/Lensflare.js';
import * as A from './astro.js';
import * as L from './log.js';

const BUILD = '0.6.1';
const $ = (s) => document.querySelector(s);
const isMobile = matchMedia('(max-width:760px)').matches || /iPhone|Android/i.test(navigator.userAgent);
const LAUNCH_JD = A.isoToJD('1977-09-05T12:56:00Z');
const LIGHT_DAY_JD = A.isoToJD('2026-11-18T10:16:07Z');          // NASA/JPL official time
const SILENT_JD = A.isoToJD('2036-01-01T00:00:00Z');             // NASA power estimate (approx.)
const OORT_IN_JD = A.isoToJD('2325-01-01T00:00:00Z');            // NASA: "about 300 years" to the inner edge
const OORT_OUT_JD = A.jdNow() + 30300 * 365.25;                  // NASA: "probably another 30,000 years" to the far side
const Y = 365.25;
const V = (p) => new THREE.Vector3(p[0], p[2], -p[1]);           // ecliptic (x,y,z) → scene (x, z, -y)

// ---------------- chapters (shot list) ----------------
// cam: dist = camera distance from the craft (AU); r/s/u = direction mix (radial-from-Sun, side, up); look = how far the
// aim point sits from the craft (× dist) toward the Sun (aim 0) or toward Gliese 445 (aim 1); orbit = dwell orbit speed
let ENC = { jd: A.jdNow() + 40000 * Y, ly: 1.6, starSunLy: 3.45 };
const fmtLy = (au) => (au / A.LY_AU).toFixed(au / A.LY_AU < 0.1 ? 4 : 3);
const projStats = (jd) => { const t = A.telemetry(V1, jd); const far = t.distEarthAU > 3000;
  return [
    far ? { v: fmtLy(t.distEarthAU), u: 'ly', k: 'from Earth · <b class="grey">projected</b>' } : { v: (t.distEarthKm / 1e9).toFixed(2), u: 'bn km', k: 'from Earth · <b class="grey">projected</b>' },
    { v: far ? fmtLy(t.distSunAU) : t.distSunAU.toFixed(1), u: far ? 'ly' : 'AU', k: 'from the Sun' },
    { v: t.speedSunKmS.toFixed(2), u: 'km/s', k: 'speed · heliocentric' },
  ]; };
const CH = [
  { num: '01', id: 'launch', title: 'Launch', when: '5 Sep 1977', jd: A.isoToJD('1977-09-06T00:00:00Z') + 2.2,
    sub: 'Titan IIIE-Centaur, Cape Canaveral. Sixteen days after its twin, on the faster road to Jupiter.',
    stats: [{ v: '1977', k: 'Sep 5 · 12:56 UTC', tag: 'NASA' }, { v: '825', u: 'kg', k: 'launch mass' }, { v: '470', u: 'W', k: 'RTG power at launch' }],
    cam: { dist: 0.011, r: -0.25, s: 1, u: -0.35, look: 0.15, orbit: 0.04 },
    pside: -1, psy: 0.27, photos: [{ src: 'launch', cap: 'Launch · Titan IIIE-Centaur · 5 Sep 1977 · NASA', w: 0.24 }] },
  { num: '02', id: 'jupiter', title: 'Jupiter', when: '5 Mar 1979', jd: A.isoToJD('1979-03-05T12:05:00Z') - 4.5,
    sub: 'Closest approach 349,000 km. The gravity assist that threw it on toward Saturn, and the first sight of volcanoes on Io.',
    stats: [{ v: '349,000', u: 'km', k: 'closest approach', tag: 'NASA' }, { v: '546', u: 'days', k: 'launch to Jupiter' }],
    cam: { dist: 0.2, r: -0.2, s: 1, u: 0.3, look: 0.1, orbit: 0.05 },
    photos: [{ src: 'jupiter', cap: 'Jupiter · taken by Voyager 1 · 24 Jan 1979 · NASA/JPL', w: 0.3 }, { src: 'io', cap: 'Io’s volcanic plumes · Voyager 1 · 4 Mar 1979 · NASA/JPL', w: 0.18 }] },
  { num: '03', id: 'saturn', title: 'Saturn & Titan', when: '12 Nov 1980', jd: A.isoToJD('1980-11-12T23:46:00Z') - 5.5,
    sub: 'The Titan flyby bent the path 35° out of the plane of the planets. No worlds left ahead; everything after this is the road out.',
    stats: [{ v: '124,000', u: 'km', k: 'closest approach', tag: 'NASA' }, { v: '35°', k: 'above the ecliptic' }],
    cam: { dist: 0.22, r: 0.35, s: 1, u: 0.25, look: 0.1, orbit: 0.045 },
    photos: [{ src: 'saturn2', cap: 'Saturn, Tethys and Dione · Voyager 1 · 3 Nov 1980 · NASA/JPL', w: 0.3 }] },
  { num: '04', id: 'pbd', title: 'Pale Blue Dot', when: '14 Feb 1990', jd: A.isoToJD('1990-02-14T04:48:00Z'),
    sub: 'At 6 billion kilometres the cameras turned back one last time. Earth was 0.12 of a pixel. Then they were switched off, to save power.',
    stats: [{ v: '6.0', u: 'bn km', k: 'from Earth', tag: 'NASA' }, { v: '0.12', u: 'px', k: 'Earth in the frame' }],
    cam: { dist: 0.5, r: 1, s: 0.55, u: 0.3, look: 0.4, orbit: 0.02 },
    psy: 0.2, photos: [{ src: 'pbd', cap: 'Pale Blue Dot · Voyager 1 · 14 Feb 1990 · NASA/JPL-Caltech (2020 reprocess)', w: 0.3 }, { src: 'family', cap: 'Family Portrait · 60 frames · Voyager 1 · 14 Feb 1990 · NASA/JPL', w: 0.2 }] },
  { num: '05', id: 'ts', title: 'Termination shock', when: '16 Dec 2004', jd: A.isoToJD('2004-12-16T00:00:00Z'),
    sub: 'Where the solar wind slows below the speed of sound. Voyager 1 becomes the first craft inside the heliosheath.',
    stats: [{ v: '94', u: 'AU', k: 'from the Sun', tag: 'NASA' }, { v: '27', u: 'years', k: 'in flight' }],
    cam: { dist: 0.7, r: 0.4, s: 1, u: 0.5, look: 0.1, orbit: 0.03 } },
  { num: '06', id: 'hp', title: 'Interstellar', when: '25 Aug 2012', jd: A.isoToJD('2012-08-25T00:00:00Z'),
    sub: 'The heliopause. Plasma density jumped forty-fold: the Sun’s bubble ended and the space between stars began.',
    stats: [{ v: '121', u: 'AU', k: 'heliopause crossing', tag: 'NASA' }, { v: '40×', k: 'plasma density jump', tag: 'PWS' }],
    cam: { dist: 0.9, r: 0.6, s: 1, u: 0.55, look: 0.15, orbit: 0.03 },
    photos: [{ src: 'montage', cap: 'The worlds Voyager saw · NASA/JPL montage', w: 0.26 }] },
  { num: '07', id: 'now', title: 'Now', when: 'live', jd: null, live: true,
    sub: 'Two instruments still listening: the magnetometer and the plasma-wave antennas. Power falls about 4 watts a year.',
    cam: { dist: 0.9, r: 1, s: 0.7, u: 0.3, look: 0.25, orbit: 0.025 } },
  { num: '08', id: 'lightday', title: 'One light-day', when: '18 Nov 2026', jd: LIGHT_DAY_JD, countdown: true,
    sub: 'At 10:16:07 UTC a radio signal from Earth takes a full day to reach it. The first thing we ever built to get this far.',
    cam: { dist: 1.2, r: 1, s: -0.8, u: 0.5, look: 0.3, orbit: 0.025 } },
  { num: '09', id: 'silent', title: 'Silent Voyager', when: '~2036 · projected', jd: SILENT_JD, projected: true,
    sub: 'Around 2036 the generators can no longer run a single instrument or the transmitter. Earth stops hearing it. Only the telemetry ends; the journey does not.',
    stats: () => [{ v: '~2036', k: 'last power · <b class="grey">NASA estimate</b>' }, ...projStats(SILENT_JD).slice(0, 2), { v: '4', u: 'W/yr', k: 'power loss · <b class="amber">NASA</b>' }],
    cam: { dist: 1.6, r: 1, s: 0.5, u: 0.5, look: 0.3, orbit: 0.015 } },
  { num: '10', id: 'gliese', title: 'Gliese 445', when: '~40,000 years · projected', jd: null, projected: true, star: true,
    sub: 'A red dwarf in Camelopardalis, falling toward the Sun at 111 km/s. Voyager drifts past it: the first star it will ever come near, long after anyone is listening.',
    stats: () => [{ v: '1.6', u: 'ly', k: 'closest pass · <b class="amber">NASA</b>' }, { v: ENC.ly.toFixed(2), u: 'ly', k: `our projection · year ${A.fmtInt(A.yearOf(ENC.jd))} · <b class="grey">Gaia DR3 motion</b>` }, { v: ENC.starSunLy.toFixed(2), u: 'ly', k: 'star from the Sun then' }, { v: fmtLy(A.telemetry(V1, ENC.jd).distSunAU), u: 'ly', k: 'Voyager from the Sun then' }],
    cam: { dist: 2.2, r: -1, s: 0.6, u: 0.3, look: 0.3, aim: 1, orbit: 0.02 } },
];
for (const c of CH) { c.cam.aim = c.cam.aim || 0; c.cam.orbit = c.cam.orbit || 0.02; }
const MILESTONES = () => [
  { jd: LIGHT_DAY_JD, name: 'one light-day', src: 'NASA' }, { jd: SILENT_JD, name: 'Silent Voyager', src: 'NASA estimate' },
  { jd: OORT_IN_JD, name: 'Oort cloud, inner edge', src: 'NASA ≈300 y' }, { jd: OORT_OUT_JD, name: 'Oort cloud, far side', src: 'NASA ≈30,000 y' },
  { jd: ENC.jd, name: 'Gliese 445 pass', src: 'projection' },
];
function tmChapter(years) {
  const jd = A.jdNow() + years * Y, next = MILESTONES().find(m => m.jd > jd + 1);
  const yrsTo = next ? (next.jd - jd) / Y : 0;
  return { num: 'TM', id: 'tm' + years, title: `+${A.fmtInt(years)} years`, when: `year ${A.fmtInt(A.yearOf(jd))} · projected`, jd, projected: true, tm: true,
    sub: years >= 1000 ? 'Straight-line coast from the last Horizons state in 2099. Nothing out here pulls hard enough to bend it; only the Sun’s slow tug, already tiny.' : 'Coasting on the Horizons-fitted path. No new tracking will exist by then; this is where the physics says it will be.',
    stats: () => [...projStats(jd), next ? { v: yrsTo < 2 ? A.fmtInt(yrsTo * Y) : A.fmtInt(yrsTo), u: yrsTo < 2 ? 'days' : 'years', k: `to ${next.name} · <b class="grey">${next.src}</b>` } : { v: 'beyond', k: 'last listed milestone' }],
    cam: years >= 10000 ? { dist: 2.2, r: -1, s: 0.6, u: 0.3, look: 0.3, aim: 1, orbit: 0.02 } : { dist: 1.5, r: 1, s: 0.6, u: 0.45, look: 0.3, aim: 0, orbit: 0.02 } };
}

let spinAcc = 0;
// ---------------- state ----------------
const S = {
  progress: 0, prevProgress: 0, vel: 0, travel: 0, chapterF: 0, chapterI: 0, jd: A.jdNow(), live: null, camDist: 1, tm: 0, dwell: 0,
  showV2: false, sound: false, mapOpen: false, signal: null, ready: false, lastChapterId: null,
};

// ---------------- renderer + post ----------------
const canvas = $('#gl');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: !isMobile, powerPreference: 'high-performance', logarithmicDepthBuffer: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, isMobile ? 1.5 : 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
renderer.outputColorSpace = THREE.SRGBColorSpace;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(50, 1, 1e-4, 1e8);
scene.add(camera);

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), isMobile ? 0.65 : 0.8, 0.5, 0.66);
composer.addPass(bloom);
// travel blur: radial streak toward the craft, driven by scroll speed
const streak = new ShaderPass({
  uniforms: { tDiffuse: { value: null }, uAmt: { value: 0 }, uCenter: { value: new THREE.Vector2(0.5, 0.5) } },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
  fragmentShader: `uniform sampler2D tDiffuse; uniform float uAmt; uniform vec2 uCenter; varying vec2 vUv;
    void main(){ if (uAmt < 0.002) { gl_FragColor = texture2D(tDiffuse, vUv); return; }
      vec2 d = (vUv - uCenter); vec4 c = vec4(0.0); float w = 0.0;
      for (int i = 0; i < 10; i++) { float t = float(i) / 9.0; float k = 1.0 - t * 0.6; c += texture2D(tDiffuse, vUv - d * t * uAmt * 0.35) * k; w += k; }
      gl_FragColor = c / w; }`,
});
composer.addPass(streak);
const grade = new ShaderPass({
  uniforms: { tDiffuse: { value: null }, uAber: { value: 0 }, uTime: { value: 0 }, uVig: { value: 0.42 } },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
  fragmentShader: `uniform sampler2D tDiffuse; uniform float uAber, uTime, uVig; varying vec2 vUv;
    float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233))) * 43758.5453); }
    void main(){
      vec2 c = vUv - 0.5; float r2 = dot(c,c);
      vec2 o = c * (0.0008 + uAber) * r2 * 12.0;
      vec3 col; col.r = texture2D(tDiffuse, vUv + o).r; col.g = texture2D(tDiffuse, vUv).g; col.b = texture2D(tDiffuse, vUv - o).b;
      col *= 1.0 - uVig * smoothstep(0.15, 0.85, r2 * 2.2);
      col += (hash(vUv * 1000.0 + fract(uTime)) - 0.5) * 0.010;
      gl_FragColor = vec4(col, 1.0);
    }`,
});
composer.addPass(grade);
composer.addPass(new OutputPass());

function resize() {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h, false); composer.setSize(w, h);
  bloom.resolution.set(Math.round(w / 2), Math.round(h / 2));
  camera.aspect = w / h; camera.updateProjectionMatrix();
  for (const m of [threadMat, threadMatV2, threadMatFar, linkMat]) m.resolution.set(w, h);
}
addEventListener('resize', resize);

// ---------------- lights ----------------
const sunLight = new THREE.PointLight(0xfff2dc, 2.6, 0, 0); scene.add(sunLight);
scene.add(new THREE.AmbientLight(0x8d9bff, 0.16));
const rim = new THREE.DirectionalLight(0xffd9a0, 0.9); scene.add(rim);
const fill = new THREE.DirectionalLight(0xfff4e6, 1.1); scene.add(fill); // camera-side fill so the craft always reads

// ---------------- sky (NASA SVS deep star map) ----------------
const texLoader = new THREE.TextureLoader();
const loadTex = (u, srgb = true) => new Promise((res, rej) => texLoader.load(u, (t) => { if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy()); res(t); }, undefined, rej));
const sky = new THREE.Mesh(new THREE.SphereGeometry(20000, 48, 32), new THREE.MeshBasicMaterial({ color: 0x000000, side: THREE.BackSide, depthWrite: false, fog: false }));
sky.renderOrder = -10; sky.rotation.x = -23.44 * Math.PI / 180;
scene.add(sky);

// ---------------- bodies ----------------
const bodies = [];
const sphereGeo = new THREE.SphereGeometry(1, isMobile ? 48 : 96, isMobile ? 32 : 64);
function makeBody(def, mat, realR, kMax, extra) {
  const group = new THREE.Group(); const mesh = new THREE.Mesh(sphereGeo, mat); group.add(mesh); scene.add(group);
  const b = { def, mesh, group, realR, kMax, ...extra }; bodies.push(b); return b;
}
const sunMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
const sun = makeBody({ id: 'sun', name: 'Sun' }, sunMat, A.SUN_RADIUS_AU, 110, { isSun: true });
const star = makeBody({ id: 'gliese', name: 'Gliese 445' }, new THREE.MeshBasicMaterial({ color: 0xffb27a }), 0.0012, 1e12, { isStar: true });
const PL = {};
const TILT = { earth: 23.4, mars: 25.2, jupiter: 3.1, saturn: 26.7, uranus: 97.8, neptune: 28.3 }, ROT = { mercury: 58.6, venus: -243, earth: 0.997, mars: 1.026, jupiter: 0.414, saturn: 0.444, uranus: -0.718, neptune: 0.671 };
for (const p of A.PLANETS) {
  const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.95, metalness: 0 });
  PL[p.id] = makeBody(p, mat, p.radiusAU, 320, { tilt: TILT[p.id] || 0, rot: ROT[p.id] || 1 });
  PL[p.id].mesh.rotation.z = PL[p.id].tilt * Math.PI / 180;
}
// Earth: day + night lights (night only where the Sun does not shine) + cloud shell + atmosphere rim
const earthUniforms = { uSunDirView: { value: new THREE.Vector3(0, 0, 1) } };
PL.earth.mesh.material.onBeforeCompile = (sh) => {
  sh.uniforms.uSunDirView = earthUniforms.uSunDirView;
  sh.fragmentShader = sh.fragmentShader.replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
    float nl = dot(normalize(normal), normalize(uSunDirView)); totalEmissiveRadiance *= smoothstep(0.12, -0.08, nl) * 1.6;`);
  sh.fragmentShader = sh.fragmentShader.replace('void main() {', 'uniform vec3 uSunDirView;\nvoid main() {');
};
PL.earth.mesh.material.emissive = new THREE.Color(0xffffff); PL.earth.mesh.material.emissiveIntensity = 1;
const clouds = new THREE.Mesh(sphereGeo, new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, depthWrite: false, roughness: 1, opacity: 0.95 }));
clouds.scale.setScalar(1.012); PL.earth.mesh.add(clouds);
const atmoMat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.FrontSide,
  uniforms: { uSunDirView: earthUniforms.uSunDirView, uColor: { value: new THREE.Color(0.35, 0.62, 1.0) } },
  vertexShader: `varying vec3 vN; varying vec3 vP; void main(){ vN = normalize(normalMatrix * normal); vec4 mv = modelViewMatrix * vec4(position,1.0); vP = mv.xyz; gl_Position = projectionMatrix * mv; }`,
  fragmentShader: `uniform vec3 uSunDirView; uniform vec3 uColor; varying vec3 vN; varying vec3 vP;
    void main(){ vec3 v = normalize(-vP); float fr = pow(1.0 - max(dot(vN, v), 0.0), 3.2); float lit = smoothstep(-0.35, 0.25, dot(vN, normalize(uSunDirView)));
      gl_FragColor = vec4(uColor * fr * lit * 1.4, fr * lit); }` });
const atmo = new THREE.Mesh(sphereGeo, atmoMat); atmo.scale.setScalar(1.045); PL.earth.mesh.add(atmo);
// Moon (mean-longitude approximation, enough for framing)
const moon = makeBody({ id: 'moon', name: 'Moon' }, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1 }), 1.161e-5, 320, { isMoon: true });
function moonPosition(jd) { const d = jd - A.J2000; const L = (218.316 + 13.176396 * d) * Math.PI / 180; const e = A.planetPosition(A.PLANETS[2], jd); const r = 0.002570; return [e[0] + r * Math.cos(L), e[1] + r * Math.sin(L), e[2]]; }
// Saturn rings
const ringGeo = new THREE.RingGeometry(1.24, 2.27, 128, 1);
{ const pos = ringGeo.attributes.position, uv = ringGeo.attributes.uv; const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) { v.fromBufferAttribute(pos, i); uv.setXY(i, (v.length() - 1.24) / (2.27 - 1.24), 0.5); } }
const ringMat = new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, side: THREE.DoubleSide, roughness: 1, depthWrite: false, emissive: 0xffffff, emissiveIntensity: 0.55 });
const ring = new THREE.Mesh(ringGeo, ringMat); ring.rotation.x = Math.PI / 2; PL.saturn.mesh.add(ring);
// Sun lens flare (photographic flare elements from the Three.js example set)
const flare = new Lensflare(); sun.group.add(flare);

// ---------------- the thread (Voyager 1 path) with time-lit shader ----------------
function makeThreadMaterial(color, width, dim) {
  const m = new LineMaterial({ color, linewidth: width, worldUnits: false, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  m.userData.uT = { value: 0 }; m.userData.uDim = { value: dim }; m.userData.uHead = { value: 0.0005 }; m.userData.uNow = { value: 1 }; m.userData.uBoost = { value: 1 };
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uT = m.userData.uT; sh.uniforms.uDim = m.userData.uDim; sh.uniforms.uHead = m.userData.uHead; sh.uniforms.uNow = m.userData.uNow; sh.uniforms.uBoost = m.userData.uBoost;
    sh.vertexShader = sh.vertexShader.replace('attribute vec3 instanceEnd;', 'attribute vec3 instanceEnd;\nattribute float instanceTStart;\nattribute float instanceTEnd;\nvarying float vT;')
      .replace('void main() {', 'void main() {\n vT = ( position.y < 0.5 ) ? instanceTStart : instanceTEnd;');
    sh.fragmentShader = sh.fragmentShader.replace('void main() {', 'varying float vT; uniform float uT; uniform float uDim; uniform float uHead; uniform float uNow; uniform float uBoost;\nvoid main() {')
      .replace('gl_FragColor = vec4( diffuseColor.rgb, alpha );',
        `float lit = 1.0 - smoothstep(uT, uT + 0.0015, vT);
         float fut = step(uNow, vT);
         vec3 base = mix(diffuseColor.rgb, vec3(0.80, 0.80, 0.84), fut * 0.85);
         float head = exp(-abs(vT - uT) / max(uHead, 1e-6)) * 0.9 * uBoost;
         vec3 c = mix(base * uDim, base * 0.95 * uBoost, lit) + base * head;
         gl_FragColor = vec4( c, alpha * mix(0.55, 1.0, lit) );`);
  };
  return m;
}
const threadMat = makeThreadMaterial(0xe2b95c, isMobile ? 2.2 : 2.6, 0.3);
const threadMatV2 = makeThreadMaterial(0xcfd3e6, 1.6, 0.18);
const threadMatFar = makeThreadMaterial(0xe2b95c, isMobile ? 2.2 : 2.6, 0.3);
const linkMat = new LineMaterial({ color: 0x9ec5ff, linewidth: 1.1, transparent: true, opacity: 0.32, depthWrite: false, blending: THREE.AdditiveBlending, dashed: true, dashSize: 0.6, gapSize: 0.4 });
function buildThread(traj, mat, n = 1400, jdA = traj.jd0, jdB = traj.jd1 + 0.0001, power = 3) {
  const pts = [], ts = [];
  for (let i = 0; i < n; i++) { const f = i / (n - 1); const jd = jdA + (jdB - jdA) * Math.pow(f, power);
    const p = traj.state(jd).pos; pts.push(p[0], p[2], -p[1]); ts.push(jd); }
  const g = new LineGeometry(); g.setPositions(pts);
  const seg = n - 1, tS = new Float32Array(seg), tE = new Float32Array(seg);
  for (let i = 0; i < seg; i++) { tS[i] = (ts[i] - jdA) / (jdB - jdA); tE[i] = (ts[i + 1] - jdA) / (jdB - jdA); }
  g.setAttribute('instanceTStart', new THREE.InstancedBufferAttribute(tS, 1));
  g.setAttribute('instanceTEnd', new THREE.InstancedBufferAttribute(tE, 1));
  const line = new Line2(g, mat); line.computeLineDistances(); line.frustumCulled = false; scene.add(line);
  return { line, jd0: jdA, jd1: jdB, mat };
}
const setThreadTime = (th, jd, nowJD, headFrac, boost) => { th.mat.userData.uT.value = (jd - th.jd0) / (th.jd1 - th.jd0); th.mat.userData.uNow.value = (nowJD - th.jd0) / (th.jd1 - th.jd0); th.mat.userData.uHead.value = Math.min(0.01, Math.max(2e-7, headFrac / (th.jd1 - th.jd0))); th.mat.userData.uBoost.value = boost; };

// Earth→craft signal link + pulse
const linkGeo = new LineGeometry(); linkGeo.setPositions([0, 0, 0, 1, 1, 1]);
const link = new Line2(linkGeo, linkMat); link.frustumCulled = false; link.visible = false; scene.add(link);
const pulse = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), new THREE.MeshBasicMaterial({ color: 0xcfe3ff, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false }));
pulse.visible = false; scene.add(pulse);

// dust: three parallax layers around the craft, stretched during travel
function makeDust(n, size, op, spread) {
  const pos = new Float32Array(n * 3); for (let i = 0; i < n * 3; i++) pos[i] = (Math.random() * 2 - 1) * spread;
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const m = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uSize: { value: size }, uOp: { value: op }, uRef: { value: 1 }, uStretch: { value: 0 } },
    vertexShader: `uniform float uSize, uRef, uStretch; varying float vA; void main(){ vec4 mv = modelViewMatrix * vec4(position,1.0); float d = length(position); vA = smoothstep(1.0, 0.35, d / ${spread.toFixed(2)}); gl_PointSize = clamp(uSize * uRef / max(uRef * 0.05, -mv.z), 1.0, 13.0) * (1.0 + uStretch * 2.0); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform float uOp; varying float vA; void main(){ vec2 c = gl_PointCoord - 0.5; float r = length(c); if (r > 0.5) discard; float a = smoothstep(0.5, 0.0, r) * uOp * vA; gl_FragColor = vec4(1.0,0.93,0.78,a); }` });
  const pts = new THREE.Points(g, m); pts.frustumCulled = false; scene.add(pts); return pts;
}
const dustLayers = [makeDust(isMobile ? 350 : 700, 6, 0.14, 1.0), makeDust(isMobile ? 120 : 260, 9, 0.09, 0.45), makeDust(isMobile ? 300 : 700, 3.5, 0.12, 2.4)];


// heliosphere: translucent boundary between the termination shock (~94 AU) and the heliopause (~121 AU) — a data surface, not art
const helioMat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
  uniforms: { uTime: { value: 0 }, uOp: { value: 0 }, uColor: { value: new THREE.Color(0.62, 0.70, 1.0) } },
  vertexShader: `varying vec3 vN; varying vec3 vP; varying vec3 vW; void main(){ vN = normalize(normalMatrix * normal); vec4 mv = modelViewMatrix * vec4(position,1.0); vP = mv.xyz; vW = position; gl_Position = projectionMatrix * mv; }`,
  fragmentShader: `uniform float uTime, uOp; uniform vec3 uColor; varying vec3 vN; varying vec3 vP; varying vec3 vW;
    float h(vec3 p){ return fract(sin(dot(p, vec3(12.9898,78.233,37.719))) * 43758.5453); }
    float n3(vec3 p){ vec3 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
      return mix(mix(mix(h(i),h(i+vec3(1,0,0)),f.x),mix(h(i+vec3(0,1,0)),h(i+vec3(1,1,0)),f.x),f.y),mix(mix(h(i+vec3(0,0,1)),h(i+vec3(1,0,1)),f.x),mix(h(i+vec3(0,1,1)),h(i+vec3(1,1,1)),f.x),f.y),f.z); }
    void main(){ vec3 v = normalize(-vP); float fr = pow(1.0 - abs(dot(normalize(vN), v)), 2.2);
      float rip = n3(normalize(vW) * 6.0 + uTime * 0.05) * 0.6 + n3(normalize(vW) * 18.0 - uTime * 0.08) * 0.4;
      float a = (fr * 0.9 + 0.03) * (0.45 + rip * 0.8) * uOp; gl_FragColor = vec4(uColor * (0.5 + rip * 0.9), a); }` });
const helioShell = new THREE.Mesh(new THREE.SphereGeometry(121, 96, 64), helioMat); helioShell.frustumCulled = false; scene.add(helioShell);
const helioInner = new THREE.Mesh(new THREE.SphereGeometry(94, 64, 48), helioMat); helioInner.frustumCulled = false; scene.add(helioInner);
// plasma ring: particles around the craft whose radius breathes with the real plasma-wave recording
const plasma = (() => { const n = isMobile ? 220 : 420, pos = new Float32Array(n * 3), seed = new Float32Array(n);
  for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, r = 0.7 + Math.random() * 0.6; pos[i * 3] = Math.cos(a) * r; pos[i * 3 + 1] = (Math.random() - 0.5) * 0.25; pos[i * 3 + 2] = Math.sin(a) * r; seed[i] = Math.random(); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('seed', new THREE.BufferAttribute(seed, 1));
  const m = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uRef: { value: 1 }, uLevel: { value: 0 }, uTime: { value: 0 }, uOp: { value: 0 } },
    vertexShader: `attribute float seed; uniform float uRef, uLevel, uTime; varying float vA; void main(){ vec3 p = position; float ang = uTime * (0.15 + seed * 0.2); float c = cos(ang), s = sin(ang); p.xz = mat2(c,-s,s,c) * p.xz; p *= 1.0 + uLevel * (0.4 + seed * 0.8); p.y += sin(uTime * 2.0 + seed * 20.0) * 0.08 * uLevel; vec4 mv = modelViewMatrix * vec4(p,1.0); vA = 0.35 + uLevel * 0.9; gl_PointSize = clamp((6.0 + uLevel * 10.0) * uRef / max(uRef * 0.05, -mv.z), 1.0, 16.0); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform float uOp; varying float vA; void main(){ vec2 c = gl_PointCoord - 0.5; float r = length(c); if (r > 0.5) discard; gl_FragColor = vec4(0.95, 0.85, 0.62, smoothstep(0.5, 0.0, r) * vA * uOp); }` });
  const pts = new THREE.Points(g, m); pts.frustumCulled = false; scene.add(pts); return pts; })();

// real bright stars (Yale BSC) with their proper motions: the sky really changes on the time machine
let starField = null;
async function buildStars() {
  const d = await (await fetch('./data/stars.json')).json(); const rows = d.stars, n = rows.length;
  const pos = new Float32Array(n * 3), pm = new Float32Array(n * 2), mag = new Float32Array(n), col = new Float32Array(n * 3);
  const eps = 23.4392911 * Math.PI / 180, ce = Math.cos(eps), se = Math.sin(eps);
  for (let i = 0; i < n; i++) { const [ra, de, v, bv, pra, pde] = rows[i]; pos[i * 3] = ra * Math.PI / 180; pos[i * 3 + 1] = de * Math.PI / 180; pos[i * 3 + 2] = 0; pm[i * 2] = pra; pm[i * 2 + 1] = pde; mag[i] = v;
    const t = Math.max(-0.3, Math.min(1.8, bv)); col[i * 3] = 1.0; col[i * 3 + 1] = 0.97 - t * 0.22; col[i * 3 + 2] = Math.max(0.55, 1.05 - t * 0.45); if (t < 0.1) { col[i * 3] = 0.85 + t; } }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('pm', new THREE.BufferAttribute(pm, 2)); g.setAttribute('mag', new THREE.BufferAttribute(mag, 1)); g.setAttribute('col', new THREE.BufferAttribute(col, 3));
  const m = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending,
    uniforms: { uYears: { value: 0 }, uGain: { value: 0.35 }, uPx: { value: devicePixelRatio || 1 } },
    vertexShader: `attribute vec2 pm; attribute float mag; attribute vec3 col; uniform float uYears, uGain, uPx; varying vec3 vC; varying float vA;
      void main(){ float ra = position.x + (pm.x / 3600.0) * (3.14159265 / 180.0) * uYears / max(cos(position.y), 0.05); float de = position.y + (pm.y / 3600.0) * (3.14159265 / 180.0) * uYears;
        vec3 eq = vec3(cos(de) * cos(ra), cos(de) * sin(ra), sin(de)); float ce = ` + ce.toFixed(8) + `, se = ` + se.toFixed(8) + `; vec3 ec = vec3(eq.x, ce * eq.y + se * eq.z, -se * eq.y + ce * eq.z);
        vec3 p = vec3(ec.x, ec.z, -ec.y) * 15000.0; vec4 mv = modelViewMatrix * vec4(p + cameraPosition, 1.0);
        float b = pow(2.512, -(mag - 1.0) * 0.5); vA = clamp(b * uGain, 0.0, 1.0); vC = col; gl_PointSize = clamp((2.2 + b * 1.6) * uPx, 1.5, 7.0 * uPx); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `varying vec3 vC; varying float vA; void main(){ vec2 c = gl_PointCoord - 0.5; float r = length(c); if (r > 0.5) discard; float a = smoothstep(0.5, 0.05, r) * vA; gl_FragColor = vec4(vC, a); }` });
  starField = new THREE.Points(g, m); starField.frustumCulled = false; starField.renderOrder = -9; scene.add(starField);
}

// ---------------- Voyager's own photographs, in the scene ----------------
const plates = {}; const plateGroup = new THREE.Group(); scene.add(plateGroup);
const frameMat = new THREE.MeshBasicMaterial({ color: 0xe2b95c, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false });
function getPlate(src) {
  if (plates[src]) return plates[src];
  const mat = new THREE.MeshBasicMaterial({ color: 0xcfcfcf, transparent: true, opacity: 0, depthWrite: false });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat); mesh.visible = false; mesh.renderOrder = 5;
  const frame = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), frameMat.clone()); frame.position.z = -0.0005; frame.renderOrder = 4; mesh.add(frame);
  const pl = { mesh, mat, frame, ratio: 1, ready: false, label: addLabel('', 'photo', () => pl.labelPos), labelPos: new THREE.Vector3(), a: 0 };
  pl.label.classList.add('hide'); plateGroup.add(mesh); plates[src] = pl;
  loadTex(`./assets/photos/${src}.jpg`).then((t) => { mat.map = t; mat.needsUpdate = true; pl.ratio = t.image.width / t.image.height; pl.ready = true; });
  return pl;
}
function updatePlates(ch, dt) {
  const list = (ch.photos && !S.intro && S.travel < 0.5) ? ch.photos : [];
  const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion), up = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion);
  const d = S.camDist, narrow = innerWidth < 760;
  for (const k in plates) { const pl = plates[k]; const want = list.find(x => x.src === k); const target = want && pl.ready && S.dwell > 0.5 && !(narrow && list.indexOf(want) > 0) ? 1 : 0;
    pl.a += (target - pl.a) * Math.min(1, dt * 3); const vis = pl.a > 0.01; pl.mesh.visible = vis; pl.label.classList.toggle('hide', pl.a < 0.6);
    if (!vis) continue;
    const i = list.indexOf(want); const w = narrow ? Math.min((want ? want.w : 0.25) * d * 1.1, 0.34 * d) : (want ? want.w : 0.25) * d; const hgt = w / pl.ratio;
    const side = ch.pside || 1; const sx = narrow ? 0.1 : 0.40 * side, sy = narrow ? 0.22 : (i === 0 ? (ch.psy ?? 0.16) : -0.1);
    pl.mesh.position.copy(craft.position).add(right.clone().multiplyScalar(sx * d)).add(up.clone().multiplyScalar(sy * d));
    pl.mesh.quaternion.copy(camera.quaternion); pl.mesh.scale.set(w, hgt, 1); pl.frame.scale.set(1 + 0.012 * d / w * 2, 1 + 0.012 * d / hgt * 2, 1);
    pl.mat.opacity = pl.a; pl.frame.material.opacity = pl.a * 0.35;
    pl.labelPos.copy(pl.mesh.position).sub(up.clone().multiplyScalar(hgt * 0.5 + 0.02 * d)); if (want) pl.label.textContent = want.cap;
  }
  if (list.length) for (const x of list) getPlate(x.src);
}
// ---------------- labels ----------------
const labelsEl = $('#labels'); const labels = [];
function addLabel(text, cls, getPos) { const el = document.createElement('div'); el.className = 'lb ' + (cls || ''); el.textContent = text; labelsEl.appendChild(el); labels.push({ el, getPos }); return el; }

// ---------------- HUD refs ----------------
const el = { chapter: $('#chapter'), num: $('#chNum'), when: $('#chWhen'), title: $('#chTitle'), sub: $('#chSub'), stats: $('#chStats'), nav: $('#chapterNav'), rail: $('#rail'), counter: $('#counter'),
  utc: $('#utc'), mday: $('#mday'), badge: $('#badge'), badgeText: $('#badgeText'), cue: $('#cue'), toast: $('#toast'), map: $('#map'), mapCanvas: $('#mapCanvas'), mapDate: $('#mapDate'), tm: $('#tm'),
  lbTop: $('#lbTop'), lbBot: $('#lbBot'), tele: $('#tele'), teleLead: $('#teleLead line'), teleState: $('#teleState'), inst: $('#inst'), spec: $('#spec'), teleF: $('#teleF') };

// ---------------- data + assets ----------------
let V1, V2, craft, craftModel, record, thread1, thread2, threadFar, craftLabel, starLabel;
const loaderBar = $('#loaderBar'), loaderText = $('#loaderText');
const setLoad = (f, t) => { loaderBar.style.width = Math.round(f * 100) + '%'; if (t) loaderText.textContent = t; };
const T = (n) => `./assets/tex/${n}${isMobile ? '_2k' : ''}.jpg`;

async function load() {
  setLoad(0.05, 'Loading trajectory');
  const eph = await (await fetch('./data/ephemeris.json')).json();
  V1 = new A.Trajectory(eph.v1, 'Voyager 1'); V2 = new A.Trajectory(eph.v2, 'Voyager 2');
  ENC = A.glieseEncounter(V1, V1.jd1); CH[9].jd = ENC.jd;
  setLoad(0.2, 'Loading sky');
  const maxTex = renderer.capabilities.maxTextureSize; const skyRes = isMobile ? (maxTex >= 4096 ? '4k' : '2k') : (maxTex >= 8192 ? '8k' : '4k');
  const skyTex = await loadTex(`./assets/tex/starmap_${skyRes}.jpg`); skyTex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  sky.material.map = skyTex; sky.material.color.setScalar(0.62); sky.material.needsUpdate = true;
  setLoad(0.4, 'Loading worlds');
  const [day, night, cl, jup, sat, sunT, moonT, merc, ven, mar, ura, nep, rt, rec] = await Promise.all([
    loadTex(T('earth_day')), loadTex(T('earth_night')), loadTex(T('earth_clouds'), false), loadTex(T('jupiter')), loadTex(T('saturn')), loadTex('./assets/tex/sun.jpg'), loadTex('./assets/tex/moon.jpg'),
    loadTex('./assets/tex/mercury.jpg'), loadTex('./assets/tex/venus_atmosphere.jpg'), loadTex('./assets/tex/mars.jpg'), loadTex('./assets/tex/uranus.jpg'), loadTex('./assets/tex/neptune.jpg'),
    loadTex('./assets/tex/saturn_ring.png'), loadTex('./assets/tex/golden_record.jpg')]);
  const setMap = (b, t) => { b.mesh.material.map = t; b.mesh.material.needsUpdate = true; };
  setMap(PL.earth, day); PL.earth.mesh.material.emissiveMap = night; clouds.material.alphaMap = cl; clouds.material.needsUpdate = true;
  setMap(PL.jupiter, jup); setMap(PL.saturn, sat); setMap(sun, sunT); setMap(moon, moonT); setMap(PL.mercury, merc); setMap(PL.venus, ven); setMap(PL.mars, mar); setMap(PL.uranus, ura); setMap(PL.neptune, nep);
  ringMat.map = rt; ringMat.alphaMap = rt; ringMat.emissiveMap = rt; ringMat.needsUpdate = true;
  const [f0, f3] = await Promise.all([loadTex('./assets/tex/flare/lensflare0.png'), loadTex('./assets/tex/flare/lensflare3.png')]);
  flare.addElement(new LensflareElement(f0, isMobile ? 420 : 640, 0, new THREE.Color(1, 0.93, 0.8)));
  for (const [sz, d] of [[60, 0.55], [90, 0.72], [120, 0.86], [70, 1.0]]) flare.addElement(new LensflareElement(f3, sz, d, new THREE.Color(1, 0.86, 0.6)));
  setLoad(0.7, 'Loading spacecraft');
  const gltf = await new Promise((res, rej) => new GLTFLoader().load('./assets/voyager_nasa.glb', res, undefined, rej));
  craft = new THREE.Group(); craftModel = gltf.scene; scene.add(craft);
  { // normalise: centre, largest dimension = 1
    const box = new THREE.Box3().setFromObject(craftModel); const size = new THREE.Vector3(); box.getSize(size); const ctr = new THREE.Vector3(); box.getCenter(ctr);
    const s = 1 / Math.max(size.x, size.y, size.z); craftModel.position.copy(ctr).multiplyScalar(-s); craftModel.scale.setScalar(s);
    const holder = new THREE.Group(); holder.add(craftModel); craft.add(holder); craft.userData.holder = holder;
    craftModel.traverse((o) => { if (o.isMesh) { o.frustumCulled = false; if (o.material) { o.material.roughness = Math.min(0.75, o.material.roughness ?? 0.6); o.material.metalness = Math.max(0.35, o.material.metalness ?? 0.3); o.material.envMapIntensity = 0; } } });
  }
  // Golden Record: real NASA cover scan on a thin disc bolted to the bus
  record = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.0025, 48), [new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 1, roughness: 0.35 }), new THREE.MeshStandardMaterial({ map: rec, metalness: 0.9, roughness: 0.32 }), new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 1, roughness: 0.4 })]);
  record.position.set(0.075, -0.015, 0.02); record.rotation.z = Math.PI / 2; craft.userData.holder.add(record);
  setLoad(0.9, 'Weaving the thread');
  thread1 = buildThread(V1, threadMat); thread2 = buildThread(V2, threadMatV2, 1000); thread2.line.visible = false;
  threadFar = buildThread(V1, threadMatFar, 2400, V1.jd1, ENC.jd + 20000 * Y, 1);
  addLabel('Sun', '', () => sun.group.position); addLabel('Earth', '', () => PL.earth.group.position); addLabel('Moon', '', () => moon.group.position);
  addLabel('Jupiter', '', () => PL.jupiter.group.position); addLabel('Saturn', '', () => PL.saturn.group.position);
  addLabel('Uranus', '', () => PL.uranus.group.position); addLabel('Neptune', '', () => PL.neptune.group.position);
  craftLabel = addLabel('Voyager 1', 'craft', () => craft.position);
  starLabel = addLabel('Gliese 445', 'star', () => star.group.position); starLabel.classList.add('hide');
  S.v2Label = addLabel('Voyager 2', 'v2', () => v2Marker.position); S.v2Label.classList.add('hide');
  youLabel = addLabel('You', 'you', () => youMarker.position); youLabel.classList.add('hide');
  buildStars().catch(() => {});
  setLoad(1, 'Ready');
  resize(); S.ready = true;
  setTimeout(() => $('#loader').classList.add('hidden'), 300);
}
const v2Marker = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), new THREE.MeshBasicMaterial({ color: 0xcfd3e6 })); v2Marker.visible = false; scene.add(v2Marker);

// ---------------- scroll → time ----------------
function scrollProgress() { if (S.forceP != null) return S.forceP; const max = document.documentElement.scrollHeight - innerHeight; return max > 0 ? Math.min(1, Math.max(0, scrollY / max)) : 0; }
const plateau = (f) => { const x = Math.min(1, Math.max(0, (f - 0.12) / 0.76)); return x * x * (3 - 2 * x); };
function chapterJD(i) { const c = CH[i]; return c.live ? A.jdNow() : c.jd; }
const CAMK = ['dist', 'r', 's', 'u', 'look', 'aim', 'orbit'];
function timeForProgress(p) {
  if (S.tm) { const c = S.tmChapter || (S.tmChapter = tmChapter(S.tm)); S.cam = { ...c.cam }; S.tween = 0.5; return c.jd; }
  const n = CH.length, cf = p * (n - 1), i = Math.min(n - 2, Math.floor(cf)), f = cf - i;
  const a = chapterJD(i), b = chapterJD(i + 1), e = plateau(f);
  S.chapterF = cf; S.chapterI = f < 0.5 ? i : i + 1;
  const ca = CH[i].cam, cb = CH[i + 1].cam, cam = {};
  for (const k of CAMK) cam[k] = ca[k] + (cb[k] - ca[k]) * e;
  S.cam = cam; S.tween = e;
  return a + (b - a) * e;
}
function gotoChapter(i) { setTM(0); const max = document.documentElement.scrollHeight - innerHeight; window.scrollTo({ top: max * i / (CH.length - 1), behavior: 'smooth' }); }
const currentChapter = () => S.tm ? S.tmChapter : CH[S.chapterI];

// ---------------- time machine ----------------
function setTM(years) {
  S.tm = years; S.tmChapter = years ? tmChapter(years) : null;
  for (const b of el.tm.querySelectorAll('button')) b.classList.toggle('on', +b.dataset.y === years);
  if (years) toast(`Fast-forward ${A.fmtInt(years)} years · projected · no tracking exists this far out`);
}
for (const b of el.tm.querySelectorAll('button')) b.addEventListener('click', () => setTM(+b.dataset.y));

// ---------------- HUD: choreographed type ----------------
function buildNav() {
  el.nav.innerHTML = CH.map((c, i) => `<a data-i="${i}"><b>${c.num}</b>${c.title}</a>`).join('');
  el.rail.innerHTML = CH.map((c, i) => `<a data-i="${i}"></a>`).join('');
  for (const a of document.querySelectorAll('#chapterNav a, #rail a')) a.addEventListener('click', () => gotoChapter(+a.dataset.i));
}
function revealTitle(text) { let i = 0; el.title.innerHTML = text.split(' ').map(w => `<span class="w">${[...w].map(ch => `<span class="ch" style="--i:${i++}">${ch}</span>`).join('')}</span>`).join(' '); }
const easeOut = (x) => 1 - Math.pow(1 - x, 3);
function rollNumbers(root) { // odometer: count each numeric stat up from zero
  const now = performance.now();
  for (const v of root.querySelectorAll('.v')) {
    const node = [...v.childNodes].find(n => n.nodeType === 3 && /\d/.test(n.textContent)); if (!node) continue;
    const txt = node.textContent, m = txt.match(/^([^\d]*)([\d,]+)(\.\d+)?(.*)$/); if (!m) continue;
    const target = parseFloat(m[2].replace(/,/g, '') + (m[3] || '')), dec = m[3] ? m[3].length - 1 : 0, pre = m[1], post = m[4];
    const grouped = m[2].includes(',');
    const tick = (t) => { const f = Math.min(1, (t - now) / 1100); const val = target * easeOut(f);
      node.textContent = pre + (grouped ? Math.round(val).toLocaleString('en-US') : val.toFixed(dec)) + post; if (f < 1) requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
  }
}
function statHTML(s) { return `<div class="stat"><div class="v">${s.v}${s.u ? `<small>${s.u}</small>` : ''}</div><div class="k">${s.k}${s.tag ? ` · <b class="${s.tagCls || ''}">${s.tag}</b>` : ''}</div></div>`; }
function setChapterText(c) {
  el.num.textContent = c.num; el.when.textContent = c.when; revealTitle(c.title); el.sub.textContent = c.sub;
  if (c.live || c.countdown) { el.stats.innerHTML = ''; renderLiveStats(c, true); }
  else { el.stats.innerHTML = (typeof c.stats === 'function' ? c.stats() : c.stats).map(statHTML).join(''); rollNumbers(el.stats); }
}
function showChapter(c, i) {
  if (S.lastChapterId === c.id) return; const firstShow = S.lastChapterId === null; S.lastChapterId = c.id; S.dwell = 0; S.orbit.az = 0; S.orbit.el = 0; spinAcc = 0;
  if (!firstShow) { sfxTick(); setTimeout(() => sfxChord(c.projected ? 174.6 : c.live ? 246.9 : 220, !!c.projected), 500); }
  el.chapter.classList.add('fade');
  setTimeout(() => { setChapterText(c); el.chapter.classList.remove('fade'); }, 220);
  for (const a of document.querySelectorAll('#chapterNav a, #rail a')) a.classList.toggle('on', !c.tm && +a.dataset.i === i);
  el.counter.textContent = c.tm ? 'TM' : `${c.num} / ${String(CH.length).padStart(2, '0')}`;
  el.cue.classList.toggle('off', i > 0 || !!c.tm);
  const badge = c.live ? ['fitted', 'Live estimate · JPL Horizons'] : c.countdown ? ['telemetry', 'NASA/JPL official time']
    : c.id === 'silent' ? ['projected', 'Mission status: Silent Voyager · projected'] : c.projected ? ['projected', 'Projected · beyond Horizons 2099']
    : ['telemetry', `Fitted trajectory · JPL Horizons · ${c.when}`];
  el.badge.className = 'badge ' + badge[0]; el.badgeText.textContent = badge[1];
}
let liveEls = null;
function renderLiveStats(c, rebuild) {
  const t = S.live; if (!t) return;
  if (c.live) {
    if (rebuild || !liveEls || liveEls.kind !== 'now' || liveEls.v2 !== S.showV2) {
      const rows = [
        { v: '<span data-k="km"></span>', u: 'km', k: 'from Earth · <b>live estimate</b>' },
        { v: '<span data-k="au"></span>', u: 'AU', k: 'from the Sun' },
        { v: '<span data-k="lt"></span>', k: 'one-way light time' },
        { v: '<span data-k="v"></span>', u: 'km/s', k: 'speed · heliocentric' },
      ];
      if (S.showV2) rows.push({ v: '<span data-k="km2"></span>', u: 'km', k: 'Voyager 2 · from Earth · <b class="grey">live estimate</b>' }, { v: '<span data-k="lt2"></span>', k: 'Voyager 2 · light time' });
      el.stats.innerHTML = rows.map(statHTML).join('');
      const q = (k) => el.stats.querySelector(`[data-k=${k}]`);
      liveEls = { kind: 'now', v2: S.showV2, km: q('km'), au: q('au'), lt: q('lt'), v: q('v'), km2: q('km2'), lt2: q('lt2'), t0: performance.now() };
    }
    const f = easeOut(Math.min(1, (performance.now() - liveEls.t0) / 1400)); // roll in on arrival
    liveEls.km.textContent = A.fmtInt(t.distEarthKm * f); liveEls.au.textContent = (t.distSunAU * f).toFixed(3);
    liveEls.lt.textContent = A.fmtLightTime(t.lightTimeS * f); liveEls.v.textContent = (t.speedSunKmS * f).toFixed(2);
    if (liveEls.km2) { const t2 = A.telemetry(V2, A.jdNow()); liveEls.km2.textContent = A.fmtInt(t2.distEarthKm); liveEls.lt2.textContent = A.fmtLightTime(t2.lightTimeS); }
  } else if (c.countdown) {
    const now = A.jdNow(), remain = (LIGHT_DAY_JD - now) * 86400, reached = remain <= 0;
    if (rebuild || !liveEls || liveEls.kind !== 'cd') {
      el.stats.innerHTML = (reached
        ? [{ v: 'Reached', k: '18 Nov 2026 · 10:16:07 UTC · <b class="amber">NASA/JPL</b>' }]
        : [{ v: '<span data-k="cd"></span>', k: 'until one light-day · <b class="amber">NASA/JPL time</b>' }]
      ).concat([{ v: '25.902', u: 'bn km', k: 'distance at the milestone · <b class="amber">NASA</b>' }, { v: '<span data-k="lt"></span>', k: 'light time now · <b>live estimate</b>' }]).map(statHTML).join('')
        + `<div class="stat"><button class="pill" id="btnSignal"><i></i>Send a signal</button><div class="k" id="signalK">1 s = 1 h · watch it cross</div></div><div class="stat dsn" id="dsnRow"></div>`;
      liveEls = { kind: 'cd', cd: el.stats.querySelector('[data-k=cd]'), lt: el.stats.querySelector('[data-k=lt]'), sig: el.stats.querySelector('#signalK'), btn: el.stats.querySelector('#btnSignal') };
      liveEls.btn.addEventListener('click', sendSignal); rollNumbers(el.stats);
    }
    if (!liveEls.dsnT || performance.now() - liveEls.dsnT > 5000) { liveEls.dsnT = performance.now(); const st = dsnStatus(now); const row = el.stats.querySelector('#dsnRow'); if (row) row.innerHTML = `<div class="k">Deep Space Network · who can hear it now</div>` + st.map(x => `<span class="${x.up ? 'up' : 'down'}"><i></i>${x.id} ${x.dish} · ${x.up ? 'up ' + x.el.toFixed(0) + '°' : 'below horizon'}</span>`).join(''); }
    if (liveEls.cd) { const r = A.fmtHMS(remain); liveEls.cd.textContent = `${r.d}d ${String(r.h).padStart(2, '0')}:${String(r.m).padStart(2, '0')}:${String(r.s).padStart(2, '0')}`; }
    liveEls.lt.textContent = A.fmtLightTime(t.lightTimeS);
    if (S.signal) { const hrs = S.signal.u * t.lightTimeS / 3600; const tt = A.fmtHMS(hrs * 3600);
      liveEls.sig.textContent = S.signal.u >= 1 ? `arrived · ${A.fmtLightTime(t.lightTimeS)} after leaving Earth` : `signal in flight · ${tt.h}h ${String(tt.m).padStart(2, '0')}m of ${A.fmtLightTime(t.lightTimeS)}`;
      liveEls.btn.classList.toggle('on', S.signal.u < 1); }
  }
}
function sendSignal() { const up = dsnStatus(A.jdNow()).filter(x => x.up); const from = up.length ? up.sort((a, b) => b.el - a.el)[0] : null; S.signal = { t0: performance.now(), u: 0, from }; sfxPing(true); toast(from ? `Signal sent from ${from.id} (${from.dish}) · 1 second = 1 hour` : 'No DSN dish has Voyager above the horizon right now · sent anyway, 1 s = 1 h'); }
let toastT; function toast(msg) { el.toast.textContent = msg; el.toast.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => el.toast.classList.remove('on'), 2600); }

// ---------------- in-world telemetry panel ----------------
const INSTR = [['MAG', 'magnetometer', true], ['PWS', 'plasma wave', true], ['CRS', 'cosmic ray', false, '2025'], ['LECP', 'charged particles', false, '2026'], ['PLS', 'plasma science', false, '2007'], ['ISS', 'cameras', false, '1990']];
let specCtx = null, analyser = null, specData = null;
function renderTelemetry(ch, jd) {
  const on = (ch.live || ch.countdown || ch.id === 'hp' || ch.id === 'ts' || ch.projected) && !isMobile && S.travel < 0.4;
  el.tele.classList.toggle('hidden', !on); if (!on) return;
  const silent = jd >= SILENT_JD, year = A.yearOf(jd);
  const state = silent ? 'no carrier · projected' : ch.live ? 'live telemetry · NASA status Apr 2026' : ch.countdown ? 'live telemetry' : `fitted · ${A.fmtDate(jd)}`;
  if (el.teleState.textContent !== state) {
    el.teleState.textContent = state;
    el.inst.innerHTML = INSTR.map(([k, n, onFlag, offYear]) => { const alive = !silent && (onFlag || (offYear && year < +offYear)); return `<span class="${alive ? 'on' : silent ? 'dead' : ''}"><i></i>${k} · ${alive ? 'on' : (offYear && !silent ? 'off ' + offYear : 'off')}</span>`; }).join('');
    el.teleF.textContent = silent ? 'last signal projected ~2036 · NASA power estimate' : 'plasma wave subsystem · ' + (S.sound ? 'live audio' : 'sound off');
  }
  if (!specCtx) specCtx = el.spec.getContext('2d');
  const w = el.spec.width, h = el.spec.height; specCtx.fillStyle = 'rgba(9,9,16,0.35)'; specCtx.fillRect(0, 0, w, h);
  if (analyser && S.sound && !silent) { analyser.getByteFrequencyData(specData); const n = 64, bw = w / n; for (let i = 0; i < n; i++) { const v = specData[Math.floor(i * specData.length / n / 3)] / 255; specCtx.fillStyle = `rgba(240,208,138,${0.25 + v * 0.75})`; specCtx.fillRect(i * bw, h - v * h, bw - 1, v * h); } }
  else { specCtx.strokeStyle = silent ? 'rgba(120,110,110,.5)' : 'rgba(240,208,138,.45)'; specCtx.beginPath(); for (let x = 0; x < w; x += 2) { const y = h / 2 + (silent ? 0 : Math.sin(x * 0.12 + performance.now() * 0.004) * 3 * Math.sin(x * 0.011)); specCtx.lineTo(x, y); } specCtx.stroke(); }
  const p = tmp.look.copy(craft.position).project(camera); const cx = (p.x + 1) / 2 * innerWidth, cy = (1 - p.y) / 2 * innerHeight;
  let px = Math.min(innerWidth - 260, cx + 70), py = Math.max(80, cy - 190); if (px > innerWidth - 520 && py < 230) py = 230;
  el.tele.style.transform = `translate(${px.toFixed(0)}px, ${py.toFixed(0)}px)`;
  el.teleLead.setAttribute('x1', 0); el.teleLead.setAttribute('y1', el.tele.offsetHeight); el.teleLead.setAttribute('x2', cx - px); el.teleLead.setAttribute('y2', cy - py);
}

// ---------------- map overlay ----------------
function drawMap() {
  const cv = el.mapCanvas, dpr = Math.min(2, devicePixelRatio || 1), w = cv.clientWidth, h = cv.clientHeight; if (!w) return;
  cv.width = w * dpr; cv.height = h * dpr; const g = cv.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.clearRect(0, 0, w, h); const cx = w / 2, cy = h / 2, R = Math.min(w, h) / 2 - 26;
  const jd = S.jd, farMode = S.jd > V1.jd1, maxAU = farMode ? Math.max(1000, A.len3(V1.state(jd).pos) * 1.4) : 420;
  const toR = (au) => Math.log10(1 + au / 0.25) / Math.log10(1 + maxAU / 0.25) * R;
  const pt = (p) => [cx + toR(Math.hypot(p[0], p[1])) * p[0] / (Math.hypot(p[0], p[1]) || 1), cy - toR(Math.hypot(p[0], p[1])) * p[1] / (Math.hypot(p[0], p[1]) || 1)];
  g.font = '500 9px JetBrains Mono, monospace'; g.textAlign = 'left';
  const rings = farMode ? [1, 10, 100, 1000, 10000, 100000].filter(a => a < maxAU) : [1, 5, 10, 30, 50, 100, 200, 400];
  for (const au of rings) { g.beginPath(); g.arc(cx, cy, toR(au), 0, Math.PI * 2); g.strokeStyle = 'rgba(255,255,255,.06)'; g.lineWidth = 1; g.stroke(); if (farMode || [1, 10, 100, 400].includes(au)) { g.fillStyle = 'rgba(242,242,246,.3)'; const rr = toR(au); g.fillText(au >= 1000 ? (au / A.LY_AU).toFixed(2) + ' ly' : au + ' AU', cx - rr * 0.7071 - 34, cy - rr * 0.7071 - 4); } }
  for (const au of [94, 121]) { g.beginPath(); g.setLineDash([3, 4]); g.arc(cx, cy, toR(au), 0, Math.PI * 2); g.strokeStyle = au === 121 ? 'rgba(242,242,246,.35)' : 'rgba(242,242,246,.18)'; g.stroke(); g.setLineDash([]); g.fillStyle = 'rgba(242,242,246,.4)'; if (au === 121) g.fillText('heliopause', cx - 28, cy - toR(au) - 5); else if (!farMode) g.fillText('termination shock', cx - 48, cy + toR(au) + 12); }
  if (farMode) { for (const au of [2000, 100000]) { g.beginPath(); g.setLineDash([2, 6]); g.arc(cx, cy, toR(au), 0, Math.PI * 2); g.strokeStyle = 'rgba(240,179,90,.25)'; g.stroke(); g.setLineDash([]); g.fillStyle = 'rgba(240,179,90,.5)'; g.fillText(au === 2000 ? 'Oort cloud · inner (est.)' : 'Oort cloud · outer (est.)', cx - 50, cy - toR(au) - 5); } }
  for (const p of A.PLANETS) { g.beginPath(); for (let i = 0; i <= 128; i++) { const q = A.planetPosition(p, A.J2000 + (i / 128) * 365.25 * Math.sqrt(p.el[0] ** 3)); const [x, y] = pt(q); i ? g.lineTo(x, y) : g.moveTo(x, y); } g.strokeStyle = 'rgba(255,255,255,.12)'; g.stroke(); }
  const drawPath = (traj, col, lw) => { g.beginPath(); const n = 400; for (let i = 0; i < n; i++) { const f = i / (n - 1); const t = traj.jd0 + (jd - traj.jd0) * f * f; const [x, y] = pt(traj.state(t).pos); i ? g.lineTo(x, y) : g.moveTo(x, y); } g.strokeStyle = col; g.lineWidth = lw; g.stroke(); };
  drawPath(V2, 'rgba(207,211,230,.55)', 1.2); drawPath(V1, farMode ? 'rgba(200,200,215,.8)' : '#e2b95c', 1.8);
  g.shadowColor = '#e2b95c'; g.shadowBlur = 12; drawPath(V1, 'rgba(240,208,138,.9)', 1); g.shadowBlur = 0;
  g.beginPath(); g.arc(cx, cy, 3.5, 0, Math.PI * 2); g.fillStyle = '#ffe6b0'; g.fill();
  S.mapHits = [];
  if (!farMode) for (const p of A.PLANETS) { const [x, y] = pt(A.planetPosition(p, jd)); if (p.id === 'earth') S.mapHits.push({ x, y, ch: 0 }); if (p.id === 'jupiter') S.mapHits.push({ x, y, ch: 1 }); if (p.id === 'saturn') S.mapHits.push({ x, y, ch: 2 }); g.beginPath(); g.arc(x, y, p.id === 'jupiter' || p.id === 'saturn' ? 3 : 2.2, 0, Math.PI * 2); g.fillStyle = p.color; g.fill(); if (!['mercury', 'venus', 'mars'].includes(p.id)) { g.fillStyle = 'rgba(242,242,246,.55)'; g.fillText(p.name, x + 6, y + 3); } }
  const mark = (traj, col, name) => { const s = traj.state(jd); const [x, y] = pt(s.pos); g.beginPath(); g.arc(x, y, 4, 0, Math.PI * 2); g.fillStyle = col; g.fill(); g.beginPath(); g.arc(x, y, 9, 0, Math.PI * 2); g.strokeStyle = col; g.lineWidth = 1; g.stroke(); g.fillStyle = col; g.font = '500 10px JetBrains Mono, monospace'; const au = A.len3(s.pos); g.fillText(`${name} · ${au > 3000 ? (au / A.LY_AU).toFixed(2) + ' ly' : au.toFixed(1) + ' AU'}`, x + 13, y + 4); };
  mark(V2, 'rgba(220,224,240,.9)', 'Voyager 2'); mark(V1, '#f0d08a', 'Voyager 1'); { const [x, y] = pt(V1.state(jd).pos); S.mapHits.push({ x, y, ch: 6 }); }
  if (farMode) { const gp = A.gliesePos(jd); const d = Math.hypot(gp[0], gp[1]); if (d < maxAU) { const [x, y] = pt(gp); g.beginPath(); g.arc(x, y, 3, 0, Math.PI * 2); g.fillStyle = '#ffb27a'; g.fill(); g.fillStyle = '#ffb27a'; g.fillText(`Gliese 445 · ${(A.len3(gp) / A.LY_AU).toFixed(2)} ly`, x + 8, y - 6); } }
  g.fillStyle = 'rgba(242,242,246,.3)'; g.font = '500 9px JetBrains Mono, monospace'; g.fillText('Sun', cx + 6, cy + 12);
  el.mapDate.textContent = `${farMode ? 'year ' + A.fmtInt(A.yearOf(jd)) : A.fmtDate(jd)} · ${S.jd > A.jdNow() + 1 ? 'projected' : 'JPL Horizons'}`;
}
// ---------------- mission log overlay ----------------
const LOG = { open: false, tab: 'cat', cat: null, news: null, timer: null };
async function renderLog() {
  const body = $('#logBody'); for (const b of document.querySelectorAll('#log .tabs button')) b.classList.toggle('on', b.dataset.t === LOG.tab);
  clearInterval(LOG.timer);
  if (LOG.tab === 'cat') { LOG.cat = LOG.cat || await L.loadCatalysts(); body.innerHTML = `<p class="src">Upcoming first. Countdowns are live; dates marked NASA estimate are NASA's own rounded figures; projected items are this site's calculations.</p>` + L.renderCatalysts(LOG.cat); LOG.timer = setInterval(() => L.tickCountdowns(body, LOG.cat), 1000); }
  else if (LOG.tab === 'news') { body.innerHTML = '<p class="src">Fetching science.nasa.gov/blogs/voyager…</p>'; LOG.news = LOG.news || await L.loadNews(); body.innerHTML = L.renderNews(LOG.news); }
  else body.innerHTML = L.renderHealth();
  body.scrollTop = 0;
}
function setLog(open, tab) { LOG.open = open; if (tab) LOG.tab = tab; $('#log').classList.toggle('hidden', !open); $('#btnLog').classList.toggle('on', open); if (open) renderLog(); else clearInterval(LOG.timer); }
$('#btnLog').addEventListener('click', () => setLog(!LOG.open));
$('#logClose').addEventListener('click', () => setLog(false));
for (const b of document.querySelectorAll('#log .tabs button')) b.addEventListener('click', () => { LOG.tab = b.dataset.t; renderLog(); });
$('#btnMap').addEventListener('click', () => { S.mapOpen = !S.mapOpen; el.map.classList.toggle('hidden', !S.mapOpen); $('#btnMap').classList.toggle('on', S.mapOpen); if (S.mapOpen) drawMap(); });
$('#mapClose').addEventListener('click', () => { S.mapOpen = false; el.map.classList.add('hidden'); $('#btnMap').classList.remove('on'); });
addEventListener('keydown', (e) => { if (e.key === 'Escape' && LOG.open) setLog(false); if (e.key === 'l' || e.key === 'L') setLog(!LOG.open); if (e.key === 'Escape' && S.mapOpen) $('#mapClose').click(); if (e.key === 'm' || e.key === 'M') $('#btnMap').click(); });
$('#btnV2').addEventListener('click', () => { S.showV2 = !S.showV2; $('#btnV2').classList.toggle('on', S.showV2); thread2.line.visible = S.showV2; v2Marker.visible = S.showV2; S.v2Label.classList.toggle('hide', !S.showV2); toast(S.showV2 ? 'Voyager 2 shown · launched first, slower road, 144 AU today' : 'Voyager 2 hidden'); });

// ---------------- sound ----------------
const audio = new Audio('./assets/pws.mp3'); audio.loop = true; audio.preload = 'auto'; audio.volume = 0; audio.crossOrigin = 'anonymous';
let actx = null;
function ensureAnalyser() { if (actx) return; try { actx = new (window.AudioContext || window.webkitAudioContext)(); const src = actx.createMediaElementSource(audio); analyser = actx.createAnalyser(); analyser.fftSize = 512; analyser.smoothingTimeConstant = 0.82; specData = new Uint8Array(analyser.frequencyBinCount); src.connect(analyser); analyser.connect(actx.destination); } catch (e) { analyser = null; } }
let fadeT; function setSound(on) { S.sound = on; $('#btnSound').classList.toggle('on', on); clearInterval(fadeT); el.teleState.textContent = '';
  if (on) { ensureAnalyser(); if (actx && actx.state === 'suspended') actx.resume(); sfxInit(); audio.play().catch(() => {}); fadeT = setInterval(() => { audio.volume = Math.min(0.55, audio.volume + 0.03); if (audio.volume >= 0.55) clearInterval(fadeT); }, 80); }
  else fadeT = setInterval(() => { audio.volume = Math.max(0, audio.volume - 0.05); if (audio.volume <= 0) { audio.pause(); clearInterval(fadeT); } }, 60); }
$('#btnSound').addEventListener('click', () => setSound(!S.sound));
function enter(withSound) { $('#gate').classList.add('hidden'); if (withSound) { setSound(true); sfxInit(); } S.entered = true; startIntro(withSound); }
$('#enterSound').addEventListener('click', () => enter(true)); $('#enterMuted').addEventListener('click', () => enter(false));


// ---------------- sound design (Web Audio synth layers: drone, thread hum, ticks, chords, pings) ----------------
const SFX = { ready: false };
function sfxInit() {
  if (SFX.ready || !actx) return; SFX.ready = true;
  const master = actx.createGain(); master.gain.value = 0.0; master.connect(actx.destination); SFX.master = master;
  const lp = actx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 180; lp.connect(master);
  const d1 = actx.createOscillator(); d1.type = 'sine'; d1.frequency.value = 41.2; const d2 = actx.createOscillator(); d2.type = 'triangle'; d2.frequency.value = 41.2 * 1.498; d2.detune.value = 6;
  const dg = actx.createGain(); dg.gain.value = 0.22; d1.connect(dg); d2.connect(dg); dg.connect(lp); d1.start(); d2.start(); SFX.droneGain = dg;
  const hum = actx.createOscillator(); hum.type = 'sawtooth'; hum.frequency.value = 110; const hf = actx.createBiquadFilter(); hf.type = 'bandpass'; hf.frequency.value = 400; hf.Q.value = 6;
  const hg = actx.createGain(); hg.gain.value = 0; hum.connect(hf); hf.connect(hg); hg.connect(master); hum.start(); SFX.hum = hum; SFX.humGain = hg; SFX.humFilter = hf;
  master.gain.linearRampToValueAtTime(0.9, actx.currentTime + 3);
}
function sfxTick() { if (!SFX.ready) return; const t = actx.currentTime, o = actx.createOscillator(), g = actx.createGain(); o.type = 'square'; o.frequency.setValueAtTime(1800, t); o.frequency.exponentialRampToValueAtTime(900, t + 0.04); g.gain.setValueAtTime(0.05, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.06); o.connect(g); g.connect(SFX.master); o.start(t); o.stop(t + 0.08); }
function sfxChord(root = 220, minor = false) { if (!SFX.ready) return; const t = actx.currentTime; for (const [ratio, amp] of [[1, 0.06], [minor ? 1.189 : 1.26, 0.04], [1.5, 0.045], [2, 0.03]]) { const o = actx.createOscillator(), g = actx.createGain(); o.type = 'sine'; o.frequency.value = root * ratio; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(amp, t + 0.6); g.gain.exponentialRampToValueAtTime(0.0001, t + 4.5); o.connect(g); g.connect(SFX.master); o.start(t); o.stop(t + 4.6); } }
function sfxPing(hi = true) { if (!SFX.ready) return; const t = actx.currentTime, o = actx.createOscillator(), g = actx.createGain(); o.type = 'sine'; o.frequency.setValueAtTime(hi ? 1320 : 660, t); o.frequency.exponentialRampToValueAtTime(hi ? 880 : 440, t + 0.5); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.12, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.2); o.connect(g); g.connect(SFX.master); o.start(t); o.stop(t + 1.3); }
function sfxUpdate(dt) { if (!SFX.ready) return; const tr = S.travel; SFX.humGain.gain.value += ((tr * 0.16) - SFX.humGain.gain.value) * Math.min(1, dt * 4); SFX.humFilter.frequency.value = 300 + tr * 1400; SFX.hum.frequency.value = 90 + tr * 80; SFX.droneGain.gain.value = 0.22 * (S.jd >= SILENT_JD ? 0.6 : 1); }
const greetings = new Audio('./assets/audio/greeting_un.mp3'); greetings.preload = 'auto'; greetings.volume = 0.8;

// ---------------- opening sequence: the Golden Record ----------------
const introEl = $('#intro');
function startIntro(withSound) {
  S.intro = { t0: performance.now(), withSound }; introEl.classList.remove('hidden'); document.body.classList.add('intro-on');
  if (withSound) { greetings.currentTime = 0; greetings.play().catch(() => {}); }
  setTimeout(() => { if (S.intro) endIntro(); }, 10500);
}
function endIntro() { if (!S.intro) return; S.intro = null; introEl.classList.add('hidden'); document.body.classList.remove('intro-on'); greetings.pause(); sfxChord(196); S.lastChapterId = null; }
$('#introSkip').addEventListener('click', endIntro);
addEventListener('wheel', () => { if (S.intro && performance.now() - S.intro.t0 > 1500) endIntro(); }, { passive: true });
addEventListener('touchmove', () => { if (S.intro && performance.now() - S.intro.t0 > 1500) endIntro(); }, { passive: true });

// ---------------- Deep Space Network: which dish can see Voyager right now ----------------
const DSN = [{ id: 'Goldstone', dish: 'DSS-14', lat: 35.43, lon: -116.89 }, { id: 'Madrid', dish: 'DSS-63', lat: 40.43, lon: -4.25 }, { id: 'Canberra', dish: 'DSS-43', lat: -35.40, lon: 148.98 }];
function dsnStatus(jd) { // Voyager 1 geocentric direction ~ RA 17h15m, Dec +12.1° (slowly changing; good to a degree)
  const ra = (17 + 15 / 60) * 15 * Math.PI / 180, dec = 12.1 * Math.PI / 180;
  const d = jd - A.J2000; const gmst = ((280.46061837 + 360.98564736629 * d) % 360 + 360) % 360;
  return DSN.map(st => { const lst = ((gmst + st.lon) % 360 + 360) % 360 * Math.PI / 180; const ha = lst - ra; const lat = st.lat * Math.PI / 180;
    const el = Math.asin(Math.sin(lat) * Math.sin(dec) + Math.cos(lat) * Math.cos(dec) * Math.cos(ha)) * 180 / Math.PI; return { ...st, el, up: el > 6 }; });
}

// ---------------- interactions: drag to orbit, rail scrub, map clicks, your year, postcard ----------------
S.orbit = { az: 0, el: 0 }; let dragging = null;
canvas.style.touchAction = 'pan-y';
canvas.addEventListener('pointerdown', (e) => { dragging = { x: e.clientX, y: e.clientY, az: S.orbit.az, el: S.orbit.el }; });
addEventListener('pointermove', (e) => { if (!dragging) return; S.orbit.az = dragging.az + (e.clientX - dragging.x) * 0.006; S.orbit.el = Math.max(-0.9, Math.min(0.9, dragging.el + (e.clientY - dragging.y) * 0.004)); });
addEventListener('pointerup', () => { dragging = null; });
el.rail.addEventListener('pointerdown', (e) => { const r = el.rail.getBoundingClientRect(); const f = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height)); window.__VOY.setProgress(f); e.preventDefault(); });
el.mapCanvas.addEventListener('click', (e) => { const r = el.mapCanvas.getBoundingClientRect(); const x = e.clientX - r.left, y = e.clientY - r.top; let best = null;
  for (const h of S.mapHits || []) { const d = Math.hypot(h.x - x, h.y - y); if (d < 22 && (!best || d < best.d)) best = { ...h, d }; }
  if (best) { $('#mapClose').click(); gotoChapter(best.ch); toast(`Flying to ${CH[best.ch].title}`); } });
function yourYear() {
  const y = parseInt(prompt('Your birth year? (1977 or later places you on the path)', '1995'), 10); if (!y || y < 1900 || y > A.yearOf(A.jdNow())) return;
  const jd = A.isoToJD(`${y}-01-01T00:00:00Z`); const jdc = Math.max(jd, V1.jd0 + 1); const t = A.telemetry(V1, jdc);
  S.you = { year: y, jd: jdc, pos: V(t.pos), km: t.distEarthKm, before: jd < V1.jd0 };
  youMarker.visible = true; youLabel.textContent = S.you.before ? `You · born ${y}, before launch` : `You · born ${y} · Voyager was ${(t.distEarthKm / 1e9).toFixed(1)} bn km out`; youLabel.classList.remove('hide');
  toast(S.you.before ? `Born ${y}: Voyager launched after you` : `Born ${y}: Voyager was already ${(t.distEarthKm / 1e9).toFixed(1)} bn km from Earth`);
}
const youMarker = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), new THREE.MeshBasicMaterial({ color: 0x9ec5ff })); youMarker.visible = false; scene.add(youMarker);
let youLabel = null;
$('#btnYear').addEventListener('click', yourYear);
async function postcard() {
  const t = S.live; const w = 1200, h = 630; const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d');
  composer.render(); g.drawImage(renderer.domElement, 0, 0, renderer.domElement.width, renderer.domElement.height, 0, 0, w, h);
  g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(0, 0, w, h); g.fillStyle = '#f2f2f6'; g.font = '300 92px Sora, Inter, sans-serif'; g.fillText(`${A.fmtInt(t.distEarthKm)} km`, 60, 330);
  g.font = '500 20px JetBrains Mono, monospace'; g.fillStyle = '#f0d08a'; g.fillText('VOYAGER 1 · FROM EARTH · LIVE ESTIMATE · JPL HORIZONS', 62, 372);
  g.fillStyle = 'rgba(242,242,246,.75)'; g.font = '400 26px Inter, sans-serif'; g.fillText(`${new Date().toUTCString()} · light time ${A.fmtLightTime(t.lightTimeS)}`, 62, 420);
  if (S.you && !S.you.before) g.fillText(`When I was born (${S.you.year}) it was ${(S.you.km / 1e9).toFixed(1)} bn km out.`, 62, 462);
  g.fillStyle = 'rgba(242,242,246,.45)'; g.font = '500 18px JetBrains Mono, monospace'; g.fillText('voyagerterminal.space', 62, 585);
  const blob = await new Promise(r => c.toBlob(r, 'image/png')); const file = new File([blob], 'voyager-now.png', { type: 'image/png' });
  if (navigator.canShare && navigator.canShare({ files: [file] })) { try { await navigator.share({ files: [file], title: 'Voyager 1 right now' }); return; } catch (e) {} }
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'voyager-now.png'; a.click(); toast('Postcard saved');
}
$('#btnCard').addEventListener('click', postcard);
// ---------------- frame ----------------
const tmp = { a: new THREE.Vector3(), b: new THREE.Vector3(), c: new THREE.Vector3(), up: new THREE.Vector3(0, 1, 0), q: new THREE.Quaternion(), look: new THREE.Vector3(), yAxis: new THREE.Vector3(0, 1, 0) };
const camPos = new THREE.Vector3(0, 0.3, 1.2), camLook = new THREE.Vector3();
let first = true, prevT = performance.now();
function frame(now) {
  requestAnimationFrame(frame); if (!S.ready) return;
  const dt = Math.min(0.1, (now - prevT) / 1000); prevT = now;
  S.progress = scrollProgress(); S.jd = timeForProgress(S.progress);
  const jd = S.jd, nowJD = A.jdNow();
  S.live = A.telemetry(V1, nowJD);
  // travel intensity from scroll speed
  const instVel = Math.abs(S.progress - S.prevProgress) / Math.max(dt, 1e-3); S.prevProgress = S.progress;
  S.vel += (instVel - S.vel) * Math.min(1, dt * 6); const travel = S.forceTravel != null ? S.forceTravel : Math.min(1, S.vel * 7); S.travel += (travel - S.travel) * Math.min(1, dt * 5);
  S.dwell += dt;

  // bodies
  const sunPos = V([0, 0, 0]); sun.group.position.copy(sunPos); sunLight.position.copy(sunPos);
  for (const p of A.PLANETS) { const b = PL[p.id]; b.group.position.copy(V(A.planetPosition(p, jd))); b.mesh.rotation.y = (jd / b.rot) * Math.PI * 2 % (Math.PI * 2); }
  moon.group.position.copy(V(moonPosition(jd))); clouds.rotation.y = (jd * 0.9) % (Math.PI * 2) * 0.02;
  star.group.position.copy(V(A.gliesePos(jd)));
  const st = V1.state(jd); craft.position.copy(V(st.pos));
  const st2 = V2.state(jd); v2Marker.position.copy(V(st2.pos));
  // craft orientation: dish points at Earth (true for Voyager since 1990)
  tmp.a.copy(PL.earth.group.position).sub(craft.position).normalize();
  tmp.q.setFromUnitVectors(tmp.yAxis, tmp.a); craft.quaternion.slerp(tmp.q, first ? 1 : 0.1);

  // camera rig
  const cam = S.cam, radial = tmp.b.copy(craft.position).sub(sunPos).normalize();
  const side = tmp.c.crossVectors(tmp.up, radial).normalize();
  spinAcc += dt * cam.orbit * (1 - S.travel * 0.5);
  const spin = S.progress * 1.6 + spinAcc;
  const sideR = side.clone().applyAxisAngle(radial, spin);
  const toStar = star.group.position.clone().sub(craft.position).normalize();
  const aim = cam.aim || 0;
  const dirSun = radial.clone().multiplyScalar(cam.r).add(sideR.clone().multiplyScalar(cam.s)).add(tmp.up.clone().multiplyScalar(cam.u)).normalize();
  const dirStar = toStar.clone().multiplyScalar(-1).add(sideR.clone().multiplyScalar(0.32)).add(tmp.up.clone().multiplyScalar(0.22)).normalize();
  let dir = dirSun.lerp(dirStar, aim).normalize();
  if (S.orbit.az || S.orbit.el) { dir.applyAxisAngle(tmp.up, S.orbit.az); const ax = new THREE.Vector3().crossVectors(dir, tmp.up).normalize(); dir.applyAxisAngle(ax, S.orbit.el).normalize(); }
  let dist = cam.dist * (1 + S.travel * 0.6); // pull back while travelling
  const target = craft.position.clone().add(dir.multiplyScalar(dist));
  const lookT = craft.position.clone().sub(radial.clone().multiplyScalar(dist * cam.look * (1 - aim))).add(toStar.multiplyScalar(dist * cam.look * aim));
  const t = now * 0.001; const drift = new THREE.Vector3(Math.sin(t * 0.21) * 0.018, Math.sin(t * 0.17 + 1.3) * 0.012, Math.cos(t * 0.13 + 0.4) * 0.015).multiplyScalar(dist);
  target.add(drift);
  if (S.intro && record) { // opening: hold on the Golden Record, then pull back to the launch shot
    const it = (performance.now() - S.intro.t0) / 1000; craft.scale.setScalar(cam.dist * 0.34); craft.updateMatrixWorld(true);
    const rp = new THREE.Vector3(); record.getWorldPosition(rp); const rn = new THREE.Vector3(1, 0, 0).applyQuaternion(craft.userData.holder.getWorldQuaternion(new THREE.Quaternion()));
    const close = rp.clone().add(rn.clone().multiplyScalar(cam.dist * 0.34 * 0.11)).add(tmp.up.clone().multiplyScalar(cam.dist * 0.34 * 0.02));
    const f = Math.min(1, Math.max(0, (it - 5.0) / 4.5)); const e = f * f * (3 - 2 * f);
    target.lerpVectors(close, target, e); lookT.lerpVectors(rp, lookT, e); record.rotation.y += dt * 0.9 * (1 - e); }
  const k = first ? 1 : 1 - Math.exp(-dt * (3.5 + S.travel * 3));
  camPos.lerp(target, k); camLook.lerp(lookT, k); first = false;
  camera.position.copy(camPos); camera.lookAt(camLook);
  S.camDist = camera.position.distanceTo(craft.position);
  camera.near = Math.max(1e-5, S.camDist * 0.002); camera.updateProjectionMatrix();
  rim.position.copy(camera.position).add(tmp.up.clone().multiplyScalar(S.camDist)); rim.target = craft; fill.position.copy(camera.position); fill.target = craft;

  // scale rules (honest positions; hero sizes with a visibility floor, never swallowing the craft)
  craft.scale.setScalar((S.intro ? cam.dist : S.camDist) * 0.34);
  v2Marker.scale.setScalar(S.camDist * 0.004);
  for (const b of bodies) {
    const dCam = camera.position.distanceTo(b.group.position), sep = craft.position.distanceTo(b.group.position);
    let r;
    if (b.isSun) r = Math.max(b.realR, Math.min(dCam * 0.02, b.realR * b.kMax), dCam * 0.0035);
    else if (b.isStar) r = Math.max(b.realR, dCam * 0.0045);
    else { r = Math.max(b.realR, dCam * 0.12, sep * 0.42); r = Math.min(r, b.realR * b.kMax); }
    r = Math.min(r, sep * 0.5); b.group.scale.setScalar(r);
  }
  { const e = PL.earth.group.position; const d = sunPos.clone().sub(e).normalize(); earthUniforms.uSunDirView.value.copy(d.transformDirection(camera.matrixWorldInverse)); }
  sky.position.copy(camera.position);
  for (const d of dustLayers) { d.position.copy(craft.position); d.scale.setScalar(S.camDist * 1.6); d.rotation.y += dt * 0.01; d.material.uniforms.uRef.value = S.camDist; d.material.uniforms.uStretch.value = S.travel; }

  // heliosphere shell around the boundary chapters; plasma breathes with the audio; stars drift with time
  { const au = A.len3(st.pos); const w = Math.max(0, 1 - Math.abs(au - 108) / 60); const cc = currentChapter(); helioMat.uniforms.uOp.value = (cc.id === 'ts' || cc.id === 'hp' ? 0.16 : 0.07) * w * (1 - S.travel * 0.5); helioMat.uniforms.uTime.value = now * 0.001; helioShell.visible = helioInner.visible = helioMat.uniforms.uOp.value > 0.01;
    let lvl = 0; if (analyser && S.sound) { analyser.getByteFrequencyData(specData); let sum = 0; for (let i = 2; i < 40; i++) sum += specData[i]; lvl = sum / 38 / 255; }
    plasma.position.copy(craft.position); plasma.scale.setScalar(S.camDist * 0.5); plasma.material.uniforms.uRef.value = S.camDist; plasma.material.uniforms.uTime.value = now * 0.001; plasma.material.uniforms.uLevel.value += (lvl - plasma.material.uniforms.uLevel.value) * 0.2; plasma.material.uniforms.uOp.value = (au > 85 && jd < SILENT_JD + 3000 * Y) ? 0.9 : 0.0;
    if (starField) { const yrs = (jd - A.J2000) / Y; starField.material.uniforms.uYears.value = yrs; const far = Math.min(1, Math.abs(yrs) / 3000); starField.material.uniforms.uGain.value = 0.3 + far * 1.8; sky.material.color.setScalar(0.62 - far * 0.3); }
    if (S.you) { youMarker.position.copy(S.you.pos); youMarker.scale.setScalar(S.camDist * 0.006); } sfxUpdate(dt); }
  // thread lighting (today splits violet = fitted from grey = projected)
  const headDays = S.camDist * 0.45 / 0.0098, boost = 1 + S.travel * 0.8;
  setThreadTime(thread1, jd, nowJD, headDays, boost); setThreadTime(thread2, jd, nowJD, headDays, boost); setThreadTime(threadFar, jd, nowJD, headDays, boost);

  // Earth link + signal pulse
  const ch = currentChapter(), linkOn = !!S.signal || !!ch.countdown;
  link.visible = linkOn; if (linkOn) { const e = PL.earth.group.position, c = craft.position; linkGeo.setPositions([e.x, e.y, e.z, c.x, c.y, c.z]); link.computeLineDistances(); linkMat.dashSize = S.camDist * 0.5; linkMat.gapSize = S.camDist * 0.3; }
  if (S.signal) { const lt = S.live.lightTimeS; S.signal.u = Math.min(1, (performance.now() - S.signal.t0) / 1000 * 3600 / lt);
    pulse.visible = true; pulse.position.lerpVectors(PL.earth.group.position, craft.position, S.signal.u); pulse.scale.setScalar(Math.max(S.camDist * 0.012, 0.002));
    if (S.signal.u >= 1 && !S.signal.done) { S.signal.done = true; sfxPing(false); toast('Signal arrived at Voyager 1'); setTimeout(() => { S.signal = null; pulse.visible = false; }, 4000); } }
  else pulse.visible = false;

  // post FX driven by travel
  streak.uniforms.uAmt.value = S.travel * (isMobile ? 0.5 : 0.7); streak.enabled = S.travel > 0.01;
  { const p = tmp.look.copy(craft.position).project(camera); streak.uniforms.uCenter.value.set((p.x + 1) / 2, (p.y + 1) / 2); }
  grade.uniforms.uTime.value = now * 0.001; grade.uniforms.uAber.value = 0.006 * S.travel;
  const lbh = (isMobile ? 4 : 7) * S.travel; el.lbTop.style.setProperty('--lbh', lbh + 'vh'); el.lbBot.style.setProperty('--lbh', lbh + 'vh');

  updatePlates(ch, dt);
  // HUD
  showChapter(ch, S.chapterI);
  if (ch.live || ch.countdown) renderLiveStats(ch, false);
  el.chapter.style.opacity = S.travel > 0.35 ? String(1 - (S.travel - 0.35) / 0.65 * 0.9) : '';
  const silent = jd >= SILENT_JD; craftLabel.textContent = silent ? 'Voyager 1 · silent' : 'Voyager 1';
  starLabel.classList.toggle('hide', !(ch.star || (ch.tm && S.tm >= 1000)));
  el.utc.textContent = new Date().toISOString().slice(11, 19) + ' UTC';
  el.mday.textContent = jd > nowJD + 400 * Y ? `Mission day ${A.fmtInt(nowJD - LAUNCH_JD)} · year ${A.fmtInt(A.yearOf(jd))}` : `Mission day ${A.fmtInt(nowJD - LAUNCH_JD)} · ${A.fmtDate(jd)}`;
  if (S.mapOpen && (now - (S.mapT || 0)) > 1000) { S.mapT = now; drawMap(); }
  renderTelemetry(ch, jd);

  // labels
  for (const l of labels) { const p = tmp.look.copy(l.getPos()).project(camera); const vis = p.z < 1 && Math.abs(p.x) < 1.05 && Math.abs(p.y) < 1.05 && !l.el.classList.contains('hide') && S.travel < 0.6;
    l.el.style.display = vis ? '' : 'none'; if (vis) l.el.style.transform = `translate(${((p.x + 1) / 2 * innerWidth).toFixed(1)}px, ${((1 - p.y) / 2 * innerHeight).toFixed(1)}px)`; }

  composer.render();
}

// ---------------- boot ----------------
buildNav();
window.__VOY = { S, CH, gotoChapter, setTM, setLog, frame, endIntro, startIntro, dsnStatus, yourYear, postcard, renderer, threadMat, PL, craft: () => craft, force: (p) => { S.forceP = p; }, qa: () => { document.querySelector('#spacer').style.height = '0px'; }, setProgress: (p) => { const max = document.documentElement.scrollHeight - innerHeight; scrollTo(0, max * p); }, sendSignal, enter, A, get V1() { return V1; }, get ENC() { return ENC; }, BUILD };
load().then(() => { S.live = A.telemetry(V1, A.jdNow()); showChapter(CH[0], 0); requestAnimationFrame(frame); }).catch((e) => { console.error(e); loaderText.textContent = 'Could not load: ' + e.message; });
