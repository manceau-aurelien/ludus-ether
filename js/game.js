'use strict';
// =====================================================================
//  COMBAT : le monde (Battle), les dégâts, la caméra et l'interface
// =====================================================================
function fxColor(fx) {
  return fx === 'fire' ? '#ffb030' : fx === 'ice' ? '#bff0ff' : fx === 'shock' ? '#fff59a' : fx === 'root' ? '#7dff9a' : '#fff4c0';
}

class Battle {
  constructor(o) {
    this.theme = o.theme; this.worldW = o.worldW;
    this.fighters = []; this.projs = []; this.items = []; this.parts = []; this.amb = [];
    this.cam = { x: 0, shake: 0 }; this.bounds = { x0: 0, x1: o.worldW };
    this.bg = getBG(o.theme, o.worldW);
    this.dustColor = THEMES[o.theme].dust;
    this.t = 0; this.banners = []; this.flashA = 0; this.slow = 0; this.ff = false;
    this._vb = { x0: 0, x1: W };
  }
  // ---------------- création ----------------
  spawnFighter(def, o = {}) {
    if (o.ai != null && !o.ctrl) o.ctrl = new AIController(o.ai);
    const f = new Fighter(def, o);
    if (o.hpMul == null && def.boss && o.boss) f.boss = true;
    this.fighters.push(f);
    return f;
  }
  shoot(f, o) {
    const sc = f.look.scale || 1;
    const p = new Proj(Object.assign({
      x: f.x + f.facing * (o.dx != null ? o.dx : 28 * sc), y: f.y + (o.dy != null ? o.dy : 44 * sc), z: f.z + (o.dz || 0),
      vx: f.facing * (o.speed || 0), owner: f, team: f.team, facing: f.facing,
    }, o));
    if (o.speed) p.vx = f.facing * o.speed;
    if (!p.mul) p.mul = f.powMul || 1;
    this.projs.push(p);
    return p;
  }
  spawn(o) { const p = new Proj(o); if (!p.mul) p.mul = (p.owner && p.owner.powMul) || 1; this.projs.push(p); return p; }
  explode(src, e) {
    Sound.play(e.sfx || 'explosion'); this.shakeIt(5);
    this.projs.push(new Proj({ kind: e.kind || 'explosion', x: src.x, y: Math.max(25, src.y), z: src.z, owner: src.owner, team: src.team, facing: src.facing,
      stationary: true, pierce: true, radial: true, life: 14, dmg: e.dmg, mul: src.mul || 1, fall: e.fall || 80, kbx: e.kbx || 5, kby: e.kby || 7, knock: true, fx: e.fx,
      r: e.r, zr: e.r * 0.7, h: e.r }));
    if ((e.kind || 'explosion') === 'petalBurst') this.fx('petal', src.x, 20, src.z, 16);
    else { this.fx('fire', src.x, 20, src.z, 12); this.fx('smoke', src.x, 20, src.z, 6, { color: '#555' }); }
  }
  dropItem(type, x, z) {
    const it = new Item(type, x, z, 320);
    this.items.push(it);
    return it;
  }
  // ---------------- requêtes ----------------
  enemiesOf(f) { return this.fighters.filter(o => o !== f && o.team !== f.team && o.alive); }
  nearestEnemy(f, maxD = 99999) {
    let best = null, bd = maxD;
    for (const o of this.fighters) {
      if (o === f || o.team === f.team || !o.alive) continue;
      const d = Math.abs(o.x - f.x) + Math.abs(o.z - f.z) * 1.5 + (o.state === 'lie' || o.state === 'getup' ? 120 : 0) + (o.buff && o.buff.stealth ? 700 : 0);
      if (d < bd) { bd = d; best = o; }
    }
    return best;
  }
  targetAhead(f, maxD) {
    let best = null, bd = maxD;
    for (const o of this.fighters) {
      if (o.team === f.team || !o.alive) continue;
      const rel = (o.x - f.x) * f.facing;
      if (rel < -10 || rel > maxD) continue;
      const d = rel + Math.abs(o.z - f.z);
      if (d < bd) { bd = d; best = o; }
    }
    return best;
  }
  itemNear(f) {
    for (const it of this.items) {
      if (it.gone || it.holder || it.y > 6 || Math.abs(it.vx) > 1) continue;
      if (Math.abs(it.x - f.x) < 30 && Math.abs(it.z - f.z) < 14) return it;
    }
    return null;
  }
  itemNearAI(f, r) {
    let best = null, bd = r;
    for (const it of this.items) {
      if (it.gone || it.holder || it.y > 6 || it.thrown) continue;
      const d = Math.abs(it.x - f.x) + Math.abs(it.z - f.z);
      if (d < bd) { bd = d; best = it; }
    }
    return best;
  }
  viewBounds() { return this._vb; }
  // ---------------- effets ----------------
  shakeIt(n) { this.cam.shake = Math.max(this.cam.shake, n); }
  flashIt(a) { this.flashA = Math.max(this.flashA, a); }
  banner(text, sub, dur, color) { this.banners.length = 0; this.banners.push({ text, sub: sub || '', t: 0, dur: dur || 120, color: color || '#ffe9a0' }); Sound.play('banner'); }
  after(f, color) {
    if (this.parts.length > 700) return;
    this.parts.push(new Particle('after', f.x, f.y, f.z - 0.5, { life: 12, extra: { pose: f.getPose(), look: f.look, facing: f.facing, sc: f.look.scale || 1, color: color || '#ffffff' } }));
  }
  fx(type, x, y, z, n = 1, o = {}) {
    if (this.parts.length > 700) return;
    for (let i = 0; i < n; i++) {
      let p;
      switch (type) {
        case 'spark': p = { vx: rand(-4.5, 4.5), vy: rand(-2, 5), life: randi(8, 14), size: rand(1.5, 3), color: o.color || '#fff6c8', grav: 0.25 }; break;
        case 'hitflash': p = { life: 7, size: o.r || 16, color: o.color || '#fff6c8', rot: rand(0, 1) }; break;
        case 'dust': p = { vx: rand(-1.2, 1.2), vy: rand(0.2, 1), life: randi(18, 30), size: rand(4, 8), color: o.color || '#bba888' }; break;
        case 'smoke': p = { vx: rand(-1, 1), vy: rand(0.3, 1.4), vz: rand(-0.3, 0.3), life: randi(26, 40), size: rand(6, 12), color: o.color || '#666' }; break;
        case 'fire': p = { vx: rand(-0.8, 0.8), vy: rand(0.8, 2.2), life: randi(16, 28), size: rand(3, 6) }; break;
        case 'ice': p = { vx: rand(-3, 3), vy: rand(1, 5), vz: rand(-1, 1), life: randi(25, 40), size: rand(2, 4.5), color: choose(['#e8fbff', '#9fe0ff', '#ffffff']), grav: 0.25, rot: rand(0, 6) }; break;
        case 'debris': p = { vx: rand(-3.5, 3.5), vy: rand(2, 6), vz: rand(-1, 1), life: randi(30, 45), size: rand(3, 6), color: o.color || '#8a6a4a', grav: 0.3, rot: rand(0, 6) }; break;
        case 'elec': p = { vx: rand(-1, 1), vy: rand(-1, 1), life: randi(6, 10), color: o.color }; break;
        case 'heal': p = { vx: rand(-1, 1), vy: rand(0.8, 1.8), life: randi(30, 45), color: o.color }; break;
        case 'wind': p = { vx: rand(-1.5, 1.5), vy: rand(-0.5, 1.5), life: randi(10, 16), size: rand(6, 14), rot: rand(0, 6), color: o.color }; break;
        case 'petal': p = { vx: rand(-3, 3), vy: rand(1, 4), vz: rand(-1, 1), life: randi(30, 50), size: rand(2.5, 4), color: choose(['#ffb3d9', '#ff8fc0', '#fff']), grav: 0.12, rot: rand(0, 6) }; break;
        case 'leaf': p = { vx: rand(-1.5, 1.5), vy: rand(0.5, 2), life: randi(25, 40), size: 3, color: choose(['#4caf50', '#7cd16c']), grav: 0.05, rot: rand(0, 6) }; break;
        case 'star': p = { vx: rand(-1, 1), vy: rand(0, 2), life: 20, size: 5 }; break;
        case 'ring': p = { life: 16, size: o.size || 30, color: o.color || '#fff' }; break;
        case 'slash': p = { life: 10, size: o.size || 40, color: o.color || '#fff', extra: { facing: o.facing || 1 } }; break;
        case 'text': p = { vy: 0.8, life: 50, size: o.size || 16, color: o.color || '#fff', extra: { text: o.text } }; break;
        default: p = { life: 15 };
      }
      this.parts.push(new Particle(type, x + (n > 1 && type !== 'hitflash' ? rand(-6, 6) : 0), y, z, p));
    }
  }

