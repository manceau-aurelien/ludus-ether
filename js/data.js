'use strict';
// =====================================================================
//  DONNÉES : pouvoirs, combattants, ennemis, étapes et histoire
// =====================================================================
const AN = {
  cast:   [[0, 'castPrep'], [6, 'cast'], [16, 'cast'], [22, 'guard']],
  castUp: [[0, 'crouch'], [6, 'castUp'], [22, 'castUp'], [28, 'guard']],
  throw:  [[0, 'throwPrep'], [7, 'throw'], [16, 'throw'], [22, 'guard']],
  slam:   [[0, 'castUp'], [8, 'slam'], [22, 'slam'], [30, 'guard']],
  upper:  [[0, 'crouch'], [4, 'upper'], [18, 'upper'], [26, 'guard']],
};
const sfx = n => Sound.play(n);

// Téléportation commune (derrière l'ennemi le plus proche)
function teleportBehind(f, g, col) {
  const t = g.nearestEnemy(f, 600);
  g.fx('smoke', f.x, f.y + 35, f.z, 10, { color: col });
  if (t) { f.x = clamp(t.x - t.facing * 40, g.bounds.x0 + 10, g.bounds.x1 - 10); f.z = t.z; f.facing = sign(t.x - f.x) || t.facing; }
  else f.x = clamp(f.x + f.facing * 160, g.bounds.x0 + 10, g.bounds.x1 - 10);
  g.fx('smoke', f.x, f.y + 35, f.z, 10, { color: col });
}

const SP = {};
// ---------------- KAEL — Vent ----------------
SP.windBlade = M({ name: 'Lame de Vent', mp: 50, dur: 22, anim: AN.cast,
  on: { 6: (f, g) => { sfx('wind'); g.shoot(f, { kind: 'wind', speed: 9.5, dmg: 24, fall: 40, kbx: 4, kby: 4, pierce: true, life: 65, r: 16, zr: 16, h: 24, clash: 1 }); } } });
SP.cyclone = M({ name: 'Cyclone Ascendant', mp: 90, dur: 48, untilLand: true, anim: [[0, 'upper']],
  on: { 0: f => { f.vy = 9.5; f.y = 0.5; f.vx = f.facing * 1.5; sfx('wind'); } },
  tick: (f, g, t) => { f.spin = true; if (t % 2 === 0) g.fx('wind', f.x + rand(-22, 22), f.y + rand(0, 70), f.z, 1); },
  hits: [{ from: 1, to: 20, x: [-26, 36], y: [-5, 85], dmg: 8, fall: 10, kbx: 0.5, kby: 8, knock: true, rehit: 6 },
         { from: 21, to: 27, x: [-26, 42], y: [-5, 85], dmg: 14, fall: 80, kbx: 5, kby: 5, knock: true, sfx: 'hitHeavy' }] });
SP.zephyr = M({ name: 'Pas du Zéphyr', mp: 60, dur: 20, keepVel: true, inv: [0, 15], anim: [[0, 'dash']],
  on: { 0: f => { f.vx = f.facing * 15; sfx('wind'); } },
  tick: (f, g, t) => { if (t > 12) f.vx *= 0.7; if (t % 2 === 0) g.after(f, 'rgba(110,240,200,1)'); },
  hits: [{ from: 1, to: 14, x: [-20, 32], y: [5, 75], dmg: 26, fall: 70, kbx: 4, kby: 6, knock: true, sfx: 'hitHeavy' }] });
SP.tornado = M({ name: 'Grande Tornade', mp: 150, dur: 30, anim: AN.cast,
  on: { 8: (f, g) => { sfx('wind'); g.shoot(f, { kind: 'tornado', speed: 3.2, dy: 48, dmg: 7, fall: 12, kbx: 1, kby: 9, knock: true, pierce: true, rehit: 8, life: 130, r: 24, zr: 18, h: 50, clash: 3 }); } } });

// ---------------- BRASIA — Feu ----------------
SP.fireball = M({ name: 'Boule de Feu', mp: 50, dur: 22, anim: AN.cast,
  on: { 6: (f, g) => { sfx('fire'); g.shoot(f, { kind: 'fire', speed: 8.5, dmg: 30, fall: 70, kbx: 5, kby: 6, fx: 'fire', life: 80, r: 14, zr: 14, h: 14, clash: 1 }); } } });
SP.flamePillar = M({ name: 'Colonne Ardente', mp: 100, dur: 30, anim: AN.castUp,
  on: { 6: (f, g) => {
    const t = g.targetAhead(f, 340); const x = t ? t.x : f.x + f.facing * 110, z = t ? t.z : f.z;
    sfx('fire');
    g.spawn({ kind: 'pillar', x, z, y: 50, owner: f, team: f.team, facing: f.facing, stationary: true, delay: 12, life: 34, rehit: 8, pierce: true, dmg: 14, fall: 40, kbx: 1, kby: 10, knock: true, fx: 'fire', r: 22, zr: 18, h: 55,
      onAct: (p, g2) => { sfx('fire'); g2.shakeIt(4); } });
  } } });
SP.comet = M({ name: 'Comète', mp: 80, dur: 24, keepVel: true, anim: [[0, 'dash']],
  on: { 0: f => { f.vx = f.facing * 12; f.vy = 4; f.y = 0.5; sfx('fire'); } },
  tick: (f, g, t) => { g.fx('fire', f.x - f.facing * 10 + rand(-8, 8), f.y + rand(20, 60), f.z, 2); if (t > 16) f.vx *= 0.8; },
  hits: [{ from: 1, to: 18, x: [-10, 34], y: [0, 75], dmg: 34, fall: 80, kbx: 6, kby: 6, knock: true, fx: 'fire', sfx: 'hitHeavy' }] });
SP.emberRain = M({ name: 'Pluie de Braises', mp: 180, dur: 34, anim: AN.castUp,
  on: { 8: (f, g) => {
    sfx('fire');
    for (let i = 0; i < 7; i++) {
      const x = f.x + f.facing * (70 + i * 55);
      g.spawn({ kind: 'meteor', x: x - f.facing * 60, y: 380 + i * 12, z: clamp(f.z + rand(-50, 50), 0, DEPTH), vx: f.facing * 3, vy: -10, owner: f, team: f.team, facing: f.facing,
        delay: i * 5, life: 90, dmg: 20, fall: 60, kbx: 3, kby: 6, fx: 'fire', r: 14, zr: 16, h: 16, groundDie: true, explode: { r: 38, dmg: 22, fall: 70, fx: 'fire' } });
    }
  } } });

// ---------------- NIVALE — Glace ----------------
SP.iceShard = M({ name: 'Éclat de Givre', mp: 45, dur: 22, anim: AN.cast,
  on: { 6: (f, g) => { sfx('ice'); g.shoot(f, { kind: 'ice', speed: 10, dmg: 20, fall: 20, kbx: 2, kby: 3, fx: 'ice', freeze: 80, life: 70, r: 12, zr: 14, h: 12, clash: 1 }); } } });
SP.iceSpikes = M({ name: 'Pics de Glace', mp: 90, dur: 30, anim: AN.slam,
  on: { 8: (f, g) => { sfx('ice'); for (let i = 0; i < 5; i++) g.spawn({ kind: 'spike', x: f.x + f.facing * (55 + i * 40) * (f.look.scale || 1), z: f.z, y: 22, owner: f, team: f.team, facing: f.facing, stationary: true, delay: 1 + i * 4, life: 22, pierce: true, dmg: 22, fall: 70, kbx: 2, kby: 10, knock: true, r: 16, zr: 16, h: 30, onAct: () => sfx('iceS') }); } } });
