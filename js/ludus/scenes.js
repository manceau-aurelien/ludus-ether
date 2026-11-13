'use strict';
// =====================================================================
//  LUDUS — interface : souris, titre, recrutement, école (combat + arbres)
// =====================================================================
const Mouse = {
  x: -1, y: -1, clicked: false, cv: null,
  init(cv) {
    this.cv = cv;
    const pos = e => { const r = cv.getBoundingClientRect(); this.x = (e.clientX - r.left) * W / r.width; this.y = (e.clientY - r.top) * H / r.height; };
    cv.addEventListener('mousemove', pos);
    cv.addEventListener('mousedown', e => { pos(e); this.clicked = true; Sound.unlock(); });
    cv.addEventListener('mouseleave', () => { this.x = -1; this.y = -1; });
  },
  in(r) { return this.x >= r.x && this.x < r.x + r.w && this.y >= r.y && this.y < r.y + r.h; },
  hit(r) { return this.clicked && this.in(r); },
};
let hoverPointer = false;
function button(ctx, r, label, o = {}) {
  const hov = Mouse.in(r) && !o.disabled;
  if (hov) hoverPointer = true;
  rrect(ctx, r.x, r.y, r.w, r.h, o.radius || 6);
  ctx.fillStyle = o.disabled ? 'rgba(40,36,52,0.85)' : o.active ? (o.activeCol || 'rgba(170,110,255,0.85)') : hov ? 'rgba(90,70,150,0.95)' : (o.fill || 'rgba(26,18,48,0.92)');
  ctx.fill();
  ctx.lineWidth = o.active || hov ? 2.5 : 1.5;
  ctx.strokeStyle = o.disabled ? 'rgba(120,110,140,0.5)' : o.border || (o.active ? '#ffe9a0' : 'rgba(180,150,255,0.7)');
  ctx.stroke();
  txt(ctx, label, r.x + r.w / 2, r.y + r.h / 2 + (o.size || 14) * 0.36, { size: o.size || 14, align: 'center', color: o.disabled ? '#777' : (o.color || '#fff') });
}
function ludusBackdrop(ctx, t) {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#120a04'); g.addColorStop(0.6, '#3a1f0e'); g.addColorStop(1, '#1a0d06');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  for (let i = 0; i < 50; i++) {
    const x = (i * 137.5 + t * (0.15 + (i % 5) * 0.05)) % W, y = H - ((i * 71.3 + t * 0.4) % H);
    ctx.fillStyle = 'rgba(255,170,80,' + (0.12 + (i % 4) * 0.08) + ')'; ctx.fillRect(x, y, 2, 2);
  }
}
function ludusLogo(ctx, x, y, t) {
  ctx.save(); ctx.translate(x, y);
  const g = ctx.createLinearGradient(0, -60, 0, 10);
  g.addColorStop(0, '#fff3c8'); g.addColorStop(0.55, '#f0b24a'); g.addColorStop(1, '#a8501a');
  ctx.font = 'bold 84px ' + FONT; ctx.textAlign = 'center'; ctx.lineJoin = 'round';
  ctx.lineWidth = 14; ctx.strokeStyle = '#1a0a04'; ctx.strokeText('LUDUS', 0, 0);
  ctx.lineWidth = 4; ctx.strokeStyle = '#c0703a'; ctx.strokeText('LUDUS', 0, 0);
  ctx.fillStyle = g; ctx.fillText('LUDUS', 0, 0);
  // glaives croisés
  for (const s of [-1, 1]) {
    ctx.save(); ctx.translate(s * 175, -28); ctx.rotate(s * (0.7 + Math.sin(t * 2) * 0.03));
    ctx.fillStyle = '#d8dde6'; ctx.beginPath(); ctx.moveTo(0, -42); ctx.lineTo(6, -30); ctx.lineTo(4, 14); ctx.lineTo(-4, 14); ctx.lineTo(-6, -30); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = OUT; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = '#c9a227'; ctx.fillRect(-12, 14, 24, 5); ctx.fillStyle = '#5a3a20'; ctx.fillRect(-3, 19, 6, 16);
    ctx.restore();
  }
  txt(ctx, 'L\'École des Gardiens', 0, 38, { size: 24, color: '#ffe0b0', align: 'center' });
  ctx.restore();
}

// ---------------------------------------------------------------------
//  Écran titre
// ---------------------------------------------------------------------
class LudusTitle {
  constructor() {
    this.t = 0; this.sel = 0; this.confirmNew = false; this.newDemo();
    Sound.music('title');
  }
  newDemo() {
    const g = this.demo = new Battle({ theme: 'arena', worldW: W });
    shuffle(PLAYABLE.slice()).slice(0, 2).forEach((id, i) => g.spawnFighter(CHARS[id], { x: 300 + i * 360, z: 90 + i * 30, team: i + 1, ai: 0.6, facing: i ? -1 : 1, mp: 500 }));
    this.demoT = 0;
  }
  items() {
    const last = Store.get('lastSlot', 0), save = last ? loadSave(last) : null;
    const it = [];
    if (save) it.push({ id: 'cont', label: 'Continuer : ' + CHARS[save.main].name + ' (école ' + last + ')' });
    it.push({ id: 'play', label: 'Mes écoles (5 emplacements)' });
    it.push({ id: 'coop', label: 'Coopération en ligne' });
    it.push({ id: 'classic', label: 'Bonus : Éclats d\'Éther (jeu classique)' });
    it.push({ id: 'music', label: 'Musique : ' + (Sound.musicOn ? 'Oui' : 'Non') });
    it.push({ id: 'sfx', label: 'Effets sonores : ' + (Sound.sfxOn ? 'Oui' : 'Non') });
    return it;
  }
  rect(i) { return { x: W / 2 - 220, y: 226 + i * 44, w: 440, h: 36 }; }
  activate(it) {
    Sound.play('confirm');
    if (it.id === 'cont') { const s = loadSave(Store.get('lastSlot', 0)); if (s) enterSchool(s); }
    else if (it.id === 'play') App.set(new SlotScene('play'));
    else if (it.id === 'coop') App.set(new SlotScene('coop'));
    else if (it.id === 'classic') location.href = 'classique/index.html';
    else if (it.id === 'music') Sound.setMusic(!Sound.musicOn);
    else if (it.id === 'sfx') Sound.setSfx(!Sound.sfxOn);
  }
  update() {
    this.t++; this.demoT++;
    this.demo.update(); this.demo.cam.x = 0;
    if (this.demo.fighters.filter(f => f.alive).length < 2 && this.demoT > 200 || this.demoT > 60 * 40) this.newDemo();
    const items = this.items(), n = items.length, m = menuIn();
    this.sel = Math.min(this.sel, n - 1);
    if (m.up) { this.sel = (this.sel + n - 1) % n; this.confirmNew = false; Sound.play('select'); }
    if (m.down) { this.sel = (this.sel + 1) % n; this.confirmNew = false; Sound.play('select'); }
    items.forEach((it, i) => { if (Mouse.hit(this.rect(i))) { this.sel = i; this.activate(it); } });
    if (m.ok) this.activate(items[this.sel]);
  }
  draw(ctx) {
    this.demo.draw(ctx, { noBanner: true });
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, 'rgba(20,8,2,0.88)'); g.addColorStop(0.5, 'rgba(20,8,2,0.45)'); g.addColorStop(1, 'rgba(20,8,2,0.85)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ludusLogo(ctx, W / 2, 140, this.t / 60);
    this.items().forEach((it, i) => button(ctx, this.rect(i), it.label, { active: i === this.sel, size: 17, activeCol: 'rgba(170,90,30,0.9)' }));
    txt(ctx, 'Souris ou clavier (flèches, Entrée, Échap)   •   M : musique', W / 2, H - 14, { size: 13, color: 'rgba(255,230,200,0.75)', align: 'center', w: 'normal' });
    if (!Sound.ctx && (this.t >> 5) % 2) txt(ctx, 'Cliquez ou appuyez sur une touche pour activer le son', W / 2, H - 36, { size: 13, color: '#ffe9a0', align: 'center' });
  }
}

