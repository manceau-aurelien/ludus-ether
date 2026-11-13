'use strict';
// =====================================================================
//  ENTITÉS : combattants, projectiles, objets, particules
// =====================================================================
let _uid = 0;
const BUFF_MOVES = {};   // sorts de renforcement remplaçant certains pouvoirs (définis par le Ludus)

// Fabrique de mouvement (attaque ou pouvoir)
function M(o) {
  const m = Object.assign({ mp: 0, dur: 20, anim: [[0, 'guard']], hits: [] }, o);
  m.hits.forEach((h, i) => { h.k = i; });
  return m;
}

const MOVES = {
  roll: M({ name: 'Roulade', dur: 20, keepVel: true, inv: [0, 16],
    anim: [[0, (f, t) => Object.assign({}, POSES.roll, { rot: t * 19 })]],
    on: { 0: f => { f.vx = f.facing * 7.5; Sound.play('whoosh'); } }, tick: f => { f.vx *= 0.95; } }),
  pickup: M({ name: 'Ramasser', dur: 12, anim: [[0, 'crouch'], [12, 'guard']], on: { 5: (f, g) => f.finishPickup(g) } }),
  drink: M({ name: 'Boire', dur: 36, anim: [[0, 'stand'], [6, 'drink'], [30, 'drink'], [36, 'stand']], on: { 8: (f, g) => f.finishDrink(g) } }),
  swing: M({ name: 'Coup d\'arme', dur: 22, vx: 1, anim: [[0, 'swingPrep'], [7, 'swing'], [15, 'swing'], [22, 'guard']], on: { 5: () => Sound.play('whoosh') },
    hits: [{ from: 7, to: 10, x: [0, 62], y: [10, 80], dmg: 0, weapon: true, fall: 55, kbx: 4, kby: 5, stun: 16, sfx: 'hitHeavy' }] }),
  throwItem: M({ name: 'Lancer', dur: 18, air: true, anim: [[0, 'throwPrep'], [6, 'throw'], [18, 'guard']], on: { 6: (f, g) => f.throwHeld(g) } }),
  grabPunch: M({ name: 'Coup saisi', dur: 14, anim: [[0, 'punchPrep'], [4, 'punch'], [10, 'punch'], [14, 'grab']], on: { 4: (f, g) => f.grabPunchHit(g) } }),
  grabThrow: M({ name: 'Projection', dur: 22, anim: [[0, 'grab'], [4, 'throwPrep'], [10, 'throw'], [22, 'guard']], on: { 10: (f, g) => f.grabThrowRelease(g) } }),
};

// Attaques normales, adaptées au gabarit / à l'arme de chaque personnage
function buildMoves(def) {
  if (def._mv) return def._mv;
  const L = def.look, sc = L.scale || 1, r = def.reach || 0, big = L.build === 'big' ? 2 : 0;
  const armed = ['spear', 'sword', 'club', 'hammer', 'knife', 'staff'].includes(L.weapon);
  const X = (a, b) => [a * sc, b * sc + r], Y = (a, b) => [a * sc, b * sc];
  const sw = () => Sound.play('swish');
  const mv = {
    pA: M({ name: 'Coup A', dur: 14 + big, combo: true, cancel: 5, vx: 1.2,
      anim: [[0, 'punchPrep'], [3 + big, 'punch'], [8 + big, 'punch'], [14 + big, 'guard']], on: { 1: sw },
      hits: [{ from: 3 + big, to: 5 + big, x: X(0, 34), y: Y(32, 64), dmg: 12, fall: 18, kbx: 1.5, stun: 14 }] }),
    pB: M({ name: 'Coup B', dur: 14 + big, combo: true, cancel: 5, vx: 1.2,
      anim: armed ? [[0, 'swingPrep'], [3 + big, 'swing'], [8 + big, 'swing'], [14 + big, 'guard']] : [[0, 'punch2Prep'], [3 + big, 'punch2'], [8 + big, 'punch2'], [14 + big, 'guard']],
      on: { 1: sw }, hits: [{ from: 3 + big, to: 5 + big, x: X(0, 34), y: Y(28, 66), dmg: 13, fall: 18, kbx: 1.5, stun: 14 }] }),
    fin: M({ name: 'Final', dur: 24 + big, vx: 1.6,
      anim: armed ? [[0, 'swingPrep'], [6 + big, 'swing'], [13 + big, 'swing'], [24 + big, 'guard']] : [[0, 'kickPrep'], [6 + big, 'kick'], [13 + big, 'kick'], [24 + big, 'guard']],
      on: { 3: () => Sound.play('whoosh') },
      hits: [{ from: 6 + big, to: 9 + big, x: X(0, 44), y: Y(18, 60), dmg: 22, fall: 80, kbx: 5, kby: 6, knock: true, sfx: 'hitHeavy' }] }),
    runAtk: M({ name: 'Charge', dur: 24, keepVel: true, anim: [[0, 'dash'], [4, armed ? 'swing' : 'punch'], [18, armed ? 'swing' : 'punch'], [24, 'guard']],
      on: { 1: () => Sound.play('whoosh') }, tick: f => { f.vx *= 0.92; },
      hits: [{ from: 3, to: 12, x: X(0, 42), y: Y(22, 66), dmg: 26, fall: 70, kbx: 6, kby: 5, knock: true, sfx: 'hitHeavy' }] }),
    airAtk: M({ name: 'Coup aérien', dur: 70, air: true, untilLand: true, keepVel: true, anim: [[0, 'air'], [3, 'airKick']], on: { 1: sw },
      hits: [{ from: 3, to: 70, x: X(-4, 36), y: Y(0, 45), dmg: 18, fall: 60, kbx: 4, kby: 4 }] }),
    dashAirAtk: M({ name: 'Coup sauté', dur: 70, air: true, untilLand: true, keepVel: true, anim: [[0, 'air'], [3, 'airKick']], on: { 1: sw },
      hits: [{ from: 3, to: 70, x: X(-4, 40), y: Y(0, 50), dmg: 28, fall: 75, kbx: 6, kby: 5, knock: true, sfx: 'hitHeavy' }] }),
  };
  def._mv = mv;
  return mv;
}

