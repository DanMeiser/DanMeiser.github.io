# Space Station Manager — SpecKit

**Version:** 1.1  
**Stack:** Vanilla JS ES6, HTML5 Canvas, CSS — no frameworks  
**Entry point:** `SpaceGame/index.html`

---

## Concept

Side-scrolling space station management game. The player walks an astronaut across a 5-room ship, interacts with station equipment, and keeps four life-support resources from hitting zero. Random events (alien attacks, reactor failures, crop blight) add pressure over time.

---

## File Structure

```
SpaceGame/
├── index.html          # Game shell, canvas, HUD, mobile controls
├── spacegame.js        # All game logic (~1060 lines)
├── style.css           # Layout, screens, mobile controls, safe-area
├── assets/
│   ├── platformerPack_character.png   # Character sprite sheet (384×192)
│   └── platformPack_tilesheet.png     # Environment tile sheet (1472×720)
├── charinspector.html  # Dev tool: browse character sprite frames
└── tileinspector.html  # Dev tool: browse tile sheet cells
```

---

## Sprite Sheets (Kenney Platformer Pack)

### Character Sheet — `platformerPack_character.png`
- **Dimensions:** 384 × 192 px  
- **Frame size:** 96 × 96 px per frame  
- **Grid:** 4 columns × 2 rows

| Row | sy  | Frames |
|-----|-----|--------|
| 0   | 0   | Walk col 0–3 |
| 1   | 96  | Idle (col 0), Turn (col 1), Think (col 2), Jump arm-up (col 3) |

**Active animation frame mappings:**

| State        | sx  | sy  | Notes |
|-------------|-----|-----|-------|
| Idle        | 0   | 96  | Standing still |
| Walk frame 1| 192 | 0   | 2-frame walk cycle |
| Walk frame 2| 288 | 0   | 2-frame walk cycle |
| Jump        | 288 | 96  | Arms-up frame (Row 1 col 3) |
| Interact    | 192 | 96  | Think frame while pressing E |

### Tile Sheet — `platformPack_tilesheet.png`
- **Dimensions:** 1472 × 720 px  
- **Tile size:** 104 × 104 px per tile

| Tile | sx  | sy  | Used for |
|------|-----|-----|----------|
| Floor | 312 | 312 | Floor strip along bottom of each room |
| Ceiling A | 0 | 208 | Ceiling tile variant 1 |
| Ceiling B | 104 | 208 | Ceiling tile variant 2 |
| Ceiling C | 208 | 208 | Ceiling tile variant 3 |

Ceiling tiles cycle across the room width (3-variant rotation). Floor tiles tile across the floor strip.

---

## Layout

```
Canvas height:  H
Ceiling line:   ceilY = H × 0.12
Floor line:     floorY = H × 0.76  (desktop)
                floorY = H × 0.68  (mobile, more room for controls)
Floor strip:    8% of roomH, anchored at floorY
```

The camera tracks the player horizontally with ease factor `CAM_EASE = 0.10`.

---

## Physics & Movement

| Constant      | Value | Description |
|--------------|-------|-------------|
| `GRAVITY`    | 0.48  | Downward acceleration per frame |
| `JUMP_VY`    | -10   | Initial vertical velocity on jump |
| `MOVE_SPD`   | 3.0   | Walk speed (px/frame) |
| `RUN_SPD`    | 6.0   | Run speed (px/frame) after double-tap |
| `PLAYER_SCALE` | 0.92 | Sprite scale factor (96 × 0.92 ≈ 88 px drawn) |
| `WALK_SPD`   | 7     | Canvas frames per walk sprite frame |
| `RUN_WALK_SPD` | 4   | Faster animation cadence when running |

**Running:** Double-tap left/right (within 280 ms) sets `keys.running = true`. Works on both keyboard and mobile controls.

---

## World & Rooms

