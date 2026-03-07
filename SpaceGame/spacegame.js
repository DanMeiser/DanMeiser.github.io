/* ============================================================
   SPACE STATION MANAGER  v1.1
   Walk your astronaut around a 5-room ship, repair systems,
   grow food, manage power & O2, and defend against aliens.
   ============================================================ */

'use strict';

// â”€â”€ Physics / movement â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// â”€â”€ Sprite sheet layout (384Ã—192, 96Ã—96 per frame) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Row 0: walk  col 0-3  (sy = 0)
// Row 1: idle=col0, turn=col1, think=col2, jump=col3  (sy = 96)
const SRC_FW       = 96;
const SRC_FH       = 96;
const WALK_ROW_SY  = 0;
const IDLE_SX      = 0;
const IDLE_SY      = 96;
const JUMP_SX      = 288;
const JUMP_SY      = 96;
const WALK_FRAMES  = 2;        // 2-frame walk cycle
const WALK_SPD     = 7;        // canvas frames per walk sprite frame
const RUN_SPD      = 6.0;      // speed when double-tapping
const RUN_WALK_SPD = 4;        // faster animation when running
// Explicit walk frame coords [sx, sy]
const WALK_FRAME_COORDS = [ [192, 0], [288, 0] ];

// -- Tile sheet (platformPack_tilesheet.png, 104x104 per tile) ----------------
const TILE_W = 104, TILE_H = 104;
// Floor tile
const TILE_FLOOR   = { sx: 312, sy: 312 };
// Ceiling tiles (3 variants, cycle across room width)
const TILE_CEIL      = [{ sx:0, sy:208 }, { sx:104, sy:208 }, { sx:208, sy:208 }];

// â”€â”€ World / ship â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const GRAVITY      = 0.48;
const JUMP_VY      = -10;
const MOVE_SPD     = 3.0;
const PLAYER_SCALE = 0.92;   // 96 * 0.92 ≈ 88 px drawn
const FLOOR_RATIO  = 0.78;   // floor y as fraction of canvas H
const SHIP_ROOMS   = 5;
const ROOM_PX      = 500;    // world-px per room
const SHIP_W       = SHIP_ROOMS * ROOM_PX;
const CAM_EASE     = 0.10;
const COZY_MOVE_SPD    = 1.2;             // slow wander speed in cozy mode
const COZY_BTN_WORLD_X = ROOM_PX * 0.75; // cozy station world-x (right side of airlock)

// â”€â”€ Resource rates (per frame, out of 100) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const BASE_DEPLETE = { o2: 0.007, power: 0.005, food: 0.004 };
const EXTRA_BROKEN = 0.012; // extra depletion when station is broken

// â”€â”€ Room definitions â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const ROOM_DEFS = [
    { id:'airlock', label:'Airlock',       icon:'ðŸšª', bg:'#0a1520', floor:'#162840', accent:'#4d9de0',
      station:{ label:'Defense Turret',   action:'Defend',   res:'hull',    workFrames:90  } },
    { id:'farm',    label:'Hydroponics',   icon:'ðŸŒ±', bg:'#0a1a0a', floor:'#153015', accent:'#4caf50',
      station:{ label:'Grow Pods',        action:'Harvest',  res:'food',    workFrames:60  } },
    { id:'command', label:'Command Deck',  icon:'ðŸ›¸', bg:'#150a28', floor:'#28144a', accent:'#9b59b6',
      station:{ label:'Upgrade Console',  action:'Upgrade',  res:'credits', workFrames:120 } },
    { id:'engine',  label:'Engine Room',   icon:'âš¡', bg:'#280a0a', floor:'#421414', accent:'#e74c3c',
      station:{ label:'Reactor Core',     action:'Repair',   res:'power',   workFrames:90  } },
    { id:'lifesup', label:'Life Support',  icon:'ðŸ’¨', bg:'#0a2828', floor:'#144040', accent:'#1abc9c',
      station:{ label:'Oâ‚‚ Generator',     action:'Repair',   res:'o2',      workFrames:90  } },
];

// â”€â”€ DOM refs â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const wrapper     = document.getElementById('gameWrapper');
const menu        = document.getElementById('menu');
const hud         = document.getElementById('hud');
const gameOver    = document.getElementById('gameOver');
const canvas      = document.getElementById('gameCanvas');
const ctx         = canvas.getContext('2d');
const scoreEl     = document.getElementById('scoreDisplay');
const levelEl     = document.getElementById('levelDisplay');
const livesEl     = document.getElementById('livesDisplay');
const finalScoreEl     = document.getElementById('finalScore');
const mobileControls   = document.getElementById('mobileControls');

// Game instance declared early so resize() can reference it safely
let game = null;

// â”€â”€ Resize â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function resize() {
    canvas.width  = wrapper.clientWidth;
    canvas.height = wrapper.clientHeight;
    if (game) game.onResize();
}
resize();
new ResizeObserver(resize).observe(wrapper);

// â”€â”€ Image loader â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function loadImage(src) {
    return new Promise(res => {
        const img = new Image();
        img.onload  = () => res(img);
        img.onerror = () => res(null);
        img.src = src;
    });
}

// â”€â”€ Input â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const keys = { left:false, right:false, up:false, interact:false, running:false };
const _justPressed = { interact:false };
const _doubleTap   = { left:0, right:0 };   // timestamps for double-tap run detection

window.addEventListener('keydown', e => {
    const now = Date.now();
    if (e.key === 'ArrowLeft'  || e.key === 'a') {
        if (!keys.left && now - _doubleTap.left < 280) keys.running = true;
        _doubleTap.left = now;
        keys.left = true;
    }
    if (e.key === 'ArrowRight' || e.key === 'd') {
        if (!keys.right && now - _doubleTap.right < 280) keys.running = true;
        _doubleTap.right = now;
        keys.right = true;
    }
    if (e.key === 'ArrowUp'    || e.key === 'w' || e.key === ' ')      keys.up       = true;
    if ((e.key === 'e' || e.key === 'E') && !keys.interact)           { keys.interact = true; _justPressed.interact = true; }
    if (e.key === ' ') e.preventDefault();
});
window.addEventListener('keyup', e => {
    if (e.key === 'ArrowLeft'  || e.key === 'a')                  { keys.left    = false; if (!keys.right) keys.running = false; }
    if (e.key === 'ArrowRight' || e.key === 'd')                  { keys.right   = false; if (!keys.left)  keys.running = false; }
    if (e.key === 'ArrowUp'    || e.key === 'w' || e.key === ' ') keys.up       = false;
    if (e.key === 'e' || e.key === 'E')                           keys.interact = false;
});