  // ---------------- dégâts ----------------
  melee(f, h) {
    for (const t of this.fighters) {
      if (t === f || (t.team === f.team && !this.ff) || !t.hittable()) continue;
      const key = t.id * 16 + h.k;
      const last = f.hitSet.get(key);
      if (last !== undefined && (!h.rehit || f.mt - last < h.rehit)) continue;
      const rel = (t.x - f.x) * f.facing;
      if (rel < h.x[0] - t.width * 0.6 || rel > h.x[1] + t.width * 0.6) continue;
      if (Math.abs(t.z - f.z) > (h.z || 16)) continue;
      const y0 = f.y + h.y[0], y1 = f.y + h.y[1];
      if (y1 < t.y || y0 > t.y + t.height) continue;
      f.hitSet.set(key, f.mt);
      this.hit(f, t, h, f.facing);
    }
  }
  hit(src, tgt, h, dir) {
    if (!tgt.alive) return null;
    if (src && src.team === tgt.team && !this.ff) return null;
    const tb = tgt.buff;
    if (tb && tb.evade && Math.random() < tb.evade) {
      this.fx('wind', tgt.x, tgt.y + 40, tgt.z + 1, 4);
      this.fx('text', tgt.x, tgt.y + tgt.height + 10, tgt.z + 1, 1, { text: 'Esquive !', color: '#bffff0', size: 13 });
      return 'miss';
    }
    if (src && src.buff && src.buff.onHit && !h.fx && !(h instanceof Proj)) h = Object.assign({}, h, { fx: src.buff.onHit });
    let dmg = h.dmg || 0;
    if (h.weapon && src && src.hold) {
      dmg = src.hold.def.dmg; src.hold.hp -= 15;
      if (src.hold.hp <= 0) src.hold.breakIt(this);
    }
    dmg *= (src ? src.atkMul : 1) * tgt.defMul;
    if (h.mul) dmg *= h.mul;
    else if (src && src.state === 'move' && src.move && src.move.mp > 0) dmg *= src.powMul || 1;
    const sx = tgt.x - dir * 6, sy = tgt.y + tgt.height * 0.6, sz = tgt.z + 1;
    tgt.lastHitBy = src;
    // garde
    if (tgt.state === 'defend' && tgt.facing === -dir && !h.unblock) {
      tgt.hp = Math.max(1, tgt.hp - dmg * 0.1); tgt.bdef += (h.dmg || 10) + 8;
      tgt.vx = dir * Math.min(4, (h.kbx || 2) * 0.7 + 1);
      this.fx('spark', sx, sy, sz, 5, { color: '#bfe6ff' }); Sound.play('block');
      if (src) src.hitstop = Math.max(src.hitstop, 3);
      tgt.hitstop = 3;
      if (tgt.bdef >= 60) {
        tgt.bdef = 0; tgt.setState('hurt'); tgt.stun = 40;
        this.fx('star', tgt.x, tgt.y + tgt.height, sz, 4); Sound.play('guardBreak');
      }
      return 'block';
    }
    if (tb && tb.shield > 0) {
      const a = Math.min(tb.shield, dmg); tb.shield -= a; dmg -= a;
      if (dmg <= 0.01) {
        this.fx('spark', sx, sy, sz, 6, { color: '#40e0ff' }); Sound.play('block');
        if (src) src.hitstop = Math.max(src.hitstop, 3);
        return 'shield';
      }
    }
    const armored = tgt.armorOn || (tgt.boss && tgt.state === 'move' && (h.fall || 0) < 60 && tgt.y <= 0) || (tb && tb.armor && (h.fall || 0) < 75);
    tgt.hp -= dmg; tgt.hpCap = Math.max(tgt.hp, tgt.hpCap - dmg * 0.33);
    if (src) { src.stats.dmg += dmg; if (src.move && src.move.combo) src.comboHits++; }
    tgt.flash = 6;
    const heavy = (h.fall || 0) >= 60 || dmg >= 30;
    this.fx('spark', sx, sy, sz, heavy ? 8 : 5, { color: fxColor(h.fx) });
    this.fx('hitflash', sx, sy, sz, 1, { r: heavy ? 22 : 14, color: fxColor(h.fx) });
    Sound.play(h.sfx || (heavy ? 'hitHeavy' : 'hit'));
    if (h.fx === 'fire') Sound.play('fire');
    const hs = heavy ? 6 : 4;
    if (src) src.hitstop = Math.max(src.hitstop, hs);
    tgt.hitstop = hs;
    if (heavy) this.shakeIt(3);
    if (tgt.hp <= 0) {
      tgt.hp = 0; tgt.hpCap = 0;
      tgt.release(this); tgt.drop(this);
      this.ko(tgt, src);
      tgt.knockdown(dir * Math.max(4, h.kbx || 4), Math.max(6, h.kby || 6));
      return 'ko';
    }
    if (armored) return 'armor';
    tgt.release(this);
    if (tgt.state === 'frozen') {
      tgt.freeze = 0; this.fx('ice', tgt.x, tgt.y + 40, tgt.z, 14); Sound.play('shatter');
      tgt.hp = Math.max(1, tgt.hp - 10);
      tgt.drop(this); tgt.knockdown(dir * Math.max(3, h.kbx || 4), Math.max(5, h.kby || 6));
      return 'hit';
    }
    tgt.fallAcc += h.fall != null ? h.fall : 20;
    if (h.fx === 'ice' && h.freeze && tgt.y <= 0 && tgt.state !== 'fall') {
      tgt.drop(this); tgt.setState('frozen'); tgt.freeze = h.freeze; tgt.vx = dir * 1.5; tgt.fallAcc = 0; tgt.facing = -dir;
      Sound.play('freeze'); return 'hit';
    }
    if (h.fx === 'root') {
      tgt.setState('hurt'); tgt.stun = h.stun || 60; tgt.rooted = tgt.stun; tgt.vx = 0; tgt.facing = -dir;
      this.fx('leaf', tgt.x, 10, tgt.z, 6); return 'hit';
    }
    if (h.fx === 'fire') tgt.burn = 45;
    if (h.fx === 'shock') this.fx('elec', tgt.x, tgt.y + 40, tgt.z, 5);
    const knock = h.knock || tgt.y > 1 || tgt.state === 'fall' || tgt.fallAcc >= 70 || h.fx === 'fire';
    if (knock) { tgt.drop(this); tgt.knockdown(dir * (h.kbx != null ? h.kbx : 3), h.kby != null ? h.kby : 5); }
    else if ((tgt.state === 'dizzy' || tgt.fallAcc >= 50) && !h.nodizzy) {
      if (tgt.state !== 'dizzy') tgt.setState('dizzy');
      tgt.vx = dir * 1.5; tgt.facing = -dir;
    } else {
      tgt.setState('hurt'); tgt.stun = (h.stun || 14) + (h.fx === 'shock' ? 12 : 0);
      tgt.vx = dir * (h.kbx != null ? h.kbx : 1.5) * 0.6; tgt.hurtAlt = !tgt.hurtAlt; tgt.facing = -dir;
    }
    return 'hit';
  }
  ko(tgt, src) {
    if (tgt.dead) return;
    tgt.dead = true; tgt.deadT = 0;
    if (src && src !== tgt) src.stats.ko++;
    Sound.play('ko');
    if (tgt.boss) { this.slow = 50; this.flashIt(0.5); this.shakeIt(8); }
    for (const o of this.fighters) {
      if ((o.summonOf === tgt || o.cloneOf === tgt) && o.alive) { o.hp = 0; o.dead = true; o.knockdown(sign(o.x - tgt.x) * 3 || 3, 5); }
    }
    if (this.onKO) this.onKO(tgt, src);
  }

