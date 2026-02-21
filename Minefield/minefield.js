'use strict';

// ================================================================
// MINEFIELD.JS  –  Walk-based Minesweeper
// 15×15 grid | 45 mines | character walks tile-by-tile
// ================================================================

const COLS  = 15;
const ROWS  = 15;
const MINES = 45;
const TOTAL_SAFE = COLS * ROWS - MINES; // 180

// Number colours (index 1–8, classic Minesweeper palette)
const NUM_COLORS = [
    '', '#1565c0', '#2e7d32', '#c62828',
    '#283593', '#b71c1c', '#00695c', '#37474f', '#424242'
];

// ── Assets ──────────────────────────────────────────────────────
const sprites = { calvin: new Image(), bailey: new Image() };
sprites.calvin.src  = '../assets/calvin1.png';
sprites.bailey.src  = '../assets/bailey1.png';

// ── Canvas / DOM ────────────────────────────────────────────────
const canvas  = document.getElementById('gameCanvas');
const ctx     = canvas.getContext('2d');
const wrapper = document.getElementById('gameWrapper');

// ── Game State ──────────────────────────────────────────────────
let state     = 'MENU';   // MENU | PLAYING | GAMEOVER | WIN
let character = 'calvin';
let grid      = [];       // grid[y][x] = { mine, revealed, flagged, adj, exploded }
let playerX   = -1;       // -1 = outside the grid (entry corridor)
let playerY   = Math.floor(ROWS / 2);
let firstStep = true;     // mines placed on first in-grid step
let revealedCount = 0;    // safe tiles revealed so far
let flagMode  = false;    // mobile flag-toggle state

// ── Score helpers ───────────────────────────────────────────────
function scoreKey(c)  { return `minefield_best_${c}`; }
function getBest(c)   { return parseInt(localStorage.getItem(scoreKey(c)) || '0', 10); }
function saveBest(c, s) { if (s > getBest(c)) localStorage.setItem(scoreKey(c), String(s)); }

// ── Menu ────────────────────────────────────────────────────────
function showMenu() {
    state = 'MENU';
    document.getElementById('menu').classList.remove('hidden');
    document.getElementById('gameOver').classList.add('hidden');
    document.getElementById('hud').classList.add('hidden');
    document.getElementById('calvinBest').textContent = getBest('calvin');
    document.getElementById('baileyBest').textContent = getBest('bailey');
    resize();
}

// ── Start ────────────────────────────────────────────────────────
function startGame(char) {
    character     = char;
    state         = 'PLAYING';
    firstStep     = true;
    revealedCount = 0;
    flagMode      = false;

    // Player starts just outside the left edge, vertical centre
    playerX = -1;
    playerY = Math.floor(ROWS / 2);

    buildGrid();

    document.getElementById('menu').classList.add('hidden');
    document.getElementById('gameOver').classList.add('hidden');
    document.getElementById('hud').classList.remove('hidden');
    setFlagBtn(false);
    updateHUD();
    resize();
}

// ── Grid construction ────────────────────────────────────────────
function buildGrid() {
    grid = [];
    for (let y = 0; y < ROWS; y++) {
        grid[y] = [];
        for (let x = 0; x < COLS; x++) {
            grid[y][x] = { mine: false, revealed: false, flagged: false, adj: 0, exploded: false };
        }
    }
}

function placeMines(safeX, safeY) {
    // Safe zone: 3×3 region around first landing tile
    const safe = new Set();
    for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
            const nx = safeX + dx, ny = safeY + dy;
            if (nx >= 0 && nx < COLS && ny >= 0 && ny < ROWS) {
                safe.add(`${nx},${ny}`);
            }
        }
    }
    let placed = 0;
    while (placed < MINES) {
        const x = Math.floor(Math.random() * COLS);
        const y = Math.floor(Math.random() * ROWS);
        if (!grid[y][x].mine && !safe.has(`${x},${y}`)) {
            grid[y][x].mine = true;
            placed++;
        }
    }
    // Compute adjacency counts
    for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
            if (grid[y][x].mine) continue;
            let c = 0;
            forNeighbors(x, y, (nx, ny) => { if (grid[ny][nx].mine) c++; });
            grid[y][x].adj = c;
        }
    }
}

function forNeighbors(x, y, cb) {
    for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
            if (!dx && !dy) continue;
            const nx = x + dx, ny = y + dy;
            if (nx >= 0 && nx < COLS && ny >= 0 && ny < ROWS) cb(nx, ny);
        }
    }
}