// ---------------------------------------------------------------------
//  Choix du premier gladiateur
// ---------------------------------------------------------------------
class ChooseScene {
  constructor(slot) { this.t = 0; this.sel = 0; this.slot = slot; }
  cell(i) { return { x: 40 + (i % 4) * 112, y: 96 + Math.floor(i / 4) * 128, w: 100, h: 116 }; }
  goBtn() { return { x: 520, y: 448, w: 400, h: 46 }; }
  update() {
    this.t++;
    const m = menuIn();
    if (m.left) { this.sel = (this.sel + 7) % 8; Sound.play('select'); }
    if (m.right) { this.sel = (this.sel + 1) % 8; Sound.play('select'); }
    if (m.up || m.down) { this.sel = (this.sel + 4) % 8; Sound.play('select'); }
    for (let i = 0; i < 8; i++) if (Mouse.hit(this.cell(i))) { this.sel = i; Sound.play('select'); }
    if (m.back) { Sound.play('back'); App.set(new SlotScene('play')); return; }
    if (m.ok || Mouse.hit(this.goBtn())) {
      Sound.play('confirm');
      const s = newSave(PLAYABLE[this.sel], this.slot);
      writeSave(s);
      enterSchool(s);
    }
  }
  draw(ctx) {
    ludusBackdrop(ctx, this.t);
    txt(ctx, 'Recrutez votre premier gladiateur', W / 2, 46, { size: 30, color: '#ffe0b0', align: 'center' });
    txt(ctx, 'Il arrive au Ludus sans savoir se battre. Ce choix est définitif : ce sera votre champion.', W / 2, 74, { size: 14, color: '#e8d0b0', align: 'center', w: 'normal' });
    PLAYABLE.forEach((id, i) => {
      const r = this.cell(i);
      drawPortrait(ctx, CHARS[id], r.x, r.y, r.w, r.h - 18, { time: this.t });
      ctx.strokeStyle = i === this.sel ? '#ffd27a' : 'rgba(255,200,140,0.35)'; ctx.lineWidth = i === this.sel ? 4 : 2; ctx.strokeRect(r.x, r.y, r.w, r.h - 18);
      txt(ctx, CHARS[id].name, r.x + r.w / 2, r.y + r.h - 2, { size: 14, align: 'center', color: i === this.sel ? '#ffd27a' : '#fff' });
      if (Mouse.in(r)) hoverPointer = true;
    });
    const def = CHARS[PLAYABLE[this.sel]];
    const x = 500, y = 96;
    panel(ctx, x, y, 440, 340, { stroke: 'rgba(255,200,120,0.7)', fill: 'rgba(30,14,6,0.85)' });
    ctx.save(); ctx.translate(x + 80, y + 230); ctx.scale(2.2, 2.2);
    const p = lerpPose(POSES.guard, POSES.stand, 0.15); const b = Math.sin(this.t * 0.09); p.lean += b; p.kF += b * 3; p.kB += b * 3;
    drawBody(ctx, Object.assign({}, def.look, { scale: 1 }), p, { time: this.t, weapon: def.look.weapon });
    ctx.restore();
    txt(ctx, def.name, x + 170, y + 40, { size: 28, color: '#ffd27a' });
    txt(ctx, def.title + '  •  ' + def.element, x + 170, y + 64, { size: 15, color: '#ffe0b0' });
    wrapText(ctx, def.desc, 250, 13, 'normal').forEach((s, i) => txt(ctx, s, x + 170, y + 92 + i * 18, { size: 13, w: 'normal', color: '#eee' }));
    txt(ctx, 'Pouvoirs à apprendre :', x + 170, y + 166, { size: 14, color: '#ffe9a0' });
    spKeys(def).forEach((k, i) => txt(ctx, cmdLabel(k) + '  ' + def.specials[k].name, x + 170, y + 190 + i * 20, { size: 13, w: 'normal' }));
    txt(ctx, 'Vie de base ' + def.hp + '   •   Force ×' + (def.atk || 1), x + 170, y + 290, { size: 12, color: '#c8b090', w: 'normal' });
    button(ctx, this.goBtn(), 'Recruter ' + def.name + ' (Entrée)', { size: 18, fill: 'rgba(120,60,20,0.9)', border: '#ffd27a' });
  }
}

