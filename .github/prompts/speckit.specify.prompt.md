```prompt
---
agent: speckit.specify
---
# Project Specification - Meiser's Market

## Project Overview
Meiser's Market is a GitHub Pages gaming site hosting multiple JavaScript-based games. It features a central homepage with links to each game, and each game features playable characters (Calvin and Bailey) with persistent high score tracking via localStorage.

## Site Structure
- **Homepage** (`index.html`): Central hub linking to all games
- **Flappy Family** (`flappyFamily/`): Flappy Bird-style game
- **CactoCrash** (`CactoCrash/`): Chrome Dino-style endless runner
- **Shared Assets** (`assets/`): Character sprites, backgrounds, sounds
- **Shared CSS** (`css/style.css`): Unified menu/UI styling used by all games

## Homepage Requirements
- [ ] Card-style links to each game with icons and labels
- [ ] Purple gradient background matching game menus
- [ ] Glass-morphism card design with hover effects
- [ ] Responsive layout

## Shared UI/Menu Requirements (applies to ALL games)
- [ ] Dark semi-transparent overlay with backdrop blur for menus
- [ ] Character selection with Calvin and Bailey avatar buttons
- [ ] High score display per character on main menu (yellow text, #ffeb3b)
- [ ] How to Play instructions section with rounded background
- [ ] Home button linking back to https://danmeiser.github.io/
- [ ] Gradient primary buttons, white-bordered secondary buttons
- [ ] Bounce animation on title, slide-in animation on character cards
- [ ] Consistent styling via shared css/style.css
- [ ] Game-specific overrides in local style.css only for container dimensions

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
- [ ] Container sized to match Flappy Family (600px max-width, aspect-ratio 1/1.5)
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
- [ ] Web Audio API for sound (mobile-compatible with AudioContext unlock on first user gesture)
- [ ] LocalStorage for high score persistence (per-character, per-game)
- [ ] Asset loading with error handling
- [ ] 60 FPS target framerate
- [ ] Responsive canvas sizing
- [ ] GitHub Pages deployment ready
- [ ] Cache-busting via query string versioning on CSS/JS files

##  Cannon Ball Feature Requirements

### Core Gameplay
- [ ] Block breaking game where you have a platform you move left and right to bounce a ball and break blocks at the top of the screen
- [ ] Multiple levels with increasing difficulty (more blocks, faster ball)
- [ ] Power-ups that drop from blocks (expand platform, extra life, multi-ball)
- [ ] Score tracking and high score persistence per character via localStorage
- [ ] Game over state and restart functionality
- [ ] Responsive design for desktop and mobile browsers
- [ ] High scores displayed separately for each character (Calvin and Bailey) on main menu and game over screen


### User Interface
- [ ] Main menu with character selection (Calvin and Bailey) -- identical style to Flappy Family
- [ ] Container sized to match Flappy Family (600px max-width, aspect-ratio 1/1.5)
- [ ] In-game HUD (score display)
- [ ] Game over screen with score and best
- [ ] Main Menu button navigates to homepage

### Characters
- [ ] Calvin and Bailey using first sprite frame only (no flap animation cycling)
- [ ] Same preview images as Flappy Family

### Controls
- [ ] left/right arrow keys or A/D to move platform
- [ ] Touch controls for mobile

## Technical Requirements
- [ ] Vanilla JavaScript (no frameworks)
- [ ] HTML5 Canvas rendering
- [ ] Web Audio API for sound (mobile-compatible with AudioContext unlock on first user gesture)
- [ ] LocalStorage for high score persistence (per-character, per-game)
- [ ] Asset loading with error handling
- [ ] 60 FPS target framerate
- [ ] Responsive canvas sizing
- [ ] GitHub Pages deployment ready
- [ ] Cache-busting via query string versioning on CSS/JS files


## File Structure

    index.html                  # Homepage with game links
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
6. Mobile browsers can play (touch input and audio work)
7. Both game menus look visually identical (shared CSS)
8. Homepage provides clear navigation to all games
```
