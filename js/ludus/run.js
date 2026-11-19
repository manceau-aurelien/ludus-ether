'use strict';
// =====================================================================
//  LUDUS — combat automatique : vagues, défaites, paliers, expérience
//  (en coopération, c'est l'hôte qui exécute cette simulation)
// =====================================================================
const ZONE_START = 640, ZONE_STEP = 600;          // chaque vague se joue un peu plus loin à droite
const ARENA_W = ZONE_START + ZONE_STEP * 4 + 1100;
const CAMP_DELAY = 60 * 15;   // départ automatique du camp après 15 s
const CAM_LEAD = 150;         // la caméra regarde devant le champion, d'où arrivent les ennemis

class Run {
  constructor(hub, loc) {
    this.hub = hub; this.save = hub.save; this.coop = hub.coop || null;
    this.guest = null;
    this.setDest(loc || this.save.loc);
    this.toCamp(this.coop ? 'coop' : 'start');
  }
  setDest(loc) {
    this.loc = Object.assign({}, loc);
    this.save.loc = Object.assign({}, loc);
    this.def = locDef(this.loc);
  }
  get atCamp() { return this.phase === 'camp'; }
  // La coopération (XP et dégâts doublés, foule) ne s'applique que si le champion du partenaire est dans ce combat.
  // Un partenaire qui se connecte en pleine vague entre en jeu au prochain retour au camp.
  coopOn() { return !!(this.coop && this.coop.connected && this.guest); }
  // Coopération à partir du palier 4 (et dans l'arène) : recrues des deux joueurs et ennemis plus nombreux
  coopBig() { return this.coopOn() && (this.loc.type === 'arena' || this.loc.i >= COOP_CROWD_FROM); }
  heroes() { return [this.main, this.guest, ...this.recruits, ...(this.grecruits || [])].filter(Boolean); }
  // Choix d'un palier : au camp, change la destination ; en combat, le gladiateur se replie au camp
  goto(loc) {
    this.setDest(loc);
    if (!this.atCamp) this.toCamp('retreat');
    else writeSave(this.save);
  }
  newBattle(theme, worldW) {
    const g = this.g = new Battle({ theme, worldW });
    if (this.coop) this.coop.hook(g);
    return g;
  }
  // Retour au camp d'entraînement : repos complet, achats possibles, puis départ au combat
  toCamp(reason) {
    this.phase = 'camp'; this.campReason = reason; this.campT = CAMP_DELAY;
    const g = this.newBattle('camp', W);
    g.onKO = () => {};
    this.main = this.spawnHero(this.save.main, true, 1, 470, 120);
    this.main.facing = 1;
    this.guest = this.spawnGuest(560, 90);
    this.recruits = [null, null]; this.grecruits = [null, null];
    this.spawnRecruits(1);
    this.queue = []; this.wave = -1;
    Sound.music('title');
    writeSave(this.save);
  }
  depart() {
    if (!this.atCamp) return;
    Sound.play('confirm');
    Sound.music(this.def.music);
    this.restart();
  }
  // (re)commence le lieu à la vague 1, combattants en pleine forme
  restart() {
    this.phase = 'between';
    const g = this.newBattle(this.def.theme, ARENA_W);
    g.onKO = (t, src) => this.onKO(t, src);
    this.anchor = ZONE_START;
    this.main = this.spawnHero(this.save.main, true, 1, ZONE_START, 100);
    this.guest = this.spawnGuest(ZONE_START - 50, 150);
    this.recruits = [null, null]; this.grecruits = [null, null];
    this.spawnRecruits(1);
    g.cam.x = clamp(this.main.x + CAM_LEAD - W / 2, 0, ARENA_W - W);
    this.queue = []; this.wave = -1;
    this.phase = 'between'; this.phaseT = 70;
    g.banner(this.def.label, 'Vague 1 / ' + this.def.waves.length, 100);
  }
  spawnHero(id, isMain, hpFrac, x, z) {
    const o = fighterOpts(this.save, id, isMain);
    const f = this.spawnWith(CHARS[id], o, x != null ? x : ZONE_START - (isMain ? 0 : 50), z != null ? z : (isMain ? 100 : 60 + Math.random() * 80), !isMain);
    f.hp = f.hpCap = Math.max(1, f.hpMax * hpFrac);
    if (isMain) { f.leader = true; f.keepCorpse = true; f.hudTag = 'Champion'; f.hudCol = '#ffd27a'; }
    else f.hudTag = 'Recrue';
    return f;
  }
  spawnWith(def, o, x, z, ally) {
    return this.g.spawnFighter(def, {
      x, z, team: 1, facing: 1,
      hp: o.hp, atkMul: o.atkMul, defMul: o.defMul, mpMax: o.mpMax, mpRegen: o.mpRegen, mp: o.mpMax, spd: o.spd, perks: o.perks,
      ctrl: this.phase === 'camp' ? new Controller() : new AIController(0.5, o.aiP), ally,
    });
  }
  // Champion du partenaire en ligne (piloté ici par son IA, avec ses propres améliorations)
  spawnGuest(x, z) {
    if (!(this.coop && this.coop.connected)) return null;
    const G = this.coop.guestOpts;
    const f = this.spawnWith(CHARS[G.charId], G.opts, x, z, true);
    f.keepCorpse = true; f.hudTag = 'Partenaire'; f.hudCol = '#7fd8ff'; f.name = G.charName;
    return f;
  }
  // Arrivée ou départ du partenaire en cours de partie
  guestJoined() {
    if (this.atCamp && !this.guest) { this.guest = this.spawnGuest(560, 90); this.spawnRecruits(1); }
    this.g.banner('Partenaire connecté', CHARS[this.coop.guestOpts.charId].name + (this.guest ? ' rejoint le Ludus' : ' entrera dans l\'arène au prochain retour au camp'), 130, '#7fd8ff');
  }
  dropGuest() {
    if (this.guest) { this.guest.gone = true; this.g.fx('smoke', this.guest.x, 35, this.guest.z, 10); this.guest = null; }
    for (const f of this.grecruits || []) if (f && f.alive) { f.gone = true; this.g.fx('smoke', f.x, 35, f.z, 10); }
    this.grecruits = [null, null];
    this.g.banner('Partenaire déconnecté', 'Votre champion poursuit seul.', 120, '#ff9a8a');
    if (this.atCamp) this.spawnRecruits(1);
  }
  // Assigne une recrue par défaut à chaque emplacement débloqué
  ensureTeam() {
    const s = this.save, n = teamSlots(s);
    for (let k = 0; k < n; k++) {
      if (!s.team[k]) s.team[k] = PLAYABLE.find(id => id !== s.main && !s.team.includes(id));
    }
  }
  spawnRecruits(hpFrac) {
    this.ensureTeam();
    // en coopération, les recrues ne viennent qu'à partir du palier 4
    const n = this.coopOn() && !this.coopBig() ? 0 : teamSlots(this.save);
    for (let k = 0; k < 2; k++) {
      const cur = this.recruits[k];
      if (k >= n) { if (cur && cur.alive) { cur.gone = true; this.g.fx('smoke', cur.x, 35, cur.z, 10); } this.recruits[k] = null; continue; }
      const id = this.save.team[k];
      if (cur && cur.alive && cur.def.id === id) continue;
      if (cur && cur.alive) { cur.gone = true; this.g.fx('smoke', cur.x, 35, cur.z, 10); }
      const base = this.main.alive ? this.main : null;
      if (this.atCamp) this.recruits[k] = this.spawnHero(id, false, 1, 360 - k * 110, 70 + k * 80);
      else this.recruits[k] = this.spawnHero(id, false, Math.max(0.2, hpFrac), base ? base.x - 60 - k * 40 : null, base ? clamp(base.z + (k ? 50 : -50), 10, DEPTH - 10) : null);
    }
    this.spawnGuestRecruits(hpFrac);
  }
  // Recrues du partenaire (envoyées par l'invité avec leurs propres améliorations)
  spawnGuestRecruits(hpFrac) {
    if (!this.grecruits) this.grecruits = [null, null];
    const want = this.coopBig() ? (this.coop.guestOpts.team || []) : [];
    for (let k = 0; k < 2; k++) {
      const cur = this.grecruits[k], T = want[k];
      if (cur && cur.alive && T && cur.def.id === T.charId) continue;
      if (cur && cur.alive) { cur.gone = true; this.g.fx('smoke', cur.x, 35, cur.z, 10); }
      this.grecruits[k] = null;
      if (!T || !CHARS[T.charId]) continue;
      const base = this.guest && this.guest.alive ? this.guest : this.main;
      const x = this.atCamp ? 610 + k * 100 : base.x - 60 - k * 40;
      const z = this.atCamp ? 60 + k * 100 : clamp(base.z + (k ? 50 : -50), 10, DEPTH - 10);
      const f = this.spawnWith(CHARS[T.charId], T.opts, x, z, true);
      f.hp = f.hpCap = Math.max(1, f.hpMax * (this.atCamp ? 1 : Math.max(0.2, hpFrac)));
      f.hudTag = 'Recrue'; f.hudCol = '#7fd8ff';
      this.grecruits[k] = f;
    }
  }
  applyOpts(f, o) {
    if (!f || !f.alive) return;
    const r = f.hp / f.hpMax, rc = f.hpCap / f.hpMax;
    f.hpMax = Math.round(o.hp); f.hp = Math.max(1, r * f.hpMax); f.hpCap = Math.max(f.hp, rc * f.hpMax);
    f.atkMul = (f.def.atk || 1) * o.atkMul; f.defMul = (f.def.def || 1) * o.defMul;
    f.mpMax = o.mpMax; f.mp = Math.min(f.mp, f.mpMax); f.mpRegen = o.mpRegen; f.spd = o.spd; f.perks = o.perks;
    if (f.ctrl.P) f.ctrl.P = o.aiP;
    if (this.atCamp) { f.hp = f.hpCap = f.hpMax; f.mp = f.mpMax; }
  }
  // Applique immédiatement les achats de l'arbre aux combattants présents
  applyStats() {
    this.applyOpts(this.main, fighterOpts(this.save, this.main.def.id, true));
    this.recruits.forEach(f => f && this.applyOpts(f, fighterOpts(this.save, f.def.id, false)));
  }
  applyGuest() {
    if (!this.coopOn()) return;
    if (this.guest) this.applyOpts(this.guest, this.coop.guestOpts.opts);
    if (this.atCamp) this.spawnGuestRecruits(1);
    const team = this.coop.guestOpts.team || [];
    (this.grecruits || []).forEach((f, k) => { if (f && team[k] && f.def.id === team[k].charId) this.applyOpts(f, team[k].opts); });
  }
  startWave(w) {
    const g = this.g, wd = this.def.waves[w];
    this.wave = w;
    this.queue = [];
    const crowd = this.coopBig() ? COOP_CROWD : 1;
    for (const [id, n] of wd) { const c = CHARS[id].boss ? n : Math.ceil(n * crowd); for (let k = 0; k < c; k++) this.queue.push(id); }
    this.spawnT = 30;
    const boss = this.queue.some(id => CHARS[id].boss);
    if (w > 0 || boss) g.banner(boss ? 'BOSS !' : 'Vague ' + (w + 1) + ' / ' + this.def.waves.length, boss ? this.queue.filter(id => CHARS[id].boss).map(id => CHARS[id].name).join(' et ') : '', 90, boss ? '#ff6060' : '#ffe9a0');
    if (boss) Sound.music('boss');
    const L = this.save.lv.main;
    if (Math.random() < 0.12 * (L.intendance || 0)) g.dropItem('potion', this.anchor + rand(-150, 250), rand(30, 170));
    if (Math.random() < 0.15) g.dropItem(choose(['baton', 'pierre', 'caisse', 'couteau']), this.anchor + rand(-150, 250), rand(30, 170));
  }
  spawnEnemy(id) {
    const g = this.g, def = CHARS[id], D = this.def;
    const left = Math.random() < 0.3 && !def.boss && g.cam.x > 80;
    const x = left ? g.cam.x - 50 : Math.min(g.cam.x + W + 50, ARENA_W - 20);
    const f = g.spawnFighter(def, {
      x, z: rand(15, DEPTH - 15), team: 2, facing: left ? 1 : -1, offscreen: true, mp: 300,
      ai: clamp((def.ai.skill || 0.5) + D.ai, 0.05, 1),
      hpMul: D.hp * (def.boss ? D.bossHp : 1),
      atkMul: D.atk * (this.coopOn() ? COOP_ENEMY_DMG : 1),
    });
    if (def.boss) f.boss = true;
  }
  // base : XP de référence ; fixed : montant fixe (prime de résilience), non multiplié
  // at : position de l'effet visuel ; kill : un ennemi a été vaincu (statistiques)
  addXp(base, at, fixed, kill) {
    const raw = fixed ? base : base * GAME_XP * (this.coopOn() ? COOP_XP : 1);
    const n = Math.max(1, Math.round(fixed ? raw : raw * xpMul(this.save)));
    this.save.xp += n; this.save.totalXp += n;
    this.hub.logXp(n, !!at);
    if (at) xpBurst(this.g, at, n);
    if (this.coopOn()) this.coop.send({ t: 'xp', raw, fixed: !!fixed, kill: !!kill, pos: at ? { x: at.x, y: at.y, z: at.z, h: at.height } : null });
  }
  onKO(t) {
    if (t.team !== 2) return;
    this.save.stats.kills++;
    this.addXp((XPV[t.def.id] || 3) * this.def.xp, t, false, true);
  }
  heal(frac) {
    for (const f of this.heroes()) {
      if (!f.alive) continue;
      f.healPool += f.hpMax * frac; f.hpCap = Math.min(f.hpMax, f.hpCap + f.hpMax * frac);
      this.g.fx('heal', f.x, f.y + 40, f.z, 8);
    }
  }
  nextLoc() {
    const s = this.save, l = this.loc;
    if (s.mode === 'repeat') return l;
    if (l.type === 'stage') return l.i < PALIERS.length - 1 ? { type: 'stage', i: l.i + 1 } : { type: 'arena', n: 1 };
    return { type: 'arena', n: l.n + 1 };
  }
  clearLoc() {
    const s = this.save, l = this.loc;
    let first = false;
    if (l.type === 'stage') { if (s.maxStage < l.i + 1) { s.maxStage = l.i + 1; first = true; } if (l.i === PALIERS.length - 1) s.arenaMax = Math.max(s.arenaMax, 1); }
    else if (s.arenaMax < l.n + 1) { s.arenaMax = l.n + 1; first = true; }
    if (first) this.addXp(150 * this.def.xp, this.main);
    this.g.banner(l.type === 'stage' ? 'PALIER REMPORTÉ !' : 'NIVEAU REMPORTÉ !', first ? 'Première victoire : prime d\'expérience !' : this.def.label, 150);
    for (const f of this.heroes()) if (f.alive) f.wantWin = true;
    Sound.stopMusic(); Sound.play('victory');
    writeSave(s);
  }
  // Les combattants avancent vers la zone de la prochaine vague
  setGoTo(x) {
    for (const f of this.heroes()) if (f.ctrl instanceof AIController) f.ctrl.goTo = x == null ? null : x - (f === this.main ? 0 : 50);
  }
  update() {
    const g = this.g, s = this.save;
    if (this.atCamp) {
      g.update();
      if (g.t % 3 === 0) g.fx('fire', 760 + rand(-10, 10), 6, 150, 1);
      if (g.t % 9 === 0) g.fx('smoke', 760 + rand(-6, 6), 30, 150, 1, { color: '#777' });
      return;
    }
    g.update();
    const m = this.main;
    const lead = m.alive ? m : (this.heroes().find(f => f.alive) || m);
    g.follow(lead.x + CAM_LEAD);
    switch (this.phase) {
      case 'fight': {
        const count = () => g.fighters.filter(f => f.team === 2 && f.alive).length;
        const cap = this.coopBig() ? 8 : 4;
        if (this.queue.length && count() < cap && --this.spawnT <= 0) { this.spawnEnemy(this.queue.shift()); this.spawnT = randi(this.coopBig() ? 20 : 35, this.coopBig() ? 50 : 80); }
        const active = count();
        const champions = [m, this.guest].filter(Boolean);
        if (champions.every(f => !f.alive)) {
          this.phase = 'defeat'; this.phaseT = 170; s.stats.defeats++;
          this.addXp(RESILIENCE_XP, null, true);
          g.banner('DÉFAITE', 'Prime de résilience : +' + RESILIENCE_XP + ' XP. Retour au camp d\'entraînement.', 160, '#ff6060');
          Sound.stopMusic(); Sound.play('gameover');
          writeSave(s);
          break;
        }
        if (!this.queue.length && active === 0) {
          s.stats.waves++;
          this.addXp(12 * this.def.xp, null);
          if (this.wave >= this.def.waves.length - 1) { this.phase = 'clear'; this.phaseT = 200; this.clearLoc(); }
          else {
            this.phase = 'between'; this.phaseT = 110;
            this.heal(healPct(s));
            this.anchor += ZONE_STEP; this.setGoTo(this.anchor);
            if (this.def.waves[this.wave].some(([id]) => CHARS[id].boss)) Sound.music(this.def.music);
          }
        }
        break;
      }
      case 'between': {
        this.phaseT--;
        const arrived = !lead.alive || Math.abs(lead.x - this.anchor) < 90 || this.phaseT < -360;
        if (this.phaseT <= 0 && arrived) { this.setGoTo(null); this.spawnRecruits(healPct(s)); this.phase = 'fight'; this.startWave(this.wave + 1); }
        break;
      }
      case 'defeat':
        if (--this.phaseT <= 0) this.toCamp('defeat');
        break;
      case 'clear':
        if (--this.phaseT <= 0) { this.setDest(this.nextLoc()); this.toCamp('clear'); }
        break;
    }
  }
  infoPanel() {
    const g = this.g;
    return {
      lab: this.loc.type === 'stage' ? 'Palier ' + (this.loc.i + 1) + ' : ' + this.def.name : 'Arène — niveau ' + this.loc.n,
      wave: Math.max(1, this.wave + 1), nw: this.def.waves.length, rep: this.save.mode === 'repeat',
      left: this.queue.length + g.fighters.filter(f => f.team === 2 && f.alive).length,
    };
  }
  draw(ctx) {
    const g = this.g;
    g.draw(ctx);
    if (this.coopOn()) {
      drawHUD(ctx, [this.main, this.guest].filter(Boolean), g.t);
      drawMiniHUD(ctx, [...this.recruits, ...(this.grecruits || [])].filter(Boolean));
    } else drawHUD(ctx, this.heroes(), g.t);
    if (this.atCamp) return;
    drawRunPanel(ctx, this.infoPanel(), g.fighters);
  }
}

