class Obstacle {
  constructor(x, y, width, height, speed, type) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.speed = speed;
    this.type = type;
    this.frameX = 0;
    this.frameY = 0;
    this.randomize = Math.floor(Math.random() * 30 + 30);
    this.carType = Math.floor(Math.random() * numberOfCars);
    this.divePhase = Math.random() * Math.PI * 2;
    this.diving = false;
    this.diveT = 0;
  }
  draw(now) {
    if (this.type === 'turtle') {
      if (frame % this.randomize === 0) {
        if (this.frameX >= 1) this.frameX = 0;
        else this.frameX++;
      }
      const lvl = LEVELS[levelIndex];
      let alpha = 1;
      if (lvl.diving && this.diving) alpha = Math.max(0.25, 1 - this.diveT * 0.5);
      ctx1.save();
      ctx1.globalAlpha = alpha;
      if (lvl.diving && this.diving) ctx1.translate(0, this.diveT * 8);
      if (lvl.diving && this.diveWarn) ctx1.translate(Math.sin(now / 70) * 3, 0);
      ctx1.drawImage(turtle, this.frameX * 70, this.frameY * 70, 70, 70, this.x, this.y, this.width, this.height);
      // Warning ring while a dive is approaching.
      if (lvl.diving && this.diveWarn) {
        ctx1.strokeStyle = 'rgba(255,255,255,' + (0.4 + 0.3 * Math.sin(now / 90)).toFixed(2) + ')';
        ctx1.lineWidth = 2.5;
        ctx1.beginPath();
        ctx1.ellipse(this.x + this.width / 2, this.y + this.height / 2, this.width / 2 + 4, this.height / 2 + 2, 0, 0, Math.PI * 2);
        ctx1.stroke();
      }
      ctx1.restore();
    } else if (this.type === 'log') {
      ctx1.drawImage(log, this.x, this.y, this.width, this.height);
    } else {
      drawCodeCar(this);
    }
  }
  update(now) {
    this.x += this.speed * gameSpeed;
    const lvl = LEVELS[levelIndex];
    if (this.type === 'turtle' && lvl.diving) {
      this.divePhase += 0.02 * gameSpeed;
      const s = Math.sin(this.divePhase);
      this.diving = s > 0.55;
      this.diveT = this.diving ? clamp((s - 0.55) * 3, 0, 1) : 0;
      // Telegraph: warn while the dive is approaching so riders can hop off.
      this.diveWarn = !this.diving && s > 0.3;
    } else {
      this.diving = false;
      this.diveT = 0;
      this.diveWarn = false;
    }
    if (this.speed > 0) {
      if (this.x > canvas.width + this.width) {
        this.x = 0 - this.width;
        this.carType = Math.floor(Math.random() * numberOfCars);
      }
    } else {
      this.frameX = 1;
      if (this.x < 0 - this.width) {
        this.x = canvas.width + this.width;
        this.carType = Math.floor(Math.random() * numberOfCars);
      }
    }
  }
}

