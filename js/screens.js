// Menus and dialogs. `app` is the controller API from main.js.

import { FOODS, FORMS, FORM_ORDER, HATS, WALLPAPERS, NAMES } from './config.js';
import { avgCare } from './sim.js';
import { GAMES } from './minigames.js';
import { drawFood } from './fx.js';
import { drawCreature } from './creature.js';
import { openPanel, closePanel, modal, thumb, escapeHtml, formatAge, toast } from './ui.js';
import { audio } from './audio.js';

const coin = '<span class="coin"></span>';
const price = c => c ? `<span class="price">${coin}${c}</span>` : '<span class="price free">free</span>';

function iconCanvas(el, draw) {
  const dpr = Math.min(2, devicePixelRatio || 1);
  el.width = 38 * dpr; el.height = 38 * dpr; // drawn at 38, displayed at 34 via CSS
  const ctx = el.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  draw(ctx);
}

// ------------------------------------------------------------------ feed

export function feedMenu(app) {
  const { meta } = app.game;
  const items = Object.entries(FOODS).map(([id, f]) => `
    <button class="menu-item" data-pick="${id}" ${meta.coins < f.cost ? 'disabled' : ''}>
      <canvas data-food="${id}"></canvas>
      <span>${f.name}${f.kind === 'snack' ? '<span class="tag">snack</span>' : ''}<small>${f.desc}</small></span>
      ${price(f.cost)}
    </button>`).join('');
  const panel = openPanel('Feed', `<div class="menu-list">${items}</div>`, id => { closePanel(); app.feed(id); });
  panel.querySelectorAll('canvas[data-food]').forEach(c => iconCanvas(c, ctx => drawFood(ctx, c.dataset.food, 19, 20, 1.35)));
}

// ------------------------------------------------------------------ play

export function playMenu(app) {
  const { meta, pet } = app.game;
  const items = Object.entries(GAMES).map(([id, g]) => `
    <button class="menu-item" data-pick="${id}">
      <canvas data-game="${id}"></canvas>
      <span>${g.name}<small>${g.desc}</small></span>
      <span class="price" style="color:#7a6aa8">best ${meta.best[id] || 0}</span>
    </button>`).join('');
  const panel = openPanel('Play a game', `<div class="menu-list">${items}</div>`, id => { closePanel(); app.startGame(id); });
  panel.querySelectorAll('canvas[data-game]').forEach(c => iconCanvas(c, ctx => {
    const id = c.dataset.game;
    ctx.fillStyle = id === 'guess' ? '#ffe3f0' : '#2d2f78';
    ctx.beginPath(); ctx.roundRect(0, 0, 38, 38, 10); ctx.fill();
    drawCreature(ctx, pet.form, { x: 19, y: 34, t: 1, scale: 0.5, expr: 'happy', mouth: 'grin', facing: 1, lookX: id === 'guess' ? 1 : 0 });
    ctx.fillStyle = '#ffe066';
    if (id === 'catch') { ctx.font = '12px sans-serif'; ctx.fillText('★', 6, 12); ctx.fillText('★', 25, 9); }
    if (id === 'hop') { ctx.fillStyle = '#8c84b8'; ctx.beginPath(); ctx.arc(33, 36, 6, Math.PI, 0); ctx.fill(); }
  }));
}

// ------------------------------------------------------------------ journal