SP.iceWall = M({ name: 'Mur de Glace', mp: 70, dur: 24, anim: AN.cast,
  on: { 6: (f, g) => { sfx('ice'); g.spawn({ kind: 'iceWall', x: f.x + f.facing * 50, z: f.z, y: 40, owner: f, team: f.team, facing: f.facing, stationary: true, wall: true, life: 220, pierce: true, rehit: 30, dmg: 6, fall: 15, kbx: 5, kby: 2, r: 12, zr: 26, h: 45 }); } } });
SP.glide = M({ name: 'Glissade Polaire', mp: 40, dur: 24, keepVel: true, anim: [[0, 'slide']],
  on: { 0: f => { f.vx = f.facing * 10; sfx('ice'); } },
  tick: (f, g, t) => { f.vx *= 0.95; if (t % 2 === 0) g.fx('ice', f.x, 3, f.z, 1); },
  hits: [{ from: 2, to: 18, x: [0, 38], y: [0, 32], dmg: 18, fall: 20, kbx: 2, kby: 3, fx: 'ice', freeze: 60 }] });

// ---------------- VOLT — Foudre ----------------
SP.arc = M({ name: 'Arc Électrique', mp: 40, dur: 18, anim: [[0, 'castPrep'], [4, 'cast'], [12, 'cast'], [18, 'guard']],
  on: { 4: (f, g) => { sfx('zap'); g.shoot(f, { kind: 'bolt', speed: 16, dmg: 20, fall: 35, kbx: 3, kby: 4, fx: 'shock', life: 40, r: 16, zr: 12, h: 10, clash: 1 }); } } });
SP.judgment = M({ name: 'Jugement Céleste', mp: 120, dur: 34, anim: AN.castUp,
  on: { 8: (f, g) => {
    const ts = g.enemiesOf(f).filter(o => Math.abs(o.x - f.x) < 480).sort((a, b) => Math.abs(a.x - f.x) - Math.abs(b.x - f.x)).slice(0, 3);
    const pts = ts.length ? ts.map(o => ({ x: o.x, z: o.z })) : [{ x: f.x + f.facing * 120, z: f.z }];
    sfx('zap');
    for (const q of pts) g.spawn({ kind: 'lightning', x: q.x, z: q.z, y: 40, owner: f, team: f.team, facing: f.facing, stationary: true, delay: 20, life: 12, pierce: true, unblock: true, dmg: 40, fall: 80, kbx: 2, kby: 8, knock: true, fx: 'shock', r: 18, zr: 18, h: 60, radial: true,
      onAct: (p, g2) => { sfx('thunder'); g2.flashIt(0.35); g2.shakeIt(6); } });
  } } });
SP.flashStep = M({ name: 'Éclair', mp: 50, dur: 14, inv: [0, 13], anim: [[0, 'dash'], [10, 'guard']],
  on: { 2: (f, g) => {
    const x0 = f.x, x1 = clamp(f.x + f.facing * 170, g.bounds.x0 + 10, g.bounds.x1 - 10);
    sfx('zap'); g.after(f, '#fff59a');
    for (const o of g.enemiesOf(f)) if (o.hittable() && Math.abs(o.z - f.z) < 18 && (o.x - x0) * (o.x - x1) <= 0) g.hit(f, o, { dmg: 24, fall: 60, kbx: 3, kby: 5, fx: 'shock' }, f.facing);
    for (let i = 0; i < 8; i++) g.fx('elec', lerp(x0, x1, i / 8), f.y + 40, f.z, 1);
    f.x = x1;
  } } });
SP.staticField = M({ name: 'Champ Statique', mp: 100, dur: 30, anim: [[0, 'crouch'], [4, 'castUp'], [26, 'castUp'], [30, 'guard']],
  on: { 4: (f, g) => { sfx('zap'); g.spawn({ kind: 'static', owner: f, team: f.team, follow: true, fdx: 0, fdy: 35, x: f.x, z: f.z, y: f.y + 35, stationary: true, life: 28, pierce: true, rehit: 7, dmg: 10, fall: 24, kbx: 3, kby: 5, fx: 'shock', r: 58, zr: 34, h: 50, radial: true }); } } });

// ---------------- BORAK — Terre ----------------
SP.boulder = M({ name: 'Rocher', mp: 60, dur: 26, anim: [[0, 'throwPrep'], [9, 'throw'], [20, 'throw'], [26, 'guard']],
  on: { 2: () => sfx('earth'), 9: (f, g) => { sfx('throw'); g.shoot(f, { kind: 'rock', speed: 7.5, vy: 5, grav: 0.4, dy: 80, dmg: 46, fall: 90, kbx: 6, kby: 6, life: 120, r: 18, zr: 18, h: 18, clash: 2 }); } } });
SP.quake = M({ name: 'Séisme', mp: 110, dur: 32, anim: AN.slam,
  on: { 8: (f, g) => { sfx('earth'); g.shakeIt(8); for (const d of [-1, 1]) g.spawn({ kind: 'shock', x: f.x + d * 20, z: f.z, y: 8, vx: d * 7, owner: f, team: f.team, facing: d, life: 50, pierce: true, dmg: 30, fall: 80, kbx: 3, kby: 9, knock: true, groundOnly: true, r: 18, zr: 26, h: 14 }); } } });
SP.rockSpike = M({ name: 'Pic de Roche', mp: 80, dur: 28, anim: AN.slam,
  on: { 8: (f, g) => { sfx('earth'); g.spawn({ kind: 'rockSpike', x: f.x + f.facing * 75 * (f.look.scale || 1), z: f.z, y: 25, owner: f, team: f.team, facing: f.facing, stationary: true, delay: 6, life: 26, pierce: true, dmg: 38, fall: 90, kbx: 2, kby: 12, knock: true, r: 20, zr: 18, h: 35, onAct: (p, g2) => { sfx('earth'); g2.shakeIt(4); } }); } } });
SP.bullCharge = M({ name: 'Charge du Taureau', mp: 70, dur: 28, armor: true, keepVel: true, anim: [[0, 'dash']],
  on: { 0: f => { f.vx = f.facing * 9; sfx('earth'); } },
  tick: (f, g, t) => { if (t % 4 === 0) g.fx('dust', f.x - f.facing * 10, 3, f.z, 1, { color: g.dustColor }); if (t > 22) f.vx *= 0.7; },
  hits: [{ from: 2, to: 24, x: [0, 38], y: [5, 80], dmg: 32, fall: 80, kbx: 7, kby: 5, knock: true, sfx: 'hitHeavy' }] });

// ---------------- NYX — Ombre ----------------
SP.voidOrb = M({ name: 'Orbe du Néant', mp: 60, dur: 24, anim: AN.cast,
  on: { 7: (f, g) => { sfx('dark'); g.shoot(f, { kind: 'void', speed: 4.5, homing: 0.06, dmg: 32, fall: 70, kbx: 4, kby: 6, life: 150, r: 15, zr: 15, h: 15, clash: 2 }); } } });
SP.shadowStep = M({ name: "Pas de l'Ombre", mp: 40, dur: 14, inv: [0, 13], anim: [[0, 'crouch'], [6, 'guard']],
  on: { 2: (f, g) => { sfx('dark'); teleportBehind(f, g, '#3a1a5a'); } } });
