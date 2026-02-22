/**
 * PacFamily
 * A Pac-Man-style game — eat all the dots while the family chases you!
 */
'use strict';

// ─── Constants ──────────────────────────────────────────
const COLS = 19;
const ROWS = 21;
const TUNNEL_ROW = 8;
const HUD_H = 36;

const PLAYER_SPEED          = 6.5;  // tiles / second
const GHOST_SPEED_NORMAL    = 5.0;
const GHOST_SPEED_FRIGHTENED = 3.0;
const GHOST_SPEED_EATEN     = 12.0;
const GHOST_SPEED_HOUSE     = 4.0;

const DOT_SCORE    = 10;
const PELLET_SCORE = 50;
const GHOST_SCORE  = 200;
const FRUIT_SCORE  = 150;

const FRIGHTEN_MS       = 8000;
const SCATTER_MS        = 7000;
const CHASE_MS          = 20000;
const FRUIT_MS          = 9000;
const FRUIT_SPAWN_DOTS  = 70;
const INITIAL_LIVES     = 3;

const STATE = { MENU: 0, PLAYING: 1, GAME_OVER: 2, WIN: 3, DYING: 4 };
const GMODE = { HOUSE: 0, SCATTER: 1, CHASE: 2, FRIGHTENED: 3, EATEN: 4 };

// Directions: 0=LEFT 1=UP 2=RIGHT 3=DOWN
const DX = [-1, 0, 1, 0];
const DY = [ 0,-1, 0, 1];

// Map values: 0=dot, 1=wall, 2=power-pellet, 3=ghost-floor (ghost-only except tunnel), 4=eaten
const MAP_TEMPLATE = [
//   0  1  2  3  4  5  6  7  8  9 10 11 12 13 14 15 16 17 18
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1], // 0
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1], // 1
    [1, 2, 1, 1, 0, 1, 1, 0, 1, 1, 1, 0, 1, 1, 0, 1, 1, 2, 1], // 2
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1], // 3
    [1, 0, 1, 1, 0, 1, 0, 1, 1, 1, 1, 1, 0, 1, 0, 1, 1, 0, 1], // 4
    [1, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 1], // 5
    [1, 1, 1, 1, 0, 0, 1, 1, 3, 1, 3, 1, 1, 0, 0, 1, 1, 1, 1], // 6  ghost exits col 8,10
    [1, 1, 1, 1, 0, 0, 3, 3, 3, 3, 3, 3, 3, 0, 0, 1, 1, 1, 1], // 7  ghost house top
    [3, 3, 3, 3, 0, 0, 3, 1, 3, 3, 3, 1, 3, 0, 0, 3, 3, 3, 3], // 8  tunnel + ghost house
    [1, 1, 1, 1, 0, 0, 3, 3, 3, 3, 3, 3, 3, 0, 0, 1, 1, 1, 1], // 9  ghost house bottom
    [1, 1, 1, 1, 0, 0, 1, 1, 1, 3, 1, 1, 1, 0, 0, 1, 1, 1, 1], // 10 ghost exit col 9 only
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1], // 11
    [1, 0, 1, 1, 0, 1, 1, 0, 0, 1, 0, 0, 1, 1, 0, 1, 1, 0, 1], // 12
    [1, 2, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 2, 1], // 13 power pellets
    [1, 1, 0, 1, 0, 1, 0, 1, 1, 1, 1, 1, 0, 1, 0, 1, 0, 1, 1], // 14
    [1, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 1], // 15
    [1, 0, 1, 1, 1, 1, 1, 1, 0, 1, 0, 1, 1, 1, 1, 1, 1, 0, 1], // 16
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1], // 17
    [1, 0, 1, 0, 1, 1, 0, 1, 1, 1, 1, 1, 0, 1, 1, 0, 1, 0, 1], // 18
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1], // 19
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1], // 20
];