export function journal(app, tab = 'moonlings') {
  modal((card, close) => {
    const { meta, pet } = app.game;
    const tabs = [['moonlings', 'Moonlings'], ['memories', 'Memories'], ['stats', 'Stats']];
    card.innerHTML = `
      <h2>Journal</h2>
      <div class="tabs">${tabs.map(([k, l]) => `<button data-tab="${k}" class="${k === tab ? 'on' : ''}">${l}</button>`).join('')}</div>
      <div id="jbody"></div>
      <div class="row"><button class="btn" data-close>Close</button></div>`;
    const body = card.querySelector('#jbody');

    const render = () => {
      card.querySelectorAll('[data-tab]').forEach(b => b.classList.toggle('on', b.dataset.tab === tab));
      if (tab === 'moonlings') {
        const found = FORM_ORDER.filter(f => meta.discovered.includes(f)).length;
        body.innerHTML = `<p class="center">Discovered <b>${found}</b> of ${FORM_ORDER.length} forms</p>
          <div class="grid">${FORM_ORDER.map(f => {
            const known = meta.discovered.includes(f);
            const cur = pet.form === f && !pet.dead && !pet.ascended;
            return `<div class="tile ${known ? '' : 'locked'} ${cur ? 'current' : ''}" title="${escapeHtml(known ? (FORMS[f].lore || FORMS[f].hint) : FORMS[f].hint)}">
              <canvas data-form="${f}" data-known="${known}"></canvas>
              ${known ? FORMS[f].name : '???'}
              <small>${known ? (FORMS[f].lore || FORMS[f].hint) : 'Hint: ' + FORMS[f].hint}</small></div>`;
          }).join('')}</div>`;
        body.querySelectorAll('canvas[data-form]').forEach(c => thumb(c, c.dataset.form, { silhouette: c.dataset.known !== 'true', scale: 0.95 }));
      } else if (tab === 'memories') {
        body.innerHTML = meta.memorial.length ? `<div class="memorial">${meta.memorial.map((m, i) => `
          <div class="mem"><canvas data-i="${i}"></canvas><div><b>${escapeHtml(m.name)}</b> · ${FORMS[m.form]?.name || m.form}
          <small>Generation ${m.generation} · lived ${formatAge(m.age)} · ${m.cause === 'moon' ? 'returned to the moon ☾' : 'passed away (' + m.cause + ')'}</small></div></div>`).join('')}</div>`
          : '<div class="empty">No memories yet.<br>Every moonling you raise will be remembered here.</div>';
        body.querySelectorAll('canvas[data-i]').forEach(c => { const m = meta.memorial[+c.dataset.i]; thumb(c, m.form, { scale: 0.55, expr: m.cause === 'moon' ? 'happy' : 'sleep', mouth: 'smile', hat: m.hat }); });
      } else {
        const stats = [
          ['Name', escapeHtml(pet.name)], ['Form', FORMS[pet.form].name],
          ['Age', formatAge(pet.age)], ['Generation', pet.generation],
          ['Weight', `${pet.weight} g`], ['Care score', pet.stage === 'egg' ? '—' : Math.round(avgCare(pet)) + '%'],
          ['Care mistakes', pet.totalMistakes], ['Coins', meta.coins],
          ['Best Star Catch', meta.best.catch || 0], ['Best Moon Hop', meta.best.hop || 0],
        ];
        body.innerHTML = `<div class="stats">${stats.map(([k, v]) => `<div class="stat"><span>${k}</span><b>${v}</b></div>`).join('')}</div>
          <p class="center" style="font-size:13px;margin-top:12px">Care score this stage shapes what your moonling grows into.</p>`;
      }
    };
    card.onclick = e => {
      const t = e.target.closest('[data-tab]');
      if (t) { tab = t.dataset.tab; audio.play('blip'); render(); }
      if (e.target.closest('[data-close]')) close();
    };
    render();
  });
}

// ------------------------------------------------------------------ shop

