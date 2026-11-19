'use strict';
// =====================================================================
//  LUDUS — progression : arbres de compétences, campagne, sauvegarde
// =====================================================================
const fmt = n => {
  n = Math.floor(n);
  if (n >= 1e9) return (n / 1e9).toFixed(2).replace('.', ',') + ' G';
  if (n >= 1e6) return (n / 1e6).toFixed(2).replace('.', ',') + ' M';
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
};
const pct = v => Math.round(v * 100) + ' %';

// ---------------------------------------------------------------------
//  Intelligence artificielle : niveau 0 = gladiateur maladroit, 10 = quasi parfait
// ---------------------------------------------------------------------
function aiParams(L) {
  const t = k => clamp((L[k] || 0) / 10, 0, 1);
  return {
    react: lerp(20, 3, t('reflexes')), jitter: lerp(8, 1, t('reflexes')),
    aim: lerp(24, 2, t('placement')), posErr: lerp(20, 0, t('placement')),
    atk: lerp(0.35, 0.95, t('precision')), whiff: lerp(45, 0, t('precision')),
    guard: lerp(0, 0.8, t('garde')),
    dodge: lerp(0, 0.85, t('esquive')),
    combo: lerp(0.02, 0.45, t('fluidite')),
    mana: lerp(0.25, 1, t('mana')), spMul: lerp(0.5, 1.5, t('mana')),
    run: lerp(0, 0.28, t('tactique')), jumpAtk: lerp(0.004, 0.06, t('tactique')), items: lerp(0.1, 0.9, t('tactique')), tactic: t('tactique'),
  };
}
const RECRUIT_AI = { reflexes: 5, placement: 5, precision: 5, garde: 5, esquive: 5, fluidite: 5, mana: 5, tactique: 5 };

// ---------------------------------------------------------------------
//  Définition des nœuds
//  pos : [colonne, ligne] dans la grille de l'onglet ; req : prérequis {id: niveau}
// ---------------------------------------------------------------------
const IA_NODES = [
  { id: 'reflexes', name: 'Réflexes', pos: [0, 0], max: 10, base: 3, growth: 1.55,
    desc: 'Il analyse le combat plus vite et réagit sans hésiter.',
    fx: l => 'Décide toutes les ' + Math.round(lerp(20, 3, l / 10)) + ' images' },
  { id: 'placement', name: 'Placement', pos: [1, 0], max: 10, base: 3, growth: 1.55,
    desc: 'Il se place à la bonne distance et sur la même ligne que son adversaire.',
    fx: l => 'Écart de placement ±' + Math.round(lerp(24, 2, l / 10)) + ' px' },
  { id: 'precision', name: 'Précision', pos: [2, 0], max: 10, base: 3, growth: 1.55,
    desc: 'Il frappe au bon moment au lieu de brasser de l\'air.',
    fx: l => 'Frappe à portée : ' + pct(lerp(0.35, 0.95, l / 10)) + ', coups dans le vide : ' + (l >= 10 ? 'aucun' : Math.round(lerp(45, 0, l / 10)) + ' px') },
  { id: 'garde', name: 'Garde', pos: [3, 0], max: 10, base: 3, growth: 1.55,
    desc: 'Il lève sa garde face aux attaques au corps à corps (Défense face à l\'ennemi).',
    fx: l => 'Bloque ' + pct(lerp(0, 0.8, l / 10)) + ' des attaques vues venir' },
  { id: 'mana', name: 'Gestion de la mana', pos: [0, 1], max: 10, base: 4, growth: 1.55, req: { reflexes: 2 },
    desc: 'Il lance ses pouvoirs quand ils peuvent toucher, au lieu de gaspiller sa mana. Inutile sans pouvoirs débloqués.',
    fx: l => 'Pouvoirs bien ciblés : ' + pct(lerp(0.25, 1, l / 10)) + ', fréquence ×' + lerp(0.5, 1.5, l / 10).toFixed(2) },
  { id: 'tactique', name: 'Sens tactique', pos: [1, 1], max: 10, base: 4, growth: 1.55, req: { placement: 3 },
    desc: 'Il sait quand courir, sauter ou ramasser un objet. Demande les compétences correspondantes.',
    fx: l => 'Usage de la course, des sauts et des objets : ' + pct(l / 10) },
  { id: 'fluidite', name: 'Fluidité des combos', pos: [2, 1], max: 10, base: 4, growth: 1.55, req: { precision: 2 },
    desc: 'Il enchaîne ses coups sans laisser respirer l\'adversaire. Inutile sans la compétence Enchaînement.',
    fx: l => 'Poursuit ses enchaînements : ' + pct(1 - Math.pow(1 - lerp(0.02, 0.45, l / 10), 10)) },
  { id: 'esquive', name: 'Esquive', pos: [3, 1], max: 10, base: 4, growth: 1.55, req: { garde: 2 },
    desc: 'Il repère les projectiles et les bloque ou change de ligne pour les éviter.',
    fx: l => 'Réagit à ' + pct(lerp(0, 0.85, l / 10)) + ' des projectiles' },
];
IA_NODES.forEach(n => { n.ia = true; });

