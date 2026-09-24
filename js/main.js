// Controller: game loop, pet animation/behaviour, input, persistence.

import { CONFIG, FOODS, FORMS } from './config.js';
import * as sim from './sim.js';
import { drawCreature, drawEgg, drawPoop, drawGrave, LOOKS } from './creature.js';
import { drawRoom, drawDarkness, drawShadow, cloud, W, H, GROUND_Y, isNight } from './scene.js';
import { Particles, drawBubble, drawFood, CONFETTI } from './fx.js';
import { audio } from './audio.js';
import { createGame as createMinigame } from './minigames.js';
import * as ui from './ui.js';
import * as screens from './screens.js';

const SAVE_KEY = 'moonling.save.v1';
const PREFS_KEY = 'moonling.prefs.v1';
const rnd = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const pick = arr => arr[Math.floor(Math.random() * arr.length)];

// ------------------------------------------------------------------ state

let prefs = { sfx: true, music: true, speed: 1, ...safeParse(localStorage.getItem(PREFS_KEY)) };
let game = sim.deserialize(localStorage.getItem(SAVE_KEY) || '');
const firstRun = !game;
if (!game) game = sim.createGame();

const fx = new Particles();
let minigame = null;
let time = 0; // animation clock
let mouse = { x: W / 2, y: H / 2, t: -99 };
let darkness = game.pet.lightsOn ? 0 : 1;
let sweep = null; // cleaning wave
let vanishing = []; // poops being washed away
let farewellShown = false;

const actor = {
  x: W / 2, vx: 0, facing: 1, targetX: null, walk: 0,
  hop: 0, hopV: 0,
  sx: 1, sy: 1, tilt: 0,
  lookX: 0, lookY: 0, lookTX: 0, lookTY: 0,
  blink: 0, blinkT: 2,
  idleT: 1.5,
  anim: null,
  bubble: null,
  emote: null, // {expr, mouth, t}
  chatT: rnd(8, 16),
  callT: 0,
  eggWobble: 0,
};

function safeParse(s) { try { return JSON.parse(s) || {}; } catch { return {}; } }

// ------------------------------------------------------------------ canvas

const cv = document.getElementById('cv');
const ctx = cv.getContext('2d');
let scale = 1;
function resize() {
  const dpr = Math.min(3, window.devicePixelRatio || 1);
  const w = cv.clientWidth || W;
  cv.width = Math.round(w * dpr);
  cv.height = Math.round(w * dpr * H / W);
  scale = cv.width / W;
}
window.addEventListener('resize', resize);

// ------------------------------------------------------------------ helpers

const pet = () => game.pet;
const looks = () => LOOKS[pet().form] || LOOKS.pip;
const ROOM_SCALE = 1.2;
const petRadius = () => (looks().r || 24) * ROOM_SCALE;
const pitch = () => ({ egg: 1.4, baby: 1.35, child: 1.15, adult: 1 }[pet().stage] || 1);

function say(text, dur = 2.4) {
  actor.bubble = { text, t: 0, dur };
  if (!text.startsWith('icon:')) audio.voice(text, pitch());
}

function emote(expr, mouth, dur = 1) { actor.emote = { expr, mouth, t: dur }; }

function startAnim(type, dur, data = {}) {
  actor.anim = { type, t: 0, dur, ...data };
  actor.targetX = null;
}

let saveDisabled = false;
function save() {
  if (saveDisabled) return;
  try { localStorage.setItem(SAVE_KEY, sim.serialize(game)); } catch { /* storage full or blocked */ }
}
function savePrefs() { localStorage.setItem(PREFS_KEY, JSON.stringify(prefs)); }

function busy() {
  return !!minigame || (actor.anim && ['hatch', 'evolve', 'ascend'].includes(actor.anim.type));
}

// ------------------------------------------------------------------ actions

const app = {
  get game() { return game; },
  get prefs() { return prefs; },
  save,
  feed(id) {
    const r = sim.act(game, 'feed', id);
    if (!r.ok) {
      if (r.reason === 'full') {
        startAnim('refuse', 1.1);
        say(pick(['full!', 'no more…', 'too full!']));
        audio.play('annoyed', pitch());
      } else reasonToast(r.reason);
      return;
    }
    audio.play('eat');
    startAnim('eat', 2.1, { food: id });
    handleEvents(r.events.filter(e => e.type !== 'ate'));
    save();
  },
  startGame(id) {
    const ok = sim.act(game, 'canPlay');
    if (!ok.ok) return reasonToast(ok.reason);
    minigame = createMinigame(id, { form: pet().form, hat: game.meta.hat, weight: pet().weight, audio });
    ui.closePanel();
    audio.play('select');
  },
  rename(name) { sim.act(game, 'rename', name); save(); },
  applyPrefs() {
    audio.sfxOn = prefs.sfx;
    if (audio.ctx) audio.setMusic(prefs.music); else audio.musicOn = prefs.music;
    savePrefs();
  },
  release() {
    pet().ascended = true;
    pet().released = true;
    game.meta.memorial.unshift({ name: pet().name, form: pet().form, age: Math.round(pet().age), generation: pet().generation, cause: 'moon', hat: game.meta.hat });
    game.meta.memorial.length = Math.min(game.meta.memorial.length, 30);
    startAnim('ascend', 3.5);
    audio.play('sparkle');
    farewellShown = true; // skip the long-life dialog, go straight to a new egg
    setTimeout(() => { sim.newEgg(game); resetActor(); farewellShown = false; save(); }, 3600);
  },
  wipe() {
    localStorage.removeItem(SAVE_KEY);
    game = sim.createGame();
    resetActor();
    save();
    screens.introDialog();
  },
};