// ---------------------------------------------------------------------
//  L'école : combat permanent + barre d'outils + fenêtres
// ---------------------------------------------------------------------
const BAR_Y = 504;
class LudusHub {
  constructor(save, coop) {
    this.save = save; this.t = 0; this.xpLog = [];
    this.coop = coop || null; App.coopHost = this.coop;
    save.speed = clamp(save.speed || 1, 1, maxSpeed(save));
    this.run = new Run(this);
    if (this.coop) this.coop.run = this.run;
    this.overlay = save.tuto ? new TutoView(this) : null;
  }
  logXp(n, kill) { this.xpLog.push([this.t, n]); this.xpPulse = kill ? 40 : Math.max(this.xpPulse || 0, 20); this.lastGain = n; }
  xpRate() { const since = this.t - 3600; this.xpLog = this.xpLog.filter(e => e[0] > since); return this.xpLog.reduce((s, e) => s + e[1], 0); }
  speedRect(i) { return { x: 300 + i * 40, y: BAR_Y + 2, w: 36, h: 28 }; }
  rects() {
    return { mode: { x: 470, y: BAR_Y + 2, w: 168, h: 28 }, paliers: { x: 646, y: BAR_Y + 2, w: 140, h: 28 }, tree: { x: 794, y: BAR_Y + 2, w: 160, h: 28 } };
  }
  anyAffordable() {
    const s = this.save;
    const tabs = ['ia', 'skills', 'stats', 'util'];
    for (let k = 0; k < teamSlots(s); k++) if (s.team[k]) tabs.push('r' + k);
    for (const tab of tabs) {
      const owner = tab[0] === 'r' ? s.team[+tab[1]] : 'main';
      const L = levelsOf(s, owner);
      for (const n of tabNodes(s, tab)) { const l = L[n.id] || 0; if (l < n.max && reqMet(n, L) && nodeCost(n, l) <= s.xp) return true; }
    }
    return false;
  }
  campRects() { return { box: { x: 250, y: 74, w: 460, h: 168 }, go: { x: 268, y: 192, w: 206, h: 38 }, auto: { x: 486, y: 192, w: 206, h: 38 } }; }
  setSpeed(v) { if (v <= maxSpeed(this.save)) { this.save.speed = v; Sound.play('select'); } else Sound.play('nomp'); }
  toggleMode() { this.save.mode = this.save.mode === 'repeat' ? 'progress' : 'repeat'; Sound.play('select'); writeSave(this.save); }
  update() {
    this.t++;
    const s = this.save;
    s.stats.time++;
    if (this.xpPulse > 0) this.xpPulse--;
    let pause = false;
    if (this.overlay) {
      const r = this.overlay.update();
      pause = !!this.overlay.pauseGame;
      if (r === 'close') this.overlay = null;
      if (r === 'title') { writeSave(s); if (this.coop) { this.coop.close(); App.coopHost = null; } App.set(new LudusTitle()); return; }
    } else {
      const R = this.rects();
      for (let i = 0; i < 4; i++) if (Keys.hit('Digit' + (i + 1), 'Numpad' + (i + 1)) || Mouse.hit(this.speedRect(i))) this.setSpeed(i + 1);
      if (Keys.hit('KeyR') || Mouse.hit(R.mode)) this.toggleMode();
      if (this.run.atCamp) {
        const C = this.campRects();
        if (Keys.hit('Enter', 'Space') || Mouse.hit(C.go)) this.run.depart();
        else if (Keys.hit('KeyO') || Mouse.hit(C.auto)) { s.autoDepart = s.autoDepart === false; Sound.play('select'); writeSave(s); }
      }
      if (Keys.hit('KeyT') || Mouse.hit(R.tree)) { this.overlay = new TreeView(this); Sound.play('confirm'); }
      else if (Keys.hit('KeyP') || Mouse.hit(R.paliers)) { this.overlay = new PalierView(this); Sound.play('confirm'); }
      else if (Keys.hit('Escape')) { this.overlay = new MenuView(this); Sound.play('select'); }
    }
    if (this.coop) this.coop.recording = true;
    if (!pause) for (let i = 0; i < s.speed; i++) this.run.update();
    if (this.coop) { this.coop.recording = false; this.coop.frame(this.run, this); }
    // départ automatique du camp (suspendu tant qu'une fenêtre est ouverte)
    if (this.run.atCamp && !this.overlay && s.autoDepart !== false) { this.run.campT -= s.speed; if (this.run.campT <= 0) this.run.depart(); }
    if (this.t % 600 === 0) writeSave(s);
  }
  drawBar(ctx) {
    const s = this.save;
    ctx.fillStyle = 'rgba(14,8,4,0.92)'; ctx.fillRect(0, BAR_Y - 2, W, H - BAR_Y + 2);
    ctx.fillStyle = '#c9a227'; ctx.fillRect(0, BAR_Y - 2, W, 2);
    const pu = this.xpPulse || 0;
    if (pu > 0) {
      ctx.fillStyle = 'rgba(255,216,74,' + (pu / 40 * 0.35) + ')'; ctx.fillRect(0, BAR_Y, 250, H - BAR_Y);
      txt(ctx, '+' + fmt(this.lastGain), 128, BAR_Y - 6 - (40 - pu) * 0.6, { size: 16, color: '#ffd84a', align: 'right' });
    }
    txt(ctx, 'XP : ' + fmt(s.xp), 10, BAR_Y + 19, { size: 17 + pu / 10, color: pu > 0 ? '#ffe98a' : '#7dff9a' });
    if (this.coop) txt(ctx, this.coop.connected ? 'Coop en ligne : ' + this.coop.guestOpts.charName + '  •  ennemis ×2, XP ×2' : 'Coop : partenaire déconnecté (code ' + this.coop.code + ')', 10, 80, { size: 12, color: '#7fd8ff' });
    txt(ctx, '+' + fmt(this.xpRate()) + ' / min', 150, BAR_Y + 18, { size: 12, color: '#bfe8c8', w: 'normal' });
    txt(ctx, 'Vitesse', 258, BAR_Y + 21, { size: 11, color: '#ccc', w: 'normal' });
    const mx = maxSpeed(s);
    for (let i = 0; i < 4; i++) button(ctx, this.speedRect(i), '×' + (i + 1), { active: s.speed === i + 1, disabled: i + 1 > mx, size: 13 });
    const R = this.rects();
    button(ctx, R.mode, s.mode === 'repeat' ? 'Mode : Répéter (R)' : 'Mode : Avancer (R)', { size: 13, color: s.mode === 'repeat' ? '#ffd27a' : '#fff' });
    button(ctx, R.paliers, 'Paliers (P)', { size: 13 });
    const aff = this.anyAffordable();
    button(ctx, R.tree, 'Arbre (T)' + (aff ? '  !' : ''), { size: 14, fill: aff ? 'rgba(40,110,50,0.95)' : undefined, border: aff ? '#7dff9a' : undefined });
  }
  drawCamp(ctx) {
    const s = this.save, run = this.run, C = this.campRects(), b = C.box;
    panel(ctx, b.x, b.y, b.w, b.h, { fill: 'rgba(34,16,6,0.9)', stroke: '#ffd27a', lw: 3 });
    txt(ctx, "Camp d'entraînement", W / 2, b.y + 30, { size: 24, color: '#ffd27a', align: 'center' });
    const why = { start: 'Votre gladiateur se prépare pour sa prochaine sortie.', defeat: 'Défaite... la prime de résilience a été versée. Il panse ses plaies.',
      clear: 'Victoire ! Le Ludus célèbre son champion.', retreat: 'Repli ordonné : nouvelle destination choisie.' }[run.campReason] || '';
    txt(ctx, why, W / 2, b.y + 54, { size: 13, align: 'center', w: 'normal', color: '#f4e6d4' });
    txt(ctx, 'Prochain combat : ' + run.def.label, W / 2, b.y + 78, { size: 15, align: 'center', color: '#fff' });
    if (this.coop) {
      const c = this.coop;
      txt(ctx, c.connected ? 'Partenaire : ' + c.guestOpts.charName + (c.guestReady ? ' — prêt !' : ' — se prépare…') : 'Coopération : en attente d\'un partenaire (code ' + c.code + ')',
        W / 2, b.y + 100, { size: 13, align: 'center', w: 'normal', color: c.guestReady ? '#7dff9a' : '#7fd8ff' });
    } else txt(ctx, "C'est ici que vous validez vos points dans l'Arbre (T).", W / 2, b.y + 100, { size: 13, align: 'center', w: 'normal', color: '#7dff9a' });
    button(ctx, C.go, 'Partir au combat (Entrée)', { size: 14, fill: 'rgba(120,60,20,0.95)', border: '#ffd27a' });
    const auto = s.autoDepart !== false;
    button(ctx, C.auto, auto ? 'Départ auto : ' + Math.ceil(Math.max(0, run.campT) / 60) + ' s (O)' : 'Départ auto : non (O)', { size: 13, color: auto ? '#ffe9a0' : '#bbb' });
  }
  draw(ctx) {
    if (this.overlay && this.overlay.full) this.overlay.draw(ctx);
    else {
      this.run.draw(ctx);
      if (this.run.atCamp) this.drawCamp(ctx);
      this.drawBar(ctx);
      if (this.overlay) this.overlay.draw(ctx);
    }
  }
}

