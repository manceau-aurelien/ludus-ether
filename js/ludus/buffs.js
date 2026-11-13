'use strict';
// =====================================================================
//  LUDUS — sorts de renforcement
//  Le 3e pouvoir de chaque Gardien (par coût en mana) devient un sort qui le
//  renforce pendant quelques secondes : durée = 6 s + 1 s par niveau.
// =====================================================================
const BUFF_SLOT = 2;
const BUFF_DEFS = {
  kael: {
    name: 'Souffle du Zéphyr', col: '#6ff0c8', sfx: 'wind',
    desc: 'le vent le porte : il se déplace bien plus vite et esquive une partie des coups.',
    fx: l => 'Vitesse ×' + (1.3 + 0.05 * l).toFixed(2) + ', esquive ' + Math.round((0.2 + 0.05 * l) * 100) + ' %',
    apply(f, l) { const v = 1.3 + 0.05 * l; f.spd *= v; return { evade: 0.2 + 0.05 * l, undo: x => { x.spd /= v; } }; },
  },
  brasia: {
    name: 'Fureur Ardente', col: '#ff7a2a', sfx: 'fire',
    desc: 'elle s\'embrase : tous ses coups et pouvoirs frappent bien plus fort.',
    fx: l => 'Dégâts ×' + (1.3 + 0.06 * l).toFixed(2),
    apply(f, l) {
      const v = 1.3 + 0.06 * l; f.atkMul *= v;
      return { undo: x => { x.atkMul /= v; }, tick: (x, g) => { if (x.t % 3 === 0) g.fx('fire', x.x + rand(-10, 10), x.y + rand(5, x.height), x.z + 1, 1); } };
    },
  },
  nivale: {
    name: 'Armure de Givre', col: '#bfefff', sfx: 'freeze',
    desc: 'une carapace de glace la rend insensible aux attaques à distance et amortit les coups.',
    fx: l => 'Immunité aux projectiles, dégâts au corps à corps −' + Math.round((0.1 + 0.03 * l) * 100) + ' %',
    apply(f, l) { const v = 0.9 - 0.03 * l; f.defMul *= v; return { antiProj: true, undo: x => { x.defMul /= v; } }; },
  },
  volt: {
    name: 'Surcharge', col: '#fff27a', sfx: 'zap',
    desc: 'chargé d\'électricité, chacun de ses coups électrise l\'adversaire et sa mana se recharge très vite.',
    fx: l => 'Coups électrisants, mana +' + ((0.2 + 0.04 * l) * 60).toFixed(0) + '/s',
    apply(f, l) { const v = 0.2 + 0.04 * l; f.mpRegen = (f.mpRegen || 0) + v; return { onHit: 'shock', undo: x => { x.mpRegen -= v; } }; },
  },
  borak: {
    name: 'Peau de Granit', col: '#c89b4a', sfx: 'earth',
    desc: 'sa peau devient pierre : il encaisse beaucoup moins de dégâts et ne recule plus sous les petits coups.',
    fx: l => 'Dégâts subis −' + Math.round((0.4 + 0.04 * l) * 100) + ' %, inébranlable',
    apply(f, l) { const v = 0.6 - 0.04 * l; f.defMul *= v; return { armor: true, undo: x => { x.defMul /= v; } }; },
  },
  nyx: {
    name: 'Voile d\'Ombre', col: '#9b4dff', sfx: 'dark',
    desc: 'elle se fond dans l\'ombre : les ennemis la perdent de vue, et ses coups surprennent.',
    fx: l => 'Camouflage, dégâts ×' + (1.2 + 0.04 * l).toFixed(2),
    apply(f, l) { const v = 1.2 + 0.04 * l; f.atkMul *= v; return { stealth: true, undo: x => { x.atkMul /= v; } }; },
  },
  lyra: {
    name: 'Sève Vivifiante', col: '#7dff9a', sfx: 'heal',
    desc: 'la sève régénère sa vie et celle des alliés proches pendant toute la durée.',
    fx: l => 'Régénère ' + (2 + 0.5 * l).toFixed(1).replace('.', ',') + ' % de vie par seconde (équipe proche)',
    apply(f, l) {
      const k = (0.02 + 0.005 * l) / 2;
      return { tick: (x, g) => {
        if (x.t % 30) return;
        for (const o of g.fighters) if (o.team === x.team && o.alive && Math.abs(o.x - x.x) < 230 && Math.abs(o.z - x.z) < 90) {
          o.healPool += o.hpMax * k; o.hpCap = Math.min(o.hpMax, o.hpCap + o.hpMax * k); g.fx('heal', o.x, o.y + 40, o.z + 1, 2);
        }
      } };
    },
  },
  tekk: {
    name: 'Bouclier Énergétique', col: '#40e0ff', sfx: 'laser',
    desc: 'un bouclier absorbe les dégâts jusqu\'à ce qu\'il cède ou que l\'effet s\'arrête.',
    fx: l => 'Absorbe ' + Math.round((0.25 + 0.05 * l) * 100) + ' % de la vie max',
    apply(f, l) { return { shield: f.hpMax * (0.25 + 0.05 * l), tick: x => { if (x.buff.shield <= 0) x.buff.t = 0; } }; },
  },
};

function castBuff(f, g, B) {
  const l = f.castLevel || 1;
  if (f.buff && f.buff.undo) f.buff.undo(f);
  const extra = B.apply(f, l, g) || {};
  const dur = (6 + l) * 60;
  f.buff = Object.assign({ name: B.name, col: B.col, t: dur, max: dur }, extra);
  Sound.play(B.sfx || 'heal');
  g.fx('ring', f.x, 4, f.z, 1, { color: B.col, size: 44 });
  g.fx('text', f.x, f.y + f.height + 18, f.z + 1, 1, { text: B.name, color: B.col, size: 14 });
}

// Mouvements de lancement : même coût en mana que le pouvoir remplacé
for (const id in BUFF_DEFS) {
  const B = BUFF_DEFS[id], def = CHARS[id];
  const orig = def.specials[spKeys(def)[BUFF_SLOT]];
  BUFF_MOVES[id] = M({
    name: B.name, mp: orig.mp, dur: 28, anim: AN.castUp,
    check: f => !(f.buff && f.buff.t > 90),
    on: { 8: (f, g) => castBuff(f, g, B) },
  });
}
