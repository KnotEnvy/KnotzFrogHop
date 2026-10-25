// Game flow: loop, scoring, deaths, levels, input, HUD, screens.
const $ = (id) => document.getElementById(id);
let fontsReady = false;

// Flow bonus: chained quick hops multiply hop points up to x5, rewarding pace.
let flow = 0;
let flowUntil = 0;
function resetFlow() { flow = 0; flowUntil = 0; }

function onHopLanded(wentUp) {
  if (screen !== 'playing') return;
  hopCount++;
  AudioSys.land();
  burstDust(frogger.x, frogger.y, 4, 'rgba(210,190,150,0.8)');
  const now = performance.now();
  if (now < flowUntil) flow = Math.min(5, flow + 1);
  else flow = 1;
  flowUntil = now + 900;
  if (wentUp) {
    const gained = 10 * flow;
    score += gained;
    streak++;
    spawnFloater(frogger.x + 25, frogger.y - 6,
      flow >= 2 ? '+' + gained + ' FLOW x' + flow : '+' + gained,
      flow >= 2 ? '#7CFC98' : '#ffe066');
    if (streak > 0 && streak % 5 === 0) {
      score += 25;
      spawnFloater(frogger.x + 25, frogger.y - 30, 'COMBO +' + 25, '#7CFC98');
    }
  }
  updateHUD();
}

function resolveHomeLanding() {
  if (screen !== 'playing') return;
  const cx = frogger.x + frogger.width / 2;
  const pad = homes.find((h) => cx >= h.x - 6 && cx <= h.x + h.w + 6);
  if (!pad) { frogger.resetToStart(); return; }
  if (pad.filled) {
    score += 10;
    spawnFloater(cx, 90, '+10', '#ffffff');
    frogger.resetToStart();
    updateHUD();
    return;
  }
  pad.filled = true;
  homesCount++;
  let gained = 100 + streak * 2;
  let label = '+' + gained;
  const idx = homes.indexOf(pad);
  if (fly && fly.padIndex === idx && performance.now() < fly.until) {
    gained += 200;
    label = 'FLY +200  +' + (gained - 200);
    AudioSys.fly();
    fly = null;
  } else {
    AudioSys.home();
  }
  score += gained;
  spawnFloater(cx, 90, label, '#ffe066');
  spawnSparkle(cx - 25, 60);
  gameSpeed += 0.03;
  streak = 0;
  resetFlow();
  frogger.resetToStart();
  resetClock();
  updateHUD();
  if (homesCount >= homes.length) onLevelClear();
}

function onDeath(kind) {
  if (screen !== 'playing') return;
  if (kind !== 'time' && performance.now() < (frogger.invulnUntil || 0)) return;
  lives--;
  streak = 0;
  resetFlow();
  if (kind === 'time') {
    AudioSys.timeUp();
  } else {
    AudioSys.splat();
  }
  if (kind === 'water' || kind === 'swept') AudioSys.splash();
  shakeScreen(280, kind === 'traffic' ? 7 : 5);
  burstDust(frogger.x, frogger.y, 18, kind === 'traffic' ? 'rgba(255,90,90,0.9)' : 'rgba(190,225,255,0.9)');
  spawnFloater(frogger.x + 25, frogger.y - 10,
    kind === 'traffic' ? 'SPLAT!' : kind === 'swept' ? 'SWEPT AWAY!' : kind === 'time' ? 'TIME UP!' : 'SPLASH!',
    '#ff7b7b');
  updateHUD();
  if (lives <= 0) {
    gameWon = false;
    gameoverReason = kind === 'traffic'
      ? 'The frog became a hood ornament.'
      : kind === 'time' ? 'The frog ran out of daylight.'
      : kind === 'swept' ? 'The current carried the frog away.' : 'The frog never learned to swim.';
    saveBest();
    setTimeout(() => showGameOver(), 650);
    screen = 'dying';
    setTimeout(() => { if (screen === 'dying') screen = 'gameover'; }, 700);
  } else {
    frogger.resetToStart();
    frogger.invulnUntil = performance.now() + 1500;
    resetClock();
  }
}