SP.scythe = M({ name: 'Faux Spectrale', mp: 70, dur: 26, anim: AN.upper,
  on: { 3: (f, g) => { sfx('slash'); g.fx('slash', f.x + f.facing * 30, f.y + 45, f.z + 1, 1, { facing: f.facing, color: '#b46bff', size: 46 }); } },
  hits: [{ from: 4, to: 9, x: [0, 62], y: [0, 95], dmg: 38, fall: 90, kbx: 2, kby: 11, knock: true, sfx: 'hitHeavy' }] });
SP.shadowClone = M({ name: 'Double Ténébreux', mp: 200, dur: 30, anim: AN.castUp,
  check: (f, g) => !f.clone && !g.fighters.some(o => o.cloneOf === f && o.alive),
  on: { 10: (f, g) => {
    sfx('dark');
    const c = g.spawnFighter(f.def, { x: f.x - f.facing * 34, z: f.z, team: f.team, facing: f.facing, ai: 0.7, hpMul: 0.35, life: 720, clone: true, mp: 150, ally: false,
      perks: f.perks, atkMul: f.atkMul / (f.def.atk || 1), mpMax: f.mpMax, mpRegen: f.mpRegen });
    if (f.hpMax) { c.hpMax = c.hp = c.hpCap = Math.round(f.hpMax * 0.35); }
    c.cloneOf = f; g.fx('smoke', c.x, 35, c.z, 12, { color: '#2a1640' });
  } } });

// ---------------- LYRA — Nature ----------------
SP.vines = M({ name: 'Lianes Étreignantes', mp: 50, dur: 24, anim: AN.slam,
  on: { 8: (f, g) => { sfx('nature'); g.shoot(f, { kind: 'vine', speed: 7, dy: 8, dmg: 16, fall: 0, kbx: 0, stun: 75, fx: 'root', life: 55, pierce: true, groundOnly: true, r: 14, zr: 14, h: 14 }); } } });
SP.bloom = M({ name: 'Floraison Épineuse', mp: 80, dur: 26, anim: AN.castUp,
  on: { 6: (f, g) => { sfx('nature'); g.spawn({ kind: 'bloom', owner: f, team: f.team, x: f.x, z: f.z, y: f.y + 30, follow: true, fdx: 0, fdy: 30, stationary: true, life: 16, pierce: true, radial: true, dmg: 26, fall: 75, kbx: 4, kby: 8, knock: true, r: 62, zr: 36, h: 40 }); } } });
SP.blessing = M({ name: 'Bénédiction', mp: 150, dur: 34, anim: AN.castUp,
  on: { 10: (f, g) => {
    sfx('heal');
    for (const o of g.fighters) if (o.team === f.team && o.alive && Math.abs(o.x - f.x) < 300) {
      o.healPool += 130; o.hpCap = Math.min(o.hpMax, o.hpCap + 90); g.fx('heal', o.x, o.y + 40, o.z, 14);
    }
    g.fx('ring', f.x, 5, f.z, 1, { color: '#7dff9a', size: 60 });
  } } });
SP.seedBomb = M({ name: 'Graine Explosive', mp: 60, dur: 22, anim: AN.throw,
  on: { 7: (f, g) => { sfx('throw'); g.shoot(f, { kind: 'seed', speed: 6.5, vy: 7, grav: 0.45, dy: 55, dmg: 12, fall: 20, life: 120, r: 10, zr: 14, h: 10, explode: { r: 46, dmg: 36, fall: 80, kbx: 4, kby: 7, kind: 'petalBurst', sfx: 'nature' } }); } } });

// ---------------- TEKK — Technologie ----------------
SP.rocket = M({ name: 'Roquette Chercheuse', mp: 60, dur: 22, anim: AN.cast,
  on: { 6: (f, g) => { sfx('rocket'); g.shoot(f, { kind: 'rocket', speed: 4, accel: 0.3, maxSpeed: 10, homing: 0.07, dmg: 10, fall: 30, life: 110, r: 12, zr: 12, h: 10, clash: 1, explode: { r: 42, dmg: 30, fall: 80, kbx: 4, kby: 7 } }); } } });
SP.laser = M({ name: 'Rayon Laser', mp: 100, dur: 36, anim: [[0, 'castPrep'], [6, 'cast'], [32, 'cast'], [36, 'guard']],
  on: { 6: (f, g) => { sfx('laser'); g.spawn({ kind: 'beam', owner: f, team: f.team, follow: true, endWithOwner: true, fdx: 222, fdy: 44, x: f.x + f.facing * 222, z: f.z, y: f.y + 44, stationary: true, life: 26, pierce: true, rehit: 6, dmg: 10, fall: 22, kbx: 2, kby: 4, r: 200, zr: 10, h: 9, clash: 4 }); } } });
SP.mine = M({ name: 'Mine', mp: 50, dur: 18, anim: [[0, 'crouch'], [14, 'crouch'], [18, 'guard']],
  check: (f, g) => g.projs.filter(p => p.kind === 'mine' && p.owner === f && !p.dead).length < 3,
  on: { 8: (f, g) => { sfx('click'); g.spawn({ kind: 'mine', owner: f, team: f.team, x: f.x + f.facing * 20, z: f.z, y: 3, stationary: true, life: 1200, noHit: true, trigger: 34, arm: 30, explode: { r: 52, dmg: 40, fall: 85, kbx: 5, kby: 8 }, noExplodeOnExpire: false }); } } });
SP.jetpack = M({ name: 'Propulseur', mp: 50, dur: 8, keepVel: true, allowAirAtk: true, anim: [[0, 'jump']],
  on: { 0: f => { f.vy = 11; f.y = 0.5; f.vx = f.facing * 8; sfx('rocket'); } },
  tick: (f, g) => { g.fx('fire', f.x - f.facing * 6, f.y + 18, f.z, 2); } });

// ---------------- Ennemis ----------------
SP.arrow = M({ name: 'Flèche', mp: 25, dur: 28, anim: [[0, 'cast'], [10, 'cast'], [14, 'castPrep'], [28, 'guard']],
  on: { 12: (f, g) => { sfx('bow'); g.shoot(f, { kind: 'arrow', speed: 11, dmg: 16, fall: 30, kbx: 3, kby: 3, life: 80, r: 12, zr: 10, h: 6 }); } } });
SP.lunge = M({ name: 'Estocade', mp: 40, dur: 24, keepVel: true, anim: [[0, 'punchPrep'], [5, 'punch'], [20, 'punch'], [24, 'guard']],
  on: { 5: f => { f.vx = f.facing * 8; sfx('whoosh'); } }, tick: f => { f.vx *= 0.9; },
  hits: [{ from: 5, to: 14, x: [0, 62], y: [30, 62], dmg: 22, fall: 70, kbx: 5, kby: 5, knock: true, sfx: 'hitHeavy' }] });
SP.darkBolt = M({ name: 'Trait Sombre', mp: 40, dur: 24, anim: AN.cast,
  on: { 7: (f, g) => { sfx('dark'); g.shoot(f, { kind: 'void', speed: 7, dmg: 18, fall: 40, kbx: 3, kby: 4, life: 80, r: 10, zr: 12, h: 11, clash: 1 }); } } });
SP.frostBolt = M({ name: 'Trait de Givre', mp: 45, dur: 24, anim: AN.cast,
  on: { 7: (f, g) => { sfx('ice'); g.shoot(f, { kind: 'ice', speed: 8, dmg: 14, fall: 20, kbx: 2, kby: 3, fx: 'ice', freeze: 50, life: 80, r: 11, zr: 12, h: 11, clash: 1 }); } } });
