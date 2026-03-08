/* ================================================================
   spacegame-movement.js
   Constants, input state, Station logic, Player physics/movement.
   Draw methods for Station and Player live in spacegame-renderer.js
   ================================================================ */
'use strict';

// -- Sprite sheet layout (384x192, 96x96 per frame) ---------------
// Row 0: walk  col 0-3  (sy = 0)
// Row 1: idle=col0, turn=col1, think=col2, jump=col3  (sy = 96)
const SRC_FW            = 96;
const SRC_FH            = 96;
const IDLE_SX           = 0;
const IDLE_SY           = 96;
const JUMP_SX           = 288;
const JUMP_SY           = 96;
const WALK_FRAMES       = 2;
const WALK_SPD          = 7;        // canvas frames per walk sprite frame
const RUN_SPD           = 6.0;      // speed when double-tapping
const RUN_WALK_SPD      = 4;        // faster animation when running
const WALK_FRAME_COORDS = [ [192, 0], [288, 0] ];

// -- Tile sheet (platformPack_tilesheet.png, 104x104 per tile) ----
const TILE_W         = 104;
const TILE_H         = 104;
const TILE_FLOOR     = { sx: 312, sy: 312 };
const TILE_CEIL      = [{ sx:0, sy:208 }, { sx:104, sy:208 }, { sx:208, sy:208 }];
const TILE_CEIL_OUT  = [{ sx:0, sy:0 }, { sx:104, sy:0 }];
const TILE_LADDER    = { sx: 104, sy: 416 };
const LADDER_GAP     = 30;    // passthrough opening width at ladder x in mid-floor
const CLIMB_SPD      = 2.5;   // px per frame while climbing

// -- World / ship -------------------------------------------------
const GRAVITY           = 0.48;
const JUMP_VY           = -10;
const MOVE_SPD          = 4.5;
const PLAYER_SCALE      = 0.92;   // 96 * 0.92 ≈ 88 px drawn
const FLOOR_RATIO       = 0.78;   // floor y as fraction of canvas H
const SHIP_ROOMS        = 5;
const ROOM_PX           = 380;    // world-px per room
const SHIP_W            = SHIP_ROOMS * ROOM_PX;
const LADDER_WXLIST     = Array.from({ length: SHIP_ROOMS }, (_, i) => i * ROOM_PX + ROOM_PX * 0.25);
const CAM_EASE          = 0.10;
const OUTSIDE_W         = 600;    // EVA zone extends this far LEFT of the ship (world x -600..0)
const COZY_BTN_WORLD_X  = ROOM_PX * 0.75;

// -- Resource rates (per frame, out of 100) -----------------------
const BASE_DEPLETE = { o2: 0.007, power: 0.005, food: 0.004 };
const EXTRA_BROKEN = 0.012;

// -- Room definitions ---------------------------------------------
const ROOM_DEFS = [
    { id:'airlock', label:'Airlock',       icon:'\uD83D\uDEAA', bg:'#0a1520', floor:'#162840', accent:'#4d9de0',
      station:{ label:'Defense Turret',   action:'Defend',   res:'hull',    workFrames:90  } },
    { id:'farm',    label:'Hydroponics',   icon:'\uD83C\uDF31', bg:'#0a1a0a', floor:'#153015', accent:'#4caf50',
      station:{ label:'Grow Pods',        action:'Harvest',  res:'food',    workFrames:60  } },
    { id:'command', label:'Command Deck',  icon:'\uD83D\uDEF8', bg:'#150a28', floor:'#28144a', accent:'#9b59b6',
      station:{ label:'Upgrade Console',  action:'Upgrade',  res:'credits', workFrames:120 } },
    { id:'engine',  label:'Engine Room',   icon:'\u26A1',       bg:'#280a0a', floor:'#421414', accent:'#e74c3c',
      station:{ label:'Reactor Core',     action:'Repair',   res:'power',   workFrames:90  } },
    { id:'lifesup', label:'Life Support',  icon:'\uD83D\uDCA8', bg:'#0a2828', floor:'#144040', accent:'#1abc9c',
      station:{ label:'O\u2082 Generator', action:'Repair',  res:'o2',      workFrames:90  } },
];

// -- Starfield (world-space positions) ----------------------------
const STARS = Array.from({ length: 110 }, () => ({
    wx: Math.random() * SHIP_W,
    wy: Math.random(),
    r:  Math.random() * 1.3 + 0.3,
    br: Math.random()
}));

// -- Input state --------------------------------------------------
const keys         = { left:false, right:false, up:false, down:false, jump:false, interact:false, running:false };
const _justPressed = { interact:false, up:false, jump:false };
const _doubleTap   = { left:0, right:0 };