export function shop(app, tab = 'hats') {
  modal((card, close) => {
    const { meta, pet } = app.game;
    card.innerHTML = `
      <h2>Moon Shop</h2>
      <p style="display:flex;align-items:center;gap:6px">You have ${coin}<b id="shop-coins">${meta.coins}</b> coins. Earn more by playing games!</p>
      <div class="tabs"><button data-tab="hats">Hats</button><button data-tab="walls">Wallpaper</button></div>
      <div id="sbody"></div>
      <div class="row"><button class="btn" data-close>Done</button></div>`;
    const body = card.querySelector('#sbody');
    const render = () => {
      card.querySelector('#shop-coins').textContent = meta.coins;
      card.querySelectorAll('[data-tab]').forEach(b => b.classList.toggle('on', b.dataset.tab === tab));
      const isHats = tab === 'hats';
      const table = isHats ? HATS : WALLPAPERS;
      const owned = isHats ? meta.hats : meta.wallpapers;
      const active = isHats ? meta.hat : meta.wallpaper;
      body.innerHTML = `<div class="grid">${Object.entries(table).map(([id, it]) => {
        const has = owned.includes(id);
        const on = active === id;
        const btn = on ? `<button class="btn small" disabled>${isHats ? 'Wearing' : 'Using'}</button>`
          : has ? `<button class="btn small primary" data-use="${id}">${isHats ? 'Wear' : 'Use'}</button>`
          : `<button class="btn small" data-buy="${id}" ${meta.coins < it.cost ? 'disabled' : ''}>${coin.replace('coin"', 'coin" style="display:inline-block;width:12px;height:12px;vertical-align:-1px"')} ${it.cost}</button>`;
        return `<div class="tile ${on ? 'current' : ''}"><canvas data-item="${id}"></canvas>${it.name}${btn}</div>`;
      }).join('')}</div>`;
      body.querySelectorAll('canvas[data-item]').forEach(c => {
        if (isHats) thumb(c, pet.stage === 'egg' ? 'pip' : pet.form, { hat: c.dataset.item, scale: 0.8 });
        else wallThumb(c, c.dataset.item);
      });
    };
    card.onclick = e => {
      const tb = e.target.closest('[data-tab]');
      if (tb) { tab = tb.dataset.tab; audio.play('blip'); render(); return; }
      const buy = e.target.closest('[data-buy]');
      if (buy) {
        const id = buy.dataset.buy;
        const isHats = tab === 'hats';
        const it = (isHats ? HATS : WALLPAPERS)[id];
        if (meta.coins >= it.cost) {
          meta.coins -= it.cost;
          (isHats ? meta.hats : meta.wallpapers).push(id);
          if (isHats) meta.hat = id; else meta.wallpaper = id;
          audio.play('coin');
          app.save();
          render();
        }
        return;
      }
      const use = e.target.closest('[data-use]');
      if (use) {
        if (tab === 'hats') meta.hat = use.dataset.use; else meta.wallpaper = use.dataset.use;
        audio.play('select');
        app.save();
        render();
        return;
      }
      if (e.target.closest('[data-close]')) close();
    };
    render();
  });
}

function wallThumb(c, id) {
  const dpr = Math.min(2, devicePixelRatio || 1);
  const w = c.clientWidth || 80, h = c.clientHeight || 70;
  c.width = w * dpr; c.height = h * dpr;
  const ctx = c.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const col = { lilac: ['#f1e8ff', '#e3d5ff'], mint: ['#e5f8ee', '#c4ecd6'], peach: ['#fff0e6', '#ffd0bb'], night: ['#34377a', '#ffe8a0'] }[id];
  ctx.fillStyle = col[0];
  ctx.beginPath(); ctx.roundRect(4, 4, w - 8, h - 8, 10); ctx.fill();
  ctx.fillStyle = col[1];
  for (let y = 12; y < h - 8; y += 12) for (let x = 12; x < w - 8; x += 12) { ctx.beginPath(); ctx.arc(x + (y % 24 ? 6 : 0), y, id === 'night' ? 1.2 : 2.2, 0, Math.PI * 2); ctx.fill(); }
  ctx.fillStyle = '#e2c29a';
  ctx.fillRect(4, h - 22, w - 8, 14);
}

// ------------------------------------------------------------------ settings