// Key positions
const GHOST_HOUSE    = [{ col: 8, row: 8 }, { col: 10, row: 8 }];
const GHOST_EXITS    = [{ col: 8, row: 5 }, { col: 10, row: 5 }];
const SCATTER_CORNERS = [{ col: 17, row: 1 }, { col: 1, row: 19 }];
const PLAYER_START   = { col: 9, row: 17 };
const FRUIT_TILE     = { col: 9, row: 13 };

// ─── Map helpers ────────────────────────────────────────
function drawRoundRect(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r); ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r); ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r); ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r); ctx.closePath();
}

function wrapCol(col, row) {
    if (row !== TUNNEL_ROW) return col;
    if (col < 0) return COLS - 1;
    if (col >= COLS) return 0;
    return col;
}

function isPassablePlayer(col, row, map) {
    const c = wrapCol(col, row);
    if (c < 0 || c >= COLS || row < 0 || row >= ROWS) return false;
    const v = map[row][c];
    if (v === 1) return false;
    if (v === 3) return row === TUNNEL_ROW && (c <= 3 || c >= 15);
    return true;
}

function isPassableGhost(col, row, map) {
    const c = wrapCol(col, row);
    if (c < 0 || c >= COLS || row < 0 || row >= ROWS) return false;
    return map[row][c] !== 1;
}

// BFS — returns first direction (0-3) toward target, or -1 if unreachable
function bfsDir(sc, sr, tc, tr, ghost, map) {
    if (sc === tc && sr === tr) return -1;
    const passable = ghost ? isPassableGhost : isPassablePlayer;
    const visited = new Set([`${sc},${sr}`]);
    const queue = [];
    for (let d = 0; d < 4; d++) {
        const nc = wrapCol(sc + DX[d], sr), nr = sr + DY[d];
        if (passable(sc + DX[d], sr + DY[d], map) && !visited.has(`${nc},${nr}`)) {
            visited.add(`${nc},${nr}`);
            queue.push({ col: nc, row: nr, fd: d });
        }
    }
    while (queue.length) {
        const { col, row, fd } = queue.shift();
        if (col === tc && row === tr) return fd;
        for (let d = 0; d < 4; d++) {
            const rawC = col + DX[d], rawR = row + DY[d];
            const nc = wrapCol(rawC, rawR), nr = rawR;
            const key = `${nc},${nr}`;
            if (passable(rawC, rawR, map) && !visited.has(key)) {
                visited.add(key); queue.push({ col: nc, row: nr, fd });
            }
        }
    }
    return -1;
}

// ─── Assets ─────────────────────────────────────────────
const Assets = {
    images: {}, audioCtx: null, sounds: {}, audioUnlocked: false,
    loadImage(name, src) {
        return new Promise(resolve => {
            const img = new Image();
            img.onload  = () => { this.images[name] = img; resolve(img); };
            img.onerror = () => resolve(null);
            img.src = src;
        });
    },
    getImage(name) { return this.images[name] || null; },
    _ctx() {
        if (!this.audioCtx) this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        return this.audioCtx;
    },
    unlockAudio() {
        if (this.audioUnlocked) return;
        const ctx = this._ctx();
        if (ctx.state === 'suspended') ctx.resume();
        const b = ctx.createBuffer(1, 1, 22050), s = ctx.createBufferSource();
        s.buffer = b; s.connect(ctx.destination); s.start(0);
        this.audioUnlocked = true;
    },
    async loadSound(name, src) {
        try {
            const r = await fetch(src); const buf = await r.arrayBuffer();
            this.sounds[name] = await this._ctx().decodeAudioData(buf);
        } catch {}
    },
    playSound(name) {
        const buf = this.sounds[name];
        if (!buf || !this.audioCtx) return;
        try {
            if (this.audioCtx.state === 'suspended') this.audioCtx.resume();
            const s = this.audioCtx.createBufferSource();
            s.buffer = buf; s.connect(this.audioCtx.destination); s.start(0);
        } catch {}
    }
};

