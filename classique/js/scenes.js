'use strict';
// =====================================================================
//  SCÈNES : menus, sélection, histoire, versus, survie, fin
// =====================================================================
function menuItems(ctx, items, sel, x, y, o = {}) {
  const gap = o.gap || 40, t = performance.now() / 1000;
  items.forEach((it, i) => {
    const on = i === sel;
    const yy = y + i * gap;
    if (on) {
      const w = o.w || 300;
      const g = ctx.createLinearGradient(x - w / 2, 0, x + w / 2, 0);
      g.addColorStop(0, 'rgba(160,110,255,0)'); g.addColorStop(0.5, 'rgba(160,110,255,0.45)'); g.addColorStop(1, 'rgba(160,110,255,0)');
      ctx.fillStyle = g; ctx.fillRect(x - w / 2, yy - 24, w, 34);
      txt(ctx, '◆', x - w / 2 + 18 + Math.sin(t * 6) * 3, yy, { size: 16, color: '#ffe9a0', align: 'center' });
    }
    txt(ctx, it, x, yy, { size: o.size || 24, color: on ? '#ffffff' : 'rgba(220,210,255,0.7)', align: 'center' });
  });
}
function backdrop(ctx, t, col1, col2) {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, col1 || '#0d0820'); g.addColorStop(1, col2 || '#2a1450');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  for (let i = 0; i < 70; i++) {
    const x = (i * 137.5 + t * (0.2 + (i % 5) * 0.08)) % W, y = (i * 71.3) % H;
    ctx.fillStyle = 'rgba(200,170,255,' + (0.15 + (i % 4) * 0.1) + ')'; ctx.fillRect(x, y, 2, 2);
  }
}
function logo(ctx, x, y, s, t) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  const g = ctx.createLinearGradient(0, -40, 0, 10);
  g.addColorStop(0, '#fff6d0'); g.addColorStop(0.5, '#ffc95a'); g.addColorStop(1, '#ff6a3a');
  ctx.font = 'bold 64px ' + FONT; ctx.textAlign = 'center';
  ctx.lineJoin = 'round'; ctx.lineWidth = 12; ctx.strokeStyle = '#1a0a30'; ctx.strokeText('ÉCLATS D\'ÉTHER', 0, 0);
  ctx.lineWidth = 4; ctx.strokeStyle = '#a070ff'; ctx.strokeText('ÉCLATS D\'ÉTHER', 0, 0);
  ctx.fillStyle = g; ctx.fillText('ÉCLATS D\'ÉTHER', 0, 0);
  // éclats de cristal
  const cols = ['#5fe0c0', '#ff6a3a', '#9fe0ff', '#ffe14a', '#c08bff'];
  for (let i = 0; i < 5; i++) {
    const a = t * 0.8 + i * TAU / 5, cx = Math.cos(a) * 270, cy = -18 + Math.sin(a) * 30;
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(a);
    ctx.beginPath(); ctx.moveTo(0, -10); ctx.lineTo(6, 0); ctx.lineTo(0, 10); ctx.lineTo(-6, 0); ctx.closePath();
    ctx.fillStyle = cols[i]; ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.restore();
  }
  txt(ctx, 'Les Gardiens Élémentaires', 0, 36, { size: 20, color: '#e0d0ff', align: 'center' });
  ctx.restore();
}

// ---------------------------------------------------------------------
//  Écran titre (avec combat de démonstration en fond)
// ---------------------------------------------------------------------
class TitleScene {
  constructor() {
    this.items = ['Mode Histoire', 'Mode Versus', 'Mode Survie', 'Commandes', 'Options', 'Retour au Ludus'];
    this.sel = App.titleSel || 0; this.t = 0; this.newDemo();
    Sound.music('title');
  }
  newDemo() {
    const th = choose(Object.keys(THEMES));
    const g = this.demo = new Battle({ theme: th, worldW: W });
    const pool = PLAYABLE.concat(App.unlocked ? BOSSES : []);
    const ids = shuffle(pool.slice()).slice(0, 3);
    ids.forEach((id, i) => g.spawnFighter(CHARS[id], { x: 220 + i * 260, z: 50 + i * 55, team: i + 1, ai: 0.6, facing: i % 2 ? -1 : 1, mp: 500 }));
    this.demoT = 0;
  }
  update() {
    this.t++; this.demoT++;
    this.demo.update(); this.demo.cam.x = 0;
    const teams = new Set(this.demo.fighters.filter(f => f.alive).map(f => f.team));
    if ((teams.size <= 1 && this.demoT > 200) || this.demoT > 60 * 45) this.newDemo();
    const m = menuIn();
    if (m.up) { this.sel = (this.sel + this.items.length - 1) % this.items.length; Sound.play('select'); }
    if (m.down) { this.sel = (this.sel + 1) % this.items.length; Sound.play('select'); }
    if (m.ok) {
      Sound.play('confirm'); App.titleSel = this.sel;
      if (this.sel === 0) App.set(new SelectScene('story'));
      else if (this.sel === 1) App.set(new VSSetupScene());
      else if (this.sel === 2) App.set(new SelectScene('survival'));
      else if (this.sel === 3) App.set(new ControlsScene());
      else if (this.sel === 4) App.set(new OptionsScene());
      else location.href = '../index.html';
    }
  }
  draw(ctx) {
    this.demo.draw(ctx, { noBanner: true });
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, 'rgba(10,5,25,0.85)'); g.addColorStop(0.45, 'rgba(10,5,25,0.35)'); g.addColorStop(1, 'rgba(10,5,25,0.75)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    logo(ctx, W / 2, 110, 1, this.t / 60);
    menuItems(ctx, this.items, this.sel, W / 2, 222, { gap: 40, w: 340 });
    txt(ctx, 'Déplacer : ' + bindLabel(0, 'up') + bindLabel(0, 'left') + bindLabel(0, 'down') + bindLabel(0, 'right') + '   Valider : ' + bindLabel(0, 'attack') + ' / Entrée   Retour : ' + bindLabel(0, 'jump') + ' / Échap   Musique : M',
      W / 2, H - 14, { size: 13, color: 'rgba(230,220,255,0.8)', align: 'center', w: 'normal' });
    if (!Sound.ctx && (this.t >> 5) % 2) txt(ctx, 'Appuyez sur une touche pour activer le son', W / 2, H - 38, { size: 14, color: '#ffe9a0', align: 'center' });
  }
}