SP.fireBolt = M({ name: 'Trait de Feu', mp: 45, dur: 24, anim: AN.cast,
  on: { 7: (f, g) => { sfx('fire'); g.shoot(f, { kind: 'fire', speed: 7.5, dmg: 20, fall: 60, kbx: 4, kby: 5, fx: 'fire', life: 80, r: 10, zr: 12, h: 11, clash: 1 }); } } });
SP.clubSlam = M({ name: 'Coup de Massue', mp: 80, dur: 36, armor: true, anim: AN.slam,
  on: { 10: (f, g) => { sfx('earth'); g.shakeIt(8); g.spawn({ kind: 'shock', x: f.x + f.facing * 40, z: f.z, y: 8, vx: f.facing * 7.5, owner: f, team: f.team, facing: f.facing, life: 55, pierce: true, dmg: 28, fall: 80, kbx: 3, kby: 9, knock: true, groundOnly: true, r: 20, zr: 28, h: 14 }); } },
  hits: [{ from: 9, to: 12, x: [0, 72], y: [0, 60], dmg: 28, fall: 80, kbx: 5, kby: 6, knock: true, sfx: 'hitHeavy' }] });
SP.knives = M({ name: 'Lames Jumelles', mp: 50, dur: 20, anim: AN.throw,
  on: { 7: (f, g) => { sfx('throw'); for (const vz of [-1.3, 0, 1.3]) g.shoot(f, { kind: 'knife', speed: 11, vz, dmg: 14, fall: 30, kbx: 3, kby: 3, life: 60, r: 10, zr: 10, h: 6 }); } } });
SP.smoke = M({ name: 'Écran de Fumée', mp: 50, dur: 14, inv: [0, 13], anim: [[0, 'crouch'], [6, 'guard']],
  on: { 2: (f, g) => { sfx('whoosh'); teleportBehind(f, g, '#777777'); } } });
SP.flurry = M({ name: 'Danse des Lames', mp: 60, dur: 32, keepVel: true,
  anim: [[0, 'punchPrep'], [3, 'punch'], [7, 'punch2'], [11, 'punch'], [15, 'punch2'], [19, 'punch'], [23, 'swingPrep'], [26, 'swing'], [32, 'guard']],
  on: { 0: f => { f.vx = f.facing * 4; sfx('slash'); } }, tick: f => { f.vx *= 0.93; },
  hits: [{ from: 3, to: 22, x: [0, 46], y: [25, 70], dmg: 7, fall: 10, kbx: 1, stun: 12, rehit: 4, nodizzy: true },
         { from: 26, to: 28, x: [0, 50], y: [20, 70], dmg: 16, fall: 80, kbx: 5, kby: 6, knock: true, sfx: 'hitHeavy' }] });
SP.frostBreath = M({ name: 'Souffle Glacial', mp: 90, dur: 44, anim: [[0, 'castPrep'], [8, 'cast'], [38, 'cast'], [44, 'guard']],
  tick: (f, g, t) => {
    if (t === 8) sfx('wind');
    if (t >= 8 && t <= 36 && t % 3 === 0) g.shoot(f, { kind: 'breath', speed: 7 + rand(0, 2), vz: rand(-0.8, 0.8), dy: 62 * (f.look.scale || 1), dx: 30 * (f.look.scale || 1), dmg: 6, fall: 12, fx: 'ice', freeze: 45, life: 30, r: 14, zr: 14, h: 14 });
  } });
SP.bigFire = M({ name: 'Brasier', mp: 70, dur: 26, anim: AN.cast,
  on: { 8: (f, g) => { sfx('fire'); g.shoot(f, { kind: 'fire', speed: 7, dy: 60, dx: 40, dmg: 40, fall: 80, kbx: 6, kby: 7, fx: 'fire', life: 90, r: 22, zr: 18, h: 20, clash: 2 }); } } });
SP.magmaQuake = M({ name: 'Faille de Magma', mp: 110, dur: 34, armor: true, anim: AN.slam,
  on: { 9: (f, g) => { sfx('earth'); sfx('fire'); g.shakeIt(8); for (const d of [-1, 1]) g.spawn({ kind: 'shock', fx: 'fire', x: f.x + d * 30, z: f.z, y: 8, vx: d * 7, owner: f, team: f.team, facing: d, life: 55, pierce: true, dmg: 30, fall: 80, kbx: 3, kby: 9, knock: true, groundOnly: true, r: 20, zr: 30, h: 14 }); } } });
SP.voidTriple = M({ name: 'Triade du Néant', mp: 90, dur: 26, anim: AN.cast,
  on: { 8: (f, g) => { sfx('dark'); for (const vz of [-1.5, 0, 1.5]) g.shoot(f, { kind: 'void', speed: 5, vz, dx: 34, dy: 50, homing: 0.025, dmg: 24, fall: 60, kbx: 4, kby: 5, life: 130, r: 14, zr: 14, h: 14, clash: 2 }); } } });
SP.summon = M({ name: 'Invocation', mp: 150, dur: 36, anim: AN.castUp,
  check: (f, g) => g.fighters.filter(o => o.summonOf === f && o.alive).length < 3,
  on: { 12: (f, g) => {
    sfx('dark');
    for (const d of [-1, 1]) {
      const s = g.spawnFighter(CHARS.ombre, { x: clamp(f.x + d * 70, g.bounds.x0 + 20, g.bounds.x1 - 20), z: clamp(f.z + d * 30, 0, DEPTH), team: f.team, ai: 0.4, facing: -d, mp: 100 });
      s.summonOf = f; g.fx('smoke', s.x, 35, s.z, 12, { color: '#2a1640' });
    }
  } } });
SP.voidTeleport = M({ name: 'Passage du Néant', mp: 60, dur: 16, inv: [0, 15], anim: [[0, 'castUp'], [8, 'guard']],
  on: { 3: (f, g) => { sfx('dark'); teleportBehind(f, g, '#5a1a9a'); } } });
SP.darkStorm = M({ name: 'Foudre du Néant', mp: 130, dur: 36, anim: AN.castUp,
  on: { 8: (f, g) => {
    sfx('dark');
    const ts = g.enemiesOf(f).filter(o => Math.abs(o.x - f.x) < 600);
    const pts = ts.map(o => ({ x: o.x, z: o.z }));
    for (let i = 0; i < 2; i++) pts.push({ x: f.x + f.facing * rand(80, 360), z: rand(10, DEPTH - 10) });
    for (const q of pts) g.spawn({ kind: 'darkLightning', x: q.x, z: q.z, y: 40, owner: f, team: f.team, facing: f.facing, stationary: true, delay: 24, life: 12, pierce: true, unblock: true, dmg: 36, fall: 80, kbx: 2, kby: 8, knock: true, r: 20, zr: 18, h: 60, radial: true,
      onAct: (p, g2) => { sfx('thunder'); g2.shakeIt(5); } });
  } } });
SP.nova = M({ name: 'Nova du Néant', mp: 200, dur: 40, armor: true, anim: AN.castUp,
  on: { 4: f => f.inv = 0, 12: (f, g) => { sfx('explosion'); g.flashIt(0.5); g.shakeIt(10); g.spawn({ kind: 'nova', owner: f, team: f.team, x: f.x, z: f.z, y: 40, stationary: true, life: 20, pierce: true, radial: true, dmg: 40, fall: 90, kbx: 7, kby: 8, knock: true, r: 130, zr: 80, h: 70 }); } } });

