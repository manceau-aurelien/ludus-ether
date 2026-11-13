'use strict';
// =====================================================================
//  LUDUS — coopération en ligne (PeerJS / WebRTC)
//  L'hôte simule le combat et envoie l'état à l'invité, qui l'affiche.
//  Chaque joueur garde sa propre école : l'invité gagne l'XP dans la sienne.
// =====================================================================
const COOP_PREFIX = 'ludus-ether-v1-';
const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const makeCode = () => { let s = ''; for (let i = 0; i < 5; i++) s += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]; return s; };
const netAvailable = () => typeof Peer !== 'undefined';
const r1 = v => Math.round(v * 10) / 10;
const poseArr = p => PK.map(k => Math.round(p[k]));
const arrPose = a => { const o = {}; PK.forEach((k, i) => { o[k] = a[i]; }); return o; };
function guestHello(save) {
  return { t: 'hello', charId: save.main, charName: CHARS[save.main].name, opts: fighterOpts(save, save.main, true) };
}
function peerError(e) {
  const t = e && e.type;
  if (t === 'peer-unavailable') return 'Aucune partie ne correspond à ce code.';
  if (t === 'network' || t === 'server-error' || t === 'socket-error' || t === 'socket-closed') return 'Impossible de joindre le service de mise en relation. Vérifiez votre connexion internet.';
  if (t === 'browser-incompatible') return 'Ce navigateur ne permet pas le jeu en ligne.';
  return 'Erreur de connexion (' + (t || 'inconnue') + ').';
}

// ---------------------------------------------------------------------
//  Hôte
// ---------------------------------------------------------------------
class CoopHost {
  constructor(save) {
    this.save = save; this.conn = null; this.guestOpts = null; this.events = []; this.recording = false;
    this.status = 'init'; this.err = ''; this.run = null; this.guestReady = false; this.frameN = 0;
    this.open();
  }
  open() {
    this.code = makeCode();
    try { this.peer = new Peer(COOP_PREFIX + this.code); } catch (e) { this.status = 'error'; this.err = peerError(e); return; }
    this.peer.on('open', () => { this.status = 'wait'; });
    this.peer.on('error', e => {
      if (e.type === 'unavailable-id') { this.peer.destroy(); this.open(); return; }
      if (this.status !== 'ok') { this.status = 'error'; this.err = peerError(e); }
    });
    this.peer.on('connection', c => {
      if (this.conn && this.conn.open) { c.on('open', () => { c.send({ t: 'full' }); setTimeout(() => c.close(), 500); }); return; }
      this.conn = c;
      c.on('data', d => this.onData(d));
      c.on('close', () => this.onClose(c));
      c.on('error', () => this.onClose(c));
    });
  }
  get connected() { return !!(this.conn && this.conn.open && this.guestOpts); }
  send(m) { if (this.conn && this.conn.open) { try { this.conn.send(m); } catch (e) { /* canal saturé */ } } }
  onData(d) {
    if (!d || !d.t) return;
    if (d.t === 'hello') {
      if (!CHARS[d.charId]) return;
      this.guestOpts = d; this.guestReady = false; this.status = 'ok';
      this.send({ t: 'welcome', hostChar: this.save.main, hostName: CHARS[this.save.main].name });
      if (this.run) this.run.guestJoined();
    } else if (d.t === 'opts' && this.guestOpts) {
      this.guestOpts.opts = d.opts;
      if (this.run) this.run.applyGuest();
    } else if (d.t === 'ready') this.guestReady = !!d.v;
  }
  onClose(c) {
    if (c !== this.conn) return;
    const had = !!this.guestOpts;
    this.conn = null; this.guestOpts = null; this.guestReady = false;
    if (this.status === 'ok') this.status = 'wait';
    if (had && this.run) this.run.dropGuest();
  }
  close() { try { this.send({ t: 'bye' }); } catch (e) { /* rien */ } setTimeout(() => { try { this.peer.destroy(); } catch (e) { /* rien */ } }, 200); }