const CONTROL_STATES = ['idle', 'walk', 'run', 'defend', 'air'];

class Fighter {
  constructor(def, o = {}) {
    this.id = ++_uid; this.def = def; this.look = def.look; this.moves = buildMoves(def);
    this.name = o.name || def.name;
    this.x = o.x != null ? o.x : 100; this.y = 0; this.z = o.z != null ? o.z : 100;
    this.vx = 0; this.vy = 0; this.vz = 0;
    this.facing = o.facing || 1; this.team = o.team != null ? o.team : 1;
    this.hpMax = Math.round(def.hp * (o.hpMul || 1)); this.hp = this.hpMax; this.hpCap = this.hpMax;
    if (o.hp != null) { this.hpMax = Math.round(o.hp); this.hp = this.hpMax; this.hpCap = this.hpMax; }
    this.mpMax = o.mpMax != null ? o.mpMax : 500; this.mp = Math.min(this.mpMax, o.mp != null ? o.mp : 250);
    this.mpRegen = o.mpRegen != null ? o.mpRegen : null;  // régénération fixe (sinon formule classique)
    this.spd = o.spd || 1;                                  // multiplicateur de vitesse de déplacement
    this.perks = o.perks || null;                           // compétences débloquées (null = tout est permis)
    this.powMul = 1;
    this.ctrl = o.ctrl || new Controller(); this.human = !!o.human; this.pid = o.pid != null ? o.pid : -1;
    this.atkMul = (def.atk || 1) * (o.atkMul || 1); this.defMul = (def.def || 1) * (o.defMul || 1);
    this.boss = !!o.boss; this.ally = !!o.ally; this.clone = !!o.clone;
    this.lifeT = o.life || 0;
    this.state = 'idle'; this.st = 0; this.t = randi(0, 100);
    this.move = null; this.mt = 0; this.hitSet = new Map();
    this.combo = 0; this.comboT = 0; this.comboHits = 0; this.queueAtk = false;
    this.fallAcc = 0; this.bdef = 0; this.inv = 0; this.hitstop = 0; this.flash = 0; this.stun = 0;
    this.burn = 0; this.freeze = 0; this.rooted = 0; this.healPool = 0; this.mpFlash = 0;
    this.hold = null; this.grabV = null; this.grabbedBy = null; this.grabTime = 0; this.grabHits = 0; this.throwDir = 1;
    this.dead = false; this.gone = false; this.deadT = 0;
    this.walkPh = 0; this.airAtk = false; this.bounced = false; this.landed = false; this.impactV = 0; this.dashJ = false;
    this.spin = false; this.armorOn = false; this.thrownBy = null; this.thrownHit = new Set();
    this.height = 72 * (def.look.scale || 1); this.width = 14 * (def.look.scale || 1);
    this.entered = !o.offscreen; this.stats = { dmg: 0, ko: 0 };
    this.hurtAlt = false; this.wantWin = false;
    if (this.ctrl.bind) this.ctrl.bind(this);
  }
  get alive() { return !this.dead && !this.gone; }
  can(k) { return !this.perks || !!this.perks[k]; }
  spLevel(key) { return this.perks ? ((this.perks.sp && this.perks.sp[key]) || 0) : 1; }
  spCost(key, m) { const l = this.spLevel(key); return Math.round(m.mp * (this.perks ? Math.max(0.6, 1 - 0.07 * (l - 1)) : 1)); }
  spPow(key) { const l = this.spLevel(key); return this.perks ? 1 + 0.15 * (l - 1) : 1; }
  hittable() { return !this.dead && !this.gone && this.inv <= 0 && this.state !== 'lie' && this.state !== 'getup' && this.state !== 'dead'; }
  heavy() { return this.hold && this.hold.def.heavy; }
  weaponType() { return this.hold && !this.hold.def.heavy ? this.hold.def.w : this.look.weapon; }
  setState(s) {
    this.state = s; this.st = 0;
    if (s !== 'move') { this.move = null; this.spin = false; this.armorOn = false; }
  }

