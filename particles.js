class Particle {
  constructor(x, y) {
    this.x = x + 25;
    this.y = y + 25;
    this.radius = Math.random() * 20 + 1;
    this.opacity = 1;
    this.directionX = Math.random() * 1 - 0.5;
    this.directionY = Math.random() * 1 - 0.5;
  }
  draw() {
    ctx2.fillStyle = 'rgba(150,150,150,' + this.opacity + ')';
    ctx2.beginPath();
    ctx2.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx2.fill();
    ctx2.closePath();
  }
  update() {
    this.x += this.directionX;
    this.y += this.directionY;
    if (this.opacity > 0.1) this.opacity -= 0.9;
    if (this.radius > 0.15) this.radius -= 0.14;
  }
  drawRipple() {
    ctx3.strokeStyle = 'rgba(255,255,255,' + this.opacity + ')';
    ctx3.beginPath();
    ctx3.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx3.stroke();
    ctx3.closePath();
  }
  ripple() {
    if (this.radius < 50) {
      this.radius += 0.7;
      this.x -= 0.03;
      this.y -= 0.03;
    }
    if (this.opacity > 0) this.opacity -= 0.02;
  }
}

// Floating score text that rises and fades. Lives in one store, cleared on
// every screen/level change so nothing carries over.
function spawnFloater(x, y, text, color) {
  if (floatersArray.length > 40) floatersArray.shift();
  floatersArray.push({ x, y, text, color: color || '#ffe066', t0: performance.now(), dur: 1100 });
}
function handleFloaters(now) {
  for (let i = floatersArray.length - 1; i >= 0; i--) {
    const f = floatersArray[i];
    const age = clamp((now - f.t0) / f.dur, 0, 1);
    if (age >= 1) { floatersArray.splice(i, 1); continue; }
    ctx4.save();
    ctx4.globalAlpha = 1 - age;
    ctx4.font = '700 22px "Baloo 2", Verdana, sans-serif';
    ctx4.textAlign = 'center';
    ctx4.lineWidth = 4;
    ctx4.strokeStyle = 'rgba(10,30,20,0.85)';
    const fy = f.y - age * 46;
    ctx4.strokeText(f.text, f.x, fy, 220);
    ctx4.fillStyle = f.color;
    ctx4.fillText(f.text, f.x, fy, 220);
    ctx4.restore();
  }
}

function burstDust(x, y, n, color) {
  for (let i = 0; i < (n || 10); i++) {
    const p = new Particle(x, y);
    p.radius = rand(3, 10);
    p.opacity = 0.9;
    p.directionX = rand(-2.4, 2.4);
    p.directionY = rand(-2.4, 1.2);
    p.color = color;
    particlesArray.unshift(p);
  }
}

function handleParticles() {
  for (let i = 0; i < particlesArray.length; i++) {
    const p = particlesArray[i];
    p.update();
    if (p.color) {
      ctx2.fillStyle = p.color;
      ctx2.globalAlpha = Math.max(0, p.opacity);
      ctx2.beginPath();
      ctx2.arc(p.x, p.y, Math.max(0.5, p.radius), 0, Math.PI * 2);
      ctx2.fill();
      ctx2.globalAlpha = 1;
    } else {
      p.draw();
    }
  }
  if (particlesArray.length > maxParticles) {
    for (let i = 0; i < 30; i++) particlesArray.pop();
  }
  if ((keys['ArrowUp'] || keys['ArrowDown'] || keys['ArrowRight'] || keys['ArrowLeft'] || keys['KeyW'] || keys['KeyA'] || keys['KeyS'] || keys['KeyD']) && frogger.y > 250 && particlesArray.length < maxParticles + 10) {
    for (let i = 0; i < 6; i++) particlesArray.unshift(new Particle(frogger.x, frogger.y));
  }
}

function handleRipples() {
  for (let i = 0; i < ripplesArray.length; i++) {
    ripplesArray[i].ripple();
    ripplesArray[i].drawRipple();
  }
  if (ripplesArray.length > 20) {
    for (let i = 0; i < 5; i++) ripplesArray.pop();
  }
  if ((keys['ArrowUp'] || keys['ArrowDown'] || keys['ArrowRight'] || keys['ArrowLeft']) && frogger.y < 250 && frogger.y > 100) {
    for (let i = 0; i < 20; i++) ripplesArray.unshift(new Particle(frogger.x, frogger.y));
  }
}