  // Enregistre les effets visuels de la simulation pour les rejouer chez l'invité
  hook(g) {
    const ev = this.events, self = this;
    const ofx = g.fx.bind(g); g.rawFx = ofx;
    g.fx = (type, x, y, z, n = 1, o = {}) => { if (self.recording && self.connected) ev.push(['fx', type, r1(x), r1(y), r1(z), n, o]); return ofx(type, x, y, z, n, o); };
    const oaf = g.after.bind(g);
    g.after = (f, color) => { if (self.recording && self.connected) ev.push(['af', r1(f.x), r1(f.y), r1(f.z), f.facing, f.def.id, poseArr(f.getPose()), color || '#ffffff']); return oaf(f, color); };
    const obn = g.banner.bind(g);
    g.banner = (a, b, c, d) => { if (self.connected) ev.push(['bn', a, b || '', c || 120, d || '']); return obn(a, b, c, d); };
    const osh = g.shakeIt.bind(g); g.shakeIt = n => { if (self.recording && self.connected) ev.push(['sh', n]); return osh(n); };
    const ofl = g.flashIt.bind(g); g.flashIt = a => { if (self.recording && self.connected) ev.push(['fl', a]); return ofl(a); };
  }
  recordSound(n) { if (this.recording && this.connected && this.events.length < 600) this.events.push(['s', n]); }

  // Envoie l'état du combat (toutes les 2 images)
  frame(run, hub) {
    if (!this.connected) { this.events.length = 0; return; }
    if (++this.frameN % 2) return;
    const dc = this.conn.dataChannel;
    if (dc && dc.bufferedAmount > 1500000) return;   // réseau saturé : on saute une image
    const g = run.g;
    const snap = {
      t: 'snap', ph: run.phase, cr: run.campReason, ct: Math.max(0, Math.round(run.campT || 0)), th: g.theme, ww: g.worldW,
      b: [g.bounds.x0, g.bounds.x1], gid: run.guest ? run.guest.id : 0, mid: run.main.id,
      info: run.atCamp ? null : run.infoPanel(), dest: run.def.label, spd: hub.save.speed, mu: Sound.track ? Sound.track.name : null,
      f: g.fighters.filter(f => !f.gone).map(f => {
        const p = f.getPose();
        return [f.id, f.def.id, r1(f.x), r1(f.y), r1(f.z), f.facing, f.state, poseArr(p), f.flash, f.t, f.dead ? 1 : 0, f.deadT, f.inv > 0 ? 1 : 0,
          f.spin ? 1 : 0, f.weaponType() || 0, Math.round(f.hp), f.hpMax, Math.round(f.hpCap), Math.round(f.mp), f.mpMax, f.mpFlash, f.team,
          f.boss ? 1 : 0, f.ally ? 1 : 0, f.keepCorpse ? 1 : 0, f.hudTag || 0, f.hudCol || 0, f.name, f.rooted, f.clone ? 1 : 0, r1(f.vx)];
      }),
      p: g.projs.map(p => [p.kind, r1(p.x), r1(p.y), r1(p.z), r1(p.vx), r1(p.vy), r1(p.vz), p.facing, p.t, p.r, p.delay, p.life, p.maxLife, p.fx || 0, p.id, p.arm || 0, p.stationary ? 1 : 0]),
      i: g.items.map(it => [it.type, r1(it.x), r1(it.y), r1(it.z), r1(it.rot), it.holder ? 1 : 0, it.life, it.t, it.id]),
      ev: this.events.splice(0),
    };
    this.send(snap);
  }
}

// Enregistre aussi les sons de la simulation (une seule fois)
(function wrapSound() {
  const orig = Sound.play.bind(Sound);
  Sound.play = n => { orig(n); if (typeof App !== 'undefined' && App.coopHost) App.coopHost.recordSound(n); };
})();

