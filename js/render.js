'use strict';
// =====================================================================
//  RENDU : poses, squelette, personnages, projectiles, particules, décors
// =====================================================================
const OUT = '#16121c';

// Angles en degrés : 0 = vers le bas, positif = vers l'avant du personnage.
const P = o => Object.assign({ lean: 0, tilt: 0, aF: 0, eF: 0, aB: 0, eB: 0, lF: 0, kF: 0, lB: 0, kB: 0, rot: 0 }, o);
const POSES = {
  stand:      P({ lean: 2, aF: 12, eF: 25, aB: -12, eB: 25, lF: 6, kF: 4, lB: -6, kB: 4 }),
  guard:      P({ lean: 6, aF: 35, eF: 95, aB: 15, eB: 105, lF: 18, kF: 14, lB: -14, kB: 12 }),
  walkA:      P({ lean: 6, aF: -28, eF: 25, aB: 32, eB: 35, lF: 26, kF: 6, lB: -24, kB: 28 }),
  walkB:      P({ lean: 6, aF: 32, eF: 35, aB: -28, eB: 25, lF: -24, kF: 28, lB: 26, kB: 6 }),
  runA:       P({ lean: 22, aF: -55, eF: 80, aB: 65, eB: 80, lF: 55, kF: 35, lB: -45, kB: 80 }),
  runB:       P({ lean: 22, aF: 65, eF: 80, aB: -55, eB: 80, lF: -45, kF: 80, lB: 55, kB: 35 }),
  crouch:     P({ lean: 18, aF: 30, eF: 50, aB: 10, eB: 50, lF: 55, kF: 105, lB: -15, kB: 95 }),
  jump:       P({ lean: 4, aF: 140, eF: 25, aB: 120, eB: 30, lF: 25, kF: 60, lB: -15, kB: 75 }),
  air:        P({ lean: 10, aF: 70, eF: 60, aB: 40, eB: 70, lF: 65, kF: 105, lB: 15, kB: 100 }),
  punchPrep:  P({ lean: 0, aF: -15, eF: 125, aB: 45, eB: 95, lF: 20, kF: 10, lB: -20, kB: 12 }),
  punch:      P({ lean: 14, aF: 90, eF: 0, aB: -15, eB: 70, lF: 26, kF: 6, lB: -26, kB: 16 }),
  punch2Prep: P({ lean: 0, aF: 45, eF: 95, aB: -15, eB: 125, lF: 20, kF: 10, lB: -20, kB: 12 }),
  punch2:     P({ lean: 16, aF: -15, eF: 70, aB: 92, eB: 0, lF: 26, kF: 6, lB: -26, kB: 16 }),
  kickPrep:   P({ lean: -8, aF: 40, eF: 85, aB: 25, eB: 85, lF: 75, kF: 115, lB: -5, kB: 8 }),
  kick:       P({ lean: -22, aF: 55, eF: 60, aB: 15, eB: 70, lF: 98, kF: 0, lB: -8, kB: 4 }),
  airKick:    P({ lean: -12, aF: 75, eF: 55, aB: 25, eB: 60, lF: 82, kF: 0, lB: 25, kB: 95 }),
  upper:      P({ lean: -6, aF: 168, eF: 8, aB: 20, eB: 70, lF: 12, kF: 25, lB: -22, kB: 30 }),
  hurt:       P({ lean: -22, tilt: -15, aF: -35, eF: 30, aB: -45, eB: 35, lF: 12, kF: 18, lB: -16, kB: 18 }),
  hurt2:      P({ lean: 30, tilt: 15, aF: 25, eF: 20, aB: 10, eB: 25, lF: 10, kF: 25, lB: -10, kB: 25 }),
  fall:       P({ rot: -55, lean: -10, aF: 150, eF: 25, aB: 125, eB: 35, lF: 35, kF: 45, lB: 10, kB: 35 }),
  lie:        P({ rot: -90, aF: 165, eF: 10, aB: 150, eB: 10, lF: 8, kF: 6, lB: -6, kB: 6 }),
  defend:     P({ lean: -4, aF: 115, eF: 115, aB: 95, eB: 120, lF: 16, kF: 22, lB: -20, kB: 22 }),
  cast:       P({ lean: 10, aF: 90, eF: 0, aB: 82, eB: 6, lF: 26, kF: 10, lB: -26, kB: 16 }),
  castPrep:   P({ lean: -8, aF: -40, eF: 100, aB: -30, eB: 110, lF: 18, kF: 15, lB: -18, kB: 15 }),
  castUp:     P({ lean: -6, aF: 172, eF: 0, aB: 160, eB: 5, lF: 10, kF: 5, lB: -10, kB: 5 }),
  slam:       P({ lean: 32, aF: 50, eF: 0, aB: 40, eB: 0, lF: 45, kF: 85, lB: -35, kB: 60 }),
  throwPrep:  P({ lean: -16, aF: 200, eF: 40, aB: 40, eB: 60, lF: 20, kF: 10, lB: -25, kB: 20 }),
  throw:      P({ lean: 22, aF: 95, eF: 0, aB: -30, eB: 40, lF: 30, kF: 10, lB: -30, kB: 20 }),
  swingPrep:  P({ lean: -10, aF: 195, eF: 10, aB: 175, eB: 20, lF: 18, kF: 10, lB: -20, kB: 15 }),
  swing:      P({ lean: 20, aF: 70, eF: 0, aB: 65, eB: 5, lF: 30, kF: 15, lB: -30, kB: 20 }),
  dash:       P({ lean: 35, aF: 85, eF: 0, aB: -60, eB: 30, lF: 35, kF: 25, lB: -55, kB: 45 }),
  grab:       P({ lean: 10, aF: 80, eF: 25, aB: 70, eB: 30, lF: 18, kF: 10, lB: -18, kB: 12 }),
  carry:      P({ lean: 0, aF: 165, eF: 25, aB: 160, eB: 25, lF: 8, kF: 5, lB: -8, kB: 5 }),
  win:        P({ lean: -4, aF: 170, eF: 0, aB: 25, eB: 40, lF: 10, kF: 4, lB: -12, kB: 6 }),
  drink:      P({ lean: -8, tilt: -18, aF: 40, eF: 140, aB: -10, eB: 30, lF: 6, kF: 4, lB: -6, kB: 4 }),
  roll:       P({ lean: 50, aF: 80, eF: 110, aB: 70, eB: 110, lF: 90, kF: 140, lB: 80, kB: 140 }),
  slide:      P({ rot: -25, lean: -10, aF: 60, eF: 40, aB: 120, eB: 30, lF: 75, kF: 0, lB: 20, kB: 60 }),
};
const PK = ['lean', 'tilt', 'aF', 'eF', 'aB', 'eB', 'lF', 'kF', 'lB', 'kB', 'rot'];
function lerpPose(a, b, t) { const o = {}; for (const k of PK) o[k] = a[k] + (b[k] - a[k]) * t; return o; }
function poseOf(p, f, t) { return typeof p === 'string' ? POSES[p] : typeof p === 'function' ? p(f, t) : p; }
function animPose(anim, t, f) {
  let i = 0;
  while (i < anim.length - 1 && anim[i + 1][0] <= t) i++;
  const A = poseOf(anim[i][1], f, t);
  if (i >= anim.length - 1) return Object.assign({}, A);
  const f0 = anim[i][0], f1 = anim[i + 1][0];
  let k = clamp((t - f0) / Math.max(1, f1 - f0), 0, 1);
  k = k * k * (3 - 2 * k);
  return lerpPose(A, poseOf(anim[i + 1][1], f, t), k);
}

const SKL = { ua: 11, fa: 11, th: 14, sh: 14, torso: 23, neck: 3, head: 10 };
function skel(p) {
  const sn = a => Math.sin(a * D2R), cs = a => Math.cos(a * D2R);
  const S = SKL;
  const pts = {};
  pts.hip = [0, 0];
  pts.kF = [S.th * sn(p.lF), S.th * cs(p.lF)];
  pts.fF = [pts.kF[0] + S.sh * sn(p.lF - p.kF), pts.kF[1] + S.sh * cs(p.lF - p.kF)];
  pts.kB = [S.th * sn(p.lB), S.th * cs(p.lB)];
  pts.fB = [pts.kB[0] + S.sh * sn(p.lB - p.kB), pts.kB[1] + S.sh * cs(p.lB - p.kB)];
  pts.sh = [S.torso * sn(p.lean), -S.torso * cs(p.lean)];
  const ha = p.lean + p.tilt;
  pts.hd = [pts.sh[0] + (S.neck + S.head) * sn(ha), pts.sh[1] - (S.neck + S.head) * cs(ha)];
  pts.eF = [pts.sh[0] + S.ua * sn(p.aF), pts.sh[1] + S.ua * cs(p.aF)];
  pts.hF = [pts.eF[0] + S.fa * sn(p.aF + p.eF), pts.eF[1] + S.fa * cs(p.aF + p.eF)];
  pts.eB = [pts.sh[0] + S.ua * sn(p.aB), pts.sh[1] + S.ua * cs(p.aB)];
  pts.hB = [pts.eB[0] + S.fa * sn(p.aB + p.eB), pts.eB[1] + S.fa * cs(p.aB + p.eB)];
  if (p.rot) {
    const c = cs(p.rot), s = sn(p.rot);
    for (const k in pts) { const [x, y] = pts[k]; pts[k] = [x * c - y * s, x * s + y * c]; }
  }
  let maxY = pts.hd[1] + S.head;
  for (const k of ['fF', 'fB', 'kF', 'kB', 'hF', 'hB', 'hip', 'sh']) if (pts[k][1] > maxY) maxY = pts[k][1];
  for (const k in pts) pts[k][1] -= maxY;
  pts.ang = ha + p.rot;
  return pts;
}