  // ------------------------------------------------------------------
  update(g) {
    if (this.gone) return;
    if (this.hitstop > 0) { this.hitstop--; return; }
    this.st++; this.t++;
    if (this.inv > 0) this.inv--;
    if (this.flash > 0) this.flash--;
    if (this.mpFlash > 0) this.mpFlash--;
    if (this.comboT > 0) this.comboT--; else { this.combo = 0; this.comboHits = 0; }
    if (this.bdef > 0) this.bdef -= 0.4;
    if (this.rooted > 0) this.rooted--;
    if (!['hurt', 'dizzy', 'frozen', 'grabbed'].includes(this.state)) this.fallAcc = Math.max(0, this.fallAcc - 0.7);
    if (!this.dead) {
      if (this.hp < this.hpCap) this.hp = Math.min(this.hpCap, this.hp + 0.015);
      if (this.mp < this.mpMax) this.mp = Math.min(this.mpMax, this.mp + (this.mpRegen != null ? this.mpRegen : 0.24 + 0.4 * (1 - this.hp / this.hpMax)));
      if (this.healPool > 0) { const h = Math.min(this.healPool, 1.8); this.healPool -= h; this.hp = Math.min(this.hpMax, this.hp + h); this.hpCap = Math.max(this.hpCap, this.hp); }
    }
    if (this.buff) {
      const b = this.buff;
      if (b.tick) b.tick(this, g);
      if (this.t % 7 === 0) g.fx('heal', this.x + rand(-14, 14), this.y + rand(10, this.height), this.z + 1, 1, { color: b.col });
      if (--b.t <= 0 || this.dead) { if (b.undo) b.undo(this); this.buff = null; g.fx('ring', this.x, 4, this.z, 1, { color: '#ffffff', size: 26 }); }
    }
    if (this.burn > 0) { this.burn--; if (this.t % 3 === 0) g.fx('fire', this.x + rand(-8, 8), this.y + rand(10, this.height), this.z + 1, 1); }
    if (this.lifeT > 0 && !this.dead) {
      this.lifeT--;
      if (this.lifeT === 0) { this.dead = true; this.gone = true; this.release(g); this.drop(g); g.fx('smoke', this.x, 35, this.z, 12, { color: '#2a1640' }); return; }
    }
    if (this.def.onUpdate) this.def.onUpdate(this, g);
    this.runState(g);
    this.physics(g);
  }

  ctrlSpecial(g) {
    const c = this.ctrl.special;
    if (!c) return false;
    return this.trySpecial(c, g);
  }

  trySpecial(cmd, g) {
    let key = cmd, face = 0;
    if (cmd[1] === 'L' || cmd[1] === 'R') { face = cmd[1] === 'L' ? -1 : 1; key = 'D>' + cmd[2]; }
    const ov = this.perks && this.perks.buffs && this.perks.buffs[key];
    const m = ov ? BUFF_MOVES[ov] : this.def.specials && this.def.specials[key];
    if (!m) return false;
    if (this.perks && !this.spLevel(key)) return false;
    const inAir = this.y > 0.5;
    if (inAir && !m.air) return false;
    const cost = this.spCost(key, m);
    if (this.mp < cost) { this.mpFlash = 24; Sound.play('nomp'); return true; }
    if (m.check && !m.check(this, g)) return true;
    if (this.hold && this.hold.def.heavy) this.drop(g);
    this.mp -= cost; this.powMul = this.spPow(key); this.castLevel = this.spLevel(key);
    if (face) this.facing = face;
    this.startMove(m);
    return true;
  }

  startMove(m) {
    this.setState('move');
    this.move = m; this.mt = 0; this.hitSet.clear(); this.queueAtk = false;
    if (typeof m.vx === 'number') this.vx = this.facing * m.vx;
    this.armorOn = !!m.armor;
    this.spin = false;
  }

  endMove(g) {
    const m = this.move;
    if (m && m.end) m.end(this, g);
    this.move = null; this.spin = false; this.armorOn = false;
    if (this.grabV && this.grabV.state === 'grabbed' && this.grabV.grabbedBy === this) { this.setState('grab'); return; }
    if (this.y > 0.5) { this.setState('air'); this.airAtk = !(m && m.allowAirAtk); }
    else if (m && m.untilLand) this.setState('land');
    else this.setState('idle');
  }

  updateMove(g) {
    const m = this.move, t = this.mt;
    if (!m) { this.setState('idle'); return; }
    if (m.inv && t >= m.inv[0] && t <= m.inv[1]) this.inv = Math.max(this.inv, 1);
    if (m.on && m.on[t]) m.on[t](this, g);
    if (m.tick) m.tick(this, g, t);
    if (this.state !== 'move' || this.move !== m) return;
    if (m.hits) for (const h of m.hits) if (t >= h.from && t <= h.to) g.melee(this, h);
    if (this.state !== 'move' || this.move !== m) return;
    if (m.combo && t >= 2 && this.ctrl.pressed.attack) this.queueAtk = true;
    if (m.cancel !== undefined && t >= m.cancel && this.ctrl.special) { const mt = this.mt; if (this.trySpecial(this.ctrl.special, g) && this.move !== m) return; this.mt = mt; }
    if (this.y <= 0 && !m.keepVel) { this.vx *= 0.78; this.vz *= 0.6; }
    this.mt++;
    if (this.mt >= m.dur || (m.untilLand && this.landed && this.mt > 2)) {
      if (this.queueAtk && this.y <= 0) { this.queueAtk = false; this.endMove(g); if (this.state === 'idle') this.doAttack(g); return; }
      this.endMove(g);
    }
  }