// Code-drawn cars in the pond palette (rounded body, cabin, wheels, headlights).
// Variants cycle by carType so lanes read as matching traffic, not meme sprites.
const CAR_PAINTS = [
  { body: '#2ec4b6', dark: '#1a7a70', glass: '#d8fbff' },
  { body: '#7b5cff', dark: '#4a34a8', glass: '#e6defe' },
  { body: '#ff5964', dark: '#a82e38', glass: '#ffe0e3' },
];
function roundRect(c, x, y, w, h, r) {
  c.beginPath();
  c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r);
  c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r);
  c.arcTo(x, y, x + w, y, r);
  c.closePath();
}
function drawCodeCar(o) {
  const p = CAR_PAINTS[o.carType % CAR_PAINTS.length];
  const x = o.x, y = o.y + 8, w = o.width, h = o.height - 16;
  const facing = o.speed >= 0 ? 1 : -1; // headlights lead the direction of travel
  ctx2.save();
  // Wheels.
  ctx2.fillStyle = '#10141c';
  const wy = y + h - 6;
  for (const wx of [x + 26, x + w - 26]) {
    ctx2.beginPath();
    ctx2.arc(wx, wy, 13, 0, Math.PI * 2);
    ctx2.fill();
    ctx2.fillStyle = '#8b93a3';
    ctx2.beginPath();
    ctx2.arc(wx, wy, 5, 0, Math.PI * 2);
    ctx2.fill();
    ctx2.fillStyle = '#10141c';
  }
  // Body with dark outline (solid fills only: no per-frame gradient allocs).
  ctx2.fillStyle = STYLE.outline;
  roundRect(ctx2, x + 2, y - 2, w - 4, h, 18);
  ctx2.fill();
  ctx2.fillStyle = p.dark;
  roundRect(ctx2, x + 6, y + 2, w - 12, h - 8, 14);
  ctx2.fill();
  ctx2.fillStyle = p.body;
  roundRect(ctx2, x + 6, y + 2, w - 12, (h - 8) * 0.52, 14);
  ctx2.fill();
  // Cabin + windshield toward the front.
  const cabW = w * 0.34;
  const cabX = facing > 0 ? x + w - cabW - 18 : x + 18;
  ctx2.fillStyle = p.dark;
  roundRect(ctx2, cabX, y + 10, cabW, h - 26, 8);
  ctx2.fill();
  ctx2.fillStyle = p.glass;
  roundRect(ctx2, cabX + 6, y + 15, cabW - 12, h - 36, 5);
  ctx2.fill();
  // Headlight beam dots at the front.
  ctx2.fillStyle = '#fff6c9';
  const hx = facing > 0 ? x + w - 8 : x + 8;
  ctx2.beginPath();
  ctx2.arc(hx, y + 14, 5, 0, Math.PI * 2);
  ctx2.arc(hx, y + h - 14, 5, 0, Math.PI * 2);
  ctx2.fill();
  // Brake lights at the rear.
  ctx2.fillStyle = '#ff2438';
  const bx = facing > 0 ? x + 8 : x + w - 8;
  ctx2.beginPath();
  ctx2.arc(bx, y + 14, 3.5, 0, Math.PI * 2);
  ctx2.arc(bx, y + h - 14, 3.5, 0, Math.PI * 2);
  ctx2.fill();
  ctx2.restore();
}

function buildHomes() {
  homes = [];
  const n = 5, gap = canvas.width / n;
  for (let i = 0; i < n; i++) {
    homes.push({ x: i * gap + gap / 2 - 36, y: 54, w: 72, h: 44, filled: false });
  }
  homesCount = 0;
  fly = null;
  flyTimer = performance.now() + 6000;
}

function buildLevel(idx) {
  levelIndex = idx;
  carsArray.length = 0;
  logsArray.length = 0;
  weatherArray.length = 0;
  const lvl = LEVELS[idx];
  gameSpeed = 1 + idx * 0.25;
  // 3 road lanes. Speeds in the table are SIGNED (sign = direction): use as-is.
  const roadY = [canvas.height - grid * 2 - 20, canvas.height - grid * 3 - 20, canvas.height - grid * 4 - 20];
  for (let lane = 0; lane < 3; lane++) {
    const per = lvl.carsPerLane;
    for (let i = 0; i < per; i++) {
      const x = (i * canvas.width) / per + rand(-40, 40);
      carsArray.push(new Obstacle(x, roadY[lane], lvl.carW || grid * 2, grid, lvl.roadSpeeds[lane], 'car'));
    }
  }
  // 2 river lanes: logs then turtles, counts per level table.
  const waterY = [canvas.height - grid * 5 - 20, canvas.height - grid * 6 - 20];
  for (let i = 0; i < lvl.riverLogs; i++) {
    logsArray.push(new Obstacle((i * canvas.width) / lvl.riverLogs, waterY[0], grid * 2, grid, lvl.waterSpeeds[0], 'log'));
  }
  for (let i = 0; i < lvl.riverTurtles; i++) {
    logsArray.push(new Obstacle((i * canvas.width) / lvl.riverTurtles, waterY[1], grid, grid, lvl.waterSpeeds[1], 'turtle'));
  }
  buildHomes();
  seedWeather();
  cacheBackdrop();
  resetClock();
}