window.addEventListener('keydown', e => {
    const now = Date.now();
    if (e.key === 'ArrowLeft'  || e.key === 'a') {
        if (!keys.left  && now - _doubleTap.left  < 280) keys.running = true;
        _doubleTap.left = now;
        keys.left = true;
    }
    if (e.key === 'ArrowRight' || e.key === 'd') {
        if (!keys.right && now - _doubleTap.right < 280) keys.running = true;
        _doubleTap.right = now;
        keys.right = true;
    }
    if (e.key === 'ArrowUp') {
        if (!keys.up)   _justPressed.up   = true;
        keys.up   = true;
    }
    if (e.key === 'w' || e.key === 'W') {
        if (!keys.jump) _justPressed.jump = true;
        keys.jump = true;
    }
    if ((e.key === 'e' || e.key === 'E') && !keys.interact) {
        keys.interact = true;
        _justPressed.interact = true;
    }
    if (e.key === 'ArrowDown' || e.key === 's') keys.down = true;
});

window.addEventListener('keyup', e => {
    if (e.key === 'ArrowLeft'  || e.key === 'a')                   { keys.left    = false; if (!keys.right) keys.running = false; }
    if (e.key === 'ArrowRight' || e.key === 'd')                   { keys.right   = false; if (!keys.left)  keys.running = false; }
    if (e.key === 'ArrowUp')                                          keys.up       = false;
    if (e.key === 'w' || e.key === 'W')                               keys.jump     = false;
    if (e.key === 'ArrowDown'  || e.key === 's')                      keys.down     = false;
    if (e.key === 'e'          || e.key === 'E')                      keys.interact = false;
});

// ================================================================
//  Station — logic only (draw added via prototype in renderer.js)
// ================================================================
class Station {
    constructor(roomIdx) {
        this.roomIdx   = roomIdx;
        this.def       = ROOM_DEFS[roomIdx];
        this.worldX    = roomIdx * ROOM_PX + ROOM_PX * 0.5;
        this.broken    = false;
        this.working   = false;
        this.workTimer = 0;
        this.cropReady = false;
        this.growTimer = 900 + Math.random() * 600;
        this.flash     = 0;
    }

    get needsAttention() {
        const r = this.def.station.res;
        if (r === 'food')    return this.cropReady;
        if (r === 'hull')    return game && game.alienAttack;
        if (r === 'credits') return true;
        return this.broken;
    }

    update() {
        if (this.def.station.res === 'food' && !this.cropReady && !this.working) {
            this.growTimer--;
            if (this.growTimer <= 0) {
                this.cropReady = true;
                game.addAlert('\uD83C\uDF3E Crops ready in Hydroponics!', '#4caf50');
            }
        }
        if (this.working) {
            this.workTimer--;
            if (this.workTimer <= 0) {
                this.working   = false;
                this.broken    = false;
                this.cropReady = false;
                this.growTimer = 900 + Math.random() * 600;
            }
        }
        this.flash = (this.flash + 1) % 60;
    }

    tryInteract(resources) {
        if (this.working) return null;
        const res = this.def.station.res;

        if (res === 'food') {
            if (!this.cropReady) return 'Nothing to harvest yet';
            this.working   = true;
            this.workTimer = this.def.station.workFrames;
            resources.food = Math.min(100, resources.food + 25);
            game.score    += 30;
            return '\uD83C\uDF3E Harvested! +25 food';
        }
        if (res === 'hull') {
            if (!game.alienAttack) return 'No threat detected';
            this.working   = true;
            this.workTimer = this.def.station.workFrames;
            return '\uD83D\uDD2B Defending!';
        }
        if (res === 'credits') {
            if (resources.credits < 10) return 'Need 10 credits';
            resources.credits -= 10;
            const pick = ['o2','power','food'][Math.floor(Math.random()*3)];
            resources[pick] = Math.min(100, resources[pick] + 20);
            this.working   = true;
            this.workTimer = this.def.station.workFrames;
            game.score    += 50;
            return '\u2B06\uFE0F Upgraded ' + pick.toUpperCase() + '!';
        }
        if (!this.broken) return 'System OK';
        this.working   = true;
        this.workTimer = this.def.station.workFrames;
        this.broken    = false;
        game.score    += 40;
        return '\uD83D\uDD27 Repairing\u2026';
    }
}

