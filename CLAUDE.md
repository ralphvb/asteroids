# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Running

No build, no dependencies, no package.json, no tests, no linter. Open `index.html` directly
in a browser, or serve the directory:

```bash
npx serve .   # then http://localhost:3000
```

There is no test or lint command to run — verification is done by playing the game in a browser.

## Architecture

The entire game is `game.js` (~420 lines), split by `// ── Name ──` banner comments into:
input, utils, entity classes (`Bullet`, `Asteroid`, `Ship`, `Particle`), module-level game
state, `update(dt)`, `draw()`, and the main loop. `index.html` only provides the fixed
800×600 canvas and page styling; `W`/`H` in `game.js` are hardcoded to match it.

Frame pipeline: `loop(ts)` computes `dt` in seconds, clamped to 0.05 to survive tab
backgrounding, then calls `update(dt)` and `draw()`. All speeds/accelerations are per-second
units, so anything moving must be scaled by `dt`.

Game state is a set of module-level `let`s (`ship`, `bullets`, `asteroids`, `particles`,
`score`, `lives`, `level`, `state`) reset by `initGame()`. `state` is a small machine —
`'playing' | 'dead' | 'gameover'` — and `update()` early-returns down a different branch for
each.

### Entity conventions

Every entity class follows the same contract: `update(dt)`, `draw()`, and a `dead` boolean.
Entities read the module-level `ctx`, `W`, and `H` globals rather than receiving them as
arguments. Any class using canvas transforms brackets them in `ctx.save()`/`ctx.restore()`.

Positions wrap toroidally through `wrap()` on every update. Reuse the existing helpers
`wrap`, `dist`, `rand`, `randInt` rather than reimplementing them.

### Spawning and despawning

Entities are never spliced mid-loop. Instead they set `dead = true`, arrays are rebuilt with
`.filter(e => !e.dead)` once per frame, and newly spawned entities are collected into a temp
array and concatenated after the collision loop finishes — see `game.js:324-337`.

## Gotchas

- `RADII`, `SPEEDS`, `POINTS` (`game.js:61-63`) are indexed by asteroid size 1–3 with a dummy
  `0` slot. Adding a size means editing all three in lockstep.
- `pressed(code)` consumes its flag on read, so a given key must be checked exactly once per
  frame. Held-key actions (rotate, thrust) use `keys[code]` directly instead.
- Ship/asteroid collision multiplies the asteroid radius by `0.82` (`game.js:342`) — a
  deliberate fudge to make near-misses feel fair. Bullet/asteroid collision uses the full radius.
- Tuning constants are inline `const`s at their point of use (`ROT`, `THRUST`, `DRAG` in
  `Ship.update`; `SPEED` in the `Bullet` constructor). There is no central config object.

## Conventions

UI text and code comments are in Spanish (`NIVEL`, `PUNTAJE: …`, `ESPACIO PARA REINICIAR`).
Match that when adding either. Rendering is vector-style: white strokes on black, no images
or sprites.

Note: the README advertises power-ups and an "estrella fugaz" asteroid type. Neither exists
in `game.js` — treat them as unimplemented.