function reasonToast(reason) {
  const n = pet().name;
  const msg = {
    sleeping: `Shh… ${n} is sleeping 💤`,
    egg: `The egg can't do that yet — it's still warming up!`,
    coins: `Not enough moon coins. Play games to earn some!`,
    sick: `${n} is too sick to play. Try medicine!`,
    tired: `${n} is too tired to play. Maybe a nap?`,
    gone: `…`,
  }[reason] || `Can't do that right now`;
  ui.toast(msg);
  audio.play('error');
}

function doAction(a) {
  if (busy() || ui.modalOpen()) return;
  audio.play('blip');
  const p = pet();
  if (a === 'feed') {
    if (p.stage === 'egg') return reasonToast('egg');
    if (p.sleeping) return reasonToast('sleeping');
    return screens.feedMenu(app);
  }
  if (a === 'play') {
    if (p.stage === 'egg') return reasonToast('egg');
    const ok = sim.act(game, 'canPlay');
    if (!ok.ok) return reasonToast(ok.reason);
    return screens.playMenu(app);
  }
  ui.closePanel();
  if (a === 'clean') {
    const had = p.poops.map(q => ({ ...q }));
    const r = sim.act(game, 'clean');
    if (!r.ok) return reasonToast(r.reason);
    vanishing = had;
    sweep = { t: 0 };
    audio.play('clean');
    if (!p.sleeping) { startAnim('bath', 1.6); }
    save();
  }
  if (a === 'lights') {
    const r = sim.act(game, 'lights');
    audio.play('lights', p.lightsOn ? 1.2 : 0.8);
    handleEvents(r.events);
    save();
  }
  if (a === 'medicine') {
    const r = sim.act(game, 'medicine');
    if (!r.ok) {
      if (r.reason === 'healthy') { ui.toast(`${p.name} isn't sick! 😖`); emote('annoyed', 'flat', 1); say('bleh!'); audio.play('annoyed', pitch()); }
      else reasonToast(r.reason);
      return;
    }
    audio.play('medicine');
    startAnim('medicine', 1.5, { cured: r.events.some(e => e.type === 'cured') });
    save();
  }
}

// ------------------------------------------------------------------ sim events

function handleEvents(events, offline = false) {
  for (const e of events) {
    const n = pet().name;
    switch (e.type) {
      case 'hatch':
        if (offline) break;
        startAnim('hatch', 1.8);
        audio.play('hatch');
        break;
      case 'evolve':
        if (offline) break;
        startAnim('evolve', 3.4, { from: e.from, to: e.to, isNew: e.isNew });
        break;
      case 'poop': {
        if (offline) break;
        // it comes out where the pet is standing
        const last = pet().poops[pet().poops.length - 1];
        const px = clamp(actor.x / W, 0.1, 0.9);
        const crowded = pet().poops.some(q => q !== last && Math.abs(q.x - px) < 0.1);
        if (last && !pet().sleeping && !crowded) last.x = px;
        if (!actor.anim && !pet().sleeping) startAnim('poop', 1.3, { x: px * W });
        else audio.play('poop');
        break;
      }
      case 'sick':
        if (offline) break;
        audio.play('sick', pitch());
        ui.toast(`${n} doesn't feel well… 🤒`);
        break;
      case 'call':
        if (offline) break;
        actor.callT = 0.01;
        break;
      case 'mistake':
        if (offline) break;
        ui.toast(`${n} felt ignored… 🥺`);
        break;
      case 'sleep':
        if (offline) break;
        if (e.auto) { ui.toast(`${n} fell asleep. Turn off the lights?`); }
        audio.play('sad', 0.8);
        break;
      case 'wake':
        if (offline) break;
        ui.toast(`${n} woke up!`);
        startAnim('stretch', 1.4);
        audio.play('happy', pitch());
        break;
      case 'cured':
        fx.burst('sparkle', actor.x, GROUND_Y - 40, 10);
        audio.play('sparkle');
        break;
      case 'death':
        startAnim('dead', 999);
        audio.play('death');
        setTimeout(showFarewell, 2600);
        break;
      case 'ascend':
        if (offline) break;
        startAnim('ascend', 4);
        audio.play('evolve');
        setTimeout(showFarewell, 4200);
        break;
      case 'record':
        ui.toast(`New record! 🏆 ${e.score}`);
        break;
      case 'lights':
        break;
    }
  }
}

