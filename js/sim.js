// Pure simulation core: no DOM, no rendering. Everything that happens to the
// pet is expressed as state changes plus a list of events for the UI.

import { CONFIG, FOODS, FORMS, NAMES } from './config.js';

const clamp = (v, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, v));
const rand = (rng, [a, b]) => a + (b - a) * rng();

export function createMeta() {
  return {
    generation: 0,
    coins: 10,
    discovered: ['egg'],
    hats: ['none'],
    wallpapers: ['lilac'],
    hat: 'none',
    wallpaper: 'lilac',
    memorial: [], // past moonlings
    best: { catch: 0, guess: 0 },
  };
}

export function createPet(meta, rng = Math.random) {
  meta.generation += 1;
  return {
    name: NAMES[Math.floor(rng() * NAMES.length)],
    named: false,
    form: 'egg',
    stage: 'egg',
    age: 0,
    stageAge: 0,
    stats: { hunger: 80, happy: 80, energy: 100, hygiene: 100, health: 100 },
    weight: 5,
    sleeping: false,
    lightsOn: true,
    poops: [], // [{x: 0..1, t: age}]
    poopTimers: [],
    sick: 0, // doses of medicine still needed
    sickClock: 0,
    callTimer: 0,
    lastPet: -99,
    petStreak: 0,
    dead: false,
    ascended: false,
    cause: null,
    // care tracking for the current stage (drives evolution)
    care: freshCare(),
    totalMistakes: 0,
    generation: meta.generation,
  };
}

function freshCare() {
  return { acc: 0, time: 0, mistakes: 0, meals: 0, snacks: 0, plays: 0, pets: 0, cleans: 0 };
}

export function createGame(rng = Math.random) {
  const meta = createMeta();
  return { version: 1, meta, pet: createPet(meta, rng), savedAt: Date.now() };
}

// ---------------------------------------------------------------- queries

export function avgCare(pet) {
  return pet.care.time > 0 ? (pet.care.acc / pet.care.time) * 100 : 100;
}

function formMul(pet, stat) {
  const f = FORMS[pet.form];
  return (f && f.mul && f.mul[stat]) || 1;
}

/** Current unmet needs, most urgent first. */
export function needs(pet) {
  if (pet.dead || pet.stage === 'egg') return [];
  const s = pet.stats;
  const out = [];
  if (pet.sick) out.push('sick');
  if (pet.sleeping && pet.lightsOn) out.push('lights');
  if (!pet.sleeping) {
    if (s.hunger < 20) out.push('hunger');
    if (s.happy < 20) out.push('happy');
  }
  if (pet.poops.length >= 2 || s.hygiene < 15) out.push('dirty');
  return out;
}

export function mood(pet) {
  if (pet.dead) return 'dead';
  if (pet.stage === 'egg') return 'egg';
  if (pet.sleeping) return 'sleeping';
  if (pet.sick) return 'sick';
  const s = pet.stats;
  const lowest = Math.min(s.hunger, s.happy, s.hygiene);
  if (s.hunger < 20) return 'hungry';
  if (s.happy < 25 || lowest < 10) return 'sad';
  if (s.energy < 25) return 'tired';
  if (s.hygiene < 25) return 'dirty';
  const avg = (s.hunger + s.happy + s.energy + s.hygiene) / 4;
  if (avg > 80 && s.happy > 75) return 'ecstatic';
  if (avg > 55) return 'happy';
  return 'content';
}

// ---------------------------------------------------------------- evolution

export function chooseEvolution(pet) {
  const c = pet.care;
  const care = avgCare(pet);
  if (pet.stage === 'baby') {
    return c.mistakes <= 2 && care >= 45 ? 'mochi' : 'grumble';
  }
  if (pet.stage === 'child') {
    if (c.mistakes >= 4 || care < 40) return 'gloom';
    if (c.pets >= 25 && care >= 60 && c.mistakes <= 2) return 'prism';
    if ((c.snacks >= 4 && c.snacks > c.meals) || pet.weight >= 22) return 'chonk';
    if (c.plays >= 5 && c.plays >= c.meals * 0.6) return 'bunbun';
    if (pet.form === 'mochi' && c.mistakes === 0 && care >= 68) return 'starling';
    return 'sprout';
  }
  return pet.form;
}

