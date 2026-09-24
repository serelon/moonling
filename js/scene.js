// The room the moonling lives in. The window shows the real local time of day.

import { drawCreature, star, heart } from './creature.js';

export const W = 360, H = 300;
export const FLOOR_Y = 206;
export const GROUND_Y = 266;

const TAU = Math.PI * 2;

const WALL = {
  lilac: { base: '#f1e8ff', pat: '#e3d5ff', trim: '#fdfaff', rug: ['#ffc6dc', '#ffe3ee'] },
  mint: { base: '#e5f8ee', pat: '#d0f0de', trim: '#fbfffd', rug: ['#9fdcc0', '#d9f5e8'] },
  peach: { base: '#fff0e6', pat: '#ffd9c8', trim: '#fffaf6', rug: ['#ffb99b', '#ffe2d4'] },
  night: { base: '#34377a', pat: '#ffe8a0', trim: '#4a4e9c', rug: ['#8e84e0', '#c4bcff'] },
};

// sky keyframes: [hour, top, bottom]
const SKY = [
  [0, '#141a46', '#2d3380'],
  [5, '#1d2258', '#4b4a93'],
  [6.3, '#f7a8c4', '#ffd9a8'],
  [8, '#7ec8ff', '#d6f0ff'],
  [16.5, '#79c2ff', '#dff3ff'],
  [18.3, '#ff9e7a', '#ffd48f'],
  [19.6, '#5b4a9e', '#e889a8'],
  [21, '#171d4d', '#343a8a'],
  [24, '#141a46', '#2d3380'],
];

function lerpHex(a, b, k) {
  const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
  const ch = s => [(s >> 16) & 255, (s >> 8) & 255, s & 255];
  const A = ch(pa), B = ch(pb);
  return `rgb(${A.map((v, i) => Math.round(v + (B[i] - v) * k)).join(',')})`;
}

export function skyAt(hour) {
  for (let i = 0; i < SKY.length - 1; i++) {
    const [h0, t0, b0] = SKY[i], [h1, t1, b1] = SKY[i + 1];
    if (hour >= h0 && hour <= h1) {
      const k = (hour - h0) / (h1 - h0);
      return { top: lerpHex(t0, t1, k), bottom: lerpHex(b0, b1, k) };
    }
  }
  return { top: SKY[0][1], bottom: SKY[0][2] };
}

export function isNight(hour) { return hour < 6 || hour >= 20; }

// deterministic star field
const STARS = Array.from({ length: 40 }, (_, i) => {
  const r = Math.sin(i * 12.9898) * 43758.5453;
  const r2 = Math.sin(i * 78.233) * 12543.123;
  return [r - Math.floor(r), r2 - Math.floor(r2), (i % 3) + 1];
});

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

// ------------------------------------------------------------------ window

