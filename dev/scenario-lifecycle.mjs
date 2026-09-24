// Visual walkthrough: evolution, shop, journal, sickness, settings, death.
// run: node dev/cdp.mjs dev/scenario-lifecycle.mjs  (with the dev server on :8000)
const clip = { x: 60, y: 300, width: 400, height: 340 };
const out = name => `/tmp/life-${name}.png`;

export default async ({ page }) => {
  await page.size(520, 1000, 2);
  await page.goto('http://localhost:8000/', 1500);
  await page.eval(`document.querySelector('[data-ok]')?.click(); moonling.game.pet.named = true; moonling.tick(26); moonling.game.meta.coins = 120;`);
  await page.sleep(2200);

  await page.eval(`moonling.game.pet.age = 239; moonling.tick(2)`);
  await page.sleep(1700);
  await page.shot(out('evolving'), clip);
  await page.sleep(2500);
  await page.shot(out('evolved'));
  await page.eval(`document.querySelector('[data-ok]')?.click()`);

  await page.eval(`document.querySelector('.mini[data-open=shop]').click()`);
  await page.sleep(400);
  await page.eval(`document.querySelector('[data-buy=crown]').click()`);
  await page.sleep(300);
  await page.shot(out('shop'));
  await page.eval(`document.querySelector('[data-close]').click()`);

  await page.eval(`document.querySelector('.mini[data-open=journal]').click()`);
  await page.sleep(400);
  await page.shot(out('journal'));
  await page.eval(`document.querySelector('[data-close]').click()`);

  await page.eval(`const p = moonling.game.pet; p.sick = 1; p.stats.happy = 8; p.stats.hunger = 15; p.poops = [{x:0.2,t:0},{x:0.8,t:0}]`);
  await page.sleep(2500);
  await page.shot(out('sick'), clip);

  await page.eval(`document.querySelector('.mini[data-open=settings]').click()`);
  await page.sleep(400);
  await page.shot(out('settings'));
  await page.eval(`document.querySelector('[data-close]').click()`);

  await page.eval(`moonling.game.pet.stats.health = 0.5; moonling.game.pet.stats.hunger = 0; moonling.tick(3)`);
  await page.sleep(3500);
  await page.shot(out('death'));
  await page.eval(`document.querySelector('[data-ok]')?.click()`);
  await page.sleep(800);
  await page.shot(out('newegg'), clip);
};
