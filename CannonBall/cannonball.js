/**
 * Cannon Ball
 * A block-breaker game with Calvin & Bailey
 */

// ─── Constants ──────────────────────────────────────────
const STATE = { MENU: 0, PLAYING: 1, GAME_OVER: 2, LEVEL_COMPLETE: 3, LAUNCH: 4 };

const PADDLE_HEIGHT = 14;
const PADDLE_WIDTH_DEFAULT = 90;
const PADDLE_SPEED = 8;
const BALL_RADIUS = 7;
const BALL_SPEED_INITIAL = 4;
const BALL_SPEED_INCREMENT = 0.4;
const BLOCK_ROWS_BASE = 4;
const BLOCK_COLS = 8;
const BLOCK_PADDING = 4;
const BLOCK_TOP_OFFSET = 50;
const BLOCK_HEIGHT = 18;
const POWERUP_SIZE = 20;
const POWERUP_SPEED = 2.5;
const POWERUP_CHANCE = 0.18;
const MAX_LIVES = 5;
const INITIAL_LIVES = 3;

// ─── Canvas Helper ──────────────────────────────────────
function drawRoundRect(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
}

const POWERUP_TYPES = {
    EXPAND: { color: '#4CAF50', label: 'W', desc: 'Expand Paddle' },
    EXTRA_LIFE: { color: '#f44336', label: '♥', desc: 'Extra Life' },
    MULTI_BALL: { color: '#2196F3', label: 'M', desc: 'Multi-Ball' }
};

// Block color palette per row (cycles)
const BLOCK_COLORS = [
    '#e74c3c', '#e67e22', '#f1c40f', '#2ecc71',
    '#3498db', '#9b59b6', '#1abc9c', '#e91e63'
];

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
    KEY: 'cannonBall_best_',
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

// ─── Paddle ─────────────────────────────────────────────
class Paddle {
    constructor(canvasW, canvasH, character) {
        this.character = character;
        this.width = PADDLE_WIDTH_DEFAULT;
        this.height = PADDLE_HEIGHT;
        this.x = (canvasW - this.width) / 2;
        this.y = canvasH - 40;
        this.speed = PADDLE_SPEED;
        this.canvasW = canvasW;
        this.expandTimer = 0;
        this.charImg = null;
    }

    loadImage() {
        this.charImg = Assets.getImage(this.character + '1');
    }

    moveLeft(dt) {
        this.x = Math.max(0, this.x - this.speed * (dt / 16));
    }

    moveRight(dt) {
        this.x = Math.min(this.canvasW - this.width, this.x + this.speed * (dt / 16));
    }

    moveTo(targetX) {
        this.x = Math.max(0, Math.min(this.canvasW - this.width, targetX - this.width / 2));
    }

    expand(duration) {
        if (this.expandTimer <= 0) {
            this.width = PADDLE_WIDTH_DEFAULT * 1.5;
        }
        this.expandTimer = duration;
    }

    update(dt) {
        if (this.expandTimer > 0) {
            this.expandTimer -= dt;
            if (this.expandTimer <= 0) {
                this.width = PADDLE_WIDTH_DEFAULT;
                this.expandTimer = 0;
            }
        }
        // Keep in bounds after resize
        if (this.x + this.width > this.canvasW) {
            this.x = this.canvasW - this.width;
        }
    }

    draw(ctx) {
        // Draw paddle body
        const r = this.height / 2;
        drawRoundRect(ctx, this.x, this.y, this.width, this.height, r);
        ctx.fillStyle = '#ddd';
        ctx.fill();

        // Gradient overlay
        const grad = ctx.createLinearGradient(this.x, this.y, this.x, this.y + this.height);
        grad.addColorStop(0, 'rgba(255,255,255,0.5)');
        grad.addColorStop(1, 'rgba(0,0,0,0.2)');
        ctx.fillStyle = grad;
        ctx.fill();

        // Border so it's always visible
        ctx.strokeStyle = 'rgba(255,255,255,0.6)';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Expand glow
        if (this.expandTimer > 0) {
            ctx.shadowColor = '#4CAF50';
            ctx.shadowBlur = 10;
            ctx.strokeStyle = '#4CAF50';
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.shadowBlur = 0;
        }

        // Draw character sprite on paddle
        if (this.charImg) {
            const imgSize = 28;
            const imgX = this.x + (this.width - imgSize) / 2;
            const imgY = this.y - imgSize + 4;
            ctx.drawImage(this.charImg, imgX, imgY, imgSize, imgSize);
        }
    }

