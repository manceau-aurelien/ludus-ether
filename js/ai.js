'use strict';
// =====================================================================
//  INTELLIGENCE ARTIFICIELLE : remplit un Controller comme le ferait un joueur.
//  Son comportement dépend d'un jeu de paramètres P (réglable dans le Ludus),
//  ou, par défaut, d'un niveau global "skill" (jeu classique).
// =====================================================================
class AIController extends Controller {
  constructor(skill = 0.5, params = null) {
    super();
    this.custom = !!params;
    this._skill = skill;
    this.P = params || AIController.fromSkill(skill);
    this.f = null; this.cd = randi(5, 20); this.tgt = null; this.tgtT = 0;
    this.atkCd = 0; this.zOff = 0; this.zOffT = 0; this.wantErr = 0;
  }
  get skill() { return this._skill; }
  set skill(v) { this._skill = v; if (!this.custom) this.P = AIController.fromSkill(v); }

  // Paramètres équivalents au comportement du jeu classique
  static fromSkill(sk) {
    return {
      react: lerp(11, 3, sk), jitter: 3,     // délai entre deux décisions (images)
      aim: 2.4, posErr: 0,                   // imprécision de placement (profondeur / distance)
      atk: 0.3 + sk * 0.55, whiff: 0,        // probabilité de frapper à portée / coups dans le vide
      guard: sk * 0.45, dodge: sk * 0.8,     // garde au corps à corps / esquive des projectiles
      combo: 0,                              // poursuite des enchaînements
      mana: 1, spMul: 0.5 + sk,              // justesse et fréquence des pouvoirs
      run: 0.06 + sk * 0.2, jumpAtk: 0.035 + sk * 0.03, items: 0.6, tactic: sk,
    };
  }

  bind(f) { this.f = f; }
  toward(dir) { this.held[dir > 0 ? 'right' : 'left'] = true; }
  poll(g) {
    for (const k of BTN) this.pressed[k] = false;
    this.special = null; this.run = 0;
    const f = this.f, P = this.P;
    if (!f || !f.alive || !g) return;
    if (this.atkCd > 0) this.atkCd--;
    const t = this.tgt;
    // en l'air : coup de pied quand la cible est proche
    if (f.state === 'air' && t && !f.airAtk) {
      if (Math.abs(t.x - f.x) < 55 && Math.abs(t.z - f.z) < 16 && sign(t.x - f.x) === f.facing) this.pressed.attack = true;
    }
    // poursuite d'un enchaînement en cours
    if (P.combo > 0 && f.state === 'move' && f.move && f.move.combo && t && t.alive &&
      Math.abs(t.x - f.x) < 75 && Math.abs(t.z - f.z) < 18 && Math.random() < P.combo) this.pressed.attack = true;
    if (--this.cd > 0) return;
    this.cd = Math.max(2, Math.round(P.react) + randi(0, Math.round(P.jitter)));
    for (const k of BTN) this.held[k] = false;
    this.think(g);
  }

  incoming(g) {
    const f = this.f;
    for (const p of g.projs) {
      if (p.team === f.team || p.dead || !p.active || p.dmg <= 0 || p.stationary || p.noHit) continue;
      const dx = f.x - p.x;
      if (sign(p.vx) !== sign(dx) && p.vx !== 0) continue;
      if (Math.abs(dx) < 150 && Math.abs(p.z - f.z) < p.zr + 12) return p;
    }
    return null;
  }

