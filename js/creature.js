// Procedural vector art for moonlings. Every creature is a jelly-wobbly blob
// with a face, drawn fresh each frame so it can squash, look around and emote.

const TAU = Math.PI * 2;

export const LOOKS = {
  pip: { body: '#dccdff', shade: '#a893e8', belly: '#f6f1ff', line: '#6a55a8', r: 21, w: 1, h: 0.95, top: 'tuft', eyes: 'big', cheek: '#ff9fc4' },
  mochi: { body: '#fff5f7', shade: '#f3c2d0', belly: null, line: '#c58699', r: 27, w: 1.12, h: 0.84, ears: 'nub', cheek: '#ff97b5' },
  grumble: { body: '#adc0d9', shade: '#7389ad', belly: '#dfe8f3', line: '#475c80', r: 27, w: 1, h: 0.96, top: 'spikes', brows: 'grumpy', cheek: '#e3a2b8' },
  starling: { body: '#5057b3', shade: '#2d3079', belly: '#8990e0', line: '#1e2058', r: 33, w: 1, h: 1, top: 'antenna', eyes: 'sparkle', speckles: true, aura: '#fff3a8', cheek: '#ff9fe0', ink: '#fff1c9' },
  bunbun: { body: '#ffd6b5', shade: '#eea277', belly: '#fff1e4', line: '#b36a43', r: 31, w: 0.95, h: 1, ears: 'bunny', tail: 'puff', cheek: '#ff8e9f' },
  chonk: { body: '#ffd96e', shade: '#e3a534', belly: '#fff4cc', line: '#a26f16', r: 34, w: 1.36, h: 0.84, ears: 'cat', cheek: '#ff9a7a' },
  sprout: { body: '#b2eac3', shade: '#6cbd87', belly: '#e8f9ec', line: '#3a855a', r: 32, w: 1, h: 1, top: 'leaf', cheek: '#ff9fb0' },
  gloom: { body: '#8d7bbd', shade: '#5b4b8a', belly: '#bcb0dc', line: '#372b5b', r: 32, w: 1, h: 1.05, top: 'horn', eyes: 'sleepy', cheek: '#c78ad3' },
  prism: { body: 'rainbow', shade: '#b79cf0', belly: '#ffffff', line: '#7a5cb8', r: 32, w: 1.05, h: 0.95, ears: 'cat', eyes: 'sparkle', aura: '#ffd1f5', cheek: '#ff8fd0' },
};

// ------------------------------------------------------------------ helpers

function shiftHex(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(v => Math.max(0, Math.min(255, Math.round(v + amt))));
  return '#' + c.map(v => v.toString(16).padStart(2, '0')).join('');
}

function blobPoints(cx, cy, rx, ry, t, wob) {
  const pts = [];
  const N = 40;
  for (let i = 0; i < N; i++) {
    const a = (i / N) * TAU;
    const c = Math.cos(a), s = Math.sin(a);
    const w = 1 + wob * Math.sin(a * 3 + t * 5) + wob * 0.5 * Math.sin(a * 2 - t * 3.3);
    // flatter bottom (s > 0 is down), slightly boxy sides
    const x = Math.sign(c) * Math.pow(Math.abs(c), 0.88) * rx * w;
    const y = s > 0 ? Math.pow(s, 0.55) * ry : s * ry * w;
    pts.push([cx + x, cy + y]);
  }
  return pts;
}

function smoothPath(ctx, pts) {
  const n = pts.length;
  ctx.beginPath();
  const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  let m = mid(pts[n - 1], pts[0]);
  ctx.moveTo(m[0], m[1]);
  for (let i = 0; i < n; i++) {
    const p = pts[i], q = pts[(i + 1) % n];
    m = mid(p, q);
    ctx.quadraticCurveTo(p[0], p[1], m[0], m[1]);
  }
  ctx.closePath();
}

function ellipse(ctx, x, y, rx, ry, rot = 0) {
  ctx.beginPath();
  ctx.ellipse(x, y, Math.max(0.01, rx), Math.max(0.01, ry), rot, 0, TAU);
}

export function star(ctx, x, y, r, points = 5, inner = 0.45, rot = -Math.PI / 2) {
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const rr = i % 2 ? r * inner : r;
    const a = rot + (i / (points * 2)) * TAU;
    const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr;
    i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
  }
  ctx.closePath();
}

export function heart(ctx, x, y, s) {
  ctx.beginPath();
  ctx.moveTo(x, y + s * 0.35);
  ctx.bezierCurveTo(x - s * 0.1, y + s * 0.2, x - s * 0.6, y, x - s * 0.5, y - s * 0.3);
  ctx.bezierCurveTo(x - s * 0.42, y - s * 0.55, x - s * 0.08, y - s * 0.55, x, y - s * 0.25);
  ctx.bezierCurveTo(x + s * 0.08, y - s * 0.55, x + s * 0.42, y - s * 0.55, x + s * 0.5, y - s * 0.3);
  ctx.bezierCurveTo(x + s * 0.6, y, x + s * 0.1, y + s * 0.2, x, y + s * 0.35);
  ctx.closePath();
}

