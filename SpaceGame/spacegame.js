/* ================================================================
   spacegame.js  (entry point)
   DOM wiring, canvas setup, mobile controls, menu/game lifecycle.
   Depends on: spacegame-movement.js, spacegame-events.js,
               spacegame-renderer.js  (loaded before this file)
   ================================================================ */
'use strict';

// -- DOM refs -------------------------------------------------------
const wrapper        = document.getElementById('gameWrapper');
const menu           = document.getElementById('menu');
const hud            = document.getElementById('hud');
const gameOver       = document.getElementById('gameOver');
const canvas         = document.getElementById('gameCanvas');
const ctx            = canvas.getContext('2d');
const scoreEl        = document.getElementById('scoreDisplay');
const levelEl        = document.getElementById('levelDisplay');
const livesEl        = document.getElementById('livesDisplay');
const finalScoreEl   = document.getElementById('finalScore');
const mobileControls = document.getElementById('mobileControls');

let game = null;

// -- Resize ---------------------------------------------------------
function resize() {
    canvas.width  = wrapper.clientWidth;
    canvas.height = wrapper.clientHeight;
    if (game) game.onResize();
}
resize();
new ResizeObserver(resize).observe(wrapper);

// -- Image loader ---------------------------------------------------
function loadImage(src) {
    return new Promise(res => {
        const img = new Image();
        img.onload  = () => res(img);
        img.onerror = () => res(null);
        img.src = src;
    });
}

// -- Mobile button wiring -------------------------------------------
function bindMobileBtn(id, key) {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('touchstart',  e => { e.preventDefault(); keys[key] = true; },  {passive:false});
    el.addEventListener('touchend',    e => {
        e.preventDefault();
        keys[key] = false;
        if ((key === 'left' && !keys.right) || (key === 'right' && !keys.left)) keys.running = false;
    }, {passive:false});
    el.addEventListener('touchcancel', () => { keys[key] = false; keys.running = false; });
    el.addEventListener('mousedown',   () => { keys[key] = true; });
    el.addEventListener('mouseup',     () => { keys[key] = false; keys.running = false; });
}
bindMobileBtn('mcLeft',  'left');
bindMobileBtn('mcRight', 'right');
bindMobileBtn('mcUp',    'up');
bindMobileBtn('mcJump',  'jump');

// Climb button fires _justPressed.up for ladder-grab edge detection
document.getElementById('mcUp')?.addEventListener('touchstart', e => {
    e.preventDefault(); _justPressed.up = true;
}, {passive:false});
document.getElementById('mcUp')?.addEventListener('mousedown', () => {
    _justPressed.up = true;
});

// Jump button fires _justPressed.jump for jump edge detection
document.getElementById('mcJump')?.addEventListener('touchstart', e => {
    e.preventDefault(); _justPressed.jump = true;
}, {passive:false});
document.getElementById('mcJump')?.addEventListener('mousedown', () => {
    _justPressed.jump = true;
});

// Double-tap run for left/right mobile buttons
['mcLeft', 'mcRight'].forEach(id => {
    let lastTap = 0;
    document.getElementById(id)?.addEventListener('touchstart', e => {
        const now = Date.now();
        if (now - lastTap < 280) keys.running = true;
        lastTap = now;
    }, {passive:false});
});

// Interact button
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

// -- Game start -----------------------------------------------------
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

// -- Menu buttons ---------------------------------------------------
document.querySelectorAll('.menu-character-btn').forEach(c =>
    c.addEventListener('click', startGame));

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

// -- Idle starfield (shown on menu screen) --------------------------
(function idleLoop() {
    if (game) return;
    ctx.fillStyle = '#000010';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    for (const s of STARS) {
        ctx.fillStyle = 'rgba(255,255,255,' + (0.25 + s.br * 0.55) + ')';
        ctx.beginPath();
        ctx.arc((s.wx / SHIP_W) * canvas.width, s.wy * canvas.height * 0.85, s.r, 0, Math.PI * 2);
        ctx.fill();
    }
    requestAnimationFrame(idleLoop);
})();