function drawWindow(ctx, t, hour, x, y, w, h) {
  const sky = skyAt(hour);
  ctx.save();
  roundRect(ctx, x, y, w, h, 10);
  ctx.clip();
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, sky.top);
  g.addColorStop(1, sky.bottom);
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);

  const night = isNight(hour);
  const starAlpha = hour >= 20 ? Math.min(1, (hour - 20) / 1) : hour < 6 ? Math.min(1, (6 - hour) / 1) : 0;
  if (starAlpha > 0) {
    for (const [a, b, s] of STARS) {
      ctx.globalAlpha = starAlpha * (0.4 + 0.6 * Math.abs(Math.sin(t * 1.3 + a * 20)));
      ctx.fillStyle = '#fff8d9';
      star(ctx, x + a * w, y + b * h * 0.85, s * 0.9, 4, 0.35);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  // sun: 6 -> 19.5, moon: 19 -> 6.5 (wraps)
  const arc = (k) => [x + w * (0.1 + 0.8 * k), y + h * 0.85 - Math.sin(k * Math.PI) * h * 0.6];
  if (hour >= 6 && hour <= 19.5) {
    const [sx, sy] = arc((hour - 6) / 13.5);
    const sg = ctx.createRadialGradient(sx, sy, 2, sx, sy, 26);
    sg.addColorStop(0, 'rgba(255,245,200,0.9)');
    sg.addColorStop(1, 'rgba(255,245,200,0)');
    ctx.fillStyle = sg;
    ctx.fillRect(sx - 26, sy - 26, 52, 52);
    ctx.fillStyle = '#ffe27a';
    ctx.beginPath(); ctx.arc(sx, sy, 9, 0, TAU); ctx.fill();
  }
  if (hour >= 19 || hour <= 6.5) {
    const k = hour >= 19 ? (hour - 19) / 11.5 : (hour + 5) / 11.5;
    const [mx, my] = arc(k);
    drawMoon(ctx, mx, my, 10);
  }

  // clouds
  ctx.fillStyle = night ? 'rgba(160,160,220,0.35)' : 'rgba(255,255,255,0.85)';
  for (let i = 0; i < 3; i++) {
    const cx = x + ((t * (4 + i * 2) + i * 60) % (w + 60)) - 30;
    const cy = y + 18 + i * 22;
    cloud(ctx, cx, cy, 0.7 + i * 0.15);
  }
  // distant hills
  ctx.fillStyle = night ? '#2a2f6a' : '#a8dcb0';
  ctx.beginPath();
  ctx.moveTo(x, y + h);
  ctx.quadraticCurveTo(x + w * 0.25, y + h - 26, x + w * 0.5, y + h - 12);
  ctx.quadraticCurveTo(x + w * 0.75, y + h - 30, x + w, y + h - 10);
  ctx.lineTo(x + w, y + h);
  ctx.fill();
  ctx.restore();

  // frame
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 6;
  roundRect(ctx, x, y, w, h, 10);
  ctx.stroke();
  ctx.strokeStyle = '#d9c9f0';
  ctx.lineWidth = 1.5;
  roundRect(ctx, x - 3, y - 3, w + 6, h + 6, 12);
  ctx.stroke();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(x + w / 2, y); ctx.lineTo(x + w / 2, y + h);
  ctx.moveTo(x, y + h / 2); ctx.lineTo(x + w, y + h / 2);
  ctx.stroke();
  // sill
  ctx.fillStyle = '#ffffff';
  roundRect(ctx, x - 10, y + h + 2, w + 20, 7, 3);
  ctx.fill();
  ctx.fillStyle = 'rgba(120,90,160,0.15)';
  ctx.fillRect(x - 8, y + h + 9, w + 16, 3);
}

export function drawMoon(ctx, x, y, r) {
  const g = ctx.createRadialGradient(x, y, r * 0.5, x, y, r * 3);
  g.addColorStop(0, 'rgba(255,250,210,0.5)');
  g.addColorStop(1, 'rgba(255,250,210,0)');
  ctx.fillStyle = g;
  ctx.fillRect(x - r * 3, y - r * 3, r * 6, r * 6);
  ctx.fillStyle = '#fff6cf';
  ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
  ctx.fillStyle = 'rgba(220,205,160,0.6)';
  ctx.beginPath(); ctx.arc(x - r * 0.3, y - r * 0.2, r * 0.22, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.arc(x + r * 0.35, y + r * 0.3, r * 0.15, 0, TAU); ctx.fill();
}

export function cloud(ctx, x, y, s) {
  ctx.beginPath();
  ctx.arc(x, y, 8 * s, 0, TAU);
  ctx.arc(x + 9 * s, y - 4 * s, 10 * s, 0, TAU);
  ctx.arc(x + 19 * s, y, 8 * s, 0, TAU);
  ctx.rect(x, y, 19 * s, 8 * s);
  ctx.fill();
}

function curtain(ctx, x, y, h, side, t) {
  ctx.fillStyle = '#ffb7d0';
  ctx.strokeStyle = '#e991b3';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  const sway = Math.sin(t * 0.8) * 2;
  ctx.moveTo(x, y);
  ctx.lineTo(x + side * 26, y);
  ctx.quadraticCurveTo(x + side * 10 + sway, y + h * 0.55, x + side * 18 + sway, y + h);
  ctx.lineTo(x, y + h);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = 'rgba(233,145,179,0.6)';
  for (let i = 1; i < 3; i++) {
    ctx.beginPath();
    ctx.moveTo(x + side * i * 8, y + 4);
    ctx.quadraticCurveTo(x + side * i * 4 + sway, y + h * 0.6, x + side * i * 6 + sway, y + h - 4);
    ctx.stroke();
  }
  // tie
  ctx.fillStyle = '#ffe07a';
  ctx.beginPath();
  ctx.ellipse(x + side * 10, y + h * 0.58, 4, 3, 0, 0, TAU);
  ctx.fill();
}

// ------------------------------------------------------------------ room

export function drawRoom(ctx, s) {
  const { t, hour, wallpaper = 'lilac', framed } = s;
  const wp = WALL[wallpaper] || WALL.lilac;

  // wall
  ctx.fillStyle = wp.base;
  ctx.fillRect(0, 0, W, FLOOR_Y);
  ctx.fillStyle = wp.pat;
  if (wallpaper === 'mint') {
    for (let x = 0; x < W; x += 24) ctx.fillRect(x, 0, 10, FLOOR_Y);
  } else if (wallpaper === 'peach') {
    for (let y = 14, r = 0; y < FLOOR_Y; y += 26, r++) for (let x = (r % 2) * 13 + 6; x < W; x += 26) { heart(ctx, x, y, 7); ctx.fill(); }
  } else if (wallpaper === 'night') {
    for (let i = 0; i < 26; i++) {
      const [a, b, sz] = STARS[i];
      ctx.globalAlpha = 0.35 + 0.35 * Math.sin(t + i);
      star(ctx, a * W, b * FLOOR_Y, sz + 1, 4, 0.35);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  } else {
    for (let y = 10, r = 0; y < FLOOR_Y; y += 18, r++) for (let x = (r % 2) * 9 + 4; x < W; x += 18) { ctx.beginPath(); ctx.arc(x, y, 2.2, 0, TAU); ctx.fill(); }
  }

  // window + curtains
  const wx = 34, wy = 26, ww = 108, wh = 92;
  drawWindow(ctx, t, hour, wx, wy, ww, wh);
  ctx.fillStyle = '#c9a6e8';
  roundRect(ctx, wx - 20, wy - 12, ww + 40, 5, 2.5);
  ctx.fill();
  curtain(ctx, wx - 16, wy - 9, wh + 10, 1, t);
  curtain(ctx, wx + ww + 16, wy - 9, wh + 10, -1, t + 1);

  // shelf with a framed photo, plant and lamp
  const sx = 214, sy = 92;
  ctx.fillStyle = '#e7c49b';
  roundRect(ctx, sx, sy, 118, 7, 3);
  ctx.fill();
  ctx.fillStyle = '#c99f72';
  ctx.fillRect(sx + 10, sy + 7, 5, 8);
  ctx.fillRect(sx + 103, sy + 7, 5, 8);
  // photo frame
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#d3b58c';
  ctx.lineWidth = 2;
  roundRect(ctx, sx + 8, sy - 38, 34, 38, 4);
  ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#fff2c9';
  roundRect(ctx, sx + 12, sy - 34, 26, 26, 2);
  ctx.fill();
  if (framed) {
    ctx.save();
    roundRect(ctx, sx + 12, sy - 34, 26, 26, 2);
    ctx.clip();
    drawCreature(ctx, framed, { x: sx + 25, y: sy - 6, t: 0, scale: 0.5, expr: 'happy', mouth: 'smile', facing: 1 });
    ctx.restore();
  } else {
    ctx.fillStyle = '#e5d4ff';
    heart(ctx, sx + 25, sy - 21, 12);
    ctx.fill();
  }
  // plant
  ctx.fillStyle = '#f2a37c';
  ctx.beginPath();
  ctx.moveTo(sx + 56, sy - 16); ctx.lineTo(sx + 76, sy - 16); ctx.lineTo(sx + 73, sy); ctx.lineTo(sx + 59, sy);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#6cc48a';
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + (i - 2) * 0.5 + Math.sin(t * 1.2 + i) * 0.05;
    ctx.save();
    ctx.translate(sx + 66, sy - 16);
    ctx.rotate(a + Math.PI / 2);
    ctx.beginPath();
    ctx.ellipse(0, -10, 4, 11, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
  }
  // moon lamp
  const lampOn = s.lightsOn === false;
  ctx.fillStyle = '#b79ae6';
  roundRect(ctx, sx + 92, sy - 6, 14, 6, 2);
  ctx.fill();
  if (lampOn) {
    const lg = ctx.createRadialGradient(sx + 99, sy - 17, 2, sx + 99, sy - 17, 50);
    lg.addColorStop(0, 'rgba(255,230,150,0.55)');
    lg.addColorStop(1, 'rgba(255,230,150,0)');
    ctx.fillStyle = lg;
    ctx.fillRect(sx + 49, sy - 67, 100, 100);
  }
  ctx.fillStyle = lampOn ? '#fff1a8' : '#fff8e1';
  ctx.beginPath(); ctx.arc(sx + 99, sy - 17, 10, 0, TAU); ctx.fill();
  ctx.fillStyle = wp.base;
  ctx.beginPath(); ctx.arc(sx + 104, sy - 20, 8.5, 0, TAU); ctx.fill();

  // wall clock showing real time
  drawClock(ctx, 272, 150, 18, s.date);

  // baseboard
  ctx.fillStyle = wp.trim;
  ctx.fillRect(0, FLOOR_Y - 8, W, 8);
  ctx.fillStyle = 'rgba(100,70,140,0.12)';
  ctx.fillRect(0, FLOOR_Y, W, 3);

  // floor
  const fg = ctx.createLinearGradient(0, FLOOR_Y, 0, H);
  fg.addColorStop(0, '#e9cba6');
  fg.addColorStop(1, '#dcb58b');
  ctx.fillStyle = fg;
  ctx.fillRect(0, FLOOR_Y, W, H - FLOOR_Y);
  ctx.strokeStyle = 'rgba(160,110,70,0.22)';
  ctx.lineWidth = 1;
  let yy = FLOOR_Y + 6;
  for (let i = 0; yy < H; i++) {
    ctx.beginPath(); ctx.moveTo(0, yy); ctx.lineTo(W, yy); ctx.stroke();
    const off = (i * 57) % 90;
    for (let x = off; x < W; x += 90) { ctx.beginPath(); ctx.moveTo(x, yy); ctx.lineTo(x, yy + 6 + i * 3); ctx.stroke(); }
    yy += 6 + i * 3;
  }
  // window light patch on the floor during the day
  if (!isNight(hour)) {
    ctx.fillStyle = 'rgba(255,248,220,0.28)';
    ctx.beginPath();
    ctx.moveTo(40, FLOOR_Y + 6); ctx.lineTo(140, FLOOR_Y + 6); ctx.lineTo(190, FLOOR_Y + 50); ctx.lineTo(70, FLOOR_Y + 50);
    ctx.closePath(); ctx.fill();
  }

  // rug
  ctx.fillStyle = wp.rug[0];
  ctx.beginPath(); ctx.ellipse(180, GROUND_Y - 2, 118, 24, 0, 0, TAU); ctx.fill();
  ctx.strokeStyle = wp.rug[1];
  ctx.lineWidth = 3;
  ctx.setLineDash([6, 5]);
  ctx.beginPath(); ctx.ellipse(180, GROUND_Y - 2, 104, 18, 0, 0, TAU); ctx.stroke();
  ctx.setLineDash([]);
}

function drawClock(ctx, x, y, r, date) {
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#c9a6e8';
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#c9a6e8';
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * TAU;
    ctx.beginPath(); ctx.arc(x + Math.cos(a) * r * 0.75, y + Math.sin(a) * r * 0.75, i % 3 ? 0.8 : 1.5, 0, TAU); ctx.fill();
  }
  const hr = date.getHours() % 12 + date.getMinutes() / 60;
  const mn = date.getMinutes() + date.getSeconds() / 60;
  ctx.strokeStyle = '#5b4a8a';
  ctx.lineCap = 'round';
  const hand = (a, len, w) => { ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.sin(a) * len, y - Math.cos(a) * len); ctx.stroke(); };
  hand((hr / 12) * TAU, r * 0.45, 2.4);
  hand((mn / 60) * TAU, r * 0.68, 1.6);
  ctx.fillStyle = '#ff8fb1';
  ctx.beginPath(); ctx.arc(x, y, 2, 0, TAU); ctx.fill();
}

/** Darkness when the lights are off. Call after drawing the pet. */
export function drawDarkness(ctx, t, amount) {
  if (amount <= 0) return;
  ctx.save();
  ctx.fillStyle = `rgba(16, 14, 48, ${0.72 * amount})`;
  ctx.fillRect(0, 0, W, H);
  // moonbeam through the window and the lamp glow
  ctx.globalCompositeOperation = 'lighter';
  const lg = ctx.createRadialGradient(313, 75, 2, 313, 75, 70);
  lg.addColorStop(0, `rgba(120,100,40,${0.5 * amount})`);
  lg.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = lg;
  ctx.fillRect(240, 0, 120, 160);
  ctx.fillStyle = `rgba(70,80,140,${0.35 * amount})`;
  ctx.beginPath();
  ctx.moveTo(34, 118); ctx.lineTo(142, 118); ctx.lineTo(210, 280); ctx.lineTo(70, 280);
  ctx.closePath(); ctx.fill();
  ctx.restore();
}

export function drawShadow(ctx, x, y, w, alpha = 0.18) {
  ctx.fillStyle = `rgba(90,50,80,${alpha})`;
  ctx.beginPath();
  ctx.ellipse(x, y, w, w * 0.22, 0, 0, TAU);
  ctx.fill();
}