// ---------------------------------------------------------------------
//  Invité
// ---------------------------------------------------------------------
class CoopGuest {
  constructor(save, code) {
    this.save = save; this.inbox = []; this.status = 'connecting'; this.err = ''; this.conn = null;
    try { this.peer = new Peer(); } catch (e) { this.status = 'error'; this.err = peerError(e); return; }
    this.timer = setTimeout(() => { if (this.status === 'connecting') { this.status = 'error'; this.err = 'Pas de réponse de l\'hôte. Vérifiez le code et réessayez.'; } }, 15000);
    this.peer.on('error', e => { if (this.status !== 'ok') { this.status = 'error'; this.err = peerError(e); } });
    this.peer.on('open', () => {
      const c = this.conn = this.peer.connect(COOP_PREFIX + code.toUpperCase(), { reliable: true, serialization: 'json' });
      c.on('open', () => c.send(guestHello(save)));
      c.on('data', d => {
        if (!d || !d.t) return;
        if (d.t === 'welcome') { this.status = 'ok'; this.host = d; clearTimeout(this.timer); }
        else if (d.t === 'full') { this.status = 'error'; this.err = 'Cette partie a déjà un partenaire.'; }
        else this.inbox.push(d);
      });
      c.on('close', () => { if (this.status === 'ok') this.status = 'lost'; });
      c.on('error', () => { if (this.status === 'ok') this.status = 'lost'; });
    });
  }
  send(m) { if (this.conn && this.conn.open) { try { this.conn.send(m); } catch (e) { /* rien */ } } }
  close() { clearTimeout(this.timer); try { this.peer.destroy(); } catch (e) { /* rien */ } }
}

// Combattant « fantôme » reconstruit à partir de l'état envoyé par l'hôte
class Ghost {
  constructor(a) { this.set(a); }
  set(a) {
    [this.id, this.cid, this.x, this.y, this.z, this.facing, this.state, this.pz, this.flash, this.t, this.dead, this.deadT, this.inv,
      this.spin, this.w, this.hp, this.hpMax, this.hpCap, this.mp, this.mpMax, this.mpFlash, this.team, this.boss, this.ally,
      this.keepCorpse, this.hudTag, this.hudCol, this.name, this.rooted, this.clone, this.vx] = a;
    this.def = CHARS[this.cid]; this.look = this.def.look;
    this.height = 72 * (this.look.scale || 1); this.width = 14 * (this.look.scale || 1);
    this.dead = !!this.dead; this.gone = false; this.human = false;
    if (!this.hudTag) this.hudTag = null;
    if (!this.hudCol) this.hudCol = null;
  }
  get alive() { return !this.dead; }
  getPose() { return arrPose(this.pz); }
  weaponType() { return this.w || null; }
}