function bodyFill(ctx, L, cx, cy, rx, ry, t) {
  if (L.body === 'rainbow') {
    const g = ctx.createLinearGradient(cx - rx, cy - ry, cx + rx, cy + ry);
    for (let i = 0; i <= 5; i++) {
      const hue = (t * 40 + i * 60) % 360;
      g.addColorStop(i / 5, `hsl(${hue}, 90%, 85%)`);
    }
    return g;
  }
  const g = ctx.createRadialGradient(cx - rx * 0.35, cy - ry * 0.45, rx * 0.1, cx, cy, rx * 1.25);
  g.addColorStop(0, shiftHex(L.body, 22));
  g.addColorStop(0.55, L.body);
  g.addColorStop(1, L.shade);
  return g;
}

// ------------------------------------------------------------------ main

/**
 * pose: { x, y (ground point), t, sx, sy (squash), tilt, lookX, lookY, blink,
 *   expr, mouth, facing, weight, hat, walk (phase), wave, alpha, flash, tears,
 *   scale }
 */
export function drawCreature(ctx, form, pose) {
  const L = LOOKS[form];
  if (!L) return;
  const p = { sx: 1, sy: 1, tilt: 0, lookX: 0, lookY: 0, blink: 0, expr: 'normal', mouth: 'smile', weight: 10, walk: 0, wave: 0, alpha: 1, flash: 0, scale: 1, t: 0, hat: 'none', ...pose };
  const t = p.t;
  const fat = Math.max(0.85, Math.min(1.3, 1 + (p.weight - 10) * 0.012));
  const R = L.r * p.scale;
  const rx = R * L.w * fat * p.sx;
  const ry = R * L.h * p.sy;
  const cx = 0, cy = -ry; // local coords: origin at ground point
  const lw = Math.max(1.5, R * 0.075);

  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(p.tilt);
  ctx.globalAlpha *= p.alpha;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  // aura
  if (L.aura && p.expr !== 'dead') {
    for (let i = 0; i < 5; i++) {
      const a = t * 0.8 + (i / 5) * TAU;
      const d = rx * 1.45 + Math.sin(t * 2 + i) * 4;
      ctx.fillStyle = L.aura;
      ctx.globalAlpha = p.alpha * (0.45 + 0.35 * Math.sin(t * 3 + i * 2));
      star(ctx, cx + Math.cos(a) * d, cy + Math.sin(a) * d * 0.8, R * 0.12, 4, 0.4);
      ctx.fill();
    }
    ctx.globalAlpha = p.alpha;
  }

  // tail
  if (L.tail === 'puff') {
    const tx = cx - p.facing * rx * 0.95, ty = cy + ry * 0.45;
    ctx.fillStyle = '#fff';
    ctx.strokeStyle = L.line;
    ctx.lineWidth = lw;
    ellipse(ctx, tx, ty, R * 0.24, R * 0.22);
    ctx.fill(); ctx.stroke();
  }

  // ears behind the body
  drawEars(ctx, L, cx, cy, rx, ry, R, lw, t, p);

  // feet
  const footY = -R * 0.04;
  for (const side of [-1, 1]) {
    const lift = p.walk ? Math.max(0, Math.sin(p.walk + (side > 0 ? Math.PI : 0))) * R * 0.18 : 0;
    ctx.fillStyle = L.shade;
    ctx.strokeStyle = L.line;
    ctx.lineWidth = lw;
    ellipse(ctx, cx + side * rx * 0.45, footY - lift, R * 0.26, R * 0.15);
    ctx.fill(); ctx.stroke();
  }

  // body
  const pts = blobPoints(cx, cy, rx, ry, t, p.expr === 'dead' ? 0 : 0.018);
  smoothPath(ctx, pts);
  ctx.fillStyle = bodyFill(ctx, L, cx, cy, rx, ry, t);
  ctx.fill();

  ctx.save();
  smoothPath(ctx, pts);
  ctx.clip();
  if (L.belly) {
    ctx.fillStyle = L.belly;
    ctx.globalAlpha = p.alpha * 0.85;
    ellipse(ctx, cx, cy + ry * 0.55, rx * 0.62, ry * 0.52);
    ctx.fill();
    ctx.globalAlpha = p.alpha;
  }
  if (L.speckles) {
    ctx.fillStyle = '#fff6c4';
    const sp = [[-0.55, -0.4], [0.5, -0.55], [0.7, 0.1], [-0.72, 0.15], [0.15, -0.8], [-0.25, -0.7], [0.35, 0.45]];
    sp.forEach(([a, b], i) => {
      ctx.globalAlpha = p.alpha * (0.55 + 0.45 * Math.sin(t * 2.5 + i * 1.7));
      star(ctx, cx + a * rx, cy + b * ry, R * (i % 2 ? 0.05 : 0.075), 4, 0.35);
      ctx.fill();
    });
    ctx.globalAlpha = p.alpha;
  }
  // rim shading + gloss
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ellipse(ctx, cx - rx * 0.42, cy - ry * 0.58, rx * 0.22, ry * 0.12, -0.5);
  ctx.fill();
  ctx.restore();

  smoothPath(ctx, pts);
  ctx.strokeStyle = L.line;
  ctx.lineWidth = lw;
  ctx.stroke();

  // arms
  for (const side of [-1, 1]) {
    const waving = p.wave && side === 1;
    const ang = waving ? -1.2 + Math.sin(t * 14) * 0.5 : 0.35 + Math.sin(t * 2 + side) * 0.08;
    ctx.save();
    ctx.translate(cx + side * rx * 0.92, cy + ry * 0.2);
    ctx.rotate(side * ang);
    ctx.fillStyle = L.body === 'rainbow' ? '#f6e3ff' : L.body;
    ctx.strokeStyle = L.line;
    ctx.lineWidth = lw;
    ellipse(ctx, side * R * 0.12, R * 0.08, R * 0.13, R * 0.2, 0);
    ctx.fill(); ctx.stroke();
    ctx.restore();
  }

  // top accessory
  drawTop(ctx, L, cx, cy, rx, ry, R, lw, t, p);

  // face
  drawFace(ctx, L, cx, cy, rx, ry, R, lw, t, p);

  // hat
  if (p.hat && p.hat !== 'none') drawHat(ctx, p.hat, cx, cy - ry * 0.92, R, lw, t, L);

  // evolution flash
  if (p.flash > 0) {
    const g = ctx.createRadialGradient(cx, cy, rx * 0.2, cx, cy, rx * 2);
    g.addColorStop(0, `rgba(255,250,220,${p.flash * 0.8})`);
    g.addColorStop(1, 'rgba(255,250,220,0)');
    ctx.fillStyle = g;
    ctx.fillRect(cx - rx * 2, cy - rx * 2, rx * 4, rx * 4);
    smoothPath(ctx, pts);
    ctx.fillStyle = `rgba(255,255,255,${p.flash})`;
    ctx.fill();
  }
  ctx.restore();
}