function onLevelClear() {
  const bonus = 250 * (levelIndex + 1);
  score += bonus;
  saveBest();
  updateHUD();
  if (levelIndex >= LEVELS.length - 1) {
    gameWon = true;
    gameoverReason = 'Every pad is home. The pond is yours.';
    AudioSys.win();
    screen = 'levelclear';
    levelClearTimer = performance.now() + 2200;
    showLevelClear(true, bonus);
  } else {
    AudioSys.win();
    screen = 'levelclear';
    levelClearTimer = performance.now() + 2400;
    showLevelClear(false, bonus);
  }
}

function advanceLevel() {
  levelIndex = Math.min(levelIndex + 1, LEVELS.length - 1);
  buildLevel(levelIndex);
  clearEffects();
  frogger.resetToStart();
  frogger.invulnUntil = performance.now() + 800;
  screen = 'playing';
  syncScreens();
  updateHUD();
}

function startRun() {
  AudioSys.init();
  AudioSys.startMusic();
  AudioSys.ui();
  score = 0;
  lives = 3;
  levelIndex = 0;
  streak = 0;
  resetFlow();
  hopCount = 0;
  gameWon = false;
  gameoverReason = '';
  buildLevel(0);
  clearEffects();
  frogger.resetToStart();
  frogger.invulnUntil = performance.now() + 1500;
  resetClock();
  screen = 'playing';
  syncScreens();
  updateHUD();
}

function togglePause() {
  if (screen === 'playing') { screen = 'paused'; AudioSys.ui(); }
  else if (screen === 'paused') { screen = 'playing'; AudioSys.ui(); }
  syncScreens();
}

// ---- HUD + screens (DOM) ----
let lastHUD = '';
function updateHUD() {
  const lvl = LEVELS[levelIndex];
  const secs = Math.max(0, Math.ceil(timeLeft));
  const key = [score, best, lives, levelIndex, streak, flow, homesCount, secs].join('|');
  if (key === lastHUD) return;
  lastHUD = key;
  $('hudScore').textContent = score;
  $('hudBest').textContent = Math.max(best, score);
  $('hudLevel').textContent = (levelIndex + 1) + '/' + LEVELS.length;
  $('hudLevelName').textContent = lvl.name;
  const comboText = flow >= 2 ? 'FLOW x' + flow : (streak >= 3 ? 'COMBO x' + streak : '');
  $('hudCombo').textContent = comboText;
  $('hudCombo').style.display = comboText ? '' : 'none';
  $('hudPads').textContent = homesCount + '/' + homes.length + ' pads';
  $('hudTime').textContent = 'TIME ' + secs;
  $('hudTime').classList.toggle('urgent', secs <= 10);
  const hearts = $('hudLives');
  hearts.innerHTML = '';
  for (let i = 0; i < 3; i++) {
    const s = document.createElement('span');
    s.className = 'life' + (i < lives ? '' : ' lost');
    hearts.appendChild(s);
  }
}

function hideAllPanels() {
  for (const id of ['titleScreen', 'helpScreen', 'pauseScreen', 'clearScreen', 'overScreen']) {
    $(id).classList.add('hidden');
  }
}
function syncScreens() {
  hideAllPanels();
  $('topHud').classList.toggle('hidden', screen === 'title' || screen === 'help');
  if (screen === 'title') $('titleScreen').classList.remove('hidden');
  if (screen === 'help') $('helpScreen').classList.remove('hidden');
  if (screen === 'paused') $('pauseScreen').classList.remove('hidden');
  if (screen === 'dying') { /* brief action beat, no panel */ }
}
function showLevelClear(won, bonus) {
  hideAllPanels();
  $('topHud').classList.remove('hidden');
  $('clearTitle').textContent = won ? 'POND CONQUERED!' : 'LEVEL CLEAR!';
  $('clearSub').textContent = won
    ? 'Every pad is home. Final bonus +' + bonus
    : LEVELS[levelIndex].name + ' cleared! Bonus +' + bonus;
  $('clearScreen').classList.remove('hidden');
}
function showGameOver() {
  saveBest();
  syncScreens();
  hideAllPanels();
  $('topHud').classList.remove('hidden');
  $('overTitle').textContent = gameWon ? 'YOU WIN!' : 'GAME OVER';
  $('overTitle').classList.toggle('win', gameWon);
  $('overReason').textContent = gameoverReason;
  $('statScore').textContent = score;
  $('statBest').textContent = Math.max(best, score);
  $('statLevel').textContent = (levelIndex + 1) + '/' + LEVELS.length;
  $('statHops').textContent = hopCount;
  $('overScreen').classList.remove('hidden');
  if (gameWon) AudioSys.win(); else AudioSys.lose();
}