// ---------------------------------------------------------------------
//  Salon : héberger ou rejoindre une partie
// ---------------------------------------------------------------------
class CoopLobby {
  constructor(save) {
    this.t = 0; this.mode = 'menu'; this.sel = 0; this.msg = '';
    this.save = save || null;
    if (!netAvailable()) { this.mode = 'error'; this.msg = 'Le module de jeu en ligne n\'a pas pu être chargé. Une connexion internet est nécessaire.'; }
    else if (!this.save) { this.mode = 'error'; this.msg = 'Fondez d\'abord votre école (et choisissez votre champion) avant de jouer en ligne.'; }
  }
  rect(i) { return { x: W / 2 - 200, y: 250 + i * 54, w: 400, h: 44 }; }
  leave() { this.removeInput(); if (this.host) this.host.close(); if (this.guest) this.guest.close(); App.coopHost = null; App.set(new LudusTitle()); }
  makeInput() {
    if (this.input) return;
    const el = this.input = document.createElement('input');
    el.maxLength = 5; el.placeholder = 'CODE'; el.autocomplete = 'off'; el.spellcheck = false;
    Object.assign(el.style, { position: 'fixed', zIndex: 10, textAlign: 'center', textTransform: 'uppercase', fontFamily: FONT, fontWeight: 'bold',
      letterSpacing: '0.3em', background: '#1e0f06', color: '#ffd27a', border: '3px solid #ffd27a', borderRadius: '8px', outline: 'none' });
    document.body.appendChild(el);
    el.addEventListener('keydown', e => { if (e.key === 'Enter') this.join(); if (e.key === 'Escape') { this.mode = 'menu'; this.removeInput(); } });
    setTimeout(() => el.focus(), 30);
  }
  placeInput() {
    if (!this.input) return;
    const r = document.getElementById('game').getBoundingClientRect(), k = r.width / W;
    Object.assign(this.input.style, { left: (r.left + (W / 2 - 130) * k) + 'px', top: (r.top + 220 * k) + 'px', width: (260 * k) + 'px', height: (50 * k) + 'px', fontSize: (30 * k) + 'px' });
  }
  removeInput() { if (this.input) { this.input.remove(); this.input = null; } }
  join() {
    const code = (this.input ? this.input.value : '').trim().toUpperCase();
    if (code.length !== 5) { this.msg = 'Le code comporte 5 caractères.'; Sound.play('nomp'); return; }
    this.removeInput();
    this.guest = new CoopGuest(this.save, code);
    this.mode = 'joining'; this.msg = '';
  }
  items() {
    if (this.mode === 'menu') return ['Héberger une partie', 'Rejoindre une partie', 'Retour'];
    if (this.mode === 'join') return ['Se connecter', 'Annuler'];
    if (this.mode === 'host') return ['Copier le code', 'Annuler'];
    return ['Retour'];
  }
  act(i) {
    Sound.play('confirm');
    const it = this.items()[i];
    if (it === 'Retour' || it === 'Annuler') { if (this.mode === 'join' || this.mode === 'host' || this.mode === 'joining') { this.removeInput(); if (this.host) { this.host.close(); this.host = null; App.coopHost = null; } if (this.guest) { this.guest.close(); this.guest = null; } this.mode = this.save && netAvailable() ? 'menu' : 'error'; this.msg = ''; this.sel = 0; } else this.leave(); return; }
    if (it === 'Héberger une partie') { this.host = new CoopHost(this.save); App.coopHost = this.host; this.mode = 'host'; this.sel = 0; }
    else if (it === 'Rejoindre une partie') { this.mode = 'join'; this.sel = 0; this.msg = ''; this.makeInput(); }
    else if (it === 'Se connecter') this.join();
    else if (it === 'Copier le code' && this.host && this.host.code) { try { navigator.clipboard.writeText(this.host.code); this.msg = 'Code copié !'; } catch (e) { this.msg = 'Copie impossible : recopiez le code à la main.'; } }
  }
  update() {
    this.t++;
    this.placeInput();
    if (this.host) {
      if (this.host.status === 'error') { this.mode = 'error'; this.msg = this.host.err; App.coopHost = null; this.host = null; }
      else if (this.host.connected) { const h = this.host; this.host = null; App.set(new LudusHub(this.save, h)); return; }
    }
    if (this.guest) {
      if (this.guest.status === 'error') { this.mode = 'error'; this.msg = this.guest.err; this.guest.close(); this.guest = null; }
      else if (this.guest.status === 'ok') { const g = this.guest; this.guest = null; App.set(new GuestHub(this.save, g)); return; }
    }
    const items = this.items(), n = items.length;
    this.sel = Math.min(this.sel, n - 1);
    if (!this.input) {
      const m = menuIn();
      if (m.up) { this.sel = (this.sel + n - 1) % n; Sound.play('select'); }
      if (m.down) { this.sel = (this.sel + 1) % n; Sound.play('select'); }
      if (m.ok) { this.act(this.sel); return; }
      if (m.back) { this.act(n - 1); return; }
    }
    items.forEach((s, i) => { if (Mouse.hit(this.rect(i + (this.mode === 'join' ? 1 : 0)))) { this.sel = i; this.act(i); } });
  }
  draw(ctx) {
    ludusBackdrop(ctx, this.t);
    txt(ctx, 'Coopération en ligne', W / 2, 70, { size: 34, color: '#ffd27a', align: 'center' });
    txt(ctx, 'Deux écoles, deux champions, une même arène. Ennemis deux fois plus dangereux, XP doublée.', W / 2, 100, { size: 14, align: 'center', color: '#f4e6d4', w: 'normal' });
    if (this.save) txt(ctx, 'Votre champion : ' + CHARS[this.save.main].name, W / 2, 124, { size: 14, align: 'center', color: '#ffe9a0' });
    if (this.mode === 'host' && this.host) {
      const st = this.host.status;
      if (st === 'init') txt(ctx, 'Ouverture de la salle…', W / 2, 190, { size: 18, align: 'center' });
      else {
        txt(ctx, 'Code de la partie, à donner à votre partenaire :', W / 2, 168, { size: 15, align: 'center', color: '#f4e6d4', w: 'normal' });
        panel(ctx, W / 2 - 130, 180, 260, 56, { fill: 'rgba(30,14,6,0.95)', stroke: '#ffd27a', lw: 3 });
        txt(ctx, this.host.code.split('').join(' '), W / 2, 220, { size: 32, align: 'center', color: '#ffd27a' });
        txt(ctx, 'En attente de votre partenaire' + '.'.repeat(1 + (this.t >> 4) % 3), W / 2, 380, { size: 15, align: 'center', color: '#bfe8c8' });
      }
    } else if (this.mode === 'join') {
      txt(ctx, 'Entrez le code donné par l\'hôte :', W / 2, 200, { size: 16, align: 'center', color: '#f4e6d4' });
    } else if (this.mode === 'joining') {
      txt(ctx, 'Connexion à la partie' + '.'.repeat(1 + (this.t >> 4) % 3), W / 2, 210, { size: 18, align: 'center', color: '#bfe8c8' });
    }
    if (this.msg) wrapText(ctx, this.msg, 700, 15, 'bold').forEach((s, i) => txt(ctx, s, W / 2, (this.mode === 'error' ? 200 : 460) + i * 22, { size: 15, align: 'center', color: this.mode === 'error' ? '#ff9a8a' : '#ffe9a0' }));
    const off = this.mode === 'join' ? 1 : 0;
    this.items().forEach((s, i) => button(ctx, this.rect(i + off), s, { active: i === this.sel, size: 17, activeCol: 'rgba(170,90,30,0.9)' }));
    txt(ctx, 'La mise en relation passe par le service gratuit PeerJS ; la partie se joue ensuite en direct entre vos deux navigateurs.', W / 2, H - 14, { size: 12, align: 'center', color: 'rgba(255,230,200,0.6)', w: 'normal' });
  }
}