// ---------------------------------------------------------------------
class OptionsScene {
  constructor() { this.sel = 0; this.t = 0; this.confirmReset = false; }
  items() {
    return ['Difficulté : ' + DIFF[App.diff].name, 'Musique : ' + (Sound.musicOn ? 'Oui' : 'Non'), 'Effets sonores : ' + (Sound.sfxOn ? 'Oui' : 'Non'),
      'Configurer les touches', 'Boss jouables : ' + (App.unlocked ? 'Débloqués' : 'Verrouillés'), this.confirmReset ? 'Confirmer la réinitialisation ?' : 'Réinitialiser la progression', 'Retour'];
  }
  update() {
    this.t++;
    const m = menuIn(), n = 7;
    if (m.up) { this.sel = (this.sel + n - 1) % n; this.confirmReset = false; Sound.play('select'); }
    if (m.down) { this.sel = (this.sel + 1) % n; this.confirmReset = false; Sound.play('select'); }
    const ch = m.left ? -1 : m.right ? 1 : m.ok ? 1 : 0;
    if (m.back) { Sound.play('back'); App.set(new TitleScene()); return; }
    if (!ch) return;
    Sound.play('select');
    switch (this.sel) {
      case 0: App.diff = (App.diff + 3 + ch) % 3; Store.set('diff', App.diff); break;
      case 1: Sound.setMusic(!Sound.musicOn); break;
      case 2: Sound.setSfx(!Sound.sfxOn); break;
      case 3: if (m.ok) { App.set(new KeyConfigScene(() => new OptionsScene())); return; } break;
      case 4: break;
      case 5: if (!m.ok) break; if (this.confirmReset) { App.unlocked = false; Store.set('unlock', false); Store.set('best', 0); this.confirmReset = false; Sound.play('back'); } else this.confirmReset = true; break;
      case 6: if (m.ok) App.set(new TitleScene()); break;
    }
  }
  draw(ctx) {
    backdrop(ctx, this.t);
    txt(ctx, 'OPTIONS', W / 2, 90, { size: 40, color: '#ffe9a0', align: 'center' });
    menuItems(ctx, this.items(), this.sel, W / 2, 150, { gap: 46, w: 480, size: 22 });
    txt(ctx, 'Débloquez les boss en terminant le Mode Histoire. Meilleure vague en Survie : ' + Store.get('best', 0), W / 2, H - 40, { size: 14, color: '#c8b8ff', align: 'center', w: 'normal' });
  }
}

// ---------------------------------------------------------------------
class ControlsScene {
  constructor() { this.t = 0; }
  update() {
    this.t++; const m = menuIn();
    if (m.ok) { Sound.play('confirm'); App.set(new KeyConfigScene(() => new ControlsScene())); }
    else if (m.back) { Sound.play('back'); App.set(new TitleScene()); }
  }
  draw(ctx) {
    backdrop(ctx, this.t);
    txt(ctx, 'COMMANDES', W / 2, 54, { size: 36, color: '#ffe9a0', align: 'center' });
    const rows = [['Haut', 'up'], ['Bas', 'down'], ['Gauche', 'left'], ['Droite', 'right'], ['Attaque (A)', 'attack'], ['Saut (J)', 'jump'], ['Défense (D)', 'defend']];
    panel(ctx, 40, 80, 420, 250);
    txt(ctx, 'Action', 60, 108, { size: 16, color: '#c8b8ff' }); txt(ctx, 'Joueur 1', 250, 108, { size: 16, color: '#4fb3ff' }); txt(ctx, 'Joueur 2', 360, 108, { size: 16, color: '#ff9a3c' });
    rows.forEach(([n, k], i) => {
      const y = 138 + i * 27;
      txt(ctx, n, 60, y, { size: 15, w: 'normal' }); txt(ctx, bindLabel(0, k), 250, y, { size: 15 }); txt(ctx, bindLabel(1, k), 360, y, { size: 13 });
    });
    panel(ctx, 480, 80, 440, 250);
    const tips = [
      'Double appui avant : courir',
      'Course + A : attaque chargée  •  Course + J : grand saut',
      'Course + D : roulade',
      'A, A, A : enchaînement (le 3e coup projette)',
      'J puis A : coup aérien',
      'Marcher contre un ennemi étourdi : le saisir',
      '   (A : frapper, direction + A : projeter)',
      'A près d\'un objet : ramasser / boire un élixir',
      'Garder D face à l\'ennemi : bloquer',
    ];
    tips.forEach((s, i) => txt(ctx, s, 498, 110 + i * 25, { size: 14, w: 'normal' }));
    panel(ctx, 40, 345, 880, 150);
    txt(ctx, 'POUVOIRS ÉLÉMENTAIRES', W / 2, 372, { size: 18, color: '#ffe9a0', align: 'center' });
    const sp = [
      'Les pouvoirs s\'enchaînent rapidement : D (Défense), puis une direction, puis A (Attaque) ou J (Saut).',
      'D → A : D, puis la direction vers laquelle vous voulez frapper, puis A.     D ↑ A / D ↓ A : avec Haut ou Bas.',
      'Chaque pouvoir consomme de la magie (barre bleue), qui se recharge avec le temps — plus vite quand vous êtes blessé.',
      'La liste des pouvoirs de votre Gardien est affichée à la sélection et dans le menu Pause (Échap ou P).',
    ];
    sp.forEach((s, i) => txt(ctx, s, W / 2, 400 + i * 24, { size: 14, w: 'normal', align: 'center' }));
    txt(ctx, 'Attaque / Entrée : configurer les touches    Échap : revenir', W / 2, H - 14, { size: 13, color: '#c8b8ff', align: 'center', w: 'normal' });
  }
}

