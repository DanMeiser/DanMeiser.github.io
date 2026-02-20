/**
 * Dino Run - Family Edition
 * A Chrome Dino-style endless runner with Calvin & Bailey
 */

// ─── Constants ──────────────────────────────────────────
const GROUND_Y_RATIO = 0.85;
const GRAVITY = 0.6;
const JUMP_POWER = -12;
const INITIAL_SPEED = 5;
const MAX_SPEED = 14;
const SPEED_INCREMENT = 0.002;
const OBSTACLE_MIN_GAP = 600;
const OBSTACLE_MAX_GAP = 1200;
const DUCK_HEIGHT_RATIO = 0.5;

const STATE = { MENU: 0, PLAYING: 1, GAME_OVER: 2 };

// ─── Asset Loader ───────────────────────────────────────
const Assets = {
    images: {},
    audioCtx: null,
    sounds: {},
    audioUnlocked: false,

    loadImage(name, src) {
        return new Promise(resolve => {
            const img = new Image();
            img.onload = () => { this.images[name] = img; resolve(img); };
            img.onerror = () => { console.warn('Missing image:', src); resolve(null); };
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
        const b = ctx.createBuffer(1, 1, 22050);
        const s = ctx.createBufferSource();
        s.buffer = b; s.connect(ctx.destination); s.start(0);
        this.audioUnlocked = true;
    },

    async loadSound(name, src) {
        try {
            const resp = await fetch(src);
            const buf = await resp.arrayBuffer();
            this.sounds[name] = await this._ctx().decodeAudioData(buf);
        } catch (e) { console.warn('Sound load failed:', src); }
    },

    playSound(name) {
        const buf = this.sounds[name];
        if (!buf || !this.audioCtx) return;
        try {
            if (this.audioCtx.state === 'suspended') this.audioCtx.resume();
            const s = this.audioCtx.createBufferSource();
            s.buffer = buf; s.connect(this.audioCtx.destination); s.start(0);
        } catch (e) {}
    }
};

// ─── Score Manager ──────────────────────────────────────
const Scores = {
    KEY: 'dinoRun_best_',
    get(char) {
        try { return parseInt(localStorage.getItem(this.KEY + char), 10) || 0; }
        catch { return 0; }
    },
    set(char, val) {
        try { localStorage.setItem(this.KEY + char, val); } catch {}
    },
    update(char, val) {
        const best = this.get(char);
        if (val > best) { this.set(char, val); return true; }
        return false;
    }
};

// ─── Runner (Player) ───────────────────────────────────
class Runner {
    constructor(groundY, character) {
        this.character = character;
        this.width = 50;
        this.height = 50;
        this.x = 60;
        this.groundY = groundY;
        this.y = groundY - this.height;
        this.vy = 0;
        this.isJumping = false;
        this.isDucking = false;
        this.duckHeight = this.height * DUCK_HEIGHT_RATIO;
        this.frameIndex = 0;
        this.animTimer = 0;
        this.frames = [];
    }

    loadFrames() {
        this.frames = [
            Assets.getImage(this.character + '1'),
            Assets.getImage(this.character + '2'),
            Assets.getImage(this.character + '3')
        ].filter(Boolean);
    }

    jump() {
        if (!this.isJumping) {
            this.vy = JUMP_POWER;
            this.isJumping = true;
            Assets.playSound('jump');
        }
    }

    duck(active) {
        this.isDucking = active && !this.isJumping;
    }

    update(dt) {
        // Gravity
        this.vy += GRAVITY;
        this.y += this.vy;

        // Land
        const effectiveH = this.isDucking ? this.duckHeight : this.height;
        if (this.y + effectiveH >= this.groundY) {
            this.y = this.groundY - effectiveH;
            this.vy = 0;
            this.isJumping = false;
        }

        // Animate
        this.animTimer += dt;
        if (this.animTimer > 100) {
            this.animTimer = 0;
            this.frameIndex = (this.frameIndex + 1) % Math.max(this.frames.length, 1);
        }
    }

    draw(ctx) {
        const frame = this.frames[this.frameIndex];
        const effectiveH = this.isDucking ? this.duckHeight : this.height;
        const drawY = this.isDucking ? this.groundY - this.duckHeight : this.y;

        if (frame) {
            ctx.drawImage(frame, this.x, drawY, this.width, effectiveH);
        } else {
            ctx.fillStyle = this.character === 'calvin' ? '#d4a017' : '#8B4513';
            ctx.fillRect(this.x, drawY, this.width, effectiveH);
        }
    }

    getBounds() {
        const effectiveH = this.isDucking ? this.duckHeight : this.height;
        const drawY = this.isDucking ? this.groundY - this.duckHeight : this.y;
        // Slightly inset hitbox for fairness
        const pad = 6;
        return { x: this.x + pad, y: drawY + pad, w: this.width - pad * 2, h: effectiveH - pad * 2 };
    }
}

// ─── Obstacles ──────────────────────────────────────────
class Obstacle {
    constructor(x, groundY, speed) {
        // Randomly choose obstacle type
        const types = [
            { w: 20, h: 40, color: '#2d5a27', type: 'cactusSmall' },
            { w: 30, h: 55, color: '#1e4d2b', type: 'cactusLarge' },
            { w: 50, h: 35, color: '#1e4d2b', type: 'cactusDouble' },
            { w: 40, h: 25, color: '#555',    type: 'bird', flying: true }
        ];

        // Birds only appear at higher speeds
        const available = speed > 8 ? types : types.slice(0, 3);
        const t = available[Math.floor(Math.random() * available.length)];

        this.x = x;
        this.width = t.w;
        this.height = t.h;
        this.color = t.color;
        this.type = t.type;

        if (t.flying) {
            // Flying obstacles at different heights
            const flyHeights = [groundY - 70, groundY - 45, groundY - 25];
            this.y = flyHeights[Math.floor(Math.random() * flyHeights.length)];
        } else {
            this.y = groundY - this.height;
        }

        this.passed = false;
    }

    update(speed) {
        this.x -= speed;
    }

    draw(ctx) {
        if (this.type === 'bird') {
            // Draw a simple flying obstacle
            ctx.fillStyle = '#666';
            ctx.beginPath();
            const cx = this.x + this.width / 2;
            const cy = this.y + this.height / 2;
            // Body
            ctx.ellipse(cx, cy, this.width / 2, this.height / 3, 0, 0, Math.PI * 2);
            ctx.fill();
            // Wings
            ctx.beginPath();
            ctx.moveTo(cx - 10, cy);
            ctx.lineTo(cx - 5, cy - 15);
            ctx.lineTo(cx + 5, cy - 12);
            ctx.fill();
        } else if (this.type === 'cactusDouble') {
            // Two cacti side by side
            ctx.fillStyle = this.color;
            ctx.fillRect(this.x, this.y + 5, 18, this.height - 5);
            ctx.fillRect(this.x + 26, this.y, 18, this.height);
            // Arms
            ctx.fillRect(this.x + 4, this.y + 10, 12, 6);
            ctx.fillRect(this.x + 28, this.y + 15, 12, 6);
        } else {
            // Single cactus
            ctx.fillStyle = this.color;
            const cx = this.x + this.width / 2;
            // Trunk
            ctx.fillRect(cx - 5, this.y, 10, this.height);
            // Arms
            if (this.type === 'cactusLarge') {
                ctx.fillRect(this.x, this.y + 12, 12, 6);
                ctx.fillRect(this.x + this.width - 12, this.y + 20, 12, 6);
            } else {
                ctx.fillRect(this.x, this.y + 8, 10, 5);
            }
            // Top
            ctx.beginPath();
            ctx.arc(cx, this.y, 5, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    getBounds() {
        const pad = 4;
        return { x: this.x + pad, y: this.y + pad, w: this.width - pad * 2, h: this.height - pad * 2 };
    }

    isOffScreen() {
        return this.x + this.width < 0;
    }
}

// ─── Cloud ──────────────────────────────────────────────
class Cloud {
    constructor(canvasW, canvasH) {
        this.x = canvasW + Math.random() * 200;
        this.y = 30 + Math.random() * (canvasH * 0.35);
        this.w = 60 + Math.random() * 60;
        this.speed = 0.5 + Math.random() * 1;
    }

    update() { this.x -= this.speed; }

    draw(ctx) {
        ctx.fillStyle = 'rgba(255,255,255,0.8)';
        ctx.beginPath();
        ctx.ellipse(this.x, this.y, this.w / 2, 12, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(this.x - this.w * 0.2, this.y - 5, this.w * 0.25, 10, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(this.x + this.w * 0.2, this.y - 3, this.w * 0.2, 8, 0, 0, Math.PI * 2);
        ctx.fill();
    }

    isOffScreen() { return this.x + this.w < 0; }
}

// ─── Main Game ──────────────────────────────────────────
class DinoRunGame {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.state = STATE.MENU;
        this.character = 'calvin';
        this.runner = null;
        this.obstacles = [];
        this.clouds = [];
        this.score = 0;
        this.speed = INITIAL_SPEED;
        this.groundY = 0;
        this.nextObstacleIn = 0;
        this.lastTime = 0;
        this.groundOffset = 0;

        this.resize();
        window.addEventListener('resize', () => this.resize());
        this.setupInput();
        this.loadAssets();
        this.updateBestLabels();
        this.loop(0);
    }

    resize() {
        const wrapper = document.getElementById('gameWrapper');
        this.canvas.width = wrapper.clientWidth;
        this.canvas.height = wrapper.clientHeight;
        this.groundY = Math.floor(this.canvas.height * GROUND_Y_RATIO);
        if (this.runner) {
            this.runner.groundY = this.groundY;
        }
    }

    async loadAssets() {
        const base = '../assets/';
        await Promise.all([
            Assets.loadImage('calvin1', base + 'calvin1.png'),
            Assets.loadImage('calvin2', base + 'calvin2.png'),
            Assets.loadImage('calvin3', base + 'calvin3.png'),
            Assets.loadImage('bailey1', base + 'bailey1.png'),
            Assets.loadImage('bailey2', base + 'bailey2.png'),
            Assets.loadImage('bailey3', base + 'bailey3.png'),
        ]);
        await Promise.all([
            Assets.loadSound('jump', base + 'flap.mp3'),
            Assets.loadSound('hit', base + 'hit.mp3'),
            Assets.loadSound('point', base + 'point.mp3'),
        ]).catch(() => {});
    }

    setupInput() {
        // Mobile audio unlock
        const unlock = () => { Assets.unlockAudio(); };
        document.addEventListener('touchstart', unlock, { once: true });
        document.addEventListener('click', unlock, { once: true });

        // Keyboard
        document.addEventListener('keydown', e => {
            if (e.code === 'Space' || e.code === 'ArrowUp') {
                e.preventDefault();
                this.handleAction('jump');
            }
            if (e.code === 'ArrowDown') {
                e.preventDefault();
                if (this.runner) this.runner.duck(true);
            }
        });
        document.addEventListener('keyup', e => {
            if (e.code === 'ArrowDown' && this.runner) this.runner.duck(false);
        });

        // Touch
        let touchStartY = 0;
        this.canvas.addEventListener('touchstart', e => {
            e.preventDefault();
            touchStartY = e.touches[0].clientY;
            this.handleAction('jump');
        });
        this.canvas.addEventListener('touchmove', e => {
            e.preventDefault();
            const dy = e.touches[0].clientY - touchStartY;
            if (dy > 30 && this.runner) this.runner.duck(true);
        });
        this.canvas.addEventListener('touchend', e => {
            e.preventDefault();
            if (this.runner) this.runner.duck(false);
        });

        // Click on canvas
        this.canvas.addEventListener('click', () => this.handleAction('jump'));

        // UI buttons
        document.querySelectorAll('.char-btn').forEach(btn => {
            btn.addEventListener('click', e => {
                this.character = e.currentTarget.dataset.character;
                this.startGame();
            });
        });
        document.getElementById('restartBtn').addEventListener('click', () => this.startGame());
        document.getElementById('menuBtn').addEventListener('click', () => this.showMenu());
    }

    handleAction(action) {
        if (this.state === STATE.PLAYING && action === 'jump') {
            this.runner.jump();
        }
    }

    showMenu() {
        this.state = STATE.MENU;
        this.updateBestLabels();
        document.getElementById('menu').classList.remove('hidden');
        document.getElementById('gameOver').classList.add('hidden');
        document.getElementById('hud').classList.add('hidden');
    }

    updateBestLabels() {
        document.getElementById('calvinBest').textContent = Scores.get('calvin');
        document.getElementById('baileyBest').textContent = Scores.get('bailey');
    }

    startGame() {
        this.state = STATE.PLAYING;
        this.score = 0;
        this.speed = INITIAL_SPEED;
        this.obstacles = [];
        this.clouds = [];
        this.nextObstacleIn = 1000;
        this.groundOffset = 0;

        this.runner = new Runner(this.groundY, this.character);
        this.runner.loadFrames();

        // Seed some clouds
        for (let i = 0; i < 4; i++) {
            const c = new Cloud(this.canvas.width, this.canvas.height);
            c.x = Math.random() * this.canvas.width;
            this.clouds.push(c);
        }

        document.getElementById('menu').classList.add('hidden');
        document.getElementById('gameOver').classList.add('hidden');
        document.getElementById('hud').classList.remove('hidden');
        document.getElementById('score').textContent = '0';
    }

    gameOver() {
        this.state = STATE.GAME_OVER;
        Assets.playSound('hit');
        const finalScore = Math.floor(this.score);
        Scores.update(this.character, finalScore);

        document.getElementById('hud').classList.add('hidden');
        document.getElementById('gameOver').classList.remove('hidden');
        document.getElementById('finalScore').textContent = finalScore;
        document.getElementById('finalBest').textContent = Scores.get(this.character);
    }

    // ─── Collision ──────────────────────────────────────
    checkCollision(a, b) {
        return a.x < b.x + b.w && a.x + a.w > b.x &&
               a.y < b.y + b.h && a.y + a.h > b.y;
    }

    // ─── Update ─────────────────────────────────────────
    update(dt) {
        if (this.state !== STATE.PLAYING) return;

        // Speed ramp
        this.speed = Math.min(this.speed + SPEED_INCREMENT * dt, MAX_SPEED);

        // Score
        this.score += this.speed * dt * 0.01;
        document.getElementById('score').textContent = Math.floor(this.score);

        // Milestone sound every 100 points
        if (Math.floor(this.score) % 100 === 0 && Math.floor(this.score) > 0 &&
            Math.floor(this.score - this.speed * dt * 0.01) % 100 !== 0) {
            Assets.playSound('point');
        }

        // Runner
        this.runner.update(dt);

        // Ground scroll
        this.groundOffset = (this.groundOffset + this.speed) % 20;

        // Obstacles
        this.nextObstacleIn -= this.speed;
        if (this.nextObstacleIn <= 0) {
            this.obstacles.push(new Obstacle(this.canvas.width + 20, this.groundY, this.speed));
            this.nextObstacleIn = OBSTACLE_MIN_GAP + Math.random() * (OBSTACLE_MAX_GAP - OBSTACLE_MIN_GAP);
            // Tighten gap as speed increases
            this.nextObstacleIn *= (INITIAL_SPEED / this.speed);
        }

        for (let i = this.obstacles.length - 1; i >= 0; i--) {
            this.obstacles[i].update(this.speed);
            if (this.obstacles[i].isOffScreen()) {
                this.obstacles.splice(i, 1);
                continue;
            }
            // Collision
            if (this.checkCollision(this.runner.getBounds(), this.obstacles[i].getBounds())) {
                this.gameOver();
                return;
            }
        }

        // Clouds
        if (Math.random() < 0.002) {
            this.clouds.push(new Cloud(this.canvas.width, this.canvas.height));
        }
        for (let i = this.clouds.length - 1; i >= 0; i--) {
            this.clouds[i].update();
            if (this.clouds[i].isOffScreen()) this.clouds.splice(i, 1);
        }
    }

    // ─── Draw ───────────────────────────────────────────
    draw() {
        const ctx = this.ctx;
        const w = this.canvas.width;
        const h = this.canvas.height;

        // Sky
        const grad = ctx.createLinearGradient(0, 0, 0, this.groundY);
        grad.addColorStop(0, '#87CEEB');
        grad.addColorStop(1, '#e0f6ff');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, this.groundY);

        // Clouds
        this.clouds.forEach(c => c.draw(ctx));

        // Ground fill
        ctx.fillStyle = '#c2a66b';
        ctx.fillRect(0, this.groundY, w, h - this.groundY);

        // Ground line
        ctx.strokeStyle = '#8B7355';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, this.groundY);
        ctx.lineTo(w, this.groundY);
        ctx.stroke();

        // Ground texture (dashes)
        ctx.fillStyle = '#a08050';
        for (let i = -this.groundOffset; i < w; i += 20) {
            ctx.fillRect(i, this.groundY + 5, 10, 2);
            ctx.fillRect(i + 7, this.groundY + 12, 8, 2);
        }

        if (this.state === STATE.PLAYING || this.state === STATE.GAME_OVER) {
            // Obstacles
            this.obstacles.forEach(o => o.draw(ctx));

            // Runner
            if (this.runner) this.runner.draw(ctx);
        }

        // Darkened overlay on game over
        if (this.state === STATE.GAME_OVER) {
            ctx.fillStyle = 'rgba(0,0,0,0.25)';
            ctx.fillRect(0, 0, w, h);
        }
    }

    // ─── Loop ───────────────────────────────────────────
    loop = (time) => {
        const dt = this.lastTime ? Math.min(time - this.lastTime, 50) : 16;
        this.lastTime = time;
        this.update(dt);
        this.draw();
        requestAnimationFrame(this.loop);
    }
}

// ─── Init ───────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    window.dinoGame = new DinoRunGame();
});