async function showFarewell() {
  if (farewellShown) return;
  farewellShown = true;
  await screens.farewellDialog(app);
  sim.newEgg(game);
  resetActor();
  save();
  farewellShown = false;
}

function resetActor() {
  actor.anim = null;
  actor.x = W / 2;
  actor.hop = 0;
  actor.bubble = null;
  actor.emote = null;
  darkness = pet().lightsOn ? 0 : 1;
}

// ------------------------------------------------------------------ minigame end

function finishMinigame() {
  const result = minigame.result;
  minigame = null;
  const r = sim.act(game, 'play', result);
  if (r.ok) {
    handleEvents(r.events);
    if (result.coins) fx.spawn('text', W / 2, 120, { text: `+${result.coins} coin${result.coins === 1 ? '' : 's'}`, color: '#d49b12', vx: 0, vy: -20, size: 16, life: 2 });
    startAnim('cheer', 1.4, { won: result.won });
    say(result.won ? pick(['that was fun!', 'again!', 'yay!!']) : pick(['fun!', 'hehe', 'next time!']));
  }
  save();
}

// ------------------------------------------------------------------ behaviour update

function update(dt) {
  const p = pet();
  const m = sim.mood(p);
  const R = petRadius();
  time += dt;

  // lights fade
  darkness += ((p.lightsOn ? 0 : 1) - darkness) * Math.min(1, dt * 4);

  // blink
  actor.blinkT -= dt;
  if (actor.blinkT <= 0) { actor.blink = 1; actor.blinkT = rnd(2, 5); }
  actor.blink = Math.max(0, actor.blink - dt * 7);

  // bubble & emote timers
  if (actor.bubble && (actor.bubble.t += dt) > actor.bubble.dur) actor.bubble = null;
  if (actor.emote && (actor.emote.t -= dt) <= 0) actor.emote = null;

  // egg
  if (p.stage === 'egg') {
    actor.eggWobble *= Math.pow(0.02, dt);
    const prog = p.age / CONFIG.stageEnd.egg;
    if (Math.random() < dt * prog * 1.2) actor.eggWobble += rnd(0.1, 0.2) * (Math.random() < 0.5 ? -1 : 1);
    if (Math.random() < dt * 0.3) fx.spawn('sparkle', W / 2 + rnd(-30, 30), GROUND_Y - rnd(10, 60), { vy: -15, size: 4, life: 1.2 });
    fx.update(dt);
    return;
  }

  // hop physics
  if (actor.hop > 0 || actor.hopV) {
    actor.hopV -= 700 * dt;
    actor.hop += actor.hopV * dt;
    if (actor.hop <= 0) {
      actor.hop = 0;
      if (actor.hopV < -80) { actor.sy = 0.8; actor.sx = 1.2; }
      actor.hopV = 0;
    }
  }
  // squash recovery (spring)
  actor.sx += (1 - actor.sx) * Math.min(1, dt * 10);
  actor.sy += (1 - actor.sy) * Math.min(1, dt * 10);
  actor.tilt += (0 - actor.tilt) * Math.min(1, dt * 6);

  // gaze
  const mouseRecent = time - mouse.t < 2.5;
  if (mouseRecent) {
    actor.lookTX = clamp((mouse.x - actor.x) / 90, -1, 1);
    actor.lookTY = clamp((mouse.y - (GROUND_Y - R)) / 90, -1, 1);
  }
  actor.lookX += (actor.lookTX - actor.lookX) * Math.min(1, dt * 8);
  actor.lookY += (actor.lookTY - actor.lookY) * Math.min(1, dt * 8);

  if (p.dead || actor.anim?.type === 'dead') { fx.update(dt); return; }

  if (actor.anim) updateAnim(dt, p);
  else if (p.sleeping) {
    if (Math.random() < dt * 0.8) fx.spawn('zzz', actor.x + 16, GROUND_Y - R * 1.6, { vx: 8, vy: -14, size: 9, life: 2.2 });
    if (p.lightsOn && Math.random() < dt * 0.3) actor.tilt = rnd(-0.15, 0.15); // tossing and turning
  } else idle(dt, p, m, R);

  // need calls: bubble with an icon every few seconds
  const needs = sim.needs(p);
  if (needs.length && !actor.anim) {
    actor.callT -= dt;
    if (actor.callT <= 0) {
      actor.callT = 7;
      const icon = { sick: 'sick', lights: 'lights', hunger: 'hunger', happy: 'happy', dirty: 'dirty' }[needs[0]];
      if (!(p.sleeping && needs[0] !== 'lights')) {
        actor.bubble = { text: 'icon:' + icon, t: 0, dur: 2.5 };
        if (!p.sleeping) { audio.play('chirp', pitch()); actor.hopV = 140; actor.hop = 0.01; actor.lookTX = 0; actor.lookTY = 0.2; }
      }
    }
  }

  // sweep (clean) wave
  if (sweep) {
    sweep.t += dt;
    const sx = -40 + sweep.t / 0.9 * (W + 80);
    if (Math.random() < 0.8) fx.spawn('bubble', sx + rnd(-15, 15), GROUND_Y + rnd(-10, 12), { vx: rnd(-10, 10), vy: rnd(-40, -10), size: rnd(3, 7), life: 1 });
    vanishing = vanishing.filter(v => {
      if (v.x * W < sx) { fx.burst('sparkle', v.x * W, GROUND_Y - 6, 5, { life: 0.5, size: 4 }); return false; }
      return true;
    });
    if (sweep.t > 0.9) sweep = null;
  }

  // gloom's personal rain cloud
  if (p.form === 'gloom' && !p.sleeping && m !== 'ecstatic' && Math.random() < dt * 5) {
    fx.spawn('rain', actor.x + rnd(-14, 14), GROUND_Y - actor.hop - R * 2.6, { vx: 0, vy: 90, life: 0.5 });
  }
  // prism leaves a trail of sparkles when moving
  if ((p.form === 'prism' || p.form === 'starling') && Math.abs(actor.vx) > 5 && Math.random() < dt * 8) {
    fx.spawn('sparkle', actor.x + rnd(-10, 10), GROUND_Y - rnd(5, 30), { vx: -actor.vx * 0.2, vy: -10, size: 4, life: 0.8, color: p.form === 'prism' ? `hsl(${(time * 120) % 360},90%,75%)` : '#fff3a8' });
  }

  fx.update(dt);
}