// ---------------------------------------------------------------------
//  Configuration des touches
// ---------------------------------------------------------------------
class KeyConfigScene {
  constructor(back) {
    this.back = back || (() => new OptionsScene());
    this.t = 0; this.row = 0; this.col = 0; this.wait = false; this.msg = ''; this.msgCol = '#c8b8ff'; this.confirmReset = false;
  }
  update() {
    this.t++;
    if (this.wait) {
      if (Keys.hit('Escape')) { this.wait = false; this.msg = 'Modification annulée.'; this.msgCol = '#c8b8ff'; Sound.play('back'); return; }
      const code = [...Keys.pressed][0];
      if (!code) return;
      if (RESERVED_KEYS.includes(code) || /^F\d+$/.test(code)) {
        this.msg = 'La touche « ' + keyLabel(code) + ' » est réservée (pause, musique…). Choisissez-en une autre.'; this.msgCol = '#ff8080'; Sound.play('nomp'); return;
      }
      const k = BTN[this.row];
      const sw = assignKey(this.col, k, code);
      this.wait = false; Sound.play('confirm');
      this.msg = 'Joueur ' + (this.col + 1) + ' — ' + BTN_NAMES[k] + ' : ' + keyLabel(code) +
        (sw ? '   (échangée avec Joueur ' + (sw.i + 1) + ' — ' + BTN_NAMES[sw.a] + ')' : '');
      this.msgCol = sw ? '#ffe9a0' : '#7dff9a';
      return;
    }
    const m = menuIn(), n = BTN.length + 2;
    if (m.back) { Sound.play('back'); App.set(this.back()); return; }
    if (m.up) { this.row = (this.row + n - 1) % n; this.confirmReset = false; Sound.play('select'); }
    if (m.down) { this.row = (this.row + 1) % n; this.confirmReset = false; Sound.play('select'); }
    if ((m.left || m.right) && this.row < BTN.length) { this.col = 1 - this.col; Sound.play('select'); }
    if (m.ok) {
      if (this.row < BTN.length) { this.wait = true; this.msg = ''; Sound.play('select'); }
      else if (this.row === BTN.length) {
        if (this.confirmReset) { resetBinds(); this.confirmReset = false; this.msg = 'Touches par défaut rétablies.'; this.msgCol = '#7dff9a'; Sound.play('confirm'); }
        else { this.confirmReset = true; Sound.play('select'); }
      } else { Sound.play('back'); App.set(this.back()); }
    }
  }
  draw(ctx) {
    backdrop(ctx, this.t);
    txt(ctx, 'CONFIGURATION DES TOUCHES', W / 2, 52, { size: 32, color: '#ffe9a0', align: 'center' });
    const x0 = 150, cx = [470, 720], y0 = 110, rh = 36;
    panel(ctx, x0 - 20, y0 - 30, 700, BTN.length * rh + 46);
    txt(ctx, 'Action', x0, y0 - 6, { size: 16, color: '#c8b8ff' });
    txt(ctx, 'Joueur 1', cx[0], y0 - 6, { size: 16, color: '#4fb3ff', align: 'center' });
    txt(ctx, 'Joueur 2', cx[1], y0 - 6, { size: 16, color: '#ff9a3c', align: 'center' });
    BTN.forEach((k, r) => {
      const y = y0 + 24 + r * rh;
      txt(ctx, BTN_NAMES[k], x0, y, { size: 17, w: 'normal' });
      for (let c = 0; c < 2; c++) {
        const on = this.row === r && this.col === c;
        if (on) {
          rrect(ctx, cx[c] - 105, y - 22, 210, 30, 6);
          ctx.fillStyle = this.wait ? 'rgba(255,200,80,' + (0.35 + 0.25 * Math.sin(this.t * 0.25)) + ')' : 'rgba(160,110,255,0.45)'; ctx.fill();
          ctx.strokeStyle = '#ffe9a0'; ctx.lineWidth = 2; ctx.stroke();
        }
        const label = on && this.wait ? 'Appuyez sur une touche…' : (bindLabel(c, k) || '—');
        txt(ctx, label, cx[c], y, { size: on && this.wait ? 14 : 17, align: 'center', color: on && this.wait ? '#fff' : '#ffffff' });
      }
    });
    const by = y0 + BTN.length * rh + 54;
    menuItems(ctx, [this.confirmReset ? 'Confirmer : rétablir les touches par défaut ?' : 'Rétablir les touches par défaut', 'Retour'],
      this.row - BTN.length, W / 2, by, { gap: 40, w: 520, size: 20 });
    if (this.msg) txt(ctx, this.msg, W / 2, H - 50, { size: 15, align: 'center', color: this.msgCol });
    txt(ctx, this.wait ? 'Appuyez sur la nouvelle touche   •   Échap : annuler'
      : 'Haut/Bas : action   Gauche/Droite : joueur   Attaque/Entrée : modifier   Échap : retour',
    W / 2, H - 14, { size: 13, color: '#c8b8ff', align: 'center', w: 'normal' });
  }
}

// ---------------------------------------------------------------------
//  Sélection des combattants (Histoire / Survie)
// ---------------------------------------------------------------------
function drawCharInfo(ctx, def, x, y, w, col, t) {
  panel(ctx, x, y, w, 168, { stroke: col });
  // grand aperçu animé
  ctx.save();
  ctx.beginPath(); ctx.rect(x + 6, y + 6, 120, 156); ctx.clip();
  const g = ctx.createLinearGradient(0, y, 0, y + 168); g.addColorStop(0, def.color); g.addColorStop(1, '#0d0b14');
  ctx.fillStyle = g; ctx.fillRect(x + 6, y + 6, 120, 156);
  const sc = 1.65 / Math.max(1, (def.look.scale || 1) * 0.9);
  ctx.translate(x + 64, y + 156); ctx.scale(sc, sc);
  const p = lerpPose(POSES.guard, POSES.stand, 0.15); const b = Math.sin(t * 0.09); p.lean += b; p.kF += b * 3; p.kB += b * 3;
  drawBody(ctx, Object.assign({}, def.look, { scale: 1 }), p, { time: t, weapon: def.look.weapon });
  ctx.restore();
  const tx = x + 136;
  txt(ctx, def.name, tx, y + 26, { size: 22, color: col });
  txt(ctx, (def.title || '') + (def.element ? '  •  ' + def.element : ''), tx, y + 45, { size: 13, color: '#e0d0ff' });
  const lines = wrapText(ctx, def.desc || '', w - 146, 12, 'normal');
  lines.slice(0, 2).forEach((s, i) => txt(ctx, s, tx, y + 64 + i * 15, { size: 12, w: 'normal', color: '#ddd' }));
  let i = 0;
  for (const c in def.specials) {
    const m = def.specials[c];
    txt(ctx, cmdLabel(c), tx, y + 104 + i * 16, { size: 12, color: '#ffe9a0' });
    txt(ctx, m.name, tx + 62, y + 104 + i * 16, { size: 12, w: 'normal' });
    txt(ctx, m.mp + ' PM', x + w - 10, y + 104 + i * 16, { size: 11, color: '#7fb0ff', align: 'right', w: 'normal' });
    i++;
  }
}

