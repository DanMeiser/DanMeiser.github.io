/**
 * Family Fling
 * Slingshot your character at towers to knock out the other two!
 */

// ─── Constants ──────────────────────────────────────────────────────────────
const STATE = { MENU: 0, PLAYING: 1, LEVEL_COMPLETE: 2, GAME_OVER: 3 };

const GRAVITY           = 0.36;
const PROJECTILE_RADIUS = 22;
const RESTITUTION_GND   = 0.28;
const RESTITUTION_BLOCK = 0.22;
const FRICTION_GND      = 0.80;
const ANGULAR_DRAG      = 0.88;
const MAX_PULL          = 85;
const LAUNCH_POWER      = 0.30;
const TRAIL_LEN         = 30;
const SCORE_BLOCK       = 50;
const SCORE_ENEMY       = 300;
const SCORE_SHOT_BONUS  = 150;
const GROUND_RATIO      = 0.145; // fraction of canvas height taken by ground

// ─── Tiny asset cache ───────────────────────────────────────────────────────
const Assets = {
    _imgs: {},
    load(name, src) {
        return new Promise(res => {
            const img = new Image();
            img.onload  = () => { this._imgs[name] = img; res(img); };
            img.onerror = () => { console.warn('Asset missing:', src); res(null); };
            img.src = src;
        });
    },
    get(name) { return this._imgs[name] || null; },
};

// ─── Physics body (block / enemy) ───────────────────────────────────────────
class PhysicsBody {
    constructor(cx, cy, w, h, type, imgKey = null) {
        this.cx = cx;   this.cy = cy;
        this.w  = w;    this.h  = h;
        this.vx = 0;    this.vy = 0;
        this.angle = 0; this.omega = 0;
        this.type    = type;     // 'wood' | 'stone' | 'plank' | 'enemy'
        this.imgKey  = imgKey;
        this.hp      = type === 'stone' ? 2 : type === 'enemy' ? 2 : 1;
        this.isStatic = true;
        this.alive   = true;
        this.scored  = false;
        this.flash   = 0;
        this.radius  = Math.hypot(w, h) * 0.5; // circle approx for block-block
    }
    get left()   { return this.cx - this.w * 0.5; }
    get right()  { return this.cx + this.w * 0.5; }
    get top()    { return this.cy - this.h * 0.5; }
    get bottom() { return this.cy + this.h * 0.5; }
}

// ─── Flying projectile ──────────────────────────────────────────────────────
class Projectile {
    constructor(x, y, vx, vy, imgKey) {
        this.x = x; this.y = y;
        this.vx = vx; this.vy = vy;
        this.r = PROJECTILE_RADIUS;
        this.imgKey = imgKey;
        this.angle  = 0;
        this.trail  = [];
        this.alive  = true;
        this.bounces = 0;
    }
}

// ─── Floating score popup ───────────────────────────────────────────────────
class Popup {
    constructor(x, y, text, color) {
        this.x = x; this.y = y;
        this.text  = text;
        this.color = color;
        this.life  = 1.0;
        this.vy    = -1.6;
    }
    update()    { this.y += this.vy; this.life -= 0.022; }
    get alive() { return this.life > 0; }
}