  // ---------------- boucle ----------------
  update() {
    this.t++;
    if (this.slow > 0) { this.slow--; if (this.slow % 2) { this.updateFx(); return; } }
    const c = this.cam;
    this._vb = { x0: Math.max(this.bounds.x0, c.x), x1: Math.min(this.bounds.x1, c.x + W) };
    for (const f of this.fighters) if (f.ctrl && f.ctrl.poll) f.ctrl.poll(this);
    for (const f of this.fighters) f.update(this);
    for (const p of this.projs) p.update(this);
    this.clash();
    for (const it of this.items) it.update(this);
    this.updateFx();
    this.projs = this.projs.filter(p => !p.dead);
    this.items = this.items.filter(i => !i.gone);
    this.fighters = this.fighters.filter(f => !f.gone || f.human);
  }
  updateFx() {
    for (const p of this.parts) p.update();
    this.parts = this.parts.filter(p => p.life > 0);
    if (this.cam.shake > 0) this.cam.shake = Math.max(0, this.cam.shake - 0.5);
    if (this.flashA > 0) this.flashA = Math.max(0, this.flashA - 0.03);
    for (const b of this.banners) b.t++;
    this.banners = this.banners.filter(b => b.t < b.dur);
    this.ambient();
  }
  clash() {
    const ps = this.projs;
    for (let i = 0; i < ps.length; i++) {
      const a = ps[i]; if (a.dead || !a.active) continue;
      for (let j = i + 1; j < ps.length; j++) {
        const b = ps[j]; if (b.dead || !b.active || a.team === b.team) continue;
        if (!(a.clash || a.wall) || !(b.clash || b.wall)) continue;
        if (Math.abs(a.x - b.x) > a.r + b.r || Math.abs(a.z - b.z) > Math.max(a.zr, b.zr) || Math.abs(a.y - b.y) > a.h + b.h) continue;
        if (a.wall && !b.wall) { b.die(this); Sound.play('clash'); continue; }
        if (b.wall && !a.wall) { a.die(this); Sound.play('clash'); break; }
        if (a.clash > b.clash) b.die(this); else if (b.clash > a.clash) a.die(this); else { a.die(this); b.die(this); }
        this.fx('spark', (a.x + b.x) / 2, (a.y + b.y) / 2, a.z, 10); Sound.play('clash');
        if (a.dead) break;
      }
    }
  }
  ambient() {
    const type = THEMES[this.theme].amb;
    if (this.amb.length < 60 && Math.random() < (type === 'snow' ? 0.6 : type === 'ember' ? 0.3 : 0.08)) {
      const a = { type, x: rand(0, W), y: type === 'ember' ? H + 5 : -5, vx: 0, vy: 0, t: 0, s: rand(1.5, 3.5) };
      if (type === 'snow') { a.vx = rand(-0.6, 0.2); a.vy = rand(0.8, 1.8); }
      else if (type === 'ember') { a.vx = rand(-0.4, 0.4); a.vy = rand(-1.6, -0.6); }
      else if (type === 'mote') { a.y = rand(GY, H); a.vx = rand(-0.3, 0.3); a.vy = rand(-0.6, -0.2); }
      else if (type === 'sand') { a.y = rand(GY - 40, H); a.x = -5; a.vx = rand(2, 4); a.vy = rand(-0.2, 0.2); }
      else { a.vx = rand(-1, 0.5); a.vy = rand(0.6, 1.3); }
      this.amb.push(a);
    }
    for (const a of this.amb) { a.t++; a.x += a.vx + Math.sin(a.t * 0.05) * 0.3; a.y += a.vy; }
    this.amb = this.amb.filter(a => a.y > -20 && a.y < H + 20 && a.x > -20 && a.x < W + 20 && a.t < 900);
  }
  follow(tx) {
    const c = this.cam;
    const target = clamp(tx - W / 2, this.bounds.x0, Math.max(this.bounds.x0, this.bounds.x1 - W));
    c.x += (target - c.x) * 0.12;
    c.x = clamp(c.x, 0, Math.max(0, this.worldW - W));
  }