// =====================================================================
//  COMBATTANTS
// =====================================================================
const CHARS = {};
function defChar(o) {
  const d = Object.assign({ hp: 500, walk: 3.3, run: 7.2, zwalk: 2.3, jump: 11.5, atk: 1, def: 1, reach: 0, specials: {}, color: '#456', element: '' }, o);
  d.look = Object.assign({ scale: 1, build: 'normal', acc: [], hair: 'short', skin: '#e8c09a', hairC: '#333', top: '#555', bottom: '#333', accent: '#aaa', shoe: '#2a2a2a' }, o.look);
  d.ai = Object.assign({ style: 'melee', sp: [], skill: 0.5 }, o.ai);
  CHARS[d.id] = d;
  return d;
}

// ---------------- Les Gardiens (jouables) ----------------
defChar({ id: 'kael', name: 'Kael', title: 'Lame du Vent', element: 'Vent', color: '#2f8f7f',
  desc: 'Un épéiste nomade aussi rapide que la brise. Ses lames d\'air traversent les rangs ennemis.',
  quote: 'Le vent tourne, Morvath. Et il souffle contre toi.',
  walk: 3.6, run: 7.8,
  look: { skin: '#f1c9a5', hair: 'spiky', hairC: '#2f8f7f', top: '#e8f4ef', bottom: '#2a4d5c', accent: '#3fd1b0', shoe: '#2c2c34', acc: ['scarf'] },
  specials: { 'D>A': SP.windBlade, 'D^A': SP.cyclone, 'D>J': SP.zephyr, 'DvA': SP.tornado },
  ai: { sp: [{ c: 'D>A', r: [100, 520], z: 14, p: 0.18 }, { c: 'D^A', r: [0, 40], z: 12, p: 0.15 }, { c: 'D>J', r: [60, 200], z: 10, p: 0.1 }, { c: 'DvA', r: [100, 400], z: 18, p: 0.05 }] } });

defChar({ id: 'brasia', name: 'Brasia', title: 'Cœur de Braise', element: 'Feu', color: '#b8281e',
  desc: 'Une combattante au tempérament volcanique. Ses flammes embrasent et projettent au sol.',
  quote: 'Je vais réduire ta Légion en cendres. Ça tombe bien, elle en porte déjà le nom.',
  look: { skin: '#e8b48a', hair: 'ponytail', hairC: '#d8402a', top: '#b8281e', bottom: '#3a2a25', accent: '#ffb22e', shoe: '#3a1a10', acc: ['headband'] },
  specials: { 'D>A': SP.fireball, 'D^A': SP.flamePillar, 'D>J': SP.comet, 'DvA': SP.emberRain },
  ai: { sp: [{ c: 'D>A', r: [100, 500], z: 14, p: 0.2 }, { c: 'D^A', r: [60, 320], z: 40, p: 0.1 }, { c: 'D>J', r: [50, 180], z: 10, p: 0.1 }, { c: 'DvA', r: [80, 400], z: 60, p: 0.04 }] } });

defChar({ id: 'nivale', name: 'Nivale', title: 'Sœur du Givre', element: 'Glace', color: '#2c6ea8',
  desc: 'Une prêtresse des glaciers éternels. Elle fige ses ennemis avant de les briser.',
  quote: 'Le froid n\'est pas cruel. Il est patient. Comme moi.',
  look: { skin: '#f3dccd', hair: 'long', hairC: '#dff4ff', top: '#5aa8e0', bottom: '#e8f3fb', accent: '#bfe9ff', shoe: '#5a7a9a', acc: ['cape', 'shoulder'], cape: '#2c6ea8' },
  specials: { 'D>A': SP.iceShard, 'D^A': SP.iceSpikes, 'DvJ': SP.iceWall, 'D>J': SP.glide },
  ai: { sp: [{ c: 'D>A', r: [90, 500], z: 14, p: 0.2 }, { c: 'D^A', r: [50, 230], z: 14, p: 0.12 }, { c: 'DvJ', r: [0, 250], z: 30, p: 0.03 }, { c: 'D>J', r: [40, 150], z: 10, p: 0.1 }] } });

defChar({ id: 'volt', name: 'Volt', title: 'Fils de l\'Orage', element: 'Foudre', color: '#5b3fa0',
  desc: 'Un inventeur frappé par la foudre, devenu foudre lui-même. Vif, imprévisible, dévastateur.',
  quote: 'Prépare-toi, Morvath. Je suis le coup de tonnerre que tu n\'as pas vu venir.',
  walk: 3.5, run: 7.6,
  look: { skin: '#d9a77e', hair: 'wild', hairC: '#ffe14a', top: '#3b2b6b', bottom: '#222230', accent: '#ffe14a', shoe: '#ffe14a', acc: ['goggles'] },
  specials: { 'D>A': SP.arc, 'D^A': SP.judgment, 'D>J': SP.flashStep, 'DvA': SP.staticField },
  ai: { sp: [{ c: 'D>A', r: [90, 600], z: 12, p: 0.25 }, { c: 'D^A', r: [0, 480], z: 999, p: 0.07 }, { c: 'D>J', r: [80, 170], z: 14, p: 0.08 }, { c: 'DvA', r: [0, 55], z: 30, p: 0.12 }] } });

defChar({ id: 'borak', name: 'Borak', title: 'Poing de Granit', element: 'Terre', color: '#7a5a34',
  desc: 'Un colosse des montagnes, lent mais inébranlable. Chaque coup fait trembler le sol.',
  quote: 'Les montagnes ne reculent pas. Moi non plus.',
  hp: 600, walk: 2.8, run: 6.2, jump: 10.5, atk: 1.25, def: 0.9,
  look: { skin: '#b07a4f', hair: 'bald', hairC: '#3a2614', top: '#7a5a34', bottom: '#4a3a2a', accent: '#6fbf4a', shoe: '#2a2018', acc: ['beard', 'shoulder', 'headband'], build: 'big', scale: 1.12, sleeveless: true, beard: '#3a2614' },
  specials: { 'D>A': SP.boulder, 'DvA': SP.quake, 'D^A': SP.rockSpike, 'D>J': SP.bullCharge },
  ai: { sp: [{ c: 'D>A', r: [120, 450], z: 14, p: 0.15 }, { c: 'DvA', r: [0, 400], z: 26, p: 0.08 }, { c: 'D^A', r: [55, 95], z: 16, p: 0.12 }, { c: 'D>J', r: [60, 250], z: 12, p: 0.1 }] } });

defChar({ id: 'nyx', name: 'Nyx', title: 'Murmure de l\'Ombre', element: 'Ombre', color: '#3a1a5a',
  desc: 'Une assassine qui a renié le Néant. Elle frappe dans le dos et invoque son double.',
  quote: 'J\'ai servi le Néant autrefois. Je sais exactement où frapper.',
  walk: 3.6, run: 8,
  look: { skin: '#d6c3d9', hair: 'hood', hairC: '#2a1640', hood: '#3a1a5a', top: '#1d1426', bottom: '#241a30', accent: '#9b4dff', shoe: '#120a1a', acc: ['mask', 'cape'], cape: '#2a1640', eye: '#c08bff' },
  specials: { 'D>A': SP.voidOrb, 'D>J': SP.shadowStep, 'D^A': SP.scythe, 'DvJ': SP.shadowClone },
  ai: { sp: [{ c: 'D>A', r: [120, 500], z: 30, p: 0.15 }, { c: 'D>J', r: [150, 500], z: 999, p: 0.06 }, { c: 'D^A', r: [0, 55], z: 12, p: 0.15 }, { c: 'DvJ', r: [0, 600], z: 999, p: 0.03 }] } });