function idle(dt, p, m, R) {
  const slow = m === 'sick' || m === 'sad' || m === 'tired' || m === 'hungry';
  const bouncy = p.form === 'bunbun';
  actor.idleT -= dt;

  if (actor.targetX != null) {
    const dx = actor.targetX - actor.x;
    const speed = (slow ? 22 : 42) * (p.stage === 'baby' ? 0.8 : 1);
    if (Math.abs(dx) < 2) { actor.targetX = null; actor.vx = 0; }
    else {
      actor.vx = Math.sign(dx) * speed;
      actor.x += actor.vx * dt;
      actor.facing = Math.sign(dx);
      actor.walk += dt * (slow ? 7 : 12);
      if (bouncy && actor.hop === 0) actor.hopV = 170;
      else if (actor.hop === 0 && !slow && Math.random() < dt * 0.4) actor.hopV = 110;
      if (actor.hopV && actor.hop === 0) actor.hop = 0.01;
      if (time - mouse.t > 2.5) { actor.lookTX = actor.facing * 0.7; actor.lookTY = 0; }
    }
  } else actor.vx = 0;

  if (actor.idleT <= 0) {
    actor.idleT = rnd(1.5, 4.5) * (slow ? 1.6 : 1);
    const r = Math.random();
    if (r < 0.5) actor.targetX = clamp(actor.x + rnd(-130, 130), 60, W - 60);
    else if (r < 0.7) { actor.lookTX = rnd(-1, 1); actor.lookTY = rnd(-0.8, 0.3); }
    else if (r < 0.82 && !slow) { actor.hopV = 190; actor.hop = 0.01; if (m === 'ecstatic') fx.spawn('heart', actor.x, GROUND_Y - R * 2, { size: 8 }); }
    else if (r < 0.9 && m === 'tired') { emote('surprised', 'open', 1.2); say('*yawn*'); }
  }

  // idle chatter
  actor.chatT -= dt;
  if (actor.chatT <= 0) {
    actor.chatT = rnd(14, 26);
    const phrases = FORMS[p.form].phrases || ['…'];
    const moodLines = { hungry: ['hungry…', 'food?', 'tummy rumbles'], sad: ['play with me?', 'lonely…'], tired: ['sleepy…', 'so tired'], dirty: ['i feel icky', 'bath?'], sick: ['ugh…', 'i feel bad'] }[m];
    say(pick(moodLines || phrases));
  }
  // mood particles
  if (m === 'ecstatic' && Math.random() < dt * 0.4) fx.spawn('note', actor.x + rnd(-15, 15), GROUND_Y - R * 2, { vy: -20, size: 9, text: pick(['♪', '♫']) });
  if (m === 'sick') actor.tilt = Math.sin(time * 30) * 0.03;
}