  think(g) {
    const f = this.f, d = f.def, S = f.state, P = this.P, ai = d.ai || {};
    if (S === 'grab') {
      if (f.grabHits >= 2 && Math.random() < 0.5) this.toward(f.facing);
      this.pressed.attack = true; return;
    }
    if (!CONTROL_STATES.includes(S)) return;

    // choix de la cible
    let t = this.tgt;
    if (!t || !t.alive || this.tgtT-- <= 0 || t.team === f.team) {
      t = this.tgt = g.nearestEnemy(f); this.tgtT = randi(60, 160);
    }
    // une cible camouflée est souvent perdue de vue
    if (t && t.buff && t.buff.stealth && Math.random() < 0.6) { const alt = g.nearestEnemy(f); if (alt && alt !== t) t = this.tgt = alt; }
    if (--this.zOffT <= 0) { this.zOff = rand(-P.aim, P.aim); this.wantErr = rand(-P.posErr, P.posErr); this.zOffT = randi(40, 90); }
    if (!t) {
      // pas d'ennemi : avancer vers la zone de la prochaine vague, sinon suivre le meneur
      if (this.goTo != null) {
        const gx = this.goTo - f.x;
        if (Math.abs(gx) > 25) { this.toward(sign(gx)); if (Math.abs(gx) > 260 && f.can('run') && S !== 'run') this.run = sign(gx); }
        if (Math.abs(f.z - 100) > 40) this.held[f.z > 100 ? 'up' : 'down'] = true;
        return;
      }
      const lead = g.fighters.find(o => (o.human || o.leader) && o.alive && o.team === f.team && o !== f);
      if (lead && Math.abs(lead.x - f.x) > 110) this.toward(sign(lead.x - f.x));
      if (lead && Math.abs(lead.z - f.z) > 30) this.held[lead.z > f.z ? 'down' : 'up'] = true;
      return;
    }
    const dx = t.x - f.x, dz = t.z - f.z, adx = Math.abs(dx), adz = Math.abs(dz), dir = sign(dx) || f.facing;
    const tDown = ['lie', 'getup', 'dead', 'fall'].includes(t.state);

    if (S === 'air') return;

    // esquive / garde
    const p = this.incoming(g);
    if (p && Math.random() < P.dodge) {
      const r = Math.random();
      if (r < 0.5 && !f.heavy()) { this.held.defend = true; f.facing = sign(p.x - f.x) || f.facing; this.pressed.defend = S !== 'defend'; }
      else if (r < 0.85 || !f.can('jump')) this.held[f.z > DEPTH / 2 ? 'up' : 'down'] = true;
      else this.pressed.jump = true;
      this.cd += 4;
      return;
    }
    if (t.state === 'move' && adx < 80 && adz < 16 && t.facing === -dir && !f.heavy() && Math.random() < P.guard + (ai.guard || 0) * 0.3) {
      this.held.defend = true; if (S !== 'defend') this.pressed.defend = true; f.facing = dir; return;
    }

    // objets
    if (!f.hold && adx > 90 && f.can('items') && Math.random() < P.items) {
      const it = g.itemNearAI(f, 160);
      if (it && (it.def.kind !== 'heal' || f.hp < f.hpMax * 0.65)) {
        const ix = it.x - f.x, iz = it.z - f.z;
        if (Math.abs(ix) < 22 && Math.abs(iz) < 10) { this.pressed.attack = true; return; }
        if (Math.abs(ix) > 8) this.toward(sign(ix));
        if (Math.abs(iz) > 5) this.held[iz > 0 ? 'down' : 'up'] = true;
        return;
      }
    }
    if (f.hold && f.hold.def.heavy) {
      if (adz < 14 && adx < 360 && !tDown) { f.facing = dir; this.pressed.attack = true; return; }
    }
    if (f.hold && !f.hold.def.heavy && adx > 150 && adx < 380 && adz < 12 && Math.random() < 0.08 && f.can('run')) {
      f.facing = dir; this.run = dir; return;
    }

    // pouvoirs
    if (ai.sp && !tDown && S !== 'run') {
      for (const s of ai.sp) {
        const ov = f.perks && f.perks.buffs && f.perks.buffs[s.c];
        const m = ov ? BUFF_MOVES[ov] : d.specials[s.c];
        if (!m || (f.perks && !f.spLevel(s.c))) continue;
        if (ov) {   // renforcement : à lancer quand le combat est proche et qu'il n'est pas déjà actif
          if (f.buff || adx > 320 || f.mp < f.spCost(s.c, m)) continue;
          if (Math.random() < 0.35 * P.spMul) { this.special = s.c; this.cd += 12; return; }
          continue;
        }
        if (f.mp < f.spCost(s.c, m)) continue;
        const sloppy = Math.random() > P.mana;     // mauvaise lecture : lance sans vérifier la portée
        if (!sloppy) {
          if (adx < s.r[0] || adx > s.r[1]) continue;
          if (s.z !== undefined && adz > s.z) continue;
          if (s.hp && f.hp / f.hpMax > s.hp) continue;
        }
        if (Math.random() < s.p * P.spMul) {
          if (s.c[1] === '>') f.facing = dir;
          this.special = s.c; this.cd += 12; return;
        }
      }
    }

    const ranged = ai.style === 'ranged';
    const want = (ranged ? (ai.dist || 240) : (f.hold && !f.hold.def.heavy ? 42 : 30 + (d.reach || 0) * 0.8) * (f.look.scale || 1)) + this.wantErr;
    const zt = t.z + this.zOff;
    const dzt = zt - f.z;

    if (ranged) {
      if (adx < 70 && adz < 14) {
        if (f.facing !== dir) this.toward(dir);
        else if (this.atkCd <= 0) { this.pressed.attack = true; this.atkCd = 10; }
        return;
      }
      if (adx < want - 70) this.toward(-dir);
      else if (adx > want + 90) this.toward(dir);
      if (Math.abs(dzt) > 6) this.held[dzt > 0 ? 'down' : 'up'] = true;
      if (!this.held.left && !this.held.right && f.facing !== dir) f.facing = dir;
      return;
    }

    if (tDown) {
      if (adx > 110) this.toward(dir);
      else if (adx < 50) this.toward(-dir);
      if (Math.abs(dzt) > 8) this.held[dzt > 0 ? 'down' : 'up'] = true;
      return;
    }
    if (S === 'run') {
      if (adx < 95 && adz < 16) this.pressed.attack = true;
      else if (adx < 60 || sign(dx) !== f.facing) { this.pressed[f.facing > 0 ? 'left' : 'right'] = true; }
      if (Math.abs(dzt) > 6) this.held[dzt > 0 ? 'down' : 'up'] = true;
      return;
    }
    if (adx > want + 6) this.toward(dir);
    else if (adx < want * 0.5) this.toward(-dir);
    if (Math.abs(dzt) > 5) this.held[dzt > 0 ? 'down' : 'up'] = true;
    if (adx > 280 && adz < 40 && Math.random() < P.run) this.run = dir;
    if (adx < want + 26 + P.whiff && adz < 12 + P.whiff * 0.25) {
      if (f.facing !== dir) { this.held.left = false; this.held.right = false; this.toward(dir); }
      else if (this.atkCd <= 0 && Math.random() < P.atk) {
        this.held.left = false; this.held.right = false;
        this.pressed.attack = true; this.atkCd = Math.max(2, randi(5, 14) - Math.round(P.tactic * 6));
      }
    }
    if (adx > 75 && adx < 135 && adz < 10 && Math.random() < P.jumpAtk) this.pressed.jump = true;
  }
}