// ── Iterative flood-reveal for 0-adj tiles ───────────────────────
function floodReveal(startX, startY) {
    const queue = [[startX, startY]];
    while (queue.length) {
        const [x, y] = queue.shift();
        const t = grid[y][x];
        if (t.revealed || t.flagged || t.mine) continue;
        t.revealed = true;
        revealedCount++;
        if (t.adj === 0) {
            forNeighbors(x, y, (nx, ny) => {
                if (!grid[ny][nx].revealed && !grid[ny][nx].flagged) {
                    queue.push([nx, ny]);
                }
            });
        }
    }
}

// ── HUD ──────────────────────────────────────────────────────────
function updateHUD() {
    const flagsPlaced = grid.flat().filter(t => t.flagged).length;
    document.getElementById('scoreHUD').textContent = revealedCount;
    document.getElementById('minesHUD').textContent = Math.max(0, MINES - flagsPlaced);
}

// ── Movement ─────────────────────────────────────────────────────
function tryMove(dx, dy) {
    if (state !== 'PLAYING') return;

    const nx = playerX + dx;
    const ny = playerY + dy;

    // Allow moving along the entry corridor (x = -1) vertically
    if (nx < -1 || nx >= COLS || ny < 0 || ny >= ROWS) return;

    // If staying outside the grid, just reposition
    if (nx === -1) {
        playerX = nx;
        playerY = ny;
        render();
        return;
    }

    const t = grid[ny][nx];
    if (t.flagged) return; // cannot walk onto a flagged tile

    playerX = nx;
    playerY = ny;

    if (!t.revealed) {
        // Place mines on very first in-grid step
        if (firstStep) {
            placeMines(nx, ny);
            firstStep = false;
        }

        if (t.mine) {
            t.exploded = true;
            t.revealed = true;
            triggerGameOver();
            return;
        }

        floodReveal(nx, ny);

        if (revealedCount >= TOTAL_SAFE) {
            triggerWin();
            return;
        }
    }

    updateHUD();
    render();
}

// ── Flagging ─────────────────────────────────────────────────────
// Flag/unflag the tile in the given direction (without moving there)
function tryFlag(dx, dy) {
    if (state !== 'PLAYING') return;
    const tx = playerX + dx;
    const ty = playerY + dy;
    if (tx < 0 || tx >= COLS || ty < 0 || ty >= ROWS) return;
    const t = grid[ty][tx];
    if (t.revealed) return;
    t.flagged = !t.flagged;
    updateHUD();
    render();
}

// ── Game-over / Win ──────────────────────────────────────────────
function triggerGameOver() {
    state = 'GAMEOVER';
    saveBest(character, revealedCount);
    // Reveal all mines so player can see where they were
    for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
            if (grid[y][x].mine) grid[y][x].revealed = true;
        }
    }
    render();
    setTimeout(() => {
        document.getElementById('endTitle').textContent   = '💥 Game Over!';
        document.getElementById('finalScore').textContent = revealedCount;
        document.getElementById('finalBest').textContent  = getBest(character);
        document.getElementById('hud').classList.add('hidden');
        document.getElementById('gameOver').classList.remove('hidden');
    }, 900);
}

function triggerWin() {
    state = 'WIN';
    saveBest(character, revealedCount);
    render();
    setTimeout(() => {
        document.getElementById('endTitle').textContent   = '🎉 You Win!';
        document.getElementById('finalScore').textContent = revealedCount;
        document.getElementById('finalBest').textContent  = getBest(character);
        document.getElementById('hud').classList.add('hidden');
        document.getElementById('gameOver').classList.remove('hidden');
    }, 400);
}

// ── Custom round-rect helper (never use ctx.roundRect) ───────────
function drawRoundRect(cx, x, y, w, h, r) {
    cx.beginPath();
    cx.moveTo(x + r, y);
    cx.lineTo(x + w - r, y);
    cx.arcTo(x + w, y,     x + w, y + r,     r);
    cx.lineTo(x + w, y + h - r);
    cx.arcTo(x + w, y + h, x + w - r, y + h, r);
    cx.lineTo(x + r, y + h);
    cx.arcTo(x,     y + h, x,     y + h - r, r);
    cx.lineTo(x, y + r);
    cx.arcTo(x,     y,     x + r, y,         r);
    cx.closePath();
}

