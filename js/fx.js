// Particles, speech bubbles and small icons drawn on the canvas.

import { star, heart } from './creature.js';

const TAU = Math.PI * 2;
const rnd = (a, b) => a + Math.random() * (b - a);

export class Particles {
  constructor() { this.list = []; }

  spawn(type, x, y, o = {}) {
    const p = { type, x, y, vx: o.vx ?? rnd(-15, 15), vy: o.vy ?? rnd(-40, -20), life: o.life ?? 1.4, age: 0, size: o.size ?? rnd(6, 10), rot: rnd(0, TAU), spin: rnd(-3, 3), color: o.color, text: o.text, grav: o.grav ?? 0 };
    this.list.push(p);
    return p;
  }

  burst(type, x, y, n, o = {}) {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU + rnd(-0.3, 0.3);
      const sp = rnd(o.speed?.[0] ?? 40, o.speed?.[1] ?? 90);
      this.spawn(type, x, y, { ...o, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 20 });
    }
  }

  update(dt) {
    for (const p of this.list) {
      p.age += dt;
      p.vy += p.grav * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.spin * dt;
      if (p.type === 'zzz' || p.type === 'note') p.x += Math.sin(p.age * 3) * 12 * dt;
      if (p.type === 'bubble') { p.x += Math.sin(p.age * 4 + p.rot) * 20 * dt; }
    }
    this.list = this.list.filter(p => p.age < p.life);
  }

  draw(ctx) {
    for (const p of this.list) {
      const k = p.age / p.life;
      const fade = k < 0.15 ? k / 0.15 : 1 - Math.max(0, (k - 0.6) / 0.4);
      ctx.save();
      ctx.globalAlpha = Math.max(0, fade);
      ctx.translate(p.x, p.y);
      switch (p.type) {
        case 'heart':
          ctx.fillStyle = p.color || '#ff6f9f';
          ctx.strokeStyle = '#fff';
          ctx.lineWidth = 1.5;
          heart(ctx, 0, 0, p.size * (0.8 + 0.2 * Math.sin(p.age * 10)));
          ctx.fill(); ctx.stroke();
          break;
        case 'sparkle':
          ctx.rotate(p.rot);
          ctx.fillStyle = p.color || '#ffe46b';
          star(ctx, 0, 0, p.size * (1 - k * 0.5), 4, 0.35);
          ctx.fill();
          break;
        case 'star':
          ctx.rotate(p.rot);
          ctx.fillStyle = p.color || '#ffd84a';
          ctx.strokeStyle = '#e0a81c';
          ctx.lineWidth = 1;
          star(ctx, 0, 0, p.size, 5, 0.48);
          ctx.fill(); ctx.stroke();
          break;
        case 'zzz':
          ctx.fillStyle = p.color || '#a99bff';
          ctx.font = `600 ${p.size + k * 6}px Fredoka, sans-serif`;
          ctx.fillText('z', 0, 0);
          break;
        case 'note':
          ctx.fillStyle = p.color || '#8f7bff';
          ctx.font = `600 ${p.size + 4}px Fredoka, sans-serif`;
          ctx.fillText(p.text || '♪', 0, 0);
          break;
        case 'bubble':
          ctx.strokeStyle = 'rgba(120,180,255,0.9)';
          ctx.fillStyle = 'rgba(210,235,255,0.35)';
          ctx.lineWidth = 1.2;
          ctx.beginPath(); ctx.arc(0, 0, p.size, 0, TAU); ctx.fill(); ctx.stroke();
          ctx.fillStyle = 'rgba(255,255,255,0.9)';
          ctx.beginPath(); ctx.arc(-p.size * 0.35, -p.size * 0.35, p.size * 0.25, 0, TAU); ctx.fill();
          break;
        case 'crumb':
          ctx.rotate(p.rot);
          ctx.fillStyle = p.color || '#f5e6c8';
          ctx.fillRect(-p.size / 4, -p.size / 4, p.size / 2, p.size / 2);
          break;
        case 'puff':
          ctx.fillStyle = p.color || 'rgba(255,255,255,0.85)';
          ctx.beginPath(); ctx.arc(0, 0, p.size * (0.6 + k), 0, TAU); ctx.fill();
          break;
        case 'confetti':
          ctx.rotate(p.rot);
          ctx.fillStyle = p.color;
          ctx.fillRect(-3, -1.5, 6, 3);
          break;
        case 'text':
          ctx.font = `600 ${p.size}px Fredoka, sans-serif`;
          ctx.textAlign = 'center';
          ctx.lineWidth = 3;
          ctx.strokeStyle = '#fff';
          ctx.strokeText(p.text, 0, 0);
          ctx.fillStyle = p.color || '#7a5cff';
          ctx.fillText(p.text, 0, 0);
          break;
        case 'rain':
          ctx.strokeStyle = 'rgba(140,190,255,0.8)';
          ctx.lineWidth = 1.3;
          ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, 5); ctx.stroke();
          break;
        case 'flake':
          ctx.fillStyle = 'rgba(255,255,255,0.85)';
          ctx.beginPath(); ctx.arc(0, 0, 1.6, 0, TAU); ctx.fill();
          break;
      }
      ctx.restore();
    }
  }
}