  // ---------------- rendu ----------------
  draw(ctx, o = {}) {
    const cx = Math.round(this.cam.x);
    const sh = this.cam.shake;
    ctx.save();
    if (sh > 0) ctx.translate(rand(-sh, sh), rand(-sh, sh) * 0.6);
    this.bg.draw(ctx, cx);
    // ombres
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    for (const f of this.fighters) {
      if (f.gone) continue;
      const k = 1 - Math.min(f.y, 160) / 280, sc = f.look.scale || 1;
      const lying = f.state === 'lie' || f.state === 'dead';
      ctx.beginPath(); ctx.ellipse(f.x - cx, GY + f.z, (lying ? 30 : 17) * sc * k, 5 * sc * k, 0, 0, TAU); ctx.fill();
    }
    for (const it of this.items) if (!it.holder) { ctx.beginPath(); ctx.ellipse(it.x - cx, GY + it.z, 11, 3.5, 0, 0, TAU); ctx.fill(); }
    for (const p of this.projs) if (p.y > 12 && !p.stationary && p.kind !== 'lightning') { ctx.beginPath(); ctx.ellipse(p.x - cx, GY + p.z, p.r * 0.8, p.r * 0.25, 0, 0, TAU); ctx.fill(); }
    // entités triées en profondeur
    const list = [];
    for (const f of this.fighters) if (!f.gone) list.push({ z: f.z, k: 0, o: f });
    for (const it of this.items) list.push({ z: it.z, k: 1, o: it });
    for (const p of this.projs) list.push({ z: p.z + 0.2, k: 2, o: p });
    list.sort((a, b) => a.z - b.z || a.k - b.k);
    for (const e of list) {
      if (e.k === 0) drawFighter(ctx, e.o, cx);
      else if (e.k === 1) drawItem(ctx, e.o, cx);
      else drawProj(ctx, e.o, cx);
    }
    for (const p of this.parts) drawParticle(ctx, p, cx);
    ctx.globalAlpha = 1;
    // ambiance
    for (const a of this.amb) {
      if (a.type === 'snow') { ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.beginPath(); ctx.arc(a.x, a.y, a.s * 0.7, 0, TAU); ctx.fill(); }
      else if (a.type === 'ember') { ctx.fillStyle = 'rgba(255,' + (120 + (a.t % 80)) + ',40,0.85)'; ctx.fillRect(a.x, a.y, 2, 2); }
      else if (a.type === 'mote') { ctx.fillStyle = 'rgba(200,140,255,0.6)'; ctx.beginPath(); ctx.arc(a.x, a.y, 1.6, 0, TAU); ctx.fill(); }
      else if (a.type === 'sand') { ctx.fillStyle = 'rgba(255,220,170,0.5)'; ctx.fillRect(a.x, a.y, 3, 1); }
      else if (a.type === 'leaf') { ctx.fillStyle = 'rgba(90,170,70,0.8)'; ctx.beginPath(); ctx.ellipse(a.x, a.y, 3, 1.6, a.t * 0.05, 0, TAU); ctx.fill(); }
      else { ctx.fillStyle = 'rgba(255,170,210,0.8)'; ctx.beginPath(); ctx.ellipse(a.x, a.y, 2.6, 1.6, a.t * 0.05, 0, TAU); ctx.fill(); }
    }
    ctx.restore();
    if (this.flashA > 0) { ctx.fillStyle = 'rgba(255,255,255,' + this.flashA + ')'; ctx.fillRect(0, 0, W, H); }
    if (!o.noBanner) this.drawBanners(ctx);
  }
  drawBanners(ctx) {
    for (const b of this.banners) {
      const k = Math.min(1, b.t / 10), out = Math.min(1, (b.dur - b.t) / 15);
      ctx.save(); ctx.globalAlpha = out;
      const y = 200;
      ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fillRect(0, y - 44 * k, W, (b.sub ? 80 : 64) * k);
      ctx.translate(W / 2, y); ctx.scale(0.6 + 0.4 * k, 0.6 + 0.4 * k);
      txt(ctx, b.text, 0, 0, { size: 40, color: b.color, align: 'center', lw: 6 });
      if (b.sub) txt(ctx, b.sub, 0, 30, { size: 18, color: '#ffffff', align: 'center' });
      ctx.restore();
    }
  }
}