function seedWeather() {
  const lvl = LEVELS[levelIndex];
  weatherArray.length = 0;
  const n = lvl.weather === 'rain' ? 90 : 36;
  for (let i = 0; i < n; i++) {
    weatherArray.push({
      x: rand(0, canvas.width), y: rand(0, canvas.height),
      s: rand(0.6, 2.2), v: rand(0.3, 1.4), tw: rand(0, 6.28),
    });
  }
}

function drawWeather(now) {
  const lvl = LEVELS[levelIndex];
  ctx5.save();
  if (lvl.weather === 'rain') {
    ctx5.strokeStyle = 'rgba(170,200,255,0.35)';
    ctx5.lineWidth = 1.5;
    ctx5.beginPath();
    for (const w of weatherArray) {
      w.y += 4 + w.v * 3;
      w.x -= 1.2;
      if (w.y > canvas.height) { w.y = -10; w.x = rand(0, canvas.width); }
      ctx5.moveTo(w.x, w.y);
      ctx5.lineTo(w.x + 3, w.y + 12);
    }
    ctx5.stroke();
  } else {
    for (const w of weatherArray) {
      w.tw += 0.03;
      w.x += Math.sin(w.tw) * 0.4;
      w.y -= w.v * 0.4;
      if (w.y < -6) { w.y = canvas.height + 6; w.x = rand(0, canvas.width); }
      const glow = 0.35 + 0.3 * Math.sin(w.tw * 2);
      ctx5.fillStyle = lvl.weather === 'embers'
        ? 'rgba(255,170,90,' + glow.toFixed(2) + ')'
        : 'rgba(220,255,190,' + glow.toFixed(2) + ')';
      ctx5.beginPath();
      ctx5.arc(w.x, w.y, w.s + 1, 0, Math.PI * 2);
      ctx5.fill();
    }
  }
  ctx5.restore();
}

function drawHomes(now) {
  for (let i = 0; i < homes.length; i++) {
    const h = homes[i];
    const cx = h.x + h.w / 2, cy = h.y + h.h / 2;
    // Lily pad: dark outline, green body, notch, glow when filled.
    ctx4.save();
    if (h.filled) {
      ctx4.shadowColor = STYLE.homeGlow;
      ctx4.shadowBlur = 18;
    }
    ctx4.fillStyle = STYLE.outline;
    ctx4.beginPath();
    ctx4.ellipse(cx, cy + 2, h.w / 2 + 2, h.h / 2 + 2, 0, 0, Math.PI * 2);
    ctx4.fill();
    ctx4.shadowBlur = 0;
    ctx4.fillStyle = h.filled ? '#59d977' : STYLE.pad;
    ctx4.beginPath();
    ctx4.ellipse(cx, cy, h.w / 2, h.h / 2, 0, 0.3, Math.PI * 2 + 0.3);
    ctx4.fill();
    ctx4.fillStyle = 'rgba(255,255,255,0.25)';
    ctx4.beginPath();
    ctx4.ellipse(cx - 10, cy - 8, 12, 6, -0.5, 0, Math.PI * 2);
    ctx4.fill();
    if (h.filled) {
      // Little frog silhouette resting home.
      ctx4.fillStyle = STYLE.frogDark;
      ctx4.beginPath();
      ctx4.arc(cx, cy - 2, 11, 0, Math.PI * 2);
      ctx4.fill();
      ctx4.fillStyle = STYLE.frog;
      ctx4.beginPath();
      ctx4.arc(cx, cy - 4, 8, 0, Math.PI * 2);
      ctx4.fill();
    }
    ctx4.restore();
  }
  // Next-empty-pad hint ring.
  if (screen === 'playing') {
    const next = homes.find((h) => !h.filled);
    if (next) {
      const pulse = 1 + 0.12 * Math.sin(now / 280);
      ctx4.save();
      ctx4.strokeStyle = 'rgba(255,224,102,0.9)';
      ctx4.lineWidth = 3;
      ctx4.beginPath();
      ctx4.ellipse(next.x + next.w / 2, next.y + next.h / 2, (next.w / 2 + 8) * pulse, (next.h / 2 + 8) * pulse, 0, 0, Math.PI * 2);
      ctx4.stroke();
      ctx4.restore();
    }
  }
  // Bonus fly.
  if (fly && now < fly.until && homes[fly.padIndex] && !homes[fly.padIndex].filled) {
    const h = homes[fly.padIndex];
    const bob = Math.sin(now / 200) * 4;
    ctx4.save();
    ctx4.fillStyle = STYLE.outline;
    ctx4.beginPath();
    ctx4.arc(h.x + h.w / 2, h.y - 12 + bob, 10, 0, Math.PI * 2);
    ctx4.fill();
    ctx4.fillStyle = STYLE.fly;
    ctx4.beginPath();
    ctx4.arc(h.x + h.w / 2, h.y - 14 + bob, 7, 0, Math.PI * 2);
    ctx4.fill();
    ctx4.fillStyle = 'rgba(255,255,255,0.85)';
    ctx4.beginPath();
    ctx4.ellipse(h.x + h.w / 2 - 6, h.y - 20 + bob, 5, 3, -0.6, 0, Math.PI * 2);
    ctx4.ellipse(h.x + h.w / 2 + 6, h.y - 20 + bob, 5, 3, 0.6, 0, Math.PI * 2);
    ctx4.fill();
    ctx4.restore();
  }
}