// ─── Level builder ──────────────────────────────────────────────────────────
// Returns an array of PhysicsBody objects for the given level index (1-5).
// char2/char3 are the two enemies (e.g. 'bailey', 'lilly').
function buildLevel(lvl, W, H, groundY, char2, char3) {
    const bodies = [];
    const BW = Math.round(W * 0.056);   // block square side
    const BH = BW;
    const PW = Math.round(W * 0.116);   // plank (wide, thin)
    const PH = Math.round(W * 0.026);
    const EW = Math.round(BW * 1.15);   // enemy block (slightly bigger)
    const EH = EW;
    const g  = groundY;
    const s  = BW * 1.08;               // standard spacing between block centres

    function woodBlock(cx, cy) {
        bodies.push(new PhysicsBody(cx, cy, BW, BH, 'wood'));
    }
    function stoneBlock(cx, cy) {
        bodies.push(new PhysicsBody(cx, cy, BW, BH, 'stone'));
    }
    function plank(cx, cy) {
        bodies.push(new PhysicsBody(cx, cy, PW, PH, 'plank'));
    }
    function enemy(cx, cy, who) {
        bodies.push(new PhysicsBody(cx, cy, EW, EH, 'enemy', who));
    }
    // Shorthand: column of n wood blocks, bottom-most first
    function woodCol(cx, n) {
        for (let i = 0; i < n; i++) woodBlock(cx, g - BH * (i + 0.5));
    }
    function stoneCol(cx, n) {
        for (let i = 0; i < n; i++) stoneBlock(cx, g - BH * (i + 0.5));
    }

    const lev = ((lvl - 1) % 5) + 1;

    if (lev === 1) {
        // ── Three small towers ──
        const t1 = W * 0.58;
        woodCol(t1, 2);
        woodBlock(t1 - s * 0.5, g - BH * 0.5); // flanking block
        woodBlock(t1 + s * 0.5, g - BH * 0.5);
        enemy(t1, g - BH * 2.7, char2);

        const t2 = W * 0.74;
        woodCol(t2, 2);
        woodBlock(t2 - s * 0.5, g - BH * 0.5);
        woodBlock(t2 + s * 0.5, g - BH * 0.5);

        const t3 = W * 0.88;
        woodCol(t3, 2);
        woodBlock(t3, g - BH * 2.5);
        enemy(t3, g - BH * 3.7, char3);
    }

    if (lev === 2) {
        // ── Two taller towers with plank bridges ──
        const t1 = W * 0.60;
        woodCol(t1 - s, 3);
        woodCol(t1,     3);
        woodCol(t1 + s, 3);
        plank(t1, g - BH * 3.6);
        enemy(t1, g - BH * 4.3, char2);

        const t2 = W * 0.82;
        woodCol(t2 - s * 0.5, 3);
        woodCol(t2 + s * 0.5, 3);
        plank(t2, g - BH * 3.6);
        woodBlock(t2, g - BH * 4.15);
        enemy(t2, g - BH * 4.85, char3);
    }

    if (lev === 3) {
        // ── Spread-out structures with stone pillars ──
        const t1 = W * 0.56;
        woodCol(t1 - s, 2);
        stoneCol(t1, 2);
        woodCol(t1 + s, 2);
        plank(t1, g - BH * 2.6);
        woodBlock(t1 - s, g - BH * 2.5);
        woodBlock(t1 + s, g - BH * 2.5);
        enemy(t1 - s * 0.5, g - BH * 3.5, char2);
        enemy(t1 + s * 0.5, g - BH * 3.5, char3);
        stoneBlock(t1, g - BH * 3.6);

        // Detached pile on the right
        const t2 = W * 0.84;
        woodCol(t2 - s * 0.5, 3);
        woodCol(t2 + s * 0.5, 3);
        woodBlock(t2, g - BH * 0.5);
        woodBlock(t2, g - BH * 1.5);
        stoneBlock(t2, g - BH * 2.5);
    }

    if (lev === 4) {
        // ── Wide fortress with inner chambers ──
        const base = W * 0.56;
        const span = s * 4;
        // Outer walls (4 columns high)
        woodCol(base,          4);
        woodCol(base + span,   4);
        // Inner columns
        woodCol(base + s * 1.5, 2);
        woodCol(base + s * 2.5, 2);
        // Ground fill between outer walls
        woodBlock(base + s,     g - BH * 0.5);
        woodBlock(base + s * 3, g - BH * 0.5);
        // Stone caps on inner columns
        stoneBlock(base + s * 1.5, g - BH * 2.5);
        stoneBlock(base + s * 2.5, g - BH * 2.5);
        // Roof planks
        plank(base + span * 0.25, g - BH * 4.6);
        plank(base + span * 0.75, g - BH * 4.6);
        // Enemies on roof
        enemy(base + span * 0.25, g - BH * 5.3, char2);
        enemy(base + span * 0.75, g - BH * 5.3, char3);

        // Right-side bonus column
        const t2 = W * 0.91;
        stoneCol(t2, 3);
        woodBlock(t2, g - BH * 3.5);
    }

    if (lev === 5) {
        // ── Mega fortress ──
        const base = W * 0.53;
        const cols = 5;
        // Bottom row across 5 cols
        for (let i = 0; i < cols; i++) woodBlock(base + s * i, g - BH * 0.5);
        // Second row: alternate stone / wood
        for (let i = 0; i < cols; i++) {
            (i % 2 === 0 ? stoneBlock : woodBlock)(base + s * i, g - BH * 1.5);
        }
        // Third row: wood
        for (let i = 0; i < cols; i++) woodBlock(base + s * i, g - BH * 2.5);
        // Fourth row: stone
        for (let i = 0; i < cols; i++) stoneBlock(base + s * i, g - BH * 3.5);
        // Wide plank cap
        plank(base + s * 1.0, g - BH * 4.2);
        plank(base + s * 3.0, g - BH * 4.2);
        // Fifth row mid section
        woodBlock(base + s, g - BH * 4.6);
        stoneBlock(base + s * 2, g - BH * 4.6);
        woodBlock(base + s * 3, g - BH * 4.6);
        // Enemies
        enemy(base + s * 0.8, g - BH * 5.45, char2);
        enemy(base + s * 3.2, g - BH * 5.45, char3);
        // Top stone
        stoneBlock(base + s * 2, g - BH * 5.5);

        // Detached right spike
        const t2 = W * 0.92;
        woodCol(t2, 2);
        stoneBlock(t2, g - BH * 2.5);
        woodBlock(t2, g - BH * 3.5);
    }

    return bodies;
}

// ─── Main game class ────────────────────────────────────────────────────────
class FamilyFlingGame {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx    = this.canvas.getContext('2d');

        this.state     = STATE.MENU;
        this.character = 'calvin';
        this.enemies   = ['bailey', 'lilly'];
        this.level     = 1;
        this.score     = 0;

        this.bodies    = [];
        this.shot      = null;
        this.shotsLeft = 3;
        this.popups    = [];

        // Slingshot aim state
        this.isAiming  = false;
        this.dragX     = 0;
        this.dragY     = 0;

        // Settle timer: wait after projectile dies before checking win/lose
        this.settleTimer = 0;

