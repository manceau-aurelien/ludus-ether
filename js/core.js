'use strict';
// =====================================================================
//  ÉCLATS D'ÉTHER — noyau : constantes, utilitaires, entrées, audio
// =====================================================================
const W = 960, H = 540;          // résolution logique
const GY = 300;                  // y écran de la profondeur z = 0
const DEPTH = 200;               // profondeur jouable (z 0..200)
const GRAV = 0.7;
const D2R = Math.PI / 180, TAU = Math.PI * 2;
const FONT = '"Trebuchet MS", "Segoe UI", Verdana, sans-serif';

const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const rand = (a, b) => a + Math.random() * (b - a);
const randi = (a, b) => Math.floor(a + Math.random() * (b - a + 1));
const choose = a => a[Math.floor(Math.random() * a.length)];
const sign = v => v < 0 ? -1 : v > 0 ? 1 : 0;
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

function seeded(seed) {
  let s = (Math.imul(seed | 0, 2654435761) >>> 0) || 1;
  return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
}

const _shadeCache = new Map();
function shade(hex, amt) {
  const key = hex + amt;
  let v = _shadeCache.get(key);
  if (v) return v;
  let c = hex.replace('#', '');
  if (c.length === 3) c = c.split('').map(x => x + x).join('');
  let r = parseInt(c.slice(0, 2), 16), g = parseInt(c.slice(2, 4), 16), b = parseInt(c.slice(4, 6), 16);
  if (amt < 0) { r *= 1 + amt; g *= 1 + amt; b *= 1 + amt; }
  else { r += (255 - r) * amt; g += (255 - g) * amt; b += (255 - b) * amt; }
  v = 'rgb(' + (r | 0) + ',' + (g | 0) + ',' + (b | 0) + ')';
  _shadeCache.set(key, v);
  return v;
}