// ---------------------------------------------------------------------
//  Fenêtre : tutoriel de départ
// ---------------------------------------------------------------------
class TutoView {
  constructor(hub) { this.hub = hub; this.pauseGame = true; }
  btn() { return { x: W / 2 - 150, y: 420, w: 300, h: 44 }; }
  update() {
    if (menuIn().ok || Mouse.hit(this.btn())) { this.hub.save.tuto = false; writeSave(this.hub.save); Sound.play('confirm'); return 'close'; }
    return null;
  }
  draw(ctx) {
    ctx.fillStyle = 'rgba(10,4,0,0.72)'; ctx.fillRect(0, 0, W, H);
    panel(ctx, 110, 60, 740, 420, { fill: 'rgba(34,16,6,0.96)', stroke: '#ffd27a', lw: 3 });
    const def = CHARS[this.hub.save.main];
    txt(ctx, 'Bienvenue au Ludus de l\'Éther', W / 2, 104, { size: 28, color: '#ffd27a', align: 'center' });
    const lines = [
      def.name + ' vient d\'arriver dans votre école. Pour l\'instant, il ne sait presque rien :',
      'il réagit lentement, se place mal, ne bloque jamais et ne connaît aucun pouvoir.',
      '',
      'Il combat seul, sans votre intervention. Chaque ennemi vaincu rapporte de l\'expérience,',
      'et même une défaite rapporte une petite prime de résilience.',
      "Après chaque défaite ou palier remporté, il rentre au camp d'entraînement :",
      "c'est là, et seulement là, que vous validez vos points. L'arbre se consulte à tout moment.",
      'Dépensez l\'expérience dans l\'Arbre (T) :',
      '•  Intelligence : ses réflexes, sa garde, ses combos, sa gestion de la mana...',
      '•  Compétences : enchaînements, course, sauts, puis ses pouvoirs élémentaires.',
      '•  Statistiques : force, résistance, vie, mana.',
      '•  Utilitaire : vitesse du temps, bonus d\'expérience, soins, et plus tard une équipe.',
      '',
      'Astuce : un pouvoir ne sert à rien sans mana... ni sans un peu de jugeote !',
    ];
    lines.forEach((s, i) => txt(ctx, s, 136, 138 + i * 20, { size: 14, w: i >= 5 && i <= 7 ? 'bold' : 'normal', color: i === 7 ? '#ffe9a0' : i === 5 || i === 6 ? '#7dff9a' : '#f4e6d4' }));
    button(ctx, this.btn(), 'Commencer l\'entraînement', { size: 17, fill: 'rgba(120,60,20,0.95)', border: '#ffd27a' });
  }
}

// ---------------------------------------------------------------------
//  Fenêtre : menu (Échap)
// ---------------------------------------------------------------------
class MenuView {
  constructor(hub) { this.hub = hub; this.sel = 0; }
  items() { return ['Reprendre', 'Musique : ' + (Sound.musicOn ? 'Oui' : 'Non'), 'Effets sonores : ' + (Sound.sfxOn ? 'Oui' : 'Non'), 'Sauvegarder et revenir au titre']; }
  rect(i) { return { x: W / 2 - 180, y: 190 + i * 50, w: 360, h: 40 }; }
  act(i) {
    Sound.play('confirm');
    if (i === 0) return 'close';
    if (i === 1) Sound.setMusic(!Sound.musicOn);
    if (i === 2) Sound.setSfx(!Sound.sfxOn);
    if (i === 3) return 'title';
    return null;
  }
  update() {
    const m = menuIn();
    if (Keys.hit('Escape')) return 'close';
    if (m.up) this.sel = (this.sel + 3) % 4;
    if (m.down) this.sel = (this.sel + 1) % 4;
    for (let i = 0; i < 4; i++) if (Mouse.hit(this.rect(i))) { this.sel = i; return this.act(i); }
    if (m.ok) return this.act(this.sel);
    return null;
  }
  draw(ctx) {
    ctx.fillStyle = 'rgba(10,4,0,0.6)'; ctx.fillRect(0, 0, W, H);
    txt(ctx, 'MENU', W / 2, 160, { size: 34, color: '#ffd27a', align: 'center' });
    this.items().forEach((s, i) => button(ctx, this.rect(i), s, { active: i === this.sel, size: 16, activeCol: 'rgba(170,90,30,0.9)' }));
    const st = this.hub.save.stats;
    txt(ctx, 'Ennemis vaincus : ' + fmt(st.kills) + '   •   Défaites : ' + st.defeats + '   •   Expérience totale : ' + fmt(this.hub.save.totalXp), W / 2, 420, { size: 14, align: 'center', color: '#e8d0b0', w: 'normal' });
  }
}