  runState(g) {
    const c = this.ctrl, S = this.state, d = this.def;
    const dx = (c.held.right ? 1 : 0) - (c.held.left ? 1 : 0), dz = (c.held.down ? 1 : 0) - (c.held.up ? 1 : 0);
    switch (S) {
      case 'idle': case 'walk': {
        if (this.wantWin) { this.setState('win'); this.vx = 0; this.vz = 0; return; }
        if (this.ctrlSpecial(g)) return;
        if (c.pressed.attack) { this.doAttack(g); return; }
        if (c.pressed.jump && this.can('jump')) { this.setState('jumpPrep'); return; }
        if (c.held.defend && !this.heavy()) { this.setState('defend'); this.vx = 0; this.vz = 0; return; }
        if (c.run && !this.heavy() && this.can('run')) { this.facing = c.run; this.setState('run'); return; }
        const sp = (this.heavy() ? 0.7 : 1) * this.spd;
        if (dx) this.facing = dx;
        this.vx = dx * d.walk * sp; this.vz = dz * d.zwalk * sp;
        if (dx || dz) { if (S !== 'walk') this.setState('walk'); this.walkPh += 0.19; }
        else if (S !== 'idle') this.setState('idle');
        if (dx && this.can('grab')) this.tryGrab(g);
        break;
      }
      case 'run': {
        if (this.ctrlSpecial(g)) return;
        this.vx = this.facing * d.run * this.spd; this.vz = dz * d.zwalk * 0.75 * this.spd; this.walkPh += 0.3;
        if (this.t % 7 === 0) g.fx('dust', this.x - this.facing * 8, 2, this.z, 1);
        if (c.pressed.jump) { if (this.can('dashJump')) this.dashJump(); else this.setState('brake'); return; }
        if (c.pressed.attack) {
          if (this.hold && !this.hold.def.heavy) this.startMove(MOVES.throwItem);
          else if (this.can('runAtk')) this.startMove(this.moves.runAtk);
          else this.setState('brake');
          return;
        }
        if (c.pressed.defend) { if (this.can('roll')) this.startMove(MOVES.roll); else this.setState('brake'); return; }
        if ((this.facing > 0 && c.pressed.left) || (this.facing < 0 && c.pressed.right)) { this.setState('brake'); return; }
        break;
      }
      case 'brake': this.vx *= 0.86; if (this.st > 8) this.setState('idle'); break;
      case 'jumpPrep':
        this.vx *= 0.5; this.vz *= 0.5;
        if (this.st >= 3) {
          this.vy = d.jump; this.y = 0.5;
          this.vx = dx * d.walk * 1.35 * this.spd; this.vz = dz * d.zwalk * 1.2 * this.spd;
          if (dx) this.facing = dx;
          this.airAtk = false; this.dashJ = false; this.setState('air'); Sound.play('jump');
        }
        break;
      case 'air': {
        if (this.ctrlSpecial(g)) return;
        if (c.pressed.attack && !this.airAtk) {
          this.airAtk = true;
          if (this.hold) this.startMove(MOVES.throwItem);
          else this.startMove(this.dashJ ? this.moves.dashAirAtk : this.moves.airAtk);
          return;
        }
        if (dx) this.facing = dx;
        break;
      }
      case 'land': this.vx *= 0.6; this.vz *= 0.6; if (this.st >= 5) this.setState('idle'); break;
      case 'defend':
        if (this.ctrlSpecial(g)) return;
        if (dx) this.facing = dx;
        if (!c.held.defend && this.st > 8) this.setState('idle');
        break;
      case 'move': this.updateMove(g); break;
      case 'hurt': if (this.st >= this.stun) this.setState('idle'); break;
      case 'dizzy': if (this.st >= 75) { this.fallAcc = 0; this.setState('idle'); } break;
      case 'frozen':
        this.freeze--;
        if (this.freeze <= 0) { g.fx('ice', this.x, this.y + 40, this.z, 10); Sound.play('shatter'); this.setState('hurt'); this.stun = 8; }
        break;
      case 'fall': this.updateFall(g); break;
      case 'lie':
        if (this.dead) { this.setState('dead'); break; }
        if (this.st >= 45) this.setState('getup');
        break;
      case 'getup': if (this.st >= 14) { this.inv = 30; this.setState('idle'); } break;
      case 'dead': this.deadT++; if (!this.human && !this.keepCorpse && this.deadT > 90) this.gone = true; break;
      case 'grab': this.updateGrab(g, dx); break;
      case 'grabbed': {
        const h = this.grabbedBy;
        if (!h || h.dead || h.gone || h.grabV !== this || (h.state !== 'grab' && h.state !== 'move')) {
          this.grabbedBy = null; if (h && h.grabV === this) h.grabV = null;
          this.setState('hurt'); this.stun = 10; break;
        }
        this.x = h.x + h.facing * 26 * (h.look.scale || 1); this.z = h.z + 0.5; this.y = 0; this.vx = 0; this.vz = 0; this.vy = 0; this.facing = -h.facing;
        break;
      }
      case 'win': this.vx = 0; this.vz = 0; break;
    }
  }

  dashJump() {
    const d = this.def;
    this.vy = d.jump * 0.85; this.y = 0.5; this.vx = this.facing * d.run * 1.3 * this.spd;
    this.dashJ = true; this.airAtk = false; this.setState('air'); Sound.play('jump');
  }

  doAttack(g) {
    if (!this.hold && this.can('items')) {
      const it = g.itemNear(this);
      if (it) {
        if (it.def.kind === 'heal') { this.drinkItem = it; it.holder = this; this.startMove(MOVES.drink); }
        else { this.pickTarget = it; this.startMove(MOVES.pickup); }
        return;
      }
    }
    if (this.hold) { this.startMove(this.hold.def.heavy ? MOVES.throwItem : MOVES.swing); return; }
    const ms = this.moves;
    let m;
    if (this.combo >= 2 && this.comboHits >= 2 && this.can('finisher')) { m = ms.fin; this.combo = 0; this.comboHits = 0; }
    else if (!this.can('combo')) { m = ms.pA; this.combo = 0; }
    else { m = this.combo % 2 === 0 ? ms.pA : ms.pB; this.combo++; }
    this.comboT = 32;
    this.startMove(m);
  }