// ---------------------------------------------------------------------
//  Personnage
// ---------------------------------------------------------------------
function drawBody(ctx, L, p, o) {
  const s = skel(p);
  const T = o.tint || null;
  const C = k => T || L[k] || '#888';
  const Dk = k => T || shade(L[k] || '#888888', -0.3);
  const bw = L.build === 'big' ? 1.3 : L.build === 'slim' ? 0.85 : 1;
  const acc = L.acc || [];
  const tm = o.time || 0;
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const seg = (a, b, w, col, noOut) => {
    ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]);
    if (!noOut) { ctx.strokeStyle = OUT; ctx.lineWidth = w + 3; ctx.stroke(); }
    ctx.strokeStyle = col; ctx.lineWidth = w; ctx.stroke();
  };
  const dot = (pt, r, col) => { ctx.beginPath(); ctx.arc(pt[0], pt[1], r, 0, TAU); ctx.fillStyle = col; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = OUT; ctx.stroke(); };
  const arm = (e, h, back) => {
    const up = L.sleeveless ? (back ? Dk('skin') : C('skin')) : (back ? Dk('top') : C('top'));
    seg(s.sh, e, 6 * bw, up);
    seg(e, h, 5 * bw, L.gloves ? (back ? Dk('gloves') : C('gloves')) : (back ? Dk('skin') : C('skin')));
    dot(h, 3.3 * bw, L.gloves ? (back ? Dk('gloves') : C('gloves')) : (back ? Dk('skin') : C('skin')));
  };
  const foot = (k, f, col) => {
    const vx = f[0] - k[0], vy = f[1] - k[1], l = Math.hypot(vx, vy) || 1;
    seg(f, [f[0] + vy / l * 5 * bw, f[1] - vx / l * 5 * bw], 5.5 * bw, col);
  };
  const leg = (k, f, back) => {
    const c = back ? Dk('bottom') : C('bottom');
    seg(s.hip, k, 7.5 * bw, c); seg(k, f, 6.5 * bw, c);
    foot(k, f, back ? Dk('shoe') : C('shoe'));
  };
  const flutter = Math.sin(tm * 0.25) * 3 - Math.min(10, (o.speed || 0) * 1.2);

  // cape (derrière tout)
  if (acc.includes('cape')) {
    const a = s.sh, b = s.hip;
    ctx.beginPath();
    ctx.moveTo(a[0] + 2, a[1] + 1);
    ctx.quadraticCurveTo(b[0] - 4, b[1] - 4, b[0] - 14 + flutter, b[1] + 16);
    ctx.lineTo(b[0] - 26 + flutter * 1.5, b[1] + 10);
    ctx.quadraticCurveTo(a[0] - 18 + flutter, a[1] + 14, a[0] - 4, a[1]);
    ctx.closePath();
    ctx.fillStyle = T || L.cape || L.accent; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = OUT; ctx.stroke();
  }
  // pans de l'écharpe
  if (acc.includes('scarf')) {
    ctx.strokeStyle = OUT; ctx.lineWidth = 6;
    const a = [s.sh[0] - 2, s.sh[1] + 1];
    for (const k of [0, 1]) {
      ctx.beginPath(); ctx.moveTo(a[0], a[1]);
      ctx.quadraticCurveTo(a[0] - 10, a[1] + 2 + k * 3, a[0] - 20 + flutter, a[1] + 6 + k * 5 + Math.sin(tm * 0.3 + k) * 3);
      ctx.strokeStyle = OUT; ctx.lineWidth = 6; ctx.stroke();
      ctx.strokeStyle = T || L.accent; ctx.lineWidth = 3.5; ctx.stroke();
    }
  }
  arm(s.eB, s.hB, true);
  if (o.weapon === 'bow') drawWeapon(ctx, 'bow', s.eB, s.hB, T);
  leg(s.kB, s.fB, true);
  if (acc.includes('robe')) {
    leg(s.kF, s.fF, false);
    const ky = Math.max(s.kF[1], s.kB[1]) + 9;
    const kx0 = Math.min(s.kF[0], s.kB[0]) - 8, kx1 = Math.max(s.kF[0], s.kB[0]) + 8;
    ctx.beginPath(); ctx.moveTo(s.hip[0] - 8 * bw, s.hip[1] - 4); ctx.lineTo(s.hip[0] + 8 * bw, s.hip[1] - 4);
    ctx.lineTo(kx1, ky); ctx.lineTo(kx0, ky); ctx.closePath();
    ctx.fillStyle = T || L.robe || L.bottom; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = OUT; ctx.stroke();
    seg(s.hip, s.sh, 13 * bw, C('top'));
  } else {
    seg(s.hip, s.sh, 13 * bw, C('top'));
  }
  // ceinture
  if (!T) {
    const b1 = [lerp(s.hip[0], s.sh[0], 0.06), lerp(s.hip[1], s.sh[1], 0.06)], b2 = [lerp(s.hip[0], s.sh[0], 0.16), lerp(s.hip[1], s.sh[1], 0.16)];
    seg(b1, b2, 12.5 * bw, L.belt || shade(L.bottom, -0.35), true);
  }
  if (L.glow && !T) {
    ctx.strokeStyle = L.glow; ctx.lineWidth = 1.6;
    for (let i = 0; i < 3; i++) {
      const t0 = 0.25 + i * 0.22;
      const x0 = lerp(s.hip[0], s.sh[0], t0), y0 = lerp(s.hip[1], s.sh[1], t0);
      ctx.beginPath(); ctx.moveTo(x0 - 4, y0); ctx.lineTo(x0 + 1, y0 - 3); ctx.lineTo(x0 + 5, y0 + 1); ctx.stroke();
    }
  }
  if (!acc.includes('robe')) leg(s.kF, s.fF, false);
  if (acc.includes('scarf')) seg([s.sh[0] - 4, s.sh[1] + 1], [s.sh[0] + 4, s.sh[1] - 1], 6, T || L.accent);
  // tête
  ctx.save(); ctx.translate(s.hd[0], s.hd[1]); ctx.rotate(s.ang * D2R);
  drawHead(ctx, L, SKL.head * (L.headScale || 1), T, tm, o);
  ctx.restore();
  // bras avant + arme
  arm(s.eF, s.hF, false);
  if (acc.includes('shoulder')) dot([s.sh[0] + 1, s.sh[1] + 2], 5.5 * bw, T || L.accent);
  if (o.weapon && o.weapon !== 'bow') drawWeapon(ctx, o.weapon, s.eF, s.hF, T);
}

function drawHead(ctx, L, r, T, tm, o) {
  const acc = L.acc || [];
  const hc = T || L.hairC || '#333';
  const fillS = col => { ctx.fillStyle = col; ctx.fill(); ctx.lineWidth = 1.8; ctx.strokeStyle = OUT; ctx.stroke(); };
  const wave = Math.sin(tm * 0.2) * 2;
  const hoodC = T || L.hood || L.accent;
  // éléments arrière
  switch (L.hair) {
    case 'long':
      ctx.beginPath(); ctx.moveTo(-r * 0.2, -r); ctx.quadraticCurveTo(-r * 1.6, -r * 0.6, -r * 1.3 + wave * 0.4, r * 2.3);
      ctx.lineTo(-r * 0.3, r * 1.6); ctx.quadraticCurveTo(-r * 0.4, r * 0.4, 0, 0); ctx.closePath(); fillS(hc); break;
    case 'ponytail':
      ctx.beginPath(); ctx.moveTo(-r * 0.7, -r * 0.75); ctx.quadraticCurveTo(-r * 2.0, -r * 0.9 + wave, -r * 2.3 + wave, r * 1.1);
      ctx.quadraticCurveTo(-r * 1.5, r * 0.1, -r * 0.9, -r * 0.1); ctx.closePath(); fillS(hc);
      if (!T) { ctx.beginPath(); ctx.arc(-r * 0.95, -r * 0.55, 2.2, 0, TAU); ctx.fillStyle = L.accent; ctx.fill(); }
      break;
    case 'hood':
      ctx.beginPath(); ctx.arc(-r * 0.18, -r * 0.08, r * 1.36, 0, TAU); fillS(hoodC); break;
    case 'bun':
      ctx.beginPath(); ctx.arc(-r * 0.8, -r * 0.85, r * 0.5, 0, TAU); fillS(hc); break;
    case 'wild':
      for (const [x, y, rr] of [[-r * 0.9, -r * 0.2, r * 0.75], [-r * 0.6, r * 0.6, r * 0.6], [-r * 1.1, r * 0.5, r * 0.5]]) { ctx.beginPath(); ctx.arc(x, y, rr, 0, TAU); fillS(hc); }
      break;
  }
  // visage
  ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); fillS(T || L.skin);
  // cheveux avant / dessus
  switch (L.hair) {
    case 'short': case 'long': case 'ponytail': case 'bun':
      ctx.beginPath(); ctx.arc(0, 0, r + 1, Math.PI * 0.95, Math.PI * 1.88);
      ctx.quadraticCurveTo(r * 0.2, -r * 0.35, -r * 0.55, r * 0.2); ctx.closePath(); fillS(hc); break;
    case 'spiky': {
      const pts = [[r * 0.85, -r * 0.45], [r * 0.6, -r * 1.3], [r * 0.15, -r * 0.95], [-r * 0.2, -r * 1.65], [-r * 0.5, -r * 1.05], [-r * 1.15, -r * 1.35],
        [-r * 1.0, -r * 0.6], [-r * 1.7, -r * 0.4], [-r * 1.05, -r * 0.05], [-r * 1.5, r * 0.45], [-r * 0.85, r * 0.45], [-r * 0.5, r * 0.15], [r * 0.1, -r * 0.35]];
      ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (const q of pts) ctx.lineTo(q[0], q[1] + (q[0] < -r ? wave * 0.3 : 0)); ctx.closePath(); fillS(hc); break;
    }
    case 'wild': {
      ctx.beginPath(); ctx.arc(0, 0, r + 1.5, Math.PI * 0.9, Math.PI * 1.9); ctx.quadraticCurveTo(0, -r * 0.2, -r * 0.6, r * 0.3); ctx.closePath(); fillS(hc);
      for (const [x, y, rr] of [[r * 0.3, -r * 1.0, r * 0.45], [-r * 0.3, -r * 1.15, r * 0.55], [-r * 0.9, -r * 0.8, r * 0.5]]) { ctx.beginPath(); ctx.arc(x, y, rr, 0, TAU); fillS(hc); }
      break;
    }
    case 'mohawk':
      ctx.beginPath(); ctx.moveTo(r * 0.55, -r * 0.8); ctx.lineTo(r * 0.35, -r * 1.55); ctx.lineTo(-r * 0.3, -r * 1.75 + wave * 0.3); ctx.lineTo(-r * 1.1, -r * 1.2);
      ctx.lineTo(-r * 0.95, -r * 0.35); ctx.lineTo(-r * 0.2, -r * 0.95); ctx.closePath(); fillS(hc); break;
    case 'hood':
      ctx.beginPath(); ctx.arc(-r * 0.18, -r * 0.08, r * 1.36, Math.PI * 1.0, Math.PI * 1.9);
      ctx.quadraticCurveTo(r * 0.15, -r * 0.55, -r * 0.55, r * 0.9); ctx.closePath(); fillS(hoodC); break;
    case 'helmet':
      ctx.beginPath(); ctx.arc(0, 0, r + 1.8, Math.PI * 0.93, Math.PI * 1.92); ctx.closePath(); fillS(T || L.helmC || '#9aa3ad');
      if (!T) { ctx.strokeStyle = L.accent; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(r * 0.3, -r * 1.15); ctx.quadraticCurveTo(-r * 0.4, -r * 1.7, -r * 1.2, -r * 0.9); ctx.stroke(); }
      break;
    case 'flame': {
      const fl = T ? [T, T] : ['#ff5a14', '#ffd23a'];
      for (let i = 0; i < 2; i++) {
        ctx.beginPath(); ctx.moveTo(r * 0.8, -r * 0.4);
        for (let k = 0; k <= 5; k++) {
          const x = lerp(r * 0.8, -r * 1.1, k / 5), h = (i ? 1.2 : 1.8) * r * (0.7 + 0.3 * Math.sin(tm * 0.5 + k * 1.7));
          ctx.lineTo(x - r * 0.15, -r * 0.6 - h); ctx.lineTo(lerp(r * 0.8, -r * 1.1, (k + 0.5) / 5), -r * 0.7);
        }
        ctx.closePath(); ctx.fillStyle = fl[i]; ctx.fill();
      }
      break;
    }
    case 'bald':
      if (!T) { ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.beginPath(); ctx.ellipse(-r * 0.2, -r * 0.55, r * 0.35, r * 0.18, -0.3, 0, TAU); ctx.fill(); }
      break;
  }
  // accessoires de tête
  if (acc.includes('headband')) {
    ctx.strokeStyle = OUT; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(-r, -r * 0.45); ctx.lineTo(r * 0.95, -r * 0.5); ctx.stroke();
    ctx.strokeStyle = T || L.accent; ctx.lineWidth = 3; ctx.stroke();
    for (const k of [0, 1]) {
      ctx.beginPath(); ctx.moveTo(-r, -r * 0.45); ctx.quadraticCurveTo(-r * 1.5, -r * 0.4 + k * 4, -r * 2.2, -r * 0.1 + k * 5 + wave * (k ? 1 : 0.6));
      ctx.strokeStyle = OUT; ctx.lineWidth = 4.5; ctx.stroke(); ctx.strokeStyle = T || L.accent; ctx.lineWidth = 2.5; ctx.stroke();
    }
  }
  if (acc.includes('goggles')) {
    ctx.strokeStyle = OUT; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-r, -r * 0.55); ctx.lineTo(r * 0.5, -r * 0.65); ctx.stroke();
    ctx.beginPath(); ctx.arc(r * 0.55, -r * 0.62, 3.6, 0, TAU); fillS(T || L.accent);
  }
  if (!T) {
    ctx.fillStyle = L.eye || '#16121c';
    ctx.fillRect(r * 0.38, -r * 0.15, 2.6, 4.2);
    if (L.eye && L.eyeGlow) { ctx.fillStyle = L.eye; ctx.globalAlpha *= 0.4; ctx.beginPath(); ctx.arc(r * 0.5, r * 0.05, 4.5, 0, TAU); ctx.fill(); ctx.globalAlpha /= 0.4; }
    if (!acc.includes('mask') && !acc.includes('beard')) {
      ctx.strokeStyle = 'rgba(70,30,30,0.7)'; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(r * 0.55, r * 0.58); ctx.lineTo(r * 0.85, r * 0.52); ctx.stroke();
    }
  }
  if (acc.includes('mask')) {
    ctx.save(); ctx.beginPath(); ctx.arc(0, 0, r - 0.5, 0, TAU); ctx.clip();
    ctx.fillStyle = T || L.maskC || '#22202a'; ctx.fillRect(-r * 0.3, r * 0.3, r * 1.5, r); ctx.restore();
  }
  if (acc.includes('beard')) {
    ctx.beginPath(); ctx.moveTo(r * 0.95, r * 0.2); ctx.quadraticCurveTo(r * 0.9, r * 1.5, r * 0.1, r * 1.45);
    ctx.quadraticCurveTo(-r * 0.4, r * 1.0, -r * 0.55, r * 0.35); ctx.quadraticCurveTo(r * 0.2, r * 0.75, r * 0.95, r * 0.2); fillS(T || L.beard || hc);
  }
  if (acc.includes('horns')) {
    for (const [bx, tx] of [[r * 0.25, r * 1.0], [-r * 0.55, -r * 0.5]]) {
      ctx.beginPath(); ctx.moveTo(bx - 3, -r * 0.75); ctx.quadraticCurveTo(bx + (tx - bx) * 0.2, -r * 1.7, tx, -r * 2.1);
      ctx.quadraticCurveTo(bx + 4, -r * 1.3, bx + 3, -r * 0.8); ctx.closePath(); fillS(T || '#ece2cf');
    }
  }
  if (acc.includes('crown')) {
    ctx.beginPath(); ctx.moveTo(-r * 0.8, -r * 0.85);
    for (let k = 0; k < 5; k++) { ctx.lineTo(-r * 0.8 + k * r * 0.38 + r * 0.19, -r * 1.6); ctx.lineTo(-r * 0.8 + (k + 1) * r * 0.38, -r * 1.05); }
    ctx.lineTo(r * 1.0, -r * 0.8); ctx.closePath(); fillS(T || L.crownC || '#c9a227');
  }
  if (acc.includes('flower') && !T) {
    for (let k = 0; k < 5; k++) { const a = k / 5 * TAU; ctx.beginPath(); ctx.arc(-r * 0.55 + Math.cos(a) * 2.6, -r * 0.95 + Math.sin(a) * 2.6, 2, 0, TAU); ctx.fillStyle = '#ff8fc0'; ctx.fill(); }
    ctx.beginPath(); ctx.arc(-r * 0.55, -r * 0.95, 1.6, 0, TAU); ctx.fillStyle = '#ffe14a'; ctx.fill();
  }
}