// ---------------------------------------------------------------------
//  Fenêtre : choix du palier
// ---------------------------------------------------------------------
class PalierView {
  constructor(hub) {
    this.hub = hub; const s = hub.save;
    this.arenaN = s.loc.type === 'arena' ? s.loc.n : Math.max(1, s.arenaMax);
    this.sel = s.loc.type === 'stage' ? s.loc.i : PALIERS.length;
  }
  rows() { return PALIERS.length + (this.hub.save.arenaMax > 0 ? 1 : 0); }
  rect(i) { return { x: 120, y: 92 + i * 58, w: 720, h: 50 }; }
  unlocked(i) { const s = this.hub.save; return i < PALIERS.length ? i <= s.maxStage : s.arenaMax > 0; }
  go(i) {
    if (!this.unlocked(i)) { Sound.play('nomp'); return null; }
    const loc = i < PALIERS.length ? { type: 'stage', i } : { type: 'arena', n: this.arenaN };
    Sound.play('confirm'); this.hub.run.goto(loc); writeSave(this.hub.save);
    return 'close';
  }
  update() {
    const m = menuIn(), n = this.rows(), s = this.hub.save;
    if (m.back || Keys.hit('KeyP')) { Sound.play('back'); return 'close'; }
    if (m.up) { this.sel = (this.sel + n - 1) % n; Sound.play('select'); }
    if (m.down) { this.sel = (this.sel + 1) % n; Sound.play('select'); }
    if (this.sel === PALIERS.length) {
      if (m.left) this.arenaN = Math.max(1, this.arenaN - 1);
      if (m.right) this.arenaN = Math.min(s.arenaMax, this.arenaN + 1);
    }
    for (let i = 0; i < n; i++) {
      const r = this.rect(i);
      if (i === PALIERS.length) {
        if (Mouse.hit({ x: r.x + 430, y: r.y + 10, w: 30, h: 30 })) { this.arenaN = Math.max(1, this.arenaN - 1); this.sel = i; return null; }
        if (Mouse.hit({ x: r.x + 530, y: r.y + 10, w: 30, h: 30 })) { this.arenaN = Math.min(s.arenaMax, this.arenaN + 1); this.sel = i; return null; }
      }
      if (Mouse.hit(r)) { this.sel = i; return this.go(i); }
    }
    if (m.ok) return this.go(this.sel);
    return null;
  }
  draw(ctx) {
    const s = this.hub.save;
    ctx.fillStyle = 'rgba(10,4,0,0.8)'; ctx.fillRect(0, 0, W, H);
    txt(ctx, 'PALIERS DU LUDUS', W / 2, 56, { size: 30, color: '#ffd27a', align: 'center' });
    txt(ctx, 'Rejouez un palier déjà franchi pour accumuler de l\'expérience, ou tentez le suivant.', W / 2, 78, { size: 13, color: '#e8d0b0', align: 'center', w: 'normal' });
    for (let i = 0; i < this.rows(); i++) {
      const r = this.rect(i), un = this.unlocked(i), on = i === this.sel;
      const isArena = i === PALIERS.length;
      const cur = isArena ? s.loc.type === 'arena' : s.loc.type === 'stage' && s.loc.i === i;
      if (Mouse.in(r) && un) hoverPointer = true;
      panel(ctx, r.x, r.y, r.w, r.h, { fill: on ? 'rgba(110,60,20,0.9)' : 'rgba(30,16,8,0.9)', stroke: on ? '#ffd27a' : un ? 'rgba(255,200,140,0.5)' : 'rgba(120,110,100,0.4)', lw: on ? 3 : 2 });
      const P = isArena ? locDef({ type: 'arena', n: this.arenaN }) : PALIERS[i];
      txt(ctx, isArena ? 'Arène des Champions' : 'Palier ' + (i + 1) + ' — ' + P.name, r.x + 16, r.y + 22, { size: 17, color: un ? '#fff' : '#777' });
      const boss = P.waves[P.waves.length - 1].filter(([id]) => CHARS[id].boss).map(([id]) => CHARS[id].name).join(', ');
      txt(ctx, un ? 'Boss : ' + boss + '   •   XP ×' + (P.xp < 10 && P.xp % 1 ? P.xp.toFixed(1).replace('.', ',') : fmt(P.xp)) : 'Verrouillé : remportez le palier précédent', r.x + 16, r.y + 41, { size: 12, color: un ? '#e8d0b0' : '#777', w: 'normal' });
      let status = !un ? 'Verrouillé' : isArena ? 'Record : niveau ' + Math.max(0, s.arenaMax - 1) : (s.maxStage > i ? 'Remporté' : 'À conquérir');
      if (cur) status = 'En cours';
      if (isArena && un) {
        button(ctx, { x: r.x + 430, y: r.y + 10, w: 30, h: 30 }, '◄', { size: 14 });
        txt(ctx, 'Niveau ' + this.arenaN, r.x + 495, r.y + 31, { size: 15, align: 'center', color: '#ffd27a' });
        button(ctx, { x: r.x + 530, y: r.y + 10, w: 30, h: 30 }, '►', { size: 14 });
      }
      txt(ctx, status, r.x + r.w - 14, r.y + 31, { size: 14, align: 'right', color: cur ? '#7dff9a' : un ? '#ffd27a' : '#777' });
    }
    txt(ctx, 'Entrée / clic : choisir la destination (repli au camp si en combat)   •   ◄ ► : niveau d\'arène   •   Échap : fermer', W / 2, H - 16, { size: 13, color: '#e8d0b0', align: 'center', w: 'normal' });
  }
}

