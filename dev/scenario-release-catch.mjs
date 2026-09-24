// Release -> new egg -> death still shows farewell; Star Catch runs to its end screen.
const clip = { x: 60, y: 300, width: 400, height: 340 };
export default async ({ page }) => {
  await page.size(520, 1000, 2);
  await page.goto('http://localhost:8000/', 1500);
  await page.eval(`document.querySelector('[data-ok]')?.click(); moonling.noSave(); moonling.game.pet.named = true; moonling.tick(26)`);
  await page.sleep(2200);
  // Star Catch to completion
  await page.eval(`document.querySelector('.act[data-act=play]').click()`);
  await page.sleep(200);
  await page.eval(`document.querySelector('[data-pick=catch]').click()`);
  for (let i = 0; i < 64; i++) { await page.move(60 + (i * 47) % 240, 200); await page.sleep(500); if (i === 62) await page.shot('/tmp/rc-catch-end.png', clip); }
  await page.sleep(3000);
  console.log('after catch:', await page.eval(`JSON.stringify({coins: moonling.game.meta.coins, best: moonling.game.meta.best, plays: moonling.game.pet.care.plays})`));
  // release, then kill the next pet: farewell must still appear
  await page.eval(`moonling.game.meta.coins; document.querySelector('.mini[data-open=settings]').click()`);
  await page.sleep(300);
  await page.eval(`document.querySelector('[data-act=release]').click()`);
  await page.sleep(300);
  await page.eval(`document.querySelector('[data-v="1"]').click()`);
  await page.sleep(4200);
  console.log('after release:', await page.eval(`moonling.game.pet.stage + ' gen ' + moonling.game.pet.generation + ' memorial ' + moonling.game.meta.memorial.length`));
  await page.eval(`moonling.game.pet.named = true; moonling.tick(26)`);
  await page.sleep(2500);
  await page.eval(`moonling.game.pet.stats.health = 0.5; moonling.game.pet.stats.hunger = 0; moonling.tick(3)`);
  await page.sleep(3500);
  console.log('death dialog:', await page.eval(`document.querySelector('#modal-card h2')?.textContent`));
};