class SelectScene {
  constructor(mode) {
    this.mode = mode; this.t = 0; this.go = 0;
    this.list = PLAYABLE.concat(App.unlocked ? BOSSES : [], ['random']);
    this.cols = 7;
    this.p = [{ on: true, cur: 0, ok: false, pick: null }, { on: false, cur: 1, ok: false, pick: null }];
    Sound.music('title');
  }
  update() {
    this.t++;
    const n = this.list.length;
    for (let i = 0; i < 2; i++) {
      const m = menuInP(i), p = this.p[i];
      if (!p.on) { if (m.ok) { p.on = true; p.ok = false; Sound.play('confirm'); } continue; }
      if (p.ok) { if (m.back) { p.ok = false; Sound.play('back'); } continue; }
      if (m.left) { p.cur = (p.cur + n - 1) % n; Sound.play('select'); }
      if (m.right) { p.cur = (p.cur + 1) % n; Sound.play('select'); }
      if (m.up) { p.cur = (p.cur - this.cols + n * 2) % n; Sound.play('select'); }
      if (m.down) { p.cur = (p.cur + this.cols) % n; Sound.play('select'); }
      if (m.ok) {
        const id = this.list[p.cur];
        p.pick = id === 'random' ? choose(PLAYABLE) : id; p.ok = true; Sound.play('confirm');
      } else if (m.back) {
        Sound.play('back');
        if (i === 0) { App.set(new TitleScene()); return; }
        p.on = false;
      }
    }
    if (this.p.every(p => !p.on || p.ok)) { if (++this.go > 45) this.start(); } else this.go = 0;
  }
  start() {
    const picks = [];
    this.p.forEach((p, i) => { if (p.on) picks.push({ id: p.pick, pid: i }); });
    if (this.mode === 'story') App.set(new StoryScene(picks));
    else App.set(new SurvivalScene(picks));
  }
  draw(ctx) {
    backdrop(ctx, this.t);
    txt(ctx, this.mode === 'story' ? 'MODE HISTOIRE — Choisissez votre Gardien' : 'MODE SURVIE — Choisissez votre Gardien', W / 2, 40, { size: 26, color: '#ffe9a0', align: 'center' });
    const cw = 92, ch = 92, gap = 10, cols = this.cols, rows = Math.ceil(this.list.length / cols);
    const x0 = (W - (cols * cw + (cols - 1) * gap)) / 2, y0 = 60;
    this.list.forEach((id, i) => {
      const x = x0 + (i % cols) * (cw + gap), y = y0 + Math.floor(i / cols) * (ch + gap);
      if (id === 'random') {
        panel(ctx, x, y, cw, ch, { r: 6, fill: '#2a1a4a' });
        txt(ctx, '?', x + cw / 2, y + 62, { size: 54, color: '#ffe9a0', align: 'center' });
      } else {
        drawPortrait(ctx, CHARS[id], x, y, cw, ch, { time: this.t });
        ctx.strokeStyle = 'rgba(160,140,255,0.5)'; ctx.lineWidth = 2; ctx.strokeRect(x, y, cw, ch);
        txt(ctx, CHARS[id].name, x + cw / 2, y + ch - 6, { size: 13, align: 'center' });
      }
      this.p.forEach((p, k) => {
        if (!p.on || p.cur !== i) return;
        const col = k === 0 ? '#4fb3ff' : '#ff9a3c';
        ctx.strokeStyle = col; ctx.lineWidth = p.ok ? 5 : 3 + Math.sin(this.t * 0.3);
        ctx.strokeRect(x - 3 - k * 3, y - 3 - k * 3, cw + 6 + k * 6, ch + 6 + k * 6);
        txt(ctx, 'J' + (k + 1), x + 4 + k * 60, y + 16, { size: 13, color: col });
      });
    });
    const iy = y0 + rows * (ch + gap) + 6;
    for (let k = 0; k < 2; k++) {
      const p = this.p[k], x = k === 0 ? 20 : 490, col = k === 0 ? '#4fb3ff' : '#ff9a3c';
      if (!p.on) {
        panel(ctx, x, iy, 450, 168, { stroke: 'rgba(255,255,255,0.2)' });
        txt(ctx, 'Joueur 2 : appuyez sur ' + bindLabel(1, 'attack') + ' pour rejoindre', x + 225, iy + 90, { size: 16, align: 'center', color: (this.t >> 5) % 2 ? '#fff' : '#aaa' });
        continue;
      }
      const id = p.ok ? p.pick : this.list[p.cur];
      if (id === 'random') {
        panel(ctx, x, iy, 450, 168, { stroke: col });
        txt(ctx, 'Gardien aléatoire', x + 225, iy + 90, { size: 22, align: 'center', color: col });
      } else drawCharInfo(ctx, CHARS[id], x, iy, 450, col, this.t);
      if (p.ok) txt(ctx, 'PRÊT !', x + 440, iy + 26, { size: 18, color: '#7dff9a', align: 'right' });
    }
    txt(ctx, 'Attaque : choisir    Saut : annuler', W / 2, H - 8, { size: 13, color: '#c8b8ff', align: 'center', w: 'normal' });
  }
}

// ---------------------------------------------------------------------
//  Dialogues
// ---------------------------------------------------------------------
class Dialog {
  constructor(lines, scene) { this.lines = lines.filter(l => !(l.who === 'ally' && !scene.allyId)); this.scene = scene; this.i = 0; this.c = 0; this.t = 0; this.done = this.lines.length === 0; }
  resolve(l) {
    const s = this.scene;
    let def = null;
    if (l.who === 'hero') def = CHARS[s.picks[0].id];
    else if (l.who === 'ally') def = s.allyId ? CHARS[s.allyId] : null;
    else if (l.who !== 'nar') def = CHARS[l.who];
    let text = l.text;
    if (text === '@quote') text = def ? def.quote : '';
    return { def, text, name: def ? def.name : 'Narrateur' };
  }
  update() {
    if (this.done) return;
    this.t++;
    const L = this.resolve(this.lines[this.i]);
    this.c += 1.4;
    if (Keys.hit('Escape')) { this.done = true; return; }
    const m = menuIn();
    if (m.ok) {
      if (this.c < L.text.length) this.c = L.text.length;
      else { this.i++; this.c = 0; Sound.play('select'); if (this.i >= this.lines.length) this.done = true; }
    }
  }
  draw(ctx) {
    if (this.done) return;
    const L = this.resolve(this.lines[this.i]);
    ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(0, 0, W, H);
    const x = 30, y = 380, w = 900, h = 140;
    panel(ctx, x, y, w, h, { fill: 'rgba(12,8,28,0.92)', stroke: 'rgba(200,170,255,0.8)', lw: 3 });
    let tx = x + 24;
    if (L.def) {
      drawPortrait(ctx, L.def, x + 14, y + 14, 112, 112, { time: this.t });
      ctx.strokeStyle = '#ffe9a0'; ctx.lineWidth = 2; ctx.strokeRect(x + 14, y + 14, 112, 112);
      tx = x + 142;
    }
    txt(ctx, L.name, tx, y + 32, { size: 18, color: L.def ? '#ffe9a0' : '#c8b8ff' });
    const shown = L.text.slice(0, Math.floor(this.c));
    const lines = wrapText(ctx, shown, x + w - tx - 20, 17, 'normal');
    lines.forEach((s, i) => txt(ctx, s, tx, y + 60 + i * 24, { size: 17, w: 'normal' }));
    if (this.c >= L.text.length && (this.t >> 4) % 2) txt(ctx, '▼', x + w - 22, y + h - 12, { size: 16, color: '#ffe9a0' });
    txt(ctx, 'Attaque : suivant   Échap : passer', x + w - 10, y - 8, { size: 12, align: 'right', color: '#c8b8ff', w: 'normal' });
  }
}

// ---------------------------------------------------------------------
//  Menu pause
// ---------------------------------------------------------------------
class PauseMenu {
  constructor(defs) { this.defs = defs; this.items = ['Reprendre', 'Liste des pouvoirs', 'Quitter vers le menu']; this.sel = 0; this.moves = false; this.t = 0; }
  update() {
    this.t++;
    const m = menuIn();
    if (this.moves) { if (m.ok || m.back) { this.moves = false; Sound.play('back'); } return null; }
    if (Keys.hit('Escape', 'KeyP')) { Sound.play('back'); return 'resume'; }
    if (m.up) { this.sel = (this.sel + 2) % 3; Sound.play('select'); }
    if (m.down) { this.sel = (this.sel + 1) % 3; Sound.play('select'); }
    if (m.ok) {
      Sound.play('confirm');
      if (this.sel === 0) return 'resume';
      if (this.sel === 1) this.moves = true;
      if (this.sel === 2) return 'quit';
    }
    return null;
  }
  draw(ctx) {
    ctx.fillStyle = 'rgba(5,3,15,0.7)'; ctx.fillRect(0, 0, W, H);
    if (this.moves) {
      txt(ctx, 'POUVOIRS', W / 2, 60, { size: 30, color: '#ffe9a0', align: 'center' });
      const uniq = [...new Set(this.defs)];
      uniq.slice(0, 2).forEach((d, i) => drawCharInfo(ctx, d, i === 0 ? 20 : 490, 90, 450, i === 0 ? '#4fb3ff' : '#ff9a3c', this.t));
      txt(ctx, 'D = Défense   A = Attaque   J = Saut   → = vers l\'avant (gauche ou droite)', W / 2, 300, { size: 15, align: 'center', w: 'normal' });
      txt(ctx, 'Enchaînez rapidement les trois touches. Exemple pour D → A : Défense, Droite, Attaque.', W / 2, 326, { size: 15, align: 'center', w: 'normal' });
      txt(ctx, 'Attaque : retour', W / 2, H - 20, { size: 13, color: '#c8b8ff', align: 'center', w: 'normal' });
      return;
    }
    txt(ctx, 'PAUSE', W / 2, 170, { size: 46, color: '#ffe9a0', align: 'center' });
    menuItems(ctx, this.items, this.sel, W / 2, 250, { gap: 46, w: 360 });
  }
}