// ---------------------------------------------------------------------
//  Fenêtre : arbre de compétences
// ---------------------------------------------------------------------
const CARD_W = 178, CARD_H = 60;
const cardRect = pos => ({ x: 14 + pos[0] * 189, y: 60 + pos[1] * 72, w: CARD_W, h: CARD_H });
class TreeView {
  constructor(hub) { this.hub = hub; this.full = true; this.tab = 0; this.sel = 0; this.flashT = 0; }
  tabs() {
    const s = this.hub.save, t = [{ id: 'ia', label: 'Intelligence' }, { id: 'skills', label: 'Compétences' }, { id: 'stats', label: 'Statistiques' }, { id: 'util', label: 'Utilitaire' }];
    for (let k = 0; k < teamSlots(s); k++) { this.hub.run.ensureTeam(); t.push({ id: 'r' + k, label: 'Recrue ' + (k + 1) }); }
    return t;
  }
  tabRect(i) { return { x: 14 + i * 130, y: 10, w: 124, h: 34 }; }
  owner(tab) { return tab[0] === 'r' ? this.hub.save.team[+tab[1]] : 'main'; }
  items() {
    const tab = this.tabs()[this.tab].id;
    const list = tabNodes(this.hub.save, tab).map(n => ({ n, pos: n.pos }));
    if (tab[0] === 'r') list.push({ chooser: true, pos: [3, 1] });
    return list;
  }
  buyRect() { return { x: 766, y: 470, w: 180, h: 46 }; }
  closeRect() { return { x: W - 40, y: 10, w: 30, h: 34 }; }
  move(dc, dr) {
    const it = this.items(), cur = it[this.sel].pos;
    let best = -1, bs = 1e9;
    it.forEach((o, i) => {
      const c = o.pos[0] - cur[0], r = o.pos[1] - cur[1];
      if (dc && sign(c) !== dc) return; if (dr && sign(r) !== dr) return;
      const score = dc ? Math.abs(c) + Math.abs(r) * 3 : Math.abs(r) + Math.abs(c) * 3;
      if (score < bs) { bs = score; best = i; }
    });
    if (best >= 0) { this.sel = best; Sound.play('select'); }
  }
  cycleRecruit(k, d) {
    const s = this.hub.save;
    const pool = PLAYABLE.filter(id => id !== s.main && id !== s.team[1 - k]);
    const i = pool.indexOf(s.team[k]);
    s.team[k] = pool[(i + d + pool.length) % pool.length];
    this.hub.run.spawnRecruits(1);
    writeSave(s); Sound.play('select');
  }
  buy(it) {
    const s = this.hub.save, tab = this.tabs()[this.tab].id;
    if (!this.hub.run.atCamp) { Sound.play('nomp'); this.campT = 60; return; }
    if (it.chooser) { this.cycleRecruit(+tab[1], 1); return; }
    const n = it.n, L = levelsOf(s, this.owner(tab)), l = L[n.id] || 0;
    if (l >= n.max || !reqMet(n, L)) { Sound.play('nomp'); return; }
    const c = nodeCost(n, l);
    if (s.xp < c) { Sound.play('nomp'); this.flashT = 20; return; }
    s.xp -= c; L[n.id] = l + 1;
    if (n.id === 'team1' || n.id === 'team2') this.hub.run.spawnRecruits(1);
    this.hub.run.applyStats();
    writeSave(s); Sound.play('confirm');
  }
  update() {
    const tabs = this.tabs();
    this.tab = Math.min(this.tab, tabs.length - 1);
    if (this.flashT > 0) this.flashT--;
    if (this.campT > 0) this.campT--;
    const m = menuIn();
    if (Keys.hit('Escape', 'KeyT') || Mouse.hit(this.closeRect())) { Sound.play('back'); return 'close'; }
    const switchTab = i => { this.tab = (i + tabs.length) % tabs.length; this.sel = 0; Sound.play('select'); };
    if (Keys.hit('Tab')) switchTab(this.tab + 1);
    tabs.forEach((t, i) => { if (Mouse.hit(this.tabRect(i))) switchTab(i); });
    const it = this.items();
    this.sel = Math.min(this.sel, it.length - 1);
    if (m.left) this.move(-1, 0); if (m.right) this.move(1, 0);
    if (m.up) this.move(0, -1); if (m.down) this.move(0, 1);
    it.forEach((o, i) => {
      const r = cardRect(o.pos);
      if (!Mouse.hit(r)) return;
      if (o.chooser) { this.sel = i; if (this.hub.run.atCamp) this.cycleRecruit(+tabs[this.tab].id[1], Mouse.x < r.x + r.w / 2 ? -1 : 1); else { Sound.play('nomp'); this.campT = 60; } }
      else if (this.sel === i) this.buy(o);
      else { this.sel = i; Sound.play('select'); }
    });
    if (m.ok || Mouse.hit(this.buyRect())) this.buy(it[this.sel]);
    return null;
  }
  draw(ctx) {
    const s = this.hub.save, tabs = this.tabs(), tab = tabs[this.tab].id, owner = this.owner(tab);
    const L = levelsOf(s, owner), items = this.items(), nodes = items.filter(o => o.n).map(o => o.n);
    ctx.fillStyle = 'rgba(12,6,2,0.94)'; ctx.fillRect(0, 0, W, H);
    tabs.forEach((t, i) => button(ctx, this.tabRect(i), t.label, { active: i === this.tab, size: 13, activeCol: 'rgba(150,80,25,0.95)' }));
    txt(ctx, 'XP : ' + fmt(s.xp), W - 52, 34, { size: 17, align: 'right', color: this.flashT && (this.flashT >> 2) % 2 ? '#ff6060' : '#7dff9a' });
    button(ctx, this.closeRect(), '✕', { size: 15 });
    const atCamp = this.hub.run.atCamp;
    txt(ctx, atCamp ? 'Au camp : achats possibles' : 'En combat : consultation seule, validation au camp', W - 52, 56, { size: 11, align: 'right', w: 'normal',
      color: atCamp ? '#7dff9a' : (this.campT > 0 && (this.campT >> 3) % 2 ? '#ffffff' : '#ff9a8a') });
    // liens de prérequis
    for (const o of items) {
      if (!o.n || !o.n.req) continue;
      for (const k in o.n.req) {
        const p = nodes.find(x => x.id === k); if (!p) continue;
        const a = cardRect(p.pos), b = cardRect(o.pos);
        const ok = (L[k] || 0) >= o.n.req[k];
        ctx.strokeStyle = ok ? 'rgba(255,210,122,0.8)' : 'rgba(120,100,90,0.6)'; ctx.lineWidth = ok ? 3 : 2;
        ctx.beginPath();
        if (a.y === b.y) { ctx.moveTo(a.x + a.w, a.y + a.h / 2); ctx.lineTo(b.x, b.y + b.h / 2); }
        else { ctx.moveTo(a.x + a.w / 2, a.y + a.h); ctx.lineTo(b.x + b.w / 2, b.y); }
        ctx.stroke();
      }
    }
    // cartes
    items.forEach((o, i) => {
      const r = cardRect(o.pos), on = i === this.sel;
      if (Mouse.in(r)) hoverPointer = true;
      if (o.chooser) {
        const id = s.team[+tab[1]];
        panel(ctx, r.x, r.y, r.w, r.h, { fill: 'rgba(40,24,60,0.95)', stroke: on ? '#ffe9a0' : 'rgba(180,150,255,0.7)', lw: on ? 3 : 2 });
        drawPortrait(ctx, CHARS[id], r.x + 4, r.y + 4, 52, 52, { time: this.hub.t });
        txt(ctx, CHARS[id].name, r.x + 62, r.y + 24, { size: 15, color: '#ffe9a0' });
        txt(ctx, '◄  changer  ►', r.x + 62, r.y + 46, { size: 12, w: 'normal' });
        return;
      }
      const n = o.n, l = L[n.id] || 0, max = l >= n.max, met = reqMet(n, L), cost = nodeCost(n, l), aff = !max && met && cost <= s.xp;
      const fill = max ? 'rgba(80,60,10,0.95)' : !met ? 'rgba(30,26,30,0.95)' : aff ? 'rgba(24,60,30,0.95)' : 'rgba(34,20,12,0.95)';
      const stroke = on ? '#ffffff' : max ? '#ffd27a' : !met ? 'rgba(120,110,110,0.5)' : aff ? '#7dff9a' : 'rgba(255,190,130,0.5)';
      panel(ctx, r.x, r.y, r.w, r.h, { fill, stroke, lw: on ? 3 : 2, r: 7 });
      txt(ctx, n.name, r.x + 8, r.y + 18, { size: n.name.length > 22 ? 11 : 13, color: met ? '#fff' : '#888' });
      if (n.cmd) txt(ctx, n.cmd, r.x + 8, r.y + 33, { size: 10, color: met ? '#ffe9a0' : '#777', w: 'normal' });
      txt(ctx, n.max > 1 ? 'Niv. ' + l + ' / ' + n.max : (l ? 'Acquis' : 'Non acquis'), r.x + 8, r.y + 52, { size: 11, color: l ? '#bfe8c8' : '#aaa', w: 'normal' });
      txt(ctx, max ? 'MAX' : fmt(cost) + ' XP', r.x + r.w - 8, r.y + 52, { size: 12, align: 'right', color: max ? '#ffd27a' : aff ? '#7dff9a' : '#ff9a8a' });
      if (n.max > 1) { ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fillRect(r.x + 8, r.y + r.h - 5, r.w - 16, 3); ctx.fillStyle = max ? '#ffd27a' : '#7dff9a'; ctx.fillRect(r.x + 8, r.y + r.h - 5, (r.w - 16) * l / n.max, 3); }
    });
    // détails
    panel(ctx, 14, 420, W - 28, 112, { fill: 'rgba(30,16,8,0.96)', stroke: 'rgba(255,200,140,0.6)' });
    const o = items[this.sel];
    if (o && o.chooser) {
      const id = s.team[+tab[1]], d = CHARS[id];
      txt(ctx, 'Recrue : ' + d.name + ' — ' + d.title, 30, 446, { size: 17, color: '#ffe9a0' });
      txt(ctx, 'Changez de compagnon à tout moment : la progression de chaque recrue est conservée.', 30, 470, { size: 13, w: 'normal' });
      txt(ctx, 'Une recrue a une IA moyenne (non améliorable) et des statistiques limitées au niveau 10.', 30, 490, { size: 13, w: 'normal', color: '#e8d0b0' });
      txt(ctx, 'Clic gauche / droit de la carte, ou Entrée : changer de recrue.', 30, 512, { size: 12, w: 'normal', color: '#c8b090' });
    } else if (o) {
      const n = o.n, l = L[n.id] || 0, max = l >= n.max, met = reqMet(n, L), cost = nodeCost(n, l);
      txt(ctx, n.name + (n.cmd ? '   (' + n.cmd + ')' : ''), 30, 446, { size: 17, color: '#ffe9a0' });
      wrapText(ctx, n.desc, 700, 13, 'normal').slice(0, 2).forEach((line, i) => txt(ctx, line, 30, 468 + i * 18, { size: 13, w: 'normal' }));
      if (n.fx) txt(ctx, 'Actuel : ' + n.fx(l) + (max ? '' : '   →   Suivant : ' + n.fx(l + 1)), 30, 510, { size: 12, color: '#bfe8c8', w: 'normal' });
      else txt(ctx, l ? 'Compétence acquise.' : 'Débloque cette compétence.', 30, 510, { size: 12, color: '#bfe8c8', w: 'normal' });
      if (!met) txt(ctx, reqText(n, nodes), 30, 526, { size: 12, color: '#ff9a8a', w: 'normal' });
      const camp = this.hub.run.atCamp;
      button(ctx, this.buyRect(), max ? 'Maximum atteint' : !met ? 'Verrouillé' : (camp ? 'Améliorer : ' : 'Au camp : ') + fmt(cost) + ' XP', { size: 14, disabled: max || !met || cost > s.xp || !camp, fill: 'rgba(40,110,50,0.95)', border: '#7dff9a' });
    }
    txt(ctx, 'Tab : onglet suivant   •   Flèches : naviguer   •   Entrée ou double clic : améliorer   •   Échap / T : fermer   •   Le combat continue pendant ce temps', W / 2, 416, { size: 11, color: '#c8b090', align: 'center', w: 'normal' });
  }
}