function drawWeapon(ctx, w, e, h, T) {
  let dx = h[0] - e[0], dy = h[1] - e[1]; const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l;
  const px = -dy, py = dx;
  const at = k => [h[0] + dx * k, h[1] + dy * k];
  const seg = (a, b, wd, col) => { ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.strokeStyle = OUT; ctx.lineWidth = wd + 2.5; ctx.stroke(); ctx.strokeStyle = col; ctx.lineWidth = wd; ctx.stroke(); };
  const c = col => T || col;
  switch (w) {
    case 'staff': seg(at(-18), at(36), 4, c('#8b5a2b')); break;
    case 'spear': {
      seg(at(-24), at(40), 3.5, c('#7a5530'));
      const tip = at(52), b = at(38);
      ctx.beginPath(); ctx.moveTo(tip[0], tip[1]); ctx.lineTo(b[0] + px * 5, b[1] + py * 5); ctx.lineTo(b[0] - px * 5, b[1] - py * 5); ctx.closePath();
      ctx.fillStyle = c('#d6dde6'); ctx.fill(); ctx.strokeStyle = OUT; ctx.lineWidth = 1.5; ctx.stroke(); break;
    }
    case 'sword': {
      seg(at(-6), at(0), 3.5, c('#5a3a20'));
      seg(at(4), at(34), 4.5, c('#dfe5ee'));
      const g0 = at(2); seg([g0[0] + px * 6, g0[1] + py * 6], [g0[0] - px * 6, g0[1] - py * 6], 3, c('#c9a227')); break;
    }
    case 'knife': seg(at(2), at(15), 3, c('#dfe5ee')); seg(at(-4), at(1), 3, c('#3a2a1a')); break;
    case 'club': {
      seg(at(-6), at(10), 5, c('#6b4423'));
      const a = at(10), b = at(34);
      ctx.beginPath(); ctx.moveTo(a[0] + px * 3, a[1] + py * 3); ctx.lineTo(b[0] + px * 7, b[1] + py * 7); ctx.arc(b[0], b[1], 7, Math.atan2(py, px), Math.atan2(py, px) + Math.PI, true);
      ctx.lineTo(a[0] - px * 3, a[1] - py * 3); ctx.closePath(); ctx.fillStyle = c('#7d5230'); ctx.fill(); ctx.strokeStyle = OUT; ctx.lineWidth = 2; ctx.stroke();
      if (!T) { ctx.fillStyle = '#c8c8c8'; for (const k of [18, 26]) { const q = at(k); ctx.beginPath(); ctx.arc(q[0] + px * 5, q[1] + py * 5, 1.6, 0, TAU); ctx.fill(); } }
      break;
    }
    case 'hammer': {
      seg(at(-8), at(30), 4, c('#5a3a20'));
      const q = at(32);
      ctx.save(); ctx.translate(q[0], q[1]); ctx.rotate(Math.atan2(dy, dx));
      ctx.fillStyle = c('#4b4b55'); ctx.fillRect(-6, -11, 12, 22); ctx.strokeStyle = OUT; ctx.lineWidth = 2; ctx.strokeRect(-6, -11, 12, 22);
      if (!T) { ctx.fillStyle = '#ff7a2a'; ctx.fillRect(-6, -2, 12, 4); }
      ctx.restore(); break;
    }
    case 'bow': {
      ctx.beginPath(); ctx.arc(h[0], h[1], 15, Math.atan2(dy, dx) - 1.3, Math.atan2(dy, dx) + 1.3);
      ctx.strokeStyle = OUT; ctx.lineWidth = 4.5; ctx.stroke(); ctx.strokeStyle = c('#7a4f2a'); ctx.lineWidth = 2.5; ctx.stroke();
      const a1 = Math.atan2(dy, dx) - 1.3, a2 = Math.atan2(dy, dx) + 1.3;
      ctx.beginPath(); ctx.moveTo(h[0] + Math.cos(a1) * 15, h[1] + Math.sin(a1) * 15); ctx.lineTo(h[0] + Math.cos(a2) * 15, h[1] + Math.sin(a2) * 15);
      ctx.strokeStyle = 'rgba(240,240,240,0.8)'; ctx.lineWidth = 1; ctx.stroke(); break;
    }
  }
}

function drawFighter(ctx, f, cx) {
  const sx = f.x - cx, sy = GY + f.z - f.y;
  if (sx < -150 || sx > W + 150) return;
  const L = f.look, sc = L.scale || 1;
  let tint = null, alpha = 1;
  if (f.flash > 0 && f.flash % 2 === 1) tint = '#ffffff';
  else if (f.clone || L.shadow) { tint = L.shadowC || '#2a1640'; alpha = 0.8; }
  else if (f.state === 'frozen') tint = null;
  if (f.dead && f.deadT > 40 && !f.human && !f.keepCorpse) alpha = Math.max(0, 1 - (f.deadT - 40) / 50) * ((f.deadT >> 2) % 2 ? 1 : 0.5);
  if (f.inv > 0 && f.state !== 'move' && (f.t >> 2) % 2) alpha *= 0.55;
  if (f.dead && f.human) alpha *= 0.75;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(sx, sy);
  let fc = f.facing; if (f.spin) fc *= ((f.t / 3) | 0) % 2 ? -1 : 1;
  ctx.scale(fc * sc, sc);
  const pose = f.getPose();
  drawBody(ctx, L, pose, { tint, time: f.t, weapon: f.weaponType(), speed: Math.abs(f.vx) });
  if (f.clone && !tint) { /* rien */ }
  ctx.restore();
  const top = sy - f.height - 6;
  if (f.state === 'frozen') {
    const w = 22 * sc, h = f.height + 8;
    ctx.save(); ctx.globalAlpha = 0.55;
    const g = ctx.createLinearGradient(sx - w, sy - h, sx + w, sy);
    g.addColorStop(0, '#e8fbff'); g.addColorStop(0.5, '#8fd8ff'); g.addColorStop(1, '#bff0ff');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.moveTo(sx - w, sy); ctx.lineTo(sx - w - 4, sy - h * 0.6); ctx.lineTo(sx - w + 6, sy - h); ctx.lineTo(sx + w - 2, sy - h - 4); ctx.lineTo(sx + w + 4, sy - h * 0.4); ctx.lineTo(sx + w, sy); ctx.closePath(); ctx.fill();
    ctx.globalAlpha = 0.9; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2; ctx.stroke();
    ctx.restore();
  }
  if (f.state === 'dizzy') {
    for (let i = 0; i < 3; i++) {
      const a = f.t * 0.12 + i * TAU / 3;
      drawStar(ctx, sx + Math.cos(a) * 14 * sc, top + 2 + Math.sin(a) * 4, 4, '#ffe14a');
    }
  }
  if (f.rooted > 0 && f.state === 'hurt') {
    ctx.strokeStyle = '#2f8a2f'; ctx.lineWidth = 3;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath(); ctx.moveTo(sx - 12 + i * 12, sy);
      ctx.bezierCurveTo(sx - 20 + i * 14, sy - 15, sx + 16 - i * 10, sy - 22, sx - 6 + i * 6, sy - 34 - i * 4); ctx.stroke();
    }
  }
  if (f.human && !f.dead) {
    const col = f.pid === 0 ? '#4fb3ff' : '#ff9a3c';
    txt(ctx, 'J' + (f.pid + 1), sx, top - 4, { size: 12, color: col, align: 'center' });
    ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(sx - 4, top - 1); ctx.lineTo(sx + 4, top - 1); ctx.lineTo(sx, top + 4); ctx.fill();
  } else if (f.ally && !f.dead) {
    txt(ctx, 'Allié', sx, top - 2, { size: 10, color: '#7dff9a', align: 'center' });
  }
}

