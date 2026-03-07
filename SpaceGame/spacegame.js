/* ============================================================
   SPACE STATION MANAGER
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
const WALK_FRAMES  = 4;
const WALK_SPD     = 7;   // canvas frames per walk sprite frame

// â”€â”€ World / ship â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const GRAVITY      = 0.48;
const JUMP_VY      = -10;
const MOVE_SPD     = 3.0;
const PLAYER_SCALE = 0.46;   // 96 * 0.46 â‰ˆ 44 px drawn
const FLOOR_RATIO  = 0.78;   // floor y as fraction of canvas H
const SHIP_ROOMS   = 5;
const ROOM_PX      = 500;    // world-px per room
const SHIP_W       = SHIP_ROOMS * ROOM_PX;
const CAM_EASE     = 0.10;

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
const finalScoreEl= document.getElementById('finalScore');

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
const keys = { left:false, right:false, up:false, interact:false };
const _justPressed = { interact:false };

window.addEventListener('keydown', e => {
    if (e.key === 'ArrowLeft'  || e.key === 'a')                       keys.left     = true;
    if (e.key === 'ArrowRight' || e.key === 'd')                       keys.right    = true;
    if (e.key === 'ArrowUp'    || e.key === 'w' || e.key === ' ')      keys.up       = true;
    if ((e.key === 'e' || e.key === 'E') && !keys.interact)           { keys.interact = true; _justPressed.interact = true; }
    if (e.key === ' ') e.preventDefault();
});
window.addEventListener('keyup', e => {
    if (e.key === 'ArrowLeft'  || e.key === 'a')                  keys.left     = false;
    if (e.key === 'ArrowRight' || e.key === 'd')                  keys.right    = false;
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
        this.pw       = SRC_FW * PLAYER_SCALE;
        this.ph       = SRC_FH * PLAYER_SCALE;
        this.interacting = false;
        this.interactTick= 0;
    }

    update(floorY) {
        this.moving = false;
        if (keys.left)  { this.x -= MOVE_SPD; this.facing=-1; this.moving=true; }
        if (keys.right) { this.x += MOVE_SPD; this.facing= 1; this.moving=true; }
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
            this.walkTick++;
            if (this.walkTick >= WALK_SPD) { this.walkTick=0; this.walkFrame=(this.walkFrame+1)%WALK_FRAMES; }
        }
    }

    draw(camX) {
        if (!this.sheet) return;
        let sx, sy;
        if (this.jumping)       { sx = JUMP_SX;              sy = JUMP_SY; }
        else if (this.interacting){ sx = 192;                 sy = 96; }  // thinking frame
        else if (this.moving)   { sx = this.walkFrame * SRC_FW; sy = WALK_ROW_SY; }
        else                    { sx = IDLE_SX;              sy = IDLE_SY; }

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
    constructor(sheet) {
        this.sheet     = sheet;
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
        this.raf          = null;
        this.onResize();
    }

    onResize() {
        this.W = canvas.width;
        this.H = canvas.height;
        this.floorY = this.H * FLOOR_RATIO;
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
        this.floorY = this.H * FLOOR_RATIO;
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

        // Periodic credit earn
        if (this.tick % 360 === 0) {
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

        // Interact (edge-triggered)
        if (_justPressed.interact && this.nearStation) {
            const msg = this.nearStation.tryInteract(this.resources);
            if (msg) { this.addAlert(msg, '#88ffcc'); this.player.interactTick = 80; this.player.interacting = true; }
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

    drawRoom(i) {
        const def  = ROOM_DEFS[i];
        const W    = this.W, H = this.H;
        const rx   = i * ROOM_PX - this.camX;
        const fY   = this.floorY;

        // Background
        ctx.fillStyle = def.bg;
        ctx.fillRect(rx, 0, ROOM_PX, fY);

        // Stars inside this room
        for (const s of STARS) {
            const sx = s.wx - this.camX;
            if (sx < rx - 5 || sx > rx + ROOM_PX + 5) continue;
            ctx.fillStyle = `rgba(255,255,255,${0.25 + s.br * 0.55})`;
            ctx.beginPath(); ctx.arc(sx, s.wy * fY * 0.88, s.r, 0, Math.PI*2); ctx.fill();
        }

        // Floor
        ctx.fillStyle = def.floor;
        ctx.fillRect(rx, fY, ROOM_PX, H * 0.10);

        // Wall divider (left edge, not first room)
        if (i > 0) {
            ctx.fillStyle = '#0a0a0a';
            ctx.fillRect(rx - 3, 0, 6, fY);
        }

        // Room label
        ctx.font      = `bold ${W * 0.036}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillStyle = def.accent + 'bb';
        ctx.fillText(def.icon + '  ' + def.label, rx + ROOM_PX/2, H * 0.065);

        // Station
        this.stations[i].draw(this.camX);

        // Interact hint
        if (this.nearStation === this.stations[i]) {
            const canAct = this.nearStation.needsAttention || this.nearStation.def.station.res === 'credits';
            ctx.font      = `bold ${W * 0.03}px sans-serif`;
            ctx.fillStyle = '#ffff88';
            ctx.fillText(canAct ? `[E] ${def.station.action}` : '[E] Check', rx + ROOM_PX/2, fY * 0.62);
        }
    }

    drawResourceBars() {
        const W  = this.W, H = this.H;
        const barH = H * 0.018;
        const barW = W * 0.19;
        const bY   = this.floorY + H * 0.095;
        const bars = [
            { key:'o2',    label:'Oâ‚‚',   col:'#1abc9c', x: W*0.01 },
            { key:'power', label:'PWR',  col:'#f39c12', x: W*0.26 },
            { key:'food',  label:'FOOD', col:'#2ecc71', x: W*0.51 },
            { key:'hull',  label:'HULL', col:'#e74c3c', x: W*0.76 },
        ];
        ctx.font = `${W * 0.027}px sans-serif`;
        for (const b of bars) {
            const val  = Math.max(0, this.resources[b.key] / 100);
            const fill = val < 0.25 ? '#e74c3c' : b.col;
            ctx.fillStyle = '#111'; ctx.fillRect(b.x, bY, barW, barH);
            ctx.fillStyle = fill;   ctx.fillRect(b.x, bY, barW * val, barH);
            ctx.strokeStyle = b.col; ctx.lineWidth = 1; ctx.strokeRect(b.x, bY, barW, barH);
            ctx.fillStyle = '#ccc'; ctx.textAlign = 'left';
            ctx.fillText(b.label, b.x, bY - 2);
        }
        // Credits
        ctx.fillStyle = '#f1c40f'; ctx.font = `bold ${W*0.03}px sans-serif`;
        ctx.textAlign = 'right';
        ctx.fillText(`ðŸ’° ${Math.floor(this.resources.credits)}`, W - W*0.02, bY - 2);
    }

    drawAlertBanner() {
        if (this.alertTimer <= 0) return;
        const W = this.W, H = this.H;
        const alpha = Math.min(1, this.alertTimer / 40);
        ctx.font      = `bold ${W * 0.034}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillStyle = (this.alertColor || '#ffff88') + Math.floor(alpha*255).toString(16).padStart(2,'0');
        ctx.fillText(this.alertMsg, W/2, H * 0.13);
    }

    drawAlienWarning() {
        if (!this.alienAttack) return;
        if (Math.floor(this.tick/20)%2 === 0) {
            ctx.fillStyle = 'rgba(231,76,60,0.13)';
            ctx.fillRect(0, 0, this.W, this.floorY);
        }
        ctx.font      = `bold ${this.W * 0.055}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillStyle = `rgba(255,80,80,${0.6 + 0.4 * Math.sin(this.tick * 0.12)})`;
        ctx.fillText('ðŸ‘¾ ALIEN ATTACK!', this.W/2, this.H * 0.16);
    }

    drawMobileButtons() {
        const W = this.W, H = this.H;
        const sz  = W * 0.13;
        const gap = 6;
        const by  = H * 0.90;
        const pad = W * 0.02;

        this.btnLeft  = { x: pad,             y: by, w: sz, h: sz };
        this.btnRight = { x: pad + sz + gap,   y: by, w: sz, h: sz };
        this.btnUp    = { x: W - pad - sz,     y: by, w: sz, h: sz };
        this.btnAct   = { x: W - pad - sz*2 - gap, y: by, w: sz, h: sz };

        const btn = (b, label, active) => {
            ctx.fillStyle   = active ? 'rgba(255,255,255,0.30)' : 'rgba(255,255,255,0.10)';
            ctx.strokeStyle = 'rgba(255,255,255,0.35)';
            ctx.lineWidth   = 1.5;
            roundRect(b.x, b.y, b.w, b.h, 10); ctx.fill(); ctx.stroke();
            ctx.fillStyle = '#fff'; ctx.font = `bold ${sz*0.4}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.fillText(label, b.x + b.w/2, b.y + b.h/2 + sz*0.14);
        };

        btn(this.btnLeft,  'â—€', keys.left);
        btn(this.btnRight, 'â–¶', keys.right);
        btn(this.btnUp,    'â–²', !this.player.onGround);
        btn(this.btnAct,   'E',  this.nearStation !== null);
    }

    draw() {
        const W = this.W, H = this.H;
        ctx.fillStyle = '#000010';
        ctx.fillRect(0, 0, W, H);

        // Rooms (cull off-screen)
        for (let i = 0; i < SHIP_ROOMS; i++) {
            const rx = i * ROOM_PX - this.camX;
            if (rx + ROOM_PX < 0 || rx > W) continue;
            this.drawRoom(i);
        }

        // Player
        this.player.draw(this.camX);

        // Overlays
        this.drawAlienWarning();
        this.drawResourceBars();
        this.drawAlertBanner();
        this.drawMobileButtons();
    }

    loop() { this.update(); this.draw(); this.raf = requestAnimationFrame(() => this.loop()); }
    start() { if (this.raf) cancelAnimationFrame(this.raf); this.loop(); }
    stop()  { if (this.raf) cancelAnimationFrame(this.raf); this.raf = null; }
}

// â”€â”€ Touch input â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function evalTouch(touches, down) {
    if (!game) return;
    const rect = canvas.getBoundingClientRect();
    const scX  = canvas.width  / rect.width;
    const scY  = canvas.height / rect.height;

    // Reset button states then re-evaluate all active touches
    keys.left = keys.right = keys.up = false;
    for (const t of touches) {
        const tx = (t.clientX - rect.left)  * scX;
        const ty = (t.clientY - rect.top)   * scY;
        const hit = b => b && tx>=b.x && tx<=b.x+b.w && ty>=b.y && ty<=b.y+b.h;
        if (hit(game.btnLeft))  keys.left  = true;
        if (hit(game.btnRight)) keys.right = true;
        if (hit(game.btnUp))    keys.up    = true;
        if (hit(game.btnAct) && down) { keys.interact = true; _justPressed.interact = true; }
    }
    if (!touches || touches.length === 0) keys.interact = false;
}

canvas.addEventListener('touchstart', e => { e.preventDefault(); evalTouch(e.targetTouches, true);  }, {passive:false});
canvas.addEventListener('touchend',   e => { e.preventDefault(); evalTouch(e.targetTouches, false); }, {passive:false});
canvas.addEventListener('touchmove',  e => { e.preventDefault(); evalTouch(e.targetTouches, false); }, {passive:false});

// â”€â”€ Menu & wiring â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async function startGame() {
    const sheet = await loadImage('assets/platformerPack_character.png');
    menu.classList.add('hidden');
    hud.classList.remove('hidden');
    canvas.style.pointerEvents = 'auto';   // re-enable touch for in-game buttons
    if (game) game.stop();
    game = new Game(sheet);
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
    canvas.style.pointerEvents = 'none';   // let menu receive clicks again
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

