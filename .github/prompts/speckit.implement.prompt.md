```prompt
---
agent: speckit.implement
---
# Implementation Guide - Flappy Family

## Code Organization Pattern

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

### Asset Management Pattern
```
AssetLoader
├── Image preloading with fallbacks
├── Sound preloading with error handling
├── Asset caching
└── Lazy loading capability
```

### Physics Implementation
```
Bird Physics
├── Gravity constant (0.6)
├── Jump power (-12 velocity)
├── Terminal velocity (10)
├── Rotation angle based on velocity
└── Collision bounding box
```

## Module Import Order
1. `utils.js` - Asset loader, score manager, helpers
2. `bird.js` - Bird class definition
3. `pipe.js` - Pipe class definition
4. `game.js` - Game class and initialization

## Key Patterns to Follow

### Adding New Features
1. Define constants at top of game.js
2. Add state to Game constructor
3. Implement update logic in Game.update()
4. Implement render logic in Game.draw()
5. Add event listeners in setupEventListeners()

### Collision Detection
- Use AABB (Axis-Aligned Bounding Box) method
- `bird.collidesWith(rect)` for simple checks
- `pipe.checkCollision(bird)` for pipe collisions
- Always check both X and Y overlap

### Save/Load Functionality
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