    getBounds() {
        return { x: this.x, y: this.y, w: this.width, h: this.height };
    }
}

// ─── Ball ───────────────────────────────────────────────
class Ball {
    constructor(x, y, speed) {
        this.x = x;
        this.y = y;
        this.radius = BALL_RADIUS;
        this.speed = speed;
        // Random angle between -60 and -120 degrees (upward)
        const angle = -(Math.PI / 3 + Math.random() * Math.PI / 3);
        this.vx = Math.cos(angle) * this.speed;
        this.vy = Math.sin(angle) * this.speed;
        this.active = true;
    }

    update(dt, canvasW, canvasH, paddle, blocks, game) {
        const step = dt / 16;
        this.x += this.vx * step;
        this.y += this.vy * step;

        // Wall bounces
        if (this.x - this.radius <= 0) {
            this.x = this.radius;
            this.vx = Math.abs(this.vx);
            Assets.playSound('hit');
        }
        if (this.x + this.radius >= canvasW) {
            this.x = canvasW - this.radius;
            this.vx = -Math.abs(this.vx);
            Assets.playSound('hit');
        }
        // Ceiling
        if (this.y - this.radius <= 0) {
            this.y = this.radius;
            this.vy = Math.abs(this.vy);
            Assets.playSound('hit');
        }

        // Floor (ball lost)
        if (this.y + this.radius >= canvasH) {
            this.active = false;
            return;
        }

        // Paddle collision
        const pb = paddle.getBounds();
        if (this.vy > 0 &&
            this.y + this.radius >= pb.y &&
            this.y + this.radius <= pb.y + pb.h + 4 &&
            this.x >= pb.x &&
            this.x <= pb.x + pb.w) {
            // Calculate reflection based on where ball hit paddle
            const hitPos = (this.x - pb.x) / pb.w; // 0 to 1
            const angle = -(Math.PI / 6 + hitPos * (2 * Math.PI / 3)); // -30 to -150 deg
            this.vx = Math.cos(angle) * this.speed;
            this.vy = Math.sin(angle) * this.speed;
            this.y = pb.y - this.radius;
            Assets.playSound('flap');
        }

        // Block collisions
        for (let i = blocks.length - 1; i >= 0; i--) {
            const b = blocks[i];
            if (!b.alive) continue;

            if (this.x + this.radius > b.x &&
                this.x - this.radius < b.x + b.width &&
                this.y + this.radius > b.y &&
                this.y - this.radius < b.y + b.height) {

                b.hit();
                if (!b.alive) {
                    game.onBlockDestroyed(b);
                }
                Assets.playSound('point');

                // Determine bounce direction
                const overlapLeft = (this.x + this.radius) - b.x;
                const overlapRight = (b.x + b.width) - (this.x - this.radius);
                const overlapTop = (this.y + this.radius) - b.y;
                const overlapBottom = (b.y + b.height) - (this.y - this.radius);

                const minOverlap = Math.min(overlapLeft, overlapRight, overlapTop, overlapBottom);

                if (minOverlap === overlapLeft || minOverlap === overlapRight) {
                    this.vx = -this.vx;
                } else {
                    this.vy = -this.vy;
                }

                break; // Only hit one block per frame
            }
        }
    }

    draw(ctx) {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = '#fff';
        ctx.fill();
        ctx.strokeStyle = '#ccc';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Shine
        ctx.beginPath();
        ctx.arc(this.x - 2, this.y - 2, this.radius * 0.35, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        ctx.fill();
    }
}

// ─── Block ──────────────────────────────────────────────
class Block {
    constructor(x, y, width, height, color, hp) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.color = color;
        this.hp = hp;
        this.maxHp = hp;
        this.alive = true;
    }