const Store = {
  get(k, d) { try { const v = localStorage.getItem('eclats_' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('eclats_' + k, JSON.stringify(v)); } catch (e) { /* stockage indisponible */ } },
};

// ---------------------------------------------------------------------
//  Clavier
// ---------------------------------------------------------------------
const Keys = {
  down: new Set(), pressed: new Set(),
  init() {
    addEventListener('keydown', e => {
      if (e.target && e.target.tagName === 'INPUT') return;
      if (!e.repeat && !this.down.has(e.code)) this.pressed.add(e.code);
      this.down.add(e.code);
      Sound.unlock();
      if (!e.ctrlKey && !e.metaKey && !/^F\d+$/.test(e.code)) e.preventDefault();
    });
    addEventListener('keyup', e => this.down.delete(e.code));
    addEventListener('blur', () => this.down.clear());
    addEventListener('mousedown', () => Sound.unlock());
  },
  hit(...codes) { return codes.some(c => this.pressed.has(c)); },
};

// Positions physiques (e.code) : sur AZERTY, KeyW/KeyA = Z/Q, donc ZQSD.
const BINDS = [
  { up: ['KeyW'], down: ['KeyS'], left: ['KeyA'], right: ['KeyD'], attack: ['KeyJ'], jump: ['KeyK'], defend: ['KeyL'] },
  { up: ['ArrowUp'], down: ['ArrowDown'], left: ['ArrowLeft'], right: ['ArrowRight'], attack: ['Numpad1', 'Comma'], jump: ['Numpad2', 'Period'], defend: ['Numpad3', 'Slash'] },
];
const BTN = ['up', 'down', 'left', 'right', 'attack', 'jump', 'defend'];
const SYM = { up: '^', down: 'v', left: 'L', right: 'R', attack: 'A', jump: 'J', defend: 'D' };
const BTN_NAMES = { up: 'Haut', down: 'Bas', left: 'Gauche', right: 'Droite', attack: 'Attaque (A)', jump: 'Saut (J)', defend: 'Défense (D)' };

// Touches personnalisables : les valeurs par défaut sont gardées pour la réinitialisation,
// les choix du joueur sont sauvegardés dans le navigateur.
const DEFAULT_BINDS = JSON.parse(JSON.stringify(BINDS));
const RESERVED_KEYS = ['Escape', 'KeyP', 'KeyM', 'Tab'];
(function loadBinds() {
  const s = Store.get('binds', null);
  if (!Array.isArray(s) || s.length !== 2) return;
  for (let i = 0; i < 2; i++) for (const k of BTN) {
    const v = s[i] && s[i][k];
    if (Array.isArray(v) && v.length && v.every(c => typeof c === 'string' && !RESERVED_KEYS.includes(c))) BINDS[i][k] = v.slice();
  }
})();
function saveBinds() { Store.set('binds', BINDS); }
function resetBinds() { for (let i = 0; i < 2; i++) for (const k of BTN) BINDS[i][k] = DEFAULT_BINDS[i][k].slice(); saveBinds(); }
// Attribue une touche ; si elle servait déjà ailleurs, les deux actions échangent leurs touches.
function assignKey(pi, k, code) {
  const old = BINDS[pi][k].filter(c => c !== code);
  let swapped = null;
  for (let i = 0; i < 2; i++) for (const a of BTN) {
    if ((i === pi && a === k) || !BINDS[i][a].includes(code)) continue;
    BINDS[i][a] = BINDS[i][a].filter(c => c !== code);
    if (!BINDS[i][a].length) BINDS[i][a] = old.length ? [old[0]] : [];
    swapped = { i, a };
  }
  BINDS[pi][k] = [code];
  saveBinds();
  return swapped;
}

let layoutMap = null;
try { if (navigator.keyboard && navigator.keyboard.getLayoutMap) navigator.keyboard.getLayoutMap().then(m => { layoutMap = m; }).catch(() => {}); } catch (e) { /* ignore */ }
function keyLabel(code) {
  const fixed = { ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→', Space: 'Espace', Enter: 'Entrée', Escape: 'Échap' };
  if (fixed[code]) return fixed[code];
  if (code.startsWith('Numpad')) return 'Pavé ' + code.slice(6);
  if (layoutMap && layoutMap.get(code)) return layoutMap.get(code).toUpperCase();
  const m = { Comma: ',', Period: '.', Slash: '/', Semicolon: ';' };
  if (m[code]) return m[code];
  if (code.startsWith('Key')) return code.slice(3);
  if (code.startsWith('Digit')) return code.slice(5);
  return code;
}
function bindLabel(i, k) { return BINDS[i][k].map(keyLabel).join(' / '); }

// Contrôleur générique (rempli par le clavier ou par l'IA)
class Controller {
  constructor() {
    this.held = {}; this.pressed = {};
    for (const k of BTN) { this.held[k] = false; this.pressed[k] = false; }
    this.special = null; this.run = 0;
  }
  poll() { }
}

class KeyController extends Controller {
  constructor(idx) {
    super(); this.idx = idx; this.b = BINDS[idx];
    this.buf = []; this.t = 0; this.tap = { left: -99, right: -99 };
  }
  poll() {
    this.t++; this.special = null; this.run = 0;
    for (const k of BTN) {
      const codes = this.b[k];
      this.held[k] = codes.some(c => Keys.down.has(c));
      this.pressed[k] = codes.some(c => Keys.pressed.has(c));
    }
    // ordre des évènements : défense d'abord, puis directions, puis boutons
    for (const k of ['defend', 'up', 'down', 'left', 'right', 'attack', 'jump']) if (this.pressed[k]) this.event(k);
  }
  event(k) {
    const t = this.t;
    if (k === 'left' || k === 'right') {
      if (t - this.tap[k] <= 14) this.run = k === 'left' ? -1 : 1;
      this.tap[k] = t; this.tap[k === 'left' ? 'right' : 'left'] = -99;
    }
    this.buf.push({ s: SYM[k], t });
    while (this.buf.length && t - this.buf[0].t > 30) this.buf.shift();
    if (k === 'attack' || k === 'jump') {
      const b = this.buf, n = b.length;
      if (n >= 3) {
        const dir = b[n - 2], d = b[n - 3];
        if (d.s === 'D' && '^vLR'.includes(dir.s) && t - d.t <= 26) { this.special = 'D' + dir.s + SYM[k]; this.buf.length = 0; }
      }
    }
  }
}

function menuInP(i) {
  const b = BINDS[i];
  const p = arr => arr.some(c => Keys.pressed.has(c));
  const r = { up: p(b.up), down: p(b.down), left: p(b.left), right: p(b.right), ok: p(b.attack), back: p(b.jump) };
  if (i === 0) {
    r.ok = r.ok || Keys.pressed.has('Enter') || Keys.pressed.has('Space');
    r.back = r.back || Keys.pressed.has('Escape') || Keys.pressed.has('Backspace');
  }
  return r;
}
function menuIn() {
  const a = menuInP(0), b = menuInP(1), r = {};
  for (const k in a) r[k] = a[k] || b[k];
  // les flèches restent toujours utilisables dans les menus, même après reconfiguration
  const p = c => Keys.pressed.has(c);
  r.up = r.up || p('ArrowUp'); r.down = r.down || p('ArrowDown');
  r.left = r.left || p('ArrowLeft'); r.right = r.right || p('ArrowRight');
  return r;
}

// ---------------------------------------------------------------------
//  Audio synthétisé (WebAudio) : effets + petite musique procédurale
// ---------------------------------------------------------------------
const mtof = m => 440 * Math.pow(2, (m - 69) / 12);

const Sound = {
  ctx: null, out: null, sfxG: null, musG: null, nb: null,
  musicOn: Store.get('music', true), sfxOn: Store.get('sfx', true),
  track: null, timer: null, pending: null, last: {},
  unlock() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const C = window.AudioContext || window.webkitAudioContext;
    if (!C) return;
    try {
      const ctx = this.ctx = new C();
      this.out = ctx.createDynamicsCompressor(); this.out.connect(ctx.destination);
      this.sfxG = ctx.createGain(); this.sfxG.gain.value = this.sfxOn ? 0.5 : 0; this.sfxG.connect(this.out);
      this.musG = ctx.createGain(); this.musG.gain.value = this.musicOn ? 0.2 : 0; this.musG.connect(this.out);
      const n = ctx.sampleRate; const b = ctx.createBuffer(1, n, ctx.sampleRate); const d = b.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
      this.nb = b;
      if (this.pending) { const p = this.pending; this.pending = null; this.music(p); }
    } catch (e) { this.ctx = null; }
  },
  setMusic(on) { this.musicOn = on; Store.set('music', on); if (this.musG) this.musG.gain.value = on ? 0.2 : 0; },
  setSfx(on) { this.sfxOn = on; Store.set('sfx', on); if (this.sfxG) this.sfxG.gain.value = on ? 0.5 : 0; },
  tone(f, dur, o = {}) {
    const c = this.ctx; if (!c) return;
    const t = o.at != null ? o.at : c.currentTime + (o.delay || 0);
    const os = c.createOscillator(), g = c.createGain();
    os.type = o.type || 'square';
    os.frequency.setValueAtTime(f, t);
    if (o.to) os.frequency.exponentialRampToValueAtTime(Math.max(20, o.to), t + dur);
    const v = o.vol != null ? o.vol : 0.2;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(v, t + (o.att || 0.005));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    os.connect(g); g.connect(o.dest || this.sfxG);
    os.start(t); os.stop(t + dur + 0.03);
  },
  noise(dur, o = {}) {
    const c = this.ctx; if (!c || !this.nb) return;
    const t = o.at != null ? o.at : c.currentTime + (o.delay || 0);
    const s = c.createBufferSource(); s.buffer = this.nb;
    const fl = c.createBiquadFilter(); fl.type = o.ft || 'lowpass';
    fl.frequency.setValueAtTime(o.f || 2000, t);
    if (o.to) fl.frequency.exponentialRampToValueAtTime(o.to, t + dur);
    fl.Q.value = o.q || 1;
    const g = c.createGain(); const v = o.vol != null ? o.vol : 0.3;
    g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(fl); fl.connect(g); g.connect(o.dest || this.sfxG);
    s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.03);
  },
  play(n) {
    if (!this.ctx || !this.sfxOn) return;
    const now = performance.now();
    if (this.last[n] && now - this.last[n] < 35) return;
    this.last[n] = now;
    const f = SFX[n]; if (f) f(this);
  },
  // ---- musique ----
  music(name) {
    if (!this.ctx) { this.pending = name; return; }
    if (this.track && this.track.name === name) return;
    this.stopMusic();
    if (!name || !TRACKS[name]) return;
    this.track = Object.assign({ name, step: 0, next: this.ctx.currentTime + 0.12 }, buildTrack(TRACKS[name]));
    this.timer = setInterval(() => this.sched(), 40);
  },
  stopMusic() { if (this.timer) clearInterval(this.timer); this.timer = null; this.track = null; },
  sched() {
    const c = this.ctx, tr = this.track; if (!c || !tr) return;
    const sd = 60 / tr.bpm / 2;
    if (tr.next < c.currentTime - 0.5) tr.next = c.currentTime + 0.05;
    while (tr.next < c.currentTime + 0.2) {
      if (this.musicOn) this.stepPlay(tr, tr.step, tr.next, sd);
      tr.next += sd; tr.step = (tr.step + 1) % tr.len;
    }
  },
  stepPlay(tr, i, t, sd) {
    const g = this.musG;
    const b = tr.bass[i]; if (b != null) this.tone(mtof(b), sd * 0.95, { type: 'triangle', vol: 0.55, at: t, dest: g });
    const l = tr.lead[i]; if (l != null) this.tone(mtof(l), sd * (tr.legato ? 1.6 : 0.8), { type: tr.wave, vol: 0.09, at: t, dest: g, att: 0.01 });
    const p = tr.pad[i]; if (p) for (const n of p) this.tone(mtof(n), sd * 7.5, { type: 'sine', vol: 0.05, at: t, dest: g, att: 0.2 });
    const d = tr.drum[i];
    if (d.includes('k')) this.tone(130, 0.14, { type: 'sine', to: 42, vol: 0.7, at: t, dest: g });
    if (d.includes('s')) this.noise(0.11, { f: 2500, ft: 'bandpass', q: 0.8, vol: 0.28, at: t, dest: g });
    if (d.includes('h')) this.noise(0.03, { f: 7000, ft: 'highpass', vol: 0.07, at: t, dest: g });
  },
};