// ─── Scores ─────────────────────────────────────────────
const Scores = {
    KEY: 'pacFamily_best_',
    get(c)    { try { return parseInt(localStorage.getItem(this.KEY + c) || '0', 10); } catch { return 0; } },
    update(c, v) { if (v > this.get(c)) { try { localStorage.setItem(this.KEY + c, v); } catch {} return true; } return false; }
};

// ─── Player ─────────────────────────────────────────────
class Player {
    constructor(col, row, character) {
        this.character = character;
        this.col = col; this.row = row;
        this.dir = 2; this.nextDir = 2; // start facing right
        this.fraction = 0; this.moving = true;
        this.mouthA = 0.25; this.mouthSign = 1;
        this.sprite = null;
    }
    loadSprite() { this.sprite = Assets.getImage(this.character + '1'); }
    setDir(d)    { this.nextDir = d; }

    update(dt, map) {
        if (!this.moving) {
            if (isPassablePlayer(this.col + DX[this.nextDir], this.row + DY[this.nextDir], map)) {
                this.dir = this.nextDir; this.moving = true;
            }
            return;
        }
        this.fraction += PLAYER_SPEED * dt / 1000;
        while (this.fraction >= 1) {
            this.fraction -= 1;
            this.col = wrapCol(this.col + DX[this.dir], this.row);
            this.row += DY[this.dir];
            if (isPassablePlayer(this.col + DX[this.nextDir], this.row + DY[this.nextDir], map))
                this.dir = this.nextDir;
            if (!isPassablePlayer(this.col + DX[this.dir], this.row + DY[this.dir], map)) {
                this.moving = false; this.fraction = 0;
            }
        }
        this.mouthA += this.mouthSign * dt / 1000 * 5;
        if (this.mouthA > 0.35) this.mouthSign = -1;
        if (this.mouthA < 0.02) this.mouthSign =  1;
    }

    pixelPos(tile, ox, oy) {
        return {
            px: ox + (this.col + (this.moving ? DX[this.dir] * this.fraction : 0)) * tile + tile / 2,
            py: oy + (this.row + (this.moving ? DY[this.dir] * this.fraction : 0)) * tile + tile / 2
        };
    }

    draw(ctx, tile, ox, oy) {
        const { px, py } = this.pixelPos(tile, ox, oy);
        const r = tile * 0.42;
        if (this.sprite) {
            ctx.save();
            ctx.beginPath(); ctx.arc(px, py, r, 0, Math.PI * 2); ctx.clip();
            ctx.drawImage(this.sprite, px - r, py - r, r * 2, r * 2);
            ctx.restore();
            ctx.strokeStyle = 'rgba(255,215,0,0.7)';
            ctx.lineWidth = 2;
            ctx.beginPath(); ctx.arc(px, py, r + 1, 0, Math.PI * 2); ctx.stroke();
        } else {
            const ang = this.mouthA * Math.PI;
            const base = [Math.PI, -Math.PI / 2, 0, Math.PI / 2][this.dir];
            ctx.fillStyle = '#FFD600';
            ctx.beginPath(); ctx.moveTo(px, py);
            ctx.arc(px, py, r, base + ang, base + Math.PI * 2 - ang);
            ctx.closePath(); ctx.fill();
        }
    }
}

// ─── Ghost ──────────────────────────────────────────────
class Ghost {
    constructor(col, row, character, scatterCorner, exitTarget, houseTarget, exitDelay) {
        this.character = character;
        this.col = col; this.row = row;
        this.dir = 1; this.fraction = 0; this.moving = true;
        this.mode = GMODE.HOUSE;
        this.speed = GHOST_SPEED_HOUSE;
        this.frightenTimer = 0;
        this.exitDelay = exitDelay || 0;
        this.scatterCorner = scatterCorner;
        this.exitTarget    = exitTarget;
        this.houseTarget   = houseTarget;
        this.sprite = null;
    }
    loadSprite() { this.sprite = Assets.getImage(this.character + '1'); }