defChar({ id: 'lyra', name: 'Lyra', title: 'Gardienne Sylvestre', element: 'Nature', color: '#3d8b40',
  desc: 'Une druidesse qui parle aux racines. Elle entrave, soigne ses alliés et fait éclore la forêt.',
  quote: 'Même sur les cendres, la forêt repousse. Toujours.',
  hp: 470,
  look: { skin: '#f0cfa8', hair: 'bun', hairC: '#6b3e1f', top: '#4caf50', bottom: '#f2e6c9', accent: '#ffd84d', shoe: '#5a3a1a', acc: ['robe', 'flower'], robe: '#2e7d32' },
  specials: { 'D>A': SP.vines, 'D^A': SP.bloom, 'DvJ': SP.blessing, 'D>J': SP.seedBomb },
  ai: { sp: [{ c: 'D>A', r: [80, 450], z: 12, p: 0.15 }, { c: 'D^A', r: [0, 55], z: 30, p: 0.15 }, { c: 'DvJ', r: [0, 9999], z: 999, p: 0.1, hp: 0.6 }, { c: 'D>J', r: [120, 350], z: 20, p: 0.1 }] } });

defChar({ id: 'tekk', name: 'Tekk', title: 'L\'Artificier', element: 'Technologie', color: '#c86a1a',
  desc: 'Un mécano de génie équipé d\'un réacteur dorsal. Roquettes, mines et rayons : tout est permis.',
  quote: 'Magie noire contre ingénierie ? J\'ai fait les calculs. Tu perds.',
  look: { skin: '#c58c64', hair: 'mohawk', hairC: '#222222', top: '#e07a1f', bottom: '#5a5f66', accent: '#40e0ff', shoe: '#33363c', acc: ['goggles', 'shoulder'], gloves: '#40444c' },
  specials: { 'D>A': SP.rocket, 'D^A': SP.laser, 'DvA': SP.mine, 'D>J': SP.jetpack },
  ai: { sp: [{ c: 'D>A', r: [120, 600], z: 40, p: 0.15 }, { c: 'D^A', r: [80, 420], z: 8, p: 0.1 }, { c: 'DvA', r: [0, 80], z: 30, p: 0.05 }, { c: 'D>J', r: [100, 250], z: 20, p: 0.03 }] } });

// ---------------- La Légion Cendrée (ennemis) ----------------
defChar({ id: 'bandit', name: 'Pillard', hp: 220, atk: 0.85, walk: 3.0, run: 6.6, color: '#6e5236',
  look: { skin: '#e0b08a', hair: 'short', hairC: '#4a3020', top: '#6e5236', bottom: '#3a3a3a', accent: '#a83232', acc: ['headband'] },
  ai: { skill: 0.3 } });
defChar({ id: 'lancier', name: 'Lancier', hp: 240, atk: 0.9, reach: 26, color: '#8a2222',
  look: { skin: '#d8a880', hair: 'helmet', top: '#8a2222', bottom: '#3d3d3d', accent: '#d04020', acc: ['shoulder'], weapon: 'spear' },
  specials: { 'D>J': SP.lunge }, ai: { skill: 0.35, sp: [{ c: 'D>J', r: [50, 140], z: 10, p: 0.1 }] } });
defChar({ id: 'archer', name: 'Archer', hp: 170, atk: 0.85, color: '#4d5d3a',
  look: { skin: '#e6bc94', hair: 'hood', hood: '#4d5d3a', top: '#5d6d4a', bottom: '#3a3226', accent: '#6b7d4a', weapon: 'bow' },
  specials: { 'D>A': SP.arrow }, ai: { style: 'ranged', dist: 260, skill: 0.4, sp: [{ c: 'D>A', r: [130, 620], z: 12, p: 0.3 }] } });
defChar({ id: 'brute', name: 'Brute', hp: 380, atk: 1.3, walk: 2.5, run: 5.8, color: '#7a2a2a',
  look: { skin: '#c99068', hair: 'bald', top: '#c99068', bottom: '#5a4630', accent: '#7a2a2a', acc: ['beard'], beard: '#4a2a1a', build: 'big', scale: 1.18, sleeveless: true, belt: '#7a2a2a' },
  ai: { skill: 0.35 } });
defChar({ id: 'acolyte', name: 'Acolyte', hp: 190, atk: 0.9, color: '#3c1f5a',
  look: { skin: '#cbb8c8', hair: 'hood', hood: '#3c1f5a', top: '#3c1f5a', bottom: '#2a1540', accent: '#b070ff', acc: ['robe'], robe: '#2a1540', eye: '#d090ff' },
  specials: { 'D>A': SP.darkBolt }, ai: { style: 'ranged', dist: 220, skill: 0.4, sp: [{ c: 'D>A', r: [100, 500], z: 14, p: 0.25 }] } });
defChar({ id: 'givrin', name: 'Cultiste du Givre', hp: 200, atk: 0.9, color: '#6aa0c8',
  look: { skin: '#e2e8f0', hair: 'hood', hood: '#a8d8f0', top: '#6aa0c8', bottom: '#d0ecf8', accent: '#e0f6ff', acc: ['robe'], robe: '#d0ecf8' },
  specials: { 'D>A': SP.frostBolt }, ai: { style: 'ranged', dist: 220, skill: 0.4, sp: [{ c: 'D>A', r: [100, 500], z: 14, p: 0.25 }] } });
defChar({ id: 'pyro', name: 'Pyromancien', hp: 200, atk: 0.9, color: '#a33',
  look: { skin: '#d8a070', hair: 'short', hairC: '#222', top: '#a33', bottom: '#331', accent: '#ff8a00', acc: ['mask'], maskC: '#3a1a10' },
  specials: { 'D>A': SP.fireBolt }, ai: { style: 'ranged', dist: 210, skill: 0.45, sp: [{ c: 'D>A', r: [90, 500], z: 14, p: 0.25 }] } });
defChar({ id: 'chevalier', name: 'Chevalier Cendré', hp: 320, atk: 1.05, def: 0.85, reach: 16, color: '#4a4a55',
  look: { skin: '#d0a07a', hair: 'helmet', helmC: '#5a5a66', top: '#4a4a55', bottom: '#33333a', accent: '#d04020', acc: ['shoulder', 'cape'], cape: '#7a1a10', weapon: 'sword' },
  specials: { 'D>J': SP.lunge }, ai: { skill: 0.5, guard: 0.6, sp: [{ c: 'D>J', r: [50, 140], z: 10, p: 0.12 }] } });
defChar({ id: 'ombre', name: 'Ombre', hp: 120, atk: 0.8, color: '#2a1640',
  look: { skin: '#888', hair: 'wild', hairC: '#444', top: '#444', bottom: '#333', accent: '#9b4dff', shadow: true, shadowC: '#24123a' },
  ai: { skill: 0.35 } });

// ---------------- Boss ----------------
defChar({ id: 'grokk', name: 'Grokk', title: 'Le Broyeur', element: 'Force brute', color: '#8a3a20', boss: true,
  desc: 'Chef des pillards de la Légion. Sa massue a rasé plus de villages qu\'il ne sait compter.',
  quote: 'Grokk écraser tout le monde !',
  hp: 900, atk: 1.3, walk: 2.6, run: 6.4, reach: 18,
  look: { skin: '#c08a5a', hair: 'mohawk', hairC: '#c03020', top: '#5a3a20', bottom: '#4a3a2a', accent: '#c03020', acc: ['beard', 'shoulder'], beard: '#6a2a10', build: 'big', scale: 1.35, sleeveless: true, weapon: 'club' },
  specials: { 'DvA': SP.clubSlam, 'D>J': SP.bullCharge },
  ai: { skill: 0.6, sp: [{ c: 'DvA', r: [0, 220], z: 20, p: 0.12 }, { c: 'D>J', r: [80, 300], z: 14, p: 0.08 }] } });