function drawEars(ctx, L, cx, cy, rx, ry, R, lw, t, p) {
  if (!L.ears) return;
  ctx.strokeStyle = L.line;
  ctx.lineWidth = lw;
  const fill = L.body === 'rainbow' ? '#f3d9ff' : L.body;
  for (const side of [-1, 1]) {
    ctx.save();
    if (L.ears === 'bunny') {
      const droop = p.expr === 'sad' || p.expr === 'sick' || p.expr === 'sleep' ? 0.9 : 0;
      const flop = Math.sin(t * 3 + side) * 0.08 + droop * side;
      ctx.translate(cx + side * rx * 0.38, cy - ry * 0.75);
      ctx.rotate(side * 0.18 + flop);
      ctx.fillStyle = fill;
      ellipse(ctx, 0, -R * 0.55, R * 0.2, R * 0.62);
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#ffb3c0';
      ellipse(ctx, 0, -R * 0.52, R * 0.1, R * 0.44);
      ctx.fill();
    } else if (L.ears === 'cat') {
      ctx.translate(cx + side * rx * 0.55, cy - ry * 0.72);
      ctx.rotate(side * 0.3);
      ctx.fillStyle = fill;
      ctx.beginPath();
      ctx.moveTo(-R * 0.22, R * 0.12);
      ctx.quadraticCurveTo(-R * 0.12, -R * 0.35, 0, -R * 0.38);
      ctx.quadraticCurveTo(R * 0.12, -R * 0.35, R * 0.22, R * 0.12);
      ctx.closePath();
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = L.cheek;
      ctx.globalAlpha *= 0.6;
      ctx.beginPath();
      ctx.moveTo(-R * 0.1, R * 0.05); ctx.lineTo(0, -R * 0.22); ctx.lineTo(R * 0.1, R * 0.05);
      ctx.closePath(); ctx.fill();
    } else if (L.ears === 'nub') {
      ctx.fillStyle = fill;
      ellipse(ctx, cx + side * rx * 0.62, cy - ry * 0.78, R * 0.18, R * 0.16);
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = L.cheek;
      ctx.globalAlpha *= 0.45;
      ellipse(ctx, cx + side * rx * 0.62, cy - ry * 0.8, R * 0.08, R * 0.07);
      ctx.fill();
    }
    ctx.restore();
  }
}