const TRACKS = {
  title:   { bpm: 96,  prog: [[57, 'm'], [53, 'M'], [48, 'M'], [55, 'M']], seed: 3,  wave: 'triangle', legato: true, calm: true },
  forest:  { bpm: 128, prog: [[50, 'm'], [55, 'M'], [57, 'm'], [53, 'M']], seed: 11, wave: 'square' },
  canyon:  { bpm: 136, prog: [[52, 'm'], [52, 'm'], [48, 'M'], [50, 'M']], seed: 22, wave: 'sawtooth' },
  snow:    { bpm: 118, prog: [[45, 'm'], [41, 'M'], [48, 'M'], [43, 'M']], seed: 33, wave: 'triangle', legato: true },
  volcano: { bpm: 148, prog: [[40, 'm'], [40, 'm'], [43, 'M'], [38, 'M']], seed: 44, wave: 'sawtooth' },
  citadel: { bpm: 130, prog: [[38, 'm'], [46, 'M'], [41, 'M'], [45, 'M']], seed: 55, wave: 'square' },
  boss:    { bpm: 158, prog: [[38, 'm'], [38, 'm'], [46, 'M'], [45, 'M']], seed: 66, wave: 'sawtooth' },
  vs:      { bpm: 142, prog: [[45, 'm'], [48, 'M'], [43, 'M'], [50, 'm']], seed: 77, wave: 'square' },
  ending:  { bpm: 88,  prog: [[48, 'M'], [55, 'M'], [57, 'm'], [53, 'M']], seed: 88, wave: 'triangle', legato: true, calm: true },
};