// â”€â”€ Starfield (world-space positions) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const STARS = Array.from({ length: 110 }, () => ({
    wx: Math.random() * SHIP_W,
    wy: Math.random(),
    r:  Math.random() * 1.3 + 0.3,
    br: Math.random()
}));

// â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x+w, y,   x+w, y+h, r);
    ctx.arcTo(x+w, y+h, x,   y+h, r);
    ctx.arcTo(x,   y+h, x,   y,   r);
    ctx.arcTo(x,   y,   x+w, y,   r);
    ctx.closePath();
}

// â”€â”€ Station class â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
            if (this.growTimer <= 0) { this.cropReady = true; game.addAlert('ðŸŒ¾ Crops ready in Hydroponics!', '#4caf50'); }
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
            return 'ðŸŒ¾ Harvested! +25 food';
        }
        if (res === 'hull') {
            if (!game.alienAttack) return 'No threat detected';
            this.working   = true;
            this.workTimer = this.def.station.workFrames;
            return 'ðŸ”« Defending!';
        }
        if (res === 'credits') {
            if (resources.credits < 10) return 'Need 10 credits';
            resources.credits -= 10;
            const pick = ['o2','power','food'][Math.floor(Math.random()*3)];
            resources[pick] = Math.min(100, resources[pick] + 20);
            this.working   = true;
            this.workTimer = this.def.station.workFrames;
            game.score    += 50;
            return `â¬†ï¸ Upgraded ${pick.toUpperCase()}!`;
        }
        if (!this.broken) return 'System OK';
        this.working   = true;
        this.workTimer = this.def.station.workFrames;
        this.broken    = false;
        game.score    += 40;
        return 'ðŸ”§ Repairingâ€¦';
    }

    draw(camX) {
        const W  = canvas.width;
        const H  = canvas.height;
        const fY = H * FLOOR_RATIO;
        const sx  = this.worldX - camX;
        const sw  = ROOM_PX * 0.17;
        const sh  = fY  * 0.30;
        const sTop= fY  - sh;

        // Body
        const bodyCol = this.broken ? '#3d1212' : (this.working ? '#123d12' : this.def.bg);
        ctx.fillStyle = bodyCol;
        roundRect(sx - sw/2, sTop, sw, sh, 6); ctx.fill();

        // Border
        const alert = this.needsAttention && Math.floor(this.flash/8)%2===0;
        ctx.strokeStyle = alert ? '#ffff44' : this.def.accent;
        ctx.lineWidth   = alert ? 3 : 1.5;
        roundRect(sx - sw/2, sTop, sw, sh, 6); ctx.stroke();

        // Icon
        ctx.font      = `${sw * 0.50}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText(this.def.icon, sx, sTop + sh * 0.58);

        // Station name
        ctx.fillStyle = this.def.accent;
        ctx.font      = `${W * 0.025}px sans-serif`;
        ctx.fillText(this.def.station.label, sx, fY + H*0.035);

        // Progress bar
        if (this.working) {
            const p = 1 - this.workTimer / this.def.station.workFrames;
            ctx.fillStyle = '#111';
            ctx.fillRect(sx - sw/2 + 4, sTop + sh - 10, sw - 8, 6);
            ctx.fillStyle = '#44ff88';
            ctx.fillRect(sx - sw/2 + 4, sTop + sh - 10, (sw - 8)*p, 6);
        }

        // Crop growth bar
        if (this.def.station.res === 'food' && !this.cropReady && !this.working) {
            const maxG = 900 + 300; // midpoint of range
            const p    = Math.max(0, Math.min(1, 1 - this.growTimer / maxG));
            ctx.fillStyle = '#1a3d1a';
            ctx.fillRect(sx - sw/2 + 4, sTop + sh - 10, sw - 8, 6);
            ctx.fillStyle = '#4caf50';
            ctx.fillRect(sx - sw/2 + 4, sTop + sh - 10, (sw - 8)*p, 6);
        }
    }
}

// â”€â”€ Player class â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
class Player {
    constructor(sheet) {
        this.sheet    = sheet;
        this.x        = ROOM_PX * 0.5;
        this.y        = 0;
        this.vy       = 0;
        this.onGround = true;
        this.facing   = 1;
        this.walkFrame= 0;
        this.walkTick = 0;
        this.moving   = false;
        this.jumping  = false;
        this.running  = false;
        this.pw       = SRC_FW * PLAYER_SCALE;
        this.ph       = SRC_FH * PLAYER_SCALE;
        this.interacting = false;
        this.interactTick= 0;
    }

    update(floorY) {
        this.moving  = false;
        this.running = keys.running;
        const cozy   = game && game.cozyMode;
        const spd    = cozy ? COZY_MOVE_SPD : (this.running ? RUN_SPD : MOVE_SPD);
        if (keys.left)  { this.x -= spd; this.facing=-1; this.moving=true; }
        if (keys.right) { this.x += spd; this.facing= 1; this.moving=true; }
        this.x = Math.max(this.pw/2, Math.min(SHIP_W - this.pw/2, this.x));

        if (keys.up && this.onGround) {
            this.vy = JUMP_VY;
            this.onGround = false;
            this.jumping  = true;
        }
        this.vy += GRAVITY;
        this.y  += this.vy;
        if (this.y >= floorY) { this.y = floorY; this.vy = 0; this.onGround = true; this.jumping = false; }

        if (this.interactTick > 0) { this.interactTick--; this.interacting = this.interactTick > 0; }

        if (!this.jumping && this.moving) {
            const animSpd = this.running ? RUN_WALK_SPD : WALK_SPD;
            this.walkTick++;
            if (this.walkTick >= animSpd) { this.walkTick=0; this.walkFrame=(this.walkFrame+1)%WALK_FRAMES; }
        }
    }

    draw(camX) {
        if (!this.sheet) return;
        let sx, sy;
        if (this.jumping)         { sx = JUMP_SX;              sy = JUMP_SY; }
        else if (this.interacting) { sx = 192;                  sy = 96; }  // thinking frame
        else if (this.moving)      { [sx, sy] = WALK_FRAME_COORDS[this.walkFrame]; }
        else                       { sx = IDLE_SX;              sy = IDLE_SY; }

        const dx = this.x - camX - this.pw/2;
        const dy = this.y - this.ph;
        ctx.save();
        if (this.facing === -1) {
            ctx.transform(-1, 0, 0, 1, dx*2 + this.pw, 0);
        }
        ctx.drawImage(this.sheet, sx, sy, SRC_FW, SRC_FH, dx, dy, this.pw, this.ph);
        ctx.restore();
    }
}

// â”€â”€ Game class â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
class Game {
    constructor(sheet, tiles) {
        this.sheet     = sheet;
        this.tiles     = tiles;
        this.stations  = ROOM_DEFS.map((_, i) => new Station(i));
        this.player    = new Player(sheet);
        this.resources = { o2:80, power:90, food:65, hull:100, credits:5 };
        this.score     = 0;
        this.day       = 1;
        this.tick      = 0;
        this.dayLen    = 3600;
        this.alerts    = [];
        this.alertMsg  = '';
        this.alertTimer= 0;
        this.alienAttack  = false;
        this.alienTimer   = 0;
        this.nearStation  = null;
        this.nearCozyBtn  = false;
        this.cozyMode     = false;
        this.cozyFlash    = 0;
        this.raf          = null;
        this.onResize();
    }

    onResize() {
        this.W = canvas.width;
        this.H = canvas.height;
        this.ceilY  = this.H * 0.12;   // top of interior rooms (ceiling)
        // On narrow/tall screens leave extra room for mobile controls at bottom
        const mobile = this.W < 480 || (this.H / this.W) > 1.4;
        this.floorY = this.H * (mobile ? 0.68 : 0.76);
    }

    addAlert(msg, color = '#ffff88') {
        this.alertMsg   = msg;
        this.alertColor = color;
        this.alertTimer = 210;
    }

    triggerBreakdown() {
        const breakable = [3, 4]; // engine, life-support
        const i = breakable[Math.floor(Math.random()*2)];
        if (!this.stations[i].broken && !this.stations[i].working) {
            this.stations[i].broken = true;
            this.addAlert(`âš ï¸ ${ROOM_DEFS[i].label} needs repair!`, '#e74c3c');
        }
    }

    startAlienAttack() {
        this.alienAttack = true;
        this.alienTimer  = 700;
        this.addAlert('ðŸ‘¾ Alien attack! Man the Airlock!', '#e74c3c');
    }

    update() {
        this.W = canvas.width;
        this.H = canvas.height;
        this.ceilY  = this.H * 0.12;
        const mobile = this.W < 480 || (this.H / this.W) > 1.4;
        this.floorY = this.H * (mobile ? 0.68 : 0.76);
        this.tick++;

        // Day cycle
        if (this.tick % this.dayLen === 0) {
            this.day++;
            this.resources.credits = Math.min(99, this.resources.credits + 4);
            this.addAlert(`ðŸŒ… Day ${this.day} â€” +4 credits`, '#f1c40f');
        }

        // Events
        if (this.tick % 1100 === 550) this.triggerBreakdown();
        if (this.tick % 2200 === 0)   this.startAlienAttack();

        // Depletion
        this.resources.o2    -= BASE_DEPLETE.o2;
        this.resources.power -= BASE_DEPLETE.power;
        this.resources.food  -= BASE_DEPLETE.food;
        if (this.stations[3].broken) this.resources.power -= EXTRA_BROKEN;
        if (this.stations[4].broken) this.resources.o2    -= EXTRA_BROKEN;

        // Alien attack
        if (this.alienAttack) {
            this.alienTimer--;
            this.resources.hull -= 0.07;
            if (this.stations[0].working) { this.resources.hull += 0.04; this.alienTimer -= 1; }
            if (this.alienTimer <= 0) { this.alienAttack = false; this.addAlert('âœ… Aliens repelled!', '#2ecc71'); }
        }

        // Periodic credit earn (paused in cozy mode)
        if (!this.cozyMode && this.tick % 360 === 0) {
            const healthy = ['o2','power','food','hull'].filter(k => this.resources[k] > 55).length;
            this.resources.credits = Math.min(99, this.resources.credits + healthy);
            this.score += healthy * 8;
        }

        // Clamp resources
        for (const k of ['o2','power','food','hull']) this.resources[k] = Math.max(0, Math.min(100, this.resources[k]));

        // Stations
        this.stations.forEach(s => s.update());

        // Player
        this.player.update(this.floorY);
        this.player.y = Math.min(this.player.y, this.floorY); // safety clamp

        // Camera
        const targetCamX = Math.max(0, Math.min(SHIP_W - this.W, this.player.x - this.W/2));
        if (!this.camX) this.camX = targetCamX;
        this.camX += (targetCamX - this.camX) * CAM_EASE;

        // Nearest station
        this.nearStation = null;
        for (const s of this.stations) {
            if (Math.abs(s.worldX - this.player.x) < ROOM_PX * 0.20) { this.nearStation = s; break; }
        }

        // Cozy button proximity
        this.nearCozyBtn = Math.abs(this.player.x - COZY_BTN_WORLD_X) < ROOM_PX * 0.20;
        this.cozyFlash   = (this.cozyFlash + 1) % 60;

        // Interact (edge-triggered)
        if (_justPressed.interact) {
            if (this.nearCozyBtn) {
                this.cozyMode = !this.cozyMode;
                this.addAlert(
                    this.cozyMode ? '☕ Cozy mode ON — relax!' : '⚡ Back to work!',
                    this.cozyMode ? '#88ccff' : '#ffcc44'
                );
                this.player.interactTick = 60;
                this.player.interacting  = true;
            } else if (this.nearStation) {
                const msg = this.nearStation.tryInteract(this.resources);
                if (msg) { this.addAlert(msg, '#88ffcc'); this.player.interactTick = 80; this.player.interacting = true; }
            }
        }
        _justPressed.interact = false;

        // Alert timer
        if (this.alertTimer > 0) this.alertTimer--;

        // HUD pills
        scoreEl.textContent = `Score: ${this.score}`;
        levelEl.textContent = `Day:   ${this.day}`;
        livesEl.textContent = `Oâ‚‚:    ${Math.floor(this.resources.o2)}%`;

        // Game over
        if (this.resources.o2 <= 0 || this.resources.hull <= 0) {
            this.stop();
            const reason = this.resources.o2 <= 0 ? 'Oxygen depleted!' : 'Hull destroyed!';
            finalScoreEl.textContent = `Day ${this.day}  |  Score: ${this.score}  |  ${reason}`;
            gameOver.classList.remove('hidden');
        }
    }

    drawSpaceBg() {
        const W = this.W, H = this.H;
        // Deep space gradient
        const grad = ctx.createLinearGradient(0, 0, 0, H);
        grad.addColorStop(0,   '#00001a');
        grad.addColorStop(0.5, '#000510');
        grad.addColorStop(1,   '#00020a');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, W, H);

        // Parallax star layers
        for (const s of STARS) {
            const px = ((s.wx - this.camX * 0.3) % (SHIP_W * 1.5) + SHIP_W * 1.5) % (SHIP_W * 1.5);
            const sx = px * (W / (SHIP_W * 1.5));
            const sy = s.wy * H * 0.90;
            ctx.fillStyle = `rgba(255,255,255,${0.3 + s.br * 0.7})`;
            ctx.beginPath(); ctx.arc(sx, sy, s.r, 0, Math.PI * 2); ctx.fill();
        }

        // Nebula glow (slow parallax)
        const nX = (((-this.camX * 0.1) % W) + W) % W;
        const nebula = ctx.createRadialGradient(nX, H * 0.35, 0, nX, H * 0.35, W * 0.55);
        nebula.addColorStop(0,   'rgba(60,20,120,0.18)');
        nebula.addColorStop(0.5, 'rgba(20,10,60,0.09)');
        nebula.addColorStop(1,   'rgba(0,0,0,0)');
        ctx.fillStyle = nebula;
        ctx.fillRect(0, 0, W, H);
    }

    drawHullExterior() {
        const W = this.W, H = this.H;
        const ceilY  = this.ceilY;
        const fY     = this.floorY;
        const hullH  = H * 0.07; // hull band above ceiling and below floor

        // Top hull band
        const topGrad = ctx.createLinearGradient(0, ceilY - hullH, 0, ceilY);
        topGrad.addColorStop(0, '#0d1117');
        topGrad.addColorStop(1, '#1c2333');
        ctx.fillStyle = topGrad;
        ctx.fillRect(0, ceilY - hullH, W, hullH);

        // Rivet strip along hull edge
        ctx.fillStyle = '#2a3548';
        ctx.fillRect(0, ceilY - 4, W, 4);
        for (let rx = 10; rx < W; rx += 32) {
            ctx.fillStyle = '#3a4a60';
            ctx.beginPath(); ctx.arc(rx, ceilY - hullH * 0.35, 3, 0, Math.PI * 2); ctx.fill();
        }

        // Bottom hull band
        const botGrad = ctx.createLinearGradient(0, fY, 0, fY + hullH);
        botGrad.addColorStop(0, '#1c2333');
        botGrad.addColorStop(1, '#0d1117');
        ctx.fillStyle = botGrad;
        ctx.fillRect(0, fY, W, hullH);

        ctx.fillStyle = '#2a3548';
        ctx.fillRect(0, fY, W, 4);
        for (let rx = 10; rx < W; rx += 32) {
            ctx.fillStyle = '#3a4a60';
            ctx.beginPath(); ctx.arc(rx, fY + hullH * 0.65, 3, 0, Math.PI * 2); ctx.fill();
        }
    }

    drawRoom(i) {
        const def  = ROOM_DEFS[i];
        const W    = this.W, H = this.H;
        const rx   = i * ROOM_PX - this.camX;
        const fY   = this.floorY;
        const cY   = this.ceilY;
        const roomH = fY - cY;

        // ── Interior wall background ──────────────────────────
        const wallGrad = ctx.createLinearGradient(0, cY, 0, fY);
        wallGrad.addColorStop(0,   def.bg);
        wallGrad.addColorStop(0.7, def.bg);
        wallGrad.addColorStop(1,   def.floor);
        ctx.fillStyle = wallGrad;
        ctx.fillRect(rx, cY, ROOM_PX, roomH);

        // Accent strip along top of wall
        ctx.fillStyle = def.accent + '44';
        ctx.fillRect(rx, cY, ROOM_PX, 4);

        // ── Ceiling panels (tiled sprites) ───────────────────
        const ceilH = roomH * 0.13;
        ctx.save();
        ctx.rect(rx, cY, ROOM_PX, ceilH);
        ctx.clip();
        if (this.tiles) {
            const tDrawW = ceilH; // square tile scaled to ceiling height
            let cx2 = rx;
            let tileIdx = 0;
            while (cx2 < rx + ROOM_PX) {
                const t = TILE_CEIL[tileIdx % TILE_CEIL.length];
                ctx.drawImage(this.tiles, t.sx, t.sy, TILE_W, TILE_H, cx2, cY, tDrawW, ceilH);
                cx2 += tDrawW;
                tileIdx++;
            }
        } else {
            const panelW = ROOM_PX / 4;
            for (let p = 0; p < 4; p++) {
                const px = rx + p * panelW;
                ctx.fillStyle = p % 2 === 0 ? '#1a1f2e' : '#151a28';
                ctx.fillRect(px + 2, cY, panelW - 4, ceilH);
            }
        }
        // accent light strip on top of ceiling tiles
        ctx.fillStyle = def.accent + '55';
        ctx.fillRect(rx, cY, ROOM_PX, 3);
        ctx.restore();

        // ── Ceiling conduit pipes ─────────────────────────────
        ctx.strokeStyle = '#2a3040';
        ctx.lineWidth = 6;
        ctx.beginPath(); ctx.moveTo(rx, cY + roomH * 0.10); ctx.lineTo(rx + ROOM_PX, cY + roomH * 0.10); ctx.stroke();
        ctx.strokeStyle = def.accent + '55';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(rx, cY + roomH * 0.10); ctx.lineTo(rx + ROOM_PX, cY + roomH * 0.10); ctx.stroke();

        // ── Floor ────────────────────────────────────────────
        const floorH   = roomH * 0.08;
        const grateTop = fY - floorH;
        const grateGrad = ctx.createLinearGradient(0, grateTop, 0, fY);
        grateGrad.addColorStop(0, def.floor);
        grateGrad.addColorStop(1, '#0a0a10');
        ctx.fillStyle = grateGrad;
        ctx.fillRect(rx, grateTop, ROOM_PX, floorH);
        // Floor edge highlight
        ctx.fillStyle = def.accent + '55';
        ctx.fillRect(rx, grateTop, ROOM_PX, 2);

        // ── Room-specific decorative equipment ───────────────
        this.drawRoomDecor(i, rx, cY, fY, roomH, def);

        // ── Bulkhead wall dividers ────────────────────────────
        // Draw at LEFT edge of every room except room 0
        if (i > 0) {
            const bx = rx - 1;
            // Thick metal frame
            const bGrad = ctx.createLinearGradient(bx - 12, 0, bx + 12, 0);
            bGrad.addColorStop(0,   '#0a0c10');
            bGrad.addColorStop(0.3, '#2a3040');
            bGrad.addColorStop(0.5, '#3a4555');
            bGrad.addColorStop(0.7, '#2a3040');
            bGrad.addColorStop(1,   '#0a0c10');
            ctx.fillStyle = bGrad;
            ctx.fillRect(bx - 12, cY, 24, roomH);

            // Bolt details
            const boltCol = '#4a5570';
            for (const by of [cY + roomH*0.15, cY + roomH*0.40, cY + roomH*0.65, cY + roomH*0.85]) {
                ctx.fillStyle = boltCol;
                ctx.beginPath(); ctx.arc(bx - 6, by, 3, 0, Math.PI*2); ctx.fill();
                ctx.beginPath(); ctx.arc(bx + 6, by, 3, 0, Math.PI*2); ctx.fill();
            }

            // Door arch
            ctx.fillStyle = '#111520';
            roundRect(bx - 8, grateTop - roomH * 0.30, 16, roomH * 0.38, 4);
            ctx.fill();
            ctx.strokeStyle = def.accent + '88';
            ctx.lineWidth = 1;
            roundRect(bx - 8, grateTop - roomH * 0.30, 16, roomH * 0.38, 4);
            ctx.stroke();
        }

        // ── Porthole windows (outer rooms only) ───────────────
        if (i === 0 || i === SHIP_ROOMS - 1) {
            const wx = i === 0 ? rx + ROOM_PX * 0.15 : rx + ROOM_PX * 0.85;
            const wy = cY + roomH * 0.30;
            const wr = roomH * 0.10;

            // outer ring
            ctx.fillStyle = '#1e2738';
            ctx.beginPath(); ctx.arc(wx, wy, wr + 6, 0, Math.PI*2); ctx.fill();
            ctx.strokeStyle = '#3a4a60';
            ctx.lineWidth = 3;
            ctx.beginPath(); ctx.arc(wx, wy, wr + 6, 0, Math.PI*2); ctx.stroke();

            // glass
            const pGrad = ctx.createRadialGradient(wx - wr*0.3, wy - wr*0.3, 1, wx, wy, wr);
            pGrad.addColorStop(0, '#1a3a6a');
            pGrad.addColorStop(0.6, '#050e22');
            pGrad.addColorStop(1, '#020810');
            ctx.fillStyle = pGrad;
            ctx.beginPath(); ctx.arc(wx, wy, wr, 0, Math.PI*2); ctx.fill();

            // stars through porthole
            ctx.save(); ctx.beginPath(); ctx.arc(wx, wy, wr, 0, Math.PI*2); ctx.clip();
            for (let si = 0; si < 8; si++) {
                const sa = (i + si * 137.5) * 0.7;
                const sr = ((i * 37 + si * 61) % (wr * 2)) * 0.5 + 2;
                const sax = Math.cos(sa) * sr + wx;
                const say = Math.sin(sa) * sr + wy;
                ctx.fillStyle = `rgba(255,255,255,${0.4 + (si % 3) * 0.2})`;
                ctx.beginPath(); ctx.arc(sax, say, 0.8, 0, Math.PI*2); ctx.fill();
            }
            ctx.restore();

            // glare
            ctx.fillStyle = 'rgba(180,220,255,0.12)';
            ctx.beginPath(); ctx.ellipse(wx - wr*0.25, wy - wr*0.25, wr*0.35, wr*0.18, -0.5, 0, Math.PI*2); ctx.fill();
        }

        // ── Station ───────────────────────────────────────────
        this.stations[i].draw(this.camX);

        // ── Room name plate ───────────────────────────────────
        const plateW = ROOM_PX * 0.44;
        const plateX = rx + ROOM_PX / 2 - plateW / 2;
        const plateY = cY + roomH * 0.13;
        ctx.fillStyle = 'rgba(0,0,0,0.55)';
        roundRect(plateX, plateY, plateW, roomH * 0.11, 4); ctx.fill();
        ctx.strokeStyle = def.accent + '99';
        ctx.lineWidth = 1;
        roundRect(plateX, plateY, plateW, roomH * 0.11, 4); ctx.stroke();
        ctx.font      = `bold ${W * 0.028}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillStyle = def.accent;
        ctx.fillText(def.label, rx + ROOM_PX / 2, plateY + roomH * 0.085);

        // ── Interact hint ─────────────────────────────────────
        if (this.nearStation === this.stations[i]) {
            const canAct = this.nearStation.needsAttention || this.nearStation.def.station.res === 'credits';
            const hintY  = grateTop - roomH * 0.06;
            ctx.font      = `bold ${W * 0.028}px monospace`;
            ctx.fillStyle = '#ffff88';
            ctx.fillText(canAct ? `[E] ${def.station.action}` : '[E] Check', rx + ROOM_PX / 2, hintY);
        }
    }

    drawCozyStation(camX) {
        const W   = canvas.width;
        const H   = canvas.height;
        const fY  = H * FLOOR_RATIO;
        const sx  = COZY_BTN_WORLD_X - camX;
        const sw  = ROOM_PX * 0.17;
        const sh  = fY * 0.30;
        const sTop = fY - sh;

        // Body — dark when off, teal-tinted when on
        ctx.fillStyle = this.cozyMode ? '#0a2a30' : '#0d1020';
        roundRect(sx - sw/2, sTop, sw, sh, 6); ctx.fill();

        // Border — flashes softly when active
        const flash = this.cozyMode && Math.floor(this.cozyFlash / 8) % 2 === 0;
        ctx.strokeStyle = flash ? '#88ccff' : (this.cozyMode ? '#55aacc' : '#334466');
        ctx.lineWidth   = this.cozyMode ? 2.5 : 1.5;
        roundRect(sx - sw/2, sTop, sw, sh, 6); ctx.stroke();

        // Icon
        ctx.font      = `${sw * 0.50}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText('☕', sx, sTop + sh * 0.58);

        // Label below
        ctx.fillStyle = this.cozyMode ? '#88ccff' : '#4d7a9e';
        ctx.font      = `${W * 0.025}px sans-serif`;
        ctx.fillText('Cozy Mode', sx, fY + H * 0.035);

        // [E] hint when player is near
        if (this.nearCozyBtn) {
            const grateTop = fY - (fY - H * 0.12) * 0.10;
            ctx.font      = `bold ${W * 0.028}px monospace`;
            ctx.fillStyle = '#ffff88';
            ctx.fillText(this.cozyMode ? '[E] Exit Cozy' : '[E] Cozy Mode', sx, sTop - H * 0.03);
        }
    }

    drawRoomDecor(i, rx, cY, fY, roomH, def) {
        const grateTop = fY - roomH * 0.10;
        const mid      = rx + ROOM_PX / 2;

        if (def.id === 'airlock') {
            // Large door hatch on left wall
            const hx = rx + ROOM_PX * 0.08, hy = cY + roomH * 0.22;
            const hw = ROOM_PX * 0.10, hh = roomH * 0.55;
            const hGrad = ctx.createLinearGradient(hx, 0, hx + hw, 0);
            hGrad.addColorStop(0, '#0d1a2a'); hGrad.addColorStop(0.5, '#1a3050'); hGrad.addColorStop(1, '#0d1a2a');
            ctx.fillStyle = hGrad;
            roundRect(hx, hy, hw, hh, 8); ctx.fill();
            ctx.strokeStyle = '#4d9de0aa'; ctx.lineWidth = 2;
            roundRect(hx, hy, hw, hh, 8); ctx.stroke();
            // Handle bar
            ctx.fillStyle = '#4d9de0';
            ctx.fillRect(hx + hw * 0.35, hy + hh * 0.42, hw * 0.3, hh * 0.06);
            ctx.beginPath(); ctx.arc(hx + hw * 0.5, hy + hh * 0.45, hw * 0.07, 0, Math.PI*2); ctx.fill();

        } else if (def.id === 'farm') {
            // Grow shelves
            for (let sh = 0; sh < 3; sh++) {
                const sy = cY + roomH * (0.24 + sh * 0.17);
                // Shelf
                ctx.fillStyle = '#1a2a12';
                ctx.fillRect(rx + ROOM_PX * 0.05, sy, ROOM_PX * 0.38, 4);
                ctx.fillRect(rx + ROOM_PX * 0.57, sy, ROOM_PX * 0.38, 4);
                // Plants (little green blobs)
                for (let p = 0; p < 5; p++) {
                    const px2 = rx + ROOM_PX * 0.07 + p * ROOM_PX * 0.068;
                    const h2 = 6 + (p * 7 + sh * 3) % 10;
                    const green = sh === 0 ? '#2d7a1f' : sh === 1 ? '#3a9a25' : '#4caf50';
                    ctx.fillStyle = green;
                    ctx.beginPath(); ctx.ellipse(px2, sy - h2/2, 5, h2/2, 0, 0, Math.PI*2); ctx.fill();
                }
                for (let p = 0; p < 5; p++) {
                    const px2 = rx + ROOM_PX * 0.59 + p * ROOM_PX * 0.068;
                    const h2 = 6 + (p * 5 + sh * 4) % 10;
                    ctx.fillStyle = '#4caf50';
                    ctx.beginPath(); ctx.ellipse(px2, sy - h2/2, 5, h2/2, 0, 0, Math.PI*2); ctx.fill();
                }
                // grow light strip
                ctx.fillStyle = `rgba(100,255,100,0.15)`;
                ctx.fillRect(rx + ROOM_PX * 0.05, sy - roomH * 0.015, ROOM_PX * 0.38, 3);
            }

        } else if (def.id === 'command') {
            // Big view screen on far wall
            const sx = rx + ROOM_PX * 0.05, sy2 = cY + roomH * 0.18;
            const sw = ROOM_PX * 0.42, seh = roomH * 0.42;
            ctx.fillStyle = '#050a18';
            roundRect(sx, sy2, sw, seh, 6); ctx.fill();
            ctx.strokeStyle = '#9b59b6aa'; ctx.lineWidth = 2;
            roundRect(sx, sy2, sw, seh, 6); ctx.stroke();
            // stars on screen
            for (let si = 0; si < 15; si++) {
                const spx = sx + 8 + (si * 73) % (sw - 16);
                const spy = sy2 + 6 + (si * 47) % (seh - 12);
                ctx.fillStyle = `rgba(255,255,255,${0.3 + (si%3)*0.2})`;
                ctx.beginPath(); ctx.arc(spx, spy, 1, 0, Math.PI*2); ctx.fill();
            }
            // scan line
            const scanY = sy2 + ((this.tick * 0.4) % seh);
            ctx.fillStyle = 'rgba(155,89,182,0.15)';
            ctx.fillRect(sx, scanY, sw, 3);
            // console below screen
            ctx.fillStyle = '#1a0f2e';
            roundRect(sx, sy2 + seh + 4, sw, roomH * 0.09, 3); ctx.fill();
            ctx.strokeStyle = '#7d3c98'; ctx.lineWidth = 1;
            roundRect(sx, sy2 + seh + 4, sw, roomH * 0.09, 3); ctx.stroke();
            // blinking indicators
            for (let bi = 0; bi < 6; bi++) {
                const blink = Math.floor((this.tick * 0.05 + bi * 0.4)) % 2;
                ctx.fillStyle = blink ? ['#e74c3c','#2ecc71','#f39c12','#3498db','#9b59b6','#1abc9c'][bi] : '#111';
                ctx.beginPath(); ctx.arc(sx + 12 + bi * 14, sy2 + seh + 4 + roomH*0.045, 4, 0, Math.PI*2); ctx.fill();
            }

        } else if (def.id === 'engine') {
            // Reactor core (glowing cylinder)
            const cx2 = rx + ROOM_PX * 0.25, cy2 = cY + roomH * 0.28;
            const rw = ROOM_PX * 0.12, rh = roomH * 0.50;
            const broken = this.stations[i].broken;
            const pulse = 0.6 + 0.4 * Math.sin(this.tick * 0.08);
            const coreCol = broken ? `rgba(180,40,40,${pulse})` : `rgba(255,140,0,${pulse})`;
            // Core glow
            const cGrad = ctx.createRadialGradient(cx2, cy2 + rh/2, 0, cx2, cy2 + rh/2, rw * 2);
            cGrad.addColorStop(0, broken ? 'rgba(200,50,50,0.4)' : 'rgba(255,160,0,0.4)');
            cGrad.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = cGrad; ctx.fillRect(cx2 - rw*2, cy2, rw*4, rh);
            // Cylinder
            ctx.fillStyle = broken ? '#2a0a0a' : '#1a1000';
            ctx.fillRect(cx2 - rw/2, cy2, rw, rh);
            ctx.strokeStyle = coreCol; ctx.lineWidth = 2;
            ctx.strokeRect(cx2 - rw/2, cy2, rw, rh);
            // Pipes
            ctx.strokeStyle = '#2a2a2a'; ctx.lineWidth = 5;
            ctx.beginPath(); ctx.moveTo(cx2 - rw/2 - 5, cy2 + rh*0.2); ctx.lineTo(rx, cy2 + rh*0.2); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(cx2 - rw/2 - 5, cy2 + rh*0.6); ctx.lineTo(rx, cy2 + rh*0.6); ctx.stroke();
            ctx.strokeStyle = broken ? '#601010' : '#604010'; ctx.lineWidth = 3;
            ctx.beginPath(); ctx.moveTo(cx2 - rw/2 - 5, cy2 + rh*0.2); ctx.lineTo(rx, cy2 + rh*0.2); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(cx2 - rw/2 - 5, cy2 + rh*0.6); ctx.lineTo(rx, cy2 + rh*0.6); ctx.stroke();

        } else if (def.id === 'lifesup') {
            // Vent ducts and O2 tanks
            // large tank
            const tx = rx + ROOM_PX * 0.08, ty = cY + roomH * 0.22;
            const tw = ROOM_PX * 0.09, th = roomH * 0.50;
            const broken = this.stations[i].broken;
            ctx.fillStyle = broken ? '#1a0a0a' : '#0a1a1a';
            roundRect(tx, ty, tw, th, tw/2); ctx.fill();
            ctx.strokeStyle = broken ? '#e74c3caa' : '#1abc9caa'; ctx.lineWidth = 2;
            roundRect(tx, ty, tw, th, tw/2); ctx.stroke();
            // gauge
            const gp = this.resources.o2 / 100;
            ctx.fillStyle = broken ? '#e74c3c44' : '#1abc9c44';
            const fillH = th * 0.8 * gp;
            ctx.fillRect(tx + 4, ty + th * 0.9 - fillH, tw - 8, fillH);
            // vent pipes on ceiling
            ctx.strokeStyle = '#1a2a2a'; ctx.lineWidth = 8;
            ctx.beginPath(); ctx.moveTo(rx + ROOM_PX * 0.3, cY + roomH * 0.10); ctx.lineTo(rx + ROOM_PX * 0.3, cY + roomH * 0.20); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(rx + ROOM_PX * 0.6, cY + roomH * 0.10); ctx.lineTo(rx + ROOM_PX * 0.6, cY + roomH * 0.20); ctx.stroke();
            // vent grills
            for (const vx of [rx + ROOM_PX * 0.22, rx + ROOM_PX * 0.52]) {
                ctx.fillStyle = '#111820';
                ctx.fillRect(vx, cY + roomH * 0.19, ROOM_PX * 0.16, roomH * 0.07);
                ctx.strokeStyle = '#1abc9c55'; ctx.lineWidth = 1;
                for (let gi = 0; gi < 5; gi++) {
                    ctx.beginPath();
                    ctx.moveTo(vx + gi * ROOM_PX*0.03, cY + roomH * 0.19);
                    ctx.lineTo(vx + gi * ROOM_PX*0.03, cY + roomH * 0.26);
                    ctx.stroke();
                }
            }
        }
    }

    drawResourceBars() {
        const W  = this.W, H = this.H;
        const panY  = this.floorY + (H - this.floorY) * 0.08;
        const panH  = (H - this.floorY) * 0.85;
        ctx.fillStyle = '#080c14';
        ctx.fillRect(0, panY, W, panH);
        ctx.strokeStyle = '#1e2a40';
        ctx.lineWidth = 1;
        ctx.strokeRect(0, panY, W, panH);
        const barH  = panH * 0.30;
        const barW  = W * 0.175;
        const bY    = panY + panH * 0.18;
        const bars  = [
            { key:'o2',   label:'O2',  col:'#1abc9c', x: W*0.015 },
            { key:'power',label:'PWR', col:'#f39c12', x: W*0.235 },
            { key:'food', label:'FOOD',col:'#2ecc71', x: W*0.455 },
            { key:'hull', label:'HULL',col:'#e74c3c', x: W*0.675 },
        ];
        for (const b of bars) {
            const val  = Math.max(0, this.resources[b.key] / 100);
            const low  = val < 0.25;
            const fill = low ? '#e74c3c' : b.col;
            const glow = low && Math.floor(this.tick / 20) % 2 === 0;
            ctx.fillStyle = '#0c1220';
            roundRect(b.x, bY - 2, barW, barH + 18, 4); ctx.fill();
            ctx.strokeStyle = glow ? '#e74c3c' : b.col + '66';
            ctx.lineWidth = glow ? 2 : 1;
            roundRect(b.x, bY - 2, barW, barH + 18, 4); ctx.stroke();
            ctx.fillStyle = '#111820';
            ctx.fillRect(b.x + 4, bY + 2, barW - 8, barH - 4);
            if (val > 0) {
                const fg = ctx.createLinearGradient(b.x, 0, b.x + barW, 0);
                fg.addColorStop(0, fill + 'cc'); fg.addColorStop(1, fill);
                ctx.fillStyle = fg;
                ctx.fillRect(b.x + 4, bY + 2, (barW - 8) * val, barH - 4);
            }
            ctx.fillStyle = glow ? '#ff8888' : '#aabbcc';
            ctx.font = `bold ${W * 0.024}px monospace`;
            ctx.textAlign = 'left';
            ctx.fillText(b.label, b.x + 4, bY + barH + 14);
            ctx.textAlign = 'right';
            ctx.fillStyle = fill;
            ctx.fillText(`${Math.floor(val * 100)}%`, b.x + barW - 2, bY + barH + 14);
        }
        ctx.fillStyle = '#f1c40f';
        ctx.font = `bold ${W * 0.030}px monospace`;
        ctx.textAlign = 'right';
        ctx.fillText(`Credits: ${Math.floor(this.resources.credits)}`, W - W * 0.01, bY + barH * 0.55);
        ctx.fillStyle = '#6688aa';
        ctx.font = `${W * 0.024}px monospace`;
        ctx.textAlign = 'right';
        ctx.fillText(`DAY ${this.day}`, W - W * 0.01, bY + barH + 14);
    }

    drawAlertBanner() {
        if (this.alertTimer <= 0) return;
        const W = this.W, H = this.H;
        const alpha = Math.min(1, this.alertTimer / 40);
        ctx.font      = `bold ${W * 0.034}px sans-serif`;
        ctx.textAlign = 'center';
        const hex = Math.floor(alpha * 255).toString(16).padStart(2, '0');
        ctx.fillStyle = (this.alertColor || '#ffff88') + hex;
        ctx.fillText(this.alertMsg, W / 2, this.ceilY - H * 0.013);
    }

    drawAlienWarning() {
        if (!this.alienAttack) return;
        if (Math.floor(this.tick / 20) % 2 === 0) {
            ctx.fillStyle = 'rgba(231,76,60,0.13)';
            ctx.fillRect(0, this.ceilY, this.W, this.floorY - this.ceilY);
        }
        ctx.font      = `bold ${this.W * 0.052}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillStyle = `rgba(255,80,80,${0.6 + 0.4 * Math.sin(this.tick * 0.12)})`;
        ctx.fillText('ALIEN ATTACK!', this.W / 2, this.ceilY + (this.floorY - this.ceilY) * 0.22);
    }

    drawMobileButtons() {
        const W = this.W, H = this.H;
        const sz  = W * 0.12;
        const gap = 5;
        const by  = H * 0.913;
        const pad = W * 0.015;
        this.btnLeft  = { x: pad,              y: by, w: sz, h: sz };
        this.btnRight = { x: pad + sz + gap,   y: by, w: sz, h: sz };
        this.btnUp    = { x: W - pad - sz,     y: by, w: sz, h: sz };
        this.btnAct   = { x: W - pad - sz*2 - gap, y: by, w: sz, h: sz };
        const btn = (b, label, active) => {
            ctx.fillStyle   = active ? 'rgba(60,120,200,0.55)' : 'rgba(20,30,50,0.65)';
            ctx.strokeStyle = active ? '#4d9de0' : 'rgba(80,120,180,0.45)';
            ctx.lineWidth   = 1.5;
            roundRect(b.x, b.y, b.w, b.h, 8); ctx.fill(); ctx.stroke();
            ctx.fillStyle = active ? '#ffffff' : '#8899bb';
            ctx.font = `bold ${sz * 0.40}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.fillText(label, b.x + b.w / 2, b.y + b.h / 2 + sz * 0.14);
        };
        btn(this.btnLeft,  '<', keys.left);
        btn(this.btnRight, '>', keys.right);
        btn(this.btnUp,    '^', !this.player.onGround);
        btn(this.btnAct,   'E', this.nearStation !== null || this.nearCozyBtn);
    }

    draw() {
        const W = this.W, H = this.H;
        this.drawSpaceBg();
        this.drawHullExterior();
        for (let i = 0; i < SHIP_ROOMS; i++) {
            const rx = i * ROOM_PX - this.camX;
            if (rx + ROOM_PX < -20 || rx > W + 20) continue;
            this.drawRoom(i);
        }
        this.stations.forEach(s => s.draw(this.camX));
        this.drawCozyStation(this.camX);
        this.player.draw(this.camX);

        // Cozy mode soft overlay
        if (this.cozyMode) {
            ctx.fillStyle = 'rgba(10, 30, 60, 0.18)';
            ctx.fillRect(0, 0, W, H);
            ctx.font      = `${W * 0.028}px monospace`;
            ctx.textAlign = 'center';
            ctx.fillStyle = 'rgba(136, 204, 255, 0.55)';
            ctx.fillText('☕ COZY MODE', W / 2, this.ceilY + H * 0.048);
        }

        ctx.font      = `bold ${W * 0.026}px monospace`;
        ctx.textAlign = 'center';
        ctx.fillStyle = '#3a5070';
        ctx.fillText('I.S.S. MEISER  |  DECK A', W / 2, this.ceilY - H * 0.018);
        this.drawAlienWarning();
        this.drawResourceBars();
        this.drawAlertBanner();
    }

    start() {
        const loop = () => {
            this.update();
            this.draw();
            this.raf = requestAnimationFrame(loop);
        };
        this.raf = requestAnimationFrame(loop);
    }

    stop() {
        if (this.raf) { cancelAnimationFrame(this.raf); this.raf = null; }
    }
}
// â”€â”€ Touch input â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

// -- HTML mobile button wiring -----------------------------------------------
function bindMobileBtn(id, key) {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('touchstart',  e => { e.preventDefault(); keys[key] = true;  }, {passive:false});
    el.addEventListener('touchend',    e => { e.preventDefault(); keys[key] = false; if (key==='left'&&!keys.right||key==='right'&&!keys.left) keys.running=false; }, {passive:false});
    el.addEventListener('touchcancel', () => { keys[key] = false; keys.running = false; });
    el.addEventListener('mousedown',   () => { keys[key] = true;  });
    el.addEventListener('mouseup',     () => { keys[key] = false; keys.running = false; });
}
bindMobileBtn('mcLeft',  'left');
bindMobileBtn('mcRight', 'right');
bindMobileBtn('mcUp',    'up');

// Double-tap run for mobile left/right buttons
['mcLeft','mcRight'].forEach(id => {
    let lastTap = 0;
    const dir = id === 'mcLeft' ? 'left' : 'right';
    document.getElementById(id)?.addEventListener('touchstart', e => {
        const now = Date.now();
        if (now - lastTap < 280) { keys.running = true; }
        lastTap = now;
    }, {passive:false});
});

const mcActEl = document.getElementById('mcAct');
if (mcActEl) {
    mcActEl.addEventListener('touchstart', e => {
        e.preventDefault(); keys.interact = true; _justPressed.interact = true;
    }, {passive:false});
    mcActEl.addEventListener('touchend',    e => { e.preventDefault(); keys.interact = false; }, {passive:false});
    mcActEl.addEventListener('touchcancel', () => { keys.interact = false; });
    mcActEl.addEventListener('mousedown',   () => { keys.interact = true; _justPressed.interact = true; });
    mcActEl.addEventListener('mouseup',     () => { keys.interact = false; });
}

// â”€â”€ Menu & wiring â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async function startGame() {
    const [sheet, tiles] = await Promise.all([
        loadImage('assets/platformerPack_character.png'),
        loadImage('assets/platformPack_tilesheet.png'),
    ]);
    menu.classList.add('hidden');
    hud.classList.remove('hidden');
    if ('ontouchstart' in window) mobileControls.classList.remove('hidden');
    if (game) game.stop();
    game = new Game(sheet, tiles);
    game.start();
}

document.querySelectorAll('.menu-character-btn').forEach(c => c.addEventListener('click', startGame));

document.getElementById('retryBtn').addEventListener('click', () => {
    gameOver.classList.add('hidden');
    startGame();
});

document.getElementById('menuBtn').addEventListener('click', () => {
    if (game) { game.stop(); game = null; }
    gameOver.classList.add('hidden');
    hud.classList.add('hidden');
    mobileControls.classList.add('hidden');
    menu.classList.remove('hidden');
});

// â”€â”€ Idle starfield while on menu â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
(function idleLoop() {
    if (game) return;
    ctx.fillStyle = '#000010';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    for (const s of STARS) {
        ctx.fillStyle = `rgba(255,255,255,${0.25 + s.br * 0.55})`;
        ctx.beginPath();
        ctx.arc((s.wx / SHIP_W) * canvas.width, s.wy * canvas.height * 0.85, s.r, 0, Math.PI*2);
        ctx.fill();
    }
    requestAnimationFrame(idleLoop);
})();


