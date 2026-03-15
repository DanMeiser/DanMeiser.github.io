```prompt
---
agent: speckit.constitution
---
# Project Constitution

This file outlines the non-negotiable rules, principles, and constraints for the Meiser's Market gaming site.

## Core Principles

- **Technology Stack**: Exclusively vanilla **JavaScript (ES6+)** and **Canvas API**. No build step. No frameworks.
- **GitHub Pages Compatible**: All assets and code statically served. Asset paths must be relative.
- **No External Frameworks**: No game engines or complex libraries beyond vanilla JS.
- **Coding Style**: ES6+ conventions, meaningful names, clear separation of concerns.
- **Performance**: Target 60 FPS. Optimize rendering and physics.
- **NEVER use `ctx.roundRect()`** — always use a custom `roundRect(x, y, w, h, r)` helper built with `arcTo()` for cross-browser compatibility.

## File Structure

```
index.html                  — site homepage
games/index.html            — games hub
css/style.css               — shared UI/menu styles
assets/                     — shared character sprites, sounds
<GameName>/
  index.html
  <gamename>.js             — self-contained engine (or split files)
  style.css
SpaceGame/
  index.html
  tilesheet.js              — TILES named coordinate map
  spacegame-movement.js
  spacegame-events.js
  spacegame-renderer.js
  spacegame.js              — entry point
  tileinspector.html        — dev tool
  charinspector.html        — dev tool
  assets/
    platformPack_tilesheet.png
    platformerPack_character.png
```

## Viewport / Container Rules
- Desktop: `width: min(600px, 66.667vh)`, `aspect-ratio: 1/1.5`
- Mobile (`max-width: 600px`): `width: 100vw`, `height: 100vh` then `height: 100dvh` (dvh MUST come after vh)
- `aspect-ratio: auto`, no border on mobile

## SpaceGame-Specific Rules
- All tile draws use `BG_TS = 52` destination size, `TILE_W = TILE_H = 104` source crop
- Every named sprite coordinate lives in `TILES` in `tilesheet.js` — no bare `sx/sy` literals in renderer unless unavoidable
- Script load order must be: `tilesheet.js → spacegame-movement.js → spacegame-events.js → spacegame-renderer.js → spacegame.js`
- Commented-out procedural drawing code stays inside `/* */` blocks until replaced by sprites
- Use `tileinspector.html` (dev server port 3000) to locate tile coordinates before naming them

## Git / Commit Rules
- Every completed task must have its own commit
- Follow the project's defined commit message template

Any deviation from this constitution requires explicit documentation.
```