    frighten() {
        if (this.mode === GMODE.EATEN || this.mode === GMODE.HOUSE) return;
        this.mode = GMODE.FRIGHTENED; this.speed = GHOST_SPEED_FRIGHTENED;
        this.frightenTimer = FRIGHTEN_MS;
    }
    markEaten() {
        this.mode = GMODE.EATEN; this.speed = GHOST_SPEED_EATEN;
        this.frightenTimer = 0;
    }
    setGlobalMode(chase) {
        if (this.mode === GMODE.HOUSE || this.mode === GMODE.EATEN || this.mode === GMODE.FRIGHTENED) return;
        this.mode = chase ? GMODE.CHASE : GMODE.SCATTER;
        this.speed = GHOST_SPEED_NORMAL;
    }

    update(dt, pc, pr, map) {
        if (this.exitDelay > 0) { this.exitDelay -= dt; return; }
        if (this.mode === GMODE.FRIGHTENED) {
            this.frightenTimer -= dt;
            if (this.frightenTimer <= 0) { this.mode = GMODE.CHASE; this.speed = GHOST_SPEED_NORMAL; }
        }
        this._move(dt, pc, pr, map);
    }

    _target(pc, pr) {
        if (this.mode === GMODE.HOUSE)      return this.exitTarget;
        if (this.mode === GMODE.SCATTER)    return this.scatterCorner;
        if (this.mode === GMODE.CHASE)      return { col: pc, row: pr };
        if (this.mode === GMODE.EATEN)      return this.houseTarget;
        return null; // FRIGHTENED handled separately
    }

    _chooseDir(pc, pr, map) {
        const t = this._target(pc, pr);
        if (t) {
            const d = bfsDir(this.col, this.row, t.col, t.row, true, map);
            if (d !== -1) return d;
        }
        // FRIGHTENED or BFS failure: random valid direction, no U-turn
        const valid = [];
        for (let d = 0; d < 4; d++) {
            if (d === (this.dir + 2) % 4) continue;
            if (isPassableGhost(this.col + DX[d], this.row + DY[d], map)) valid.push(d);
        }
        return valid.length ? valid[Math.floor(Math.random() * valid.length)] : this.dir;
    }

    _move(dt, pc, pr, map) {
        if (!this.moving) {
            const d = this._chooseDir(pc, pr, map);
            if (isPassableGhost(this.col + DX[d], this.row + DY[d], map)) {
                this.dir = d; this.moving = true;
            }
            return;
        }
        this.fraction += this.speed * dt / 1000;
        while (this.fraction >= 1) {
            this.fraction -= 1;
            this.col = wrapCol(this.col + DX[this.dir], this.row);
            this.row += DY[this.dir];

            if (this.mode === GMODE.HOUSE &&
                this.col === this.exitTarget.col && this.row === this.exitTarget.row) {
                this.mode = GMODE.SCATTER; this.speed = GHOST_SPEED_NORMAL;
            }
            if (this.mode === GMODE.EATEN &&
                this.col === this.houseTarget.col && this.row === this.houseTarget.row) {
                this.mode = GMODE.SCATTER; this.speed = GHOST_SPEED_NORMAL;
            }
            const d = this._chooseDir(pc, pr, map);
            this.dir = d;
            if (!isPassableGhost(this.col + DX[d], this.row + DY[d], map)) {
                this.moving = false; this.fraction = 0;
            }
        }
    }

    pixelPos(tile, ox, oy) {
        return {
            px: ox + (this.col + (this.moving ? DX[this.dir] * this.fraction : 0)) * tile + tile / 2,
            py: oy + (this.row + (this.moving ? DY[this.dir] * this.fraction : 0)) * tile + tile / 2
        };
    }