defChar({ id: 'vipere', name: 'Vipère', title: 'La Lame Silencieuse', element: 'Poison', color: '#1f5a3a', boss: true,
  desc: 'Assassin d\'élite de Morvath. Disparaît dans la fumée et frappe là où on ne l\'attend pas.',
  quote: 'Je ne frappe jamais deux fois... sauf pour finir le travail.',
  hp: 760, atk: 1.1, walk: 4.0, run: 8.6, reach: 6,
  look: { skin: '#e3c09c', hair: 'ponytail', hairC: '#151515', top: '#1f3a2a', bottom: '#14241a', accent: '#5bd16a', acc: ['mask'], build: 'slim', weapon: 'knife', maskC: '#14241a' },
  specials: { 'D>A': SP.knives, 'D>J': SP.smoke, 'D^A': SP.flurry },
  ai: { skill: 0.7, sp: [{ c: 'D>A', r: [120, 500], z: 30, p: 0.15 }, { c: 'D>J', r: [100, 600], z: 999, p: 0.05 }, { c: 'D^A', r: [0, 50], z: 12, p: 0.2 }] } });
defChar({ id: 'hrimgar', name: 'Hrimgar', title: 'Le Titan de Givre', element: 'Glace', color: '#5a7a96', boss: true,
  desc: 'Un géant millénaire réveillé par Morvath. Son souffle transforme les guerriers en statues.',
  quote: 'JE SUIS L\'HIVER QUI NE FINIT JAMAIS.',
  hp: 1100, atk: 1.35, walk: 2.4, run: 5.6, jump: 10, reach: 10, def: 0.85,
  look: { skin: '#a9c8e0', hair: 'wild', hairC: '#f2f8ff', top: '#5a7a96', bottom: '#3a4a5a', accent: '#e0f4ff', acc: ['horns', 'beard', 'shoulder'], beard: '#f2f8ff', build: 'big', scale: 1.5, eye: '#bff4ff', eyeGlow: true },
  specials: { 'D>A': SP.frostBreath, 'D^A': SP.iceSpikes, 'DvA': SP.quake },
  ai: { skill: 0.6, sp: [{ c: 'D>A', r: [60, 260], z: 16, p: 0.12 }, { c: 'D^A', r: [60, 260], z: 14, p: 0.1 }, { c: 'DvA', r: [0, 400], z: 26, p: 0.06 }] } });
defChar({ id: 'ignar', name: 'Ignar', title: 'Le Forgeron Infernal', element: 'Magma', color: '#8a2a0a', boss: true,
  desc: 'Golem de lave qui forge les armes de la Légion. Son marteau fait jaillir le magma.',
  quote: 'LE MÉTAL SE PLIE. LA PIERRE FOND. ET TOI... TU BRÛLERAS.',
  hp: 1150, atk: 1.35, walk: 2.5, run: 5.8, jump: 10, reach: 16, def: 0.85,
  look: { skin: '#3a2a26', hair: 'flame', top: '#2a1d1a', bottom: '#1a1210', accent: '#ff6a1a', build: 'big', scale: 1.45, sleeveless: true, glow: '#ff7a2a', eye: '#ffb030', eyeGlow: true, weapon: 'hammer', acc: ['shoulder'] },
  specials: { 'D>A': SP.bigFire, 'DvA': SP.emberRain, 'D>J': SP.comet, 'D^A': SP.magmaQuake },
  ai: { skill: 0.65, sp: [{ c: 'D>A', r: [100, 500], z: 14, p: 0.15 }, { c: 'DvA', r: [80, 400], z: 60, p: 0.05 }, { c: 'D>J', r: [50, 200], z: 10, p: 0.08 }, { c: 'D^A', r: [0, 300], z: 28, p: 0.08 }] } });
defChar({ id: 'morvath', name: 'Morvath', title: 'Le Dévoreur', element: 'Néant', color: '#3a0f50', boss: true,
  desc: 'Sorcier qui a brisé le Cristal d\'Éther pour en dévorer la puissance. Maître de la Légion Cendrée.',
  quote: 'Le Néant ne pardonne pas. Il dévore.',
  hp: 1600, atk: 1.25, walk: 3.0, run: 6.6, def: 0.85,
  look: { skin: '#bfb0c8', hair: 'hood', hood: '#1a0f26', top: '#2a1840', bottom: '#1a0f26', accent: '#c040ff', acc: ['robe', 'cape', 'crown'], robe: '#1a0f26', cape: '#3a0f50', crownC: '#8a6ad0', eye: '#e070ff', eyeGlow: true, scale: 1.2 },
  specials: { 'D>A': SP.voidTriple, 'DvJ': SP.summon, 'D>J': SP.voidTeleport, 'D^A': SP.darkStorm, 'DvA': SP.nova },
  ai: { skill: 0.7, sp: [{ c: 'D>A', r: [100, 600], z: 50, p: 0.15 }, { c: 'DvJ', r: [0, 9999], z: 999, p: 0.03 }, { c: 'D>J', r: [220, 900], z: 999, p: 0.04 }, { c: 'D^A', r: [0, 600], z: 999, p: 0.06 }, { c: 'DvA', r: [0, 120], z: 60, p: 0.08 }] },
  onUpdate(f, g) {
    if (!f.phase2 && !f.dead && f.hp < f.hpMax * 0.5 && !f.human) {
      f.phase2 = true; f.atkMul *= 1.25; f.mp = f.mpMax; f.inv = 40;
      if (f.ctrl.skill != null) f.ctrl.skill = Math.min(1, f.ctrl.skill + 0.15);
      g.banner('ASSEZ !', 'Contemplez le véritable pouvoir du Néant !', 150, '#e070ff');
      g.flashIt(0.6); g.shakeIt(10); Sound.play('dark');
    }
    if (f.phase2 && !f.dead && f.t % 4 === 0) g.fx('smoke', f.x + rand(-15, 15), f.y + rand(10, f.height), f.z - 1, 1, { color: '#7a30d0' });
  } });

const PLAYABLE = ['kael', 'brasia', 'nivale', 'volt', 'borak', 'nyx', 'lyra', 'tekk'];
const BOSSES = ['grokk', 'vipere', 'hrimgar', 'ignar', 'morvath'];
const DIFF = [
  { name: 'Facile', ai: -0.15, dmg: 0.75, hp: 0.85 },
  { name: 'Normal', ai: 0, dmg: 1, hp: 1 },
  { name: 'Difficile', ai: 0.15, dmg: 1.25, hp: 1.15 },
];

// =====================================================================
//  MODE HISTOIRE
// =====================================================================
const PROLOGUE = [
  { who: 'nar', text: 'Depuis mille ans, le Cristal d\'Éther veille sur l\'équilibre des éléments : le vent, le feu, la glace, la foudre, la terre...' },
  { who: 'nar', text: 'Mais cette nuit, le sorcier Morvath le Dévoreur l\'a brisé en cinq éclats. Sa Légion Cendrée déferle désormais sur les terres libres.' },
  { who: 'nar', text: 'S\'il absorbe le pouvoir des cinq éclats, plus rien ne pourra l\'arrêter. Les Gardiens de l\'Éther doivent les reprendre.' },
  { who: 'hero', text: '@quote' },
];