// ---- Main loop ----
function drawBackdropTint() {
  // Gradients are cached per level in setup.js: zero allocations per frame.
  if (!cachedVignette) cacheBackdrop();
  ctx5.fillStyle = cachedTint;
  ctx5.fillRect(0, 0, canvas.width, canvas.height);
  ctx5.fillStyle = cachedVignette;
  ctx5.fillRect(0, 0, canvas.width, canvas.height);
  ctx5.fillStyle = cachedSky;
  ctx5.fillRect(0, 0, canvas.width, 120);
}

let lastFrameNow = 0;
function animate(now) {
  now = now || performance.now();
  // Crossing-attempt clock: waiting has a cost, and the last seconds tick.
  if (screen === 'playing' && lastFrameNow) {
    const dt = Math.min(0.1, (now - lastFrameNow) / 1000);
    timeLeft -= dt;
    const secs = Math.ceil(timeLeft);
    if (secs !== lastTickSecond) {
      lastTickSecond = secs;
      if (secs <= 5 && secs > 0) AudioSys.tick();
      updateHUD();
    }
    if (timeLeft <= 0) onDeath('time');
  }
  lastFrameNow = now;
  ctx1.clearRect(0, 0, canvas.width, canvas.height);
  ctx2.clearRect(0, 0, canvas.width, canvas.height);
  ctx3.clearRect(0, 0, canvas.width, canvas.height);
  ctx4.clearRect(0, 0, canvas.width, canvas.height);
  ctx5.clearRect(0, 0, canvas.width, canvas.height);
  handleRipples();
  ctx2.drawImage(background_lvl2, 0, 0, canvas.width, canvas.height);
  handleParticles();
  // The world runs behind live screens only: pause, level-clear, and
  // game-over freeze traffic so resume is never an instant unfair death.
  // Transient feedback (particles, ripples, floaters) always drains.
  const worldLive = screen === 'playing' || screen === 'dying' || screen === 'title' || screen === 'help';
  if (screen === 'playing' || screen === 'dying') frogger.update(now || performance.now());
  frogger.draw(now || performance.now());
  handleObstacles(now || performance.now(), worldLive);
  if (worldLive) updateFly(now || performance.now());
  ctx4.drawImage(grass, 0, 0, canvas.width, canvas.height);
  drawHomes(now || performance.now());
  if (worldLive) drawWeather(now || performance.now());
  drawBackdropTint();
  handleFloaters(now || performance.now());
  applyShake(now || performance.now());
  if (screen === 'levelclear' && performance.now() > levelClearTimer) {
    if (gameWon) { screen = 'gameover'; showGameOver(); }
    else advanceLevel();
  }
  // Blink invulnerable frog after respawn.
  frame++;
  requestAnimationFrame(animate);
}

let lastKeyHop = 0;
// ---- Input: keyboard ----
window.addEventListener('keydown', function (e) {
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
  AudioSys.init();
  if (e.code === 'Escape' || e.code === 'KeyP') {
    if (screen === 'playing' || screen === 'paused') togglePause();
    return;
  }
  if (e.code === 'KeyM') { AudioSys.init(); AudioSys.setMuted(!AudioSys.muted); return; }
  if (e.code === 'Enter' || e.code === 'Space') {
    if (screen === 'title' || screen === 'gameover') { startRun(); return; }
    if (screen === 'levelclear') return;
  }
  if (screen !== 'playing') return;
  // Held keys auto-repeat at a capped rate so continuous travel works.
  if (e.repeat) {
    if (frogger.hop || performance.now() - lastKeyHop < 190) return;
  }
  keys = {};
  keys[e.code] = true;
  const g = grid;
  if (e.code === 'ArrowUp' || e.code === 'KeyW') frogger.tryHop(0, -g, 0);
  else if (e.code === 'ArrowDown' || e.code === 'KeyS') frogger.tryHop(0, g, 3);
  else if (e.code === 'ArrowLeft' || e.code === 'KeyA') frogger.tryHop(-g, 0, 2);
  else if (e.code === 'ArrowRight' || e.code === 'KeyD') frogger.tryHop(g, 0, 1);
  else return;
  if (frogger.hop) lastKeyHop = performance.now();
  frogger.jump();
});