function buildTrack(T) {
  const r = seeded(T.seed);
  const bars = T.prog.length, steps = 8, len = bars * steps * 2;
  const bass = [], lead = [], drum = [], pad = [];
  const motifs = [0, 1].map(() => { const m = []; for (let s = 0; s < steps; s++) m.push(r() < (T.calm ? 0.45 : 0.7) ? Math.floor(r() * 6) : -1); return m; });
  const bpat = []; for (let s = 0; s < steps; s++) bpat.push(s % 2 === 0 || r() < 0.35);
  for (let pass = 0; pass < 2; pass++) for (let b = 0; b < bars; b++) {
    const [root, q] = T.prog[b];
    const tones = q === 'm' ? [0, 3, 7, 10, 12, 15] : [0, 4, 7, 11, 12, 16];
    for (let s = 0; s < steps; s++) {
      const i = (pass * bars + b) * steps + s;
      bass[i] = bpat[s] ? root - 12 + (s === 6 && pass === 1 ? 7 : 0) : null;
      const m = motifs[pass][s];
      lead[i] = m < 0 ? null : root + 12 + tones[m];
      pad[i] = s === 0 ? [root, root + tones[1], root + 7] : null;
      if (T.calm) drum[i] = s === 0 ? 'k' : s === 4 ? 's' : (s % 2 ? '' : 'h');
      else drum[i] = (s % 4 === 0 ? 'k' : s % 4 === 2 ? 's' : '') + 'h' + (s === 7 && b === bars - 1 ? 'k' : '');
    }
  }
  return { bpm: T.bpm, len, bass, lead, drum, pad, wave: T.wave || 'square', legato: !!T.legato };
}