  finishPickup(g) {
    const it = this.pickTarget; this.pickTarget = null;
    if (!it || it.gone || it.holder || Math.abs(it.x - this.x) > 40 || Math.abs(it.z - this.z) > 20) return;
    this.hold = it; it.holder = this; it.thrown = null; Sound.play('pickup');
  }
  finishDrink(g) {
    const it = this.drinkItem; this.drinkItem = null;
    if (!it || it.gone) return;
    it.gone = true; it.holder = null;
    this.healPool += it.def.heal; this.hpCap = Math.min(this.hpMax, this.hpCap + it.def.heal * 0.6);
    this.mp = Math.min(this.mpMax, this.mp + it.def.mp);
    g.fx('heal', this.x, this.y + 40, this.z, 10); Sound.play('drink');
  }
  throwHeld(g) {
    const it = this.hold; if (!it) return;
    this.hold = null; it.holder = null; it.thrown = this; it.hitMap.clear();
    const hv = it.def.heavy;
    it.x = this.x + this.facing * 16; it.z = this.z; it.y = this.y + (hv ? this.height : 45);
    it.vx = this.facing * (hv ? 8.5 : 12) + this.vx * 0.3; it.vy = hv ? 4 : 2.5; it.vz = 0;
    Sound.play('throw');
  }
  drop(g) {
    const it = this.hold; if (!it) return;
    this.hold = null; it.holder = null; it.thrown = null;
    it.vy = 3; it.vx = rand(-2, 2); it.y = Math.max(it.y, 20);
  }
  release(g) {
    if (this.grabV) { const v = this.grabV; this.grabV = null; if (v.grabbedBy === this) { v.grabbedBy = null; if (v.state === 'grabbed') { v.setState('hurt'); v.stun = 8; } } }
    if (this.grabbedBy) { const h = this.grabbedBy; this.grabbedBy = null; if (h.grabV === this) h.grabV = null; }
  }

  tryGrab(g) {
    for (const o of g.fighters) {
      if (o === this || o.team === this.team || o.state !== 'dizzy' || o.grabbedBy || !o.alive) continue;
      const rel = (o.x - this.x) * this.facing;
      if (rel > 0 && rel < 34 && Math.abs(o.z - this.z) < 10) {
        this.grabV = o; o.grabbedBy = this; o.setState('grabbed'); o.facing = -this.facing;
        this.setState('grab'); this.grabTime = 0; this.grabHits = 0; this.vx = 0; this.vz = 0;
        Sound.play('pickup');
        return true;
      }
    }
    return false;
  }
  updateGrab(g, dx) {
    const v = this.grabV;
    if (!v || v.state !== 'grabbed' || v.grabbedBy !== this) { this.grabV = null; this.setState('idle'); return; }
    this.vx = 0; this.vz = 0; this.grabTime++;
    const c = this.ctrl;
    if (c.pressed.attack) {
      if (dx || this.grabHits >= 3) { this.throwDir = dx || this.facing; this.startMove(MOVES.grabThrow); }
      else this.startMove(MOVES.grabPunch);
      return;
    }
    if (c.pressed.jump) { this.throwDir = -this.facing; this.startMove(MOVES.grabThrow); return; }
    if (this.grabTime > 120) this.release(g), this.setState('idle');
  }
  grabPunchHit(g) {
    const v = this.grabV; if (!v) return;
    const dmg = 11 * this.atkMul * v.defMul;
    v.hp -= dmg; v.hpCap = Math.max(v.hp, v.hpCap - dmg * 0.35); v.flash = 6;
    this.hitstop = 4; v.hitstop = 4; this.grabHits++; this.stats.dmg += dmg;
    g.fx('spark', v.x - this.facing * 4, v.y + v.height * 0.6, v.z + 1, 5); g.fx('hitflash', v.x, v.y + v.height * 0.6, v.z + 1, 1, { r: 14 });
    Sound.play('hit');
    if (v.hp <= 0) { v.hp = 0; this.release(g); g.ko(v, this); v.knockdown(this.facing * 4, 6); }
  }
  grabThrowRelease(g) {
    const v = this.grabV; if (!v) return;
    const d = this.throwDir || this.facing;
    this.grabV = null; v.grabbedBy = null;
    if (d !== this.facing) this.facing = d;
    v.x = this.x + d * 18;
    const dmg = 15 * this.atkMul * v.defMul; v.hp -= dmg; this.stats.dmg += dmg;
    v.knockdown(d * 9, 8); v.thrownBy = this; v.thrownHit.clear();
    Sound.play('whoosh');
    if (v.hp <= 0) { v.hp = 0; g.ko(v, this); }
  }

  knockdown(vx, vy) {
    this.setState('fall');
    this.vx = vx; this.vy = Math.max(3, vy); this.y = Math.max(this.y, 1); this.vz = 0;
    this.bounced = false; this.fallAcc = 0; this.stun = 0; this.rooted = 0; this.freeze = 0;
    if (vx) this.facing = -sign(vx);
  }

  updateFall(g) {
    if (this.thrownBy && Math.abs(this.vx) > 3) {
      for (const o of g.fighters) {
        if (o === this || o.team === this.thrownBy.team || !o.hittable() || this.thrownHit.has(o.id)) continue;
        if (Math.abs(o.x - this.x) < 26 && Math.abs(o.z - this.z) < 16 && this.y < o.y + o.height) {
          this.thrownHit.add(o.id);
          g.hit(this.thrownBy, o, { dmg: 28, fall: 80, kbx: 6, kby: 6, knock: true, sfx: 'hitHeavy' }, sign(this.vx));
        }
      }
    }
    if (this.landed) {
      if (!this.bounced && this.impactV < -6.5) {
        this.bounced = true; this.vy = -this.impactV * 0.35; this.y = 0.5; this.vx *= 0.6;
        g.fx('dust', this.x, 2, this.z, 4, { color: g.dustColor }); Sound.play('land'); g.shakeIt(2);
      } else {
        this.setState('lie'); this.thrownBy = null; this.burn = 0;
        g.fx('dust', this.x, 2, this.z, 5, { color: g.dustColor }); Sound.play('land');
        if (this.dead) this.setState('dead');
      }
    }
  }

