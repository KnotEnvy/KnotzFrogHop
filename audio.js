// Audio: synthesized WebAudio SFX + light music loop. No audio assets.
const AudioSys = {
  ctx: null,
  master: null,
  musicGain: null,
  muted: false,
  musicTimer: null,
  step: 0,

  init() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.5;
      this.master.connect(this.ctx.destination);
      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = 0.18;
      this.musicGain.connect(this.master);
    } catch (e) { /* no audio */ }
    try {
      this.muted = localStorage.getItem('knotzFrogHopMute') === '1';
      if (this.master) this.master.gain.value = this.muted ? 0 : 0.5;
    } catch (e) { /* ignore */ }
  },

  setMuted(m) {
    this.muted = !!m;
    try { localStorage.setItem('knotzFrogHopMute', this.muted ? '1' : '0'); } catch (e) {}
    if (this.master && this.ctx) {
      this.master.gain.setValueAtTime(this.muted ? 0 : 0.5, this.ctx.currentTime);
    }
    const btn = document.getElementById('audioBtn');
    if (btn) btn.textContent = this.muted ? 'Sound: Off' : 'Sound: On';
  },

  tone(freq, dur, type, vol, slideTo) {
    if (!this.ctx || this.muted) return;
    try {
      const t = this.ctx.currentTime;
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.type = type || 'sine';
      o.frequency.setValueAtTime(freq, t);
      if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t + dur);
      g.gain.setValueAtTime(vol || 0.3, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      o.connect(g);
      g.connect(this.master);
      o.start(t);
      o.stop(t + dur + 0.02);
    } catch (e) { /* ignore */ }
  },

  noise(dur, vol, lowpass) {
    if (!this.ctx || this.muted) return;
    try {
      const t = this.ctx.currentTime;
      const len = Math.floor(this.ctx.sampleRate * dur);
      const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const src = this.ctx.createBufferSource();
      src.buffer = buf;
      const f = this.ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = lowpass || 1200;
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(vol || 0.3, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      src.connect(f);
      f.connect(g);
      g.connect(this.master);
      src.start(t);
    } catch (e) { /* ignore */ }
  },

  hop() { this.tone(320, 0.12, 'square', 0.18, 560); },
  land() { this.noise(0.08, 0.15, 900); },
  splat() { this.noise(0.3, 0.5, 700); this.tone(160, 0.3, 'sawtooth', 0.25, 50); },
  splash() { this.noise(0.4, 0.4, 1400); this.tone(300, 0.35, 'sine', 0.2, 90); },
  home() { this.tone(523, 0.12, 'triangle', 0.3); setTimeout(() => this.tone(659, 0.12, 'triangle', 0.3), 90); setTimeout(() => this.tone(784, 0.2, 'triangle', 0.3), 180); },
  fly() { this.tone(880, 0.1, 'sine', 0.3, 1320); setTimeout(() => this.tone(1174, 0.18, 'sine', 0.3), 100); },
  win() { [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => this.tone(f, 0.25, 'triangle', 0.32), i * 140)); },
  lose() { [400, 340, 280, 200].forEach((f, i) => setTimeout(() => this.tone(f, 0.25, 'sawtooth', 0.22), i * 160)); },
  ui() { this.tone(600, 0.06, 'sine', 0.2); },
  tick() { this.tone(880, 0.05, 'square', 0.12); },
  timeUp() { this.tone(440, 0.2, 'sawtooth', 0.25, 110); setTimeout(() => this.tone(220, 0.35, 'sawtooth', 0.25, 70), 180); },

  // 8th-note groove: minor-pentatonic bass, hat ticks, soft lead every 2 bars.
  // Root + tempo come from the current level so each land sounds different.
  startMusic() {
    if (!this.ctx || this.musicTimer) return;
    const bassLine = [0, 0, 3, 5, 7, 5, 3, 2];
    const tick = () => {
      if (this.ctx) {
        const lvl = (typeof LEVELS !== 'undefined' && LEVELS[typeof levelIndex !== 'undefined' ? levelIndex : 0]) || { musicRoot: 110, musicBpm: 100 };
        const stepDur = 60 / lvl.musicBpm / 2;
        if (!this.muted && typeof screen !== 'undefined' && screen === 'playing') {
          try {
            const t = this.ctx.currentTime;
            const root = lvl.musicRoot;
            // Bass.
            const b = this.ctx.createOscillator();
            const bg = this.ctx.createGain();
            b.type = 'triangle';
            b.frequency.value = root * Math.pow(2, bassLine[this.step % 8] / 12);
            bg.gain.setValueAtTime(0.5, t);
            bg.gain.exponentialRampToValueAtTime(0.001, t + stepDur * 0.95);
            b.connect(bg);
            bg.connect(this.musicGain);
            b.start(t);
            b.stop(t + stepDur);
            // Hat tick on off-8ths.
            if (this.step % 2 === 1) {
              const h = this.ctx.createOscillator();
              const hg = this.ctx.createGain();
              h.type = 'square';
              h.frequency.value = 6000 + (this.step % 4) * 400;
              hg.gain.setValueAtTime(0.06, t);
              hg.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
              h.connect(hg);
              hg.connect(this.musicGain);
              h.start(t);
              h.stop(t + 0.05);
            }
            // Lead blip every 2 bars.
            if (this.step % 16 === 8) {
              const l = this.ctx.createOscillator();
              const lg = this.ctx.createGain();
              l.type = 'sine';
              l.frequency.value = root * 4;
              lg.gain.setValueAtTime(0.25, t);
              lg.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
              l.connect(lg);
              lg.connect(this.musicGain);
              l.start(t);
              l.stop(t + 0.55);
            }
          } catch (e) { /* ignore */ }
        }
        this.step++;
        this.musicTimer = setTimeout(tick, (60 / lvl.musicBpm / 2) * 1000);
      }
    };
    tick();
  },
};