| Constant    | Value | Description |
|------------|-------|-------------|
| `SHIP_ROOMS` | 5  | Number of rooms |
| `ROOM_PX`  | 500   | World pixels per room |
| `SHIP_W`   | 2500  | Total world width |

### Room Definitions

| # | ID | Label | Accent | Station | Resource |
|---|-----|-------|--------|---------|----------|
| 0 | airlock | Airlock | Blue `#4d9de0` | Defense Turret | hull |
| 1 | farm | Hydroponics | Green `#4caf50` | Grow Pods | food |
| 2 | command | Command Deck | Purple `#9b59b6` | Upgrade Console | credits |
| 3 | engine | Engine Room | Red `#e74c3c` | Reactor Core | power |
| 4 | lifesup | Life Support | Teal `#1abc9c` | O₂ Generator | o2 |

Rooms 0 and 4 (ends of ship) have porthole windows. Each room has a unique color theme, equipment decorations, and bulkhead separators with painted arch openings.

---

## Resources

Four survival resources, each depletes per frame:

| Resource | Base Depletion | Extra (broken station) |
|----------|---------------|------------------------|
| O₂       | 0.007 / frame | +0.012 |
| Power    | 0.005 / frame | +0.012 |
| Food     | 0.004 / frame | +0.012 |
| Hull     | (event-driven) | — |

**Game over** when any resource hits 0.

---

## Controls

### Keyboard
| Key | Action |
|-----|--------|
| ← / → | Walk left / right |
| ↑ / Space | Jump |
| E | Interact with station |
| Double-tap ← / → | Run |

### Mobile (HTML Overlay)
Four circular buttons in `#mobileControls`:
- `mcLeft` (◀), `mcRight` (▶), `mcUp` (▲), `mcAct` (E)
- Auto-shown when `'ontouchstart' in window`
- Double-tap mcLeft / mcRight triggers run
- Hidden when returning to menu

Mobile controls are an absolute-positioned HTML overlay (`z-index: 5`) at the bottom 17% of `#gameWrapper`. They use `touch-action: manipulation` and fire on both `touchstart` and `mousedown`.

---

## Visual Rendering Pipeline

Each frame `draw()` calls:

1. `drawSpaceBg()` — star field + nebula gradient
2. `drawHullExterior()` — outer hull plates above ceiling and below floor
3. Per room `drawRoom(i)`:
   - Wall gradient fill
   - Ceiling tiles (clipped region, 3-variant cycle, scaled to `ceilH = roomH × 0.13`)
   - Accent pipe strip under ceiling
   - Floor gradient strip (8% height, clipped)
   - `drawRoomDecor(i)` — per-room equipment sprites
   - Bulkhead metal frame with rivets (between rooms)
   - Painted arch opening at each bulkhead (`#111520` fill, accent stroke)
   - Porthole windows (rooms 0 and 4 only)
4. `player.draw(camX)` — animated sprite
5. `drawResourceBars()` — sci-fi instrument panel HUD

---

## iOS / Mobile Safe Area

```css
/* index.html meta */
<meta name="viewport" content="..., viewport-fit=cover">

/* style.css */
@media (max-width: 600px) {
  body        { padding-bottom: env(safe-area-inset-bottom, 110px); }
  #gameWrapper { height: calc(100dvh - env(safe-area-inset-bottom, 110px)); }
}
```

---

## Navigation (Site Integration)

- **Main page** (`index.html`): Two equal-width buttons — "Play Games" (purple → `games/`) and "Space Station Manager" (blue → `SpaceGame/`)
- **Games hub** (`games/index.html`): SpaceStation card removed; game is accessed only from main page

---

## Version History

| Version | Notes |
|---------|-------|
| 1.0 | Initial build: 5-room engine, physics, resources, random events, tile sheet ceiling/floor, animated sprite, mobile controls, iOS safe area |
| 1.1 | Removed door tile sprites (reverted to painted arch bulkhead openings); cleaned up unused `TILE_DOOR_TOP` / `TILE_DOOR_BOT` constants |