function drawStar(ctx, x, y, r, col) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r; ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
  ctx.closePath(); ctx.fillStyle = col; ctx.fill(); ctx.strokeStyle = OUT; ctx.lineWidth = 1; ctx.stroke();
}

function drawPortrait(ctx, def, x, y, w, h, o = {}) {
  ctx.save();
  ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
  const g = ctx.createLinearGradient(x, y, x, y + h);
  g.addColorStop(0, o.dim ? '#333' : (def.color || '#456')); g.addColorStop(1, '#0d0b14');
  ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
  const sc = h / 40;
  ctx.translate(x + w * 0.5 - 1 * sc, y + h * 0.1 + 78 * sc);
  ctx.scale(sc, sc);
  const L = Object.assign({}, def.look, { scale: 1 });
  if (o.dim) ctx.globalAlpha = 0.6;
  drawBody(ctx, L, POSES.stand, { tint: o.dim ? '#555' : (L.shadow ? (L.shadowC || '#2a1640') : null), time: o.time || 0 });
  ctx.restore();
}

// ---------------------------------------------------------------------
//  Texte & interface
// ---------------------------------------------------------------------
function txt(ctx, s, x, y, o = {}) {
  ctx.font = (o.w || 'bold') + ' ' + (o.size || 16) + 'px ' + FONT;
  ctx.textAlign = o.align || 'left';
  ctx.textBaseline = o.base || 'alphabetic';
  if (o.stroke !== false) { ctx.lineJoin = 'round'; ctx.lineWidth = o.lw || Math.max(2, (o.size || 16) / 5); ctx.strokeStyle = o.sc || 'rgba(0,0,0,0.85)'; ctx.strokeText(s, x, y); }
  ctx.fillStyle = o.color || '#fff';
  ctx.fillText(s, x, y);
}
function wrapText(ctx, s, maxW, size, w) {
  ctx.font = (w || 'bold') + ' ' + size + 'px ' + FONT;
  const words = s.split(' '), lines = []; let cur = '';
  for (const wd of words) {
    const t = cur ? cur + ' ' + wd : wd;
    if (ctx.measureText(t).width > maxW && cur) { lines.push(cur); cur = wd; } else cur = t;
  }
  if (cur) lines.push(cur);
  return lines;
}
function rrect(ctx, x, y, w, h, r) {
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
function panel(ctx, x, y, w, h, o = {}) {
  rrect(ctx, x, y, w, h, o.r || 8);
  ctx.fillStyle = o.fill || 'rgba(10,8,22,0.78)'; ctx.fill();
  ctx.lineWidth = o.lw || 2; ctx.strokeStyle = o.stroke || 'rgba(160,140,255,0.55)'; ctx.stroke();
}
function cmdLabel(c) {
  const d = { '>': '→', '^': '↑', 'v': '↓' };
  return 'D ' + d[c[1]] + ' ' + c[2];
}

// ---------------------------------------------------------------------
//  Projectiles
// ---------------------------------------------------------------------
function zig(ctx, x0, y0, x1, y1, n, amp) {
  ctx.beginPath(); ctx.moveTo(x0, y0);
  for (let i = 1; i < n; i++) { const t = i / n; ctx.lineTo(lerp(x0, x1, t) + rand(-amp, amp), lerp(y0, y1, t) + rand(-amp, amp)); }
  ctx.lineTo(x1, y1);
}
function glowCircle(ctx, x, y, r, stops) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  stops.forEach((c, i) => g.addColorStop(i / (stops.length - 1), c));
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
}

