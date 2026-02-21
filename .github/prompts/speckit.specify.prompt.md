```prompt
---
agent: speckit.specify
---
# Project Specification - Meiser's Market

## Project Overview
Meiser's Market is a GitHub Pages gaming site hosting multiple JavaScript-based games. It features a central homepage with a link to the games page and that page serves as a hub with links to each game, and each game features playable characters (Calvin and Bailey) with persistent high score tracking via localStorage.

## Site Structure
- **Homepage** (`index.html`): Landing page with a single "Play Games" card linking to the games hub
- **Games Hub** (`games/index.html`): Lists all games as card links; includes a back link to `https://danmeiser.github.io/`
- **Flappy Family** (`flappyFamily/`): Flappy Bird-style game
- **CactoCrash** (`CactoCrash/`): Chrome Dino-style endless runner
- **Cannon Ball** (`CannonBall/`): Block-breaking paddle game
- **Minefield** (`Minefield/`): Minesweeper/character-style game
- **Shared Assets** (`assets/`): Character sprites, backgrounds, sounds
- **Shared CSS** (`css/style.css`): Unified menu/UI styling used by all games

## Homepage Requirements
- [ ] Single "Play Games" card linking to `games/`
- [ ] Purple gradient background matching game menus
- [ ] Glass-morphism card design with hover effects
- [ ] Responsive layout

## Games Hub Requirements (`games/index.html`)
- [ ] Card-style links to each game with icons and labels
- [ ] Same purple gradient background and glass-morphism card style as homepage
- [ ] "← danmeiser.github.io" back link at the bottom
- [ ] Responsive layout