function drawTop(ctx, L, cx, cy, rx, ry, R, lw, t, p) {
  const topY = cy - ry * 0.96;
  ctx.strokeStyle = L.line;
  ctx.lineWidth = lw;
  if (L.top === 'tuft') {
    ctx.beginPath();
    ctx.moveTo(cx - R * 0.05, topY + 2);
    ctx.bezierCurveTo(cx - R * 0.1, topY - R * 0.4, cx + R * 0.35, topY - R * 0.45, cx + R * 0.2, topY - R * 0.2);
    ctx.stroke();
  } else if (L.top === 'spikes') {
    ctx.fillStyle = L.shade;
    ctx.beginPath();
    const w = R * 0.16;
    ctx.moveTo(cx - w * 3, topY + R * 0.12);
    for (let i = 0; i < 3; i++) {
      const x = cx - w * 2 + i * w * 2;
      ctx.lineTo(x, topY - R * (i === 1 ? 0.42 : 0.3));
      ctx.lineTo(x + w, topY + R * 0.06);
    }
    ctx.closePath();
    ctx.fill(); ctx.stroke();
  } else if (L.top === 'antenna') {
    const sway = Math.sin(t * 2.2) * R * 0.15;
    const tipX = cx + sway, tipY = topY - R * 0.55;
    ctx.beginPath();
    ctx.moveTo(cx, topY + 2);
    ctx.quadraticCurveTo(cx, topY - R * 0.3, tipX, tipY);
    ctx.stroke();
    const glow = ctx.createRadialGradient(tipX, tipY, 0, tipX, tipY, R * 0.5);
    glow.addColorStop(0, 'rgba(255,240,150,0.7)');
    glow.addColorStop(1, 'rgba(255,240,150,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(tipX - R * 0.5, tipY - R * 0.5, R, R);
    ctx.fillStyle = '#ffe66b';
    star(ctx, tipX, tipY, R * 0.2, 5, 0.45, -Math.PI / 2 + Math.sin(t) * 0.3);
    ctx.fill();
    ctx.strokeStyle = '#c99a1c';
    ctx.lineWidth = lw * 0.7;
    ctx.stroke();
  } else if (L.top === 'leaf') {
    const sway = Math.sin(t * 1.7) * 0.25;
    ctx.save();
    ctx.translate(cx, topY + 2);
    ctx.rotate(sway);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, -R * 0.3);
    ctx.stroke();
    for (const side of [-1, 1]) {
      ctx.save();
      ctx.translate(0, -R * 0.3);
      ctx.rotate(side * 0.7);
      ctx.fillStyle = side < 0 ? '#7ed492' : '#5fc27a';
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(side * R * 0.35, -R * 0.25, 0, -R * 0.5);
      ctx.quadraticCurveTo(-side * R * 0.08, -R * 0.25, 0, 0);
      ctx.fill(); ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
  } else if (L.top === 'horn') {
    ctx.fillStyle = '#e8ddff';
    ctx.beginPath();
    ctx.moveTo(cx + R * 0.02, topY + R * 0.12);
    ctx.quadraticCurveTo(cx + R * 0.05, topY - R * 0.35, cx + R * 0.32, topY - R * 0.48);
    ctx.quadraticCurveTo(cx + R * 0.22, topY - R * 0.12, cx + R * 0.3, topY + R * 0.14);
    ctx.closePath();
    ctx.fill(); ctx.stroke();
  }
}

function drawFace(ctx, L, cx, cy, rx, ry, R, lw, t, p) {
  const fx = cx + p.lookX * rx * 0.16;
  const fy = cy + ry * 0.02 + p.lookY * ry * 0.08;
  const big = L.eyes === 'big';
  const es = R * (big ? 0.2 : 0.16);
  const gap = rx * (big ? 0.36 : 0.34) / (L.w > 1.2 ? 1.1 : 1);
  const eyeY = fy - ry * 0.08;
  const ink = L.ink || '#2a2140';
  const expr = p.expr;

  // cheeks
  if (expr !== 'dead') {
    ctx.fillStyle = expr === 'sick' ? '#9fd39a' : L.cheek;
    ctx.globalAlpha = p.alpha * (expr === 'sick' ? 0.55 : 0.5);
    for (const side of [-1, 1]) {
      ellipse(ctx, fx + side * (gap + es * 0.9), eyeY + es * 1.35, es * 0.85, es * 0.5);
      ctx.fill();
    }
    ctx.globalAlpha = p.alpha;
  }

  ctx.strokeStyle = ink;
  ctx.fillStyle = ink;
  ctx.lineWidth = Math.max(1.6, R * 0.08);

  for (const side of [-1, 1]) {
    const ex = fx + side * gap;
    const ey = eyeY;
    ctx.save();
    if (expr === 'happy' || expr === 'eat') {
      ctx.beginPath();
      ctx.arc(ex, ey + es * 0.35, es * 0.75, Math.PI * 1.15, Math.PI * 1.85);
      ctx.stroke();
    } else if (expr === 'sleep') {
      ctx.beginPath();
      ctx.arc(ex, ey - es * 0.1, es * 0.7, Math.PI * 0.15, Math.PI * 0.85);
      ctx.stroke();
    } else if (expr === 'dead') {
      const d = es * 0.6;
      ctx.beginPath();
      ctx.moveTo(ex - d, ey - d); ctx.lineTo(ex + d, ey + d);
      ctx.moveTo(ex + d, ey - d); ctx.lineTo(ex - d, ey + d);
      ctx.stroke();
    } else if (expr === 'annoyed') {
      // >  <
      const d = es * 0.6;
      ctx.beginPath();
      ctx.moveTo(ex - side * d, ey - d);
      ctx.lineTo(ex + side * d * 0.4, ey);
      ctx.lineTo(ex - side * d, ey + d);
      ctx.stroke();
    } else if (expr === 'sick') {
      ctx.lineWidth *= 0.7;
      ctx.beginPath();
      for (let a = 0; a < TAU * 1.6; a += 0.3) {
        const rr = es * 0.12 + a * es * 0.08;
        const px = ex + Math.cos(a + t * 4 * side) * rr, py = ey + Math.sin(a + t * 4 * side) * rr;
        a ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
      }
      ctx.stroke();
    } else {
      // open eyes
      const surprised = expr === 'surprised';
      const open = Math.max(0.08, 1 - p.blink);
      const ew = es * (surprised ? 1.05 : 0.82);
      const eh = es * (surprised ? 1.25 : 1.08) * open;
      const px = ex + p.lookX * es * 0.18, py = ey + p.lookY * es * 0.18;
      if (L.eyes === 'sparkle') {
        const g = ctx.createLinearGradient(0, py - eh, 0, py + eh);
        g.addColorStop(0, '#20183f');
        g.addColorStop(1, '#6a4fd6');
        ctx.fillStyle = g;
      }
      if (L.ink) ctx.fillStyle = ctx.fillStyle === ink ? '#1a1238' : ctx.fillStyle;
      ellipse(ctx, px, py, ew, eh);
      ctx.fill();
      if (L.ink) { ctx.lineWidth = 1.4; ctx.stroke(); }
      if (open > 0.4) {
        ctx.fillStyle = '#fff';
        ellipse(ctx, px - ew * 0.32, py - eh * 0.38, ew * 0.38, eh * 0.3);
        ctx.fill();
        ellipse(ctx, px + ew * 0.35, py + eh * 0.4, ew * 0.16, ew * 0.16);
        ctx.fill();
        if (L.eyes === 'sparkle') {
          star(ctx, px + ew * 0.1, py + eh * 0.05, ew * 0.35, 4, 0.35);
          ctx.fill();
        }
      }
      if (L.eyes === 'sleepy' && !surprised) {
        // heavy lids
        ctx.fillStyle = L.body;
        ctx.beginPath();
        ctx.ellipse(px, py - eh * 0.25, ew * 1.3, eh * 0.8, 0, Math.PI, TAU);
        ctx.fill();
        ctx.strokeStyle = ink;
        ctx.beginPath();
        ctx.moveTo(px - ew * 1.05, py - eh * 0.2);
        ctx.lineTo(px + ew * 1.05, py - eh * 0.2);
        ctx.stroke();
      }
      ctx.fillStyle = ink;
    }
    ctx.restore();

    // brows
    const browMood = expr === 'sad' || expr === 'sick' ? 'sad' : expr === 'angry' || expr === 'annoyed' || L.brows === 'grumpy' && expr !== 'happy' && expr !== 'sleep' && expr !== 'eat' ? 'angry' : null;
    if (browMood && expr !== 'dead') {
      ctx.save();
      ctx.lineWidth = Math.max(1.4, R * 0.06);
      ctx.beginPath();
      const by = ey - es * 1.55;
      const inner = browMood === 'sad' ? -es * 0.45 : es * 0.35;
      ctx.moveTo(ex - side * es * 0.1, by + inner);
      ctx.lineTo(ex + side * es * 0.95, by - inner * 0.4);
      ctx.stroke();
      ctx.restore();
    }
  }

  // tears
  if (p.tears) {
    ctx.fillStyle = '#8fd3ff';
    for (const side of [-1, 1]) {
      const k = (t * 1.4 + (side > 0 ? 0.5 : 0)) % 1;
      const tx = fx + side * gap + side * es * 0.5;
      const ty = eyeY + es * 0.8 + k * R * 0.5;
      ctx.globalAlpha = p.alpha * (1 - k);
      ctx.beginPath();
      ctx.moveTo(tx, ty - es * 0.5);
      ctx.quadraticCurveTo(tx + es * 0.4, ty + es * 0.1, tx, ty + es * 0.3);
      ctx.quadraticCurveTo(tx - es * 0.4, ty + es * 0.1, tx, ty - es * 0.5);
      ctx.fill();
    }
    ctx.globalAlpha = p.alpha;
  }
  // sweat drop when sick
  if (expr === 'sick') {
    ctx.fillStyle = '#9ee0ff';
    ctx.strokeStyle = '#4a9cc9';
    ctx.lineWidth = 1.2;
    const sx = fx + rx * 0.7, sy = fy - ry * 0.45 + Math.sin(t * 3) * 1.5;
    ctx.beginPath();
    ctx.moveTo(sx, sy - R * 0.14);
    ctx.quadraticCurveTo(sx + R * 0.12, sy + R * 0.04, sx, sy + R * 0.08);
    ctx.quadraticCurveTo(sx - R * 0.12, sy + R * 0.04, sx, sy - R * 0.14);
    ctx.fill(); ctx.stroke();
  }

  // mouth
  const my = eyeY + es * 1.45;
  ctx.strokeStyle = ink;
  ctx.fillStyle = ink;
  ctx.lineWidth = Math.max(1.4, R * 0.06);
  const mw = es * 0.55;
  let mouth = p.mouth;
  if (expr === 'dead') mouth = 'flat';
  ctx.beginPath();
  switch (mouth) {
    case 'grin': {
      ctx.moveTo(fx - mw * 1.1, my - mw * 0.2);
      ctx.quadraticCurveTo(fx, my + mw * 2.2, fx + mw * 1.1, my - mw * 0.2);
      ctx.closePath();
      ctx.fillStyle = '#5b2338';
      ctx.fill();
      ctx.save();
      ctx.clip();
      ctx.fillStyle = '#ff7f9e';
      ellipse(ctx, fx, my + mw * 1.1, mw * 0.7, mw * 0.5);
      ctx.fill();
      ctx.restore();
      ctx.beginPath();
      ctx.moveTo(fx - mw * 1.1, my - mw * 0.2);
      ctx.quadraticCurveTo(fx, my + mw * 2.2, fx + mw * 1.1, my - mw * 0.2);
      ctx.closePath();
      ctx.stroke();
      break;
    }
    case 'open':
    case 'chew-open':
      ellipse(ctx, fx, my + mw * 0.3, mw * 0.55, mw * (mouth === 'open' ? 0.75 : 0.5));
      ctx.fillStyle = '#5b2338';
      ctx.fill();
      break;
    case 'o':
      ellipse(ctx, fx, my + mw * 0.3, mw * 0.35, mw * 0.4);
      ctx.fillStyle = '#5b2338';
      ctx.fill();
      break;
    case 'frown':
      ctx.arc(fx, my + mw * 1.1, mw * 0.8, Math.PI * 1.2, Math.PI * 1.8);
      ctx.stroke();
      break;
    case 'flat':
    case 'chew':
      ctx.moveTo(fx - mw * 0.6, my + mw * 0.2);
      ctx.lineTo(fx + mw * 0.6, my + mw * 0.2);
      ctx.stroke();
      break;
    case 'w':
      ctx.moveTo(fx - mw, my);
      ctx.quadraticCurveTo(fx - mw * 0.5, my + mw * 0.9, fx, my + mw * 0.1);
      ctx.quadraticCurveTo(fx + mw * 0.5, my + mw * 0.9, fx + mw, my);
      ctx.stroke();
      break;
    case 'wobbly':
      ctx.moveTo(fx - mw, my + mw * 0.3);
      for (let i = 1; i <= 4; i++) ctx.lineTo(fx - mw + (i * mw) / 2, my + mw * 0.3 + (i % 2 ? -1 : 1) * mw * 0.2);
      ctx.stroke();
      break;
    default: // smile
      ctx.arc(fx, my - mw * 0.2, mw * 0.8, Math.PI * 0.2, Math.PI * 0.8);
      ctx.stroke();
  }
}

// ------------------------------------------------------------------ hats

export function drawHat(ctx, hat, x, y, R, lw, t, L) {
  ctx.save();
  ctx.translate(x, y);
  ctx.lineWidth = lw;
  ctx.lineJoin = 'round';
  const line = '#3a2c55';
  ctx.strokeStyle = line;
  const s = R / 30;
  ctx.scale(s, s);
  switch (hat) {
    case 'bow': {
      ctx.translate(14, 4);
      ctx.rotate(0.3);
      ctx.fillStyle = '#ff7eb6';
      for (const side of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.bezierCurveTo(side * 14, -12, side * 16, 10, 0, 0);
        ctx.fill(); ctx.stroke();
      }
      ctx.fillStyle = '#ff5aa0';
      ellipse(ctx, 0, 0, 4, 4);
      ctx.fill(); ctx.stroke();
      break;
    }
    case 'party': {
      ctx.rotate(-0.15);
      ctx.beginPath();
      ctx.moveTo(-13, 4); ctx.lineTo(0, -30); ctx.lineTo(13, 4);
      ctx.closePath();
      ctx.fillStyle = '#7fd4ff';
      ctx.fill();
      ctx.save(); ctx.clip();
      ctx.fillStyle = '#ffec70';
      for (let i = -3; i < 4; i++) { ctx.beginPath(); ctx.moveTo(i * 8 - 10, 10); ctx.lineTo(i * 8 + 4, -32); ctx.lineTo(i * 8 + 8, -32); ctx.lineTo(i * 8 - 6, 10); ctx.fill(); }
      ctx.restore();
      ctx.beginPath();
      ctx.moveTo(-13, 4); ctx.lineTo(0, -30); ctx.lineTo(13, 4);
      ctx.closePath(); ctx.stroke();
      ctx.fillStyle = '#ff7eb6';
      ellipse(ctx, 0, -31, 5, 5);
      ctx.fill(); ctx.stroke();
      break;
    }
    case 'flower': {
      ctx.translate(-13, 2);
      ctx.rotate(Math.sin(t * 2) * 0.1);
      ctx.fillStyle = '#ffffff';
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * TAU;
        ellipse(ctx, Math.cos(a) * 7, Math.sin(a) * 7, 5, 3.4, a);
        ctx.fill(); ctx.stroke();
      }
      ctx.fillStyle = '#ffd23f';
      ellipse(ctx, 0, 0, 4.5, 4.5);
      ctx.fill(); ctx.stroke();
      break;
    }
    case 'beanie': {
      ctx.fillStyle = '#ff9f6b';
      ctx.beginPath();
      ctx.moveTo(-22, 8);
      ctx.bezierCurveTo(-22, -22, 22, -22, 22, 8);
      ctx.closePath();
      ctx.fill(); ctx.stroke();
      ctx.strokeStyle = 'rgba(58,44,85,0.35)';
      for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(i * 7, 2); ctx.lineTo(i * 6, -12); ctx.stroke(); }
      ctx.strokeStyle = line;
      ctx.fillStyle = '#ffd0a8';
      ctx.beginPath();
      ctx.roundRect(-24, 2, 48, 9, 4);
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#fff4e6';
      ellipse(ctx, 0, -18, 6, 6);
      ctx.fill(); ctx.stroke();
      break;
    }
    case 'crown': {
      ctx.fillStyle = '#ffd23f';
      ctx.beginPath();
      ctx.moveTo(-14, 4); ctx.lineTo(-16, -14); ctx.lineTo(-7, -6); ctx.lineTo(0, -18); ctx.lineTo(7, -6); ctx.lineTo(16, -14); ctx.lineTo(14, 4);
      ctx.closePath();
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#ff5a8a';
      ellipse(ctx, 0, -3, 3, 3); ctx.fill();
      ctx.fillStyle = '#6ad1ff';
      ellipse(ctx, -9, -1, 2.2, 2.2); ctx.fill();
      ellipse(ctx, 9, -1, 2.2, 2.2); ctx.fill();
      ctx.fillStyle = `rgba(255,255,255,${0.5 + 0.5 * Math.sin(t * 4)})`;
      star(ctx, 10, -14, 3, 4, 0.3); ctx.fill();
      break;
    }
    case 'wizard': {
      ctx.rotate(0.12);
      ctx.fillStyle = '#4a4fc4';
      ctx.beginPath();
      ctx.moveTo(-15, 4);
      ctx.quadraticCurveTo(-4, -20, 6, -40);
      ctx.quadraticCurveTo(10, -30, 15, 4);
      ctx.closePath();
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#ffe66b';
      star(ctx, 1, -12, 4.5, 5, 0.45); ctx.fill();
      star(ctx, 8, -24, 3, 5, 0.45); ctx.fill();
      ctx.fillStyle = '#6268de';
      ellipse(ctx, 0, 4, 24, 5);
      ctx.fill(); ctx.stroke();
      break;
    }
  }
  ctx.restore();
}