// ---------------------------------------------------------------------
//  Vue de l'invité : affiche le combat de l'hôte, gère sa propre école
// ---------------------------------------------------------------------
class GuestHub {
  constructor(save, net) {
    this.save = save; this.net = net; this.t = 0; this.xpLog = []; this.overlay = null; this.snap = null; this.g = null;
    this.ghosts = new Map(); this.ready = false;
    const self = this;
    // façade utilisée par l'arbre de compétences
    this.run = {
      save, get atCamp() { return !!(self.snap && self.snap.ph === 'camp'); },
      ensureTeam() { Run.prototype.ensureTeam.call(this); },
      spawnRecruits() {}, applyStats() { self.net.send({ t: 'opts', opts: fighterOpts(save, save.main, true) }); }, goto() {},
    };
    Sound.music('title');
  }
  logXp(n, kill) { this.xpLog.push([this.t, n]); this.xpPulse = kill ? 40 : Math.max(this.xpPulse || 0, 20); this.lastGain = n; }
  xpRate() { const since = this.t - 3600; this.xpLog = this.xpLog.filter(e => e[0] > since); return this.xpLog.reduce((s, e) => s + e[1], 0); }
  rects() { return { ready: { x: 270, y: 192, w: 420, h: 38 }, tree: { x: 794, y: BAR_Y + 2, w: 160, h: 28 }, quit: { x: 646, y: BAR_Y + 2, w: 140, h: 28 } }; }
  applySnap(s) {
    const prev = this.snap; this.snap = s;
    if (!this.g || this.g.theme !== s.th || this.g.worldW !== s.ww) {
      this.g = new Battle({ theme: s.th, worldW: s.ww });
      this.g.cam.x = clamp(s.cam || 0, 0, Math.max(0, s.ww - W));
      this.ghosts.clear();
    }
    const g = this.g;
    g.bounds = { x0: s.b[0], x1: s.b[1] };
    const seen = new Set();
    g.fighters = s.f.map(a => { let gh = this.ghosts.get(a[0]); if (gh) gh.set(a); else { gh = new Ghost(a); this.ghosts.set(a[0], gh); } seen.add(a[0]); return gh; });
    for (const id of [...this.ghosts.keys()]) if (!seen.has(id)) this.ghosts.delete(id);
    const host = this.ghosts.get(s.mid); if (host) host.ally = true;
    const me = this.ghosts.get(s.gid); if (me) { me.ally = false; me.hudTag = 'Vous'; }
    g.projs = s.p.map(a => ({ kind: a[0], x: a[1], y: a[2], z: a[3], vx: a[4], vy: a[5], vz: a[6], facing: a[7], t: a[8], r: a[9], delay: a[10], life: a[11], maxLife: a[12], fx: a[13] || null, id: a[14], arm: a[15], stationary: !!a[16] }));
    g.items = s.i.map(a => ({ type: a[0], def: ITEMS[a[0]], x: a[1], y: a[2], z: a[3], rot: a[4], holder: a[5] ? true : null, life: a[6], t: a[7], id: a[8] }));
    for (const e of s.ev) this.playEvent(e);
    if (s.mu !== (Sound.track ? Sound.track.name : null)) { if (s.mu) Sound.music(s.mu); else Sound.stopMusic(); }
    if (prev && prev.ph === 'camp' && s.ph !== 'camp') { this.ready = false; if (this.overlay instanceof TreeView) this.overlay = null; }
  }
  playEvent(e) {
    const g = this.g;
    switch (e[0]) {
      case 'fx': g.fx(e[1], e[2], e[3], e[4], e[5], e[6] || {}); break;
      case 'af': { const d = CHARS[e[5]]; g.parts.push(new Particle('after', e[1], e[2], e[3], { life: 12, extra: { pose: arrPose(e[6]), look: d.look, facing: e[4], sc: d.look.scale || 1, color: e[7] } })); break; }
      case 'bn': g.banner(e[1], e[2], e[3], e[4] || undefined); break;
      case 'sh': g.shakeIt(e[1]); break;
      case 'fl': g.flashIt(e[1]); break;
      case 's': Sound.play(e[1]); break;
    }
  }
  gainXp(d) {
    const s = this.save;
    const n = Math.max(1, Math.round(d.fixed ? d.raw : d.raw * xpMul(s)));
    s.xp += n; s.totalXp += n;
    if (d.kill) s.stats.kills++;
    this.logXp(n, d.kill);
    if (d.pos && this.g) xpBurst(this.g, { x: d.pos.x, y: d.pos.y, z: d.pos.z, height: d.pos.h }, n);
  }
  quit() { writeSave(this.save); this.net.close(); App.set(new LudusTitle()); }
  update() {
    this.t++;
    if (this.xpPulse > 0) this.xpPulse--;
    this.save.stats.time++;
    for (const d of this.net.inbox.splice(0)) {
      if (d.t === 'snap') this.applySnap(d);
      else if (d.t === 'xp') this.gainXp(d);
      else if (d.t === 'bye') this.net.status = 'lost';
    }
    if (this.g) {
      this.g.updateFx(); this.g.t++;
      const me = this.snap && this.ghosts.get(this.snap.gid);
      const host = this.snap && this.ghosts.get(this.snap.mid);
      const lead = me && me.alive ? me : (host || me);
      if (this.snap && this.snap.ph === 'camp') this.g.cam.x = 0;
      else if (lead) this.g.follow(lead.x + CAM_LEAD);
    }
    if (this.t % 600 === 0) writeSave(this.save);
    if (this.net.status === 'lost') {
      if (!(this.overlay instanceof LostView)) this.overlay = new LostView(this);
    }
    if (this.overlay) {
      const r = this.overlay.update();
      if (r === 'close') this.overlay = null;
      if (r === 'title') { this.quit(); return; }
      return;
    }
    const R = this.rects();
    if (this.run.atCamp && (Keys.hit('Enter', 'Space') || Mouse.hit(R.ready))) { this.ready = !this.ready; this.net.send({ t: 'ready', v: this.ready }); Sound.play('select'); }
    if (Keys.hit('KeyT') || Mouse.hit(R.tree)) { this.overlay = new TreeView(this); Sound.play('confirm'); }
    else if (Keys.hit('Escape') || Mouse.hit(R.quit)) { this.overlay = new MenuView(this); Sound.play('select'); }
  }
  drawBar(ctx) {
    const s = this.save, R = this.rects();
    ctx.fillStyle = 'rgba(14,8,4,0.92)'; ctx.fillRect(0, BAR_Y - 2, W, H - BAR_Y + 2);
    ctx.fillStyle = '#7fd8ff'; ctx.fillRect(0, BAR_Y - 2, W, 2);
    const pu = this.xpPulse || 0;
    if (pu > 0) { ctx.fillStyle = 'rgba(255,216,74,' + (pu / 40 * 0.35) + ')'; ctx.fillRect(0, BAR_Y, 250, H - BAR_Y); }
    txt(ctx, 'XP : ' + fmt(s.xp), 10, BAR_Y + 19, { size: 17 + pu / 10, color: pu > 0 ? '#ffe98a' : '#7dff9a' });
    txt(ctx, '+' + fmt(this.xpRate()) + ' / min', 150, BAR_Y + 18, { size: 12, color: '#bfe8c8', w: 'normal' });
    txt(ctx, 'En ligne avec ' + (this.net.host ? this.net.host.hostName : 'l\'hôte') + '  •  vitesse ×' + (this.snap ? this.snap.spd : 1) + ' (choisie par l\'hôte)', 262, BAR_Y + 20, { size: 12, color: '#7fd8ff', w: 'normal' });
    button(ctx, R.quit, 'Menu (Échap)', { size: 13 });
    button(ctx, R.tree, 'Arbre (T)', { size: 14 });
  }
  drawCamp(ctx) {
    const s = this.snap, R = this.rects();
    panel(ctx, 250, 74, 460, 168, { fill: 'rgba(34,16,6,0.9)', stroke: '#7fd8ff', lw: 3 });
    txt(ctx, 'Camp d\'entraînement', W / 2, 104, { size: 24, color: '#ffd27a', align: 'center' });
    txt(ctx, 'Prochain combat : ' + s.dest, W / 2, 128, { size: 15, align: 'center' });
    txt(ctx, 'Validez vos points dans l\'Arbre (T) avant le départ.', W / 2, 150, { size: 13, align: 'center', color: '#7dff9a', w: 'normal' });
    txt(ctx, 'L\'hôte lance le combat' + (s.ct ? ' (départ auto dans ' + Math.ceil(s.ct / 60) + ' s)' : '') + '.', W / 2, 172, { size: 13, align: 'center', color: '#f4e6d4', w: 'normal' });
    button(ctx, R.ready, this.ready ? 'Prêt ! (Entrée pour annuler)' : 'Je suis prêt (Entrée)', { size: 14, active: this.ready, activeCol: 'rgba(40,110,50,0.95)' });
  }
  draw(ctx) {
    if (this.overlay && this.overlay.full) { this.overlay.draw(ctx); return; }
    if (!this.g || !this.snap) {
      ludusBackdrop(ctx, this.t);
      txt(ctx, 'Connexion à l\'arène de l\'hôte' + '.'.repeat(1 + (this.t >> 4) % 3), W / 2, H / 2, { size: 22, align: 'center', color: '#7fd8ff' });
    } else {
      const g = this.g, s = this.snap;
      g.draw(ctx);
      const heroes = g.fighters.filter(f => f.team === 1 && (f.id === s.mid || f.id === s.gid));
      heroes.sort((a, b) => (a.id === s.gid ? -1 : 1) - (b.id === s.gid ? -1 : 1));
      drawHUD(ctx, heroes, this.t);
      if (s.ph === 'camp') this.drawCamp(ctx);
      else if (s.info) drawRunPanel(ctx, s.info, g.fighters);
    }
    this.drawBar(ctx);
    if (this.overlay) this.overlay.draw(ctx);
  }
}

class LostView {
  constructor(hub) { this.hub = hub; }
  btn() { return { x: W / 2 - 160, y: 300, w: 320, h: 44 }; }
  update() { if (menuIn().ok || Mouse.hit(this.btn())) { Sound.play('confirm'); return 'title'; } return null; }
  draw(ctx) {
    ctx.fillStyle = 'rgba(10,4,0,0.75)'; ctx.fillRect(0, 0, W, H);
    txt(ctx, 'Connexion perdue', W / 2, 220, { size: 32, color: '#ff9a8a', align: 'center' });
    txt(ctx, 'L\'hôte a quitté la partie. Votre XP gagnée est bien sauvegardée.', W / 2, 256, { size: 15, align: 'center', w: 'normal' });
    button(ctx, this.btn(), 'Revenir au titre', { size: 16, fill: 'rgba(120,60,20,0.95)', border: '#ffd27a' });
  }
}