  physics(g) {
    this.landed = false;
    const S = this.state;
    if (S === 'grabbed') return;
    const m = this.move;
    const air = this.y > 0 || this.vy > 0;
    if (air && !(S === 'move' && m && m.noGrav)) this.vy -= GRAV * (this.def.grav || 1);
    this.x += this.vx; this.z += this.vz; this.y += this.vy;
    if (this.y <= 0) {
      if (air) { this.landed = true; this.impactV = this.vy; }
      this.y = 0; if (this.vy < 0) this.vy = 0;
    }
    if (this.landed && S === 'air') {
      this.setState('land'); this.vx *= 0.3; this.vz = 0; Sound.play('land');
      g.fx('dust', this.x, 2, this.z, 3, { color: g.dustColor });
    }
    if (this.y <= 0 && !this.landed && ['hurt', 'dizzy', 'frozen', 'lie', 'dead', 'getup', 'land', 'defend', 'win', 'grab'].includes(S)) { this.vx *= 0.82; this.vz *= 0.7; }
    this.z = clamp(this.z, 0, DEPTH);
    const b = this.human ? g.viewBounds() : g.bounds;
    if (this.entered) this.x = clamp(this.x, b.x0 + 8, b.x1 - 8);
    else if (this.x > g.bounds.x0 + 15 && this.x < g.bounds.x1 - 15) this.entered = true;
    else {
      // un ennemi qui arrive hors de l'écran est poussé vers l'arène
      const inward = this.x <= g.bounds.x0 + 15 ? 1 : -1;
      if (['idle', 'walk', 'defend', 'run'].includes(S)) { this.x += inward * 2.5; this.facing = inward; }
      this.x = clamp(this.x, g.bounds.x0 - 150, g.bounds.x1 + 150);
    }
    for (const p of g.projs) {
      if (!p.wall || p.team === this.team || !p.active || p.dead) continue;
      const rw = p.r + this.width * 0.6;
      if (Math.abs(this.z - p.z) < p.zr && Math.abs(this.x - p.x) < rw && this.y < p.y + p.h) {
        const sd = sign(this.x - p.x) || -p.facing;
        this.x = p.x + sd * rw;
      }
    }
  }

  // ------------------------------------------------------------------
  getPose() {
    const S = this.state, t = this.st;
    let p;
    switch (S) {
      case 'idle': {
        const b = Math.sin(this.t * 0.09);
        p = lerpPose(POSES.guard, POSES.stand, 0.15);
        p.lean += b; p.kF += b * 3; p.kB += b * 3; p.lF += b; break;
      }
      case 'walk': p = lerpPose(POSES.walkA, POSES.walkB, (Math.sin(this.walkPh) + 1) / 2); break;
      case 'run': p = lerpPose(POSES.runA, POSES.runB, (Math.sin(this.walkPh) + 1) / 2); break;
      case 'brake': p = Object.assign({}, POSES.crouch, { lean: -12 }); break;
      case 'jumpPrep': case 'land': p = Object.assign({}, POSES.crouch); break;
      case 'air': p = lerpPose(POSES.air, POSES.jump, clamp(this.vy / 8, 0, 1)); break;
      case 'defend': p = Object.assign({}, POSES.defend); break;
      case 'move': p = this.move ? animPose(this.move.anim, this.mt, this) : Object.assign({}, POSES.guard); break;
      case 'hurt': p = Object.assign({}, this.hurtAlt ? POSES.hurt2 : POSES.hurt); break;
      case 'frozen': p = Object.assign({}, POSES.hurt); break;
      case 'dizzy': { p = Object.assign({}, POSES.stand); const s = Math.sin(this.t * 0.15); p.lean = s * 12; p.tilt = s * 10; p.aF = 5; p.aB = -5; break; }
      case 'fall': { p = lerpPose(POSES.hurt, POSES.fall, clamp(this.st / 6, 0, 1)); p.rot += clamp(-this.vy * 3, -30, 20); break; }
      case 'lie': case 'dead': p = Object.assign({}, POSES.lie); break;
      case 'getup': p = lerpPose(POSES.lie, POSES.crouch, clamp(t / 12, 0, 1)); break;
      case 'grab': p = Object.assign({}, POSES.grab); break;
      case 'grabbed': p = Object.assign({}, POSES.hurt); p.lean = -30; break;
      case 'win': { p = Object.assign({}, POSES.win); p.aF += Math.sin(this.t * 0.2) * 8; break; }
      default: p = Object.assign({}, POSES.guard);
    }
    if (this.hold && this.hold.def.heavy && ['idle', 'walk', 'air', 'jumpPrep', 'land', 'brake'].includes(S)) { p.aF = 165; p.eF = 25; p.aB = 160; p.eB = 25; }
    return p;
  }
}