// ---------------------------------------------------------------------
//  Emplacements de sauvegarde : plusieurs écoles indépendantes
// ---------------------------------------------------------------------
function enterSchool(s) {
  Store.set('lastSlot', s.slot);
  requestPersist();
  App.set(new LudusHub(s));
}
function saveSummary(s) {
  const where = s.maxStage >= PALIERS.length ? 'Arène des Champions, record niveau ' + Math.max(0, s.arenaMax - 1) : 'Palier ' + (s.maxStage + 1) + ' : ' + PALIERS[s.maxStage].name;
  const d = new Date(s.played || Date.now());
  const when = d.toLocaleDateString('fr-FR') + ' à ' + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  return { where, when };
}
class SlotScene {
  constructor(mode) {
    this.mode = mode; this.t = 0; this.row = Math.max(0, Store.get('lastSlot', 1) - 1); this.col = 0;
    this.confirmDel = 0; this.msg = ''; this.msgCol = '#ffe9a0';
    this.refresh();
  }
  refresh() { this.saves = listSaves(); }
  rowRect(i) { return { x: 40, y: 92 + i * 74, w: 880, h: 66 }; }
  actions(i) {
    const s = this.saves[i];
    if (this.mode === 'coop') return s ? ['Choisir'] : ['Nouvelle école'];
    if (!s) return ['Nouvelle école', 'Importer'];
    return ['Jouer', 'Exporter', this.confirmDel === i + 1 ? 'Confirmer ?' : 'Effacer'];
  }
  btnRect(i, k) { const r = this.rowRect(i), n = this.actions(i).length; return { x: r.x + r.w - 12 - (n - k) * 128, y: r.y + 14, w: 120, h: 38 }; }
  act(i, k) {
    const s = this.saves[i], a = this.actions(i)[k], slot = i + 1;
    Sound.play('confirm');
    if (a === 'Jouer') enterSchool(s);
    else if (a === 'Choisir') { Store.set('lastSlot', slot); requestPersist(); App.set(new CoopLobby(s)); }
    else if (a === 'Nouvelle école') App.set(new ChooseScene(slot));
    else if (a === 'Exporter') { exportSave(s); this.msg = 'Fichier de sauvegarde téléchargé : gardez-le en lieu sûr.'; this.msgCol = '#7dff9a'; }
    else if (a === 'Importer') importSave(slot, ok => { this.refresh(); this.msg = ok ? 'Sauvegarde importée dans l\'emplacement ' + slot + '.' : 'Ce fichier n\'est pas une sauvegarde valide du Ludus.'; this.msgCol = ok ? '#7dff9a' : '#ff9a8a'; });
    else if (a === 'Effacer') { this.confirmDel = slot; this.msg = 'Cliquez sur « Confirmer ? » pour effacer définitivement cette école.'; this.msgCol = '#ff9a8a'; }
    else if (a === 'Confirmer ?') { deleteSave(slot); if (Store.get('lastSlot', 0) === slot) Store.set('lastSlot', 0); this.confirmDel = 0; this.refresh(); this.msg = 'École effacée.'; this.msgCol = '#ffe9a0'; this.col = 0; }
  }
  update() {
    this.t++;
    const m = menuIn();
    if (m.back) { Sound.play('back'); App.set(new LudusTitle()); return; }
    if (m.up) { this.row = (this.row + SLOT_COUNT - 1) % SLOT_COUNT; this.col = 0; this.confirmDel = 0; Sound.play('select'); }
    if (m.down) { this.row = (this.row + 1) % SLOT_COUNT; this.col = 0; this.confirmDel = 0; Sound.play('select'); }
    const n = this.actions(this.row).length;
    if (m.left) { this.col = (this.col + n - 1) % n; Sound.play('select'); }
    if (m.right) { this.col = (this.col + 1) % n; Sound.play('select'); }
    this.col = Math.min(this.col, n - 1);
    for (let i = 0; i < SLOT_COUNT; i++) this.actions(i).forEach((a, k) => { if (Mouse.hit(this.btnRect(i, k))) { this.row = i; this.col = k; this.act(i, k); } });
    if (m.ok) this.act(this.row, this.col);
  }
  draw(ctx) {
    ludusBackdrop(ctx, this.t);
    txt(ctx, this.mode === 'coop' ? 'Coopération : avec quelle école jouez-vous ?' : 'Mes écoles', W / 2, 52, { size: 30, color: '#ffd27a', align: 'center' });
    txt(ctx, 'Chaque emplacement est une école indépendante, avec son propre champion et sa propre progression.', W / 2, 78, { size: 13, color: '#f4e6d4', align: 'center', w: 'normal' });
    for (let i = 0; i < SLOT_COUNT; i++) {
      const r = this.rowRect(i), s = this.saves[i], on = i === this.row;
      panel(ctx, r.x, r.y, r.w, r.h, { fill: on ? 'rgba(90,46,16,0.92)' : 'rgba(30,16,8,0.9)', stroke: on ? '#ffd27a' : 'rgba(255,200,140,0.4)', lw: on ? 3 : 2 });
      if (s) {
        drawPortrait(ctx, CHARS[s.main], r.x + 8, r.y + 7, 52, 52, { time: this.t });
        const sm = saveSummary(s);
        txt(ctx, 'École ' + (i + 1) + ' — ' + CHARS[s.main].name, r.x + 72, r.y + 24, { size: 17, color: '#ffe9a0' });
        txt(ctx, sm.where + '   •   XP totale ' + fmt(s.totalXp) + '   •   ' + fmt(s.stats.kills) + ' ennemis vaincus', r.x + 72, r.y + 43, { size: 12, w: 'normal' });
        txt(ctx, 'Dernière partie : ' + sm.when, r.x + 72, r.y + 59, { size: 11, w: 'normal', color: '#c8b090' });
      } else {
        txt(ctx, 'École ' + (i + 1) + ' — emplacement libre', r.x + 20, r.y + 40, { size: 17, color: '#aa9880' });
      }
      this.actions(i).forEach((a, k) => button(ctx, this.btnRect(i, k), a, { size: 14, active: on && k === this.col, activeCol: a === 'Confirmer ?' ? 'rgba(170,40,30,0.95)' : 'rgba(170,90,30,0.9)', color: a === 'Effacer' || a === 'Confirmer ?' ? '#ffb0a0' : '#fff' }));
    }
    if (this.msg) txt(ctx, this.msg, W / 2, 482, { size: 14, align: 'center', color: this.msgCol });
    else if (saveError) txt(ctx, saveError, W / 2, 482, { size: 14, align: 'center', color: '#ff9a8a' });
    txt(ctx, 'Les écoles sont sauvegardées automatiquement dans ce navigateur. « Exporter » en garde une copie dans un fichier (à réimporter sur un autre appareil).', W / 2, H - 30, { size: 12, align: 'center', color: 'rgba(255,230,200,0.75)', w: 'normal' });
    txt(ctx, 'Flèches : choisir   •   Entrée : valider   •   Échap : retour', W / 2, H - 12, { size: 12, align: 'center', color: 'rgba(255,230,200,0.6)', w: 'normal' });
  }
}