// Gain d'XP visible : gros chiffre doré, étoiles, anneau, son de récompense
function xpBurst(g, at, n) {
  const fx = g.rawFx || g.fx.bind(g);
  const big = n >= 100;
  fx('text', at.x, at.y + (at.height || 70) + 18, at.z + 1, 1, { text: '+' + fmt(n) + ' XP', color: '#ffd84a', size: big ? 26 : 22 });
  fx('star', at.x, at.y + (at.height || 70) * 0.6, at.z + 1, big ? 8 : 5);
  fx('ring', at.x, 4, at.z, 1, { color: '#ffd84a', size: 34 });
  Sound.play('xp');
}
// Recrues en coopération : petites jauges sous les portraits des champions
function drawMiniHUD(ctx, list) {
  list.slice(0, 4).forEach((f, i) => {
    const x = 6 + i * 118, y = 68;
    panel(ctx, x, y, 114, 26, { r: 5, fill: 'rgba(8,6,18,0.72)', stroke: f.hudCol === '#7fd8ff' ? 'rgba(127,216,255,0.7)' : 'rgba(255,210,122,0.6)', lw: 1.5 });
    txt(ctx, f.name, x + 6, y + 11, { size: 10, color: f.dead ? '#ff7070' : '#fff' });
    drawBar(ctx, x + 6, y + 15, 102, 6, f.dead ? 0 : f.hp / f.hpMax, '#e8343c', f.hpCap / f.hpMax);
  });
}
// Panneau du lieu (en haut à droite) et barre du boss
function drawRunPanel(ctx, info, fighters) {
  panel(ctx, W - 214, 6, 208, 58, { r: 6, fill: 'rgba(8,6,18,0.78)' });
  txt(ctx, info.lab, W - 110, 26, { size: info.lab.length > 26 ? 12 : 14, color: '#ffe9a0', align: 'center' });
  txt(ctx, 'Vague ' + info.wave + ' / ' + info.nw + (info.rep ? '   (répétition)' : ''), W - 110, 46, { size: 12, align: 'center', color: '#ddd' });
  txt(ctx, 'Ennemis restants : ' + info.left, W - 110, 60, { size: 10, align: 'center', color: '#aaa', w: 'normal' });
  const bosses = fighters.filter(f => f.boss && f.team === 2 && !f.dead && !f.gone);
  if (bosses.length) drawBossBar(ctx, bosses[0], 476);
  if (bosses.length > 1) txt(ctx, '+ ' + (bosses.length - 1) + ' autre(s) boss', W / 2 + 280, 470, { size: 12, align: 'right', color: '#ffd27a' });
}