// ================================================================
//  Player — logic only (draw added via prototype in renderer.js)
// ================================================================
class Player {
    constructor(sheet) {
        this.sheet       = sheet;
        this.x           = ROOM_PX * 0.5;
        this.y           = 0;
        this.vy          = 0;
        this.onGround    = true;
        this.facing      = 1;
        this.walkFrame   = 0;
        this.walkTick    = 0;
        this.moving      = false;
        this.jumping     = false;
        this.jumpsLeft   = 2;
        this.onLadder    = false;
        this.running     = false;
        this.pw          = SRC_FW * PLAYER_SCALE;
        this.ph          = SRC_FH * PLAYER_SCALE;
        this.interacting = false;
        this.interactTick= 0;
    }

    update(floorY, midFloorY, ceilY, ladderWXs) {
        this.moving  = false;
        this.running = keys.running;
        const spd    = this.running ? RUN_SPD : MOVE_SPD;

        // Nearest ladder world-x within grab range
        const nearLadder = ladderWXs.find(lx => Math.abs(this.x - lx) < LADDER_GAP);

        if (this.onLadder) {
            if (nearLadder === undefined) {
                // Walked too far from ladder — fall off
                this.onLadder = false;
            } else if (keys.left || keys.right) {
                // Step off ladder horizontally
                this.onLadder = false; this.onGround = false;
                if (keys.left)  { this.x -= spd; this.facing = -1; this.moving = true; }
                if (keys.right) { this.x += spd; this.facing =  1; this.moving = true; }
            } else if (_justPressed.jump && this.jumpsLeft > 0) {
                // Jump off ladder
                this.onLadder = false; this.onGround = false;
                this.vy = JUMP_VY; this.jumping = true; this.jumpsLeft--;
            } else {
                // Climb
                this.x  = nearLadder;
                this.vy = 0;
                if (keys.up)   this.y -= CLIMB_SPD;
                if (keys.down) this.y += CLIMB_SPD;
                // Exit at ceiling
                const ceilingStop = ceilY + this.ph;
                if (this.y <= ceilingStop) {
                    this.y = ceilingStop;
                    this.onLadder = false; this.onGround = true; this.jumping = false; this.jumpsLeft = 2;
                }
                // Exit at main floor
                if (this.y >= floorY) {
                    this.y = floorY;
                    this.onLadder = false; this.onGround = true; this.jumping = false; this.jumpsLeft = 2;
                }
            }
        } else {
            // Horizontal movement
            if (keys.left)  { this.x -= spd; this.facing=-1; this.moving=true; }
            if (keys.right) { this.x += spd; this.facing= 1; this.moving=true; }
            this.x = Math.max(-OUTSIDE_W + this.pw/2, Math.min(SHIP_W - this.pw/2, this.x));

            const onLowerFloor = this.onGround && Math.abs(this.y - floorY)    < 5;
            const onUpperFloor = this.onGround && Math.abs(this.y - midFloorY) < 5;

            if (nearLadder !== undefined && (onLowerFloor || onUpperFloor) && _justPressed.up) {
                // Grab ladder and ascend from either floor
                this.onLadder = true; this.onGround = false; this.jumping = false; this.vy = 0;
            } else if (nearLadder !== undefined && onUpperFloor && keys.down) {
                // Grab ladder and descend from upper floor
                this.onLadder = true; this.onGround = false; this.jumping = false; this.vy = 0;
                this.y += 3; // nudge past mid-floor to prevent immediate re-land
            } else {
                // Normal jump
                if (_justPressed.jump && this.jumpsLeft > 0) {
                    this.vy = JUMP_VY;
                    this.onGround = false; this.jumping = true; this.jumpsLeft--;
                }
                const prevY = this.y;
                this.vy += GRAVITY;
                this.y  += this.vy;
                // Mid-floor collision (open at ladder gap; EVA zone has no mid-floor)
                const atGap  = nearLadder !== undefined;
                const inShip = this.x >= 0;
                if (inShip && !atGap && this.vy > 0 && prevY <= midFloorY && this.y >= midFloorY) {
                    this.y = midFloorY; this.vy = 0; this.onGround = true; this.jumping = false; this.jumpsLeft = 2;
                }
                // Main floor
                if (this.y >= floorY) {
                    this.y = floorY; this.vy = 0; this.onGround = true; this.jumping = false; this.jumpsLeft = 2;
                }
            }
        }

        if (this.interactTick > 0) { this.interactTick--; this.interacting = this.interactTick > 0; }

        // Walk animation (not while jumping or on ladder)
        if (!this.jumping && this.moving && !this.onLadder) {
            const animSpd = this.running ? RUN_WALK_SPD : WALK_SPD;
            this.walkTick++;
            if (this.walkTick >= animSpd) { this.walkTick = 0; this.walkFrame = (this.walkFrame + 1) % WALK_FRAMES; }
        }
    }
}