function drawProj(ctx, p, cx) {
  const sx = p.x - cx, sy = GY + p.z - p.y;
  if (sx < -450 || sx > W + 450) return;
  const gnd = p.y; // distance au sol en coordonnées locales (vers le bas)
  const f = p.vx < 0 ? -1 : p.vx > 0 ? 1 : (p.facing || 1);
  const t = p.t;
  ctx.save(); ctx.translate(sx, sy);
  switch (p.kind) {
    case 'wind': {
      ctx.scale(f, 1);
      for (let i = 0; i < 3; i++) {
        ctx.beginPath(); ctx.arc(-4 - i * 8, 0, 20 - i * 3, -1.15, 1.15);
        ctx.strokeStyle = i === 0 ? '#ffffff' : 'rgba(110,240,200,' + (0.85 - i * 0.25) + ')';
        ctx.lineWidth = 6 - i * 1.5; ctx.stroke();
      }
      break;
    }
    case 'fire': {
      const r = p.r * 1.5;
      glowCircle(ctx, 0, 0, r + Math.sin(t * 0.8) * 2, ['#fffbe0', '#ffc23a', 'rgba(255,90,20,0.85)', 'rgba(255,40,0,0)']);
      ctx.scale(f, 1);
      ctx.fillStyle = 'rgba(255,120,30,0.5)';
      for (let i = 1; i < 4; i++) { ctx.beginPath(); ctx.arc(-i * r * 0.5, Math.sin(t * 0.5 + i) * 3, r * (0.6 - i * 0.12), 0, TAU); ctx.fill(); }
      break;
    }
    case 'meteor': {
      ctx.save(); ctx.rotate(Math.atan2(-p.vy, p.vx));
      ctx.fillStyle = 'rgba(255,120,30,0.45)';
      for (let i = 1; i < 6; i++) { ctx.beginPath(); ctx.arc(-i * 9, 0, 12 - i * 1.6, 0, TAU); ctx.fill(); }
      ctx.restore();
      glowCircle(ctx, 0, 0, 18, ['#fff6d0', '#ffb030', 'rgba(255,60,0,0.8)', 'rgba(255,40,0,0)']);
      ctx.fillStyle = '#5a2a1a'; ctx.beginPath(); ctx.arc(0, 0, 6, 0, TAU); ctx.fill();
      break;
    }
    case 'ice': {
      ctx.scale(f, 1);
      ctx.beginPath(); ctx.moveTo(18, 0); ctx.lineTo(0, -7); ctx.lineTo(-16, 0); ctx.lineTo(0, 7); ctx.closePath();
      ctx.fillStyle = 'rgba(185,240,255,0.95)'; ctx.fill(); ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = 'rgba(120,200,255,0.4)'; ctx.beginPath(); ctx.arc(-14, 0, 7, 0, TAU); ctx.fill();
      break;
    }
    case 'breath': {
      ctx.globalAlpha = Math.max(0, 1 - t / 30);
      glowCircle(ctx, 0, 0, 12 + t * 0.6, ['rgba(255,255,255,0.9)', 'rgba(170,230,255,0.6)', 'rgba(150,220,255,0)']);
      break;
    }
    case 'bolt': {
      ctx.scale(f, 1);
      zig(ctx, -28, 0, 20, 0, 6, 5); ctx.strokeStyle = 'rgba(255,240,80,0.45)'; ctx.lineWidth = 9; ctx.stroke();
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2.5; ctx.stroke();
      glowCircle(ctx, 18, 0, 10, ['#ffffff', 'rgba(255,240,100,0.6)', 'rgba(255,240,100,0)']);
      break;
    }
    case 'rock': {
      ctx.rotate(t * 0.15 * f);
      const rr = seeded(p.id * 13);
      ctx.beginPath();
      for (let i = 0; i < 8; i++) { const a = i / 8 * TAU, r = p.r * (0.8 + rr() * 0.35); ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
      ctx.closePath(); ctx.fillStyle = '#8a6a4a'; ctx.fill(); ctx.strokeStyle = OUT; ctx.lineWidth = 2.5; ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.beginPath(); ctx.arc(-4, -5, p.r * 0.35, 0, TAU); ctx.fill();
      break;
    }
    case 'void': {
      const r = p.r * 1.4;
      glowCircle(ctx, 0, 0, r * 1.5, ['rgba(40,0,60,0.9)', 'rgba(140,60,255,0.6)', 'rgba(140,60,255,0)']);
      ctx.fillStyle = '#0a0010'; ctx.beginPath(); ctx.arc(0, 0, r * 0.45, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#c99bff'; ctx.lineWidth = 2;
      for (let i = 0; i < 3; i++) { const a = t * 0.2 + i * TAU / 3; ctx.beginPath(); ctx.arc(0, 0, r * 0.8, a, a + 1.2); ctx.stroke(); }
      break;
    }
    case 'vine': {
      ctx.scale(f, 1);
      ctx.strokeStyle = '#2e7d32'; ctx.lineWidth = 4;
      for (let i = 0; i < 3; i++) {
        ctx.beginPath(); ctx.moveTo(-34 + i * 6, gnd);
        ctx.bezierCurveTo(-20 + i * 5, gnd - 22 - i * 4, 0, gnd - 6, 8 - i * 4, gnd - 26 + Math.sin(t * 0.4 + i) * 4); ctx.stroke();
      }
      ctx.fillStyle = '#6cd16c';
      for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.ellipse(-26 + i * 9, gnd - 10 - (i % 2) * 8, 4, 2, 0.6, 0, TAU); ctx.fill(); }
      break;
    }
    case 'seed': {
      ctx.rotate(t * 0.2);
      ctx.fillStyle = '#8d6e3f'; ctx.beginPath(); ctx.ellipse(0, 0, 9, 6.5, 0, 0, TAU); ctx.fill(); ctx.strokeStyle = OUT; ctx.lineWidth = 2; ctx.stroke();
      ctx.strokeStyle = '#59c84f'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(0, -6); ctx.quadraticCurveTo(4, -12, 9, -11); ctx.stroke();
      break;
    }
    case 'rocket': {
      ctx.rotate(Math.atan2(p.vz * 0.6 - p.vy, p.vx));
      ctx.fillStyle = 'rgba(255,170,40,0.85)'; ctx.beginPath(); ctx.moveTo(-10, -4); ctx.lineTo(-22 - Math.random() * 8, 0); ctx.lineTo(-10, 4); ctx.fill();
      ctx.fillStyle = '#c9ced6'; ctx.fillRect(-11, -4.5, 18, 9); ctx.strokeStyle = OUT; ctx.lineWidth = 1.5; ctx.strokeRect(-11, -4.5, 18, 9);
      ctx.fillStyle = '#e53935'; ctx.beginPath(); ctx.moveTo(7, -4.5); ctx.lineTo(14, 0); ctx.lineTo(7, 4.5); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#40e0ff'; ctx.fillRect(-9, -7, 4, 14);
      break;
    }
    case 'beam': {
      if (p.delay > 0) { glowCircle(ctx, -p.r * f, 0, 10, ['#ffffff', 'rgba(64,224,255,0.5)', 'rgba(64,224,255,0)']); break; }
      const fl = 1 + Math.sin(t * 1.3) * 0.15;
      const x0 = -p.r, x1 = p.r;
      ctx.fillStyle = 'rgba(64,224,255,0.35)'; ctx.fillRect(x0, -9 * fl, x1 - x0, 18 * fl);
      ctx.fillStyle = 'rgba(160,245,255,0.8)'; ctx.fillRect(x0, -4.5 * fl, x1 - x0, 9 * fl);
      ctx.fillStyle = '#ffffff'; ctx.fillRect(x0, -1.8, x1 - x0, 3.6);
      glowCircle(ctx, -p.r * f, 0, 16, ['#ffffff', 'rgba(64,224,255,0.7)', 'rgba(64,224,255,0)']);
      break;
    }
    case 'mine': {
      ctx.fillStyle = '#3a3d44'; ctx.beginPath(); ctx.ellipse(0, gnd - 2, 10, 4.5, 0, 0, TAU); ctx.fill(); ctx.strokeStyle = OUT; ctx.lineWidth = 1.5; ctx.stroke();
      const armed = p.t > (p.arm || 0);
      ctx.fillStyle = armed ? ((t >> 3) % 2 ? '#ff3030' : '#601010') : '#888';
      ctx.beginPath(); ctx.arc(0, gnd - 5, 2.5, 0, TAU); ctx.fill();
      break;
    }
    case 'explosion': case 'petalBurst': case 'nova': {
      const k = clamp(t / Math.max(1, p.maxLife), 0, 1);
      const r = p.r * (0.35 + k * 0.75);
      ctx.globalAlpha = 1 - k * 0.8;
      const pal = p.kind === 'petalBurst' ? ['#ffffff', '#ffb3d9', 'rgba(120,220,120,0.6)', 'rgba(120,220,120,0)']
        : p.kind === 'nova' ? ['#ffffff', '#d8a8ff', 'rgba(110,30,200,0.7)', 'rgba(60,0,120,0)']
          : ['#fffbe0', '#ffc23a', 'rgba(255,80,20,0.75)', 'rgba(80,30,20,0)'];
      ctx.save(); ctx.scale(1, 0.75); glowCircle(ctx, 0, 0, r, pal); ctx.restore();
      ctx.strokeStyle = pal[1]; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(0, gnd, r * 1.05, r * 0.4, 0, 0, TAU); ctx.stroke();
      break;
    }
    case 'tornado': {
      for (let i = 0; i < 9; i++) {
        const yy = gnd - i * 12, ww = 8 + i * 4.5;
        ctx.beginPath(); ctx.ellipse(Math.sin(t * 0.35 + i * 0.8) * 5, yy, ww, 3 + i * 0.6, 0, 0, TAU);
        ctx.strokeStyle = 'rgba(230,255,248,' + (0.45 + 0.05 * i) + ')'; ctx.lineWidth = 3; ctx.stroke();
      }
      ctx.strokeStyle = 'rgba(110,240,200,0.6)'; ctx.lineWidth = 2;
      ctx.beginPath(); for (let i = 0; i < 30; i++) { const a = t * 0.5 + i * 0.6; ctx.lineTo(Math.cos(a) * (6 + i * 1.4), gnd - i * 3.5); } ctx.stroke();
      break;
    }
    case 'pillar': case 'darkPillar': {
      const dark = p.kind === 'darkPillar';
      if (p.delay > 0) { marker(ctx, gnd, dark ? '#c040ff' : '#ff6a1a', t); break; }
      const k = Math.min(1, p.t / 5) * Math.min(1, (p.life + 2) / 8);
      const hh = 120 * k;
      ctx.save(); ctx.globalAlpha = 0.9;
      const g = ctx.createLinearGradient(0, gnd, 0, gnd - hh);
      if (dark) { g.addColorStop(0, '#f0d0ff'); g.addColorStop(0.4, 'rgba(150,60,255,0.85)'); g.addColorStop(1, 'rgba(40,0,80,0)'); }
      else { g.addColorStop(0, '#fff3b0'); g.addColorStop(0.35, 'rgba(255,140,30,0.9)'); g.addColorStop(1, 'rgba(255,40,0,0)'); }
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.moveTo(-22, gnd);
      for (let i = 0; i <= 6; i++) ctx.lineTo(-22 + i * 7.3, gnd - hh * (0.6 + 0.4 * Math.abs(Math.sin(t * 0.7 + i * 1.3))));
      ctx.lineTo(22, gnd); ctx.closePath(); ctx.fill();
      ctx.restore();
      break;
    }
    case 'spike': case 'rockSpike': {
      const rock = p.kind === 'rockSpike';
      if (p.delay > 0) { marker(ctx, gnd, rock ? '#a07040' : '#9fe6ff', t); break; }
      const k = Math.min(1, p.t / 4) * Math.min(1, (p.life + 3) / 8);
      const hh = (rock ? 75 : 55) * k, ww = rock ? 20 : 13;
      const col = rock ? '#8a6a4a' : 'rgba(190,240,255,0.92)';
      for (const [ox, sc] of [[-ww * 0.7, 0.6], [ww * 0.6, 0.7], [0, 1]]) {
        ctx.beginPath(); ctx.moveTo(ox - ww * sc, gnd); ctx.lineTo(ox + (rock ? 0 : 2), gnd - hh * sc); ctx.lineTo(ox + ww * sc, gnd); ctx.closePath();
        ctx.fillStyle = col; ctx.fill(); ctx.strokeStyle = rock ? OUT : '#ffffff'; ctx.lineWidth = 2; ctx.stroke();
      }
      break;
    }
    case 'iceWall': {
      const k = Math.min(1, p.t / 6), hh = 92 * k;
      const fade = Math.min(1, p.life / 20);
      ctx.globalAlpha = 0.85 * fade;
      const g = ctx.createLinearGradient(-16, 0, 16, 0); g.addColorStop(0, '#dff8ff'); g.addColorStop(0.5, '#7fd0f5'); g.addColorStop(1, '#c8f0ff');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.moveTo(-15, gnd); ctx.lineTo(-17, gnd - hh * 0.7); ctx.lineTo(-6, gnd - hh); ctx.lineTo(8, gnd - hh * 0.9); ctx.lineTo(16, gnd - hh * 0.55); ctx.lineTo(14, gnd); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2.5; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-8, gnd - 10); ctx.lineTo(-3, gnd - hh * 0.6); ctx.stroke();
      break;
    }
    case 'lightning': {
      if (p.delay > 0) { marker(ctx, gnd, '#ffe14a', t + p.delay); break; }
      const top = -sy - 20;
      zig(ctx, rand(-20, 20), top, 0, gnd, 10, 12); ctx.strokeStyle = 'rgba(255,240,120,0.5)'; ctx.lineWidth = 14; ctx.stroke();
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 4; ctx.stroke();
      glowCircle(ctx, 0, gnd, 40, ['rgba(255,255,255,0.9)', 'rgba(255,240,120,0.5)', 'rgba(255,240,120,0)']);
      break;
    }
    case 'darkLightning': {
      if (p.delay > 0) { marker(ctx, gnd, '#c040ff', t + p.delay); break; }
      const top = -sy - 20;
      zig(ctx, rand(-20, 20), top, 0, gnd, 10, 12); ctx.strokeStyle = 'rgba(170,60,255,0.55)'; ctx.lineWidth = 16; ctx.stroke();
      ctx.strokeStyle = '#f0d8ff'; ctx.lineWidth = 4; ctx.stroke();
      glowCircle(ctx, 0, gnd, 44, ['rgba(255,230,255,0.9)', 'rgba(150,60,255,0.5)', 'rgba(150,60,255,0)']);
      break;
    }
    case 'static': {
      ctx.globalAlpha = 0.85;
      ctx.save(); ctx.scale(1, 0.6); glowCircle(ctx, 0, 0, p.r, ['rgba(255,255,200,0.05)', 'rgba(255,240,100,0.25)', 'rgba(255,240,100,0)']); ctx.restore();
      ctx.strokeStyle = '#fff59a'; ctx.lineWidth = 2;
      for (let i = 0; i < 6; i++) {
        const a = rand(0, TAU), b = a + rand(0.4, 1.0);
        zig(ctx, Math.cos(a) * p.r * 0.9, Math.sin(a) * p.r * 0.55, Math.cos(b) * p.r * 0.9, Math.sin(b) * p.r * 0.55, 4, 6); ctx.stroke();
      }
      break;
    }
    case 'bloom': {
      const k = clamp(t / Math.max(1, p.maxLife), 0, 1), r = p.r * (0.3 + k * 0.8);
      ctx.globalAlpha = 1 - k * 0.7;
      for (let i = 0; i < 14; i++) {
        const a = i / 14 * TAU + k;
        const x = Math.cos(a) * r, y = gnd + Math.sin(a) * r * 0.45;
        ctx.fillStyle = i % 2 ? '#ff8fc0' : '#6cd16c';
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * 10 - 3, y - 18); ctx.lineTo(x + Math.cos(a) * 10 + 3, y - 18); ctx.closePath(); ctx.fill();
      }
      ctx.strokeStyle = 'rgba(120,255,140,0.7)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(0, gnd, r, r * 0.45, 0, 0, TAU); ctx.stroke();
      break;
    }
    case 'shock': {
      const col = p.fx === 'fire' ? '#ff7a2a' : p.fx === 'ice' ? '#bff0ff' : '#8a6a4a';
      for (let i = 0; i < 3; i++) {
        const ox = (i - 1) * 12 - f * (t % 6), hh = 16 + ((i * 7 + t) % 9);
        ctx.beginPath(); ctx.moveTo(ox - 8, gnd); ctx.lineTo(ox, gnd - hh); ctx.lineTo(ox + 8, gnd); ctx.closePath();
        ctx.fillStyle = col; ctx.fill(); ctx.strokeStyle = OUT; ctx.lineWidth = 1.5; ctx.stroke();
      }
      break;
    }
    case 'arrow': {
      ctx.scale(f, 1);
      ctx.strokeStyle = '#6b4a2a'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(-18, 0); ctx.lineTo(12, 0); ctx.stroke();
      ctx.fillStyle = '#d8dde6'; ctx.beginPath(); ctx.moveTo(18, 0); ctx.lineTo(10, -4); ctx.lineTo(10, 4); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#e8e8e8'; ctx.beginPath(); ctx.moveTo(-18, 0); ctx.lineTo(-24, -5); ctx.lineTo(-14, 0); ctx.lineTo(-24, 5); ctx.closePath(); ctx.fill();
      break;
    }
    case 'knife': {
      ctx.rotate(t * 0.6 * f);
      ctx.fillStyle = '#e6ebf2'; ctx.beginPath(); ctx.moveTo(10, 0); ctx.lineTo(-2, -3); ctx.lineTo(-2, 3); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#2b3a2b'; ctx.fillRect(-8, -2, 6, 4);
      break;
    }
    default: glowCircle(ctx, 0, 0, p.r, ['#fff', 'rgba(255,255,255,0)']);
  }
  ctx.restore();
}
function marker(ctx, gy, col, t) {
  ctx.save(); ctx.globalAlpha = 0.5 + 0.4 * Math.sin(t * 0.6);
  ctx.strokeStyle = col; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.ellipse(0, gy, 24, 9, 0, 0, TAU); ctx.stroke();
  ctx.beginPath(); ctx.ellipse(0, gy, 12, 4.5, 0, 0, TAU); ctx.stroke();
  ctx.restore();
}

