// Synthesized sound: effects, a babbling pet voice and a generative music box.

const NOTE = n => 440 * Math.pow(2, (n - 69) / 12);

class Audio {
  constructor() {
    this.ctx = null;
    this.sfxOn = true;
    this.musicOn = true;
    this.musicTimer = null;
    this.nextBeat = 0;
    this.beat = 0;
    this.night = false;
  }

  /** Must be called from a user gesture. */
  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.5;
      this.master.connect(this.ctx.destination);
      this.sfxBus = this.ctx.createGain();
      this.sfxBus.connect(this.master);
      this.musicBus = this.ctx.createGain();
      this.musicBus.gain.value = 0.22;
      // soft echo for the music box
      const delay = this.ctx.createDelay();
      delay.delayTime.value = 0.36;
      const fb = this.ctx.createGain();
      fb.gain.value = 0.32;
      const lp = this.ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 2400;
      this.musicBus.connect(this.master);
      this.musicBus.connect(delay);
      delay.connect(lp); lp.connect(fb); fb.connect(delay);
      lp.connect(this.master);
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
    if (this.musicOn) this.startMusic();
  }

  tone(freq, dur, o = {}) {
    if (!this.ctx) return;
    const { type = 'sine', vol = 0.25, slide = 0, delay = 0, attack = 0.005, bus = this.sfxBus } = o;
    const t0 = (o.at ?? this.ctx.currentTime) + delay;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(30, freq * slide), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g); g.connect(bus);
    osc.start(t0); osc.stop(t0 + dur + 0.05);
  }

  noise(dur, o = {}) {
    if (!this.ctx) return;
    const { vol = 0.2, freq = 1200, q = 1, delay = 0, type = 'bandpass' } = o;
    const t0 = this.ctx.currentTime + delay;
    const len = Math.ceil(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const f = this.ctx.createBiquadFilter();
    f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = this.ctx.createGain();
    g.gain.value = vol;
    src.connect(f); f.connect(g); g.connect(this.sfxBus);
    src.start(t0);
  }

  play(name, pitch = 1) {
    if (!this.ctx || !this.sfxOn) return;
    const T = (f, d, o) => this.tone(f * pitch, d, o);
    switch (name) {
      case 'blip': T(880, 0.07, { type: 'triangle', vol: 0.15 }); break;
      case 'select': T(660, 0.06, { type: 'triangle', vol: 0.15 }); T(990, 0.08, { type: 'triangle', vol: 0.15, delay: 0.05 }); break;
      case 'back': T(700, 0.06, { type: 'triangle', vol: 0.12 }); T(500, 0.08, { type: 'triangle', vol: 0.12, delay: 0.05 }); break;
      case 'error': T(220, 0.15, { type: 'square', vol: 0.06 }); T(180, 0.2, { type: 'square', vol: 0.06, delay: 0.1 }); break;
      case 'chirp': T(1200, 0.12, { vol: 0.18, slide: 1.5 }); T(1500, 0.14, { vol: 0.16, slide: 1.3, delay: 0.14 }); break;
      case 'eat': for (let i = 0; i < 3; i++) this.noise(0.07, { vol: 0.35, freq: 900 + i * 200, q: 2, delay: i * 0.18 }); break;
      case 'happy': [0, 4, 7, 12].forEach((n, i) => T(NOTE(72 + n), 0.18, { type: 'triangle', vol: 0.18, delay: i * 0.07 })); break;
      case 'sad': T(NOTE(67), 0.25, { type: 'triangle', vol: 0.15 }); T(NOTE(63), 0.4, { type: 'triangle', vol: 0.15, delay: 0.2, slide: 0.95 }); break;
      case 'pet': T(NOTE(84), 0.1, { vol: 0.14 }); T(NOTE(88), 0.14, { vol: 0.12, delay: 0.07 }); break;
      case 'annoyed': T(300, 0.12, { type: 'sawtooth', vol: 0.07, slide: 0.7 }); break;
      case 'poop': T(160, 0.25, { type: 'sine', vol: 0.35, slide: 0.5 }); this.noise(0.12, { vol: 0.15, freq: 300, delay: 0.18 }); break;
      case 'clean': this.noise(0.5, { vol: 0.12, freq: 3000, q: 0.7, type: 'highpass' }); [0, 3, 7].forEach((n, i) => T(NOTE(84 + n), 0.1, { vol: 0.08, delay: 0.25 + i * 0.08 })); break;
      case 'sparkle': [0, 5, 9, 12, 16].forEach((n, i) => T(NOTE(88 + n), 0.12, { vol: 0.07, delay: i * 0.05 })); break;
      case 'coin': T(NOTE(83), 0.07, { type: 'square', vol: 0.06 }); T(NOTE(88), 0.18, { type: 'square', vol: 0.06, delay: 0.07 }); break;
      case 'hit': this.noise(0.2, { vol: 0.3, freq: 400 }); T(200, 0.2, { type: 'square', vol: 0.06, slide: 0.5 }); break;
      case 'jump': T(400, 0.15, { type: 'triangle', vol: 0.12, slide: 2 }); break;
      case 'medicine': T(500, 0.08, { type: 'square', vol: 0.05 }); T(350, 0.2, { type: 'square', vol: 0.05, delay: 0.1, slide: 0.8 }); break;
      case 'sick': T(NOTE(60), 0.3, { type: 'triangle', vol: 0.15, slide: 0.92 }); T(NOTE(59), 0.4, { type: 'triangle', vol: 0.12, delay: 0.25, slide: 0.9 }); break;
      case 'lights': T(pitch > 1 ? 1000 : 600, 0.05, { type: 'square', vol: 0.05 }); break;
      case 'hatch': this.noise(0.15, { vol: 0.3, freq: 1500 }); [0, 4, 7, 11, 14].forEach((n, i) => T(NOTE(76 + n), 0.3, { type: 'triangle', vol: 0.15, delay: 0.15 + i * 0.09 })); break;
      case 'evolve': [0, 4, 7, 12, 7, 12, 16, 19, 24].forEach((n, i) => T(NOTE(67 + n), 0.35, { type: 'triangle', vol: 0.13, delay: i * 0.1 })); break;
      case 'win': [0, 4, 7, 12, 16].forEach((n, i) => T(NOTE(72 + n), 0.25, { type: 'square', vol: 0.05, delay: i * 0.09 })); break;
      case 'lose': [7, 4, 0].forEach((n, i) => T(NOTE(64 + n), 0.3, { type: 'triangle', vol: 0.12, delay: i * 0.15 })); break;
      case 'death': [12, 7, 3, 0].forEach((n, i) => T(NOTE(60 + n), 0.6, { type: 'sine', vol: 0.15, delay: i * 0.35 })); break;
      case 'tick': T(1400, 0.03, { type: 'square', vol: 0.03 }); break;
    }
  }

  /** Animal-crossing style babble for speech bubbles. */
  voice(text, pitch = 1) {
    if (!this.ctx || !this.sfxOn) return;
    const chars = text.replace(/[^a-z0-9]/gi, '').slice(0, 8);
    [...chars].forEach((c, i) => {
      const n = 76 + ((c.charCodeAt(0) * 7) % 9);
      this.tone(NOTE(n) * pitch, 0.06, { type: 'triangle', vol: 0.07, delay: i * 0.065 });
    });
  }

  // ---------------------------------------------------------------- music

  startMusic() {
    if (!this.ctx || this.musicTimer) return;
    this.nextBeat = this.ctx.currentTime + 0.1;
    this.musicTimer = setInterval(() => this.schedule(), 120);
  }

  stopMusic() {
    clearInterval(this.musicTimer);
    this.musicTimer = null;
  }

  setMusic(on) {
    this.musicOn = on;
    if (on) this.startMusic(); else this.stopMusic();
  }

  schedule() {
    const beatLen = this.night ? 0.62 : 0.46;
    // I - vi - IV - V (day) / i - VI - iv - v-ish (night)
    const day = [[60, 64, 67, 72], [57, 60, 64, 69], [53, 57, 60, 65], [55, 59, 62, 67]];
    const night = [[57, 60, 64, 69], [53, 57, 60, 65], [50, 53, 57, 62], [52, 55, 59, 64]];
    while (this.nextBeat < this.ctx.currentTime + 0.4) {
      const prog = this.night ? night : day;
      const bar = Math.floor(this.beat / 8) % 4;
      const chord = prog[bar];
      const b = this.beat % 8;
      const at = this.nextBeat;
      if (b === 0) this.tone(NOTE(chord[0] - 12), beatLen * 6, { vol: 0.18, attack: 0.05, bus: this.musicBus, at });
      // arpeggio with gentle randomness and rests
      if (Math.random() < (b % 2 ? 0.55 : 0.9)) {
        const pattern = [0, 1, 2, 3, 2, 1, 2, 3];
        let n = chord[pattern[b]] + 12;
        if (Math.random() < 0.15) n += 12;
        this.tone(NOTE(n), beatLen * 3, { type: 'sine', vol: 0.12, attack: 0.004, bus: this.musicBus, at });
        this.tone(NOTE(n) * 2, beatLen * 1.2, { type: 'sine', vol: 0.03, attack: 0.004, bus: this.musicBus, at });
      }
      this.nextBeat += beatLen;
      this.beat++;
    }
  }
}

export const audio = new Audio();