const SKILL_NODES = [
  { id: 'combo', name: 'Enchaînement', cmd: 'A, A', pos: [0, 0], max: 1, base: 6, desc: 'Enchaîne un deuxième coup juste après le premier.' },
  { id: 'finisher', name: 'Coup final', cmd: 'A, A, A', pos: [0, 1], max: 1, base: 30, req: { combo: 1 }, desc: 'Après deux coups réussis, le troisième projette l\'adversaire au sol.' },
  { id: 'grab', name: 'Saisie', cmd: 'avancer vers un ennemi étourdi', pos: [0, 2], max: 1, base: 160, req: { finisher: 1 }, desc: 'Attrape un ennemi étourdi, le frappe puis le projette sur les autres.' },
  { id: 'jump', name: 'Saut et coup aérien', cmd: 'J puis A', pos: [1, 0], max: 1, base: 15, desc: 'Saute pour esquiver et frappe en retombant.' },
  { id: 'dashJump', name: 'Grand saut', cmd: 'course + J', pos: [1, 1], max: 1, base: 70, req: { jump: 1, run: 1 }, desc: 'Bond en avant suivi d\'un puissant coup sauté.' },
  { id: 'run', name: 'Course', cmd: 'double appui', pos: [2, 0], max: 1, base: 20, desc: 'Court pour rejoindre ses adversaires plus vite.' },
  { id: 'runAtk', name: 'Attaque en course', cmd: 'course + A', pos: [2, 1], max: 1, base: 45, req: { run: 1 }, desc: 'Charge qui renverse l\'adversaire.' },
  { id: 'roll', name: 'Roulade', cmd: 'course + D', pos: [2, 2], max: 1, base: 90, req: { run: 1 }, desc: 'Roulade qui traverse les attaques sans dégâts.' },
  { id: 'items', name: 'Maniement des objets', cmd: 'A près d\'un objet', pos: [3, 0], max: 1, base: 60, desc: 'Ramasse et utilise armes, pierres et caisses, et boit les élixirs.' },
];
const SP_BASE = [15, 90, 400, 1600];

// Les 4 pouvoirs d'un personnage, du moins cher au plus cher
function spKeys(def) {
  return Object.keys(def.specials).sort((a, b) => def.specials[a].mp - def.specials[b].mp);
}
function spNodes(def) {
  return spKeys(def).map((key, i) => {
    const m = def.specials[key];
    const B = i === BUFF_SLOT && BUFF_DEFS[def.id];
    if (B) return {
      id: 'sp' + i, key, name: B.name, cmd: cmdLabel(key), pos: [i, 3], max: 5, base: SP_BASE[i], growth: 2.5, special: true, buff: true,
      req: { ['sp' + (i - 1)]: 1 },
      desc: 'Renforcement (' + cmdLabel(key) + ') : ' + B.desc,
      fx: l => l === 0 ? 'Non appris' : B.fx(l) + ', ' + (6 + l) + ' s, coût ' + Math.round(m.mp * Math.max(0.6, 1 - 0.07 * (l - 1))) + ' PM',
    };
    return {
      id: 'sp' + i, key, name: m.name, cmd: cmdLabel(key), pos: [i, 3], max: 5, base: SP_BASE[i], growth: 2.5, special: true,
      req: i ? { ['sp' + (i - 1)]: 1 } : null,
      desc: 'Pouvoir élémentaire (' + cmdLabel(key) + '). Chaque niveau augmente sa puissance et réduit son coût en mana.',
      fx: l => l === 0 ? 'Non appris' : 'Puissance ' + pct(1 + 0.15 * (l - 1)) + ', coût ' + Math.round(m.mp * Math.max(0.6, 1 - 0.07 * (l - 1))) + ' PM',
    };
  });
}