// ---------------------------------------------------------------------
//  Interface de combat
// ---------------------------------------------------------------------
function drawBar(ctx, x, y, w, h, frac, col, cap, bg) {
  ctx.fillStyle = bg || '#2a0c10'; ctx.fillRect(x, y, w, h);
  if (cap != null) { ctx.fillStyle = '#6a1a20'; ctx.fillRect(x, y, w * clamp(cap, 0, 1), h); }
  ctx.fillStyle = col; ctx.fillRect(x, y, w * clamp(frac, 0, 1), h);
  ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fillRect(x, y, w * clamp(frac, 0, 1), Math.max(1, h * 0.35));
  ctx.strokeStyle = 'rgba(0,0,0,0.8)'; ctx.lineWidth = 1.5; ctx.strokeRect(x, y, w, h);
}
function drawHUD(ctx, list, t) {
  const n = Math.min(4, list.length);
  for (let i = 0; i < n; i++) {
    const f = list[i], x = 6 + i * 238, y = 6;
    panel(ctx, x, y, 232, 58, { r: 6, fill: 'rgba(8,6,18,0.72)', stroke: f.human ? (f.pid === 0 ? 'rgba(79,179,255,0.8)' : 'rgba(255,154,60,0.8)') : 'rgba(150,150,170,0.5)' });
    drawPortrait(ctx, f.def, x + 4, y + 4, 50, 50, { dim: f.dead, time: t });
    const tag = f.hudTag || (f.human ? 'J' + (f.pid + 1) : f.ally ? 'Allié' : 'CPU');
    txt(ctx, f.name, x + 60, y + 17, { size: 13 });
    txt(ctx, tag, x + 226, y + 17, { size: 11, align: 'right', color: f.hudCol || (f.human ? (f.pid === 0 ? '#4fb3ff' : '#ff9a3c') : '#aaa') });
    drawBar(ctx, x + 60, y + 23, 166, 11, f.hp / f.hpMax, f.hp / f.hpMax < 0.25 ? '#ff4040' : '#e8343c', f.hpCap / f.hpMax);
    const mpCol = f.mpFlash > 0 && (f.mpFlash >> 2) % 2 ? '#ffffff' : '#3a7bff';
    drawBar(ctx, x + 60, y + 38, 166, 7, f.mpMax > 0 ? f.mp / f.mpMax : 0, mpCol, null, '#0c1430');
    txt(ctx, Math.ceil(f.hp) + '', x + 62, y + 56, { size: 9, color: '#ffb0b0', w: 'normal' });
    if (f.dead) txt(ctx, 'K.O.', x + 143, y + 33, { size: 18, color: '#ff5050', align: 'center' });
  }
}
function drawBossBar(ctx, f, yy) {
  const w = 560, x = (W - w) / 2, y = yy || H - 36;
  panel(ctx, x - 8, y - 22, w + 16, 46, { r: 6, fill: 'rgba(10,4,12,0.8)', stroke: 'rgba(255,200,80,0.7)' });
  txt(ctx, f.name + (f.def.title ? ' — ' + f.def.title : ''), x, y - 6, { size: 14, color: '#ffd27a' });
  drawBar(ctx, x, y, w, 12, f.hp / f.hpMax, '#d82a3a', f.hpCap / f.hpMax);
}