export const CONFETTI = ['#ff8fb1', '#ffd84a', '#7fd1ff', '#9be3b5', '#b9a3ff'];

// ------------------------------------------------------------------ bubble

export function drawBubble(ctx, x, y, content, alpha = 1) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.font = '500 11px Fredoka, sans-serif';
  const isIcon = content.startsWith('icon:');
  const w = isIcon ? 30 : Math.max(26, ctx.measureText(content).width + 16);
  const h = isIcon ? 28 : 22;
  const bx = Math.max(4, Math.min(360 - w - 4, x - w / 2));
  const by = y - h - 8;
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#cdbbef';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(bx, by, w, h, 10);
  ctx.fill(); ctx.stroke();
  const tx = Math.max(bx + 10, Math.min(bx + w - 10, x));
  ctx.beginPath();
  ctx.moveTo(tx - 5, by + h - 0.5);
  ctx.lineTo(tx, by + h + 7);
  ctx.lineTo(tx + 5, by + h - 0.5);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(tx - 5, by + h); ctx.lineTo(tx, by + h + 7); ctx.lineTo(tx + 5, by + h);
  ctx.stroke();
  if (isIcon) drawIcon(ctx, content.slice(5), bx + w / 2, by + h / 2, 18);
  else {
    ctx.fillStyle = '#4b3a78';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(content, bx + w / 2, by + h / 2 + 1);
  }
  ctx.restore();
}

// ------------------------------------------------------------------ icons

