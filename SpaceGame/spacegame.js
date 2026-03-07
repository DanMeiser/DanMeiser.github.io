/* ============================================================
   Space Game — Scaffold / Sprite Test
   ============================================================
   Placeholder engine — upload sprites to assets/ and tell me
   the filenames so the full game can be built around them.
   ============================================================ */

'use strict';

// ── Constants (tune once sprites/design are confirmed) ──────
const CANVAS_BG   = '#000018';
const STAR_COUNT  = 120;

// ── DOM refs ─────────────────────────────────────────────────
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
const retryBtn    = document.getElementById('retryBtn');
const menuBtn     = document.getElementById('menuBtn');

// ── Resize canvas to fill wrapper ───────────────────────────
function resize() {
    canvas.width  = wrapper.clientWidth;
    canvas.height = wrapper.clientHeight;
}
resize();
new ResizeObserver(resize).observe(wrapper);

// ── Starfield (background) ───────────────────────────────────
const stars = Array.from({ length: STAR_COUNT }, () => ({
    x: Math.random(),
    y: Math.random(),
    r: Math.random() * 1.5 + 0.4,
    bright: Math.random()
}));

function drawStars() {
    const W = canvas.width, H = canvas.height;
    for (const s of stars) {
        const alpha = 0.4 + s.bright * 0.6;
        ctx.fillStyle = `rgba(255,255,255,${alpha})`;
        ctx.beginPath();
        ctx.arc(s.x * W, s.y * H, s.r, 0, Math.PI * 2);
        ctx.fill();
    }
}

// ── Sprite loader ────────────────────────────────────────────
function loadImage(src) {
    return new Promise(resolve => {
        const img = new Image();
        img.onload  = () => resolve(img);
        img.onerror = () => resolve(null);   // graceful — returns null if missing
        img.src = src;
    });
}

// ── Game state ───────────────────────────────────────────────
let selectedChar = null;
let sprites      = {};   // filled after character select
let rafId        = null;

// ── Sprite-test draw loop ────────────────────────────────────
// Draws the player sprite centred on screen so you can confirm
// it loaded correctly. Replace with real game loop once design is set.
function testLoop() {
    const W = canvas.width, H = canvas.height;
    ctx.fillStyle = CANVAS_BG;
    ctx.fillRect(0, 0, W, H);
    drawStars();

    if (sprites.player) {
        const img = sprites.player;
        const scale = Math.min(W * 0.25 / img.width, H * 0.25 / img.height);
        const dw = img.width  * scale;
        const dh = img.height * scale;
        ctx.drawImage(img, W / 2 - dw / 2, H / 2 - dh / 2, dw, dh);
    } else {
        // Fallback: coloured rocket shape
        ctx.save();
        ctx.translate(W / 2, H / 2);
        ctx.fillStyle = '#aaddff';
        ctx.beginPath();
        ctx.moveTo(0, -40);
        ctx.lineTo(15, 20);
        ctx.lineTo(0, 10);
        ctx.lineTo(-15, 20);
        ctx.closePath();
        ctx.fill();
        ctx.restore();

        ctx.fillStyle = '#ffffff';
        ctx.font = `${W * 0.04}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText('Sprite not found — see assets/', W / 2, H / 2 + 60);
    }

    ctx.fillStyle = '#88ccff';
    ctx.font = `${W * 0.04}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(`Pilot: ${selectedChar ?? '?'}`, W / 2, H * 0.08);

    rafId = requestAnimationFrame(testLoop);
}

// ── Character select ─────────────────────────────────────────
async function startGame(charName) {
    selectedChar = charName;

    // Load character sprite.
    // TODO: replace path(s) once you upload space-specific sprites.
    const playerSrc = `../assets/${charName}1.png`;
    sprites.player  = await loadImage(playerSrc);

    menu.classList.add('hidden');
    hud.classList.remove('hidden');
    canvas.classList.remove('hidden');

    scoreEl.textContent = 'Score: 0';
    levelEl.textContent = 'Level: 1';
    livesEl.textContent = 'Lives: 3';

    if (rafId) cancelAnimationFrame(rafId);
    testLoop();
}

document.querySelectorAll('.char-card').forEach(card => {
    card.addEventListener('click', () => startGame(card.dataset.char));
});

// ── Game Over / Retry ────────────────────────────────────────
function showGameOver(score) {
    if (rafId) cancelAnimationFrame(rafId);
    finalScoreEl.textContent = `Score: ${score}`;
    gameOver.classList.remove('hidden');
}

retryBtn.addEventListener('click', () => {
    gameOver.classList.add('hidden');
    startGame(selectedChar);
});

menuBtn.addEventListener('click', () => {
    gameOver.classList.add('hidden');
    hud.classList.add('hidden');
    canvas.classList.add('hidden');
    menu.classList.remove('hidden');
    if (rafId) cancelAnimationFrame(rafId);
});

// ── Initial idle starfield on menu ───────────────────────────
(function idleLoop() {
    const W = canvas.width, H = canvas.height;
    ctx.fillStyle = CANVAS_BG;
    ctx.fillRect(0, 0, W, H);
    drawStars();
    if (!selectedChar) requestAnimationFrame(idleLoop);
})();