function statNodes(def, recruit) {
  const P = (col, row) => [col, row];
  const cap = n => recruit ? Math.min(n, 10) : n;
  const list = [
    { id: 'force', name: 'Force', pos: P(0, 0), row: 0, max: cap(30), base: 6, growth: 1.3,
      desc: 'Augmente les dégâts des coups ET des pouvoirs.', fx: l => 'Dégâts ×' + (0.7 + 0.06 * l).toFixed(2) },
    { id: 'resist', name: 'Résistance', pos: P(1, 0), row: 1, max: cap(25), base: 8, growth: 1.33,
      desc: 'Réduit tous les dégâts reçus.', fx: l => 'Dégâts subis −' + Math.round((1 - Math.pow(0.97, l)) * 100) + ' %' },
    { id: 'vita', name: 'Vitalité', pos: P(2, 0), row: 2, max: cap(30), base: 6, growth: 1.3,
      desc: 'Augmente la vie maximale.', fx: l => 'Vie : ' + Math.round(def.hp * (HP_BASE + HP_STEP * l) * tune(def.id, 'hp')) },
    { id: 'manaMax', name: 'Réserve de mana', pos: P(0, 1), row: 3, max: cap(20), base: 4, growth: 1.33,
      desc: 'Taille de la barre de mana. Au départ, votre gladiateur n\'en a pas du tout.', fx: l => 'Mana max : ' + 25 * l },
    { id: 'manaRegen', name: 'Régénération de mana', pos: P(1, 1), row: 4, max: cap(15), base: 5, growth: 1.45, req: { manaMax: 1 },
      desc: 'Vitesse à laquelle la mana se recharge pendant le combat.', fx: l => (2.1 * l).toFixed(1).replace('.', ',') + ' mana par seconde' },
  ];
  if (recruit) list.forEach((n, i) => { n.pos = [4, i]; });
  if (!recruit) list.push({ id: 'agilite', name: 'Agilité', pos: [2, 1], max: 10, base: 20, growth: 1.6,
    desc: 'Vitesse de déplacement et de course.', fx: l => 'Vitesse ×' + (0.85 + 0.03 * l).toFixed(2) });
  return list;
}