    draw(ctx, tile, ox, oy) {
        const { px, py } = this.pixelPos(tile, ox, oy);
        const r = tile * 0.40;

        if (this.mode === GMODE.EATEN) {
            ctx.save(); ctx.globalAlpha = 0.7;
            [[-0.28, -0.18], [0.28, -0.18]].forEach(([ex, ey]) => {
                ctx.fillStyle = '#fff';
                ctx.beginPath(); ctx.arc(px + ex * r * 2, py + ey * r * 2, r * 0.35, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = '#00c';
                ctx.beginPath(); ctx.arc(px + ex * r * 2 + DX[this.dir] * r * 0.1,
                    py + ey * r * 2, r * 0.16, 0, Math.PI * 2); ctx.fill();
            });
            ctx.restore(); return;
        }

        const blinking = this.mode === GMODE.FRIGHTENED && this.frightenTimer < 2000
            && Math.floor(Date.now() / 220) % 2 === 0;

        if (this.mode === GMODE.FRIGHTENED && !blinking) {
            this._drawBody(ctx, px, py, r, '#1a44ee', 'rgba(100,160,255,0.5)');
            ctx.fillStyle = '#fff';
            [[-0.3, 0], [0.3, 0]].forEach(([ex, ey]) => {
                ctx.beginPath(); ctx.arc(px + ex * r, py + ey * r - r * 0.12, r * 0.17, 0, Math.PI * 2); ctx.fill();
            });
            ctx.strokeStyle = '#fff'; ctx.lineWidth = r * 0.18;
            ctx.beginPath(); ctx.moveTo(px - r * 0.45, py + r * 0.35);
            ctx.lineTo(px - r * 0.15, py + r * 0.2); ctx.lineTo(px + r * 0.15, py + r * 0.35);
            ctx.lineTo(px + r * 0.45, py + r * 0.2); ctx.stroke();
            return;
        }

        if (this.sprite) {
            ctx.save();
            this._clipBody(ctx, px, py, r); ctx.clip();
            ctx.drawImage(this.sprite, px - r, py - r, r * 2, r * 2);
            ctx.restore();
            ctx.strokeStyle = 'rgba(255,80,80,0.75)'; ctx.lineWidth = 2;
            this._clipBody(ctx, px, py, r); ctx.stroke();
        } else {
            this._drawBody(ctx, px, py, r, '#ff4444', 'rgba(255,100,100,0.5)');
        }
    }

    _clipBody(ctx, px, py, r) {
        ctx.beginPath();
        ctx.arc(px, py - r * 0.15, r, Math.PI, 0);
        ctx.lineTo(px + r, py + r * 0.65);
        for (let i = 4; i >= 0; i--)
            ctx.lineTo(px - r + (i * 2 * r / 4), py + r * 0.65 * (i % 2 === 0 ? 1 : 0.35));
        ctx.lineTo(px - r, py + r * 0.65);
        ctx.closePath();
    }

    _drawBody(ctx, px, py, r, fill, glow) {
        ctx.fillStyle = fill;
        ctx.shadowColor = glow; ctx.shadowBlur = 8;
        this._clipBody(ctx, px, py, r); ctx.fill();
        ctx.shadowBlur = 0;
    }
}

// ─── Game ───────────────────────────────────────────────
class PacFamilyGame {
    constructor() {
        this.wrapper   = document.getElementById('gameWrapper');
        this.canvas    = document.getElementById('gameCanvas');
        this.ctx       = this.canvas.getContext('2d');
        this.state     = STATE.MENU;
        this.character = 'calvin';
        this.score = 0; this.lives = INITIAL_LIVES;
        this.map = []; this.player = null; this.ghosts = [];
        this.dotsEaten = 0; this.totalDots = 0;
        this.fruit = { present: false, timer: 0 };
        this.modeTimer = SCATTER_MS; this.modePhase = 0;
        this.dyingTimer = 0; this.lastTs = 0;
        this.tile = 20; this.offX = 0; this.offY = HUD_H;
        this.raf = null;
    }

    async init() {
        this.setupInput();
        await this.loadAssets();
        this.showMenu();
    }