export function settings(app) {
  modal((card, close) => {
    const p = app.prefs;
    const render = () => {
      card.innerHTML = `
        <h2>Settings</h2>
        <div class="setting"><div>Sound effects</div><button class="toggle ${p.sfx ? 'on' : ''}" data-t="sfx" aria-label="Sound effects"></button></div>
        <div class="setting"><div>Music box<small>A gentle generative lullaby</small></div><button class="toggle ${p.music ? 'on' : ''}" data-t="music" aria-label="Music"></button></div>
        <div class="setting"><div>Time flow<small>Speed up life if you're impatient</small></div>
          <div class="seg">${[1, 2, 5, 20].map(s => `<button data-speed="${s}" class="${p.speed === s ? 'on' : ''}">${s}×</button>`).join('')}</div></div>
        <div class="setting"><div>Rename your moonling</div><button class="btn small" data-act="rename">Rename</button></div>
        <div class="setting"><div>Send back to the moon<small>Say goodbye and start a new egg</small></div><button class="btn small danger" data-act="release">Release</button></div>
        <div class="setting" style="border:none"><div>Erase everything<small>Journal, coins and all</small></div><button class="btn small danger" data-act="wipe">Erase</button></div>
        <p style="font-size:12px;text-align:center;margin-top:12px">Keys: 1–5 actions · J journal · S shop · Esc close</p>
        <div class="row"><button class="btn primary" data-close>Done</button></div>`;
    };
    card.onclick = async e => {
      const t = e.target.closest('[data-t]');
      if (t) { p[t.dataset.t] = !p[t.dataset.t]; app.applyPrefs(); audio.play('blip'); render(); return; }
      const sp = e.target.closest('[data-speed]');
      if (sp) { p.speed = +sp.dataset.speed; app.applyPrefs(); audio.play('blip'); render(); return; }
      const a = e.target.closest('[data-act]');
      if (a) {
        const act = a.dataset.act;
        close();
        if (act === 'rename') nameDialog(app, false);
        if (act === 'release') {
          const ok = await confirmDialog('Release your moonling?', `${escapeHtml(app.game.pet.name)} will float back to the moon, and a new egg will arrive.`, 'Release');
          if (ok) app.release();
        }
        if (act === 'wipe') {
          const ok = await confirmDialog('Erase everything?', 'Your moonling, journal, coins and shop items will be gone forever.', 'Erase all');
          if (ok) app.wipe();
        }
        return;
      }
      if (e.target.closest('[data-close]')) close();
    };
    render();
  });
}

export function confirmDialog(title, text, yes = 'Yes') {
  return modal((card, close) => {
    card.innerHTML = `<h2>${title}</h2><p>${text}</p><div class="row"><button class="btn" data-v="0">Cancel</button><button class="btn danger" data-v="1">${yes}</button></div>`;
    card.onclick = e => { const b = e.target.closest('[data-v]'); if (b) close(b.dataset.v === '1'); };
  });
}

// ------------------------------------------------------------------ naming

export function nameDialog(app, fresh = true) {
  return modal((card, close) => {
    const pet = app.game.pet;
    card.innerHTML = `
      <div class="center">
        <canvas class="hero"></canvas>
        <h2>${fresh ? 'It hatched!' : 'A new name?'}</h2>
        <p>${fresh ? 'A tiny moonling blinks up at you. What will you call it?' : 'What should your moonling be called?'}</p>
        <div style="display:flex;gap:8px;align-items:center"><input class="name" maxlength="14" value="${escapeHtml(pet.name)}" aria-label="Name">
        <button class="btn" data-dice title="Random name" style="margin-top:10px">🎲</button></div>
        <div class="row"><button class="btn primary" data-ok>${fresh ? 'Welcome home!' : 'Save'}</button></div>
      </div>`;
    thumb(card.querySelector('canvas'), pet.form, { expr: 'happy', mouth: 'grin', scale: 1.5, hat: app.game.meta.hat });
    const input = card.querySelector('input');
    setTimeout(() => { input.focus(); input.select(); }, 50);
    const ok = () => { app.rename(input.value.trim() || pet.name); audio.play('happy'); close(); };
    card.onclick = e => {
      if (e.target.closest('[data-dice]')) { input.value = NAMES[Math.floor(Math.random() * NAMES.length)]; audio.play('blip'); }
      if (e.target.closest('[data-ok]')) ok();
    };
    input.onkeydown = e => { if (e.key === 'Enter') ok(); e.stopPropagation(); };
  }, { dismissable: !fresh });
}

// ------------------------------------------------------------------ story dialogs

export function introDialog() {
  return modal((card, close) => {
    card.innerHTML = `
      <div class="center">
        <canvas class="hero"></canvas>
        <h2>A moon egg fell into your room!</h2>
        <p>Moonlings are tiny creatures from the moon. Feed it, play with it, keep it clean and tuck it in when it's sleepy.</p>
        <p>How you care for it decides what it grows into. Can you discover all ${FORM_ORDER.length} forms?</p>
        <div class="row"><button class="btn primary" data-ok>Let's go!</button></div>
      </div>`;
    thumb(card.querySelector('canvas'), 'egg', { scale: 1.6 });
    card.onclick = e => { if (e.target.closest('[data-ok]')) close(); };
  }, { dismissable: false });
}