const UTIL_NODES = [
  { id: 'speed2', name: 'Accélération ×2', pos: [0, 0], max: 1, base: 125, desc: 'Débloque la vitesse ×2 pour faire défiler les combats plus vite.', fx: l => l ? 'Vitesse ×2 disponible' : 'Vitesse ×1 seulement' },
  { id: 'speed3', name: 'Accélération ×3', pos: [0, 1], max: 1, base: 5000, req: { speed2: 1 }, desc: 'Débloque la vitesse ×3.', fx: l => l ? 'Vitesse ×3 disponible' : '—' },
  { id: 'speed4', name: 'Accélération ×4', pos: [0, 2], max: 1, base: 60000, req: { speed3: 1 }, desc: 'Débloque la vitesse ×4.', fx: l => l ? 'Vitesse ×4 disponible' : '—' },
  { id: 'xpBonus', name: 'Prime d\'expérience', pos: [1, 0], max: 20, base: 25, growth: 1.45, desc: 'Chaque ennemi vaincu rapporte davantage d\'expérience.', fx: l => 'XP +' + 10 * l + ' %' },
  { id: 'heal', name: 'Soins entre les vagues', pos: [2, 0], max: 12, base: 12, growth: 1.7, desc: 'Vie récupérée par vos combattants entre deux vagues.', fx: l => 'Récupère ' + Math.min(100, 30 + 6 * l) + ' % de la vie' },
  { id: 'intendance', name: 'Intendance', pos: [2, 1], max: 5, base: 120, growth: 2.4, req: { heal: 1 }, desc: 'Un élixir de soin peut apparaître au début de chaque vague (il faut savoir manier les objets pour le boire).', fx: l => 'Chance d\'élixir : ' + 12 * l + ' %' },
  { id: 'team1', name: 'Équipe : 1re recrue', pos: [3, 0], max: 1, base: 2500, desc: 'Débloque un premier compagnon d\'armes. Ses compétences se débloquent, son IA est moyenne et ses statistiques sont limitées.', fx: l => l ? 'Onglet « Recrue 1 » débloqué' : 'Combat en solo' },
  { id: 'team2', name: 'Équipe : 2e recrue', pos: [3, 1], max: 1, base: 30000, req: { team1: 1 }, desc: 'Débloque un deuxième compagnon d\'armes.', fx: l => l ? 'Onglet « Recrue 2 » débloqué' : '—' },
];
const RESILIENCE_XP = 30;
const GAME_XP = 2;           // multiplicateur global de l'XP gagnée (hors prime de résilience)
const COOP_XP = 2, COOP_ENEMY_DMG = 2;
const COOP_CROWD_FROM = 3, COOP_CROWD = 2;   // coop dès le palier 4 : recrues admises, ennemis ordinaires ×2   // coopération en ligne : XP et dégâts ennemis doublés
const HP_BASE = 0.3, HP_STEP = 0.06;
// Équilibrage propre au Ludus (le jeu classique garde ses valeurs) : vie, dégâts, dégâts subis
const LUDUS_TUNE = {
  kael: { hp: 1.4, atk: 1.2 }, brasia: { hp: 1.3, atk: 1.1 }, nivale: { hp: 1.35, atk: 1.1 }, volt: { hp: 1.25, atk: 1.1 },
  borak: {}, nyx: { hp: 1.25, atk: 1.1 }, lyra: { hp: 0.85, atk: 0.95 }, tekk: { hp: 0.95 },
};
const tune = (id, k) => (LUDUS_TUNE[id] && LUDUS_TUNE[id][k]) || 1;   // vie de départ très faible, ×2,1 au niveau 30

// ---------------------------------------------------------------------
//  Campagne
// ---------------------------------------------------------------------
// XP rapportée par chaque ennemi vaincu (avant multiplicateurs du palier et bonus)
const XPV = { bandit: 30, lancier: 32, archer: 32, brute: 50, acolyte: 38, givrin: 38, pyro: 38, chevalier: 55, ombre: 6,
  grokk: 250, vipere: 330, hrimgar: 420, ignar: 510, morvath: 720 };
