```prompt
---
agent: speckit.analyze
---
# Game Analysis

## Current State
- **Game Type**: JavaScript Canvas-based multi-game site
- **Build Status**: No build required - direct HTML/JS/CSS
- **Deployment**: GitHub Pages compatible
- **Games**: 6 complete — Flappy Family, CactoCrash, Cannon Ball, Minefield, Pac Family, Family Fling
- **In Development**: SpaceGame (I.S.S. Meiser) — side-scrolling spaceship management

## Technical Stack
- **Frontend**: HTML5, CSS3, Vanilla JavaScript (ES6+)
- **Rendering**: Canvas API
- **Physics**: Custom gravity/velocity simulation
- **Storage**: LocalStorage for high scores (per-character, per-game)
- **Audio**: Web Audio API (AudioContext, unlocked on first user gesture)

## Key Components

### Existing Games
1. **Bird** — Player character with physics and animations (Flappy Family)
2. **Pipe** — Obstacles with random positioning (Flappy Family)
3. **Runner** — Self-contained CactoCrash engine
4. **cannonball.js** — Self-contained Cannon Ball engine
5. **minefield.js** — Self-contained Minefield engine
6. **pacfamily.js** — Self-contained Pac Family engine (maze, BFS ghost AI)
7. **familyfling.js** — Self-contained Family Fling engine

### SpaceGame
- **tilesheet.js**: Named TILES map for `platformPack_tilesheet.png` (1472×720, 104×104 tiles)
- **spacegame-renderer.js**: All drawing — Station, Player, Game prototype methods
- **spacegame-movement.js**: Physics, collision, camera, walls
- **spacegame-events.js**: Input, alien attacks, resource events
- **spacegame.js**: Entry point, image loading (`platformerPack_character.png`, `platformPack_tilesheet.png`)
- **tileinspector.html**: Dev tool to browse tile coordinates
- **charinspector.html**: Dev tool to browse character sprite frames

## SpaceGame Rendering State
- `BG_TS = 52` — uniform tile draw size everywhere
- Room background: `TILES.roomBg` tiled wall-to-wall
- Ceiling: `TILE_CEIL` array (left/mid/right variants)
- Floor + mid-floor: `TILES.floor` tiled
- Ladders: `TILE_LADDER` tiled vertically
- Walls: `TILES.wall` tiled vertically in 40px-wide bulkheads
- Doors: `TILES.doorTop/doorBottom` at `BG_TS×BG_TS` square
- Stations: `TILES.redButton` at `BG_TS×BG_TS`, positioned above floor
- Cozy station: `TILES.greenButton` at `BG_TS×BG_TS`, upper room
- Porthole windows: commented out (pending sprite)
- Room decor: commented out (pending sprite replacements)

## Performance Metrics
- Target: 60 FPS
- Canvas size: Responsive (600px max-width, 1:1.5 aspect ratio default)
- Pac Family uses 1:1.22 aspect ratio to fit 19×21 maze

## Known Limitations / Next Steps
- SpaceGame room decor (airlock, farm, command, engine, lifesup) is commented out — needs sprite-based rebuild
- SpaceGame porthole windows commented out — needs window sprite tile
- SpaceGame not yet listed on games hub card list
- No particle effects or advanced animations
```