// ---------------------------------------------------------------------
//  Base commune aux scènes de combat
// ---------------------------------------------------------------------
class FightScene {
  heroesAlive() { return this.heroes.filter(h => !h.dead); }
  camTarget() {
    const hs = this.heroesAlive().length ? this.heroesAlive() : this.heroes;
    if (!hs.length) return this.g.cam.x + W / 2;
    return hs.reduce((s, h) => s + h.x, 0) / hs.length;
  }
  handlePause() {
    if (this.pause) {
      const r = this.pause.update();
      if (r === 'resume') this.pause = null;
      else if (r === 'quit') App.set(new TitleScene());
      return true;
    }
    if (Keys.hit('Escape', 'KeyP')) { this.pause = new PauseMenu(this.heroes.map(h => h.def)); Sound.play('select'); return true; }
    return false;
  }
  spawnEnemy(id, opt = {}) {
    const g = this.g, def = CHARS[id], dif = DIFF[App.diff];
    const left = Math.random() < 0.25 && !def.boss && g.cam.x - 60 > g.bounds.x0;
    const x = left ? g.cam.x - 50 : g.cam.x + W + 50;
    const f = g.spawnFighter(def, {
      x, z: rand(15, DEPTH - 15), team: 2, ai: clamp((def.ai.skill || 0.5) + dif.ai, 0.05, 1), facing: left ? 1 : -1, offscreen: true,
      boss: !!def.boss && opt.boss !== false, hpMul: (opt.hp || 1) * dif.hp, atkMul: dif.dmg * (opt.atk || 1), mp: 300,
    });
    if (def.boss) f.boss = true;
    return f;
  }
  drawOver(ctx, title, items, sel, sub) {
    ctx.fillStyle = 'rgba(10,0,10,0.65)'; ctx.fillRect(0, 0, W, H);
    txt(ctx, title, W / 2, 180, { size: 50, color: '#ff6060', align: 'center', lw: 7 });
    if (sub) txt(ctx, sub, W / 2, 220, { size: 18, align: 'center' });
    menuItems(ctx, items, sel, W / 2, 290, { gap: 46, w: 420 });
  }
}

// ---------------------------------------------------------------------
//  MODE HISTOIRE
// ---------------------------------------------------------------------
const REGION = 1000, REGION_W = 1160;
class StoryScene extends FightScene {
  constructor(picks) { super(); this.picks = picks; this.carry = null; this.allyId = null; this.t = 0; this.startStage(0, false); }
  startStage(i, retry) {
    this.si = i;
    const st = this.st = STAGES[i];
    const worldW = st.waves.length * REGION + REGION_W + 100;
    const g = this.g = new Battle({ theme: st.theme, worldW });
    g.bounds = { x0: 0, x1: REGION_W };
    this.heroes = this.picks.map((p, k) => {
      const f = g.spawnFighter(CHARS[p.id], { x: 140 + k * 50, z: 70 + k * 60, team: 1, human: true, pid: p.pid, ctrl: new KeyController(p.pid), facing: 1, mp: 300 });
      if (this.carry && !retry) { const c = this.carry[k] || 0; f.hp = f.hpCap = clamp(c + f.hpMax * 0.4, f.hpMax * 0.5, f.hpMax); }
      return f;
    });
    this.ally = null;
    if (st.ally) {
      if (!this.allyId) this.allyId = choose(PLAYABLE.filter(id => !this.picks.some(p => p.id === id)));
      this.ally = g.spawnFighter(CHARS[this.allyId], { x: 80, z: 130, team: 1, ai: 0.62, ally: true, mp: 300 });
    }
    this.wave = -1; this.queue = []; this.overT = 0; this.overSel = 0; this.pause = null;
    this.phase = 'dialog';
    this.dialog = new Dialog((i === 0 && !retry ? PROLOGUE : []).concat(st.intro), this);
    this.after = () => { this.phase = 'play'; this.startWave(0); };
    Sound.music(st.music);
  }
  startWave(w) {
    const g = this.g, wd = this.st.waves[w];
    this.wave = w; this.wd = wd;
    const x0 = w * REGION;
    g.bounds = { x0: Math.min(x0, g.cam.x), x1: x0 + REGION_W };
    this.queue = [];
    for (const [id, n, opt] of wd.e) for (let k = 0; k < n; k++) this.queue.push({ id, opt: opt || {} });
    this.spawnT = 40;
    (wd.items || []).forEach((it, k) => g.dropItem(it, clamp(g.cam.x + 260 + k * 200 + rand(-50, 50), g.bounds.x0 + 40, g.bounds.x1 - 40), rand(30, 170)));
    if (wd.boss) {
      Sound.music('boss');
      g.banner('DANGER', 'Un puissant ennemi approche !', 110, '#ff6060');
    } else g.banner('Étape ' + (this.si + 1) + ' - ' + (w + 1), this.st.name, 90);
    if (wd.pre) { this.phase = 'dialog'; this.dialog = new Dialog(wd.pre, this); this.after = () => { this.phase = 'play'; }; }
  }
  stageClear() {
    this.phase = 'clear'; this.clearT = 0;
    this.g.banner('ÉTAPE TERMINÉE !', this.st.name + ' — éclat ' + (this.si + 1) + '/5 récupéré', 170);
    for (const h of this.g.fighters) if (h.team === 1 && h.alive) h.wantWin = true;
    Sound.stopMusic(); Sound.play('victory');
  }
  update() {
    this.t++;
    const g = this.g;
    if (this.phase === 'dialog') {
      this.dialog.update(); g.updateFx();
      if (this.dialog.done) this.after();
      return;
    }
    if (this.phase === 'over') {
      const m = menuIn();
      if (m.up || m.down) { this.overSel = 1 - this.overSel; Sound.play('select'); }
      if (m.ok) { Sound.play('confirm'); if (this.overSel === 0) this.startStage(this.si, true); else App.set(new TitleScene()); }
      return;
    }
    if ((this.phase === 'play' || this.phase === 'go') && this.handlePause()) return;
    g.update();
    g.follow(this.camTarget());
    if (this.phase === 'play') {
      const active = g.fighters.filter(f => f.team === 2 && f.alive).length;
      if (this.queue.length && active < 4 + this.heroes.length && --this.spawnT <= 0) {
        const q = this.queue.shift();
        this.spawnEnemy(q.id, q.opt);
        this.spawnT = q.opt.boss || CHARS[q.id].boss ? 10 : randi(25, 70);
      }
      if (!this.queue.length && active === 0) {
        if (this.wave >= this.st.waves.length - 1) this.stageClear();
        else {
          this.phase = 'go'; g.bounds.x1 = (this.wave + 1) * REGION + REGION_W; Sound.play('go');
          if (this.wd.boss) Sound.music(this.st.music);
          for (const h of this.heroes) if (!h.dead) h.healPool += h.hpMax * 0.06;
        }
      }
    } else if (this.phase === 'go') {
      g.bounds.x0 = Math.max(g.bounds.x0, g.cam.x);
      const nx = (this.wave + 1) * REGION;
      if (this.camTarget() > nx + 380) { this.phase = 'play'; this.startWave(this.wave + 1); }
    } else if (this.phase === 'clear') {
      if (++this.clearT > 190) {
        this.carry = this.heroes.map(h => h.dead ? 0 : h.hp);
        this.phase = 'dialog'; this.dialog = new Dialog(this.st.outro, this);
        this.after = () => {
          if (this.si + 1 < STAGES.length) this.startStage(this.si + 1, false);
          else App.set(new EndingScene(this.picks, this.allyId));
        };
      }
    }
    if (this.phase !== 'clear' && this.heroes.every(h => h.dead)) {
      if (++this.overT > 130) { this.phase = 'over'; this.overSel = 0; Sound.stopMusic(); Sound.play('gameover'); }
    }
  }
  draw(ctx) {
    const g = this.g;
    g.draw(ctx);
    const list = this.heroes.concat(this.ally ? [this.ally] : []);
    drawHUD(ctx, list, this.t);
    panel(ctx, W - 196, 6, 190, 58, { r: 6, fill: 'rgba(8,6,18,0.72)' });
    txt(ctx, 'Étape ' + (this.si + 1) + ' - ' + Math.max(1, this.wave + 1), W - 101, 28, { size: 17, color: '#ffe9a0', align: 'center' });
    const left = this.queue.length + g.fighters.filter(f => f.team === 2 && f.alive).length;
    txt(ctx, this.phase === 'go' ? 'Zone dégagée !' : 'Ennemis : ' + left, W - 101, 52, { size: 14, align: 'center', color: '#ddd' });
    const boss = g.fighters.find(f => f.boss && f.team === 2 && f.alive);
    if (boss) drawBossBar(ctx, boss);
    if (this.phase === 'go' && (this.t >> 4) % 2) {
      txt(ctx, 'EN AVANT', W - 70, 270, { size: 26, color: '#ffe14a', align: 'center', lw: 5 });
      ctx.fillStyle = '#ffe14a'; ctx.strokeStyle = '#000'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(W - 100, 285); ctx.lineTo(W - 40, 285); ctx.lineTo(W - 40, 275); ctx.lineTo(W - 18, 300); ctx.lineTo(W - 40, 325); ctx.lineTo(W - 40, 315); ctx.lineTo(W - 100, 315); ctx.closePath(); ctx.stroke(); ctx.fill();
    }
    if (this.phase === 'dialog') this.dialog.draw(ctx);
    if (this.phase === 'over') this.drawOver(ctx, 'PARTIE PERDUE', ['Recommencer l\'étape', 'Menu principal'], this.overSel, 'Les Gardiens sont tombés... mais l\'espoir demeure.');
    if (this.pause) this.pause.draw(ctx);
  }
}