function updateFly(now) {
  if (screen !== 'playing') return;
  const empty = homes.map((h, i) => (h.filled ? -1 : i)).filter((i) => i >= 0);
  if (empty.length === 0) { fly = null; return; }
  if ((!fly || now > fly.until) && now > flyTimer) {
    const pick = empty[Math.floor(Math.random() * empty.length)];
    fly = { padIndex: pick, until: now + 6000 };
    flyTimer = now + LEVELS[levelIndex].flyEvery * 1000;
  }
  if (fly && now > fly.until) fly = null;
}

function initObstacles() {
  buildLevel(0);
}

// Launch pad: a quiet lily circle grounding the start position.
function drawLaunchPad(now) {
  const cx = frogger.startX + frogger.width / 2;
  const cy = frogger.startY + frogger.height / 2;
  ctx1.save();
  ctx1.fillStyle = 'rgba(20,40,29,0.55)';
  ctx1.beginPath();
  ctx1.ellipse(cx, cy + 6, 44, 30, 0, 0, Math.PI * 2);
  ctx1.fill();
  ctx1.fillStyle = 'rgba(63,174,90,0.85)';
  ctx1.beginPath();
  ctx1.ellipse(cx, cy + 2, 38, 25, 0, 0.4, Math.PI * 2 + 0.4);
  ctx1.fill();
  ctx1.restore();
}

function handleObstacles(now, worldLive) {
  drawLaunchPad(now);
  for (let i = 0; i < carsArray.length; i++) {
    if (worldLive) carsArray[i].update(now);
    carsArray[i].draw(now);
  }
  for (let i = 0; i < logsArray.length; i++) {
    if (worldLive) logsArray[i].update(now);
    logsArray[i].draw(now);
  }
  if (screen !== 'playing') return;
  // Collisions with cars.
  for (let i = 0; i < carsArray.length; i++) {
    if (collision(frogger, carsArray[i])) {
      ctx4.drawImage(collisions, 0, 100, 100, 100, frogger.x, frogger.y, 50, 50);
      onDeath('traffic');
      return;
    }
  }
  // Riding logs and turtles; diving turtles dump the frog.
  if (frogger.y < 250 && frogger.y > 100) {
    safe = false;
    for (let i = 0; i < logsArray.length; i++) {
      const o = logsArray[i];
      if (collision(frogger, o)) {
        if (o.type === 'turtle' && o.diving) continue; // sunk: not safe
        if (!frogger.hop) frogger.x += o.speed * gameSpeed;
        safe = true;
      }
    }
    if (!safe && !frogger.hop) {
      spawnSplash(frogger.x, frogger.y, true);
      onDeath('water');
      return;
    }
    // Carried off-screen by a log = swept away.
    if (safe && (frogger.x < -frogger.width * 0.5 || frogger.x > canvas.width - frogger.width * 0.5)) {
      onDeath('swept');
    }
  }
}