function advanceStage(pet, meta, events) {
  const from = pet.form;
  let to;
  if (pet.stage === 'egg') { pet.stage = 'baby'; to = 'pip'; }
  else if (pet.stage === 'baby') { to = chooseEvolution(pet); pet.stage = 'child'; }
  else if (pet.stage === 'child') { to = chooseEvolution(pet); pet.stage = 'adult'; }
  else return;
  pet.form = to;
  pet.stageAge = 0;
  pet.care = freshCare();
  const isNew = !meta.discovered.includes(to);
  if (isNew) meta.discovered.push(to);
  events.push({ type: from === 'egg' ? 'hatch' : 'evolve', from, to, isNew });
}

// ---------------------------------------------------------------- tick

/**
 * Advance the simulation by `dt` sim-seconds (internally in fixed steps).
 * opts.offline: clamp health so the pet can't die while you're away.
 */
export function tick(game, dt, opts = {}, rng = Math.random) {
  const events = [];
  let remaining = dt;
  while (remaining > 1e-9) {
    const h = Math.min(CONFIG.step, remaining);
    step(game, h, opts, rng, events);
    remaining -= h;
    if (game.pet.dead || game.pet.ascended) break;
  }
  return events;
}

function step(game, h, opts, rng, events) {
  const pet = game.pet;
  const meta = game.meta;
  if (pet.dead || pet.ascended) return;

  pet.age += h;
  pet.stageAge += h;
  // while away, needs keep ticking but the pet doesn't grow up without you:
  // any pending evolution waits until you're back to see it
  const end = CONFIG.stageEnd[pet.stage];
  if (opts.offline && end !== undefined && pet.age > end - 3) { pet.age = end - 3; pet.stageAge -= h; }

  if (pet.stage === 'egg') {
    if (pet.age >= CONFIG.stageEnd.egg) advanceStage(pet, meta, events);
    return;
  }

  const s = pet.stats;
  const sm = CONFIG.stageDecayMul[pet.stage];

  // --- stat decay
  if (pet.sleeping) {
    s.hunger -= CONFIG.decay.hunger * CONFIG.sleepDecayMul.hunger * sm * formMul(pet, 'hunger') * h;
    s.happy -= CONFIG.decay.happy * CONFIG.sleepDecayMul.happy * sm * h;
    s.hygiene -= CONFIG.decay.hygiene * CONFIG.sleepDecayMul.hygiene * sm * h;
    s.energy += CONFIG.sleepEnergyGain * h;
    if (pet.lightsOn) s.happy -= 0.05 * h; // hard to sleep with the lights on
    if (s.energy >= 100) {
      s.energy = 100;
      pet.sleeping = false;
      events.push({ type: 'wake' });
    }
  } else {
    const dark = !pet.lightsOn ? CONFIG.darkAwakeHappyMul : 1;
    s.hunger -= CONFIG.decay.hunger * sm * formMul(pet, 'hunger') * h;
    s.happy -= CONFIG.decay.happy * sm * formMul(pet, 'happy') * dark * h;
    s.energy -= CONFIG.decay.energy * sm * formMul(pet, 'energy') * h;
    s.hygiene -= CONFIG.decay.hygiene * sm * formMul(pet, 'hygiene') * h;
    if (s.energy <= CONFIG.autoSleepEnergy) {
      pet.sleeping = true;
      events.push({ type: 'sleep', auto: true });
    }
  }

  // --- poop
  s.hygiene -= CONFIG.poopHygienePerSec * pet.poops.length * h;
  s.happy -= CONFIG.poopHappyPerSec * pet.poops.length * h;
  for (let i = pet.poopTimers.length - 1; i >= 0; i--) {
    pet.poopTimers[i] -= h;
    if (pet.poopTimers[i] <= 0) {
      pet.poopTimers.splice(i, 1);
      if (pet.poops.length < CONFIG.maxPoops) {
        const x = pickPoopSpot(pet, rng);
        pet.poops.push({ x, t: pet.age });
        events.push({ type: 'poop', x });
      }
    }
  }

  const statFloor = opts.offline ? CONFIG.offline.statFloor : 0;
  for (const k of ['hunger', 'happy', 'energy', 'hygiene']) s[k] = clamp(s[k], k === 'energy' ? 0 : statFloor);

  // --- sickness
  pet.sickClock += h;
  if (pet.sickClock >= CONFIG.sickCheckEvery) {
    pet.sickClock = 0;
    if (!pet.sick) {
      let p = 0.004 + 0.05 * pet.poops.length;
      if (s.hygiene < 30) p += 0.06;
      if (s.hunger < 10) p += 0.05;
      if (s.energy < 5) p += 0.03;
      if (pet.weight > 40) p += 0.04;
      if (rng() < p) {
        pet.sick = rng() < 0.35 ? 2 : 1;
        events.push({ type: 'sick' });
      }
    }
  }

  // --- health
  const floor = opts.offline ? Math.min(s.health, CONFIG.offline.healthFloor) : 0;
  let drain = 0;
  if (pet.sick) drain += CONFIG.sickHealthDrain;
  for (const k of ['hunger', 'happy', 'hygiene']) if (s[k] <= 0) drain += CONFIG.zeroStatHealthDrain[k];
  if (drain > 0) s.health -= drain * h;
  else if (s.hunger > 35 && s.happy > 35 && s.hygiene > 35) s.health += CONFIG.healthRegen * h;
  s.health = clamp(s.health, floor);

  // --- care accounting (evolution)
  if (!opts.offline) {
    const quality = (s.hunger + s.happy + s.energy + s.hygiene) / 400 * (pet.sick ? 0.5 : 1);
    pet.care.acc += quality * h;
    pet.care.time += h;
  }

  // --- attention calls & care mistakes
  const n = needs(pet);
  if (n.length) {
    if (pet.callTimer === 0) events.push({ type: 'call', need: n[0] });
    pet.callTimer += h;
    if (pet.callTimer >= CONFIG.callGrace) {
      pet.callTimer = 1e-6; // restart the grace window without re-announcing
      const allow = !opts.offline || (opts.mistakeBudget && opts.mistakeBudget.left-- > 0);
      if (allow) {
        pet.care.mistakes += 1;
        pet.totalMistakes += 1;
        events.push({ type: 'mistake', need: n[0] });
      }
    }
  } else {
    pet.callTimer = 0;
  }

  // --- death
  if (s.health <= 0) {
    pet.dead = true;
    pet.cause = pet.sick ? 'illness' : s.hunger <= 0 ? 'hunger' : 'neglect';
    memorialize(game, pet.cause);
    events.push({ type: 'death', cause: pet.cause });
    return;
  }

  // --- growing up (waits until awake so the player sees it)
  if (end !== undefined && pet.age >= end && !pet.sleeping) advanceStage(pet, meta, events);

  if (pet.stage === 'adult' && pet.stageAge >= CONFIG.adultLifespan && !pet.sleeping && !opts.offline) {
    pet.ascended = true;
    memorialize(game, 'moon');
    events.push({ type: 'ascend' });
  }
}