        // High scores
        this.bests = { calvin: 0, bailey: 0, lilly: 0 };
        this._loadBests();

        this.resize();
        window.addEventListener('resize', () => this.resize());
        this._setupInput();
        this._setupUI();
        requestAnimationFrame(() => this._loop());
    }

    // ── Getters ──────────────────────────────────────────────────────────────
    get groundY()   { return this.canvas.height * (1 - GROUND_RATIO); }
    get forkX()     { return this.canvas.width  * 0.128; }
    // Anchor fork to groundY so the slingshot trunk always reaches the ground
    // regardless of the canvas aspect ratio (portrait or landscape).
    get forkRestY() { return this.groundY - this.canvas.width * 0.20; }

    // ── Persistence ──────────────────────────────────────────────────────────
    _loadBests() {
        ['calvin', 'bailey', 'lilly'].forEach(c => {
            this.bests[c] = parseInt(localStorage.getItem('ff_best_' + c)) || 0;
            const el = document.getElementById(c + 'Best');
            if (el) el.textContent = this.bests[c];
        });
    }
    _saveBest() {
        const c = this.character;
        if (this.score > this.bests[c]) {
            this.bests[c] = this.score;
            localStorage.setItem('ff_best_' + c, this.score);
        }
    }

    // ── Canvas resize ────────────────────────────────────────────────────────
    resize() {
        const wrapper = document.getElementById('gameWrapper');
        this.canvas.width  = wrapper.clientWidth;
        this.canvas.height = wrapper.clientHeight;
        if (this.state === STATE.PLAYING) {
            this.bodies = buildLevel(
                this.level, this.canvas.width, this.canvas.height,
                this.groundY, this.enemies[0], this.enemies[1]
            );
        }
    }

    // ── Input ─────────────────────────────────────────────────────────────────
    _setupInput() {
        const c = this.canvas;

        // Virtual-joystick state for touch — lets the user start anywhere and
        // drag without their finger going off the left edge of the screen.
        this._touchStartX = 0;
        this._touchStartY = 0;
        this._usingTouch  = false;

        const applyDrag = (targetX, targetY) => {
            // Clamp to MAX_PULL radius from fork rest position
            const dx = targetX - this.forkX, dy = targetY - this.forkRestY;
            const dist = Math.hypot(dx, dy);
            if (dist > MAX_PULL) {
                const s = MAX_PULL / dist;
                targetX = this.forkX + dx * s;
                targetY = this.forkRestY + dy * s;
            }
            // Clamp to screen bounds
            this.dragX = Math.max(3, Math.min(this.canvas.width  - 3, targetX));
            this.dragY = Math.max(3, Math.min(this.canvas.height - 3, targetY));
        };

        const onStartMouse = (px, py) => {
            if (this.state !== STATE.PLAYING) return;
            if (this.shot && this.shot.alive)  return;
            if (this.shotsLeft <= 0)           return;
            // Mouse: must begin near the slingshot fork
            const dx = px - this.forkX, dy = py - this.forkRestY;
            if (Math.hypot(dx, dy) < 100) {
                this._usingTouch = false;
                this.isAiming    = true;
                this.dragX = this.forkX;
                this.dragY = this.forkRestY;
            }
        };

        const onStartTouch = (px, py) => {
            if (this.state !== STATE.PLAYING) return;
            if (this.shot && this.shot.alive)  return;
            if (this.shotsLeft <= 0)           return;
            // Touch: accept anywhere on the left 50% of the canvas so the thumb
            // never has to reach precisely to the fork.
            if (px <= this.canvas.width * 0.50) {
                this._usingTouch  = true;
                this._touchStartX = px;
                this._touchStartY = py;
                this.isAiming     = true;
                this.dragX = this.forkX;
                this.dragY = this.forkRestY;
            }
        };

        const onMove = (px, py) => {
            if (!this.isAiming) return;
            if (this._usingTouch) {
                // Virtual joystick: translate the finger delta onto the fork rest
                const deltaX = px - this._touchStartX;
                const deltaY = py - this._touchStartY;
                applyDrag(this.forkX + deltaX, this.forkRestY + deltaY);
            } else {
                applyDrag(px, py);
            }
        };

        const onEnd = () => {
            if (!this.isAiming) return;
            this.isAiming = false;
            this._launch();
        };

        const pos = (e) => {
            const r = c.getBoundingClientRect();
            return [e.clientX - r.left, e.clientY - r.top];
        };
        const tpos = (e) => {
            const r = c.getBoundingClientRect(), t = e.touches[0];
            return [t.clientX - r.left, t.clientY - r.top];
        };

        c.addEventListener('mousedown',  e => { const [x,y] = pos(e);  onStartMouse(x, y); });
        c.addEventListener('mousemove',  e => { const [x,y] = pos(e);  onMove(x, y); });
        c.addEventListener('mouseup',    ()  => onEnd());
        c.addEventListener('mouseleave', ()  => onEnd());
        c.addEventListener('touchstart', e => { e.preventDefault(); const [x,y] = tpos(e); onStartTouch(x, y); }, { passive: false });
        c.addEventListener('touchmove',  e => { e.preventDefault(); const [x,y] = tpos(e); onMove(x, y); },        { passive: false });
        c.addEventListener('touchend',   e => { e.preventDefault(); onEnd(); },                                     { passive: false });
    }

    _launch() {
        const vx = (this.forkX     - this.dragX) * LAUNCH_POWER;
        const vy = (this.forkRestY - this.dragY) * LAUNCH_POWER;
        if (Math.hypot(vx, vy) < 0.4) return;
        this.shot = new Projectile(this.dragX, this.dragY, vx, vy, this.character + '1');
        this.shotsLeft--;
        document.getElementById('shots').textContent = this.shotsLeft;
        this.settleTimer = 0;
    }

    // ── UI wiring ─────────────────────────────────────────────────────────────
    _setupUI() {
        document.querySelectorAll('.menu-character-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.character = btn.dataset.character;
                this.enemies   = ['calvin', 'bailey', 'lilly'].filter(c => c !== this.character);
                this._startGame();
            });
        });
        document.getElementById('nextLevelBtn').addEventListener('click', () => {
            this.level++;
            this._startLevel();
        });
        document.getElementById('levelMenuBtn').addEventListener('click', () => this._showMenu());
        document.getElementById('restartBtn').addEventListener('click', () => { this.level = 1; this.score = 0; this._startLevel(); });
        document.getElementById('menuBtn').addEventListener('click',    () => this._showMenu());
    }

    _showMenu() {
        this.state = STATE.MENU;
        document.getElementById('menu').classList.remove('hidden');
        document.getElementById('gameOver').classList.add('hidden');
        document.getElementById('levelComplete').classList.add('hidden');
        document.getElementById('hud').classList.add('hidden');
        this._loadBests();
    }

    _startGame() {
        this.level = 1;
        this.score = 0;
        this._startLevel();
    }

    _startLevel() {
        const MAX_SHOTS = [0, 4, 5, 6, 7, 8];
        this.shotsLeft   = MAX_SHOTS[Math.min(this.level, 5)];
        this.shot        = null;
        this.popups      = [];
        this.isAiming    = false;
        this.settleTimer = 0;
        this.state       = STATE.PLAYING;

        this.bodies = buildLevel(
            this.level, this.canvas.width, this.canvas.height,
            this.groundY, this.enemies[0], this.enemies[1]
        );

        document.getElementById('menu').classList.add('hidden');
        document.getElementById('gameOver').classList.add('hidden');
        document.getElementById('levelComplete').classList.add('hidden');
        document.getElementById('hud').classList.remove('hidden');
        document.getElementById('score').textContent = this.score;
        document.getElementById('level').textContent = this.level;
        document.getElementById('shots').textContent = this.shotsLeft;
    }

    _levelComplete() {
        this.state = STATE.LEVEL_COMPLETE;
        const bonus = this.shotsLeft * SCORE_SHOT_BONUS;
        this.score += bonus;
        this._saveBest();
        document.getElementById('levelScore').textContent = this.score;
        document.getElementById('bonusMsg').textContent   = bonus > 0 ? `+${bonus} shot bonus!` : '';
        document.getElementById('levelCompleteTitle').textContent =
            this.level >= 5 ? '🎉 You Win!' : `Level ${this.level} Complete!`;
        const nextBtn = document.getElementById('nextLevelBtn');
        if (this.level >= 5) {
            nextBtn.textContent = 'Play Again ▶';
            nextBtn.onclick = () => { this.level = 1; this.score = 0; this._startLevel(); };
        } else {
            nextBtn.textContent = 'Next Level ▶';
            nextBtn.onclick = () => { this.level++; this._startLevel(); };
        }
        document.getElementById('levelComplete').classList.remove('hidden');
        document.getElementById('hud').classList.add('hidden');
    }

    _gameOver() {
        this.state = STATE.GAME_OVER;
        this._saveBest();
        document.getElementById('finalScore').textContent = this.score;
        document.getElementById('finalBest').textContent  = this.bests[this.character];
        document.getElementById('gameOver').classList.remove('hidden');
        document.getElementById('hud').classList.add('hidden');
    }

    // ── Physics update ────────────────────────────────────────────────────────
    _update() {
        const gY = this.groundY;
        const W  = this.canvas.width;
        const H  = this.canvas.height;

        // ── Projectile ──
        if (this.shot && this.shot.alive) {
            const p = this.shot;
            // Trail
            p.trail.unshift({ x: p.x, y: p.y });
            if (p.trail.length > TRAIL_LEN) p.trail.pop();

            p.vy += GRAVITY;
            p.x  += p.vx;
            p.y  += p.vy;
            p.angle += 0.05 * Math.sign(p.vx || 1);

            // Ground
            if (p.y + p.r > gY) {
                p.y   = gY - p.r;
                p.vy *= -RESTITUTION_GND;
                p.vx *= FRICTION_GND;
                p.bounces++;
                if (Math.abs(p.vy) < 0.9) p.vy = 0;
            }
            // Walls
            if (p.x - p.r < 0)  { p.x = p.r;     p.vx =  Math.abs(p.vx) * 0.5; }
            if (p.x + p.r > W)  { p.x = W - p.r;  p.vx = -Math.abs(p.vx) * 0.5; }

            // Kill if stuck/bounced out
            const speed = Math.hypot(p.vx, p.vy);
            if (p.bounces >= 5 || (speed < 0.3 && p.y + p.r >= gY - 1)) {
                p.alive = false;
            }

            // Collide with blocks
            for (const b of this.bodies) {
                if (b.alive) this._projBlockCollide(p, b);
            }
        }

        // ── Bodies (blocks) ──
        for (let i = 0; i < this.bodies.length; i++) {
            const b = this.bodies[i];
            if (!b.alive || b.isStatic) continue;

            b.vy    += GRAVITY;
            b.cx    += b.vx;
            b.cy    += b.vy;
            b.angle += b.omega;
            b.omega *= ANGULAR_DRAG;
            if (b.flash > 0) b.flash--;

            // Ground
            if (b.bottom > gY) {
                b.cy  = gY - b.h * 0.5;
                b.vy *= -(RESTITUTION_GND * 0.55);
                if (Math.abs(b.vy) < 0.8) b.vy = 0;
                b.vx    *= FRICTION_GND;
                b.omega *= 0.55;
            }
            // Walls
            if (b.left  < 0)  { b.cx = b.w * 0.5;     b.vx =  Math.abs(b.vx) * RESTITUTION_BLOCK; b.omega *= -0.5; }
            if (b.right > W)  { b.cx = W - b.w * 0.5;  b.vx = -Math.abs(b.vx) * RESTITUTION_BLOCK; b.omega *= -0.5; }
            // Fell off screen
            if (b.top > H + 60) {
                b.alive = false;
                if (b.type === 'enemy' && !b.scored) {
                    b.scored = true;
                    this._addScore(b.cx, b.cy, SCORE_ENEMY, '#f44336');
                }
            }
        }

        // ── Block-block collisions (circle approx) ──
        for (let i = 0; i < this.bodies.length; i++) {
            const a = this.bodies[i];
            if (!a.alive) continue;
            for (let j = i + 1; j < this.bodies.length; j++) {
                const b = this.bodies[j];
                if (!b.alive) continue;
                if (a.isStatic && b.isStatic) continue;

                const dx   = b.cx - a.cx, dy = b.cy - a.cy;
                const dist = Math.hypot(dx, dy);
                const minD = a.radius + b.radius;
                if (dist < minD && dist > 0.01) {
                    const nx = dx / dist, ny = dy / dist;
                    const ov = (minD - dist) * 0.48;
                    if (!a.isStatic) { a.cx -= nx * ov; a.cy -= ny * ov; }
                    if (!b.isStatic) { b.cx += nx * ov; b.cy += ny * ov; }

                    const rvx = b.vx - a.vx, rvy = b.vy - a.vy;
                    const dot = rvx * nx + rvy * ny;
                    if (dot < 0) {
                        const imp = dot * (1 + RESTITUTION_BLOCK) * 0.5;
                        if (!a.isStatic) { a.vx += imp * nx; a.vy += imp * ny; }
                        if (!b.isStatic) { b.vx -= imp * nx; b.vy -= imp * ny; }
                    }
                }
            }
        }

        // Remove dead bodies
        this.bodies = this.bodies.filter(b => b.alive);

        // Settle logic: after projectile dies, wait then check win/lose
        if (this.shot && !this.shot.alive && this.settleTimer === 0) {
            this.settleTimer = 95;
        }
        if (this.settleTimer > 0) {
            this.settleTimer--;
            if (this.settleTimer === 0) this._checkRoundEnd();
        }

        // Popups
        this.popups = this.popups.filter(p => { p.update(); return p.alive; });
    }

    _projBlockCollide(p, b) {
        // Broad phase
        if (p.x + p.r < b.left   || p.x - p.r > b.right) return;
        if (p.y + p.r < b.top    || p.y - p.r > b.bottom) return;

        // Narrow: clamp ball center to AABB, measure distance
        const cx = Math.max(b.left, Math.min(b.right,  p.x));
        const cy = Math.max(b.top,  Math.min(b.bottom, p.y));
        const dx = p.x - cx, dy = p.y - cy;
        const dist = Math.hypot(dx, dy);
        if (dist >= p.r) return;

        // Resolve overlap
        const nx = dist > 0.01 ? dx / dist : 0;
        const ny = dist > 0.01 ? dy / dist : -1;
        const penetration = p.r - dist;
        p.x += nx * penetration;
        p.y += ny * penetration;

        // Reflect & damp projectile
        const dot = p.vx * nx + p.vy * ny;
        if (dot < 0) {
            p.vx -= dot * nx * (1 + RESTITUTION_BLOCK);
            p.vy -= dot * ny * (1 + RESTITUTION_BLOCK);
            p.vx *= 0.62;
            p.vy *= 0.62;
            p.bounces++;
        }

        // Wake block
        if (b.isStatic) b.isStatic = false;

        // Apply impulse to block (push away from projectile)
        const speed = Math.hypot(p.vx, p.vy);
        const impMag = speed * 0.7;
        const bndx = b.cx - p.x, bndy = b.cy - p.y;
        const bndist = Math.hypot(bndx, bndy);
        if (bndist > 0.01) {
            const bnx = bndx / bndist, bny = bndy / bndist;
            b.vx += bnx * impMag * 0.38;
            b.vy += bny * impMag * 0.38 - 0.5;
            b.omega += ((p.x - b.cx) * bny - (p.y - b.cy) * bnx) * 0.011;
        }

        // Damage
        const dmg = Math.max(1, Math.round(speed / 3.5));
        b.hp   -= dmg;
        b.flash = 10;

        if (b.hp <= 0) {
            b.alive = false;
            if (b.type === 'enemy' && !b.scored) {
                b.scored = true;
                this._addScore(b.cx, b.cy, SCORE_ENEMY, '#f44336');
            } else if (!b.scored) {
                b.scored = true;
                this._addScore(b.cx, b.cy, SCORE_BLOCK, '#ffeb3b');
            }
        }
    }

    _addScore(x, y, pts, color) {
        this.score += pts;
        document.getElementById('score').textContent = this.score;
        this.popups.push(new Popup(x, y - 20, '+' + pts, color));
    }

    _checkRoundEnd() {
        const aliveEnemies = this.bodies.filter(b => b.type === 'enemy' && b.alive);
        if (aliveEnemies.length === 0) {
            this._levelComplete();
            return;
        }
        if (this.shotsLeft <= 0) {
            this._gameOver();
        }
    }

    // ── Draw ──────────────────────────────────────────────────────────────────
    _draw() {
        const ctx = this.ctx;
        const W = this.canvas.width, H = this.canvas.height;
        const gY = this.groundY;

        ctx.clearRect(0, 0, W, H);

        // Sky gradient
        const sky = ctx.createLinearGradient(0, 0, 0, gY);
        sky.addColorStop(0,   '#4a90c8');
        sky.addColorStop(0.65, '#8ec8e8');
        sky.addColorStop(1.0, '#c4ecaa');
        ctx.fillStyle = sky;
        ctx.fillRect(0, 0, W, gY);

        // Clouds
        this._drawClouds(ctx, W, H);

        // Hills behind ground
        ctx.fillStyle = '#5cb85c';
        ctx.beginPath();
        ctx.ellipse(W * 0.38, gY + 10, W * 0.22, H * 0.07, 0, Math.PI, 0);
        ctx.fill();
        ctx.fillStyle = '#4aaa4a';
        ctx.beginPath();
        ctx.ellipse(W * 0.72, gY + 8,  W * 0.18, H * 0.055, 0, Math.PI, 0);
        ctx.fill();

        // Ground
        const gg = ctx.createLinearGradient(0, gY, 0, H);
        gg.addColorStop(0,    '#5cb85c');
        gg.addColorStop(0.12, '#3d9140');
        gg.addColorStop(1,    '#1e5c22');
        ctx.fillStyle = gg;
        ctx.fillRect(0, gY, W, H - gY);

        // Grass highlight strip
        ctx.fillStyle = '#72c872';
        ctx.fillRect(0, gY, W, (H - gY) * 0.1);

        // Slingshot
        this._drawSlingshot(ctx, W, H);

        // Trajectory preview
        if (this.isAiming && this.shotsLeft > 0) this._drawTrajectory(ctx);

        // Blocks & enemies
        for (const b of this.bodies) this._drawBody(ctx, b, W);

        // Projectile
        if (this.shot && this.shot.alive) this._drawProjectile(ctx, this.shot);

        // Queued shots below slingshot
        this._drawShotsQueue(ctx, W, H);

        // Popups
        for (const p of this.popups) {
            ctx.save();
            ctx.globalAlpha = Math.max(0, p.life);
            ctx.fillStyle   = p.color;
            ctx.font        = `bold ${Math.max(12, Math.round(W * 0.024))}px Arial`;
            ctx.textAlign   = 'center';
            ctx.shadowColor = 'rgba(0,0,0,0.5)';
            ctx.shadowBlur  = 4;
            ctx.fillText(p.text, p.x, p.y);
            ctx.restore();
        }
    }

    _drawClouds(ctx, W, H) {
        ctx.fillStyle = 'rgba(255,255,255,0.78)';
        const defs = [
            { x: 0.16, y: 0.09, r: 0.046 },
            { x: 0.33, y: 0.065, r: 0.034 },
            { x: 0.54, y: 0.11, r: 0.052 },
            { x: 0.80, y: 0.075, r: 0.038 },
        ];
        for (const c of defs) {
            const cx = W * c.x, cy = H * c.y, r = W * c.r;
            ctx.beginPath();
            ctx.arc(cx,           cy,           r,          0, Math.PI * 2);
            ctx.arc(cx + r * 0.9, cy - r * 0.3, r * 0.72,   0, Math.PI * 2);
            ctx.arc(cx - r * 0.85, cy - r * 0.2, r * 0.64,  0, Math.PI * 2);
            ctx.fill();
        }
    }

    _drawSlingshot(ctx, W, H) {
        const fx = this.forkX, fy = this.forkRestY;
        const thick  = Math.max(4, W * 0.0065);
        const armLen = W * 0.052;
        const armUp  = W * 0.055;
        const trunkH = W * 0.12;

        // Trunk shadow
        ctx.strokeStyle = 'rgba(0,0,0,0.18)';
        ctx.lineWidth   = thick * 1.6;
        ctx.lineCap     = 'round';
        ctx.beginPath();
        ctx.moveTo(fx + 2, fy + trunkH + 2);
        ctx.lineTo(fx + 2, fy + 2);
        ctx.stroke();

        // Trunk
        ctx.strokeStyle = '#5d3a00';
        ctx.lineWidth   = thick * 1.55;
        ctx.beginPath();
        ctx.moveTo(fx, fy + trunkH);
        ctx.lineTo(fx, fy);
        ctx.stroke();

        // Left arm
        ctx.lineWidth = thick;
        ctx.beginPath();
        ctx.moveTo(fx, fy);
        ctx.lineTo(fx - armLen, fy - armUp);
        ctx.stroke();
        // Right arm
        ctx.beginPath();
        ctx.moveTo(fx, fy);
        ctx.lineTo(fx + armLen, fy - armUp);
        ctx.stroke();

        // Fork tips
        ctx.fillStyle = '#3e2700';
        const tipL = { x: fx - armLen, y: fy - armUp };
        const tipR = { x: fx + armLen, y: fy - armUp };
        for (const tp of [tipL, tipR]) {
            ctx.beginPath();
            ctx.arc(tp.x, tp.y, thick, 0, Math.PI * 2);
            ctx.fill();
        }

        // Rubber bands
        const ballX = this.isAiming ? this.dragX : fx;
        const ballY = this.isAiming ? this.dragY : fy;
        ctx.strokeStyle = '#8B4513';
        ctx.lineWidth   = thick * 0.65;
        ctx.beginPath(); ctx.moveTo(tipL.x, tipL.y); ctx.lineTo(ballX, ballY); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(tipR.x, tipR.y); ctx.lineTo(ballX, ballY); ctx.stroke();

        // Character on slingshot (when not flying)
        const onSling = (!this.isAiming && (!this.shot || !this.shot.alive) && this.shotsLeft > 0);
        if (onSling || this.isAiming) {
            this._drawCharCircle(ctx, ballX, ballY, PROJECTILE_RADIUS, this.character + '1', 0);
        }
    }

    _drawTrajectory(ctx) {
        const vx0 = (this.forkX     - this.dragX) * LAUNCH_POWER;
        const vy0 = (this.forkRestY - this.dragY) * LAUNCH_POWER;
        const gY  = this.groundY;
        let x = this.dragX, y = this.dragY, vx = vx0, vy = vy0;
        ctx.fillStyle = 'rgba(255,255,255,0.52)';
        for (let i = 0; i < 60; i++) {
            vy += GRAVITY; x += vx; y += vy;
            if (y > gY) break;
            if (i % 4 === 0) {
                const r = Math.max(1.5, PROJECTILE_RADIUS * 0.22 * (1 - i / 60));
                ctx.beginPath();
                ctx.arc(x, y, r, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }

    _drawBody(ctx, b, W) {
        if (!b.alive) return;
        ctx.save();
        ctx.translate(b.cx, b.cy);
        ctx.rotate(b.angle);

        if (b.flash > 0 && b.flash % 2 === 0) ctx.globalAlpha = 0.5;

        if (b.type === 'enemy') {
            // Character image clipped to rounded square
            const s = Math.min(b.w, b.h);
            const r = s * 0.25;
            const img = Assets.get(b.imgKey + '_preview') || Assets.get(b.imgKey + '1');
            ctx.beginPath();
            if (ctx.roundRect) {
                ctx.roundRect(-s * 0.5, -s * 0.5, s, s, r);
            } else {
                ctx.rect(-s * 0.5, -s * 0.5, s, s);
            }
            ctx.clip();
            if (img) {
                ctx.drawImage(img, -s * 0.5, -s * 0.5, s, s);
            } else {
                ctx.fillStyle = '#e91e63';
                ctx.fill();
            }
            // Red border
            ctx.restore();
            ctx.save();
            ctx.translate(b.cx, b.cy);
            ctx.rotate(b.angle);
            ctx.strokeStyle = '#c62828';
            ctx.lineWidth   = Math.max(2, W * 0.003);
            ctx.strokeRect(-b.w * 0.5, -b.h * 0.5, b.w, b.h);
        } else if (b.type === 'stone') {
            const g = ctx.createLinearGradient(-b.w * 0.5, -b.h * 0.5, b.w * 0.5, b.h * 0.5);
            g.addColorStop(0, '#90a4ae');
            g.addColorStop(1, '#455a64');
            ctx.fillStyle = g;
            ctx.fillRect(-b.w * 0.5, -b.h * 0.5, b.w, b.h);
            ctx.strokeStyle = '#37474f';
            ctx.lineWidth = 1.5;
            ctx.strokeRect(-b.w * 0.5, -b.h * 0.5, b.w, b.h);
            if (b.hp <= 1) {
                ctx.strokeStyle = '#263238';
                ctx.lineWidth   = 1;
                ctx.beginPath();
                ctx.moveTo(-b.w * 0.1, -b.h * 0.35);
                ctx.lineTo( b.w * 0.2,  b.h * 0.25);
                ctx.stroke();
            }
        } else {
            // Wood / plank
            const isPlank = b.type === 'plank';
            const g = ctx.createLinearGradient(-b.w * 0.5, -b.h * 0.5, b.w * 0.5, b.h * 0.5);
            g.addColorStop(0, isPlank ? '#bcaaa4' : '#a1887f');
            g.addColorStop(1, isPlank ? '#8d6e63' : '#6d4c41');
            ctx.fillStyle = g;
            ctx.fillRect(-b.w * 0.5, -b.h * 0.5, b.w, b.h);
            ctx.strokeStyle = '#4e342e';
            ctx.lineWidth   = 1.5;
            ctx.strokeRect(-b.w * 0.5, -b.h * 0.5, b.w, b.h);
            // Grain lines
            ctx.strokeStyle = 'rgba(0,0,0,0.1)';
            ctx.lineWidth   = 0.7;
            const step = b.h / 3;
            for (let i = 1; i < 3; i++) {
                ctx.beginPath();
                ctx.moveTo(-b.w * 0.5, -b.h * 0.5 + step * i);
                ctx.lineTo( b.w * 0.5, -b.h * 0.5 + step * i);
                ctx.stroke();
            }
            if (b.hp <= 1) {
                ctx.strokeStyle = '#4e342e';
                ctx.lineWidth   = 1;
                ctx.beginPath();
                ctx.moveTo(-b.w * 0.2, -b.h * 0.4);
                ctx.lineTo( b.w * 0.3,  b.h * 0.35);
                ctx.stroke();
            }
        }
        ctx.globalAlpha = 1;
        ctx.restore();
    }

    _drawProjectile(ctx, p) {
        // Trail
        for (let i = 0; i < p.trail.length; i++) {
            const t = p.trail[i];
            const alpha = (1 - i / p.trail.length) * 0.38;
            const r     = PROJECTILE_RADIUS * (1 - i / p.trail.length) * 0.65;
            ctx.globalAlpha = alpha;
            ctx.fillStyle   = 'rgba(255,255,255,0.9)';
            ctx.beginPath();
            ctx.arc(t.x, t.y, r, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
        this._drawCharCircle(ctx, p.x, p.y, p.r, p.imgKey, p.angle);
    }

    _drawCharCircle(ctx, x, y, r, imgKey, angle = 0) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle);
        // Drop shadow
        ctx.shadowColor = 'rgba(0,0,0,0.45)';
        ctx.shadowBlur  = 8;
        // Clip & draw
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.clip();
        const img = Assets.get(imgKey);
        if (img) {
            ctx.drawImage(img, -r, -r, r * 2, r * 2);
        } else {
            ctx.fillStyle = '#ff9800';
            ctx.beginPath();
            ctx.arc(0, 0, r, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
        // White border
        ctx.save();
        ctx.translate(x, y);
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255,255,255,0.85)';
        ctx.lineWidth   = 2.5;
        ctx.stroke();
        ctx.restore();
    }

    _drawShotsQueue(ctx, W, H) {
        const fx  = this.forkX;
        const fy  = this.forkRestY;
        const r   = PROJECTILE_RADIUS * 0.52;
        const spc = r * 2.7;

        // Show queued shots (those not yet on the slingshot)
        // 1 shot is always shown on the slingshot, so queue = shotsLeft - 1
        const queued = Math.max(0, this.shotsLeft - 1);
        if (queued <= 0) return;

        const totalW = (queued - 1) * spc;
        const startX = fx - totalW * 0.5;
        const qy     = fy + W * 0.135;

        for (let i = 0; i < queued; i++) {
            this._drawCharCircle(ctx, startX + i * spc, qy, r, this.character + '1', 0);
        }
    }

    // ── Main loop ──────────────────────────────────────────────────────────────
    _loop() {
        if (this.state === STATE.PLAYING) {
            this._update();
            this._draw();
        } else if (this.state === STATE.MENU) {
            this._drawMenuBg();
        }
        requestAnimationFrame(() => this._loop());
    }

    _drawMenuBg() {
        const ctx = this.ctx;
        const W = this.canvas.width, H = this.canvas.height;
        const gY = H * (1 - GROUND_RATIO);
        // Sky
        const sky = ctx.createLinearGradient(0, 0, 0, gY);
        sky.addColorStop(0,   '#4a90c8');
        sky.addColorStop(1.0, '#c4ecaa');
        ctx.fillStyle = sky;
        ctx.fillRect(0, 0, W, H);
        // Ground
        ctx.fillStyle = '#4a9e4a';
        ctx.fillRect(0, gY, W, H - gY);
        // Clouds
        this._drawClouds(ctx, W, H);
        // Slingshot (idle)
        this._drawSlingshot(ctx, W, H);
    }
}

// ─── Bootstrap ───────────────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', async () => {
    const base = '../assets/';
    await Promise.all([
        Assets.load('calvin1',         base + 'calvin1.png'),
        Assets.load('bailey1',         base + 'bailey1.png'),
        Assets.load('lilly1',          base + 'lilly1.png'),
        Assets.load('calvin_preview',  base + 'calvin_preview.png'),
        Assets.load('bailey_preview',  base + 'bailey_preview.png'),
        Assets.load('lilly-preview',   base + 'lilly-preview.png'),
    ]);
    new FamilyFlingGame();
});
