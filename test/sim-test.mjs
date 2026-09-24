import { createGame, tick, act, catchUp, mood, avgCare, serialize, deserialize } from '../js/sim.js';
import { CONFIG } from '../js/config.js';

function mulberry32(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

let failures = 0;
const check = (cond, msg) => { console.log(`${cond ? '  ok ' : ' FAIL'} ${msg}`); if (!cond) failures++; };

// A caretaker bot: `style` decides how it looks after the pet.
function run(style, seconds, seed = 1) {
  const rng = mulberry32(seed);
  const g = createGame(rng);
  const log = [];
  for (let t = 0; t < seconds; t += 5) {
    for (const e of tick(g, 5, {}, rng)) if (['hatch', 'evolve', 'death', 'sick', 'mistake'].includes(e.type)) log.push(`${Math.round(g.pet.age)}s ${e.type}${e.to ? ':' + e.to : ''}${e.need ? ':' + e.need : ''}`);
    if (g.pet.dead) break;
    const p = g.pet, s = p.stats;
    if (style === 'neglect') continue;
    if (p.sleeping && p.lightsOn) act(g, 'lights');
    if (!p.sleeping && !p.lightsOn) act(g, 'lights');
    if (p.sick) act(g, 'medicine');
    if (p.poops.length || s.hygiene < 50) act(g, 'clean');
    if (style === 'lazy' && Math.floor(t / 60) % 3 !== 0) continue; // only attends one minute in three
    if (s.hunger < 55) {
      if (style === 'snacks') { g.meta.coins += 16; act(g, 'feed', 'cake', rng); act(g, 'feed', 'cake', rng); act(g, 'feed', 'onigiri', rng); }
      else act(g, 'feed', 'onigiri', rng);
    }
    const wantsPlay = style === 'play' ? s.happy < 90 : s.happy < 55;
    if (wantsPlay && act(g, 'canPlay').ok) act(g, 'play', { game: 'catch', score: 10, coins: 5, won: true });
    if (style === 'pets' || s.happy < 50) act(g, 'pet');
    if (style === 'pets') { tick(g, 1.3, {}, rng); act(g, 'pet'); }
  }
  return { g, log };
}

console.log('\n# egg hatches');
{ const rng = mulberry32(3); const g = createGame(rng); const ev = tick(g, CONFIG.stageEnd.egg + 0.5, {}, rng);
  check(ev.some(e => e.type === 'hatch') && g.pet.form === 'pip', `hatched into ${g.pet.form}`); }

console.log('\n# poop follows a meal');
{ const rng = mulberry32(4); const g = createGame(rng); tick(g, 30, {}, rng); act(g, 'feed', 'onigiri', rng);
  const ev = tick(g, 90, {}, rng); check(ev.some(e => e.type === 'poop') && g.pet.poops.length === 1, `poops: ${g.pet.poops.length}`); }

for (const style of ['good', 'play', 'snacks', 'pets', 'lazy']) {
  console.log(`\n# ${style} care for 20 min`);
  const { g, log } = run(style, 1200, 7);
  const p = g.pet;
  console.log('   ', log.join(' | '));
  console.log(`    form=${p.form} stage=${p.stage} alive=${!p.dead} mood=${mood(p)} weight=${p.weight} mistakes=${p.totalMistakes} health=${p.stats.health.toFixed(0)} coins=${g.meta.coins}`);
  check(!p.dead && p.stage === 'adult', `${style}: alive adult`);
}

console.log('\n# expected evolutions');
check(run('good', 1200, 7).g.pet.form === 'starling', 'good care -> starling');
check(run('play', 1200, 7).g.pet.form === 'bunbun', 'play-heavy -> bunbun');
check(run('snacks', 1200, 7).g.pet.form === 'chonk', 'snacks -> chonk');
check(run('pets', 1200, 7).g.pet.form === 'prism', 'lots of pets -> prism');
check(['gloom', 'sprout'].includes(run('lazy', 1200, 7).g.pet.form), `lazy -> ${run('lazy', 1200, 7).g.pet.form}`);

console.log('\n# full neglect');
{ const { g, log } = run('neglect', 3600, 9); console.log('   ', log.join(' | '));
  check(g.pet.dead, `died of ${g.pet.cause} at ${Math.round(g.pet.age)}s`);
  check(g.pet.age > 600, 'survives at least 10 minutes of neglect'); }

console.log('\n# offline catch-up of 24h never kills');
for (let seed = 1; seed <= 30; seed++) {
  const rng = mulberry32(seed); const { g } = run('good', 400, seed);
  const r = catchUp(g, 86400, rng);
  if (g.pet.dead) { check(false, `seed ${seed} died offline`); break; }
  if (seed === 30) check(true, `30 seeds survive; last: mood=${mood(g.pet)} health=${g.pet.stats.health.toFixed(0)} hunger=${g.pet.stats.hunger.toFixed(0)} simulated=${r.simulated}s mistakes=${g.pet.totalMistakes}`);
}

console.log('\n# being away never evolves the pet or scores care');
for (const [secs, stage] of [[20, 'egg'], [200, 'baby'], [800, 'child']]) {
  const rng = mulberry32(5); const { g } = run('good', secs, 5);
  const before = { stage: g.pet.stage, care: g.pet.care.time };
  catchUp(g, 86400, rng);
  check(g.pet.stage === before.stage && g.pet.care.time === before.care, `${stage}: still ${g.pet.stage} after a day away (age ${Math.round(g.pet.age)})`);
  const ev = tick(g, 5, {}, rng);
  check(g.pet.stage !== before.stage || g.pet.sleeping, `${stage}: grows up within seconds of returning -> ${g.pet.form}`);
}

console.log('\n# save roundtrip');
{ const { g } = run('good', 300, 2); const back = deserialize(serialize(g)); check(back && back.pet.form === g.pet.form && back.meta.coins === g.meta.coins, 'roundtrip'); }

console.log(failures ? `\n${failures} FAILED` : '\nall passed');
process.exit(failures ? 1 : 0);