// ---------------------------------------------------------------------
//  MODE SURVIE
// ---------------------------------------------------------------------
class SurvivalScene extends FightScene {
  constructor(picks) { super(); this.picks = picks; this.setup(); }
  setup() {
    this.t = 0;
    const g = this.g = new Battle({ theme: choose(Object.keys(THEMES)), worldW: 1400 });
    this.heroes = this.picks.map((p, k) => g.spawnFighter(CHARS[p.id], { x: 600 + k * 60, z: 80 + k * 50, team: 1, human: true, pid: p.pid, ctrl: new KeyController(p.pid), mp: 300 }));
    g.cam.x = 600 - W / 2 + 30;
    this.wave = 0; this.queue = []; this.nextT = 90; this.kos = 0; this.phase = 'play'; this.overT = 0; this.overSel = 0; this.pause = null;
    this.best = Store.get('best', 0);
    g.onKO = (tg) => { if (tg.team === 2) this.kos++; };
    Sound.music('vs');
  }
  startWave() {
    const g = this.g, w = ++this.wave;
    const pool = ['bandit'];
    if (w >= 2) pool.push('lancier', 'archer');
    if (w >= 4) pool.push('brute', 'acolyte');
    if (w >= 6) pool.push('givrin', 'pyro');
    if (w >= 9) pool.push('chevalier');
    const n = Math.min(12, 2 + Math.floor(w * 0.8));
    this.queue = [];
    if (w % 5 === 0) this.queue.push({ id: BOSSES[(w / 5 - 1) % BOSSES.length], opt: { hp: 0.55 + w * 0.02 } });
    for (let i = 0; i < n; i++) this.queue.push({ id: choose(pool), opt: { hp: 1 + w * 0.03, atk: 1 + w * 0.015 } });
    this.spawnT = 30;
    if (w % 2 === 0) g.dropItem('potion', g.cam.x + rand(200, 760), rand(30, 170));
    if (Math.random() < 0.5) g.dropItem(choose(['baton', 'pierre', 'caisse', 'couteau']), g.cam.x + rand(200, 760), rand(30, 170));
    g.banner('Vague ' + w, w % 5 === 0 ? 'Un boss rejoint la mêlée !' : '', 100, w % 5 === 0 ? '#ff6060' : '#ffe9a0');
    Sound.music(w % 5 === 0 ? 'boss' : 'vs');
  }
  update() {
    this.t++;
    const g = this.g;
    if (this.phase === 'over') {
      const m = menuIn();
      if (m.up || m.down) { this.overSel = 1 - this.overSel; Sound.play('select'); }
      if (m.ok) { Sound.play('confirm'); if (this.overSel === 0) this.setup(); else App.set(new TitleScene()); }
      return;
    }
    if (this.handlePause()) return;
    g.update();
    g.follow(this.camTarget());
    const active = g.fighters.filter(f => f.team === 2 && f.alive).length;
    if (this.queue.length) {
      if (active < 3 + this.heroes.length && --this.spawnT <= 0) { const q = this.queue.shift(); this.spawnEnemy(q.id, q.opt); this.spawnT = randi(20, 60); }
    } else if (active === 0 && --this.nextT <= 0) {
      if (this.wave > 0) for (const h of this.heroes) if (!h.dead) { h.healPool += h.hpMax * 0.15; h.hpCap = Math.min(h.hpMax, h.hpCap + h.hpMax * 0.1); }
      this.startWave(); this.nextT = 120;
    }
    if (this.heroes.every(h => h.dead) && ++this.overT > 120) {
      this.phase = 'over'; Sound.stopMusic(); Sound.play('gameover');
      const reached = this.wave - 1;
      if (reached > this.best) { this.best = reached; Store.set('best', reached); this.record = true; }
    }
  }
  draw(ctx) {
    const g = this.g;
    g.draw(ctx);
    drawHUD(ctx, this.heroes, this.t);
    panel(ctx, W - 196, 6, 190, 58, { r: 6, fill: 'rgba(8,6,18,0.72)' });
    txt(ctx, 'Vague ' + Math.max(1, this.wave), W - 101, 28, { size: 18, color: '#ffe9a0', align: 'center' });
    txt(ctx, 'K.O. : ' + this.kos + '   Record : ' + this.best, W - 101, 52, { size: 13, align: 'center', color: '#ddd' });
    const boss = g.fighters.find(f => f.boss && f.team === 2 && f.alive);
    if (boss) drawBossBar(ctx, boss);
    if (this.phase === 'over') this.drawOver(ctx, 'FIN DE LA SURVIE', ['Rejouer', 'Menu principal'], this.overSel,
      'Vagues terminées : ' + Math.max(0, this.wave - 1) + '   •   Ennemis vaincus : ' + this.kos + (this.record ? '   •   NOUVEAU RECORD !' : ''));
    if (this.pause) this.pause.draw(ctx);
  }
}