const COST_MUL = 12;    // échelle des coûts : compétences, statistiques, utilitaire
const COST_MUL_IA = 5;  // l'Intelligence progresse bien plus vite que le reste
const PALIERS = [
  { name: 'Forêt de Lisière', theme: 'forest', music: 'forest', hp: 0.5, atk: 0.65, xp: 1, ai: -0.12, bossHp: 0.4,
    waves: [[['bandit', 1]], [['bandit', 1]], [['bandit', 2]], [['bandit', 1], ['archer', 1]], [['grokk', 1]]] },
  { name: 'Canyon Écarlate', theme: 'canyon', music: 'canyon', hp: 0.7, atk: 0.6, xp: 2, ai: -0.05, bossHp: 0.5,
    waves: [[['lancier', 1], ['bandit', 1]], [['archer', 2], ['bandit', 1]], [['lancier', 2], ['brute', 1]], [['bandit', 2], ['archer', 2], ['lancier', 1]], [['vipere', 1], ['archer', 1]]] },
  { name: 'Pics Gelés', theme: 'snow', music: 'snow', hp: 0.95, atk: 0.8, xp: 4, ai: 0, bossHp: 0.6,
    waves: [[['givrin', 2], ['bandit', 1]], [['lancier', 2], ['givrin', 2]], [['brute', 2], ['archer', 1]], [['givrin', 2], ['chevalier', 1], ['bandit', 2]], [['hrimgar', 1], ['givrin', 1]]] },
  { name: 'Forge Volcanique', theme: 'volcano', music: 'volcano', hp: 1.35, atk: 1.1, xp: 8, ai: 0.05, bossHp: 0.65,
    waves: [[['pyro', 2], ['lancier', 2]], [['brute', 2], ['pyro', 2]], [['chevalier', 2], ['archer', 2]], [['pyro', 2], ['chevalier', 1], ['brute', 1], ['bandit', 2]], [['ignar', 1], ['pyro', 2]]] },
  { name: 'Citadelle du Néant', theme: 'citadel', music: 'citadel', hp: 1.75, atk: 1.35, xp: 15, ai: 0.1, bossHp: 0.7,
    waves: [[['acolyte', 3], ['chevalier', 1]], [['chevalier', 2], ['acolyte', 2], ['lancier', 2]], [['grokk', 1], ['vipere', 1]], [['acolyte', 3], ['brute', 2], ['chevalier', 2]], [['morvath', 1]]] },
];
const ARENA_POOL = ['bandit', 'lancier', 'archer', 'brute', 'acolyte', 'givrin', 'pyro', 'chevalier'];
const ARENA_THEMES = ['arena', 'forest', 'canyon', 'snow', 'volcano', 'citadel'];

// Description complète d'un lieu de combat : palier de la campagne ou niveau d'arène
function locDef(loc) {
  if (loc.type === 'stage') {
    const p = PALIERS[loc.i];
    return Object.assign({ label: 'Palier ' + (loc.i + 1) + ' — ' + p.name }, p);
  }
  const n = loc.n, r = seeded(n * 7919);
  const pick = a => a[Math.floor(r() * a.length)];
  const waves = [];
  for (let w = 0; w < 4; w++) {
    const cnt = Math.min(8, 3 + Math.floor(n / 2) + (w > 1 ? 1 : 0));
    const list = []; for (let k = 0; k < cnt; k++) list.push([pick(ARENA_POOL), 1]);
    waves.push(list);
  }
  const nb = Math.min(5, 1 + Math.floor(n / 2));
  const pool = BOSSES.slice(0, Math.min(BOSSES.length, nb + 1 + Math.floor(n / 3))), bosses = [];
  while (bosses.length < nb) bosses.push(pool.splice(Math.floor(r() * pool.length), 1)[0]);
  waves.push(bosses.map(b => [b, 1]));
  return {
    label: 'Arène des Champions — niveau ' + n, name: 'Arène des Champions', theme: ARENA_THEMES[(n - 1) % ARENA_THEMES.length], music: 'vs',
    hp: 1.75 * Math.pow(1.1, n), atk: 1.35 * Math.pow(1.06, n), xp: 15 * Math.pow(1.1, n), ai: 0.15, bossHp: 0.6, waves,
  };
}