// ---------------------------------------------------------------------
//  Objets au sol
// ---------------------------------------------------------------------
function drawItem(ctx, it, cx) {
  if (it.holder && !it.def.heavy) return;
  const sx = it.x - cx, sy = GY + it.z - it.y;
  if (sx < -60 || sx > W + 60) return;
  ctx.save(); ctx.translate(sx, sy);
  const blink = it.life && it.life < 120 && (it.life >> 3) % 2;
  if (blink) ctx.globalAlpha = 0.4;
  switch (it.def.w) {
    case 'staff': ctx.rotate(it.rot); ctx.strokeStyle = OUT; ctx.lineWidth = 6.5; ctx.beginPath(); ctx.moveTo(-26, -4); ctx.lineTo(26, -4); ctx.stroke(); ctx.strokeStyle = '#8b5a2b'; ctx.lineWidth = 4; ctx.stroke(); break;
    case 'knife': ctx.rotate(it.rot); ctx.fillStyle = '#e6ebf2'; ctx.fillRect(-2, -5, 14, 3); ctx.fillStyle = '#3a2a1a'; ctx.fillRect(-8, -5.5, 6, 4); break;
    case 'stone': {
      ctx.rotate(it.rot * 0.5);
      ctx.beginPath(); const r = seeded(it.id); for (let i = 0; i < 8; i++) { const a = i / 8 * TAU, rr = 13 * (0.8 + r() * 0.3); ctx.lineTo(Math.cos(a) * rr, -12 + Math.sin(a) * rr * 0.85); }
      ctx.closePath(); ctx.fillStyle = '#8d8a84'; ctx.fill(); ctx.strokeStyle = OUT; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.2)'; ctx.beginPath(); ctx.arc(-4, -17, 4, 0, TAU); ctx.fill(); break;
    }
    case 'crate':
      ctx.rotate(it.rot * 0.3);
      ctx.fillStyle = '#b07a3f'; ctx.fillRect(-14, -28, 28, 28); ctx.strokeStyle = OUT; ctx.lineWidth = 2; ctx.strokeRect(-14, -28, 28, 28);
      ctx.strokeStyle = '#7a5025'; ctx.beginPath(); ctx.moveTo(-14, -28); ctx.lineTo(14, 0); ctx.moveTo(14, -28); ctx.lineTo(-14, 0); ctx.stroke(); break;
    case 'potion': {
      const bob = Math.sin(it.t * 0.1) * 1.5;
      glowCircle(ctx, 0, -10 + bob, 16, ['rgba(255,120,160,0.5)', 'rgba(255,120,160,0)']);
      ctx.fillStyle = '#ff5c8a'; ctx.beginPath(); ctx.arc(0, -8 + bob, 7, 0, TAU); ctx.fill(); ctx.strokeStyle = OUT; ctx.lineWidth = 1.8; ctx.stroke();
      ctx.fillStyle = '#e8e8f0'; ctx.fillRect(-2.5, -19 + bob, 5, 6); ctx.strokeRect(-2.5, -19 + bob, 5, 6);
      ctx.fillStyle = '#8b5a2b'; ctx.fillRect(-3, -21 + bob, 6, 3);
      ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.beginPath(); ctx.arc(-2.5, -10 + bob, 2, 0, TAU); ctx.fill();
      break;
    }
  }
  ctx.restore();
}

// ---------------------------------------------------------------------
//  Particules
// ---------------------------------------------------------------------
function drawParticle(ctx, q, cx) {
  const sx = q.x - cx, sy = GY + q.z - q.y;
  if (sx < -80 || sx > W + 80) return;
  const k = q.life / q.max;
  switch (q.type) {
    case 'spark':
      ctx.strokeStyle = q.color; ctx.lineWidth = q.size; ctx.globalAlpha = k;
      ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx - q.vx * 2.5, sy + q.vy * 2.5); ctx.stroke(); break;
    case 'hitflash': {
      ctx.globalAlpha = k; const r = q.size * (1.3 - k * 0.5);
      ctx.fillStyle = q.color;
      ctx.beginPath(); for (let i = 0; i < 16; i++) { const a = i / 16 * TAU + q.rot, rr = i % 2 ? r * 0.35 : r; ctx.lineTo(sx + Math.cos(a) * rr, sy + Math.sin(a) * rr); } ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(sx, sy, r * 0.3, 0, TAU); ctx.fill(); break;
    }
    case 'dust': case 'smoke':
      ctx.globalAlpha = k * (q.type === 'smoke' ? 0.6 : 0.45); ctx.fillStyle = q.color;
      ctx.beginPath(); ctx.arc(sx, sy, q.size * (1.8 - k), 0, TAU); ctx.fill(); break;
    case 'fire': {
      ctx.globalAlpha = Math.min(1, k * 1.5);
      ctx.fillStyle = k > 0.6 ? '#ffe680' : k > 0.3 ? '#ff9a2a' : '#d8401a';
      ctx.beginPath(); ctx.arc(sx, sy, q.size * (0.4 + k), 0, TAU); ctx.fill(); break;
    }
    case 'ice': case 'debris': case 'petal': case 'leaf':
      ctx.globalAlpha = Math.min(1, k * 2); ctx.fillStyle = q.color;
      ctx.save(); ctx.translate(sx, sy); ctx.rotate(q.rot + q.t * 0.2);
      if (q.type === 'petal' || q.type === 'leaf') { ctx.beginPath(); ctx.ellipse(0, 0, q.size, q.size * 0.5, 0, 0, TAU); ctx.fill(); }
      else ctx.fillRect(-q.size / 2, -q.size / 2, q.size, q.size);
      ctx.restore(); break;
    case 'elec':
      ctx.globalAlpha = k; ctx.strokeStyle = q.color || '#fff59a'; ctx.lineWidth = 2;
      zig(ctx, sx - 8, sy + rand(-6, 6), sx + 8, sy + rand(-6, 6), 3, 5); ctx.stroke(); break;
    case 'heal':
      ctx.globalAlpha = k; ctx.fillStyle = q.color || '#7dff9a';
      ctx.fillRect(sx - 1.5, sy - 5, 3, 10); ctx.fillRect(sx - 5, sy - 1.5, 10, 3); break;
    case 'wind':
      ctx.globalAlpha = k * 0.9; ctx.strokeStyle = q.color || 'rgba(220,255,245,1)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(sx, sy, q.size, q.rot, q.rot + 1.6); ctx.stroke(); break;
    case 'star': drawStar(ctx, sx, sy, q.size, q.color || '#ffe14a'); break;
    case 'ring':
      ctx.globalAlpha = k; ctx.strokeStyle = q.color; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.ellipse(sx, sy, q.size * (1.6 - k), q.size * (1.6 - k) * 0.4, 0, 0, TAU); ctx.stroke(); break;
    case 'slash': {
      ctx.globalAlpha = k; ctx.save(); ctx.translate(sx, sy); ctx.scale(q.facing || 1, 1);
      ctx.strokeStyle = q.color; ctx.lineWidth = 7 * k + 1;
      ctx.beginPath(); ctx.arc(-10, 10, q.size, -2.2, 0.9); ctx.stroke();
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2; ctx.stroke();
      ctx.restore(); break;
    }
    case 'text':
      ctx.globalAlpha = Math.min(1, k * 2);
      txt(ctx, q.text, sx, sy, { size: q.size, color: q.color, align: 'center' }); break;
    case 'after':
      ctx.globalAlpha = k * 0.45;
      ctx.save(); ctx.translate(sx, sy); ctx.scale(q.facing * q.sc, q.sc);
      drawBody(ctx, q.look, q.pose, { tint: q.color, time: 0 });
      ctx.restore(); break;
  }
  ctx.globalAlpha = 1;
}

// ---------------------------------------------------------------------
//  Décors (pré-rendus dans des canevas hors écran)
// ---------------------------------------------------------------------
const THEMES = {
  forest:  { name: 'Forêt de Lisière', amb: 'leaf', dust: '#8a7a5a' },
  canyon:  { name: 'Canyon Écarlate', amb: 'sand', dust: '#d8a870' },
  snow:    { name: 'Pics Gelés', amb: 'snow', dust: '#e8f2ff' },
  volcano: { name: 'Forge Volcanique', amb: 'ember', dust: '#5a4a48' },
  citadel: { name: 'Citadelle du Néant', amb: 'mote', dust: '#7a6a90' },
  arena:   { name: 'Arène du Crépuscule', amb: 'petal', dust: '#c8a888' },
  camp:    { name: "Camp d'entraînement", amb: 'ember', dust: '#b09070' },
};
const BGCache = {};
function getBG(theme, worldW) {
  const key = theme + ':' + worldW;
  if (BGCache[key]) return BGCache[key];
  const keys = Object.keys(BGCache); if (keys.length > 2) delete BGCache[keys[0]];
  const r = seeded(theme.length * 977 + worldW);
  const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
  const sky = mk(W, GY + 40), far = mk(Math.ceil(W + worldW * 0.15) + 8, GY + 40), mid = mk(Math.ceil(W + worldW * 0.45) + 8, GY + 40), gr = mk(worldW + W, H);
  PAINT[theme](sky.getContext('2d'), far.getContext('2d'), mid.getContext('2d'), gr.getContext('2d'), r, far.width, mid.width, gr.width);
  const bg = {
    theme,
    draw(ctx, cx) {
      ctx.drawImage(sky, 0, 0);
      ctx.drawImage(far, -Math.round(cx * 0.15), 0);
      ctx.drawImage(mid, -Math.round(cx * 0.45), 0);
      ctx.drawImage(gr, Math.round(cx), 0, W, H, 0, 0, W, H);
    },
  };
  BGCache[key] = bg;
  return bg;
}
function vgrad(ctx, y0, y1, cols) { const g = ctx.createLinearGradient(0, y0, 0, y1); cols.forEach((c, i) => g.addColorStop(i / (cols.length - 1), c)); return g; }
function hills(ctx, w, base, amp, col, r, f = 0.004) {
  const p1 = r() * 9, p2 = r() * 9, p3 = r() * 9;
  ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(0, GY + 40);
  for (let x = 0; x <= w + 8; x += 8) ctx.lineTo(x, base - amp * (0.55 + 0.25 * Math.sin(x * f + p1) + 0.15 * Math.sin(x * f * 2.7 + p2) + 0.05 * Math.sin(x * f * 7 + p3)));
  ctx.lineTo(w, GY + 40); ctx.closePath(); ctx.fill();
}
function peaks(ctx, w, base, hmin, hmax, col, r, cap) {
  let x = -60;
  while (x < w + 60) {
    const bw = 90 + r() * 150, h = hmin + r() * (hmax - hmin), tx = x + bw / 2 + (r() - 0.5) * 30;
    ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(x, base + 2); ctx.lineTo(tx, base - h); ctx.lineTo(x + bw, base + 2); ctx.closePath(); ctx.fill();
    if (cap) {
      const k = 0.3;
      ctx.fillStyle = cap; ctx.beginPath(); ctx.moveTo(tx, base - h);
      ctx.lineTo(lerp(tx, x + bw, k), lerp(base - h, base, k)); ctx.lineTo(lerp(tx, x + bw, k * 0.6), lerp(base - h, base, k) - 4);
      ctx.lineTo(lerp(tx, x, k * 0.7), lerp(base - h, base, k) + 3); ctx.lineTo(lerp(tx, x, k), lerp(base - h, base, k)); ctx.closePath(); ctx.fill();
    }
    x += bw * 0.55;
  }
}
function groundBase(g, gw, cols) { g.fillStyle = vgrad(g, GY - 6, H, cols); g.fillRect(0, GY - 6, gw, H - GY + 6); }
function cloud(ctx, x, y, s, col) { ctx.fillStyle = col; for (const [dx, dy, r] of [[0, 0, 18], [20, -8, 22], [42, 0, 18], [20, 6, 18]]) { ctx.beginPath(); ctx.arc(x + dx * s, y + dy * s, r * s, 0, TAU); ctx.fill(); } }

