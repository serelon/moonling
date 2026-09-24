// Screenshot every adult form in the room, plus the evolution flash.
const clip = { x: 60, y: 300, width: 400, height: 340 };
export default async ({ page }) => {
  await page.size(520, 1000, 2);
  await page.goto('http://localhost:8000/', 1500);
  await page.eval(`document.querySelector('[data-ok]')?.click(); moonling.noSave(); moonling.game.pet.named = true; moonling.tick(26)`);
  await page.sleep(2000);
  await page.eval(`moonling.game.pet.age = 239; moonling.tick(2)`);
  await page.sleep(2400);
  await page.shot('/tmp/forms-flash.png', clip);
  await page.sleep(2500);
  await page.eval(`document.querySelector('[data-ok]')?.click()`);
  const hats = { starling: 'wizard', bunbun: 'flower', chonk: 'crown', sprout: 'none', gloom: 'beanie', prism: 'bow' };
  for (const f of Object.keys(hats)) {
    await page.eval(`Object.assign(moonling.game.pet, { form: '${f}', stage: 'adult' }); moonling.game.meta.hat = '${hats[f]}'; Object.assign(moonling.game.pet.stats, {hunger: 90, happy: 95, energy: 90, hygiene: 95});`);
    await page.sleep(1600);
    await page.shot(`/tmp/forms-${f}.png`, clip);
  }
};
