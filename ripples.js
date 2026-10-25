// Ripples: splash rings + home sparkles on the water layer.
function spawnSplash(x, y, big) {
  const n = big ? 26 : 12;
  for (let i = 0; i < n; i++) {
    const p = new Particle(x + rand(-14, 14), y + rand(-8, 8));
    p.radius = rand(2, 6);
    p.opacity = rand(0.6, 1);
    ripplesArray.unshift(p);
  }
  burstDust(x, y, big ? 14 : 6, 'rgba(190,225,255,0.9)');
}

function spawnSparkle(x, y, color) {
  for (let i = 0; i < 16; i++) {
    const p = new Particle(x + rand(-16, 16), y + rand(-10, 10));
    p.radius = rand(2, 5);
    p.opacity = 1;
    p.directionX = rand(-1.4, 1.4);
    p.directionY = rand(-2.2, -0.4);
    p.color = color || 'rgba(255,224,102,0.95)';
    particlesArray.unshift(p);
  }
}

function shakeScreen(ms, mag) {
  shakeUntil = performance.now() + ms;
  shakeMag = mag;
}
let shakeUntil = 0;
let shakeMag = 0;

function applyShake(now) {
  const wrap = document.querySelector('.stage');
  if (!wrap) return;
  if (now < shakeUntil) {
    const dx = rand(-shakeMag, shakeMag);
    const dy = rand(-shakeMag, shakeMag);
    wrap.style.transform = 'translate(' + dx.toFixed(1) + 'px,' + dy.toFixed(1) + 'px)';
  } else if (wrap.style.transform) {
    wrap.style.transform = '';
  }
}