// ------------------------------------------------------------------ egg

export function drawEgg(ctx, x, y, t, progress, wobble = 0, alpha = 1) {
  const h = 50, w = 40;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(wobble);
  ctx.globalAlpha *= alpha;
  const path = () => {
    ctx.beginPath();
    ctx.moveTo(0, -h);
    ctx.bezierCurveTo(w * 0.3, -h, w * 0.52, -h * 0.62, w * 0.54, -h * 0.36);
    ctx.bezierCurveTo(w * 0.56, -h * 0.08, w * 0.34, 0, 0, 0);
    ctx.bezierCurveTo(-w * 0.34, 0, -w * 0.56, -h * 0.08, -w * 0.54, -h * 0.36);
    ctx.bezierCurveTo(-w * 0.52, -h * 0.62, -w * 0.3, -h, 0, -h);
    ctx.closePath();
  };
  // glow
  const glow = ctx.createRadialGradient(0, -h * 0.5, 5, 0, -h * 0.5, h * 1.1);
  glow.addColorStop(0, `rgba(255,240,190,${0.35 + 0.15 * Math.sin(t * 2)})`);
  glow.addColorStop(1, 'rgba(255,240,190,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(-h * 1.2, -h * 1.7, h * 2.4, h * 2.4);

  path();
  const g = ctx.createRadialGradient(-w * 0.2, -h * 0.7, 3, 0, -h * 0.4, h);
  g.addColorStop(0, '#fffdf6');
  g.addColorStop(0.6, '#fbefd6');
  g.addColorStop(1, '#e7cfa6');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.save();
  ctx.clip();
  // crescent emblem
  ctx.fillStyle = '#b9a6f0';
  ctx.beginPath();
  ctx.arc(0, -h * 0.5, 9, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#fbefd6';
  ctx.beginPath();
  ctx.arc(4, -h * 0.55, 8, 0, TAU);
  ctx.fill();
  // spots
  ctx.fillStyle = '#d7c9fb';
  [[-12, -30, 4], [13, -18, 3.5], [-9, -12, 2.5], [10, -36, 2.5], [-4, -40, 2]].forEach(([a, b, r]) => { ellipse(ctx, a, b, r, r); ctx.fill(); });
  // band
  ctx.strokeStyle = '#e5b8d5';
  ctx.lineWidth = 3;
  ctx.beginPath();
  for (let i = -20; i <= 20; i += 2) ctx.lineTo(i, -h * 0.2 + Math.sin(i * 0.5) * 2);
  ctx.stroke();
  ctx.restore();

  path();
  ctx.strokeStyle = '#9b7d5a';
  ctx.lineWidth = 2.2;
  ctx.stroke();

  // cracks
  if (progress > 0.55) {
    const k = Math.min(1, (progress - 0.55) / 0.4);
    ctx.strokeStyle = '#6e5238';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    const pts = [[-14, -30], [-8, -25], [-4, -31], [1, -24], [6, -30], [11, -25], [15, -29]];
    const n = Math.max(2, Math.floor(pts.length * k));
    pts.slice(0, n).forEach(([a, b], i) => (i ? ctx.lineTo(a, b) : ctx.moveTo(a, b)));
    ctx.stroke();
  }
  ctx.restore();
}

// ------------------------------------------------------------------ poop

export function drawPoop(ctx, x, y, t, scale = 1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.strokeStyle = '#5a3a22';
  ctx.lineWidth = 1.6;
  const tiers = [[0, -4, 11, 5], [0, -10, 8, 4.2], [1, -15.5, 5, 3.4]];
  for (const [a, b, rx, ry] of tiers) {
    const g = ctx.createLinearGradient(0, b - ry, 0, b + ry);
    g.addColorStop(0, '#b27b4c');
    g.addColorStop(1, '#8a5a34');
    ctx.fillStyle = g;
    ellipse(ctx, a, b, rx, ry);
    ctx.fill(); ctx.stroke();
  }
  ctx.beginPath();
  ctx.moveTo(2, -19); ctx.quadraticCurveTo(5, -23, 2, -25);
  ctx.stroke();
  // shine
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ellipse(ctx, -4, -11, 2.2, 1.2, -0.3); ctx.fill();
  // stink lines
  ctx.strokeStyle = 'rgba(140,170,90,0.75)';
  ctx.lineWidth = 1.5;
  for (let i = -1; i <= 1; i++) {
    const k = (t * 0.6 + i * 0.33 + 1) % 1;
    ctx.globalAlpha = Math.sin(k * Math.PI);
    ctx.beginPath();
    for (let j = 0; j < 8; j++) {
      const px = i * 8 + Math.sin(j * 1.2 + t * 4) * 2.2;
      const py = -22 - k * 14 - j * 1.8;
      j ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
    }
    ctx.stroke();
  }
  ctx.restore();
}

// ------------------------------------------------------------------ gravestone / memorial

export function drawGrave(ctx, x, y, name) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = '#c9c3d9';
  ctx.strokeStyle = '#6d6385';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-24, 0);
  ctx.lineTo(-24, -34);
  ctx.arc(0, -34, 24, Math.PI, 0);
  ctx.lineTo(24, 0);
  ctx.closePath();
  ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#6d6385';
  ctx.font = '600 9px Fredoka, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(name.slice(0, 9), 0, -30);
  ctx.fillText('♡', 0, -16);
  ctx.fillStyle = '#9ad48f';
  for (let i = -3; i <= 3; i++) {
    ctx.beginPath();
    ctx.moveTo(i * 8 - 2, 1); ctx.lineTo(i * 8, -5 - (i % 2 ? 2 : 0)); ctx.lineTo(i * 8 + 2, 1);
    ctx.fill();
  }
  ctx.restore();
}
