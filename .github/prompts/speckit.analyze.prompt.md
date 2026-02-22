```prompt
---
agent: speckit.analyze
---
# Game Analysis

## Current State
- **Game Type**: JavaScript Canvas-based multi-game site
- **Build Status**: No build required - direct HTML/JS/CSS
- **Deployment**: GitHub Pages compatible
- **Status**: 5 games complete — Flappy Family, CactoCrash, Cannon Ball, Minefield, Pac Family

## Technical Stack
- **Frontend**: HTML5, CSS3, Vanilla JavaScript (ES6+)
- **Rendering**: Canvas API
- **Physics**: Custom gravity/velocity simulation (Flappy, CactoCrash)
- **Storage**: LocalStorage for high scores (per-character, per-game)
- **Audio**: Web Audio API (AudioContext, unlocked on first user gesture)

## Key Components
1. **Bird** — Player character with physics and animations (Flappy Family)
2. **Pipe** — Obstacles with random positioning (Flappy Family)
3. **Game** — Main game loop and state management (Flappy Family)
4. **Utils** — AssetLoader (Web Audio API) and ScoreManager (Flappy Family)
5. **Runner** — Self-contained CactoCrash engine
6. **cannonball.js** — Self-contained Cannon Ball engine
7. **minefield.js** — Self-contained Minefield engine
8. **pacfamily.js** — Self-contained Pac Family engine (maze, BFS ghost AI)

## Performance Metrics
- Target: 60 FPS
- Canvas size: Responsive (600px max-width, 1:1.5 aspect ratio default)
- Pac Family uses 1:1.22 aspect ratio to fit 19×21 maze

## Known Limitations
- No particle effects or advanced animations yet
- No mobile touch optimization

## Next Steps for Enhancement
1. Pac Family: add sound effects for power pellets and fruit
2. Pac Family: animate score pop-ups when eating ghosts (+200)
3. Game-wide: add more character variety or unlockable skins
4. Game-wide: leaderboard / cross-character comparison screen
5. Accessibility: keyboard focus trapping and ARIA labels for menus

```