function updateAnim(dt, p) {
  const a = actor.anim;
  a.t += dt;
  const R = petRadius();
  const k = a.t / a.dur;
  switch (a.type) {
    case 'eat': {
      const bites = Math.floor(a.t / 0.55);
      if (bites !== a.bites && bites > 0 && bites <= 3) {
        a.bites = bites;
        actor.sy = 0.9; actor.sx = 1.08;
        for (let i = 0; i < 4; i++) fx.spawn('crumb', actor.x + actor.facing * 8, GROUND_Y - R * 0.9, { vx: rnd(-30, 30), vy: rnd(-60, -20), grav: 300, size: 5, life: 0.6, color: a.food === 'cake' ? '#ffb3cc' : a.food === 'fish' ? '#8fd0ff' : '#fff4e0' });
      }
      break;
    }
    case 'refuse':
      actor.tilt = Math.sin(a.t * 22) * 0.18 * (1 - k);
      break;
    case 'bath':
      if (Math.random() < dt * 25) fx.spawn('bubble', actor.x + rnd(-R, R), GROUND_Y - rnd(0, R * 1.8), { vy: rnd(-40, -15), size: rnd(3, 7), life: 1 });
      actor.tilt = Math.sin(a.t * 12) * 0.08;
      break;
    case 'medicine':
      if (a.t > 0.6 && a.t - dt <= 0.6) { actor.sy = 1.15; actor.sx = 0.9; }
      actor.tilt = a.t > 0.6 ? Math.sin(a.t * 40) * 0.06 : 0;
      break;
    case 'poop':
      actor.sx = 1.12 + Math.sin(a.t * 40) * 0.02;
      actor.sy = 0.86;
      break;
    case 'petted':
      if (a.t < dt * 1.5) { actor.sy = 1.12; actor.sx = 0.92; }
      break;
    case 'cheer':
      if (actor.hop === 0 && a.t < a.dur - 0.4) { actor.hopV = 200; actor.hop = 0.01; }
      if (Math.random() < dt * 6) fx.spawn(a.won ? 'heart' : 'sparkle', actor.x + rnd(-20, 20), GROUND_Y - R * 2, { size: 8 });
      break;
    case 'stretch':
      actor.sy = 1 + Math.sin(k * Math.PI) * 0.18;
      actor.sx = 1 - Math.sin(k * Math.PI) * 0.1;
      break;
    case 'hatch':
      if (a.t < dt * 1.5) {
        fx.burst('sparkle', W / 2, GROUND_Y - 30, 16, { speed: [60, 130], life: 0.9 });
        fx.burst('puff', W / 2, GROUND_Y - 20, 10, { speed: [30, 70], life: 0.7, size: 7 });
        actor.x = W / 2;
        actor.hopV = 230; actor.hop = 0.01;
      }
      break;
    case 'evolve': {
      actor.x += (W / 2 - actor.x) * Math.min(1, dt * 3);
      actor.hop = Math.sin(Math.min(1, k * 1.2) * Math.PI) * 30;
      if (Math.random() < dt * 20) fx.spawn('sparkle', actor.x + rnd(-40, 40), GROUND_Y - rnd(0, 90), { vy: -30, size: 5, life: 0.8 });
      break;
    }
    case 'ascend':
      actor.hop += dt * 40 * (0.5 + k);
      if (Math.random() < dt * 15) fx.spawn('sparkle', actor.x + rnd(-20, 20), GROUND_Y - actor.hop - rnd(0, 30), { vy: 10, size: 4, life: 1 });
      break;
  }
  if (a.t >= a.dur && a.type !== 'dead') {
    const done = a.type;
    actor.anim = null;
    if (done === 'eat') {
      const f = FOODS[a.food];
      emote('happy', 'grin', 1);
      if (f.kind === 'snack') fx.burst('heart', actor.x, GROUND_Y - R * 1.8, 4, { speed: [20, 50] });
      audio.play('happy', pitch());
    }
    if (done === 'bath') { emote('happy', 'grin', 1); fx.burst('sparkle', actor.x, GROUND_Y - R, 8); }
    if (done === 'medicine') {
      if (a.cured) { emote('happy', 'grin', 1.2); say('all better!'); }
      else { emote('annoyed', 'wobbly', 1); say('one more…'); }
    }
    if (done === 'poop') {
      audio.play('poop');
      actor.targetX = clamp(actor.x + (actor.x > W / 2 ? -80 : 80), 60, W - 60);
      emote('surprised', 'o', 1.2);
      fx.burst('puff', a.x, GROUND_Y, 6, { life: 0.5, size: 4, speed: [20, 40] });
    }
    if (done === 'evolve') {
      actor.hop = 0;
      fx.burst('sparkle', actor.x, GROUND_Y - 40, 20, { speed: [60, 150], life: 1 });
      for (let i = 0; i < 40; i++) fx.spawn('confetti', rnd(0, W), rnd(-30, 0), { vx: rnd(-20, 20), vy: rnd(40, 110), life: 2.4, color: CONFETTI[i % 5] });
      audio.play('evolve');
      setTimeout(() => screens.evolveDialog(app, a.from, a.to, a.isNew), 300);
    }
    if (done === 'hatch') { if (!p.named) screens.nameDialog(app, true); say('pip!'); }
    if (done === 'ascend') actor.hop = 0;
  }
}

// ------------------------------------------------------------------ pose + drawing