// ---------------------------------------------------------------------
//  Projectiles et zones d'effet
// ---------------------------------------------------------------------
class Proj {
  constructor(o) {
    Object.assign(this, {
      x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, life: 60, r: 12, zr: 14, h: 12, dmg: 10, fall: 30, kbx: 3, kby: 4, stun: 14,
      pierce: false, rehit: 0, hits: 0, t: 0, delay: 0, dead: false, clash: 0, grav: 0, homing: 0, kind: 'orb', facing: 1,
      fdx: 0, fdy: 0,
    }, o);
    this.id = ++_uid; this.hitMap = new Map(); this.active = this.delay <= 0; this.maxLife = this.life;
    if (this.vx) this.facing = sign(this.vx);
  }
  track() {
    const o = this.owner; if (!o) return;
    this.x = o.x + o.facing * this.fdx; this.z = o.z; this.y = o.y + this.fdy; this.facing = o.facing;
  }
  home(g) {
    let best = null, bd = 520;
    for (const t of g.fighters) {
      if (t.team === this.team || !t.alive || t.state === 'lie' || t.state === 'dead') continue;
      const d = Math.abs(t.x - this.x) + Math.abs(t.z - this.z);
      if (d < bd) { bd = d; best = t; }
    }
    if (!best) return;
    const sp = Math.hypot(this.vx, this.vz) || 1;
    const ax = best.x - this.x, az = best.z - this.z, al = Math.hypot(ax, az) || 1;
    this.vx += (ax / al * sp - this.vx) * this.homing; this.vz += (az / al * sp - this.vz) * this.homing;
    const ns = Math.hypot(this.vx, this.vz) || 1; this.vx *= sp / ns; this.vz *= sp / ns;
    this.y += (best.y + 38 - this.y) * 0.04;
  }
  update(g) {
    if (this.dead) return;
    if (this.delay > 0) {
      this.delay--; if (this.follow) this.track();
      if (this.delay <= 0) { this.active = true; if (this.onAct) this.onAct(this, g); }
      return;
    }
    this.t++;
    if (this.follow) {
      this.track();
      if (this.endWithOwner && this.owner && (this.owner.state !== 'move' || this.owner.dead)) { this.die(g, true); return; }
    }
    if (this.homing) this.home(g);
    if (this.accel) { const sp = Math.abs(this.vx); if (sp < this.maxSpeed) this.vx += sign(this.vx) * this.accel; }
    if (this.grav) this.vy -= this.grav;
    this.x += this.vx; this.y += this.vy; this.z += this.vz;
    if (this.vx) this.facing = sign(this.vx);
    if (this.tick) this.tick(this, g);
    if ((this.grav || this.groundDie) && this.y <= 0) { this.y = 0; this.die(g); return; }
    if (!this.stationary && (this.z < -10 || this.z > DEPTH + 10)) { this.die(g, true); return; }
    if (--this.life <= 0 || this.x < -150 || this.x > g.worldW + 150) { this.die(g, true); return; }
    this.trail(g);
    if (this.trigger) {
      if (this.t > (this.arm || 0)) for (const f of g.fighters) {
        if (f.team !== this.team && f.alive && f.y < 20 && Math.abs(f.x - this.x) < this.trigger && Math.abs(f.z - this.z) < this.trigger * 0.6) { this.die(g); return; }
      }
      return;
    }
    if (this.noHit) return;
    for (const f of g.fighters) {
      if (f.team === this.team || !f.hittable()) continue;
      if (f.buff && f.buff.antiProj) continue;   // renforcement : insensible aux attaques à distance
      const last = this.hitMap.get(f.id);
      if (last !== undefined && (!this.rehit || this.t - last < this.rehit)) continue;
      if (Math.abs(f.x - this.x) > this.r + f.width * 0.6) continue;
      if (Math.abs(f.z - this.z) > this.zr) continue;
      if (this.y + this.h < f.y || this.y - this.h > f.y + f.height) continue;
      if (this.groundOnly && f.y > 20) continue;
      this.hitMap.set(f.id, this.t);
      const dir = this.radial ? (sign(f.x - this.x) || this.facing) : (this.stationary || this.follow ? this.facing : (sign(this.vx) || this.facing));
      g.hit(this.owner, f, this, dir);
      this.hits++;
      if (!this.pierce || (this.maxHits && this.hits >= this.maxHits)) { this.die(g); return; }
    }
  }
  trail(g) {
    const t = this.t;
    switch (this.kind) {
      case 'fire': if (t % 2 === 0) g.fx('fire', this.x - this.facing * 8, this.y + rand(-5, 5), this.z, 1); break;
      case 'meteor': g.fx('fire', this.x + rand(-6, 6), this.y + rand(0, 10), this.z, 1); break;
      case 'void': if (t % 3 === 0) g.fx('smoke', this.x, this.y, this.z, 1, { color: '#5a2a9a' }); break;
      case 'rocket': if (t % 2 === 0) g.fx('smoke', this.x - this.facing * 12, this.y, this.z, 1, { color: '#999' }); break;
      case 'tornado': if (t % 3 === 0) g.fx('wind', this.x + rand(-20, 20), this.y + rand(-30, 40), this.z, 1); break;
      case 'shock': if (t % 2 === 0) g.fx(this.fx === 'fire' ? 'fire' : 'debris', this.x, 6, this.z, 1, { color: this.fx === 'ice' ? '#bff0ff' : '#8a6a4a' }); break;
      case 'pillar': if (t % 2 === 0) g.fx('fire', this.x + rand(-18, 18), rand(0, 100), this.z, 1); break;
      case 'darkPillar': if (t % 2 === 0) g.fx('smoke', this.x + rand(-18, 18), rand(0, 100), this.z, 1, { color: '#7a30d0' }); break;
      case 'vine': if (t % 4 === 0) g.fx('leaf', this.x, 8, this.z, 1); break;
      case 'bolt': if (t % 2 === 0) g.fx('elec', this.x, this.y, this.z, 1); break;
    }
  }
  die(g, expired) {
    if (this.dead) return;
    this.dead = true;
    if (this.explode && !(expired && this.noExplodeOnExpire)) g.explode(this, this.explode);
    if (this.onDie) this.onDie(this, g, expired);
    switch (this.kind) {
      case 'fire': g.fx('fire', this.x, this.y, this.z, 8); break;
      case 'ice': case 'breath': g.fx('ice', this.x, this.y, this.z, 5); break;
      case 'rock': g.fx('debris', this.x, this.y, this.z, 10, { color: '#8a6a4a' }); Sound.play('earth'); g.shakeIt(3); break;
      case 'void': g.fx('smoke', this.x, this.y, this.z, 8, { color: '#6a2ab0' }); break;
      case 'wind': g.fx('wind', this.x, this.y, this.z, 5); break;
      case 'bolt': g.fx('elec', this.x, this.y, this.z, 4); break;
      case 'iceWall': g.fx('ice', this.x, 40, this.z, 14); Sound.play('shatter'); break;
      case 'arrow': case 'knife': g.fx('spark', this.x, this.y, this.z, 3); break;
    }
  }
}