    hit() {
        this.hp--;
        if (this.hp <= 0) {
            this.alive = false;
        }
    }

    draw(ctx) {
        if (!this.alive) return;

        // Darken color if multi-hit
        const hpRatio = this.hp / this.maxHp;
        drawRoundRect(ctx, this.x, this.y, this.width, this.height, 3);
        ctx.fillStyle = this.color;
        ctx.fill();

        // Top highlight
        const grad = ctx.createLinearGradient(this.x, this.y, this.x, this.y + this.height);
        grad.addColorStop(0, 'rgba(255,255,255,0.35)');
        grad.addColorStop(0.5, 'rgba(255,255,255,0.05)');
        grad.addColorStop(1, 'rgba(0,0,0,0.2)');
        ctx.fillStyle = grad;
        ctx.fill();

        // Border
        ctx.strokeStyle = 'rgba(0,0,0,0.3)';
        ctx.lineWidth = 1;
        ctx.stroke();

        // HP indicator for multi-hit blocks
        if (this.maxHp > 1 && this.hp > 1) {
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 10px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(this.hp, this.x + this.width / 2, this.y + this.height / 2);
        }
    }
}

// ─── PowerUp ────────────────────────────────────────────
class PowerUp {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.size = POWERUP_SIZE;
        this.type = type;
        this.speed = POWERUP_SPEED;
        this.active = true;
        this.time = 0;
    }

    update(dt) {
        this.y += this.speed * (dt / 16);
        this.time += dt;
    }

    draw(ctx) {
        if (!this.active) return;
        const info = POWERUP_TYPES[this.type];
        const pulse = 1 + Math.sin(this.time / 200) * 0.15;
        const s = this.size * pulse;

        ctx.save();
        ctx.shadowColor = info.color;
        ctx.shadowBlur = 8;

        ctx.fillStyle = info.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, s / 2, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#fff';
        ctx.font = 'bold 13px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(info.label, this.x, this.y);

        ctx.restore();
    }

    getBounds() {
        return { x: this.x - this.size / 2, y: this.y - this.size / 2, w: this.size, h: this.size };
    }
}

// ─── Particle (for block break effect) ──────────────────
class Particle {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.vx = (Math.random() - 0.5) * 4;
        this.vy = (Math.random() - 0.5) * 4 - 2;
        this.life = 1;
        this.decay = 0.02 + Math.random() * 0.02;
        this.size = 2 + Math.random() * 3;
    }

    update(dt) {
        const step = dt / 16;
        this.x += this.vx * step;
        this.y += this.vy * step;
        this.vy += 0.1 * step;
        this.life -= this.decay * step;
    }

    draw(ctx) {
        if (this.life <= 0) return;
        ctx.globalAlpha = this.life;
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x - this.size / 2, this.y - this.size / 2, this.size, this.size);
        ctx.globalAlpha = 1;
    }
}

// ─── Level Generator ────────────────────────────────────
function generateLevel(level, canvasW) {
    const blocks = [];
    const rows = Math.min(BLOCK_ROWS_BASE + Math.floor(level / 2), 8);
    const cols = BLOCK_COLS;
    const totalPadding = (cols + 1) * BLOCK_PADDING;
    const blockW = (canvasW - totalPadding) / cols;

    for (let r = 0; r < rows; r++) {
        const color = BLOCK_COLORS[r % BLOCK_COLORS.length];
        for (let c = 0; c < cols; c++) {
            const x = BLOCK_PADDING + c * (blockW + BLOCK_PADDING);
            const y = BLOCK_TOP_OFFSET + r * (BLOCK_HEIGHT + BLOCK_PADDING);

            // Higher levels have stronger blocks
            let hp = 1;
            if (level >= 3 && r < 2) hp = 2;
            if (level >= 5 && r === 0) hp = 3;
            if (level >= 7) hp = Math.min(1 + Math.floor((rows - r) / 2), 4);

            blocks.push(new Block(x, y, blockW, BLOCK_HEIGHT, color, hp));
        }
    }
    return blocks;
}