function currentPose() {
  const p = pet();
  const m = sim.mood(p);
  let expr = 'normal', mouth = 'smile', tears = false, blink = actor.blink;
  const moodFace = {
    ecstatic: ['happy', 'grin'], happy: ['normal', 'smile'], content: ['normal', 'smile'],
    hungry: ['sad', 'o'], sad: ['sad', 'frown'], tired: ['normal', 'flat'], dirty: ['normal', 'wobbly'],
    sick: ['sick', 'wobbly'], sleeping: ['sleep', 'o'], dead: ['dead', 'flat'],
  }[m] || ['normal', 'smile'];
  [expr, mouth] = moodFace;
  if (m === 'ecstatic' && Math.sin(time * 0.7) < 0.3) [expr, mouth] = ['normal', 'grin'];
  if (m === 'sad' && p.stats.happy < 12) tears = true;
  if (m === 'tired') blink = Math.max(blink, 0.45);
  if (actor.emote) { expr = actor.emote.expr; mouth = actor.emote.mouth; }
  const a = actor.anim;
  if (a) {
    if (a.type === 'eat') { expr = 'eat'; mouth = Math.floor(a.t * 7) % 2 ? 'chew-open' : 'chew'; }
    if (a.type === 'refuse') { expr = 'annoyed'; mouth = 'flat'; }
    if (a.type === 'bath') { expr = 'happy'; mouth = 'grin'; }
    if (a.type === 'medicine') { expr = a.t > 0.6 ? 'annoyed' : 'surprised'; mouth = a.t > 0.6 ? 'wobbly' : 'open'; }
    if (a.type === 'poop') { expr = 'annoyed'; mouth = 'flat'; }
    if (a.type === 'petted') { expr = a.annoyed ? 'annoyed' : 'happy'; mouth = a.annoyed ? 'flat' : 'grin'; }
    if (a.type === 'cheer') { expr = 'happy'; mouth = 'grin'; }
    if (a.type === 'stretch') { expr = 'sleep'; mouth = 'open'; }
    if (a.type === 'hatch') { expr = a.t < 0.6 ? 'surprised' : 'happy'; mouth = 'open'; }
    if (a.type === 'evolve') { expr = 'happy'; mouth = 'grin'; }
    if (a.type === 'ascend') { expr = 'happy'; mouth = 'smile'; }
    if (a.type === 'dead') { expr = 'dead'; mouth = 'flat'; }
  }
  let sx = actor.sx, sy = actor.sy;
  if (p.sleeping && !a) { sx *= 1.1 + Math.sin(time * 2) * 0.02; sy *= 0.84 + Math.sin(time * 2) * 0.03; }
  else if (!a) sy *= 1 + Math.sin(time * 3) * 0.015; // idle breathing
  return {
    x: actor.x, y: GROUND_Y - actor.hop, t: time, sx, sy, tilt: actor.tilt,
    lookX: p.sleeping ? 0 : actor.lookX, lookY: p.sleeping ? 0.3 : actor.lookY,
    blink, expr, mouth, tears, facing: actor.facing, weight: p.weight, hat: game.meta.hat, scale: ROOM_SCALE,
    walk: actor.vx ? actor.walk : 0, wave: a?.type === 'cheer' || (actor.emote?.expr === 'happy' && actor.emote.t > 0.5),
  };
}

function draw() {
  const p = pet();
  const now = new Date();
  const hour = now.getHours() + now.getMinutes() / 60;
  ctx.setTransform(scale, 0, 0, scale, 0, 0);

  if (minigame) { minigame.draw(ctx); return; }

  drawRoom(ctx, { t: time, hour, date: now, wallpaper: game.meta.wallpaper, lightsOn: p.lightsOn, framed: game.meta.memorial[0]?.form });

  for (const q of p.poops) drawPoop(ctx, q.x * W, GROUND_Y + 8, time + q.x * 10);
  for (const q of vanishing) drawPoop(ctx, q.x * W, GROUND_Y + 8, time, 0.9);

  const R = petRadius();
  if (p.stage === 'egg') {
    const prog = Math.min(1, p.age / CONFIG.stageEnd.egg);
    drawShadow(ctx, W / 2, GROUND_Y + 2, 24);
    drawEgg(ctx, W / 2, GROUND_Y, time, prog, actor.eggWobble + Math.sin(time * 18) * 0.04 * prog * prog);
  } else if (p.dead) {
    drawGrave(ctx, W / 2 + 60, GROUND_Y + 4, p.name);
    const k = Math.min(1, (actor.anim?.t || 3) / 3);
    drawCreature(ctx, p.form, { ...currentPose(), x: W / 2 - 20, y: GROUND_Y - 10 - k * 30 + Math.sin(time * 2) * 4, alpha: 0.55, expr: 'dead', mouth: 'flat' });
  } else if (!(p.ascended && !actor.anim)) {
    const pose = currentPose();
    const a = actor.anim;
    const w = (R * (looks().w || 1)) * (1 - Math.min(0.5, actor.hop / 120));
    drawShadow(ctx, actor.x, GROUND_Y + 2, w);
    let form = p.form;
    let flash = 0;
    if (a?.type === 'evolve') {
      const k = a.t / a.dur;
      const freq = 2 + k * 14;
      form = Math.sin(a.t * freq) > 0 || k > 0.92 ? a.to : a.from;
      flash = k > 0.92 ? 0 : 0.35 + 0.5 * Math.abs(Math.sin(a.t * freq));
    }
    if (a?.type === 'hatch' && a.t < 0.5) {
      drawEgg(ctx, W / 2, GROUND_Y, time, 1, Math.sin(time * 40) * 0.2, 1 - a.t * 2);
    } else {
      const extra = {};
      if (a?.type === 'hatch') extra.scale = ROOM_SCALE * Math.min(1, 0.4 + (a.t - 0.5) * 1.5);
      if (a?.type === 'ascend') extra.alpha = Math.max(0, 1 - a.t / a.dur);
      drawCreature(ctx, form, { ...pose, flash, ...extra });
    }
    // food being eaten
    if (a?.type === 'eat') drawFood(ctx, a.food, actor.x + actor.facing * R * 0.5, GROUND_Y - R * 0.55 - actor.hop, 1.3, Math.min(3, a.bites || 0));
    if (a?.type === 'medicine' && a.t < 0.6) {
      const k = a.t / 0.6;
      drawFood(ctx, 'pill', actor.x + (1 - k) * 60, GROUND_Y - R * 0.8 - Math.sin(k * Math.PI) * 30, 1);
    }
    // gloom cloud
    if (p.form === 'gloom' && !p.sleeping && sim.mood(p) !== 'ecstatic') {
      ctx.fillStyle = 'rgba(150,150,190,0.9)';
      cloud(ctx, actor.x - 16, GROUND_Y - actor.hop - R * 2.7 + Math.sin(time * 2) * 2, 1.1);
    }
  }

  // sweep foam
  if (sweep) {
    const sx = -40 + sweep.t / 0.9 * (W + 80);
    ctx.fillStyle = 'rgba(200,235,255,0.75)';
    for (let i = 0; i < 7; i++) { ctx.beginPath(); ctx.arc(sx - i * 8, GROUND_Y + 6 + Math.sin(i * 2 + time * 10) * 4, 9 - i, 0, Math.PI * 2); ctx.fill(); }
  }

  drawDarkness(ctx, time, darkness);
  fx.draw(ctx);

  if (actor.bubble && !p.dead) {
    const b = actor.bubble;
    const alpha = Math.min(1, b.t * 6, (b.dur - b.t) * 4);
    const topY = p.stage === 'egg' ? GROUND_Y - 58 : GROUND_Y - actor.hop - R * 2.1 - (game.meta.hat !== 'none' ? 14 : 0) - (looks().ears === 'bunny' ? 18 : 0);
    drawBubble(ctx, p.stage === 'egg' ? W / 2 : actor.x, topY, b.text, alpha);
  }
}

