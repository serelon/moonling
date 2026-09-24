// All tunable numbers live here. Time is in "sim seconds" (1 sim second = 1 real
// second at 1x speed). The whole life cycle is compressed so a session of
// ~20 minutes takes a moonling from egg to adult.

export const CONFIG = {
  step: 0.25, // fixed sim step in seconds

  // age (sim seconds) at which each stage ends
  stageEnd: { egg: 25, baby: 240, child: 900 },
  adultLifespan: 60 * 60 * 6, // adults return to the moon after 6 sim-hours

  // per-second decay while awake (0..100 scale)
  decay: { hunger: 0.14, happy: 0.15, energy: 0.1, hygiene: 0.06 },
  stageDecayMul: { egg: 0, baby: 1.3, child: 1.1, adult: 1.0 },
  sleepDecayMul: { hunger: 0.35, happy: 0.1, hygiene: 0.3 },
  darkAwakeHappyMul: 2.0, // awake with the lights off is spooky
  sleepEnergyGain: 0.85,
  autoSleepEnergy: 12,

  poopHygienePerSec: 0.12,
  poopHappyPerSec: 0.04,
  maxPoops: 4,
  poopDelay: [40, 80], // seconds after a meal before it comes out

  sickCheckEvery: 15,
  sickHealthDrain: 0.16,
  zeroStatHealthDrain: { hunger: 0.14, happy: 0.1, hygiene: 0.06 },
  healthRegen: 0.25,

  callGrace: 75, // seconds a call can go unanswered before a care mistake
  petCooldown: 1.2,

  offline: { cap: 60 * 10, healthFloor: 40, statFloor: 8, maxMistakes: 2 },
};

export const FOODS = {
  onigiri: { name: 'Onigiri', kind: 'meal', cost: 0, hunger: 30, happy: 2, weight: 1, desc: 'A plain rice ball. Filling!' },
  apple: { name: 'Moon Apple', kind: 'snack', cost: 0, hunger: 8, happy: 8, weight: 0, desc: 'Crunchy and light.' },
  fish: { name: 'Star Fish', kind: 'meal', cost: 6, hunger: 45, happy: 10, weight: 1, desc: 'A hearty, happy meal.' },
  cake: { name: 'Cloud Cake', kind: 'snack', cost: 8, hunger: 10, happy: 25, weight: 3, desc: 'Pure joy. Very fattening.' },
  jelly: { name: 'Star Jelly', kind: 'snack', cost: 20, hunger: 20, happy: 20, weight: 1, energy: 25, hygiene: 10, desc: 'A shimmering cure-all treat.' },
};

export const HATS = {
  none: { name: 'No hat', cost: 0 },
  bow: { name: 'Ribbon Bow', cost: 15 },
  party: { name: 'Party Hat', cost: 25 },
  flower: { name: 'Daisy', cost: 20 },
  beanie: { name: 'Cozy Beanie', cost: 30 },
  crown: { name: 'Tiny Crown', cost: 60 },
  wizard: { name: 'Star Wizard Hat', cost: 90 },
};

export const WALLPAPERS = {
  lilac: { name: 'Lilac Dots', cost: 0 },
  mint: { name: 'Mint Stripes', cost: 20 },
  peach: { name: 'Peach Hearts', cost: 20 },
  night: { name: 'Starry Night', cost: 40 },
};

// Forms: visual + personality definitions. `mul` tweaks decay rates.
export const FORMS = {
  egg: { name: 'Moon Egg', stage: 'egg', hint: 'Where every moonling begins.' },
  pip: {
    name: 'Pip', stage: 'baby', hint: 'A brand new baby.',
    lore: 'Tiny, wobbly and curious about absolutely everything.',
    phrases: ['pip!', 'pip pip?', '♪', 'mama?', '*wobble*'],
  },
  mochi: {
    name: 'Mochi', stage: 'child', hint: 'Raise a baby with few care mistakes.',
    lore: 'A soft, squishy child raised with lots of love.',
    phrases: ['mochi~', 'hehe', '♪♪', 'play?', 'yay!'],
  },
  grumble: {
    name: 'Grumble', stage: 'child', hint: 'Make several care mistakes with a baby.',
    lore: 'A bit prickly on the outside. Still wants a hug.',
    phrases: ['hmph.', 'grr...', 'whatever', '...hi', 'hmm'],
  },
  starling: {
    name: 'Starling', stage: 'adult', hint: 'Perfect care: no mistakes and happy days.',
    lore: 'Glows with borrowed starlight. Said to be a messenger of the moon.',
    phrases: ['✦ shine ✦', 'the stars say hi', 'twinkle~', 'I feel so light!'],
    mul: { hunger: 0.9, happy: 0.9, energy: 0.9, hygiene: 0.9 },
  },
  bunbun: {
    name: 'Bunbun', stage: 'adult', hint: 'Play games with it a lot as a child.',
    lore: 'Has springs where its feet should be. Cannot sit still.',
    phrases: ['boing!', 'again! again!', 'hop hop', 'catch me!'],
    mul: { energy: 1.25, happy: 0.8 },
  },
  chonk: {
    name: 'Chonk', stage: 'adult', hint: 'Spoil it with snacks...',
    lore: 'Round, proud and always thinking about cake.',
    phrases: ['snack?', 'nom nom', 'cake...?', 'i am round', 'burp'],
    mul: { hunger: 1.25, energy: 0.85 },
  },
  sprout: {
    name: 'Sprout', stage: 'adult', hint: 'Balanced, decent care.',
    lore: 'A calm moonling with a leaf that turns toward the sun.',
    phrases: ['photosynthesizing', 'ahh, sun', 'grow grow', 'nice day'],
    mul: { hygiene: 0.7 },
  },
  gloom: {
    name: 'Gloom', stage: 'adult', hint: 'Grows from neglect. Be kinder next time.',
    lore: 'Carries a little rain cloud of its own. Secretly very sweet.',
    phrases: ['...', 'it\'s raining again', 'sigh', 'do you care?'],
    mul: { happy: 1.3 },
  },
  prism: {
    name: 'Prism', stage: 'adult', hint: 'Secret! Shower a child with pets and affection.',
    lore: 'Refracts love into rainbows. Extremely rare.',
    phrases: ['✧ ♡ ✧', 'love you!', 'rainbows!', 'purr~'],
    mul: { happy: 0.7 },
  },
};

export const FORM_ORDER = ['egg', 'pip', 'mochi', 'grumble', 'starling', 'bunbun', 'chonk', 'sprout', 'gloom', 'prism'];

export const NAMES = ['Nori', 'Luma', 'Pebble', 'Tofu', 'Miso', 'Kiki', 'Boba', 'Yuzu', 'Momo', 'Pico', 'Sumi', 'Toast', 'Fig', 'Bean', 'Juniper', 'Quill', 'Dumpling', 'Nova', 'Wisp', 'Taro'];