// ─── Main Game ──────────────────────────────────────────
class CannonBallGame {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.state = STATE.MENU;
        this.character = 'calvin';
        this.paddle = null;
        this.balls = [];
        this.blocks = [];
        this.powerUps = [];
        this.particles = [];
        this.score = 0;
        this.lives = INITIAL_LIVES;
        this.level = 1;
        this.ballSpeed = BALL_SPEED_INITIAL;
        this.lastTime = 0;
        this.keysDown = {};

        // Touch state
        this.touchX = null;

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
        if (this.paddle) {
            this.paddle.canvasW = this.canvas.width;
            this.paddle.y = this.canvas.height - 40;
        }
    }

    async loadAssets() {
        const base = '../assets/';
        await Promise.all([
            Assets.loadImage('calvin1', base + 'calvin1.png'),
            Assets.loadImage('bailey1', base + 'bailey1.png'),
        ]);
        await Promise.all([
            Assets.loadSound('flap', base + 'flap.mp3'),
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
            this.keysDown[e.code] = true;
            if (e.code === 'Space' && this.state === STATE.LAUNCH) {
                e.preventDefault();
                this.launchBall();
            }
        });
        document.addEventListener('keyup', e => {
            this.keysDown[e.code] = false;
        });

        // Touch controls
        this.canvas.addEventListener('touchstart', e => {
            e.preventDefault();
            const rect = this.canvas.getBoundingClientRect();
            this.touchX = (e.touches[0].clientX - rect.left) * (this.canvas.width / rect.width);
            if (this.state === STATE.LAUNCH) {
                this.launchBall();
            }
        });
        this.canvas.addEventListener('touchmove', e => {
            e.preventDefault();
            const rect = this.canvas.getBoundingClientRect();
            this.touchX = (e.touches[0].clientX - rect.left) * (this.canvas.width / rect.width);
        });
        this.canvas.addEventListener('touchend', e => {
            e.preventDefault();
            this.touchX = null;
        });

        // Mouse control
        this.canvas.addEventListener('mousemove', e => {
            if (this.state === STATE.PLAYING || this.state === STATE.LAUNCH) {
                const rect = this.canvas.getBoundingClientRect();
                const mouseX = (e.clientX - rect.left) * (this.canvas.width / rect.width);
                this.paddle.moveTo(mouseX);
            }
        });
        this.canvas.addEventListener('click', () => {
            if (this.state === STATE.LAUNCH) {
                this.launchBall();
            }
        });

        // UI buttons
        document.querySelectorAll('.menu-character-btn').forEach(btn => {
            btn.addEventListener('click', e => {
                this.character = e.currentTarget.dataset.character;
                this.startGame();
            });
        });
        document.getElementById('restartBtn').addEventListener('click', () => this.startGame());
        document.getElementById('menuBtn').addEventListener('click', () => window.location.href = 'https://danmeiser.github.io/');
        document.getElementById('nextLevelBtn').addEventListener('click', () => this.nextLevel());
    }

    updateBestLabels() {
        document.getElementById('calvinBest').textContent = Scores.get('calvin');
        document.getElementById('baileyBest').textContent = Scores.get('bailey');
    }

    startGame() {
        this.state = STATE.LAUNCH;
        this.score = 0;
        this.lives = INITIAL_LIVES;
        this.level = 1;
        this.ballSpeed = BALL_SPEED_INITIAL;
        this.powerUps = [];
        this.particles = [];

        this.paddle = new Paddle(this.canvas.width, this.canvas.height, this.character);
        this.paddle.loadImage();
        this.blocks = generateLevel(this.level, this.canvas.width);
        this.balls = [];

        // Place ball on paddle
        this.placeBallOnPaddle();

        document.getElementById('menu').classList.add('hidden');
        document.getElementById('gameOver').classList.add('hidden');
        document.getElementById('levelComplete').classList.add('hidden');
        document.getElementById('hud').classList.remove('hidden');
        this.updateHUD();
    }

    placeBallOnPaddle() {
        const ball = new Ball(
            this.paddle.x + this.paddle.width / 2,
            this.paddle.y - BALL_RADIUS - 2,
            this.ballSpeed
        );
        ball.vx = 0;
        ball.vy = 0;
        ball._onPaddle = true;
        this.balls = [ball];
    }

    launchBall() {
        if (this.state !== STATE.LAUNCH) return;
        this.state = STATE.PLAYING;
        const ball = this.balls[0];
        if (ball && ball._onPaddle) {
            const angle = -(Math.PI / 4 + Math.random() * Math.PI / 2);
            ball.vx = Math.cos(angle) * this.ballSpeed;
            ball.vy = Math.sin(angle) * this.ballSpeed;
            ball._onPaddle = false;
        }
    }

    nextLevel() {
        this.level++;
        this.ballSpeed = BALL_SPEED_INITIAL + (this.level - 1) * BALL_SPEED_INCREMENT;
        this.blocks = generateLevel(this.level, this.canvas.width);
        this.powerUps = [];
        this.particles = [];
        this.paddle.width = PADDLE_WIDTH_DEFAULT;
        this.paddle.expandTimer = 0;
        this.state = STATE.LAUNCH;
        this.placeBallOnPaddle();

        document.getElementById('levelComplete').classList.add('hidden');
        this.updateHUD();
    }

    onBlockDestroyed(block) {
        // Score: 10 per block + level bonus
        const points = 10 * this.level;
        this.score += points;

        // Particles
        for (let i = 0; i < 8; i++) {
            this.particles.push(new Particle(
                block.x + block.width / 2,
                block.y + block.height / 2,
                block.color
            ));
        }

        // Maybe drop a power-up
        if (Math.random() < POWERUP_CHANCE) {
            const types = Object.keys(POWERUP_TYPES);
            const type = types[Math.floor(Math.random() * types.length)];
            this.powerUps.push(new PowerUp(
                block.x + block.width / 2,
                block.y + block.height / 2,
                type
            ));
        }
    }

    applyPowerUp(pu) {
        switch (pu.type) {
            case 'EXPAND':
                this.paddle.expand(10000); // 10 seconds
                break;
            case 'EXTRA_LIFE':
                this.lives = Math.min(this.lives + 1, MAX_LIVES);
                break;
            case 'MULTI_BALL':
                // Spawn 2 extra balls from the first active ball's position
                const sourceBall = this.balls.find(b => b.active);
                if (sourceBall) {
                    for (let i = 0; i < 2; i++) {
                        const angle = -(Math.PI / 6 + Math.random() * (2 * Math.PI / 3));
                        const newBall = new Ball(sourceBall.x, sourceBall.y, this.ballSpeed);
                        newBall.vx = Math.cos(angle) * this.ballSpeed;
                        newBall.vy = Math.sin(angle) * this.ballSpeed;
                        // Make sure it goes upward
                        if (newBall.vy > 0) newBall.vy = -newBall.vy;
                        this.balls.push(newBall);
                    }
                }
                break;
        }
        Assets.playSound('point');
    }

    updateHUD() {
        document.getElementById('score').textContent = this.score;
        document.getElementById('lives').textContent = this.lives;
        document.getElementById('level').textContent = this.level;
    }

    gameOver() {
        this.state = STATE.GAME_OVER;
        Assets.playSound('hit');
        Scores.update(this.character, this.score);

        document.getElementById('hud').classList.add('hidden');
        document.getElementById('gameOver').classList.remove('hidden');
        document.getElementById('finalScore').textContent = this.score;
        document.getElementById('finalBest').textContent = Scores.get(this.character);
    }

    levelComplete() {
        this.state = STATE.LEVEL_COMPLETE;
        Assets.playSound('point');
        // Bonus points for clearing the level
        this.score += this.level * 50;
        this.updateHUD();

        document.getElementById('levelComplete').classList.remove('hidden');
        document.getElementById('levelScore').textContent = this.score;
    }

    // ─── Update ─────────────────────────────────────────
    update(dt) {
        if (this.state !== STATE.PLAYING && this.state !== STATE.LAUNCH) return;

        // Paddle input
        if (this.keysDown['ArrowLeft'] || this.keysDown['KeyA']) {
            this.paddle.moveLeft(dt);
        }
        if (this.keysDown['ArrowRight'] || this.keysDown['KeyD']) {
            this.paddle.moveRight(dt);
        }

        // Touch input
        if (this.touchX !== null) {
            this.paddle.moveTo(this.touchX);
        }

        this.paddle.update(dt);

        // Ball on paddle follows it
        if (this.state === STATE.LAUNCH && this.balls.length > 0 && this.balls[0]._onPaddle) {
            this.balls[0].x = this.paddle.x + this.paddle.width / 2;
            this.balls[0].y = this.paddle.y - BALL_RADIUS - 2;
        }

        if (this.state === STATE.LAUNCH) return;

        // Update balls
        for (const ball of this.balls) {
            if (ball.active) {
                ball.update(dt, this.canvas.width, this.canvas.height, this.paddle, this.blocks, this);
            }
        }

        // Remove dead balls
        this.balls = this.balls.filter(b => b.active);

        // All balls lost
        if (this.balls.length === 0) {
            this.lives--;
            if (this.lives <= 0) {
                this.gameOver();
                return;
            }
            // Reset paddle and place new ball
            this.paddle.width = PADDLE_WIDTH_DEFAULT;
            this.paddle.expandTimer = 0;
            this.state = STATE.LAUNCH;
            this.placeBallOnPaddle();
        }

        // Power-ups
        for (let i = this.powerUps.length - 1; i >= 0; i--) {
            const pu = this.powerUps[i];
            pu.update(dt);

            // Off screen
            if (pu.y > this.canvas.height + POWERUP_SIZE) {
                this.powerUps.splice(i, 1);
                continue;
            }

            // Catch with paddle
            const pb = this.paddle.getBounds();
            const pBounds = pu.getBounds();
            if (pBounds.x < pb.x + pb.w && pBounds.x + pBounds.w > pb.x &&
                pBounds.y < pb.y + pb.h && pBounds.y + pBounds.h > pb.y) {
                this.applyPowerUp(pu);
                this.powerUps.splice(i, 1);
            }
        }

        // Particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            this.particles[i].update(dt);
            if (this.particles[i].life <= 0) {
                this.particles.splice(i, 1);
            }
        }

        // Check level complete
        if (this.blocks.every(b => !b.alive)) {
            this.levelComplete();
        }

        this.updateHUD();
    }

    // ─── Draw ───────────────────────────────────────────
    draw() {
        const ctx = this.ctx;
        const w = this.canvas.width;
        const h = this.canvas.height;

        // Background
        const grad = ctx.createLinearGradient(0, 0, 0, h);
        grad.addColorStop(0, '#1a1a2e');
        grad.addColorStop(1, '#16213e');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);

        // Subtle grid pattern
        ctx.strokeStyle = 'rgba(255,255,255,0.03)';
        ctx.lineWidth = 1;
        for (let x = 0; x < w; x += 30) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, h);
            ctx.stroke();
        }
        for (let y = 0; y < h; y += 30) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(w, y);
            ctx.stroke();
        }

        if (this.state === STATE.PLAYING || this.state === STATE.LAUNCH ||
            this.state === STATE.GAME_OVER || this.state === STATE.LEVEL_COMPLETE) {

            // Blocks
            for (const block of this.blocks) {
                block.draw(ctx);
            }

            // Power-ups
            for (const pu of this.powerUps) {
                pu.draw(ctx);
            }

            // Particles
            for (const p of this.particles) {
                p.draw(ctx);
            }

            // Paddle
            if (this.paddle) this.paddle.draw(ctx);

            // Balls
            for (const ball of this.balls) {
                if (ball.active) ball.draw(ctx);
            }

            // Launch hint
            if (this.state === STATE.LAUNCH) {
                ctx.fillStyle = 'rgba(255,255,255,0.6)';
                ctx.font = '16px Arial';
                ctx.textAlign = 'center';
                ctx.fillText('Click, Tap, or press SPACE to launch!', w / 2, h / 2);
            }
        }

        // Darkened overlay on game over / level complete
        if (this.state === STATE.GAME_OVER || this.state === STATE.LEVEL_COMPLETE) {
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
    window.cannonBallGame = new CannonBallGame();
});