// ---------------------------------------------------------------------
//  Sauvegarde
// ---------------------------------------------------------------------
// Plusieurs écoles indépendantes, une par emplacement. Chaque écriture est doublée
// d'une copie de secours ; la sauvegarde peut aussi être exportée dans un fichier.
const SLOT_COUNT = 5;
const slotKey = i => 'ludus_slot_' + i;
const slotBak = i => 'ludus_slot_' + i + '_bak';
let saveError = '';
function newSave(mainId, slot) {
  return {
    v: 1, slot, main: mainId, xp: 0, totalXp: 0,
    lv: { main: {}, r: {} }, team: [null, null],
    loc: { type: 'stage', i: 0 }, maxStage: 0, arenaMax: 0,
    mode: 'progress', speed: 1, tuto: true,
    stats: { kills: 0, defeats: 0, waves: 0, time: 0 },
    created: Date.now(), played: Date.now(),
  };
}
function validSave(s) {
  return !!(s && s.v === 1 && CHARS[s.main] && PLAYABLE.includes(s.main) && s.lv && s.lv.main && s.lv.r && s.stats && s.loc && typeof s.xp === 'number');
}
// Remet une sauvegarde d'aplomb : bornes, identifiants, niveaux plafonnés aux maximums de l'arbre
function normalizeSave(s) {
  const num = (v, d = 0) => (typeof v === 'number' && isFinite(v) && v >= 0 ? v : d);
  s.xp = num(s.xp); s.totalXp = Math.max(num(s.totalXp), s.xp);
  s.maxStage = clamp(Math.floor(num(s.maxStage)), 0, PALIERS.length);
  s.arenaMax = Math.floor(num(s.arenaMax));
  if (s.maxStage >= PALIERS.length) s.arenaMax = Math.max(1, s.arenaMax); else s.arenaMax = 0;
  const L = s.loc || {};
  if (L.type === 'arena' && s.arenaMax > 0) s.loc = { type: 'arena', n: clamp(Math.floor(num(L.n, 1)), 1, s.arenaMax) };
  else s.loc = { type: 'stage', i: clamp(Math.floor(num(L.i)), 0, Math.min(s.maxStage, PALIERS.length - 1)) };
  const clampLv = (lv, nodes) => { const out = {}; for (const n of nodes) { const v = Math.floor(num(lv && lv[n.id])); if (v > 0) out[n.id] = Math.min(v, n.max); } return out; };
  const md = CHARS[s.main];
  s.lv.main = clampLv(s.lv.main, IA_NODES.concat(SKILL_NODES, spNodes(md), statNodes(md, false), UTIL_NODES));
  const r = {};
  for (const id in s.lv.r) if (PLAYABLE.includes(id) && id !== s.main && s.lv.r[id] && typeof s.lv.r[id] === 'object') r[id] = clampLv(s.lv.r[id], SKILL_NODES.concat(spNodes(CHARS[id]), statNodes(CHARS[id], true)));
  s.lv.r = r;
  s.team = [0, 1].map(k => { const id = Array.isArray(s.team) ? s.team[k] : null; return PLAYABLE.includes(id) && id !== s.main ? id : null; });
  if (s.team[0] && s.team[0] === s.team[1]) s.team[1] = null;
  const st = s.stats || {};
  s.stats = { kills: num(st.kills), defeats: num(st.defeats), waves: num(st.waves), time: num(st.time) };
  s.mode = s.mode === 'repeat' ? 'repeat' : 'progress';
  s.speed = clamp(Math.floor(num(s.speed, 1)), 1, 4);
  s.tuto = !!s.tuto;
  return s;
}
function readKey(k) { try { const s = JSON.parse(localStorage.getItem(k)); return validSave(s) ? normalizeSave(s) : null; } catch (e) { return null; } }
function loadSave(slot) {
  const s = readKey(slotKey(slot)) || readKey(slotBak(slot));
  if (s) s.slot = slot;
  return s;
}
function writeSave(s) {
  if (!s || !s.slot) return false;
  s.played = Date.now();
  const j = JSON.stringify(s);
  try { localStorage.setItem(slotKey(s.slot), j); localStorage.setItem(slotBak(s.slot), j); saveError = ''; return true; }
  catch (e) { saveError = 'Impossible d\'écrire la sauvegarde (stockage du navigateur plein ou bloqué).'; return false; }
}
function deleteSave(slot) { try { localStorage.removeItem(slotKey(slot)); localStorage.removeItem(slotBak(slot)); } catch (e) { /* rien */ } }
function listSaves() { const a = []; for (let i = 1; i <= SLOT_COUNT; i++) a.push(loadSave(i)); return a; }
// Ancienne sauvegarde unique : déplacée dans le premier emplacement libre
function migrateOldSave() {
  try {
    const old = readKey('ludus_save');
    if (!old) return;
    for (let i = 1; i <= SLOT_COUNT; i++) if (!loadSave(i)) { old.slot = i; writeSave(old); localStorage.removeItem('ludus_save'); return; }
  } catch (e) { /* rien */ }
}
// Demande au navigateur de ne pas effacer les données du jeu pour libérer de la place
function requestPersist() {
  try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist().then(ok => { App.persisted = ok; }).catch(() => {}); } catch (e) { /* rien */ }
}
function exportSave(s) {
  const blob = new Blob([JSON.stringify(s, null, 1)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'ludus-' + s.main + '-emplacement' + s.slot + '-' + new Date().toISOString().slice(0, 10) + '.json';
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
function importSave(slot, done) {
  const inp = document.createElement('input');
  inp.type = 'file'; inp.accept = '.json,application/json';
  inp.onchange = () => {
    const f = inp.files && inp.files[0]; if (!f) return;
    const rd = new FileReader();
    rd.onload = () => {
      try {
        const s = JSON.parse(rd.result); if (!validSave(s)) throw new Error('invalide');
        normalizeSave(s); s.slot = slot;
        done(writeSave(s));   // l'import n'est annoncé réussi que si l'écriture a vraiment eu lieu
      }
      catch (e) { done(false); }
    };
    rd.readAsText(f);
  };
  inp.click();
}

// ---------------------------------------------------------------------
//  Arbre : coûts, prérequis, achats
// ---------------------------------------------------------------------
function levelsOf(save, owner) {
  if (owner === 'main') return save.lv.main;
  return save.lv.r[owner] || (save.lv.r[owner] = {});
}
function nodeCost(n, lvl) { return Math.round(n.base * (n.ia ? COST_MUL_IA : COST_MUL) * Math.pow(n.growth || 1, lvl)); }
function reqMet(n, L) {
  if (!n.req) return true;
  for (const k in n.req) if ((L[k] || 0) < n.req[k]) return false;
  return true;
}
function reqText(n, nodes) {
  if (!n.req) return '';
  return 'Requiert : ' + Object.keys(n.req).map(k => { const o = nodes.find(x => x.id === k); return (o ? o.name : k) + (n.req[k] > 1 ? ' niv. ' + n.req[k] : ''); }).join(', ');
}

// Nœuds affichés dans un onglet
function tabNodes(save, tab) {
  const def = CHARS[save.main];
  if (tab === 'ia') return IA_NODES;
  if (tab === 'skills') return SKILL_NODES.concat(spNodes(def));
  if (tab === 'stats') return statNodes(def, false);
  if (tab === 'util') return UTIL_NODES;
  // onglet recrue : compétences + statistiques limitées
  const id = save.team[+tab[1]];
  const rd = CHARS[id];
  return SKILL_NODES.concat(spNodes(rd), statNodes(rd, true));
}

// ---------------------------------------------------------------------
//  Options de combattant calculées à partir de l'arbre
// ---------------------------------------------------------------------
function fighterOpts(save, charId, isMain) {
  const def = CHARS[charId];
  const L = isMain ? save.lv.main : levelsOf(save, charId);
  const g = k => L[k] || 0;
  const perks = { sp: {} };
  for (const n of SKILL_NODES) perks[n.id] = g(n.id) > 0;
  spKeys(def).forEach((key, i) => { if (g('sp' + i)) perks.sp[key] = g('sp' + i); });
  if (BUFF_DEFS[charId]) perks.buffs = { [spKeys(def)[BUFF_SLOT]]: charId };
  return {
    hp: def.hp * (HP_BASE + HP_STEP * g('vita')) * tune(charId, 'hp'),
    atkMul: (0.7 + 0.06 * g('force')) * tune(charId, 'atk'),
    defMul: Math.pow(0.97, g('resist')) * tune(charId, 'def'),
    mpMax: 25 * g('manaMax'), mpRegen: 0.035 * g('manaRegen'),
    spd: isMain ? 0.85 + 0.03 * g('agilite') : 0.95,
    perks, aiP: aiParams(isMain ? L : RECRUIT_AI),
  };
}
function maxSpeed(save) { const u = save.lv.main; return u.speed4 ? 4 : u.speed3 ? 3 : u.speed2 ? 2 : 1; }
function healPct(save) { return Math.min(1, 0.3 + 0.06 * (save.lv.main.heal || 0)); }
function xpMul(save) { return 1 + 0.1 * (save.lv.main.xpBonus || 0); }
function teamSlots(save) { return (save.lv.main.team1 ? 1 : 0) + (save.lv.main.team2 ? 1 : 0); }