    async loadAssets() {
        const base = '../assets/';
        await Promise.all([
            Assets.loadImage('calvin1', base + 'calvin1.png'),
            Assets.loadImage('bailey1', base + 'bailey1.png'),
            Assets.loadImage('lilly1',  base + 'lilly1.png'),
        ]);
        await Promise.all([
            Assets.loadSound('eat',    base + 'point.mp3'),
            Assets.loadSound('pellet', base + 'flap.mp3'),
            Assets.loadSound('hit',    base + 'hit.mp3'),
        ]).catch(() => {});
    }

    setupInput() {
        const unlock = () => Assets.unlockAudio();
        document.addEventListener('touchstart', unlock, { once: true });
        document.addEventListener('click',      unlock, { once: true });

        const MAP_KEY = { ArrowLeft:0, KeyA:0, ArrowUp:1, KeyW:1, ArrowRight:2, KeyD:2, ArrowDown:3, KeyS:3 };
        document.addEventListener('keydown', e => {
            const d = MAP_KEY[e.code];
            if (d !== undefined && this.state === STATE.PLAYING && this.player) {
                this.player.setDir(d); e.preventDefault();
            }
        });

        let tx0 = 0, ty0 = 0;
        this.canvas.addEventListener('touchstart', e => { tx0 = e.touches[0].clientX; ty0 = e.touches[0].clientY; }, { passive: true });
        this.canvas.addEventListener('touchend',   e => {
            if (this.state !== STATE.PLAYING) return;
            const dx = e.changedTouches[0].clientX - tx0;
            const dy = e.changedTouches[0].clientY - ty0;
            if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return;
            this.player.setDir(Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 0 : 2) : (dy < 0 ? 1 : 3));
        }, { passive: true });

        window.addEventListener('resize', () => this.resize());

        document.querySelectorAll('.menu-character-btn').forEach(btn =>
            btn.addEventListener('click', () => this.startGame(btn.dataset.character)));
        document.getElementById('restartBtn').addEventListener('click', () => this.startGame(this.character));
        document.getElementById('menuBtn').addEventListener('click',    () => this.showMenu());
    }

    resize() {
        this.canvas.width  = this.wrapper.clientWidth;
        this.canvas.height = this.wrapper.clientHeight;
        const availH = this.canvas.height - HUD_H;
        this.tile = Math.floor(Math.min(this.canvas.width / COLS, availH / ROWS));
        this.offX = Math.floor((this.canvas.width  - this.tile * COLS) / 2);
        this.offY = HUD_H + Math.floor((availH - this.tile * ROWS) / 2);
    }

    showMenu() {
        if (this.raf) { cancelAnimationFrame(this.raf); this.raf = null; }
        this.state = STATE.MENU;
        document.getElementById('menu').classList.remove('hidden');
        document.getElementById('gameOver').classList.add('hidden');
        document.getElementById('hud').classList.add('hidden');
        this.updateBestLabels();
        this.resize();
    }

    updateBestLabels() {
        document.getElementById('calvinBest').textContent = Scores.get('calvin');
        document.getElementById('baileyBest').textContent = Scores.get('bailey');
        document.getElementById('lillyBest').textContent  = Scores.get('lilly');
    }

    startGame(character) {
        this.character = character;
        this.score = 0; this.lives = INITIAL_LIVES;
        this.modeTimer = SCATTER_MS; this.modePhase = 0;
        document.getElementById('menu').classList.add('hidden');
        document.getElementById('gameOver').classList.add('hidden');
        document.getElementById('hud').classList.remove('hidden');
        this.resize();
        this._resetRound();
        this.state = STATE.PLAYING;
        if (this.raf) cancelAnimationFrame(this.raf);
        this.lastTs = performance.now();
        this.raf = requestAnimationFrame(ts => this.gameLoop(ts));
    }

