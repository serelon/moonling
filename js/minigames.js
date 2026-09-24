// Minigames. Each game owns the canvas while active and reports a result:
// { game, score, coins, won }

import { drawCreature, star, heart } from './creature.js';
import { Particles, CONFETTI, drawCoin } from './fx.js';
import { drawMoon, cloud, W, H, GROUND_Y } from './scene.js';

const TAU = Math.PI * 2;
const rnd = (a, b) => a + Math.random() * (b - a);

export const GAMES = {
  catch: { name: 'Star Catch', desc: 'Catch falling stars. Dodge the storm clouds!', controls: 'Move: mouse / touch / ← →' },
  hop: { name: 'Moon Hop', desc: 'Leap over moon rocks and grab stars.', controls: 'Jump: click / tap / space (double jump!)' },
  guess: { name: 'Which Way?', desc: 'Guess which way your moonling will look.', controls: 'Pick: click a side / ← →' },
};

function label(ctx, text, x, y, size = 16, color = '#5b3fc4') {
  ctx.save();
  ctx.font = `600 ${size}px Fredoka, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineWidth = size * 0.3;
  ctx.strokeStyle = '#fff';
  ctx.lineJoin = 'round';
  ctx.strokeText(text, x, y);
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
  ctx.restore();
}

function nightBackdrop(ctx, t, scroll = 0) {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#1d2260');
  g.addColorStop(0.7, '#5c4fa8');
  g.addColorStop(1, '#b77fc4');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  for (let i = 0; i < 36; i++) {
    const x = ((i * 97.3 - scroll * 0.1) % W + W) % W;
    const y = (i * 53.7) % 170;
    ctx.globalAlpha = 0.4 + 0.5 * Math.abs(Math.sin(t * 1.5 + i));
    ctx.fillStyle = '#fff8d9';
    star(ctx, x, y, (i % 3) + 1, 4, 0.35);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  drawMoon(ctx, 285, 78, 18);
  // hills (parallax)
  ctx.fillStyle = '#3c3a86';
  ctx.beginPath();
  ctx.moveTo(0, H);
  for (let x = 0; x <= W; x += 10) ctx.lineTo(x, 225 + Math.sin((x + scroll * 0.3) * 0.02) * 14);
  ctx.lineTo(W, H);
  ctx.fill();
  ctx.fillStyle = '#6a5fb8';
  ctx.fillRect(0, GROUND_Y, W, H - GROUND_Y);
  ctx.fillStyle = '#8a7fd0';
  ctx.fillRect(0, GROUND_Y, W, 4);
  // ground craters
  ctx.fillStyle = 'rgba(40,30,100,0.3)';
  for (let i = 0; i < 6; i++) {
    const x = ((i * 83 - scroll) % (W + 60) + W + 60) % (W + 60) - 30;
    ctx.beginPath(); ctx.ellipse(x, GROUND_Y + 18 + (i % 2) * 8, 14, 3.5, 0, 0, TAU); ctx.fill();
  }
}

class BaseGame {
  constructor(api, id) {
    this.api = api;
    this.id = id;
    this.t = 0;
    this.phase = 'ready';
    this.phaseT = 0;
    this.score = 0;
    this.done = false;
    this.result = null;
    this.fx = new Particles();
    this.keys = {};
  }
  update(dt) {
    this.t += dt;
    this.phaseT += dt;
    this.fx.update(dt);
    if (this.phase === 'ready' && this.phaseT > 1.6) { this.phase = 'play'; this.phaseT = 0; this.api.audio.play('select'); }
    else if (this.phase === 'play') this.play(dt);
    else if (this.phase === 'over' && this.phaseT > 2.2) this.done = true;
  }
  finish(won, coins) {
    if (this.phase === 'over') return;
    this.phase = 'over';
    this.phaseT = 0;
    this.result = { game: this.id, score: this.score, coins, won };
    this.api.audio.play(won ? 'win' : 'lose');
    if (won) for (let i = 0; i < 30; i++) this.fx.spawn('confetti', rnd(0, W), rnd(-20, 0), { vx: rnd(-20, 20), vy: rnd(40, 110), life: 2.2, color: CONFETTI[i % 5] });
  }
  key(k, down) { this.keys[k] = down; }
  pointer() {}
  overlay(ctx) {
    this.fx.draw(ctx);
    if (this.phase === 'ready') {
      const n = 3 - Math.floor(this.phaseT / 0.55);
      label(ctx, GAMES[this.id].name, W / 2, 110, 24);
      label(ctx, n > 0 ? String(n) : 'Go!', W / 2, 150, 30, '#ff6f9f');
      label(ctx, GAMES[this.id].controls, W / 2, 190, 11, '#6a55a8');
    } else if (this.phase === 'over') {
      const r = this.result;
      label(ctx, r.won ? 'Great job!' : 'Nice try!', W / 2, 105, 26, r.won ? '#ff6f9f' : '#6a55a8');
      label(ctx, `Score ${r.score}`, W / 2, 140, 18);
      ctx.save();
      drawCoin(ctx, W / 2 - 22, 170, 9);
      ctx.restore();
      label(ctx, `+${r.coins}`, W / 2 + 8, 170, 18, '#d49b12');
    }
  }
  pet(ctx, x, y, extra = {}) {
    const a = this.api;
    drawCreature(ctx, a.form, { x, y, t: this.t, facing: 1, weight: a.weight, hat: a.hat, ...extra });
  }
}

// ------------------------------------------------------------------ Star Catch

class CatchGame extends BaseGame {
  constructor(api) {
    super(api, 'catch');
    this.x = W / 2;
    this.target = null;
    this.items = [];
    this.spawnT = 0;
    this.stun = 0;
    this.joy = 0;
    this.duration = 30;
    this.vx = 0;
  }
  pointer(x) { this.target = x; }
  play(dt) {
    const el = this.phaseT;
    // movement
    const prevX = this.x;
    if (this.stun <= 0) {
      const dir = (this.keys.ArrowRight || this.keys.d ? 1 : 0) - (this.keys.ArrowLeft || this.keys.a ? 1 : 0);
      if (dir) { this.x += dir * 230 * dt; this.target = null; }
      else if (this.target != null) this.x += (this.target - this.x) * Math.min(1, dt * 9);
    }
    this.x = Math.max(24, Math.min(W - 24, this.x));
    this.vx = (this.x - prevX) / Math.max(dt, 1e-3);
    this.stun -= dt;
    this.joy -= dt;

    this.spawnT -= dt;
    if (this.spawnT <= 0) {
      this.spawnT = Math.max(0.32, 0.85 - el * 0.018);
      const r = Math.random();
      const cloudChance = 0.18 + el * 0.006;
      const type = r < cloudChance ? 'cloud' : r < cloudChance + 0.1 ? 'big' : 'star';
      this.items.push({ type, x: rnd(20, W - 20), y: -15, vy: 70 + el * 3.2 + rnd(0, 35), ph: rnd(0, TAU) });
    }
    for (const it of this.items) {
      it.y += it.vy * dt;
      if (it.type !== 'cloud') it.x += Math.sin(this.t * 3 + it.ph) * 20 * dt;
      const petTop = GROUND_Y - 58;
      if (!it.hit && Math.abs(it.x - this.x) < 28 && it.y > petTop && it.y < GROUND_Y - 4) {
        it.hit = true;
        if (it.type === 'cloud') {
          this.score = Math.max(0, this.score - 2);
          this.stun = 0.7;
          this.api.audio.play('hit');
          for (let i = 0; i < 10; i++) this.fx.spawn('rain', it.x + rnd(-12, 12), it.y, { vx: 0, vy: 160, life: 0.5 });
          this.fx.spawn('text', it.x, it.y - 10, { text: '-2', color: '#6a7ab8', vx: 0, vy: -30, size: 14 });
        } else {
          const v = it.type === 'big' ? 3 : 1;
          this.score += v;
          this.joy = 0.4;
          this.api.audio.play(v > 1 ? 'sparkle' : 'coin');
          this.fx.burst('sparkle', it.x, it.y, v > 1 ? 10 : 5, { life: 0.6, size: 5 });
          this.fx.spawn('text', it.x, it.y - 10, { text: `+${v}`, color: '#ff9f1c', vx: 0, vy: -40, size: 14 });
        }
      }
    }
    this.items = this.items.filter(it => !it.hit && it.y < H + 20);
    if (el >= this.duration) this.finish(this.score >= 12, Math.ceil(this.score / 2));
  }
  draw(ctx) {
    nightBackdrop(ctx, this.t);
    for (const it of this.items) {
      if (it.type === 'cloud') {
        ctx.fillStyle = '#6b6f99';
        cloud(ctx, it.x - 14, it.y, 1.1);
        ctx.fillStyle = '#ffe66b';
        ctx.beginPath(); ctx.moveTo(it.x + 1, it.y + 6); ctx.lineTo(it.x - 4, it.y + 15); ctx.lineTo(it.x + 1, it.y + 14); ctx.lineTo(it.x - 2, it.y + 22); ctx.lineTo(it.x + 6, it.y + 11); ctx.lineTo(it.x + 1, it.y + 12); ctx.closePath(); ctx.fill();
      } else {
        const r = it.type === 'big' ? 13 : 8;
        const g = ctx.createRadialGradient(it.x, it.y, 1, it.x, it.y, r * 2.2);
        g.addColorStop(0, 'rgba(255,240,150,0.6)'); g.addColorStop(1, 'rgba(255,240,150,0)');
        ctx.fillStyle = g;
        ctx.fillRect(it.x - r * 2.2, it.y - r * 2.2, r * 4.4, r * 4.4);
        ctx.fillStyle = it.type === 'big' ? '#ffb3e6' : '#ffe066';
        ctx.strokeStyle = it.type === 'big' ? '#d8609e' : '#d49b12';
        ctx.lineWidth = 1.5;
        star(ctx, it.x, it.y, r, 5, 0.48, -Math.PI / 2 + this.t * 2);
        ctx.fill(); ctx.stroke();
      }
    }
    // look at the nearest falling star
    const near = this.items.filter(i => i.type !== 'cloud').sort((a, b) => b.y - a.y)[0];
    const lookX = near ? Math.max(-1, Math.min(1, (near.x - this.x) / 80)) : 0;
    this.pet(ctx, this.x, GROUND_Y, {
      expr: this.stun > 0 ? 'sad' : this.joy > 0 ? 'happy' : 'normal',
      mouth: this.stun > 0 ? 'wobbly' : this.joy > 0 ? 'grin' : 'o',
      lookX, lookY: -0.8, walk: Math.abs(this.vx) > 20 ? this.t * 14 : 0, tilt: Math.max(-0.25, Math.min(0.25, this.vx / 900)),
    });
    // HUD
    if (this.phase === 'play') {
      const left = Math.max(0, 1 - this.phaseT / this.duration);
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.beginPath(); ctx.roundRect(W / 2 - 80, 10, 160, 8, 4); ctx.fill();
      ctx.fillStyle = left < 0.2 ? '#ff8fa8' : '#ffe066';
      ctx.beginPath(); ctx.roundRect(W / 2 - 80, 10, 160 * left, 8, 4); ctx.fill();
    }
    ctx.fillStyle = '#ffe066';
    star(ctx, 22, 34, 9, 5, 0.48); ctx.fill();
    label(ctx, String(this.score), 46, 35, 16, '#5b3fc4');
    this.overlay(ctx);
  }
}

// ------------------------------------------------------------------ Moon Hop

class HopGame extends BaseGame {
  constructor(api) {
    super(api, 'hop');
    this.y = 0; // height above ground
    this.vy = 0;
    this.jumps = 0;
    this.obs = [];
    this.stars = [];
    this.spawnT = 1;
    this.starT = 2;
    this.scroll = 0;
    this.lives = 3;
    this.inv = 0;
    this.x = 80;
  }
  jump() {
    if (this.phase !== 'play') return;
    if (this.jumps < 2) {
      this.vy = this.jumps === 0 ? 360 : 300;
      this.jumps++;
      this.api.audio.play('jump', this.jumps === 2 ? 1.3 : 1);
      if (this.jumps === 2) this.fx.burst('puff', this.x, GROUND_Y - this.y, 6, { life: 0.4, size: 4, speed: [20, 50] });
    }
  }
  pointer(x, y, type) { if (type === 'down') this.jump(); }
  key(k, down) {
    if (down && !this.keys[k] && (k === ' ' || k === 'ArrowUp' || k === 'w')) this.jump();
    super.key(k, down);
  }
  play(dt) {
    const el = this.phaseT;
    const speed = 150 + el * 5;
    this.scroll += speed * dt;
    this.vy -= 950 * dt;
    this.y += this.vy * dt;
    if (this.y <= 0) { this.y = 0; this.vy = 0; this.jumps = 0; }
    this.inv -= dt;

    this.spawnT -= dt;
    if (this.spawnT <= 0) {
      const tall = Math.random() < Math.min(0.45, el * 0.012);
      this.obs.push({ x: W + 20, w: tall ? 18 : rnd(20, 30), h: tall ? rnd(34, 44) : rnd(14, 24), tall, passed: false });
      this.spawnT = Math.max(0.75, rnd(1.1, 1.9) - el * 0.012);
    }
    this.starT -= dt;
    if (this.starT <= 0) {
      this.stars.push({ x: W + 20, y: rnd(50, 110) });
      this.starT = rnd(1.4, 2.8);
    }
    for (const o of this.obs) {
      o.x -= speed * dt;
      const hitX = Math.abs(o.x - this.x) < o.w / 2 + 14;
      if (hitX && this.y < o.h - 4 && this.inv <= 0 && !o.hit) {
        o.hit = true;
        this.lives--;
        this.inv = 1.2;
        this.api.audio.play('hit');
        this.fx.burst('puff', this.x, GROUND_Y - 20, 8, { life: 0.5, size: 5, color: 'rgba(200,190,255,0.8)' });
        if (this.lives <= 0) this.finish(this.score >= 10, Math.ceil(this.score / 2));
      }
      if (!o.passed && o.x < this.x - 20) {
        o.passed = true;
        if (!o.hit) { this.score++; this.api.audio.play('tick'); }
      }
    }
    for (const s of this.stars) {
      s.x -= speed * dt;
      if (!s.got && Math.abs(s.x - this.x) < 22 && Math.abs((GROUND_Y - this.y - 28) - s.y) < 28) {
        s.got = true;
        this.score += 2;
        this.api.audio.play('coin');
        this.fx.burst('sparkle', s.x, s.y, 6, { life: 0.5, size: 5 });
        this.fx.spawn('text', s.x, s.y - 12, { text: '+2', color: '#ff9f1c', vx: 0, vy: -40, size: 14 });
      }
    }
    this.obs = this.obs.filter(o => o.x > -40);
    this.stars = this.stars.filter(s => s.x > -20 && !s.got);
    if (el > 75 && this.phase === 'play') this.finish(this.score >= 10, Math.ceil(this.score / 2));
  }
  draw(ctx) {
    nightBackdrop(ctx, this.t, this.scroll);
    for (const o of this.obs) {
      ctx.fillStyle = o.tall ? '#b9a3ff' : '#8c84b8';
      ctx.strokeStyle = '#3a2f73';
      ctx.lineWidth = 2;
      ctx.beginPath();
      if (o.tall) {
        ctx.moveTo(o.x - o.w / 2, GROUND_Y); ctx.lineTo(o.x - o.w / 4, GROUND_Y - o.h * 0.7); ctx.lineTo(o.x, GROUND_Y - o.h);
        ctx.lineTo(o.x + o.w / 4, GROUND_Y - o.h * 0.7); ctx.lineTo(o.x + o.w / 2, GROUND_Y);
      } else {
        ctx.moveTo(o.x - o.w / 2, GROUND_Y);
        ctx.quadraticCurveTo(o.x - o.w / 2, GROUND_Y - o.h, o.x, GROUND_Y - o.h);
        ctx.quadraticCurveTo(o.x + o.w / 2, GROUND_Y - o.h, o.x + o.w / 2, GROUND_Y);
      }
      ctx.closePath();
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.beginPath(); ctx.ellipse(o.x - o.w * 0.15, GROUND_Y - o.h * 0.65, 3, 2, -0.5, 0, TAU); ctx.fill();
    }
    for (const s of this.stars) {
      ctx.fillStyle = '#ffe066'; ctx.strokeStyle = '#d49b12'; ctx.lineWidth = 1.5;
      star(ctx, s.x, s.y + Math.sin(this.t * 4 + s.x * 0.05) * 3, 9, 5, 0.48, this.t * 2);
      ctx.fill(); ctx.stroke();
    }
    const air = this.y > 1;
    const blink = this.inv > 0 && Math.floor(this.t * 12) % 2 === 0;
    if (!blink) {
      ctx.fillStyle = 'rgba(20,10,60,0.25)';
      ctx.beginPath(); ctx.ellipse(this.x, GROUND_Y + 2, 20 - Math.min(12, this.y * 0.08), 4, 0, 0, TAU); ctx.fill();
      this.pet(ctx, this.x, GROUND_Y - this.y, {
        expr: this.inv > 0.6 ? 'annoyed' : air ? 'happy' : 'normal', mouth: air ? 'grin' : 'smile',
        sx: air ? 0.9 : 1, sy: air ? 1.12 : 1, walk: air ? 0 : this.t * 16, lookX: 0.6,
        tilt: air ? -0.15 : 0,
      });
    }
    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = i < this.lives ? '#ff6f9f' : 'rgba(255,255,255,0.25)';
      heart(ctx, W - 22 - i * 22, 30, 16); ctx.fill();
    }
    ctx.fillStyle = '#ffe066';
    star(ctx, 22, 34, 9, 5, 0.48); ctx.fill();
    label(ctx, String(this.score), 46, 35, 16, '#5b3fc4');
    this.overlay(ctx);
  }
}

// ------------------------------------------------------------------ Which Way?

class GuessGame extends BaseGame {
  constructor(api) {
    super(api, 'guess');
    this.round = 0;
    this.results = [];
    this.stage = 'ask'; // ask -> wait -> reveal
    this.stageT = 0;
    this.pick = 0;
    this.dir = 0;
  }
  choose(d) {
    if (this.phase !== 'play' || this.stage !== 'ask') return;
    this.pick = d;
    this.dir = Math.random() < 0.5 ? -1 : 1;
    this.stage = 'wait';
    this.stageT = 0;
    this.api.audio.play('blip');
  }
  pointer(x, y, type) { if (type === 'down') this.choose(x < W / 2 ? -1 : 1); }
  key(k, down) {
    if (down && (k === 'ArrowLeft' || k === 'a')) this.choose(-1);
    if (down && (k === 'ArrowRight' || k === 'd')) this.choose(1);
    super.key(k, down);
  }
  play(dt) {
    this.stageT += dt;
    if (this.stage === 'wait' && this.stageT > 0.45) {
      this.stage = 'reveal';
      this.stageT = 0;
      const ok = this.pick === this.dir;
      this.results.push(ok);
      if (ok) {
        this.score++;
        this.api.audio.play('happy');
        this.fx.burst('heart', W / 2, GROUND_Y - 60, 6, { life: 0.9, size: 9 });
      } else this.api.audio.play('sad');
    } else if (this.stage === 'reveal' && this.stageT > 1.3) {
      this.round++;
      if (this.round >= 5) {
        const won = this.score >= 3;
        this.finish(won, this.score * 2 + (won ? 2 : 0));
      } else { this.stage = 'ask'; this.stageT = 0; }
    }
  }
  draw(ctx) {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#ffe3f0'); g.addColorStop(1, '#e3dcff');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    // spotlight
    const sg = ctx.createRadialGradient(W / 2, GROUND_Y - 30, 10, W / 2, GROUND_Y - 30, 150);
    sg.addColorStop(0, 'rgba(255,255,255,0.9)'); sg.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = sg;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#d8c7ff';
    ctx.fillRect(0, GROUND_Y, W, H - GROUND_Y);
    ctx.fillStyle = '#f4b6d2';
    ctx.beginPath(); ctx.ellipse(W / 2, GROUND_Y, 70, 12, 0, 0, TAU); ctx.fill();

    // round pips
    for (let i = 0; i < 5; i++) {
      const r = this.results[i];
      ctx.fillStyle = r === undefined ? 'rgba(120,90,200,0.2)' : r ? '#ff6f9f' : '#9aa0c8';
      ctx.beginPath(); ctx.arc(W / 2 - 40 + i * 20, 22, 6, 0, TAU); ctx.fill();
    }

    const revealing = this.stage === 'reveal';
    const ok = revealing && this.results[this.results.length - 1];
    const look = revealing ? this.dir : this.stage === 'wait' ? Math.sin(this.t * 30) * 0.2 : Math.sin(this.t * 2) * 0.3;
    this.pet(ctx, W / 2 + (revealing ? this.dir * 6 : 0), GROUND_Y, {
      lookX: look, tilt: revealing ? this.dir * 0.12 : 0,
      expr: revealing ? (ok ? 'happy' : 'sad') : 'normal', mouth: revealing ? (ok ? 'grin' : 'frown') : 'w',
      scale: 1.35,
    });

    if (this.phase === 'play') {
      const pulse = 1 + Math.sin(this.t * 5) * 0.06;
      for (const d of [-1, 1]) {
        const x = W / 2 + d * 125;
        const chosen = this.stage !== 'ask' && this.pick === d;
        ctx.save();
        ctx.translate(x, 170);
        ctx.scale(chosen ? 1.2 : pulse, chosen ? 1.2 : pulse);
        ctx.fillStyle = chosen ? '#ff6f9f' : '#ffffff';
        ctx.strokeStyle = '#b39ae8';
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(0, 0, 24, 0, TAU); ctx.fill(); ctx.stroke();
        ctx.fillStyle = chosen ? '#fff' : '#8b6fe0';
        ctx.beginPath(); ctx.moveTo(d * 11, 0); ctx.lineTo(-d * 6, -11); ctx.lineTo(-d * 6, 11); ctx.closePath(); ctx.fill();
        ctx.restore();
      }
      if (this.stage === 'ask') label(ctx, 'Which way will I look?', W / 2, 60, 16);
      if (revealing) label(ctx, ok ? 'Yes! ♡' : 'Nope~', W / 2, 60, 20, ok ? '#ff6f9f' : '#6a55a8');
    }
    this.overlay(ctx);
  }
}

export function createGame(id, api) {
  if (id === 'catch') return new CatchGame(api);
  if (id === 'hop') return new HopGame(api);
  return new GuessGame(api);
}