## Shared UI/Menu Requirements (applies to ALL games)
- [ ] Dark semi-transparent overlay with backdrop blur for menus
- [ ] Character selection with Calvin and Bailey avatar buttons
- [ ] High score display per character on main menu (yellow text, #ffeb3b)
- [ ] How to Play instructions section with rounded background
- [ ] Home button linking to https://danmeiser.github.io/games/ (the games hub)
- [ ] Gradient primary buttons, white-bordered secondary buttons
- [ ] Bounce animation on title, slide-in animation on character cards
- [ ] Consistent styling via shared css/style.css
- [ ] Game-specific overrides in local style.css only for container dimensions

## Viewport / Container Sizing Rules (applies to ALL games)
- [ ] Desktop: `width: min(600px, 66.667vh)` with `aspect-ratio: 1/1.5` so the container height never exceeds 100vh
- [ ] Mobile (max-width 600px): `width: 100vw`, `height: 100vh` (fallback) then `height: 100dvh` (override) — `dvh` MUST be listed after `vh` so it wins on modern browsers
- [ ] `100dvh` (dynamic viewport height) prevents the mobile browser address bar from clipping the bottom of the game
- [ ] `aspect-ratio: auto` and no border on mobile
- [ ] NEVER use `ctx.roundRect()` — always use a custom `drawRoundRect(ctx, x, y, w, h, r)` helper built with `arcTo()` for cross-browser compatibility

## Flappy Family Feature Requirements

### Core Gameplay
- [ ] Bird character with gravity and flap mechanics
- [ ] Randomly generated pipe obstacles that start easy and increase in difficulty slowly
- [ ] Collision detection (pipes, ground, ceiling)
- [ ] Score tracking and high score persistence per character via localStorage
- [ ] Game over state and restart functionality
- [ ] Pause/resume gameplay
- [ ] Responsive design for desktop and mobile browsers
- [ ] High scores displayed separately for each character (Calvin and Bailey) on main menu and game over screen
- [ ] Custom background image (bg.png)

### User Interface
- [ ] Main menu with character selection (Calvin and Bailey)
- [ ] In-game HUD (score display)
- [ ] Pause menu with resume/quit options
- [ ] Game over screen with final scores and per-character high scores
- [ ] Main Menu button navigates to homepage

### Characters
- [ ] Calvin character with 3 sprite frames (calvin1-3.png), enlarged to 50x36 pixels
- [ ] Bailey character with 3 sprite frames (bailey1-3.png), enlarged to 50x36 pixels
- [ ] Slowed rotation speed (multiplier 0.8)
- [ ] Character preview images on menu buttons

### Controls
- [ ] SPACE to flap/confirm
- [ ] Click/Tap to flap
- [ ] P to pause/resume
- [ ] Q to quit (on game over)

## CactoCrash Feature Requirements

### Core Gameplay
- [ ] Endless runner with auto-scrolling ground
- [ ] Jump and duck mechanics
- [ ] Randomly generated obstacles (small cacti, large cacti, double cacti, flying obstacles)
- [ ] Gradual obstacle introduction based on current speed
- [ ] Collision detection with generous hitbox padding (10px)
- [ ] Score tracking and high score persistence per character via localStorage
- [ ] Game over state and restart functionality
- [ ] Difficulty ramp: speed starts at 1.5, max 10, increment 0.0005
- [ ] Obstacle gaps: 1500-2200ms, floor at 60% of original
- [ ] Gravity 0.5, jump power -11

### User Interface
- [ ] Main menu with character selection (Calvin and Bailey) -- identical style to Flappy Family
- [ ] Container sized per shared viewport rules above
- [ ] In-game HUD (score display)
- [ ] Game over screen with score and best
- [ ] Main Menu button navigates to homepage

### Characters
- [ ] Calvin and Bailey using first sprite frame only (no flap animation cycling)
- [ ] Same preview images as Flappy Family

### Controls
- [ ] SPACE / Tap to jump
- [ ] DOWN arrow / Swipe down to duck
- [ ] Touch controls for mobile

## Technical Requirements
- [ ] Vanilla JavaScript (no frameworks)
- [ ] HTML5 Canvas rendering
- [ ] NEVER use `ctx.roundRect()` — always use a `drawRoundRect(ctx, x, y, w, h, r)` helper with `arcTo()`
- [ ] Web Audio API for sound (mobile-compatible with AudioContext unlock on first user gesture)
- [ ] LocalStorage for high score persistence (per-character, per-game)
- [ ] Asset loading with error handling
- [ ] 60 FPS target framerate via `requestAnimationFrame`
- [ ] dt-based movement (multiply speeds by `dt/16`) for frame-rate independence
- [ ] Responsive canvas sizing via `resize()` reading `wrapper.clientWidth/clientHeight`
- [ ] GitHub Pages deployment ready
- [ ] Cache-busting via query string versioning on CSS/JS files

## Cannon Ball Feature Requirements

### Core Gameplay
- [ ] Block-breaking game: move paddle left/right to bounce a ball and break blocks
- [ ] Multiple levels with increasing difficulty (more block rows, higher HP blocks, faster ball)
- [ ] Ball bounce angle on paddle depends on where it hits (edge = shallow, center = steep)
- [ ] Power-ups drop from destroyed blocks: Expand Paddle (green W), Extra Life (red ♥), Multi-Ball (blue M)
- [ ] Power-up drop chance: 18% per block
- [ ] Score: 10 × level per block destroyed; 50 × level bonus on level clear
- [ ] High score persistence per character via localStorage (key: `cannonBall_best_<character>`)
- [ ] Lives system: starts at 3, max 5; lose a life when all balls fall off screen
- [ ] Game over when lives reach 0
- [ ] Level complete screen shown between levels
- [ ] Particle burst effect when a block is destroyed

### Difficulty Scaling (by level)
- [ ] Ball speed: 4 + (level - 1) × 0.4
- [ ] Block rows: min(4 + floor(level/2), 8)
- [ ] Block HP: level ≥ 3 → front rows get 2 HP; level ≥ 5 → top row gets 3 HP; level ≥ 7 → graduated HP
- [ ] Block colors cycle through 8-color palette per row

### User Interface
- [ ] Main menu with character selection (Calvin and Bailey) -- identical style to Flappy Family
- [ ] Container sized per shared viewport rules above
- [ ] In-game HUD: Score / Lives / Level in 3 pill badges at the top
- [ ] Game over screen with final score and personal best
- [ ] Level complete screen with current score and Next Level button
- [ ] LAUNCH state: ball rests on paddle; hint text shown; click/tap/SPACE launches
- [ ] Main Menu button navigates to homepage

### Characters
- [ ] Calvin and Bailey using first sprite frame only (calvin1.png / bailey1.png)
- [ ] Character sprite rendered centered above the paddle during gameplay
- [ ] Same preview images as Flappy Family on menu buttons

### Controls
- [ ] LEFT / RIGHT arrow keys or A / D to move paddle
- [ ] Mouse movement tracks paddle position (mousemove on canvas)
- [ ] Touch drag moves paddle; tap to launch ball
- [ ] SPACE or click canvas launches ball from LAUNCH state

### Visual Style
- [ ] Dark space background: linear gradient #1a1a2e → #16213e
- [ ] Subtle white grid overlay (opacity 0.03)
- [ ] Paddle: light grey with gloss gradient, white border always visible; green glow when expanded
- [ ] Ball: white circle with black outline and small shine dot
- [ ] Power-ups: pulsing colored circles with glow
- [ ] Blocks: per-row color, gloss gradient highlight, dark border; HP number shown on multi-hit blocks

## Minefield Feature Requirements
- [ ] Walk-based Minesweeper: character moves one tile at a time via directional controls
- [ ] Top-down view with 15×15 grid of tiles, 45 mines fixed (~20%)
- [ ] Player character starts **outside the left edge** of the grid and must walk in
- [ ] Mines are placed on the first in-grid step (safe zone: 3×3 around landing tile)
- [ ] Tiles can be safe or contain a mine; walking onto a mine results in game over
- [ ] Safe tiles display a number (1–8) indicating adjacent mines; 0 tiles auto-flood-reveal
- [ ] **F key** toggles persistent flag mode (desktop) — directional keys then flag the neighbor tile instead of moving; press F again to exit; Shift+Arrow works as a one-shot alternative
- [ ] Mobile: sticky 🚩 FLAG MODE toggle button — stays on until tapped again; swipes and D-pad both flag while active
- [ ] Cannot walk onto a flagged tile (flagged tiles must be unflagged first)
- [ ] Score = number of unique safe tiles revealed (including flood-revealed); max 180
- [ ] Win condition: all 180 safe tiles revealed
- [ ] High score persistence per character via localStorage (`minefield_best_<char>`)
- [ ] Game over reveals all mines; shows exploded tile in red
- [ ] Main menu with character selection (Calvin and Bailey) -- identical style to other games
- [ ] Container: `aspect-ratio: 1/1.2` override (slightly squarer than 1:1.5 to fit grid)
- [ ] In-game HUD: Score pill + Mines remaining pill
- [ ] Game over / Win screen with final score and personal best, reuse same div
- [ ] Mobile: on-screen D-pad (↑↓←→ + 🚩 FLAG toggle button) + swipe gesture support
- [ ] Visual style: dark space background (#1a1a2e → #16213e), classic Minesweeper number colours

## File Structure

    index.html                  # Landing page — single "Play Games" card
    games/
      index.html                # Games hub — all game card links + back to danmeiser.github.io
    css/style.css               # Shared menu/UI styles
    assets/                     # Shared character sprites, backgrounds, sounds
      calvin1-3.png, calvin_preview.png
      bailey1-3.png, bailey_preview.png
      bg.png, ground.png
      flap.mp3, hit.mp3, point.mp3
    flappyFamily/
      index.html                # Flappy Family game page
    js/
      game.js                   # Flappy Family game loop and logic
      bird.js                   # Bird class (physics, rendering)
      pipe.js                   # Pipe obstacle class
      utils.js                  # AssetLoader (Web Audio API) and ScoreManager
    CactoCrash/
      index.html                # CactoCrash game page
      runner.js                 # Complete CactoCrash game engine (self-contained)
      style.css                 # Local overrides for container dimensions only
    CannonBall/
      index.html                # Cannon Ball game page
      cannonball.js             # Complete Cannon Ball game engine (self-contained)
      style.css                 # Local overrides for container dimensions only
    Minefield/
      index.html                # Minefield game page
      minefield.js              # Complete Minefield game engine (self-contained, walk-based)
      style.css                 # aspect-ratio 1/1.2 + HUD pill + D-pad overrides

## Audio/Visual Polish
- [ ] Flap sound effect (flap.mp3)
- [ ] Hit sound effect (hit.mp3)
- [ ] Point/score sound effect (point.mp3)
- [ ] Web Audio API with silent buffer unlock for iOS/mobile
- [ ] Purple gradient background on body
- [ ] Animated UI transitions (bounce, slideIn, float)
- [ ] Visual hover states on all buttons

## Success Criteria
1. All games run smoothly at 60 FPS
2. All controls respond immediately
3. High scores persist between sessions per character per game
4. Site deploys to GitHub Pages without issues
5. Plays correctly on Chrome, Firefox, and Safari
6. Mobile browsers can play (touch input and audio work) — full game visible, nothing clipped by browser chrome
7. All game menus look visually identical (shared CSS)
8. Homepage provides clear navigation to all games
```
