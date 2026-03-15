```prompt
---
agent: speckit.implement
---
# Implementation Guide

## Flappy Family / General Games Pattern

### Game Class Responsibilities
```
Game
├── State Management (menu, playing, paused, gameOver)
├── Event Handling (keyboard, mouse, touch)
├── Game Loop (update, draw)
├── Entity Management (bird, pipes)
├── Score Tracking
└── UI Updates
```

### Module Import Order (Flappy Family)
1. `utils.js` - Asset loader, score manager, helpers
2. `bird.js` - Bird class definition
3. `pipe.js` - Pipe class definition
4. `game.js` - Game class and initialization

### Key Patterns to Follow
- NEVER use `ctx.roundRect()` — always use custom `roundRect(x, y, w, h, r)` helper built with `arcTo()`
- Use AABB collision detection: check both X and Y overlap
- Save/load high scores via `localStorage` keyed per character per game

---

## SpaceGame Pattern

### Script Load Order
```
tilesheet.js → spacegame-movement.js → spacegame-events.js → spacegame-renderer.js → spacegame.js
```

### Rendering Rules
- All tile draws use `BG_TS = 52` for destination size, `TILE_W = TILE_H = 104` for source crop
- All named tiles live in `TILES` (tilesheet.js) — never hardcode `sx/sy` in renderer except for hardcoded door coords
- Station widgets (red button): `BG_TS × BG_TS`, positioned `fY - roomH*0.08 - BG_TS*1.5` from top
- Cozy station (green button): same sizing, `cY + (fY-cY)*0.28` from top
- Door tiles: exactly `BG_TS × BG_TS` square, centered on wall `bx`
- Walls tiled vertically in `ebw`-sized segments clipped to room height

### Adding a New Tile
1. Open `tileinspector.html` (localhost:3000/SpaceGame/tileinspector.html) to find coordinates
2. Add named entry to `TILES` in `tilesheet.js`
3. Reference via `TILES.myTile.sx / .sy` in renderer

### Adding a New Room Feature
1. Add draw logic to `drawRoom()` or a new `drawXxx()` method
2. Call from `Game.prototype.draw` in the correct layer order
3. Keep commented-out legacy procedural code inside `/* */` blocks until replaced by sprites
```
```javascript
// Save
ScoreManager.setHighScore(score);

// Load
const highScore = ScoreManager.getHighScore();
```

### Sound Playback
```javascript
// Play sound
AssetLoader.playSound('flap');

// Load new sound
await AssetLoader.loadSound('name', 'path/to/file.mp3');
```

## Common Tasks

### Adding a New Game State
1. Add to `GAME_STATE` object
2. Add case in `updateScreens()`
3. Add transition methods
4. Add state checks in input handlers

### Modifying Physics
- Adjust `GRAVITY` constant in Bird class
- Adjust `jumpPower` for flap strength
- Adjust `maxVelocity` for terminal velocity
- Test thoroughly after changes

### Creating New Assets
- Images: Place in `assets/` subdirectories
- Sounds: Use MP3 or WAV format
- Update asset paths in `loadAssets()`
- Test fallback behavior if asset missing

```