const STAGES = [
  { name: 'Forêt de Lisière', theme: 'forest', music: 'forest',
    intro: [{ who: 'nar', text: 'Première étape : la Forêt de Lisière. Les pillards de Grokk y mettent les villages à sac... et gardent le premier éclat.' }],
    waves: [
      { e: [['bandit', 3]] },
      { e: [['bandit', 4]], items: ['baton'] },
      { e: [['bandit', 3], ['archer', 2]], items: ['potion', 'caisse'] },
      { e: [['bandit', 2], ['brute', 1], ['bandit', 2]], items: ['pierre'] },
      { boss: true, e: [['grokk', 1], ['bandit', 2]], items: ['potion'],
        pre: [{ who: 'grokk', text: 'Grokk garder éclat brillant ! Petit héros va finir en purée !' }, { who: 'hero', text: 'On verra bien qui finira en purée.' }] },
    ],
    outro: [
      { who: 'grokk', text: 'Grokk... avoir... mal à la tête...' },
      { who: 'hero', text: 'Le premier éclat est à nous. Plus que quatre.' },
      { who: 'nar', text: 'Les traces de la Légion mènent vers l\'est, à travers le Canyon Écarlate.' },
    ] },
  { name: 'Canyon Écarlate', theme: 'canyon', music: 'canyon',
    intro: [{ who: 'nar', text: 'Le Canyon Écarlate. Un seul passage, gardé par les lanciers de la Légion... et par une ombre que nul n\'a jamais vue venir.' }],
    waves: [
      { e: [['lancier', 2], ['bandit', 2]] },
      { e: [['archer', 3], ['bandit', 2]], items: ['pierre', 'pierre'] },
      { e: [['lancier', 3], ['brute', 1]], items: ['potion', 'couteau'] },
      { e: [['bandit', 3], ['archer', 2], ['lancier', 2]] },
      { boss: true, e: [['vipere', 1], ['archer', 2]], items: ['potion'],
        pre: [{ who: 'vipere', text: 'Tu as fait tomber Grokk ? Impressionnant. Mais Grokk se battait avec ses muscles. Moi, je me bats avec ma tête.' }, { who: 'hero', text: 'Alors je viserai la tête.' }] },
    ],
    outro: [
      { who: 'vipere', text: 'Morvath... te dévorera... comme il a dévoré les autres Gardiens...' },
      { who: 'hero', text: 'Les autres Gardiens ? Il en retient donc prisonniers...' },
      { who: 'nar', text: 'Le deuxième éclat récupéré, la route grimpe vers les Pics Gelés, là où la tempête ne s\'arrête jamais.' },
    ] },
  { name: 'Pics Gelés', theme: 'snow', music: 'snow',
    intro: [{ who: 'nar', text: 'Les Pics Gelés. Un froid qui brûle la peau. Et dans la tempête, la silhouette d\'un géant.' }],
    waves: [
      { e: [['givrin', 2], ['bandit', 2]] },
      { e: [['lancier', 3], ['givrin', 2]], items: ['potion'] },
      { e: [['brute', 2], ['archer', 2]], items: ['baton', 'caisse'] },
      { e: [['givrin', 3], ['chevalier', 1], ['bandit', 2]] },
      { boss: true, e: [['hrimgar', 1], ['givrin', 2]], items: ['potion'],
        pre: [{ who: 'hrimgar', text: 'PERSONNE NE FRANCHIT MA MONTAGNE. JE SUIS L\'HIVER QUI NE FINIT JAMAIS.' }, { who: 'hero', text: 'Même l\'hiver finit par fondre.' }] },
    ],
    outro: [
      { who: 'nar', text: 'Le titan s\'effondre dans un fracas de glace. Sous ses pieds, un cachot taillé dans le glacier...' },
      { who: 'nar', text: 'Un Gardien y était enchaîné depuis des semaines. Libéré, il jure de combattre à vos côtés jusqu\'au bout.' },
    ] },
  { name: 'Forge Volcanique', theme: 'volcano', music: 'volcano', ally: true,
    intro: [{ who: 'ally', text: 'Je vous dois la vie. Laissez-moi rendre la monnaie à la Légion !' }, { who: 'nar', text: 'La Forge Volcanique, où Ignar façonne les armes de la Légion dans la lave du cœur du monde.' }],
    waves: [
      { e: [['pyro', 2], ['lancier', 2]] },
      { e: [['brute', 2], ['pyro', 2]], items: ['potion', 'pierre'] },
      { e: [['chevalier', 2], ['archer', 2]], items: ['baton'] },
      { e: [['pyro', 3], ['chevalier', 1], ['brute', 1], ['bandit', 2]], items: ['potion'] },
      { boss: true, e: [['ignar', 1], ['pyro', 2]], items: ['potion'],
        pre: [{ who: 'ignar', text: 'LE MÉTAL SE PLIE. LA PIERRE FOND. ET TOI... TU BRÛLERAS.' }, { who: 'ally', text: 'Ensemble, on peut l\'éteindre !' }] },
    ],
    outro: [
      { who: 'hero', text: 'Le quatrième éclat. Morvath ne peut plus se cacher.' },
      { who: 'nar', text: 'Au-dessus du volcan, un pont de lumière noire mène à la Citadelle du Néant, suspendue au-dessus d\'un gouffre sans fond.' },
    ] },
  { name: 'Citadelle du Néant', theme: 'citadel', music: 'citadel', ally: true,
    intro: [{ who: 'nar', text: 'La Citadelle du Néant. Morvath y attend, le dernier éclat incrusté dans sa poitrine.' }],
    waves: [
      { e: [['acolyte', 3], ['chevalier', 1]] },
      { e: [['chevalier', 2], ['acolyte', 2], ['lancier', 2]], items: ['potion'] },
      { e: [['grokk', 1, { hp: 0.6, boss: true }], ['vipere', 1, { hp: 0.6, boss: true }]], items: ['potion'],
        pre: [{ who: 'morvath', text: 'Mes serviteurs ne meurent que lorsque je le décide. Relevez-vous, et finissez-en !' }, { who: 'grokk', text: 'Grokk... revenu ! Et Grokk toujours fâché !' }] },
      { e: [['acolyte', 3], ['brute', 2], ['chevalier', 2]], items: ['potion', 'baton'] },
      { boss: true, e: [['morvath', 1]], items: ['potion'],
        pre: [{ who: 'morvath', text: 'Gardiens... Vous m\'avez apporté les quatre éclats. Comme c\'est aimable.' }, { who: 'morvath', text: 'Je n\'aurai plus qu\'à les ramasser sur vos cadavres.' }, { who: 'hero', text: 'C\'est fini, Morvath. Rends-nous le dernier éclat.' }] },
    ],
    outro: [
      { who: 'morvath', text: 'Impossible... Le Néant... ne peut pas... être vaincu...' },
    ] },
];

const ENDING = [
  'Morvath s\'effondre, et le dernier éclat se détache de sa poitrine.',
  'Réunis, les cinq éclats reforment le Cristal d\'Éther.',
  'Une lumière pure balaie la Citadelle, qui s\'écroule lentement dans le gouffre.',
  'La Légion Cendrée se disperse. Les villages se relèvent.',
  'Et les Gardiens de l\'Éther rentrent chez eux... en héros.',
  '',
  'Mais tout au fond du Néant, une voix murmure encore...',
  '',
  '— FIN —',
  '',
  'Merci d\'avoir joué à Éclats d\'Éther !',
  'Les boss sont désormais jouables dans tous les modes.',
];