// ---------------------------------------------------------------------
//  MODE VERSUS : configuration
// ---------------------------------------------------------------------
const VS_TYPES = ['Aucun', 'Joueur 1', 'Joueur 2', 'CPU'];
const VS_TEAMS = ['Seul', 'Équipe 1', 'Équipe 2', 'Équipe 3', 'Équipe 4'];
const TEAM_COLS = ['#dddddd', '#4fb3ff', '#ff6a5a', '#7dff9a', '#ffe14a'];
class VSSetupScene {
  constructor() {
    this.t = 0; this.sel = 0; this.err = '';
    this.chars = PLAYABLE.concat(App.unlocked ? BOSSES : [], ['random']);
    this.arenas = Object.keys(THEMES);
    this.cfg = App.vsCfg || {
      slots: [{ type: 1, ch: 0, team: 0 }, { type: 3, ch: 1, team: 0 }, { type: 0, ch: 2, team: 0 }, { type: 0, ch: 3, team: 0 }],
      arena: 5,
    };
    for (const s of this.cfg.slots) if (s.ch >= this.chars.length) s.ch = 0;
    Sound.music('title');
  }
  change(d) {
    const i = this.sel, c = this.cfg;
    if (i < 12) {
      const s = c.slots[Math.floor(i / 3)], col = i % 3;
      if (col === 0) s.type = (s.type + 4 + d) % 4;
      else if (col === 1) s.ch = (s.ch + this.chars.length + d) % this.chars.length;
      else s.team = (s.team + 5 + d) % 5;
    } else if (i === 12) c.arena = (c.arena + this.arenas.length + d) % this.arenas.length;
    this.err = '';
  }
  validate() {
    const act = this.cfg.slots.filter(s => s.type);
    if (act.length < 2) return 'Il faut au moins deux combattants.';
    if (this.cfg.slots.filter(s => s.type === 1).length > 1 || this.cfg.slots.filter(s => s.type === 2).length > 1) return 'Chaque joueur ne peut contrôler qu\'un combattant.';
    const teams = new Set(act.map((s, i) => s.team ? s.team : 10 + this.cfg.slots.indexOf(s)));
    if (teams.size < 2) return 'Il faut au moins deux équipes adverses.';
    return '';
  }
  update() {
    this.t++;
    const m = menuIn();
    if (m.back) { Sound.play('back'); App.vsCfg = this.cfg; App.set(new TitleScene()); return; }
    if (m.up) { this.sel = (this.sel + 13) % 14; Sound.play('select'); }
    if (m.down) { this.sel = (this.sel + 1) % 14; Sound.play('select'); }
    if (m.left) { this.change(-1); Sound.play('select'); }
    if (m.right) { this.change(1); Sound.play('select'); }
    if (m.ok) {
      if (this.sel === 13) {
        this.err = this.validate();
        if (this.err) { Sound.play('nomp'); return; }
        Sound.play('confirm'); App.vsCfg = this.cfg;
        App.set(new VSScene(this.buildCfg()));
      } else { this.sel = (this.sel + 1) % 14; Sound.play('select'); }
    }
  }
  buildCfg() {
    const c = this.cfg;
    return {
      theme: this.arenas[c.arena],
      slots: c.slots.map((s, i) => s.type ? { type: s.type, id: this.chars[s.ch] === 'random' ? choose(PLAYABLE) : this.chars[s.ch], team: s.team ? s.team : 10 + i, teamIdx: s.team } : null).filter(Boolean),
    };
  }
  draw(ctx) {
    backdrop(ctx, this.t);
    txt(ctx, 'MODE VERSUS', W / 2, 46, { size: 34, color: '#ffe9a0', align: 'center' });
    const c = this.cfg;
    c.slots.forEach((s, k) => {
      const x = 22 + k * 232, y = 70, w = 220, h = 300;
      const on = Math.floor(this.sel / 3) === k && this.sel < 12;
      panel(ctx, x, y, w, h, { stroke: on ? '#ffe9a0' : 'rgba(160,140,255,0.5)', lw: on ? 3 : 2 });
      txt(ctx, 'Combattant ' + (k + 1), x + w / 2, y + 24, { size: 15, color: '#c8b8ff', align: 'center' });
      const id = this.chars[s.ch];
      if (s.type) {
        if (id === 'random') { ctx.fillStyle = '#2a1a4a'; ctx.fillRect(x + 50, y + 34, 120, 120); txt(ctx, '?', x + w / 2, y + 120, { size: 70, color: '#ffe9a0', align: 'center' }); }
        else drawPortrait(ctx, CHARS[id], x + 50, y + 34, 120, 120, { time: this.t });
      } else { ctx.fillStyle = 'rgba(255,255,255,0.05)'; ctx.fillRect(x + 50, y + 34, 120, 120); txt(ctx, '—', x + w / 2, y + 105, { size: 40, color: '#666', align: 'center' }); }
      const fields = [VS_TYPES[s.type], id === 'random' ? 'Aléatoire' : CHARS[id].name, VS_TEAMS[s.team]];
      const labels = ['Contrôle', 'Gardien', 'Équipe'];
      fields.forEach((v, j) => {
        const fy = y + 182 + j * 38, fsel = this.sel === k * 3 + j;
        if (fsel) { ctx.fillStyle = 'rgba(160,110,255,0.4)'; ctx.fillRect(x + 8, fy - 22, w - 16, 32); }
        txt(ctx, labels[j], x + 14, fy, { size: 12, color: '#aaa', w: 'normal' });
        const col = j === 2 ? TEAM_COLS[s.team] : j === 0 && s.type === 1 ? '#4fb3ff' : j === 0 && s.type === 2 ? '#ff9a3c' : '#fff';
        txt(ctx, (fsel ? '◄ ' : '') + v + (fsel ? ' ►' : ''), x + w / 2 + 22, fy, { size: 15, align: 'center', color: s.type || j === 0 ? col : '#666' });
      });
    });
    const ay = 410;
    panel(ctx, W / 2 - 230, ay - 26, 460, 38, { stroke: this.sel === 12 ? '#ffe9a0' : 'rgba(160,140,255,0.5)' });
    txt(ctx, 'Arène : ' + (this.sel === 12 ? '◄ ' : '') + THEMES[this.arenas[c.arena]].name + (this.sel === 12 ? ' ►' : ''), W / 2, ay, { size: 18, align: 'center' });
    const on = this.sel === 13;
    panel(ctx, W / 2 - 130, ay + 26, 260, 44, { fill: on ? 'rgba(200,80,40,0.85)' : 'rgba(80,30,20,0.7)', stroke: on ? '#ffe9a0' : 'rgba(255,160,100,0.5)', lw: on ? 3 : 2 });
    txt(ctx, 'COMBATTRE !', W / 2, ay + 56, { size: 22, align: 'center', color: on ? '#fff' : '#ddd' });
    if (this.err) txt(ctx, this.err, W / 2, ay + 98, { size: 15, color: '#ff7070', align: 'center' });
    txt(ctx, 'Haut/Bas : choisir le champ   Gauche/Droite : modifier   Attaque : valider   Échap : retour', W / 2, H - 10, { size: 13, color: '#c8b8ff', align: 'center', w: 'normal' });
  }
}

