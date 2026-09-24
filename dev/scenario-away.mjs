// Offline catch-up, sleeping, petting via real clicks, wallpaper, and mobile layout.
const clip = { x: 60, y: 300, width: 400, height: 340 };
const out = name => `/tmp/away-${name}.png`;

export default async ({ page }) => {
  await page.size(520, 1000, 2);
  await page.goto('http://localhost:8000/', 1500);
  await page.eval(`document.querySelector('[data-ok]')?.click(); moonling.game.pet.named = true; moonling.tick(26)`);
  await page.sleep(2000);

  // pet it with real clicks (canvas centre-bottom is where the pet stands)
  const box = await page.eval(`(() => { const r = document.getElementById('cv').getBoundingClientRect(); return [r.left, r.top, r.width, r.height]; })()`);
  const [L, T, Wd, Ht] = box;
  const petAt = async () => { const x = await page.eval('moonling.actor.x'); return [L + x / 360 * Wd, T + 232 / 300 * Ht]; };
  for (let i = 0; i < 3; i++) { const [x, y] = await petAt(); await page.click(x, y); await page.sleep(1400); }
  console.log('pets:', await page.eval('moonling.game.pet.care.pets'), 'audio:', await page.eval(`typeof AudioContext`));
  await page.shot(out('petted'), clip);

  // sleeping with lights off, starry wallpaper
  await page.eval(`moonling.game.meta.wallpapers.push('night'); moonling.game.meta.wallpaper = 'night'; moonling.game.pet.stats.energy = 10; moonling.tick(1)`);
  await page.sleep(500);
  await page.eval(`document.querySelector('.act[data-act=lights]').click()`);
  await page.sleep(2500);
  await page.shot(out('asleep'), clip);

  // pretend we left 3 hours ago, reload
  await page.eval(`moonling.noSave(); moonling.game.pet.lightsOn = true; localStorage.setItem('moonling.save.v1', JSON.stringify({...moonling.game, savedAt: Date.now() - 3*3600*1000}));`);
  await page.goto('http://localhost:8000/', 2500);
  await page.shot(out('welcome'));
  await page.eval(`document.querySelector('[data-ok]')?.click()`);
  await page.sleep(1500);

  // mobile
  await page.size(375, 760, 2);
  await page.sleep(800);
  await page.shot(out('mobile'));
};
