'use strict';
// =====================================================================
//  BOUCLE PRINCIPALE
// =====================================================================
const App = {
  scene: null,
  diff: Store.get('diff', 1),
  unlocked: Store.get('unlock', false),
  vsCfg: null, titleSel: 0,
  set(s) { this.scene = s; },
  update() {
    if (Keys.hit('KeyM')) Sound.setMusic(!Sound.musicOn);
    if (this.scene) this.scene.update();
  },
  draw(ctx) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
    if (this.scene) this.scene.draw(ctx);
  },
};

(function boot() {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  function resize() {
    const s = Math.min(innerWidth / W, innerHeight / H);
    canvas.style.width = Math.floor(W * s) + 'px';
    canvas.style.height = Math.floor(H * s) + 'px';
  }
  addEventListener('resize', resize); resize();
  Keys.init();
  App.set(new TitleScene());
  const STEP = 1000 / 60;
  let last = performance.now(), acc = 0;
  function frame(now) {
    acc += Math.min(100, now - last); last = now;
    let n = 0;
    while (acc >= STEP && n < 4) {
      try { App.update(); } catch (e) { console.error(e); }
      Keys.pressed.clear();
      acc -= STEP; n++;
    }
    if (n === 4) acc = 0;
    try { App.draw(ctx); } catch (e) { console.error(e); }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  window.__app = App;
})();