// ---------------------------------------------------------------------
//  MODE VERSUS : combat
// ---------------------------------------------------------------------
class VSScene extends FightScene {
  constructor(cfg) { super(); this.cfg = cfg; this.setup(); }
  setup() {
    this.t = 0;
    const g = this.g = new Battle({ theme: this.cfg.theme, worldW: 1400 });
    const n = this.cfg.slots.length;
    const dif = DIFF[App.diff];
    this.fs = this.cfg.slots.map((s, i) => {
      const x = 700 + (i - (n - 1) / 2) * (n > 2 ? 210 : 300);
      const o = { x, z: 60 + (i % 2) * 70 + (i > 1 ? 20 : 0), team: s.team, facing: x < 700 ? 1 : -1, mp: 250 };
      if (s.type === 3) { o.ai = clamp(0.62 + dif.ai, 0.1, 1); o.atkMul = s.type === 3 ? dif.dmg : 1; }
      else { o.human = true; o.pid = s.type - 1; o.ctrl = new KeyController(s.type - 1); }
      const f = g.spawnFighter(CHARS[s.id], o);
      f.teamIdx = s.teamIdx;
      return f;
    });
    this.heroes = this.fs.filter(f => f.human);
    g.cam.x = 700 - W / 2;
    this.over = false; this.overT = 0; this.overSel = 0; this.pause = null; this.winText = '';
    g.banner('COMBAT !', THEMES[this.cfg.theme].name, 90);
    Sound.music('vs');
  }
  camTarget() {
    const hs = this.heroes.filter(h => !h.dead);
    const list = hs.length ? hs : this.fs.filter(f => f.alive);
    if (!list.length) return this.g.cam.x + W / 2;
    return list.reduce((s, f) => s + f.x, 0) / list.length;
  }
  update() {
    this.t++;
    const g = this.g;
    if (this.over && this.overT > 150) {
      const m = menuIn();
      if (m.up) { this.overSel = (this.overSel + 2) % 3; Sound.play('select'); }
      if (m.down) { this.overSel = (this.overSel + 1) % 3; Sound.play('select'); }
      if (m.ok) {
        Sound.play('confirm');
        if (this.overSel === 0) this.setup();
        else if (this.overSel === 1) App.set(new VSSetupScene());
        else App.set(new TitleScene());
        return;
      }
    }
    if (!this.over && this.handlePause()) return;
    g.update();
    g.follow(this.camTarget());
    if (!this.over) {
      const alive = this.fs.filter(f => f.alive);
      const teams = new Set(alive.map(f => f.team));
      if (teams.size <= 1) {
        this.over = true; this.overT = 0;
        if (!alive.length) this.winText = 'Match nul !';
        else {
          const f = alive[0];
          this.winText = f.teamIdx ? VS_TEAMS[f.teamIdx] + ' l\'emporte !' : f.name + ' l\'emporte !';
          for (const a of alive) a.wantWin = true;
        }
        Sound.stopMusic(); Sound.play('victory');
        g.banner(this.winText, '', 150);
      }
    } else this.overT++;
  }
  draw(ctx) {
    const g = this.g;
    g.draw(ctx);
    drawHUD(ctx, this.fs, this.t);
    if (this.over && this.overT > 150) {
      ctx.fillStyle = 'rgba(5,3,15,0.6)'; ctx.fillRect(0, 0, W, H);
      txt(ctx, this.winText, W / 2, 190, { size: 42, color: '#ffe9a0', align: 'center', lw: 6 });
      menuItems(ctx, ['Revanche', 'Changer de combattants', 'Menu principal'], this.overSel, W / 2, 270, { gap: 46, w: 420 });
    }
    if (this.pause) this.pause.draw(ctx);
  }
}

// ---------------------------------------------------------------------
//  FIN DE L'HISTOIRE
// ---------------------------------------------------------------------
class EndingScene {
  constructor(picks, allyId) {
    this.t = 0; this.picks = picks; this.allyId = allyId;
    App.unlocked = true; Store.set('unlock', true);
    Sound.music('ending');
  }
  update() {
    this.t++;
    const m = menuIn();
    if (this.t > 200 && (m.ok || m.back) && this.t > ENDING.length * 110) { Sound.play('confirm'); App.set(new TitleScene()); }
    if (m.ok && this.t < ENDING.length * 110) this.t = Math.max(this.t, ENDING.length * 110);
  }
  draw(ctx) {
    backdrop(ctx, this.t, '#05030f', '#2a1450');
    // le Cristal reformé
    const cx = W / 2, cy = 130, s = 1 + Math.sin(this.t * 0.05) * 0.05;
    glowCircle(ctx, cx, cy, 110, ['rgba(255,255,255,0.9)', 'rgba(190,150,255,0.4)', 'rgba(190,150,255,0)']);
    ctx.save(); ctx.translate(cx, cy); ctx.scale(s, s); ctx.rotate(Math.sin(this.t * 0.02) * 0.1);
    const cols = ['#5fe0c0', '#ff6a3a', '#9fe0ff', '#ffe14a', '#c08bff'];
    for (let i = 0; i < 5; i++) {
      ctx.save(); ctx.rotate(i * TAU / 5);
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(14, -30); ctx.lineTo(0, -58); ctx.lineTo(-14, -30); ctx.closePath();
      ctx.fillStyle = cols[i]; ctx.globalAlpha = 0.9; ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
    // les héros
    const ids = this.picks.map(p => p.id).concat(this.allyId ? [this.allyId] : []);
    ids.forEach((id, i) => {
      const def = CHARS[id];
      ctx.save(); ctx.translate(W / 2 + (i - (ids.length - 1) / 2) * 110, 330); ctx.scale(1.4, 1.4);
      const p = Object.assign({}, POSES.win); p.aF += Math.sin(this.t * 0.1 + i) * 10;
      drawBody(ctx, def.look, p, { time: this.t, weapon: def.look.weapon });
      ctx.restore();
    });
    const shown = Math.min(ENDING.length, Math.floor(this.t / 110) + 1);
    const start = Math.max(0, shown - 6);
    for (let i = start; i < shown; i++) {
      const a = i === shown - 1 ? Math.min(1, (this.t % 110) / 30) : 1;
      ctx.globalAlpha = this.t >= ENDING.length * 110 ? 1 : a;
      txt(ctx, ENDING[i], W / 2, 372 + (i - start) * 26, { size: ENDING[i].startsWith('—') ? 24 : 17, align: 'center', color: ENDING[i].startsWith('—') ? '#ffe9a0' : '#fff', w: ENDING[i].startsWith('—') ? 'bold' : 'normal' });
    }
    ctx.globalAlpha = 1;
    if (this.t > ENDING.length * 110 && (this.t >> 5) % 2) txt(ctx, 'Appuyez sur Attaque', W / 2, H - 10, { size: 13, color: '#c8b8ff', align: 'center' });
  }
}
