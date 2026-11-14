# Starhaul

An incremental space game for your phone's browser.

You start with one hauler and a homeworld called Haven. Send ships to the
planets around it, mine them, bring the cargo home and grow from a lonely
outpost into a star empire.

**Play:** https://yukitarogames.github.io/Spaceships/

## How it plays

- **Tap planets** on the map to mine them by hand.
- **Build ships** and assign them to planets. Each one flies out, mines and
  hauls its cargo home on its own.
- **Survey new worlds** – Ferra (ore), Glacia (ice), Prisma (crystal),
  Nimbus (gas), Cinder (plasma) and Umbra (dark matter).
- **Upgrade** outposts, cargo bays, thrusters and mining lasers.
- **Develop Haven**: habitats, a refinery, research labs, a fleet academy
  and more, then advance through the eras from Outpost to Star Empire.
- **Research** breakthroughs, catch comets, follow the mission chain and
  earn achievements.
- **Warp** to a new system once you are a Star Empire to earn Stardust and
  permanent Legacy perks.

Progress saves automatically in the browser, and your fleets keep hauling
while you are away. You can export or import a save code from Settings, and
add the page to your home screen to play it full screen.

## Code

Plain HTML, CSS and JavaScript with no build step and no dependencies.

| File | What it does |
| --- | --- |
| `index.html`, `style.css` | Page shell and mobile-first layout |
| `js/data.js` | All game content and balance numbers |
| `js/game.js` | Game state and rules (no DOM access) |
| `js/render.js` | Canvas star map: planets, ships, effects |
| `js/ui.js` | Resource bar, tabs, modals, toasts |
| `js/audio.js` | Synthesized sound effects |
| `js/main.js` | Boot, main loop, saving |

To run it locally, serve the folder with any static server, for example
`python3 -m http.server`, and open the address it prints.