const PAINT = {
  // Camp d'entraînement du Ludus : palissade, tentes, mannequins, râtelier et feu de camp
  camp(sk, fa, mi, g, r, fw, mw, gw) {
    sk.fillStyle = vgrad(sk, 0, GY, ['#2a1a40', '#8a4a5a', '#f09a5a', '#ffd08a']); sk.fillRect(0, 0, W, GY + 40);
    glowCircle(sk, 300, GY - 60, 110, ['rgba(255,230,170,1)', 'rgba(255,170,90,0.45)', 'rgba(255,150,80,0)']);
    hills(fa, fw, GY - 20, 110, '#5a3a5a', r, 0.004); hills(fa, fw, GY, 70, '#45304a', r, 0.006);
    // palissade
    for (let x = -10; x < mw; x += 15) {
      const h = 78 + r() * 14;
      mi.fillStyle = r() < 0.5 ? '#5a3a22' : '#4a2f1c'; mi.fillRect(x, GY - h, 13, h + 6);
      mi.beginPath(); mi.moveTo(x, GY - h); mi.lineTo(x + 6.5, GY - h - 10); mi.lineTo(x + 13, GY - h); mi.fill();
    }
    mi.fillStyle = '#3a2414'; mi.fillRect(0, GY - 52, mw, 6); mi.fillRect(0, GY - 22, mw, 6);
    // tentes
    for (const [tx, col] of [[90, '#d8c8a0'], [240, '#c8a878'], [620, '#d8c8a0'], [880, '#b8986a']]) {
      mi.fillStyle = col; mi.beginPath(); mi.moveTo(tx - 60, GY + 4); mi.lineTo(tx, GY - 70); mi.lineTo(tx + 60, GY + 4); mi.closePath(); mi.fill();
      mi.strokeStyle = 'rgba(60,30,10,0.6)'; mi.lineWidth = 2; mi.stroke();
      mi.fillStyle = '#3a2414'; mi.beginPath(); mi.moveTo(tx - 14, GY + 4); mi.lineTo(tx, GY - 30); mi.lineTo(tx + 14, GY + 4); mi.fill();
      mi.fillStyle = '#a83232'; mi.fillRect(tx - 1, GY - 92, 2, 24); mi.beginPath(); mi.moveTo(tx + 1, GY - 92); mi.lineTo(tx + 20, GY - 86); mi.lineTo(tx + 1, GY - 80); mi.fill();
    }
    groundBase(g, gw, ['#6a4a30', '#9a7450', '#8a6646', '#6e5036']);
    for (let i = 0; i < gw / 10; i++) { g.fillStyle = 'rgba(60,40,20,0.25)'; g.fillRect(r() * gw, GY + r() * 200, 3, 2); }
    // cercle d'entraînement
    g.strokeStyle = 'rgba(255,230,190,0.35)'; g.lineWidth = 3; g.beginPath(); g.ellipse(430, 410, 230, 70, 0, 0, TAU); g.stroke();
    // mannequins d'entraînement
    for (const [dx, dy] of [[120, 330], [180, 360], [880, 340]]) {
      g.fillStyle = '#5a3a20'; g.fillRect(dx - 3, dy - 70, 6, 72);
      g.fillStyle = '#d8b860'; g.beginPath(); g.ellipse(dx, dy - 42, 13, 22, 0, 0, TAU); g.fill(); g.strokeStyle = OUT; g.lineWidth = 2; g.stroke();
      g.beginPath(); g.arc(dx, dy - 72, 10, 0, TAU); g.fill(); g.stroke();
      g.strokeStyle = '#5a3a20'; g.lineWidth = 5; g.beginPath(); g.moveTo(dx - 22, dy - 52); g.lineTo(dx + 22, dy - 52); g.stroke();
      g.strokeStyle = '#a83232'; g.lineWidth = 3; g.beginPath(); g.moveTo(dx - 13, dy - 36); g.lineTo(dx + 13, dy - 36); g.stroke();
    }
    // râtelier d'armes
    g.fillStyle = '#4a2f1c'; g.fillRect(660, 300, 90, 6); g.fillRect(660, 270, 6, 38); g.fillRect(744, 270, 6, 38);
    for (let k = 0; k < 4; k++) { g.strokeStyle = k % 2 ? '#c8ccd4' : '#8b5a2b'; g.lineWidth = 3; g.beginPath(); g.moveTo(676 + k * 18, 304); g.lineTo(670 + k * 18, 250); g.stroke(); }
    // bûches du feu de camp (les flammes sont des particules animées)
    g.fillStyle = '#4a2a14';
    g.save(); g.translate(760, GY + 150); g.rotate(0.3); g.fillRect(-22, -4, 44, 8); g.rotate(-0.6); g.fillRect(-22, -4, 44, 8); g.restore();
    for (let k = 0; k < 8; k++) { const a = k / 8 * TAU; g.fillStyle = '#6a6460'; g.beginPath(); g.arc(760 + Math.cos(a) * 26, GY + 152 + Math.sin(a) * 8, 5, 0, TAU); g.fill(); }
  },
  forest(sk, fa, mi, g, r, fw, mw, gw) {
    sk.fillStyle = vgrad(sk, 0, GY, ['#5aa4e0', '#9fd2f2', '#d9f0f8']); sk.fillRect(0, 0, W, GY + 40);
    glowCircle(sk, 770, 70, 70, ['rgba(255,255,230,1)', 'rgba(255,250,200,0.5)', 'rgba(255,250,200,0)']);
    for (let i = 0; i < 6; i++) cloud(sk, r() * W, 30 + r() * 110, 0.7 + r() * 0.7, 'rgba(255,255,255,0.8)');
    hills(fa, fw, GY - 30, 150, '#8cb8a6', r, 0.003); hills(fa, fw, GY - 5, 110, '#6d9f85', r, 0.005);
    for (let x = -30; x < mw; x += 16 + r() * 26) {
      const h = 70 + r() * 90, base = GY + 4;
      mi.fillStyle = '#4a3020'; mi.fillRect(x - 3, base - h * 0.4, 6, h * 0.4);
      const c = r() < 0.5 ? '#2f6b3a' : '#3e7f47';
      if (r() < 0.55) { mi.fillStyle = c; mi.beginPath(); mi.moveTo(x - 22, base - h * 0.3); mi.lineTo(x, base - h); mi.lineTo(x + 22, base - h * 0.3); mi.fill(); mi.beginPath(); mi.moveTo(x - 18, base - h * 0.55); mi.lineTo(x, base - h * 1.12); mi.lineTo(x + 18, base - h * 0.55); mi.fill(); }
      else { mi.fillStyle = c; for (let k = 0; k < 4; k++) { mi.beginPath(); mi.arc(x + (r() - 0.5) * 26, base - h * 0.55 - r() * h * 0.35, 14 + r() * 10, 0, TAU); mi.fill(); } }
    }
    groundBase(g, gw, ['#3f7a2c', '#5a9a3c', '#4b8a33', '#3a6f27']);
    g.fillStyle = '#9c7d50';
    g.beginPath(); g.moveTo(0, 372); for (let x = 0; x <= gw; x += 30) g.lineTo(x, 372 + Math.sin(x * 0.01) * 8 + r() * 4); for (let x = gw; x >= 0; x -= 30) g.lineTo(x, 432 + Math.sin(x * 0.013) * 8 + r() * 4); g.closePath(); g.fill();
    for (let i = 0; i < gw / 6; i++) { const x = r() * gw, y = GY + r() * (H - GY); g.fillStyle = r() < 0.5 ? 'rgba(30,80,20,0.35)' : 'rgba(150,210,100,0.3)'; g.fillRect(x, y, 2, 5 + r() * 4); }
    for (let i = 0; i < gw / 40; i++) { const x = r() * gw, y = GY + 10 + r() * 190; if (y > 365 && y < 440) continue; g.fillStyle = choose(['#fff176', '#ff8fc0', '#ffffff', '#b39ddb']); g.beginPath(); g.arc(x, y, 2.2, 0, TAU); g.fill(); }
    for (let i = 0; i < gw / 120; i++) { const x = r() * gw, y = 380 + r() * 45; g.fillStyle = '#8a8378'; g.beginPath(); g.ellipse(x, y, 5 + r() * 6, 3 + r() * 2, 0, 0, TAU); g.fill(); }
    for (let x = 0; x < gw; x += 24 + r() * 30) { g.fillStyle = r() < 0.5 ? '#2c6230' : '#357238'; g.beginPath(); g.arc(x, GY - 2, 14 + r() * 12, Math.PI, 0); g.fill(); }
  },
  canyon(sk, fa, mi, g, r, fw, mw, gw) {
    sk.fillStyle = vgrad(sk, 0, GY, ['#e8743c', '#f5a25c', '#ffdca0']); sk.fillRect(0, 0, W, GY + 40);
    glowCircle(sk, 220, 110, 90, ['rgba(255,250,220,1)', 'rgba(255,220,150,0.5)', 'rgba(255,220,150,0)']);
    let x = -40;
    while (x < fw) { const w = 80 + r() * 160, h = 70 + r() * 110; fa.fillStyle = r() < 0.5 ? '#c4643f' : '#b5553a'; fa.fillRect(x, GY - h, w, h + 40); fa.fillStyle = 'rgba(255,200,150,0.25)'; fa.fillRect(x, GY - h, w, 6); x += w + r() * 60; }
    for (let x2 = -20; x2 < mw; x2 += 60 + r() * 120) {
      const w = 26 + r() * 40, h = 90 + r() * 120;
      mi.fillStyle = '#8f3f2a'; mi.beginPath(); mi.moveTo(x2, GY + 4); mi.lineTo(x2 + w * 0.15, GY - h); mi.lineTo(x2 + w * 0.85, GY - h - 6); mi.lineTo(x2 + w, GY + 4); mi.fill();
      mi.fillStyle = 'rgba(255,190,140,0.3)'; mi.fillRect(x2 + w * 0.15, GY - h - 3, w * 0.7, 5);
    }
    groundBase(g, gw, ['#b8743f', '#e0ad74', '#d39a5c', '#c08348']);
    for (let i = 0; i < gw / 25; i++) { const x0 = r() * gw, y0 = GY + 10 + r() * 190; g.strokeStyle = 'rgba(120,70,30,0.35)'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x0 + 10 + r() * 15, y0 + (r() - 0.5) * 6); g.lineTo(x0 + 20 + r() * 15, y0 + (r() - 0.5) * 8); g.stroke(); }
    for (let i = 0; i < gw / 30; i++) { g.fillStyle = 'rgba(140,90,50,0.5)'; g.beginPath(); g.arc(r() * gw, GY + r() * 200, 1.5 + r() * 2, 0, TAU); g.fill(); }
    for (let x3 = 40; x3 < gw; x3 += 200 + r() * 300) {
      const h = 30 + r() * 25; g.strokeStyle = '#3f7a3a'; g.lineCap = 'round'; g.lineWidth = 8;
      g.beginPath(); g.moveTo(x3, GY); g.lineTo(x3, GY - h); g.stroke(); g.lineWidth = 5;
      g.beginPath(); g.moveTo(x3, GY - h * 0.5); g.lineTo(x3 - 9, GY - h * 0.5); g.lineTo(x3 - 9, GY - h * 0.8); g.stroke();
      g.beginPath(); g.moveTo(x3, GY - h * 0.35); g.lineTo(x3 + 9, GY - h * 0.35); g.lineTo(x3 + 9, GY - h * 0.65); g.stroke();
    }
  },
  snow(sk, fa, mi, g, r, fw, mw, gw) {
    sk.fillStyle = vgrad(sk, 0, GY, ['#7f9bc0', '#b4c8de', '#e9f0f8']); sk.fillRect(0, 0, W, GY + 40);
    for (let i = 0; i < 5; i++) cloud(sk, r() * W, 40 + r() * 80, 0.8 + r() * 0.6, 'rgba(240,245,255,0.6)');
    peaks(fa, fw, GY - 10, 120, 220, '#9fb3cc', r, '#f4f8ff');
    peaks(fa, fw, GY + 5, 80, 150, '#8399b5', r, '#e8f0fb');
    for (let x = -30; x < mw; x += 14 + r() * 24) {
      const h = 60 + r() * 80, base = GY + 4;
      mi.fillStyle = '#2d4b3e';
      for (let k = 0; k < 3; k++) { const y = base - h * (0.25 + k * 0.28), w = 22 - k * 5; mi.beginPath(); mi.moveTo(x - w, y + 12); mi.lineTo(x, y - h * 0.3); mi.lineTo(x + w, y + 12); mi.fill(); }
      mi.fillStyle = '#f4f8ff';
      for (let k = 0; k < 3; k++) { const y = base - h * (0.25 + k * 0.28), w = 22 - k * 5; mi.beginPath(); mi.moveTo(x - w * 0.5, y - h * 0.08); mi.lineTo(x, y - h * 0.3); mi.lineTo(x + w * 0.5, y - h * 0.08); mi.fill(); }
    }
    groundBase(g, gw, ['#c9d8ea', '#f1f6fc', '#e2ebf6', '#cfdcec']);
    for (let i = 0; i < gw / 90; i++) { const x = r() * gw, y = GY + 20 + r() * 170; g.fillStyle = 'rgba(160,215,245,0.5)'; g.beginPath(); g.ellipse(x, y, 25 + r() * 40, 6 + r() * 6, 0, 0, TAU); g.fill(); }
    for (let i = 0; i < gw / 15; i++) { g.fillStyle = 'rgba(150,170,210,0.25)'; g.fillRect(r() * gw, GY + r() * 200, 12 + r() * 20, 2); }
    for (let x = 0; x < gw; x += 30 + r() * 40) { g.fillStyle = '#e8f0fb'; g.beginPath(); g.arc(x, GY - 1, 12 + r() * 14, Math.PI, 0); g.fill(); }
  },
  volcano(sk, fa, mi, g, r, fw, mw, gw) {
    sk.fillStyle = vgrad(sk, 0, GY, ['#140404', '#4a120a', '#9a2e12']); sk.fillRect(0, 0, W, GY + 40);
    for (let i = 0; i < 40; i++) { sk.fillStyle = 'rgba(60,40,40,0.35)'; sk.beginPath(); sk.arc(r() * W, r() * 160, 20 + r() * 40, 0, TAU); sk.fill(); }
    let x = -100;
    while (x < fw) {
      const w = 220 + r() * 220, h = 110 + r() * 100, tx = x + w / 2;
      fa.fillStyle = '#2e1410'; fa.beginPath(); fa.moveTo(x, GY + 10); fa.lineTo(tx - 22, GY - h); fa.lineTo(tx + 22, GY - h); fa.lineTo(x + w, GY + 10); fa.fill();
      glowCircle(fa, tx, GY - h, 40, ['rgba(255,200,80,0.9)', 'rgba(255,90,20,0.4)', 'rgba(255,60,0,0)']);
      fa.strokeStyle = '#ff6a1a'; fa.lineWidth = 3; fa.beginPath(); fa.moveTo(tx - 8, GY - h); fa.quadraticCurveTo(tx - 25, GY - h * 0.5, tx - 40, GY); fa.stroke();
      x += w * 0.8;
    }
    for (let x2 = -20; x2 < mw; x2 += 40 + r() * 80) {
      const h = 40 + r() * 90, w = 30 + r() * 50;
      mi.fillStyle = '#1e0f0c'; mi.beginPath(); mi.moveTo(x2, GY + 4); mi.lineTo(x2 + w * 0.3, GY - h); mi.lineTo(x2 + w * 0.6, GY - h * 0.7); mi.lineTo(x2 + w, GY + 4); mi.fill();
      if (r() < 0.3) { mi.fillStyle = 'rgba(255,110,30,0.85)'; mi.fillRect(x2 + w * 0.42, GY - h * 0.75, 4, h * 0.75 + 4); }
    }
    groundBase(g, gw, ['#1a100e', '#3b2b28', '#2e211e', '#1f1513']);
    for (let i = 0; i < gw / 60; i++) {
      let x0 = r() * gw, y0 = GY + 15 + r() * 180;
      g.strokeStyle = 'rgba(255,110,30,0.9)'; g.lineWidth = 2.5; g.beginPath(); g.moveTo(x0, y0);
      for (let k = 0; k < 4; k++) { x0 += 10 + r() * 20; y0 += (r() - 0.5) * 12; g.lineTo(x0, y0); } g.stroke();
      g.strokeStyle = 'rgba(255,220,120,0.6)'; g.lineWidth = 1; g.stroke();
    }
    for (let i = 0; i < gw / 300; i++) { const x0 = r() * gw, y0 = GY + 40 + r() * 140; glowCircle(g, x0, y0, 30, ['rgba(255,200,80,0.9)', 'rgba(255,90,20,0.6)', 'rgba(255,60,0,0)']); }
  },
  citadel(sk, fa, mi, g, r, fw, mw, gw) {
    sk.fillStyle = vgrad(sk, 0, GY, ['#07031a', '#1d0f3c', '#3b1d5e']); sk.fillRect(0, 0, W, GY + 40);
    for (let i = 0; i < 120; i++) { sk.fillStyle = 'rgba(255,255,255,' + (0.3 + r() * 0.7) + ')'; sk.fillRect(r() * W, r() * 240, 1.5, 1.5); }
    glowCircle(sk, 690, 90, 80, ['rgba(240,220,255,1)', 'rgba(200,160,255,0.35)', 'rgba(200,160,255,0)']);
    sk.fillStyle = '#efe4ff'; sk.beginPath(); sk.arc(690, 90, 34, 0, TAU); sk.fill();
    sk.fillStyle = 'rgba(180,150,220,0.5)'; sk.beginPath(); sk.arc(680, 82, 8, 0, TAU); sk.arc(702, 100, 5, 0, TAU); sk.fill();
    let x = -40;
    while (x < fw) {
      const w = 30 + r() * 40, h = 80 + r() * 150;
      fa.fillStyle = '#22133e'; fa.fillRect(x, GY - h, w, h + 40);
      fa.beginPath(); fa.moveTo(x - 6, GY - h); fa.lineTo(x + w / 2, GY - h - 40 - r() * 30); fa.lineTo(x + w + 6, GY - h); fa.fill();
      fa.fillStyle = 'rgba(255,200,120,0.7)'; for (let k = 0; k < 3; k++) if (r() < 0.6) fa.fillRect(x + w / 2 - 2, GY - h + 20 + k * 30, 4, 8);
      x += w + 30 + r() * 120;
    }
    for (let x2 = 0; x2 < mw; x2 += 140) {
      mi.fillStyle = '#2c1c48'; mi.fillRect(x2 + 10, GY - 150, 26, 154);
      mi.fillStyle = '#3a2760'; mi.fillRect(x2 + 6, GY - 160, 34, 14);
      mi.strokeStyle = '#2c1c48'; mi.lineWidth = 12; mi.beginPath(); mi.arc(x2 + 93, GY - 120, 57, Math.PI, 0); mi.stroke();
      glowCircle(mi, x2 + 23, GY - 100, 24, ['rgba(230,170,255,0.9)', 'rgba(170,80,255,0.4)', 'rgba(170,80,255,0)']);
    }
    groundBase(g, gw, ['#2a2140', '#4a4060', '#3d3452', '#2c2540']);
    g.strokeStyle = 'rgba(20,10,35,0.55)'; g.lineWidth = 1.5;
    for (let y = GY + 12, k = 0; y < H; y += 14 + k * 3, k++) { g.beginPath(); g.moveTo(0, y); g.lineTo(gw, y); g.stroke(); }
    for (let x3 = 0; x3 < gw; x3 += 60) { g.beginPath(); g.moveTo(x3, GY); g.lineTo(x3 + (x3 % 120 ? 10 : -10), H); g.stroke(); }
    for (let i = 0; i < gw / 260; i++) {
      const x0 = r() * gw, y0 = GY + 40 + r() * 140;
      g.strokeStyle = 'rgba(190,110,255,0.55)'; g.lineWidth = 2; g.beginPath(); g.ellipse(x0, y0, 26, 9, 0, 0, TAU); g.stroke();
      g.beginPath(); g.moveTo(x0 - 18, y0); g.lineTo(x0 + 18, y0); g.moveTo(x0, y0 - 7); g.lineTo(x0, y0 + 7); g.stroke();
    }
  },
  arena(sk, fa, mi, g, r, fw, mw, gw) {
    sk.fillStyle = vgrad(sk, 0, GY, ['#4b3a8f', '#c2638a', '#ff9a6b', '#ffd59a']); sk.fillRect(0, 0, W, GY + 40);
    glowCircle(sk, 480, GY - 40, 140, ['rgba(255,240,200,1)', 'rgba(255,190,120,0.5)', 'rgba(255,160,100,0)']);
    peaks(fa, fw, GY - 20, 60, 130, '#6a4a8a', r, null);
    peaks(fa, fw, GY, 40, 90, '#55396f', r, null);
    for (let x = 0; x < mw; x += 120) {
      mi.fillStyle = '#7a5a4a'; mi.fillRect(x, GY - 70, 120, 74);
      mi.fillStyle = '#8f6b58'; for (let k = 0; k < 6; k++) mi.fillRect(x + k * 20 + 2, GY - 80, 16, 12);
      mi.strokeStyle = 'rgba(60,40,30,0.5)'; mi.lineWidth = 1; for (let y = GY - 60; y < GY; y += 14) { mi.beginPath(); mi.moveTo(x, y); mi.lineTo(x + 120, y); mi.stroke(); }
      const col = ['#c0392b', '#2e86c1', '#27ae60', '#8e44ad'][(x / 120) % 4 | 0];
      mi.fillStyle = col; mi.beginPath(); mi.moveTo(x + 50, GY - 66); mi.lineTo(x + 70, GY - 66); mi.lineTo(x + 70, GY - 26); mi.lineTo(x + 60, GY - 34); mi.lineTo(x + 50, GY - 26); mi.fill();
    }
    groundBase(g, gw, ['#9a7a5a', '#d8b48a', '#c9a479', '#b08a62']);
    for (let i = 0; i < gw / 8; i++) { g.fillStyle = 'rgba(120,85,55,0.25)'; g.fillRect(r() * gw, GY + r() * 200, 3, 2); }
    g.strokeStyle = 'rgba(255,255,255,0.35)'; g.lineWidth = 3;
    for (let x = 400; x < gw; x += 1400) { g.beginPath(); g.ellipse(x + 300, 400, 260, 70, 0, 0, TAU); g.stroke(); }
  },
};
