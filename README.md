# Moonling ☾

A cozy Tamagotchi-style virtual pet for the browser. Little creatures fall from the moon as eggs, hatch, grow up according to how you care for them, and one day float back home.

No build step and no dependencies. Everything (art, music, sound) is generated in code.

## Run

```sh
npm start            # or: python3 -m http.server 8000
# open http://localhost:8000
```

(ES modules don't load over `file://`, so you need a local server.)

## How to play

| Button | What it does |
| --- | --- |
| **Feed** | Meals fill the tummy. Snacks make it happy but add weight. Fancy food costs moon coins. |
| **Play** | Three minigames: *Star Catch*, *Moon Hop*, *Which Way?*. They earn coins and happiness and burn weight. |
| **Clean** | Washes away poops. Leaving them around makes your moonling dirty and can make it sick. You can also click a single poop to flick it away. |
| **Lights** | Turn them off when it's sleepy. Sleeping with the lights on is a care mistake. |
| **Meds** | Cures sickness. Some colds need two doses. Don't give it medicine when it isn't sick! |

- **Tap your moonling** to pet it, but not *too* much.
- When it needs something, it calls you with a speech bubble. Ignore a call for too long and it counts as a **care mistake**.
- The whole life cycle is compressed: egg ≈ 25s → baby → child at 4 min → adult at 15 min.
- The window shows the real time of day, and the wall clock is real too.
- Closing the tab is safe. While you're away, needs keep dropping (it will be hungry and grumpy), but your moonling can't die or evolve without you.
- Settings has a **time flow** speed-up (2×, 5×, 20×) if you're impatient.

Keyboard: `1–5` actions · `J` journal · `S` shop · `Esc` close · `←/→/space` in games.

## Evolutions (spoilers)

<details>
<summary>10 forms to discover</summary>

- **Pip** (baby) → **Mochi** (few care mistakes) or **Grumble** (several mistakes)
- Adults:
  - **Starling**: a Mochi raised with zero mistakes and great care
  - **Bunbun**: lots of games as a child
  - **Chonk**: lots of snacks, or very heavy
  - **Sprout**: balanced, decent care
  - **Gloom**: neglect (many mistakes / low care)
  - **Prism** *(secret)*: shower a child with pets and affection
</details>

Coins buy hats and wallpapers in the shop. These carry over between generations, along with the journal and memories.

## Code map

```
js/config.js      all tuning numbers, foods, hats, forms
js/sim.js         pure simulation (no DOM), tested headlessly
js/creature.js    procedural vector art for every form, egg, poop, hats
js/scene.js       room, real-time sky, lights-off lighting
js/fx.js          particles, speech bubbles, food + icons
js/minigames.js   Star Catch, Moon Hop, Which Way?
js/audio.js       WebAudio sfx, babble voice, generative music box
js/ui.js          DOM helpers: HUD, toasts, panels, queued modals
js/screens.js     menus and dialogs (journal, shop, settings, …)
js/main.js        game loop, pet behaviour/animation, input, saving
```

## Tests

```sh
npm test   # headless balance tests: evolution paths, neglect, offline catch-up
```

`dev/` contains a tiny headless-Chromium driver (`dev/cdp.mjs`) with scripted visual walkthroughs, plus `dev/preview.html`, an art sheet of every form × expression.
