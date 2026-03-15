/* ================================================================
   spacegame-events.js
   Game class: state management, resource tracking, event logic.
   All draw methods are added via prototype in spacegame-renderer.js
   Depends on: spacegame-movement.js (constants, Station, Player)
   ================================================================ */
'use strict';

class Game {
    constructor(sheet, tiles) {
        this.sheet        = sheet;
        this.tiles        = tiles;
        this.stations     = ROOM_DEFS.map((_, i) => new Station(i));
        this.player       = new Player(sheet);
        this.resources    = { o2:80, power:90, food:65, hull:100 };
        this.score        = 0;
        this.day          = 1;
        this.tick         = 0;
        this.dayLen       = 3600;
        this.alertMsg     = '';
        this.alertColor   = '#ffff88';
        this.alertTimer   = 0;
        this.alienAttack  = false;
        this.alienTimer   = 0;
        this.nearStation  = null;
        this.nearCozyBtn  = false;
        this.cozyMode     = false;
        this.cozyFlash    = 0;
        this.camX         = 0;
        this.raf          = null;
        this.onResize();
    }

    // -- Layout recalculation (called on resize + each update frame) --
    onResize() {
        this.W       = canvas.width;
        this.H       = canvas.height;
        this.ceilY   = this.H * 0.12;
        const mobile = this.W < 480 || (this.H / this.W) > 1.4;
        this.floorY  = this.H * (mobile ? 0.68 : 0.76);
        this.midFloorY = this.ceilY + (this.floorY - this.ceilY) * 0.50;
    }

    // -- Alert banner -----------------------------------------------
    addAlert(msg, color = '#ffff88') {
        this.alertMsg   = msg;
        this.alertColor = color;
        this.alertTimer = 210;
    }

    // -- Random events ----------------------------------------------
    triggerBreakdown() {
        const breakable = [3, 4]; // engine, life-support
        const i = breakable[Math.floor(Math.random() * 2)];
        if (!this.stations[i].broken && !this.stations[i].working) {
            this.stations[i].broken = true;
            this.addAlert('\u26A0\uFE0F ' + ROOM_DEFS[i].label + ' needs repair!', '#e74c3c');
        }
    }

    startAlienAttack() {
        this.alienAttack = true;
        this.alienTimer  = 700;
        this.addAlert('\uD83D\uDC7E Alien attack! Man the Airlock!', '#e74c3c');
    }

    // -- Main update loop -------------------------------------------
    update() {
        // Recalculate layout each frame (handles window resize mid-game)
        this.W       = canvas.width;
        this.H       = canvas.height;
        this.ceilY   = this.H * 0.12;
        const mobile = this.W < 480 || (this.H / this.W) > 1.4;
        this.floorY  = this.H * (mobile ? 0.68 : 0.76);
        this.midFloorY = this.ceilY + (this.floorY - this.ceilY) * 0.50;
        this.tick++;

        // -- Day cycle --------------------------------------------
        if (this.tick % this.dayLen === 0) {
            this.day++;
            this.addAlert('\uD83C\uDF05 Day ' + this.day, '#f1c40f');
        }

        // -- Random events (paused in cozy mode) ------------------
        if (!this.cozyMode) {
            if (this.tick % 1100 === 550) this.triggerBreakdown();
            if (this.tick % 2200 === 0)   this.startAlienAttack();
        }

        // -- Resource depletion (paused in cozy mode) -------------
        if (!this.cozyMode) {
            this.resources.o2    -= BASE_DEPLETE.o2;
            this.resources.power -= BASE_DEPLETE.power;
            this.resources.food  -= BASE_DEPLETE.food;
            if (this.stations[3].broken) this.resources.power -= EXTRA_BROKEN;
            if (this.stations[4].broken) this.resources.o2    -= EXTRA_BROKEN;
        }

        // -- Alien attack tick ------------------------------------
        if (this.alienAttack) {
            this.alienTimer--;
            this.resources.hull -= 0.07;
            if (this.stations[0].working) { this.resources.hull += 0.04; this.alienTimer -= 1; }
            if (this.alienTimer <= 0) {
                this.alienAttack = false;
                this.resources.hull = 100;
                this.addAlert('\u2705 Aliens repelled! Hull restored!', '#2ecc71');
            }
        }

        // -- Periodic credit earn (paused in cozy mode) -----------
        if (!this.cozyMode && this.tick % 360 === 0) {
            const healthy = ['o2','power','food','hull'].filter(k => this.resources[k] > 55).length;
            this.score += healthy * 8;
        }

        // -- Clamp resources --------------------------------------
        for (const k of ['o2','power','food','hull'])
            this.resources[k] = Math.max(0, Math.min(100, this.resources[k]));

        // -- Station updates --------------------------------------
        this.stations.forEach(s => s.update());

        // -- Player update ----------------------------------------
        this.player.update(this.floorY, this.midFloorY, this.ceilY, LADDER_WXLIST);
        _justPressed.up   = false;
        _justPressed.jump = false;
        this.player.y   = Math.min(this.player.y, this.floorY); // safety clamp

        // -- Camera smooth follow ---------------------------------
        const targetCamX = Math.max(-OUTSIDE_W, Math.min(SHIP_W - this.W, this.player.x - this.W / 2));
        if (!this.camX) this.camX = targetCamX;
        this.camX += (targetCamX - this.camX) * CAM_EASE;

        // -- Nearest station proximity ----------------------------
        this.nearStation = null;
        for (const s of this.stations) {
            if (Math.abs(s.worldX - this.player.x) < ROOM_PX * 0.20) { this.nearStation = s; break; }
        }

        // -- Cozy button proximity --------------------------------
        this.nearCozyBtn = Math.abs(this.player.x - COZY_BTN_WORLD_X) < ROOM_PX * 0.20;
        this.cozyFlash   = (this.cozyFlash + 1) % 60;

        // -- Interaction (edge-triggered) -------------------------
        if (_justPressed.interact) {
            if (this.nearCozyBtn) {
                this.cozyMode = !this.cozyMode;
                this.addAlert(
                    this.cozyMode ? '\u2615 Cozy mode ON \u2014 relax!' : '\u26A1 Back to work!',
                    this.cozyMode ? '#88ccff' : '#ffcc44'
                );
                this.player.interactTick = 60;
                this.player.interacting  = true;
            } else if (this.nearStation) {
                const msg = this.nearStation.tryInteract(this.resources);
                if (msg) {
                    this.addAlert(msg, '#88ffcc');
                    this.player.interactTick = 80;
                    this.player.interacting  = true;
                }
            }
        }
        _justPressed.interact = false;

        // -- Alert countdown --------------------------------------
        if (this.alertTimer > 0) this.alertTimer--;

        // -- HUD pills --------------------------------------------
        scoreEl.textContent = 'Score: ' + this.score;
        levelEl.textContent = 'Day:   ' + this.day;
        livesEl.textContent = 'O\u2082:    ' + Math.floor(this.resources.o2) + '%';

        // -- Game over check --------------------------------------
        if (this.resources.o2 <= 0 || this.resources.hull <= 0) {
            this.stop();
            const reason = this.resources.o2 <= 0 ? 'Oxygen depleted!' : 'Hull destroyed!';
            lossReasonEl.textContent = reason;
            finalScoreEl.textContent = 'Day ' + this.day + '  |  Score: ' + this.score;
            gameOver.classList.remove('hidden');
        }
    }

    // -- Game loop control ----------------------------------------
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