export function evolveDialog(app, from, to, isNew) {
  return modal((card, close) => {
    const f = FORMS[to];
    card.innerHTML = `
      <div class="center">
        <canvas class="hero"></canvas>
        <h2>${escapeHtml(app.game.pet.name)} grew into a ${f.name}!</h2>
        <p>${f.lore}</p>
        ${isNew ? '<p><b style="color:#ff6f9f">✦ New journal entry! ✦</b></p>' : ''}
        <div class="row"><button class="btn primary" data-ok>Yay!</button></div>
      </div>`;
    thumb(card.querySelector('canvas'), to, { expr: 'happy', mouth: 'grin', scale: 1.4, hat: app.game.meta.hat });
    card.onclick = e => { if (e.target.closest('[data-ok]')) close(); };
  });
}

export function farewellDialog(app) {
  const pet = app.game.pet;
  const moon = pet.ascended;
  const text = moon
    ? pet.released ? `${escapeHtml(pet.name)} floated back up to the moon. It will be remembered in your journal.`
    : `${escapeHtml(pet.name)} lived a long, happy life and floated back up to the moon. It left you 50 coins as a thank-you.`
    : { hunger: `${escapeHtml(pet.name)} was too hungry for too long…`, illness: `${escapeHtml(pet.name)} was very sick and didn't get medicine in time…`, neglect: `${escapeHtml(pet.name)} felt lonely and forgotten…` }[pet.cause] + ' It will be remembered in your journal.';
  return modal((card, close) => {
    card.innerHTML = `
      <div class="center">
        <canvas class="hero"></canvas>
        <h2>${moon ? 'Goodnight, ' + escapeHtml(pet.name) + ' ☾' : 'Farewell, ' + escapeHtml(pet.name)}</h2>
        <p>${text}</p>
        <p>Lived ${formatAge(pet.age)} · ${FORMS[pet.form].name}</p>
        <div class="row"><button class="btn primary" data-ok>A new egg arrives…</button></div>
      </div>`;
    thumb(card.querySelector('canvas'), pet.form, { expr: moon ? 'happy' : 'sleep', mouth: 'smile', scale: 1.3, hat: app.game.meta.hat });
    card.onclick = e => { if (e.target.closest('[data-ok]')) close(); };
  }, { dismissable: false });
}

export function awayDialog(app, seconds, events) {
  const pet = app.game.pet;
  const n = t => events.filter(e => e.type === t).length;
  const lines = [];
  const name = escapeHtml(pet.name);
  for (const e of events) {
    if (e.type === 'hatch') lines.push(`🥚 The egg hatched!`);
    if (e.type === 'evolve') lines.push(`✨ ${name} grew into a ${FORMS[e.to].name}!`);
  }
  if (n('poop')) lines.push(`💩 Made ${n('poop')} poop${n('poop') > 1 ? 's' : ''}`);
  if (n('sleep')) lines.push(`💤 Took ${n('sleep') > 1 ? 'some naps' : 'a nap'}`);
  if (n('sick')) lines.push(`🤒 Caught a cold`);
  if (n('mistake')) lines.push(`🥺 Felt a bit neglected`);
  if (pet.stats.hunger < 25) lines.push(`🍙 Is hungry now`);
  if (pet.ascended) lines.push(`☾ Returned to the moon`);
  if (!lines.length) lines.push('😌 Had a quiet time');
  return modal((card, close) => {
    card.innerHTML = `
      <div class="center">
        <canvas class="hero"></canvas>
        <h2>Welcome back!</h2>
        <p>You were away for ${formatAge(seconds)}. Meanwhile, ${name}…</p>
        <ul class="away-list">${lines.map(l => `<li>${l}</li>`).join('')}</ul>
        <div class="row"><button class="btn primary" data-ok>Hi, ${name}!</button></div>
      </div>`;
    thumb(card.querySelector('canvas'), pet.form, { expr: pet.form === 'egg' ? 'normal' : 'happy', mouth: 'grin', scale: 1.3, hat: app.game.meta.hat });
    card.onclick = e => { if (e.target.closest('[data-ok]')) close(); };
  });
}

export { toast };
