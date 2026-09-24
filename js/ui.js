// DOM helpers: icons, HUD, toasts, in-screen panels and a queued modal.

import { drawCreature, drawEgg } from './creature.js';

const $ = sel => document.querySelector(sel);

const S = (body, vb = '0 0 32 32') => `<svg viewBox="${vb}" fill="none" stroke="#3f2f6e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;

export const ICONS = {
  feed: S('<path d="M16 5c2 0 3 1 5 5l6 10c1.5 3 0 6-3 6H8c-3 0-4.5-3-3-6l6-10c2-4 3-5 5-5z" fill="#fff"/><rect x="11.5" y="18" width="9" height="8" rx="1" fill="#2f4a3a" stroke="none"/><path d="M12 10.5l1 1.2M19 10l-1 1.4" stroke-width="1.5"/>'),
  play: S('<circle cx="16" cy="16" r="11" fill="#fff"/><path d="M16 5c-3 4-3 18 0 22M5.5 13c5 2 16 2 21 0" stroke="#ff7eb0"/><path d="M8 23c5-3 11-3 16 0" stroke="#7fb8ff"/>'),
  clean: S('<circle cx="12" cy="18" r="7" fill="#e6f7ff"/><circle cx="21.5" cy="12" r="5" fill="#e6f7ff"/><circle cx="22" cy="23" r="3.5" fill="#e6f7ff"/><path d="M9 15.5a3 3 0 0 1 3-2.5M19.5 10a2 2 0 0 1 2-1.3" stroke="#fff" stroke-width="1.6"/>'),
  lights: S('<path d="M22 21.5A10 10 0 1 1 15 6a8 8 0 0 0 7 15.5z" fill="#fff6c8"/><path d="M24 6l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z" fill="#fff" stroke-width="1.3"/>'),
  lightsOn: S('<circle cx="16" cy="16" r="6" fill="#fff6a8"/><path d="M16 4v3M16 25v3M4 16h3M25 16h3M7.5 7.5l2 2M22.5 22.5l2 2M7.5 24.5l2-2M22.5 9.5l2-2"/>'),
  medicine: S('<rect x="4" y="11" width="24" height="10" rx="5" transform="rotate(-35 16 16)" fill="#fff"/><path d="M4 11h12v10H9a5 5 0 0 1-5-5z" transform="rotate(-35 16 16)" fill="#ff8fa8"/>'),
  journal: S('<path d="M6 6.5C6 5 7 4 8.5 4H25v21H8.5A2.5 2.5 0 0 0 6 27.5z" fill="#fff"/><path d="M6 27.5A2.5 2.5 0 0 1 8.5 25H25v3H8.5A2.5 2.5 0 0 1 6 27.5z" fill="#ffd6e7"/><path d="M15.5 11.5c1-2 4-1.5 4 .8 0 2-4 4.2-4 4.2s-4-2.2-4-4.2c0-2.3 3-2.8 4-.8z" fill="#ff8fb1" stroke-width="1.4"/>'),
  shop: S('<path d="M6 11h20l-1.6 15.2A2 2 0 0 1 22.4 28H9.6a2 2 0 0 1-2-1.8z" fill="#fff"/><path d="M11 13V9a5 5 0 0 1 10 0v4"/><path d="M16 17.5l1.2 2.4 2.6.3-1.9 1.8.5 2.6-2.4-1.3-2.4 1.3.5-2.6-1.9-1.8 2.6-.3z" fill="#ffd84a" stroke-width="1.2"/>'),
  settings: S('<circle cx="16" cy="16" r="4" fill="#fff"/><path d="M16 3.5l2 3 3.5-1 .6 3.6 3.4 1.2-1.6 3.2 1.6 3.2-3.4 1.2-.6 3.6-3.5-1-2 3-2-3-3.5 1-.6-3.6-3.4-1.2 1.6-3.2-1.6-3.2 3.4-1.2.6-3.6 3.5 1z" fill="#efe6ff"/><circle cx="16" cy="16" r="4" fill="#fff"/>'),
  hunger: S('<path d="M16 6c1.6 0 2.4.8 4 4l5 8.5c1.2 2.4 0 5-2.4 5H9.4C7 23.5 5.8 21 7 18.5l5-8.5c1.6-3.2 2.4-4 4-4z" fill="#fff"/><rect x="12.5" y="17" width="7" height="6.5" rx="1" fill="#2f4a3a" stroke="none"/>'),
  happy: S('<path d="M16 27s-10-6-10-13a5.5 5.5 0 0 1 10-3 5.5 5.5 0 0 1 10 3c0 7-10 13-10 13z" fill="#ff8fb1"/>'),
  energy: S('<path d="M18 3L7 18h8l-2 11 12-16h-8z" fill="#ffd84a"/>'),
  hygiene: S('<path d="M16 4l2.6 7.4L26 14l-7.4 2.6L16 24l-2.6-7.4L6 14l7.4-2.6z" fill="#8fd8ff"/><path d="M25 21l1 2.5 2.5 1-2.5 1-1 2.5-1-2.5-2.5-1 2.5-1z" fill="#c9efff" stroke-width="1.3"/>'),
  health: S('<rect x="5" y="5" width="22" height="22" rx="7" fill="#fff"/><path d="M16 10v12M10 16h12" stroke="#ff6f8f" stroke-width="3.5"/>'),
};

export const METER_COLORS = { hunger: '#ffb86b', happy: '#ff8fb1', energy: '#ffd84a', hygiene: '#7fd1ff', health: '#8ee6c0' };

export function initStatic() {
  document.querySelectorAll('.act').forEach(b => { b.querySelector('.ic').innerHTML = ICONS[b.dataset.act]; });
  document.querySelectorAll('.mini').forEach(b => { b.innerHTML = ICONS[b.dataset.open]; });
  document.querySelectorAll('.meter').forEach(m => {
    const k = m.dataset.stat;
    m.querySelector('i').innerHTML = ICONS[k];
    m.style.setProperty('--mc', METER_COLORS[k]);
    m.title = { hunger: 'Fullness', happy: 'Happiness', energy: 'Energy', hygiene: 'Cleanliness', health: 'Health' }[k];
  });
  const tw = $('#twinkles');
  for (let i = 0; i < 60; i++) {
    const s = document.createElement('span');
    s.style.left = Math.random() * 100 + '%';
    s.style.top = Math.random() * 100 + '%';
    s.style.setProperty('--d', 2 + Math.random() * 4 + 's');
    s.style.setProperty('--delay', -Math.random() * 5 + 's');
    const z = Math.random() < 0.2 ? 4 : 2;
    s.style.width = s.style.height = z + 'px';
    tw.appendChild(s);
  }
}

// ------------------------------------------------------------------ HUD

export function formatAge(sec) {
  sec = Math.floor(sec);
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}

let lastCoins = null;
export function updateHud(game, info) {
  const p = game.pet;
  const s = p.stats;
  document.querySelectorAll('.meter').forEach(m => {
    const k = m.dataset.stat;
    const v = p.stage === 'egg' ? 100 : s[k];
    m.querySelector('span').style.width = Math.max(3, v) + '%';
    m.classList.toggle('low', p.stage !== 'egg' && !p.dead && v < 22);
  });
  const nameEl = $('#pname');
  if (nameEl.dataset.name !== p.name) {
    nameEl.dataset.name = p.name;
    nameEl.innerHTML = `${escapeHtml(p.name)}<span class="edit" data-rename title="Rename">✎</span>`;
  }
  $('#pmeta').textContent = info.meta;
  if (lastCoins !== game.meta.coins) {
    const el = $('#coins');
    if (lastCoins !== null && game.meta.coins > lastCoins) { el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump'); }
    lastCoins = game.meta.coins;
    $('#coin-n').textContent = game.meta.coins;
  }
  const btn = a => document.querySelector(`.act[data-act="${a}"]`);
  const gone = p.dead || p.ascended;
  const egg = p.stage === 'egg';
  for (const a of ['feed', 'play', 'clean', 'medicine']) btn(a).disabled = gone || egg || info.busy;
  btn('lights').disabled = gone || info.busy;
  btn('lights').querySelector('.ic').innerHTML = p.lightsOn ? ICONS.lights : ICONS.lightsOn;
  btn('lights').querySelector('.lb').textContent = p.lightsOn ? 'Lights' : 'Lights on';
  btn('medicine').classList.toggle('alert', !!p.sick && !gone);
  btn('clean').classList.toggle('alert', p.poops.length >= 2 && !gone);
  btn('lights').classList.toggle('alert', p.sleeping && p.lightsOn && !gone);
  btn('feed').classList.toggle('alert', !egg && !gone && !p.sleeping && s.hunger < 20);
  btn('play').classList.toggle('alert', !egg && !gone && !p.sleeping && s.happy < 20);
}

export function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// ------------------------------------------------------------------ toast

let toastTimer;
export function toast(msg, ms = 2400) {
  const el = $('#toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), ms);
}

// ------------------------------------------------------------------ panel (inside the screen)

export function openPanel(title, bodyHtml, onClick) {
  const panel = $('#panel');
  panel.innerHTML = `<div class="panel-card"><div class="panel-title"><span>${title}</span><button class="x" data-close aria-label="Close">✕</button></div>${bodyHtml}</div>`;
  panel.classList.remove('hidden');
  panel.onclick = e => {
    if (e.target === panel || e.target.closest('[data-close]')) { closePanel(); return; }
    const item = e.target.closest('[data-pick]');
    if (item && !item.disabled) onClick(item.dataset.pick, item);
  };
  return panel;
}
export function closePanel() {
  const panel = $('#panel');
  panel.classList.add('hidden');
  panel.innerHTML = '';
}
export const panelOpen = () => !$('#panel').classList.contains('hidden');

// ------------------------------------------------------------------ modal (queued)

const queue = [];
let current = null;

/**
 * render(card, close) fills the card. Returns a promise resolved with the
 * value passed to close(). Modals queue up if one is already showing.
 */
export function modal(render, opts = {}) {
  return new Promise(resolve => {
    queue.push({ render, resolve, opts });
    if (!current) next();
  });
}

function next() {
  const m = queue.shift();
  const root = $('#modal');
  const card = $('#modal-card');
  if (!m) { current = null; root.classList.add('hidden'); card.innerHTML = ''; return; }
  current = m;
  card.innerHTML = '';
  root.classList.remove('hidden');
  card.style.animation = 'none'; void card.offsetWidth; card.style.animation = '';
  const close = v => {
    if (current !== m) return;
    m.resolve(v);
    next();
  };
  root.onclick = e => { if (e.target === root && m.opts.dismissable !== false) close(undefined); };
  m.close = close;
  m.render(card, close);
  const focus = card.querySelector('input, .btn.primary, button');
  if (focus) focus.focus({ preventScroll: true });
}

export const modalOpen = () => !!current;
export function closeModal() { if (current && current.opts.dismissable !== false) current.close(undefined); }

// ------------------------------------------------------------------ thumbnails

export function thumb(canvas, form, o = {}) {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const w = canvas.clientWidth || +canvas.getAttribute('width');
  const h = canvas.clientHeight || +canvas.getAttribute('height');
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const scale = o.scale ?? Math.min(w / 90, h / 80);
  if (form === 'egg') {
    ctx.translate(w / 2, h - 4);
    ctx.scale(scale * 0.9, scale * 0.9);
    drawEgg(ctx, 0, 0, o.t || 0, 0, 0);
  } else drawCreature(ctx, form, { x: w / 2, y: h - 5, t: o.t || 1, scale, expr: o.expr || 'happy', mouth: o.mouth || 'smile', hat: o.hat || 'none', facing: 1, weight: 10 });
  if (o.silhouette) {
    ctx.globalCompositeOperation = 'source-atop';
    ctx.fillStyle = '#c9bde6';
    ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#fff';
    ctx.font = `600 ${Math.round(h * 0.3)}px Fredoka, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('?', w / 2, h * 0.58);
  }
}