// ── Render ────────────────────────────────────────────────────────
function render() {
    const W = canvas.width;
    const H = canvas.height;
    if (!W || !H) return;

    // Dark space background
    const bg = ctx.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, '#1a1a2e');
    bg.addColorStop(1, '#16213e');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // Subtle grid overlay (opacity 0.03)
    ctx.strokeStyle = 'rgba(255,255,255,0.03)';
    ctx.lineWidth = 1;
    const STEP = 20;
    for (let gx = 0; gx < W; gx += STEP) {
        ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, H); ctx.stroke();
    }
    for (let gy = 0; gy < H; gy += STEP) {
        ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(W, gy); ctx.stroke();
    }

    if (state === 'MENU') return;

    // ── Layout ──────────────────────────────────────────────────
    const HUD_H   = Math.round(H * 0.08);
    const PAD     = Math.round(W * 0.025);
    const tileSize = Math.min(
        Math.floor((W - PAD * 2) / COLS),
        Math.floor((H - HUD_H - PAD * 2) / ROWS)
    );
    const gridW   = tileSize * COLS;
    const gridH   = tileSize * ROWS;
    const offX    = Math.floor((W - gridW) / 2);
    const offY    = HUD_H + Math.floor((H - HUD_H - gridH) / 2);
    const GAP     = Math.max(1, Math.round(tileSize * 0.06));
    const RADIUS  = Math.max(2, Math.round(tileSize * 0.12));

    // ── Entry corridor arrow ─────────────────────────────────────
    // Subtle arrow guiding player into the grid
    if (playerX === -1) {
        ctx.fillStyle = 'rgba(255,255,255,0.25)';
        ctx.font = `${tileSize}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('▶', offX - tileSize * 0.5, offY + playerY * tileSize + tileSize / 2);
    }

    // ── Tiles ────────────────────────────────────────────────────
    const fontSize = Math.round(tileSize * 0.55);
    ctx.font = `bold ${fontSize}px Arial`;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';

    for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
            const t  = grid[y][x];
            const px = offX + x * tileSize;
            const py = offY + y * tileSize;
            const tw = tileSize - GAP * 2;
            const th = tileSize - GAP * 2;

            if (!t.revealed) {
                // Unrevealed
                const isPlayerHere = (x === playerX && y === playerY);
                drawRoundRect(ctx, px + GAP, py + GAP, tw, th, RADIUS);

                if (t.flagged) {
                    ctx.fillStyle = '#2c3e50';
                    ctx.fill();
                    ctx.strokeStyle = 'rgba(239,83,80,0.7)';
                    ctx.lineWidth = 1.5;
                    ctx.stroke();
                    ctx.fillStyle = '#ef5350';
                    ctx.fillText('🚩', px + tileSize / 2, py + tileSize / 2);
                } else if (isPlayerHere) {
                    // Player's current unrevealed tile (entry point / just landed)
                    ctx.fillStyle = '#1e3a4a';
                    ctx.fill();
                    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
                    ctx.lineWidth = 1;
                    ctx.stroke();
                } else {
                    ctx.fillStyle = '#263238';
                    ctx.fill();
                    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
                    ctx.lineWidth = 1;
                    ctx.stroke();
                }

            } else if (t.mine) {
                // Mine tile
                drawRoundRect(ctx, px + GAP, py + GAP, tw, th, RADIUS);
                ctx.fillStyle = t.exploded ? '#7f0000' : '#3e1010';
                ctx.fill();
                if (t.exploded) {
                    ctx.strokeStyle = '#ff1744';
                    ctx.lineWidth = 2;
                    ctx.stroke();
                }
                ctx.fillText('💣', px + tileSize / 2, py + tileSize / 2);

            } else {
                // Revealed safe tile
                drawRoundRect(ctx, px + GAP, py + GAP, tw, th, RADIUS);
                ctx.fillStyle = '#0d1b2a';
                ctx.fill();
                ctx.strokeStyle = 'rgba(255,255,255,0.05)';
                ctx.lineWidth = 1;
                ctx.stroke();

                if (t.adj > 0) {
                    ctx.fillStyle = NUM_COLORS[t.adj] || '#fff';
                    ctx.fillText(t.adj, px + tileSize / 2, py + tileSize / 2);
                }
            }
        }
    }

    // ── Player sprite ────────────────────────────────────────────
    const spriteSize   = Math.round(tileSize * 0.82);
    const spriteMargin = Math.round((tileSize - spriteSize) / 2);
    let spritePX, spritePY;

    if (playerX === -1) {
        // Draw player just to the left of the grid
        spritePX = offX - tileSize + spriteMargin;
        spritePY = offY + playerY * tileSize + spriteMargin;
    } else {
        spritePX = offX + playerX * tileSize + spriteMargin;
        spritePY = offY + playerY * tileSize + spriteMargin;
    }

    ctx.save();
    ctx.shadowColor = 'rgba(255,255,255,0.6)';
    ctx.shadowBlur  = 10;
    const spr = sprites[character];
    if (spr.complete && spr.naturalWidth > 0) {
        ctx.drawImage(spr, spritePX, spritePY, spriteSize, spriteSize);
    } else {
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(spritePX + spriteSize / 2, spritePY + spriteSize / 2, spriteSize / 2, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.restore();

    // ── Flag-mode indicator (mobile) ─────────────────────────────
    if (flagMode) {
        const fw = 90, fh = 28;
        drawRoundRect(ctx, W - fw - 6, 6, fw, fh, 6);
        ctx.fillStyle = 'rgba(239,83,80,0.85)';
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.font = `bold 13px Arial`;
        ctx.textAlign    = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('🚩 FLAG MODE', W - fw / 2 - 6, 6 + fh / 2);
    }
}

// ── Resize ────────────────────────────────────────────────────────
function resize() {
    canvas.width  = wrapper.clientWidth;
    canvas.height = wrapper.clientHeight;
    render();
}

// ── Keyboard input ────────────────────────────────────────────────
document.addEventListener('keydown', (e) => {
    if (state !== 'PLAYING') return;
    const shift = e.shiftKey;
    switch (e.key) {
        case 'ArrowLeft':  case 'a': case 'A':
            e.preventDefault(); shift ? tryFlag(-1, 0) : tryMove(-1, 0); break;
        case 'ArrowRight': case 'd': case 'D':
            e.preventDefault(); shift ? tryFlag(1, 0)  : tryMove(1, 0);  break;
        case 'ArrowUp':    case 'w': case 'W':
            e.preventDefault(); shift ? tryFlag(0, -1) : tryMove(0, -1); break;
        case 'ArrowDown':  case 's': case 'S':
            e.preventDefault(); shift ? tryFlag(0, 1)  : tryMove(0, 1);  break;
    }
});

// ── Touch / swipe on canvas ───────────────────────────────────────
let touchStartX = 0, touchStartY = 0;
const MIN_SWIPE = 22;

canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
}, { passive: false });

canvas.addEventListener('touchend', (e) => {
    e.preventDefault();
    if (state !== 'PLAYING') return;
    const dx = e.changedTouches[0].clientX - touchStartX;
    const dy = e.changedTouches[0].clientY - touchStartY;
    if (Math.abs(dx) < MIN_SWIPE && Math.abs(dy) < MIN_SWIPE) return;

    let mx = 0, my = 0;
    if (Math.abs(dx) >= Math.abs(dy)) mx = dx > 0 ? 1 : -1;
    else                               my = dy > 0 ? 1 : -1;

    if (flagMode) {
        tryFlag(mx, my);
        flagMode = false;
        setFlagBtn(false);
    } else {
        tryMove(mx, my);
    }
}, { passive: false });

// ── Mobile D-pad ──────────────────────────────────────────────────
function dpadMove(dx, dy) {
    if (state !== 'PLAYING') return;
    if (flagMode) {
        tryFlag(dx, dy);
        flagMode = false;
        setFlagBtn(false);
    } else {
        tryMove(dx, dy);
    }
}

document.getElementById('dpadUp').addEventListener('click',    () => dpadMove(0, -1));
document.getElementById('dpadDown').addEventListener('click',  () => dpadMove(0, 1));
document.getElementById('dpadLeft').addEventListener('click',  () => dpadMove(-1, 0));
document.getElementById('dpadRight').addEventListener('click', () => dpadMove(1, 0));

document.getElementById('flagBtn').addEventListener('click', () => {
    if (state !== 'PLAYING') return;
    flagMode = !flagMode;
    setFlagBtn(flagMode);
    render();
});

function setFlagBtn(active) {
    const btn = document.getElementById('flagBtn');
    btn.classList.toggle('active', active);
}

// ── Menu buttons ──────────────────────────────────────────────────
document.querySelectorAll('.menu-character-btn').forEach(btn => {
    btn.addEventListener('click', () => startGame(btn.dataset.character));
});

document.getElementById('restartBtn').addEventListener('click', () => startGame(character));
document.getElementById('menuBtn').addEventListener('click',    showMenu);

// ── Window resize ─────────────────────────────────────────────────
window.addEventListener('resize', resize);

// ── Boot ──────────────────────────────────────────────────────────
showMenu();