window.addEventListener('keyup', function (e) {
  delete keys[e.code];
  frogger.moving = false;
  if (!frogger.hop) frogger.frameX = 0;
});

// ---- Input: touch swipe + d-pad ----
(function initTouch() {
  const stage = $('stage');
  let sx = 0, sy = 0, tracking = false;
  stage.addEventListener('touchstart', function (e) {
    AudioSys.init();
    const t = e.changedTouches[0];
    sx = t.clientX; sy = t.clientY; tracking = true;
  }, { passive: true });
  stage.addEventListener('touchend', function (e) {
    if (!tracking || screen !== 'playing') return;
    const t = e.changedTouches[0];
    const dx = t.clientX - sx, dy = t.clientY - sy;
    if (Math.hypot(dx, dy) < 24) return;
    const g = grid;
    if (Math.abs(dx) > Math.abs(dy)) frogger.tryHop(dx > 0 ? g : -g, 0, dx > 0 ? 1 : 2);
    else frogger.tryHop(0, dy > 0 ? g : -g, dy > 0 ? 3 : 0);
    tracking = false;
  }, { passive: true });
  const pad = { upBtn: [0, -grid, 0], downBtn: [0, grid, 3], leftBtn: [-grid, 0, 2], rightBtn: [grid, 0, 1] };
  for (const id of Object.keys(pad)) {
    const el = $(id);
    if (!el) continue;
    let holdTimer = null;
    const hop = function () {
      if (screen !== 'playing') return;
      frogger.tryHop(pad[id][0], pad[id][1], pad[id][2]);
    };
    el.addEventListener('pointerdown', function (e) {
      e.preventDefault();
      AudioSys.init();
      hop();
      if (holdTimer) clearInterval(holdTimer);
      holdTimer = setInterval(hop, 220); // hold-to-repeat on touch
    });
    const stop = function () { if (holdTimer) { clearInterval(holdTimer); holdTimer = null; } };
    el.addEventListener('pointerup', stop);
    el.addEventListener('pointerleave', stop);
    el.addEventListener('pointercancel', stop);
  }
})();

// ---- Buttons ----
function wire(id, fn) {
  const el = $(id);
  if (el) el.addEventListener('click', function () { AudioSys.init(); fn(); });
}
wire('startBtn', startRun);
wire('howBtn', function () { AudioSys.ui(); screen = 'help'; syncScreens(); });
wire('backBtn', function () { AudioSys.ui(); screen = 'title'; syncScreens(); });
wire('resumeBtn', togglePause);
wire('restartBtn', startRun);
wire('quitBtn', function () { screen = 'title'; syncScreens(); });
wire('againBtn', startRun);
wire('titleBtn', function () { screen = 'title'; syncScreens(); });
wire('pauseBtn', togglePause);
wire('audioBtn', function () { AudioSys.init(); AudioSys.setMuted(!AudioSys.muted); });

// ---- Collisions ----
function collision(first, second) {
  return !(first.x > second.x + second.width ||
    first.x + first.width < second.x ||
    first.y > second.y + second.height ||
    first.y + first.height < second.y);
}

function scored() {
  // Legacy hook: reaching the top now resolves through home pads.
  resolveHomeLanding();
}

function resetGame() {
  lives = 3;
  score = 0;
  streak = 0;
  gameSpeed = 1;
  frogger.resetToStart();
  buildHomes();
  updateHUD();
}

function handleScoreBoard() { updateHUD(); }

// ---- Boot ----
initObstacles();
frogger.resetToStart();
try {
  AudioSys.muted = localStorage.getItem('knotzFrogHopMute') === '1';
} catch (e) {}
if (document.getElementById('audioBtn')) {
  document.getElementById('audioBtn').textContent = AudioSys.muted ? 'Sound: Off' : 'Sound: On';
}
if (document.fonts && document.fonts.load) {
  Promise.all([
    document.fonts.load('700 40px "Baloo 2"'),
    document.fonts.load('400 16px "Inter"'),
  ]).then(function () { fontsReady = true; }).catch(function () {});
}
syncScreens();
updateHUD();
requestAnimationFrame(animate);