function pickPoopSpot(pet, rng) {
  for (let tries = 0; tries < 10; tries++) {
    const x = 0.12 + rng() * 0.76;
    if (pet.poops.every(p => Math.abs(p.x - x) > 0.12)) return x;
  }
  return 0.12 + rng() * 0.76;
}

function memorialize(game, cause) {
  const p = game.pet;
  game.meta.memorial.unshift({
    name: p.name, form: p.form, age: Math.round(p.age), generation: p.generation,
    cause, hat: game.meta.hat,
  });
  game.meta.memorial.length = Math.min(game.meta.memorial.length, 30);
  if (cause === 'moon') game.meta.coins += 50;
}

// ---------------------------------------------------------------- actions

/** Returns { ok, reason?, events } */
export function act(game, action, arg, rng = Math.random) {
  const pet = game.pet;
  const meta = game.meta;
  const s = pet.stats;
  const events = [];
  const fail = reason => ({ ok: false, reason, events });

  if (pet.dead || pet.ascended) return fail('gone');
  if (pet.stage === 'egg' && action !== 'lights' && action !== 'pet') return fail('egg');

  switch (action) {
    case 'feed': {
      const food = FOODS[arg];
      if (!food) return fail('unknown');
      if (pet.sleeping) return fail('sleeping');
      if (food.kind === 'meal' && s.hunger >= 92) return fail('full');
      if (meta.coins < food.cost) return fail('coins');
      meta.coins -= food.cost;
      s.hunger = clamp(s.hunger + food.hunger);
      s.happy = clamp(s.happy + food.happy);
      if (food.energy) s.energy = clamp(s.energy + food.energy);
      if (food.hygiene) s.hygiene = clamp(s.hygiene + food.hygiene);
      pet.weight += food.weight;
      if (food.kind === 'meal') pet.care.meals += 1; else pet.care.snacks += 1;
      if (food.kind === 'meal' || rng() < 0.35) pet.poopTimers.push(rand(rng, CONFIG.poopDelay));
      if (arg === 'jelly' && pet.sick) { pet.sick = Math.max(0, pet.sick - 1); if (!pet.sick) events.push({ type: 'cured' }); }
      events.push({ type: 'ate', food: arg });
      return { ok: true, events };
    }
    case 'play': {
      // arg: { game, score, won } — result of a finished minigame
      if (pet.sleeping) return fail('sleeping');
      const r = arg || {};
      const coins = Math.max(0, Math.round(r.coins || 0));
      meta.coins += coins;
      s.happy = clamp(s.happy + (r.won ? 25 : 12));
      s.energy = clamp(s.energy - 12);
      s.hunger = clamp(s.hunger - 5);
      pet.weight = Math.max(3, pet.weight - 1);
      pet.care.plays += 1;
      if (r.game && r.score > (meta.best[r.game] || 0)) {
        meta.best[r.game] = r.score;
        events.push({ type: 'record', game: r.game, score: r.score });
      }
      events.push({ type: 'played', coins, won: !!r.won });
      return { ok: true, events };
    }
    case 'canPlay': {
      if (pet.sleeping) return fail('sleeping');
      if (pet.sick) return fail('sick');
      if (s.energy < 15) return fail('tired');
      return { ok: true, events };
    }
    case 'clean': {
      const had = pet.poops.length;
      pet.poops = [];
      const wasDirty = s.hygiene < 60 || had > 0;
      s.hygiene = 100;
      if (wasDirty) s.happy = clamp(s.happy + 5);
      pet.care.cleans += 1;
      events.push({ type: 'cleaned', poops: had });
      return { ok: true, events };
    }
    case 'scoop': {
      if (!(arg >= 0 && arg < pet.poops.length)) return fail('nothing');
      pet.poops.splice(arg, 1);
      s.hygiene = clamp(s.hygiene + 4);
      events.push({ type: 'scooped' });
      return { ok: true, events };
    }
    case 'lights': {
      pet.lightsOn = !pet.lightsOn;
      if (!pet.lightsOn && !pet.sleeping && pet.stage !== 'egg' && s.energy < 75) {
        pet.sleeping = true;
        events.push({ type: 'sleep', auto: false });
      }
      events.push({ type: 'lights', on: pet.lightsOn });
      return { ok: true, events };
    }
    case 'medicine': {
      if (!pet.sick) {
        s.happy = clamp(s.happy - 5);
        return fail('healthy');
      }
      pet.sick -= 1;
      s.happy = clamp(s.happy - 4);
      events.push({ type: pet.sick ? 'dose' : 'cured' });
      return { ok: true, events };
    }
    case 'pet': {
      if (pet.age - pet.lastPet < CONFIG.petCooldown) return fail('cooldown');
      if (pet.stage === 'egg') { events.push({ type: 'eggpat' }); pet.lastPet = pet.age; return { ok: true, events }; }
      if (pet.sleeping) return fail('sleeping');
      // the streak cools off by one every 3 seconds; too many rapid pets annoys it
      pet.petStreak = Math.max(0, pet.petStreak - (pet.age - pet.lastPet) / 3) + 1;
      pet.lastPet = pet.age;
      if (pet.petStreak > 6) {
        s.happy = clamp(s.happy - 3);
        events.push({ type: 'annoyed' });
      } else {
        s.happy = clamp(s.happy + 4);
        pet.care.pets += 1;
        events.push({ type: 'petted' });
      }
      return { ok: true, events };
    }
    case 'rename': {
      const name = String(arg || '').trim().slice(0, 14);
      if (!name) return fail('empty');
      pet.name = name;
      pet.named = true;
      return { ok: true, events };
    }
    default:
      return fail('unknown');
  }
}

/** Start the next generation after death/ascension. */
export function newEgg(game, rng = Math.random) {
  game.pet = createPet(game.meta, rng);
}

// ---------------------------------------------------------------- persistence

/**
 * Catch up after being away. Time away is compressed and capped so a pet
 * left alone overnight is hungry and grumpy, but never dies off-screen.
 */
export function catchUp(game, awaySeconds, rng = Math.random) {
  if (awaySeconds <= 0) return { simulated: 0, events: [] };
  const simulated = Math.min(awaySeconds, CONFIG.offline.cap);
  const budget = { left: CONFIG.offline.maxMistakes };
  const events = tick(game, simulated, { offline: true, mistakeBudget: budget }, rng);
  return { simulated, events };
}

export function serialize(game) {
  return JSON.stringify({ ...game, savedAt: Date.now() });
}

export function deserialize(str) {
  try {
    const g = JSON.parse(str);
    if (!g || g.version !== 1 || !g.pet || !g.meta) return null;
    // forward-compat defaults
    const fresh = createMeta();
    g.meta = { ...fresh, ...g.meta, best: { ...fresh.best, ...g.meta.best } };
    return g;
  } catch {
    return null;
  }
}