const SFX = {
  hit: s => { s.noise(0.08, { f: 2400, vol: 0.4 }); s.tone(150, 0.09, { type: 'sine', to: 60, vol: 0.4 }); },
  hitHeavy: s => { s.noise(0.2, { f: 1500, to: 300, vol: 0.55 }); s.tone(110, 0.22, { type: 'sine', to: 38, vol: 0.6 }); },
  block: s => { s.tone(1100, 0.05, { type: 'square', vol: 0.12 }); s.noise(0.05, { f: 5000, ft: 'highpass', vol: 0.2 }); },
  guardBreak: s => { s.tone(600, 0.25, { type: 'square', to: 150, vol: 0.18 }); s.noise(0.2, { f: 3000, vol: 0.3 }); },
  swish: s => s.noise(0.07, { f: 1500, to: 4000, ft: 'bandpass', vol: 0.12 }),
  whoosh: s => s.noise(0.16, { f: 700, to: 2600, ft: 'bandpass', q: 1.5, vol: 0.22 }),
  slash: s => { s.noise(0.18, { f: 3000, to: 900, ft: 'bandpass', vol: 0.3 }); s.tone(500, 0.15, { type: 'sawtooth', to: 200, vol: 0.06 }); },
  jump: s => s.tone(260, 0.09, { type: 'square', to: 480, vol: 0.06 }),
  land: s => s.noise(0.07, { f: 500, vol: 0.25 }),
  wind: s => { s.noise(0.4, { f: 600, to: 2400, ft: 'bandpass', q: 2, vol: 0.35 }); s.noise(0.3, { f: 2000, to: 800, ft: 'bandpass', q: 3, vol: 0.2, delay: 0.08 }); },
  fire: s => { s.noise(0.45, { f: 900, to: 300, ft: 'bandpass', q: 0.7, vol: 0.45 }); s.tone(160, 0.3, { type: 'sawtooth', to: 70, vol: 0.1 }); },
  ice: s => { [1400, 1900, 2500].forEach((f, i) => s.tone(f, 0.18, { type: 'sine', vol: 0.12, delay: i * 0.04 })); s.noise(0.15, { f: 6000, ft: 'highpass', vol: 0.12 }); },
  iceS: s => { s.tone(1800, 0.12, { type: 'triangle', to: 900, vol: 0.12 }); s.noise(0.1, { f: 5000, ft: 'highpass', vol: 0.15 }); },
  freeze: s => { s.tone(2200, 0.3, { type: 'sine', to: 3200, vol: 0.12 }); s.noise(0.25, { f: 7000, ft: 'highpass', vol: 0.12 }); },
  shatter: s => { s.noise(0.3, { f: 6000, to: 2000, ft: 'highpass', vol: 0.4 }); [2600, 3100, 2200].forEach((f, i) => s.tone(f, 0.1, { type: 'triangle', vol: 0.1, delay: i * 0.03 })); },
  zap: s => { s.tone(900, 0.12, { type: 'sawtooth', to: 2400, vol: 0.12 }); s.noise(0.12, { f: 4000, ft: 'highpass', vol: 0.25 }); },
  thunder: s => { s.noise(0.7, { f: 3000, to: 120, vol: 0.7 }); s.tone(70, 0.6, { type: 'sine', to: 30, vol: 0.5 }); },
  earth: s => { s.tone(80, 0.45, { type: 'sine', to: 30, vol: 0.7 }); s.noise(0.4, { f: 400, to: 100, vol: 0.5 }); },
  dark: s => { s.tone(220, 0.35, { type: 'sawtooth', to: 90, vol: 0.12 }); s.tone(227, 0.35, { type: 'sawtooth', to: 93, vol: 0.12 }); },
  nature: s => { s.noise(0.25, { f: 1200, ft: 'bandpass', q: 3, vol: 0.25 }); s.tone(500, 0.2, { type: 'triangle', to: 900, vol: 0.08 }); },
  heal: s => [660, 830, 990, 1320].forEach((f, i) => s.tone(f, 0.25, { type: 'sine', vol: 0.14, delay: i * 0.07 })),
  laser: s => { s.tone(1600, 0.45, { type: 'square', to: 1200, vol: 0.07 }); s.tone(800, 0.45, { type: 'sawtooth', to: 760, vol: 0.06 }); },
  rocket: s => s.noise(0.35, { f: 800, to: 2500, ft: 'bandpass', vol: 0.3 }),
  explosion: s => { s.noise(0.6, { f: 1400, to: 90, vol: 0.75 }); s.tone(90, 0.5, { type: 'sine', to: 28, vol: 0.6 }); },
  click: s => s.tone(1500, 0.04, { type: 'square', vol: 0.1 }),
  bow: s => { s.tone(300, 0.08, { type: 'triangle', to: 120, vol: 0.2 }); s.noise(0.1, { f: 3000, ft: 'bandpass', vol: 0.15 }); },
  throw: s => s.noise(0.2, { f: 500, to: 1800, ft: 'bandpass', vol: 0.25 }),
  pickup: s => s.tone(700, 0.08, { type: 'square', to: 1100, vol: 0.08 }),
  drink: s => [500, 600, 700].forEach((f, i) => s.tone(f, 0.08, { type: 'sine', vol: 0.12, delay: i * 0.09 })),
  ko: s => { s.tone(420, 0.6, { type: 'square', to: 80, vol: 0.12 }); s.noise(0.3, { f: 1000, vol: 0.3 }); },
  clash: s => { s.noise(0.25, { f: 3000, to: 500, vol: 0.45 }); s.tone(300, 0.2, { type: 'square', to: 100, vol: 0.1 }); },
  select: s => s.tone(880, 0.05, { type: 'square', vol: 0.07 }),
  confirm: s => { s.tone(660, 0.07, { type: 'square', vol: 0.08 }); s.tone(990, 0.12, { type: 'square', vol: 0.08, delay: 0.07 }); },
  back: s => s.tone(440, 0.08, { type: 'square', to: 300, vol: 0.07 }),
  go: s => { s.tone(880, 0.1, { type: 'square', vol: 0.08 }); s.tone(880, 0.1, { type: 'square', vol: 0.08, delay: 0.15 }); },
  victory: s => [523, 659, 784, 1046, 784, 1046].forEach((f, i) => s.tone(f, i === 5 ? 0.5 : 0.14, { type: 'square', vol: 0.09, delay: i * 0.13 })),
  gameover: s => [392, 349, 311, 262].forEach((f, i) => s.tone(f, 0.35, { type: 'triangle', vol: 0.2, delay: i * 0.3 })),
  nomp: s => s.tone(200, 0.08, { type: 'square', vol: 0.05 }),
  xp: s => { [988, 1319, 1760].forEach((f, i) => s.tone(f, 0.12, { type: 'square', vol: 0.07, delay: i * 0.06 })); s.tone(2637, 0.25, { type: 'sine', vol: 0.06, delay: 0.18 }); },
  banner: s => { s.tone(523, 0.1, { type: 'square', vol: 0.07 }); s.tone(784, 0.18, { type: 'square', vol: 0.07, delay: 0.1 }); },
};
