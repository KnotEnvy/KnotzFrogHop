class Frogger {
  constructor() {
    this.spriteWidth = 250;
    this.spriteHeight = 250;
    this.width = this.spriteWidth / 5;
    this.height = this.spriteHeight / 5;
    this.startX = canvas.width / 2 - this.width / 2;
    this.startY = canvas.height - this.height - 40;
    this.x = this.startX;
    this.y = this.startY;
    this.moving = false;
    this.frameX = 0;
    this.frameY = 0;
    this.hop = null; // {sx,sy,tx,ty,t0,dur}
    this.squash = 0;
    this.facing = 0;
  }
  resetToStart() {
    this.x = this.startX;
    this.y = this.startY;
    this.hop = null;
    this.queued = null;
    this.moving = false;
    this.frameX = 0;
    this.frameY = 0;
  }
  tryHop(dx, dy, dirFrame) {
    if (screen !== 'playing') return;
    // Input buffer: a press mid-hop is queued, not dropped, and fires on
    // landing while fresh so fast double-hops never swallow an input.
    if (this.hop) {
      this.queued = { dx, dy, dirFrame, t: performance.now() };
      return;
    }
    const tx = clamp(this.x + dx, 0, canvas.width - this.width);
    const ty = clamp(this.y + dy, grid - 60, canvas.height - this.height - 40);
    if (tx === this.x && ty === this.y) return;
    this.queued = null;
    this.hop = { sx: this.x, sy: this.y, tx, ty, t0: performance.now(), dur: 130 };
    this.moving = true;
    this.frameX = 1;
    this.frameY = dirFrame;
    this.facing = dirFrame;
    this.squash = 1;
    AudioSys.hop();
  }
  update(now) {
    if (this.hop) {
      const t = clamp((now - this.hop.t0) / this.hop.dur, 0, 1);
      const e = easeOut(t);
      this.x = lerp(this.hop.sx, this.hop.tx, e);
      this.y = lerp(this.hop.sy, this.hop.ty, e);
      if (t >= 1) {
        const wentUp = this.hop.ty < this.hop.sy;
        this.hop = null;
        this.moving = false;
        this.frameX = 0;
        onHopLanded(wentUp);
        const q = this.queued;
        this.queued = null;
        if (q && screen === 'playing' && now - q.t < 350) this.tryHop(q.dx, q.dy, q.dirFrame);
      }
    }
    if (this.squash > 0) this.squash = Math.max(0, this.squash - 0.08);
    // Reached the home bank: resolve landing on a pad.
    if (!this.hop && this.y <= grid - 20) resolveHomeLanding();
  }
  draw(now) {
    // Spawn-protection blink after respawn (visible 2/3 of the time).
    if (screen === 'playing' && performance.now() < (this.invulnUntil || 0)) {
      if (Math.floor(now / 150) % 3 === 0) return;
    }
    // Shadow ellipse on the ground.
    const cx = this.x + this.width / 2;
    const cy = this.y + this.height - 4;
    ctx3.fillStyle = 'rgba(0,0,0,0.28)';
    ctx3.beginPath();
    ctx3.ellipse(cx, cy, this.width * 0.32, 8, 0, 0, Math.PI * 2);
    ctx3.fill();
    // Hop arc lift + squash & stretch.
    let lift = 0;
    let sx = 1, sy = 1;
    if (this.hop) {
      const t = clamp((now - this.hop.t0) / this.hop.dur, 0, 1);
      lift = Math.sin(t * Math.PI) * 14;
      sx = 1 - Math.sin(t * Math.PI) * 0.12;
      sy = 1 + Math.sin(t * Math.PI) * 0.18;
    } else if (this.squash > 0) {
      sx = 1 + this.squash * 0.15;
      sy = 1 - this.squash * 0.15;
    }
    const w = this.width * 2, h = this.height * 2;
    ctx3.save();
    ctx3.translate(this.x - 25 + w / 2, this.y - 25 - lift + h / 2);
    ctx3.scale(sx, sy);
    ctx3.drawImage(
      froggerSprite,
      this.frameX * this.spriteWidth, this.frameY * this.spriteHeight,
      this.spriteWidth, this.spriteHeight,
      -w / 2, -h / 2, w, h
    );
    ctx3.restore();
  }
  jump() {
    if (!this.hop) this.frameX = 1;
    else if (this.frameX === 1) this.frameX = 0;
  }
}

const frogger = new Frogger();