export function drawIcon(ctx, name, x, y, s) {
  ctx.save();
  ctx.translate(x, y);
  const k = s / 20;
  ctx.scale(k, k);
  ctx.lineWidth = 1.6;
  ctx.lineJoin = 'round';
  ctx.strokeStyle = '#4b3a78';
  switch (name) {
    case 'hunger': drawFood(ctx, 'onigiri', 0, 2, 1); break;
    case 'happy':
      ctx.fillStyle = '#ff8fb1';
      heart(ctx, 0, 1, 18); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(0, -5); ctx.lineTo(-2, 0); ctx.lineTo(2, 2); ctx.lineTo(0, 7); ctx.stroke();
      break;
    case 'lights':
      ctx.fillStyle = '#ffe66b';
      ctx.beginPath(); ctx.arc(0, -2, 7, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#b8b0d0';
      ctx.fillRect(-3.5, 5, 7, 4); ctx.strokeRect(-3.5, 5, 7, 4);
      break;
    case 'dirty':
      ctx.fillStyle = '#a8744a';
      ctx.beginPath(); ctx.ellipse(0, 5, 8, 3.5, 0, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(0, 0, 6, 3, 0, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(0, -4, 3.5, 2.4, 0, 0, TAU); ctx.fill(); ctx.stroke();
      break;
    case 'sick':
      ctx.fillStyle = '#ff8fa8';
      ctx.beginPath(); ctx.roundRect(-9, -4, 18, 9, 4.5); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.roundRect(0, -4, 9, 9, [0, 4.5, 4.5, 0]); ctx.fill(); ctx.stroke();
      break;
    case 'coin':
      drawCoin(ctx, 0, 0, 9);
      break;
  }
  ctx.restore();
}

export function drawCoin(ctx, x, y, r) {
  ctx.fillStyle = '#ffd84a';
  ctx.strokeStyle = '#d49b12';
  ctx.lineWidth = r * 0.18;
  ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#fff1a0';
  star(ctx, x, y, r * 0.5, 5, 0.45);
  ctx.fill();
}

// ------------------------------------------------------------------ food

export function drawFood(ctx, id, x, y, s = 1, bites = 0) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.lineWidth = 1.5;
  ctx.lineJoin = 'round';
  ctx.strokeStyle = '#4b3a78';
  // bites are cut out of the right side
  if (bites > 0) {
    ctx.beginPath();
    ctx.rect(-20, -20, 40, 40);
    ctx.moveTo(11 + 4 + bites * 4, -5);
    ctx.arc(11, -5, 4 + bites * 4, 0, TAU, true);
    ctx.clip('evenodd');
  }
  switch (id) {
    case 'onigiri':
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(0, -9); ctx.quadraticCurveTo(3, -9, 9, 3); ctx.quadraticCurveTo(10, 8, 5, 8);
      ctx.lineTo(-5, 8); ctx.quadraticCurveTo(-10, 8, -9, 3); ctx.quadraticCurveTo(-3, -9, 0, -9);
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#2f4a3a';
      ctx.fillRect(-4, 1, 8, 7);
      break;
    case 'apple':
      ctx.fillStyle = '#ffe98a';
      ctx.beginPath(); ctx.arc(-3, 1, 7, 0, TAU); ctx.arc(3, 1, 7, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.arc(-3, 1, 7, Math.PI * 0.55, Math.PI * 1.6); ctx.arc(3, 1, 7, Math.PI * 1.4, Math.PI * 0.45); ctx.stroke();
      ctx.fillStyle = '#7fcf8e';
      ctx.beginPath(); ctx.ellipse(3, -8, 4, 2, -0.5, 0, TAU); ctx.fill(); ctx.stroke();
      break;
    case 'fish':
      ctx.fillStyle = '#8fd0ff';
      ctx.beginPath(); ctx.ellipse(-1, 0, 8, 5.5, 0, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(6, 0); ctx.lineTo(11, -5); ctx.lineTo(11, 5); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#4b3a78'; ctx.beginPath(); ctx.arc(-5, -1, 1.2, 0, TAU); ctx.fill();
      ctx.fillStyle = '#ffe46b'; star(ctx, 0, 1, 2.5, 5, 0.45); ctx.fill();
      break;
    case 'cake':
      ctx.fillStyle = '#fff4e6';
      ctx.beginPath(); ctx.moveTo(-9, 7); ctx.lineTo(9, 7); ctx.lineTo(9, -2); ctx.lineTo(-9, -5); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#ffb3cc';
      ctx.beginPath(); ctx.moveTo(-9, -5); ctx.lineTo(9, -2); ctx.lineTo(9, 1); ctx.lineTo(-9, -2); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#ff5a7a';
      ctx.beginPath(); ctx.arc(1, -7, 3.2, 0, TAU); ctx.fill(); ctx.stroke();
      break;
    case 'jelly': {
      const g = ctx.createLinearGradient(0, -9, 0, 9);
      g.addColorStop(0, '#d9c2ff'); g.addColorStop(1, '#8fd8ff');
      ctx.fillStyle = g;
      star(ctx, 0, 1, 10, 5, 0.5); ctx.fill(); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      ctx.beginPath(); ctx.arc(-2, -2, 2, 0, TAU); ctx.fill();
      break;
    }
    case 'pill':
      drawIcon(ctx, 'sick', 0, 0, 20);
      break;
  }
  ctx.restore();
}