// ------------------------------------------------------------------ loop

let last = performance.now();
let saveT = 0;
let hudT = 0;
function frame(now) {
  requestAnimationFrame(frame);
  let real = (now - last) / 1000;
  last = now;
  if (real <= 0) return;

  const paused = ui.modalOpen() || !!minigame;

  if (real > 20 && !paused) {
    // returned from a background tab: treat as time away
    catchUp(real * prefs.speed);
    real = 0.016;
  }
  const dt = Math.min(real, 0.05);

  if (minigame) {
    minigame.update(dt);
    if (minigame.done) finishMinigame();
  } else if (!paused) {
    const events = sim.tick(game, Math.min(real, 20) * prefs.speed);
    if (events.length) handleEvents(events);
  }
  if (!minigame) update(dt);

  draw();

  hudT -= real;
  if (hudT <= 0) {
    hudT = 0.25;
    ui.updateHud(game, { meta: metaLine(), busy: busy() });
    audio.night = isNight(new Date().getHours()) || !pet().lightsOn;
  }
  saveT -= real;
  if (saveT <= 0) { saveT = 5; save(); }
}

function metaLine() {
  const p = pet();
  if (p.dead) return 'passed away';
  if (p.ascended) return 'returned to the moon';
  if (p.stage === 'egg') return `Moon Egg · ${p.age / CONFIG.stageEnd.egg > 0.6 ? 'hatching soon!' : 'warm and wiggly'} · Gen ${p.generation}`;
  const stage = { baby: 'baby', child: 'child', adult: 'adult' }[p.stage];
  const status = p.sleeping ? ' · sleeping' : p.sick ? ' · sick' : '';
  return `${FORMS[p.form].name} · ${stage} · ${ui.formatAge(p.age)} old${status}`;
}

function catchUp(seconds) {
  if (seconds < 5) return;
  const before = pet().form;
  const r = sim.catchUp(game, seconds);
  handleEvents(r.events, true);
  resetActor();
  if (seconds > 60) screens.awayDialog(app, seconds, r.events).then(() => {
    if (pet().ascended) showFarewell();
    else if (pet().stage !== 'egg' && !pet().named) screens.nameDialog(app, true);
  });
  if (before !== pet().form) save();
}

// ------------------------------------------------------------------ input

function toLogical(e) {
  const r = cv.getBoundingClientRect();
  return { x: (e.clientX - r.left) / r.width * W, y: (e.clientY - r.top) / r.height * H };
}

cv.addEventListener('pointermove', e => {
  const q = toLogical(e);
  mouse = { ...q, t: time };
  if (minigame) minigame.pointer(q.x, q.y, 'move');
});