// ---------------------------------------------------------------------
//  Objets
// ---------------------------------------------------------------------
const ITEMS = {
  baton:   { name: 'Bâton', w: 'staff', heavy: false, dmg: 24, tdmg: 30, hp: 140 },
  couteau: { name: 'Couteau', w: 'knife', heavy: false, dmg: 18, tdmg: 28, hp: 90 },
  pierre:  { name: 'Pierre', w: 'stone', heavy: true, tdmg: 46, hp: 50 },
  caisse:  { name: 'Caisse', w: 'crate', heavy: true, tdmg: 40, hp: 30 },
  potion:  { name: 'Élixir', w: 'potion', kind: 'heal', heal: 160, mp: 150, hp: 1 },
};
class Item {
  constructor(type, x, z, y = 0) {
    this.id = ++_uid; this.type = type; this.def = ITEMS[type];
    this.x = x; this.z = z; this.y = y; this.vx = 0; this.vy = 0; this.vz = 0;
    this.holder = null; this.thrown = null; this.hp = this.def.hp; this.rot = 0; this.gone = false; this.hitMap = new Set(); this.t = 0;
    this.life = 0;
  }
  update(g) {
    this.t++;
    if (this.holder) {
      const h = this.holder;
      if (h.gone || h.dead || (h.hold !== this && h.drinkItem !== this)) { this.holder = null; this.y = Math.max(this.y, 10); }
      else { this.x = h.x; this.z = h.z + 0.4; this.y = h.y + (this.def.heavy ? h.height + 2 : 35); this.rot = 0; return; }
    }
    if (this.life > 0 && --this.life <= 0) { this.gone = true; return; }
    const air = this.y > 0 || this.vy > 0;
    if (air) this.vy -= 0.5;
    this.x += this.vx; this.y += this.vy; this.z += this.vz;
    if (this.thrown) this.rot += 0.3 * sign(this.vx);
    if (this.y <= 0) {
      this.y = 0;
      if (this.vy < -3) {
        this.vy = -this.vy * 0.35; this.vx *= 0.6;
        if (this.thrown && this.def.heavy) { this.hp -= 15; g.fx('dust', this.x, 2, this.z, 3, { color: g.dustColor }); Sound.play('land'); }
      } else {
        this.vy = 0; this.vx *= 0.8;
        if (Math.abs(this.vx) < 0.5) { this.vx = 0; this.thrown = null; this.hitMap.clear(); this.rot = this.def.heavy ? 0 : this.rot; }
      }
    }
    if (this.thrown && (Math.abs(this.vx) > 3 || this.y > 15)) {
      const th = this.thrown;
      for (const o of g.fighters) {
        if (o === th || o.team === th.team || !o.hittable() || this.hitMap.has(o.id)) continue;
        if (Math.abs(o.x - this.x) < 22 && Math.abs(o.z - this.z) < 16 && this.y < o.y + o.height && this.y + 25 > o.y) {
          this.hitMap.add(o.id);
          g.hit(th, o, { dmg: this.def.tdmg, fall: 70, kbx: 5, kby: 5, knock: true, sfx: 'hitHeavy' }, sign(this.vx) || 1);
          this.vx *= -0.3; this.vy = 4; this.hp -= 25;
        }
      }
    }
    this.z = clamp(this.z, 0, DEPTH);
    if (this.x < 10) { this.x = 10; this.vx = Math.abs(this.vx) * 0.5; }
    if (this.x > g.worldW - 10) { this.x = g.worldW - 10; this.vx = -Math.abs(this.vx) * 0.5; }
    if (this.hp <= 0) this.breakIt(g);
  }
  breakIt(g) {
    if (this.gone) return;
    this.gone = true;
    if (this.holder && this.holder.hold === this) this.holder.hold = null;
    this.holder = null;
    g.fx('debris', this.x, this.y + 10, this.z, 10, { color: this.def.w === 'stone' ? '#8d8a84' : '#a0703a' });
    Sound.play('land');
  }
}

// ---------------------------------------------------------------------
//  Particules
// ---------------------------------------------------------------------
class Particle {
  constructor(type, x, y, z, o = {}) {
    this.type = type; this.x = x; this.y = y; this.z = z;
    this.vx = o.vx || 0; this.vy = o.vy || 0; this.vz = o.vz || 0;
    this.life = this.max = o.life || 20; this.size = o.size || 3; this.color = o.color || '#fff';
    this.grav = o.grav || 0; this.rot = o.rot || 0; this.t = 0;
    Object.assign(this, o.extra || {});
  }
  update() {
    this.t++; this.life--;
    this.x += this.vx; this.y += this.vy; this.z += this.vz; this.vy -= this.grav;
    if (this.grav && this.y < 0) { this.y = 0; this.vy *= -0.3; this.vx *= 0.6; }
    if (this.type === 'petal' || this.type === 'leaf') this.vx += Math.sin(this.t * 0.1) * 0.05;
  }
}