    _resetRound() {
        this.map = MAP_TEMPLATE.map(r => r.slice());
        this.totalDots = 0; this.dotsEaten = 0;
        for (let r = 0; r < ROWS; r++)
            for (let c = 0; c < COLS; c++)
                if (this.map[r][c] === 0 || this.map[r][c] === 2) this.totalDots++;
        this.fruit = { present: false, timer: 0 };

        this.player = new Player(PLAYER_START.col, PLAYER_START.row, this.character);
        this.player.loadSprite();

        const chasers = ['calvin', 'bailey', 'lilly'].filter(c => c !== this.character);
        this.ghosts = chasers.map((ch, i) => {
            const g = new Ghost(
                GHOST_HOUSE[i].col, GHOST_HOUSE[i].row, ch,
                SCATTER_CORNERS[i], GHOST_EXITS[i], GHOST_HOUSE[i],
                i === 1 ? 3000 : 0   // ghost 1 exits 3s later
            );
            g.loadSprite(); return g;
        });

        // Eat starting tile
        this._eatTile(PLAYER_START.col, PLAYER_START.row);
    }

    gameLoop(ts) {
        const dt = Math.min(ts - this.lastTs, 50);
        this.lastTs = ts;
        this.update(dt);
        this.draw();
        if (this.state !== STATE.GAME_OVER && this.state !== STATE.WIN && this.state !== STATE.MENU)
            this.raf = requestAnimationFrame(ts => this.gameLoop(ts));
    }

    update(dt) {
        if (this.state === STATE.DYING) {
            this.dyingTimer -= dt;
            if (this.dyingTimer <= 0) {
                this.lives--;
                if (this.lives <= 0) { this._showEnd(false); return; }
                this._resetRound(); this.state = STATE.PLAYING;
            }
            return;
        }
        if (this.state !== STATE.PLAYING) return;

        // Global scatter/chase cycling
        this.modeTimer -= dt;
        if (this.modeTimer <= 0) {
            this.modePhase++;
            const phases = [SCATTER_MS, CHASE_MS, SCATTER_MS, CHASE_MS, CHASE_MS * 100];
            this.modeTimer = phases[Math.min(this.modePhase, phases.length - 1)];
            const chase = this.modePhase % 2 !== 0;
            this.ghosts.forEach(g => g.setGlobalMode(chase));
        }

        this.player.update(dt, this.map);
        this.ghosts.forEach(g => g.update(dt, this.player.col, this.player.row, this.map));
        this._checkPickups(dt);
        this._checkGhostCollision();
    }

    _eatTile(col, row) {
        const v = this.map[row]?.[col];
        if (v === 0 || v === 2) {
            this.map[row][col] = 4;
            this.dotsEaten++;
            if (v === 0) { this.score += DOT_SCORE;    Assets.playSound('eat'); }
            if (v === 2) {
                this.score += PELLET_SCORE;
                Assets.playSound('pellet');
                this.ghosts.forEach(g => g.frighten());
            }
            if (this.dotsEaten === FRUIT_SPAWN_DOTS && !this.fruit.present)
                this.fruit = { present: true, timer: FRUIT_MS };
            if (this.dotsEaten >= this.totalDots) this._showEnd(true);
        }
    }

    _checkPickups(dt) {
        if (this.player.fraction < 0.12)
            this._eatTile(this.player.col, this.player.row);

        if (this.fruit.present) {
            this.fruit.timer -= dt;
            if (this.fruit.timer <= 0) { this.fruit.present = false; return; }
            if (this.player.col === FRUIT_TILE.col && this.player.row === FRUIT_TILE.row
                && this.player.fraction < 0.12) {
                this.score += FRUIT_SCORE;
                this.fruit.present = false;
                Assets.playSound('pellet');
            }
        }
    }

    _checkGhostCollision() {
        if (this.state !== STATE.PLAYING) return;
        const { px: ppx, py: ppy } = this.player.pixelPos(this.tile, this.offX, this.offY);
        for (const g of this.ghosts) {
            if (g.mode === GMODE.EATEN || g.mode === GMODE.HOUSE) continue;
            const { px: gpx, py: gpy } = g.pixelPos(this.tile, this.offX, this.offY);
            if (Math.hypot(ppx - gpx, ppy - gpy) < this.tile * 0.72) {
                if (g.mode === GMODE.FRIGHTENED) {
                    g.markEaten(); this.score += GHOST_SCORE; Assets.playSound('eat');
                } else {
                    Assets.playSound('hit');
                    this.state = STATE.DYING; this.dyingTimer = 1200; return;
                }
            }
        }
    }