cv.addEventListener('pointerdown', e => {
  audio.unlock();
  const q = toLogical(e);
  mouse = { ...q, t: time };
  if (minigame) { minigame.pointer(q.x, q.y, 'down'); return; }
  if (ui.panelOpen()) { ui.closePanel(); return; }
  const p = pet();
  if (p.dead || p.ascended || busy()) return;

  if (p.stage === 'egg') {
    if (Math.abs(q.x - W / 2) < 30 && q.y > GROUND_Y - 55 && q.y < GROUND_Y + 5) {
      sim.act(game, 'pet');
      actor.eggWobble += 0.25 * (q.x < W / 2 ? 1 : -1);
      audio.play('pet', 1.4);
      fx.spawn('heart', W / 2 + rnd(-10, 10), GROUND_Y - 55, { size: 8 });
      if (Math.random() < 0.4) say(pick(['*wiggle*', '…!', '*warm*', '♡']), 1.4);
    }
    return;
  }

  // poop?
  for (let i = 0; i < p.poops.length; i++) {
    const px = p.poops[i].x * W;
    if (Math.abs(q.x - px) < 16 && Math.abs(q.y - (GROUND_Y - 4)) < 18) {
      const r = sim.act(game, 'scoop', i);
      if (r.ok) { fx.burst('sparkle', px, GROUND_Y - 6, 6, { life: 0.5, size: 4 }); fx.burst('puff', px, GROUND_Y, 5, { life: 0.4, size: 5 }); audio.play('clean'); save(); }
      return;
    }
  }

  // the pet?
  const R = petRadius() * (looks().w || 1);
  const cy = GROUND_Y - actor.hop - petRadius();
  if (Math.hypot((q.x - actor.x) / 1.1, q.y - cy) < R * 1.25) {
    if (p.sleeping) { say('zzz…', 1.2); return; }
    if (actor.anim && actor.anim.type !== 'petted') return;
    const r = sim.act(game, 'pet');
    if (!r.ok) return;
    const annoyed = r.events.some(ev => ev.type === 'annoyed');
    startAnim('petted', 0.7, { annoyed });
    if (annoyed) { audio.play('annoyed', pitch()); if (Math.random() < 0.5) say(pick(['hey!', 'enough!', 'hmph'])); }
    else {
      audio.play('pet', pitch());
      fx.spawn('heart', q.x, q.y - 6, { vy: -40, size: 10 });
      if (Math.random() < 0.25) say(pick(['hehe', '♡', 'purr~', 'more!']), 1.6);
    }
    actor.lookTX = 0; actor.lookTY = 0.2;
    save();
  }
});

document.querySelectorAll('.act').forEach(b => b.addEventListener('click', () => { audio.unlock(); doAction(b.dataset.act); }));
document.querySelectorAll('.mini').forEach(b => b.addEventListener('click', () => {
  audio.unlock();
  if (minigame) return;
  audio.play('select');
  ui.closePanel();
  if (b.dataset.open === 'journal') screens.journal(app);
  if (b.dataset.open === 'shop') screens.shop(app);
  if (b.dataset.open === 'settings') screens.settings(app);
}));
document.getElementById('pname').addEventListener('click', e => {
  if (e.target.closest('[data-rename]') && !ui.modalOpen() && pet().stage !== 'egg') screens.nameDialog(app, false);
});

const KEYMAP = { 1: 'feed', 2: 'play', 3: 'clean', 4: 'lights', 5: 'medicine' };
window.addEventListener('keydown', e => {
  audio.unlock();
  if (e.target.tagName === 'INPUT') return;
  if (minigame) {
    minigame.key(e.key, true);
    if ([' ', 'ArrowUp', 'ArrowLeft', 'ArrowRight'].includes(e.key)) e.preventDefault();
    return;
  }
  if (e.key === 'Escape') { if (ui.panelOpen()) ui.closePanel(); else ui.closeModal(); return; }
  if (ui.modalOpen()) return;
  if (KEYMAP[e.key]) doAction(KEYMAP[e.key]);
  if (e.key === 'j') screens.journal(app);
  if (e.key === 's') screens.shop(app);
  if (e.key === ']') { handleEvents(sim.tick(game, 60)); ui.toast('⏩ +1 minute'); } // debug fast-forward
});
window.addEventListener('keyup', e => { if (minigame) minigame.key(e.key, false); });

window.addEventListener('pagehide', save);
document.addEventListener('visibilitychange', () => { if (document.hidden) save(); });

// ------------------------------------------------------------------ boot

// handy for debugging from the console
window.moonling = { get game() { return game; }, sim, actor, tick: s => handleEvents(sim.tick(game, s)), noSave: () => { saveDisabled = true; } };

ui.initStatic();
app.applyPrefs();
resize();
await document.fonts?.ready;
resize();

if (firstRun) {
  screens.introDialog();
} else {
  const away = (Date.now() - (game.savedAt || Date.now())) / 1000;
  if (pet().dead) { startAnim('dead', 999); setTimeout(showFarewell, 800); }
  else if (pet().ascended) showFarewell();
  else if (away > 5) catchUp(away * prefs.speed);
  else if (pet().stage !== 'egg' && !pet().named) screens.nameDialog(app, true);
}
requestAnimationFrame(t => { last = t; frame(t); });