    _showEnd(win) {
        this.state = win ? STATE.WIN : STATE.GAME_OVER;
        Scores.update(this.character, this.score);
        document.getElementById('endTitle').textContent      = win ? 'You Win! 🎉' : 'Game Over!';
        document.getElementById('finalScore').textContent    = this.score;
        document.getElementById('finalBest').textContent     = Scores.get(this.character);
        document.getElementById('gameOver').classList.remove('hidden');
        document.getElementById('hud').classList.add('hidden');
        this.updateBestLabels();
    }

    // ─── Drawing ──────────────────────────────────────────
    draw() {
        const { ctx, canvas } = this;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#0d0d1a';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        this._drawMaze();
        if (this.fruit.present) this._drawFruit();
        this.ghosts.forEach(g => g.draw(ctx, this.tile, this.offX, this.offY));
        if (this.state !== STATE.DYING || Math.floor(this.dyingTimer / 150) % 2 === 0)
            this.player.draw(ctx, this.tile, this.offX, this.offY);
        this._drawHUD();
    }

    _drawMaze() {
        const { ctx, map, tile, offX, offY } = this;
        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                const x = offX + c * tile, y = offY + r * tile;
                const v = map[r][c];
                if (v === 1) {
                    ctx.fillStyle = '#1a55dd'; ctx.fillRect(x, y, tile, tile);
                    ctx.fillStyle = '#2266ff'; ctx.fillRect(x + 2, y + 2, tile - 4, tile - 4);
                } else if (v === 0) {
                    ctx.fillStyle = '#ffdf80';
                    ctx.beginPath(); ctx.arc(x + tile / 2, y + tile / 2, tile * 0.11, 0, Math.PI * 2); ctx.fill();
                } else if (v === 2) {
                    const pulse = 0.75 + 0.25 * Math.sin(Date.now() / 200);
                    ctx.fillStyle = '#ffeb3b'; ctx.shadowColor = '#ffeb3b'; ctx.shadowBlur = 10;
                    ctx.beginPath(); ctx.arc(x + tile / 2, y + tile / 2, tile * 0.28 * pulse, 0, Math.PI * 2); ctx.fill();
                    ctx.shadowBlur = 0;
                }
                // v ===  3 (ghost floor) and v === 4 (eaten) → dark floor, no dot drawn
            }
        }
    }

    _drawFruit() {
        const { ctx, tile, offX, offY } = this;
        const px = offX + FRUIT_TILE.col * tile + tile / 2;
        const py = offY + FRUIT_TILE.row * tile + tile / 2;
        const scale = 0.9 + 0.1 * Math.sin(Date.now() / 150);
        ctx.font = `${tile * 0.9 * scale}px serif`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('🍒', px, py);
    }

    _drawHUD() {
        const { lives, score, totalDots, dotsEaten } = this;
        document.getElementById('scoreHUD').textContent = score;
        let hearts = '';
        for (let i = 0; i < INITIAL_LIVES; i++) hearts += i < lives ? '♥' : '♡';
        document.getElementById('livesHUD').textContent = hearts;
        document.getElementById('dotsHUD').textContent  = totalDots - dotsEaten;

        if (this.state === STATE.DYING) {
            const { ctx, canvas } = this;
            const alpha = Math.max(0, (1200 - this.dyingTimer) / 1200) * 0.45;
            ctx.fillStyle = `rgba(220,0,0,${alpha})`;
            ctx.fillRect(0, HUD_H, canvas.width, canvas.height - HUD_H);
        }
    }
}

// ─── Boot ────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    const game = new PacFamilyGame();
    game.init();
});
