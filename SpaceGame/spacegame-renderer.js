/* ================================================================
   spacegame-renderer.js
   All canvas drawing for Station, Player, and Game.
   Methods are added via prototype so they compose with the classes
   defined in spacegame-movement.js and spacegame-events.js
   Depends on: spacegame-movement.js, spacegame-events.js
   ================================================================ */
'use strict';

// Uniform tile draw size for all background/floor surfaces
const BG_TS = 52;

// -- Canvas helper ------------------------------------------------
function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y,     x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x,     y + h, r);
    ctx.arcTo(x,     y + h, x,     y,     r);
    ctx.arcTo(x,     y,     x + w, y,     r);
    ctx.closePath();
}

// ================================================================
//  Station — draw method
// ================================================================
Station.prototype.draw = function(camX, ceilY, tiles) {
    const W   = canvas.width;
    const H   = canvas.height;
    const fY  = H * FLOOR_RATIO;
    const sx  = this.worldX - camX;
    const sw  = BG_TS;
    const sh  = BG_TS;
    const roomH = fY - ceilY;
    const sTop = fY - roomH * 0.08 - sh - BG_TS;

    // Sprite body
    if (tiles && TILES.redButton) {
        ctx.drawImage(tiles, TILES.redButton.sx, TILES.redButton.sy,
            TILE_W, TILE_H, sx - sw/2, sTop, sw, sh);
    } else {
        const bodyCol = this.broken ? '#3d1212' : (this.working ? '#123d12' : this.def.bg);
        ctx.fillStyle = bodyCol;
        roundRect(sx - sw/2, sTop, sw, sh, 6); ctx.fill();
        ctx.font      = (sw * 0.50) + 'px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(this.def.icon, sx, sTop + sh * 0.58);
    }

    // Border (flashes when attention needed)
    const alert = this.needsAttention && Math.floor(this.flash / 8) % 2 === 0;
    ctx.strokeStyle = alert ? '#ffff44' : this.def.accent;
    ctx.lineWidth   = alert ? 3 : 1.5;
    roundRect(sx - sw/2, sTop, sw, sh, 6); ctx.stroke();

    // Station label below
    ctx.fillStyle = this.def.accent;
    ctx.font      = (W * 0.025) + 'px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(this.def.station.label, sx, fY + H * 0.035);

    // Work progress bar
    if (this.working) {
        const p = 1 - this.workTimer / this.def.station.workFrames;
        ctx.fillStyle = '#111';
        ctx.fillRect(sx - sw/2 + 4, sTop + sh - 10, sw - 8, 6);
        ctx.fillStyle = '#44ff88';
        ctx.fillRect(sx - sw/2 + 4, sTop + sh - 10, (sw - 8) * p, 6);
    }

    // Crop growth bar
    if (this.def.station.res === 'food' && !this.cropReady && !this.working) {
        const maxG = 1200;
        const p    = Math.max(0, Math.min(1, 1 - this.growTimer / maxG));
        ctx.fillStyle = '#1a3d1a';
        ctx.fillRect(sx - sw/2 + 4, sTop + sh - 10, sw - 8, 6);
        ctx.fillStyle = '#4caf50';
        ctx.fillRect(sx - sw/2 + 4, sTop + sh - 10, (sw - 8) * p, 6);
    }
};

// ================================================================
//  Player — draw method
// ================================================================
Player.prototype.draw = function(camX) {
    if (!this.sheet) return;
    let sx, sy;
    if (this.onLadder)          { sx = JUMP_SX; sy = JUMP_SY; }  // arms-up climbing frame
    else if (this.jumping)      { sx = JUMP_SX; sy = JUMP_SY; }
    else if (this.interacting)  { sx = 192;     sy = 96;      }  // thinking frame
    else if (this.moving)       { [sx, sy] = WALK_FRAME_COORDS[this.walkFrame]; }
    else                        { sx = IDLE_SX; sy = IDLE_SY; }

    const dx = this.x - camX - this.pw / 2;
    const dy = this.y - this.ph;
    ctx.save();
    if (this.facing === -1) {
        ctx.transform(-1, 0, 0, 1, dx * 2 + this.pw, 0);
    }
    ctx.drawImage(this.sheet, sx, sy, SRC_FW, SRC_FH, dx, dy, this.pw, this.ph);
    ctx.restore();
};

// ================================================================
//  Game — draw methods (added to prototype)
// ================================================================

Game.prototype.drawSpaceBg = function() {
    const W = this.W, H = this.H;
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0,   '#00001a');
    grad.addColorStop(0.5, '#000510');
    grad.addColorStop(1,   '#00020a');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // Parallax stars
    for (const s of STARS) {
        const px = ((s.wx - this.camX * 0.3) % (SHIP_W * 1.5) + SHIP_W * 1.5) % (SHIP_W * 1.5);
        const sx = px * (W / (SHIP_W * 1.5));
        const sy = s.wy * H * 0.90;
        ctx.fillStyle = 'rgba(255,255,255,' + (0.3 + s.br * 0.7) + ')';
        ctx.beginPath(); ctx.arc(sx, sy, s.r, 0, Math.PI * 2); ctx.fill();
    }

    // Nebula glow
    const nX    = (((-this.camX * 0.1) % W) + W) % W;
    const nebula = ctx.createRadialGradient(nX, H * 0.35, 0, nX, H * 0.35, W * 0.55);
    nebula.addColorStop(0,   'rgba(60,20,120,0.18)');
    nebula.addColorStop(0.5, 'rgba(20,10,60,0.09)');
    nebula.addColorStop(1,   'rgba(0,0,0,0)');
    ctx.fillStyle = nebula;
    ctx.fillRect(0, 0, W, H);
};

Game.prototype.drawHullExterior = function() {
    const W = this.W, H = this.H;
    const ceilY = this.ceilY, fY = this.floorY;
    const hullH = H * 0.07;

    // Top hull band — tiled
    if (this.tiles) {
        ctx.save();
        ctx.beginPath(); ctx.rect(0, ceilY - hullH, W, hullH); ctx.clip();
        for (let tx = 0; tx < W; tx += BG_TS)
            ctx.drawImage(this.tiles, TILES.floor.sx, TILES.floor.sy, TILE_W, TILE_H, tx, ceilY - hullH, BG_TS, BG_TS);
        ctx.restore();
    } else {
        ctx.fillStyle = '#1c2333';
        ctx.fillRect(0, ceilY - hullH, W, hullH);
    }
    ctx.fillStyle = '#2a3548'; ctx.fillRect(0, ceilY - 4, W, 4);

    // Bottom hull band — tiled
    if (this.tiles) {
        ctx.save();
        ctx.beginPath(); ctx.rect(0, fY, W, hullH); ctx.clip();
        for (let tx = 0; tx < W; tx += BG_TS)
            ctx.drawImage(this.tiles, TILES.floor.sx, TILES.floor.sy, TILE_W, TILE_H, tx, fY, BG_TS, BG_TS);
        ctx.restore();
    } else {
        ctx.fillStyle = '#1c2333';
        ctx.fillRect(0, fY, W, hullH);
    }
    ctx.fillStyle = '#2a3548'; ctx.fillRect(0, fY, W, 4);
};

Game.prototype.drawOutside = function(camX) {
    const W = this.W, H = this.H;
    const fY     = this.floorY, cY = this.ceilY;
    const roomH  = fY - cY;
    const ceilH  = roomH * 0.13;
    const floorH = roomH * 0.08;
    const grateTop = fY - floorH;

    const rxLeft  = -OUTSIDE_W - camX;
    const rxRight = -camX;
    if (rxRight < -20 || rxLeft > W + 20) return;

    // Atmosphere fill
    const extGrad = ctx.createLinearGradient(0, cY, 0, fY);
    extGrad.addColorStop(0,   '#04060d');
    extGrad.addColorStop(0.7, '#070a12');
    extGrad.addColorStop(1,   '#0b0e18');
    ctx.fillStyle = extGrad;
    ctx.fillRect(rxLeft, cY, OUTSIDE_W, roomH);

    // Depth haze
    const hazeGrad = ctx.createLinearGradient(rxLeft, 0, rxRight, 0);
    hazeGrad.addColorStop(0,   'rgba(0,0,0,0.55)');
    hazeGrad.addColorStop(0.8, 'rgba(0,0,0,0.05)');
    hazeGrad.addColorStop(1,   'rgba(0,0,0,0)');
    ctx.fillStyle = hazeGrad;
    ctx.fillRect(rxLeft, cY + ceilH, OUTSIDE_W, roomH - ceilH - floorH);

    // Ceiling tiles (sx=0/104, sy=0)
    ctx.save();
    ctx.beginPath(); ctx.rect(rxLeft, cY, OUTSIDE_W, ceilH); ctx.clip();
    if (this.tiles) {
        const tDrawW = ceilH;
        let cx2 = rxLeft, tidx = 0;
        while (cx2 < rxRight + tDrawW) {
            const t = TILE_CEIL_OUT[tidx % TILE_CEIL_OUT.length];
            ctx.drawImage(this.tiles, t.sx, t.sy, TILE_W, TILE_H, cx2, cY, tDrawW, ceilH);
            cx2 += tDrawW; tidx++;
        }
    }
    ctx.fillStyle = '#4d9de044';
    ctx.fillRect(rxLeft, cY, OUTSIDE_W, 3);
    ctx.restore();

    // Ceiling conduit
    ctx.strokeStyle = '#1a2030'; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.moveTo(rxLeft, cY + roomH * 0.10); ctx.lineTo(rxRight, cY + roomH * 0.10); ctx.stroke();
    ctx.strokeStyle = '#4d9de033'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(rxLeft, cY + roomH * 0.10); ctx.lineTo(rxRight, cY + roomH * 0.10); ctx.stroke();

    // EVA floor ledge — tiled
    if (this.tiles) {
        ctx.save();
        ctx.beginPath(); ctx.rect(rxLeft, grateTop, OUTSIDE_W, floorH); ctx.clip();
        for (let tx = rxLeft; tx < rxLeft + OUTSIDE_W; tx += BG_TS)
            ctx.drawImage(this.tiles, TILES.floor.sx, TILES.floor.sy, TILE_W, TILE_H, tx, grateTop, BG_TS, BG_TS);
        ctx.restore();
    } else {
        ctx.fillStyle = '#10151f';
        ctx.fillRect(rxLeft, grateTop, OUTSIDE_W, floorH);
    }
    ctx.fillStyle = '#4d9de033';
    ctx.fillRect(rxLeft, grateTop, OUTSIDE_W, 2);

    // Door frame at world x=0 (EVA / airlock boundary)
    const bx  = rxRight;
    const ebw = 40;
    const EVA_WALL_TILE = { sx: 312, sy: 416 };
    // Solid base
    ctx.fillStyle = '#2a3040';
    ctx.fillRect(bx - ebw, cY, ebw, roomH);
    // Tile texture
    if (this.tiles) {
        ctx.save();
        ctx.beginPath(); ctx.rect(bx - ebw, cY, ebw, roomH); ctx.clip();
        let ty = cY;
        while (ty < cY + roomH) {
            const segH = Math.min(ebw, cY + roomH - ty);
            ctx.drawImage(this.tiles, EVA_WALL_TILE.sx, EVA_WALL_TILE.sy, TILE_W, TILE_H,
                bx - ebw, ty, ebw, segH);
            ty += ebw;
        }
        ctx.restore();
    }
    // EVA door opening — 2 tiles
    const evaDoorTop  = grateTop - roomH * 0.30;
    const evaDoorH    = roomH * 0.38;
    const evaHalf     = evaDoorH / 2;
    if (this.tiles) {
        ctx.drawImage(this.tiles, 520, 520, TILE_W, TILE_H,
            bx - ebw, evaDoorTop,              ebw, evaHalf);
        ctx.drawImage(this.tiles, 520, 624, TILE_W, TILE_H,
            bx - ebw, evaDoorTop + evaHalf,    ebw, evaHalf);
    } else {
        ctx.fillStyle = '#0a0f18';
        ctx.fillRect(bx - ebw, evaDoorTop, ebw, evaDoorH);
    }

    // EVA ZONE label
    const labelX = Math.max(rxLeft + 60, Math.min(rxRight - 60, rxLeft + OUTSIDE_W * 0.4));
    if (labelX > 0 && labelX < W) {
        ctx.font      = 'bold ' + (W * 0.026) + 'px monospace';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#1e3040';
        ctx.fillText('EVA ZONE', labelX, cY - H * 0.018);
    }
};

Game.prototype.drawRoom = function(i) {
    const def   = ROOM_DEFS[i];
    const W     = this.W, H = this.H;
    const rx    = i * ROOM_PX - this.camX;
    const fY    = this.floorY, cY = this.ceilY;
    const roomH = fY - cY;

    // Room background — solid base colour + tile overlay
    ctx.fillStyle = def.bg;
    ctx.fillRect(rx, cY, ROOM_PX, roomH);
    if (this.tiles) {
        ctx.save();
        ctx.beginPath(); ctx.rect(rx, cY, ROOM_PX, roomH); ctx.clip();
        for (let ty = cY; ty < cY + roomH; ty += BG_TS) {
            for (let tx = rx; tx < rx + ROOM_PX; tx += BG_TS)
                ctx.drawImage(this.tiles, TILES.roomBg.sx, TILES.roomBg.sy, TILE_W, TILE_H, tx, ty, BG_TS, BG_TS);
        }
        ctx.restore();
    }

    // Ceiling tiles
    const ceilH = roomH * 0.13;
    ctx.save();
    ctx.rect(rx, cY, ROOM_PX, ceilH); ctx.clip();
    if (this.tiles) {
        const tDrawW = ceilH;
        let cx2 = rx, tileIdx = 0;
        while (cx2 < rx + ROOM_PX) {
            const t = TILE_CEIL[tileIdx % TILE_CEIL.length];
            ctx.drawImage(this.tiles, t.sx, t.sy, TILE_W, TILE_H, cx2, cY, tDrawW, ceilH);
            cx2 += tDrawW; tileIdx++;
        }
    } else {
        const panelW = ROOM_PX / 4;
        for (let p = 0; p < 4; p++) {
            ctx.fillStyle = p % 2 === 0 ? '#1a1f2e' : '#151a28';
            ctx.fillRect(rx + p * panelW + 2, cY, panelW - 4, ceilH);
        }
    }
    ctx.restore();

    // Ceiling conduit pipes
    ctx.strokeStyle = '#2a3040'; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.moveTo(rx, cY + roomH * 0.10); ctx.lineTo(rx + ROOM_PX, cY + roomH * 0.10); ctx.stroke();

    // Main floor — tiled
    const floorH   = roomH * 0.08;
    const grateTop = fY - floorH;
    if (this.tiles) {
        ctx.save();
        ctx.beginPath(); ctx.rect(rx, grateTop, ROOM_PX, floorH); ctx.clip();
        for (let tx = rx; tx < rx + ROOM_PX; tx += BG_TS)
            ctx.drawImage(this.tiles, TILES.floor.sx, TILES.floor.sy, TILE_W, TILE_H, tx, grateTop, BG_TS, BG_TS);
        ctx.restore();
    } else {
        ctx.fillStyle = def.floor;
        ctx.fillRect(rx, grateTop, ROOM_PX, floorH);
    }

    // Mid-floor platform — tiled (split at ladder gap)
    const midFY   = this.midFloorY;
    const midFlH  = roomH * 0.05;
    const ladSX   = rx + ROOM_PX * 0.25;
    const halfGap = LADDER_GAP / 2;
    const midSegs = [
        { x: rx,              w: ladSX - rx - halfGap            },
        { x: ladSX + halfGap, w: rx + ROOM_PX - ladSX - halfGap },
    ];
    for (const seg of midSegs) {
        if (this.tiles) {
            ctx.save();
            ctx.beginPath(); ctx.rect(seg.x, midFY - midFlH, seg.w, midFlH); ctx.clip();
            for (let tx = seg.x; tx < seg.x + seg.w; tx += BG_TS)
                ctx.drawImage(this.tiles, TILES.floor.sx, TILES.floor.sy, TILE_W, TILE_H, tx, midFY - midFlH, BG_TS, BG_TS);
            ctx.restore();
        } else {
            ctx.fillStyle = def.floor;
            ctx.fillRect(seg.x, midFY - midFlH, seg.w, midFlH);
        }
    }

    // Ladder (ceiling to main floor)
    const ladW = Math.round(TILE_W * 0.30);
    if (this.tiles) {
        let ly = cY;
        while (ly < grateTop) {
            const segH = Math.min(ladW, grateTop - ly);
            ctx.drawImage(this.tiles, TILE_LADDER.sx, TILE_LADDER.sy, TILE_W, TILE_H,
                ladSX - ladW / 2, ly, ladW, segH);
            ly += ladW;
        }
    } else {
        ctx.strokeStyle = '#4a5570'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(ladSX - 8, cY); ctx.lineTo(ladSX - 8, grateTop); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(ladSX + 8, cY); ctx.lineTo(ladSX + 8, grateTop); ctx.stroke();
        ctx.lineWidth = 2;
        for (let rung = cY + 12; rung < grateTop; rung += 18) {
            ctx.beginPath(); ctx.moveTo(ladSX - 8, rung); ctx.lineTo(ladSX + 8, rung); ctx.stroke();
        }
    }

    // Room-specific decor
    // this.drawRoomDecor(i, rx, cY, fY, roomH, def);

    // Bulkhead dividers (at left edge of every room except room 0)
    if (i > 0) {
        const bx   = rx - 1;
        const bw   = 40;  // visual width (physics half=12 is narrower, that's fine)
        const WALL_TILE = { sx: 312, sy: 416 };
        // Solid base so wall is always visible even if tile has transparency
        ctx.fillStyle = '#2a3040';
        ctx.fillRect(bx - bw / 2, cY, bw, roomH);
        // Tile texture
        if (this.tiles) {
            ctx.save();
            ctx.beginPath(); ctx.rect(bx - bw / 2, cY, bw, roomH); ctx.clip();
            let ty = cY;
            while (ty < cY + roomH) {
                const segH = Math.min(bw, cY + roomH - ty);
                ctx.drawImage(this.tiles, WALL_TILE.sx, WALL_TILE.sy, TILE_W, TILE_H,
                    bx - bw / 2, ty, bw, segH);
                ty += bw;
            }
            ctx.restore();
        }

        // Door opening — 2 tiles
        const doorTop   = grateTop - roomH * 0.30;
        const doorH     = roomH * 0.38;
        const half      = doorH / 2;
        if (this.tiles) {
            ctx.drawImage(this.tiles, 520, 520, TILE_W, TILE_H,
                bx - bw / 2, doorTop,          bw, half);
            ctx.drawImage(this.tiles, 520, 624, TILE_W, TILE_H,
                bx - bw / 2, doorTop + half,   bw, half);
        } else {
            ctx.fillStyle = '#111520';
            ctx.fillRect(bx - bw / 2, doorTop, bw, doorH);
        }
    }

    // Porthole windows (outer rooms only)
    /*
    if (i === 0 || i === SHIP_ROOMS - 1) {
        const wx = i === 0 ? rx + ROOM_PX * 0.15 : rx + ROOM_PX * 0.85;
        const wy = cY + roomH * 0.30;
        const wr = roomH * 0.10;
        ctx.fillStyle = '#1e2738';
        ctx.beginPath(); ctx.arc(wx, wy, wr + 6, 0, Math.PI*2); ctx.fill();
        ctx.strokeStyle = '#3a4a60'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(wx, wy, wr + 6, 0, Math.PI*2); ctx.stroke();
        const pGrad = ctx.createRadialGradient(wx - wr*0.3, wy - wr*0.3, 1, wx, wy, wr);
        pGrad.addColorStop(0, '#1a3a6a'); pGrad.addColorStop(0.6, '#050e22'); pGrad.addColorStop(1, '#020810');
        ctx.fillStyle = pGrad;
        ctx.beginPath(); ctx.arc(wx, wy, wr, 0, Math.PI*2); ctx.fill();
        ctx.save(); ctx.beginPath(); ctx.arc(wx, wy, wr, 0, Math.PI*2); ctx.clip();
        for (let si = 0; si < 8; si++) {
            const sa = (i + si * 137.5) * 0.7;
            const sr = ((i * 37 + si * 61) % (wr * 2)) * 0.5 + 2;
            ctx.fillStyle = 'rgba(255,255,255,' + (0.4 + (si % 3) * 0.2) + ')';
            ctx.beginPath(); ctx.arc(Math.cos(sa)*sr + wx, Math.sin(sa)*sr + wy, 0.8, 0, Math.PI*2); ctx.fill();
        }
        ctx.restore();
        ctx.fillStyle = 'rgba(180,220,255,0.12)';
        ctx.beginPath(); ctx.ellipse(wx - wr*0.25, wy - wr*0.25, wr*0.35, wr*0.18, -0.5, 0, Math.PI*2); ctx.fill();
    }
    */

    // Station widget
    this.stations[i].draw(this.camX, this.ceilY, this.tiles);

    // Room name plate
    const plateW = ROOM_PX * 0.44;
    const plateX = rx + ROOM_PX / 2 - plateW / 2;
    const plateY = cY + roomH * 0.13;
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    roundRect(plateX, plateY, plateW, roomH * 0.11, 4); ctx.fill();
    ctx.strokeStyle = def.accent + '99'; ctx.lineWidth = 1;
    roundRect(plateX, plateY, plateW, roomH * 0.11, 4); ctx.stroke();
    ctx.font      = 'bold ' + (W * 0.028) + 'px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = def.accent;
    ctx.fillText(def.label, rx + ROOM_PX / 2, plateY + roomH * 0.085);

    // Interaction hint
    if (this.nearStation === this.stations[i]) {
        const canAct = this.nearStation.needsAttention || this.nearStation.def.station.res === 'credits';
        ctx.font      = 'bold ' + (W * 0.028) + 'px monospace';
        ctx.fillStyle = '#ffff88';
        ctx.fillText(canAct ? '[E] ' + def.station.action : '[E] Check',
            rx + ROOM_PX / 2, grateTop - roomH * 0.06);
    }
};

Game.prototype.drawCozyStation = function(camX) {
    const W    = canvas.width;
    const H    = canvas.height;
    const fY   = H * FLOOR_RATIO;
    const cY   = this.ceilY;
    const sx   = COZY_BTN_WORLD_X - camX;
    const sw   = BG_TS;
    const sh   = BG_TS;
    const sTop = cY + (fY - cY) * 0.28;

    // Sprite body
    if (this.tiles && TILES.greenButton) {
        ctx.drawImage(this.tiles, TILES.greenButton.sx, TILES.greenButton.sy,
            TILE_W, TILE_H, sx - sw/2, sTop, sw, sh);
    } else {
        ctx.fillStyle = this.cozyMode ? '#0a2a30' : '#0d1020';
        roundRect(sx - sw/2, sTop, sw, sh, 6); ctx.fill();
        ctx.font      = (sw * 0.50) + 'px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('☕', sx, sTop + sh * 0.58);
    }

    // Flash border overlay
    const flash = this.cozyMode && Math.floor(this.cozyFlash / 8) % 2 === 0;
    ctx.strokeStyle = flash ? '#88ccff' : (this.cozyMode ? '#55aacc' : '#334466');
    ctx.lineWidth   = this.cozyMode ? 2.5 : 1.5;
    roundRect(sx - sw/2, sTop, sw, sh, 6); ctx.stroke();

    ctx.fillStyle = this.cozyMode ? '#88ccff' : '#4d7a9e';
    ctx.font      = (W * 0.025) + 'px sans-serif';
    ctx.fillText('Cozy Mode', sx, fY + H * 0.035);

    if (this.nearCozyBtn) {
        ctx.font      = 'bold ' + (W * 0.028) + 'px monospace';
        ctx.fillStyle = '#ffff88';
        ctx.fillText(this.cozyMode ? '[E] Exit Cozy' : '[E] Cozy Mode', sx, sTop - H * 0.03);
    }
};

Game.prototype.drawRoomDecor = function(i, rx, cY, fY, roomH, def) {
    /*
    const grateTop = fY - roomH * 0.10;

    if (def.id === 'airlock') {
        const hx = rx + ROOM_PX * 0.08, hy = cY + roomH * 0.22;
        const hw = ROOM_PX * 0.10,      hh = roomH * 0.55;
        const hGrad = ctx.createLinearGradient(hx, 0, hx + hw, 0);
        hGrad.addColorStop(0, '#0d1a2a'); hGrad.addColorStop(0.5, '#1a3050'); hGrad.addColorStop(1, '#0d1a2a');
        ctx.fillStyle = hGrad;
        roundRect(hx, hy, hw, hh, 8); ctx.fill();
        ctx.strokeStyle = '#4d9de0aa'; ctx.lineWidth = 2;
        roundRect(hx, hy, hw, hh, 8); ctx.stroke();
        ctx.fillStyle = '#4d9de0';
        ctx.fillRect(hx + hw * 0.35, hy + hh * 0.42, hw * 0.3, hh * 0.06);
        ctx.beginPath(); ctx.arc(hx + hw * 0.5, hy + hh * 0.45, hw * 0.07, 0, Math.PI*2); ctx.fill();
        if (this.player && this.player.x < ROOM_PX * 0.25) {
            ctx.font      = 'bold ' + (this.W * 0.028) + 'px monospace';
            ctx.textAlign = 'center';
            ctx.fillStyle = '#4d9de0cc';
            ctx.fillText('\u25C4 EVA EXIT', hx + hw / 2, hy - roomH * 0.06);
        }

    } else if (def.id === 'farm') {
        for (let sh = 0; sh < 3; sh++) {
            const sy = cY + roomH * (0.24 + sh * 0.17);
            ctx.fillStyle = '#1a2a12';
            ctx.fillRect(rx + ROOM_PX * 0.05, sy, ROOM_PX * 0.38, 4);
            ctx.fillRect(rx + ROOM_PX * 0.57, sy, ROOM_PX * 0.38, 4);
            for (let p = 0; p < 5; p++) {
                const px2 = rx + ROOM_PX * 0.07 + p * ROOM_PX * 0.068;
                const h2  = 6 + (p * 7 + sh * 3) % 10;
                const green = sh === 0 ? '#2d7a1f' : sh === 1 ? '#3a9a25' : '#4caf50';
                ctx.fillStyle = green;
                ctx.beginPath(); ctx.ellipse(px2, sy - h2/2, 5, h2/2, 0, 0, Math.PI*2); ctx.fill();
            }
            for (let p = 0; p < 5; p++) {
                const px2 = rx + ROOM_PX * 0.59 + p * ROOM_PX * 0.068;
                const h2  = 6 + (p * 5 + sh * 4) % 10;
                ctx.fillStyle = '#4caf50';
                ctx.beginPath(); ctx.ellipse(px2, sy - h2/2, 5, h2/2, 0, 0, Math.PI*2); ctx.fill();
            }
            ctx.fillStyle = 'rgba(100,255,100,0.15)';
            ctx.fillRect(rx + ROOM_PX * 0.05, sy - roomH * 0.015, ROOM_PX * 0.38, 3);
        }

    } else if (def.id === 'command') {
        const sx2 = rx + ROOM_PX * 0.05, sy2 = cY + roomH * 0.18;
        const sw2 = ROOM_PX * 0.42,      seh = roomH * 0.42;
        ctx.fillStyle = '#050a18';
        roundRect(sx2, sy2, sw2, seh, 6); ctx.fill();
        ctx.strokeStyle = '#9b59b6aa'; ctx.lineWidth = 2;
        roundRect(sx2, sy2, sw2, seh, 6); ctx.stroke();
        for (let si = 0; si < 15; si++) {
            const spx = sx2 + 8 + (si * 73) % (sw2 - 16);
            const spy = sy2 + 6 + (si * 47) % (seh - 12);
            ctx.fillStyle = 'rgba(255,255,255,' + (0.3 + (si%3)*0.2) + ')';
            ctx.beginPath(); ctx.arc(spx, spy, 1, 0, Math.PI*2); ctx.fill();
        }
        const scanY = sy2 + ((this.tick * 0.4) % seh);
        ctx.fillStyle = 'rgba(155,89,182,0.15)';
        ctx.fillRect(sx2, scanY, sw2, 3);
        ctx.fillStyle = '#1a0f2e';
        roundRect(sx2, sy2 + seh + 4, sw2, roomH * 0.09, 3); ctx.fill();
        ctx.strokeStyle = '#7d3c98'; ctx.lineWidth = 1;
        roundRect(sx2, sy2 + seh + 4, sw2, roomH * 0.09, 3); ctx.stroke();
        for (let bi = 0; bi < 6; bi++) {
            const blink = Math.floor((this.tick * 0.05 + bi * 0.4)) % 2;
            ctx.fillStyle = blink ? ['#e74c3c','#2ecc71','#f39c12','#3498db','#9b59b6','#1abc9c'][bi] : '#111';
            ctx.beginPath(); ctx.arc(sx2 + 12 + bi * 14, sy2 + seh + 4 + roomH*0.045, 4, 0, Math.PI*2); ctx.fill();
        }

    } else if (def.id === 'engine') {
        const cx2 = rx + ROOM_PX * 0.25, cy2 = cY + roomH * 0.28;
        const rw  = ROOM_PX * 0.12,      rh  = roomH * 0.50;
        const broken = this.stations[i].broken;
        const pulse  = 0.6 + 0.4 * Math.sin(this.tick * 0.08);
        const coreCol = broken ? ('rgba(180,40,40,' + pulse + ')') : ('rgba(255,140,0,' + pulse + ')');
        const cGrad = ctx.createRadialGradient(cx2, cy2 + rh/2, 0, cx2, cy2 + rh/2, rw * 2);
        cGrad.addColorStop(0, broken ? 'rgba(200,50,50,0.4)' : 'rgba(255,160,0,0.4)');
        cGrad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = cGrad; ctx.fillRect(cx2 - rw*2, cy2, rw*4, rh);
        ctx.fillStyle = broken ? '#2a0a0a' : '#1a1000';
        ctx.fillRect(cx2 - rw/2, cy2, rw, rh);
        ctx.strokeStyle = coreCol; ctx.lineWidth = 2;
        ctx.strokeRect(cx2 - rw/2, cy2, rw, rh);
        ctx.strokeStyle = '#2a2a2a'; ctx.lineWidth = 5;
        ctx.beginPath(); ctx.moveTo(cx2 - rw/2 - 5, cy2 + rh*0.2); ctx.lineTo(rx, cy2 + rh*0.2); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx2 - rw/2 - 5, cy2 + rh*0.6); ctx.lineTo(rx, cy2 + rh*0.6); ctx.stroke();
        ctx.strokeStyle = broken ? '#601010' : '#604010'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(cx2 - rw/2 - 5, cy2 + rh*0.2); ctx.lineTo(rx, cy2 + rh*0.2); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx2 - rw/2 - 5, cy2 + rh*0.6); ctx.lineTo(rx, cy2 + rh*0.6); ctx.stroke();

    } else if (def.id === 'lifesup') {
        const tx = rx + ROOM_PX * 0.08, ty = cY + roomH * 0.22;
        const tw = ROOM_PX * 0.09,      th = roomH * 0.50;
        const broken = this.stations[i].broken;
        ctx.fillStyle = broken ? '#1a0a0a' : '#0a1a1a';
        roundRect(tx, ty, tw, th, tw/2); ctx.fill();
        ctx.strokeStyle = broken ? '#e74c3caa' : '#1abc9caa'; ctx.lineWidth = 2;
        roundRect(tx, ty, tw, th, tw/2); ctx.stroke();
        const gp    = this.resources.o2 / 100;
        ctx.fillStyle = broken ? '#e74c3c44' : '#1abc9c44';
        const fillH = th * 0.8 * gp;
        ctx.fillRect(tx + 4, ty + th * 0.9 - fillH, tw - 8, fillH);
        ctx.strokeStyle = '#1a2a2a'; ctx.lineWidth = 8;
        ctx.beginPath(); ctx.moveTo(rx + ROOM_PX * 0.3, cY + roomH * 0.10); ctx.lineTo(rx + ROOM_PX * 0.3, cY + roomH * 0.20); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(rx + ROOM_PX * 0.6, cY + roomH * 0.10); ctx.lineTo(rx + ROOM_PX * 0.6, cY + roomH * 0.20); ctx.stroke();
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
    */
};

Game.prototype.drawResourceBars = function() {
    const W = this.W, H = this.H;
    const panY  = this.floorY + (H - this.floorY) * 0.08;
    const panH  = (H - this.floorY) * 0.85;
    ctx.fillStyle = '#080c14';
    ctx.fillRect(0, panY, W, panH);
    ctx.strokeStyle = '#1e2a40'; ctx.lineWidth = 1;
    ctx.strokeRect(0, panY, W, panH);

    const barH = panH * 0.30;
    const barW = W * 0.175;
    const bY   = panY + panH * 0.18;
    const bars  = [
        { key:'o2',    label:'O2',   col:'#1abc9c', x: W*0.015 },
        { key:'power', label:'PWR',  col:'#f39c12', x: W*0.235 },
        { key:'food',  label:'FOOD', col:'#2ecc71', x: W*0.455 },
        { key:'hull',  label:'HULL', col:'#e74c3c', x: W*0.675 },
    ];
    for (const b of bars) {
        const val  = Math.max(0, this.resources[b.key] / 100);
        const low  = val < 0.25;
        const fill = low ? '#e74c3c' : b.col;
        const glow = low && Math.floor(this.tick / 20) % 2 === 0;
        ctx.fillStyle = '#0c1220';
        roundRect(b.x, bY - 2, barW, barH + 18, 4); ctx.fill();
        ctx.strokeStyle = glow ? '#e74c3c' : b.col + '66';
        ctx.lineWidth   = glow ? 2 : 1;
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
        ctx.font      = 'bold ' + (W * 0.024) + 'px monospace';
        ctx.textAlign = 'left';
        ctx.fillText(b.label, b.x + 4, bY + barH + 14);
        ctx.textAlign = 'right';
        ctx.fillStyle = fill;
        ctx.fillText(Math.floor(val * 100) + '%', b.x + barW - 2, bY + barH + 14);
    }
    ctx.fillStyle = '#f1c40f';
    ctx.font      = 'bold ' + (W * 0.030) + 'px monospace';
    ctx.textAlign = 'right';
    ctx.fillText('Credits: ' + Math.floor(this.resources.credits), W - W * 0.01, bY + barH * 0.55);
    ctx.fillStyle = '#6688aa';
    ctx.font      = (W * 0.024) + 'px monospace';
    ctx.textAlign = 'right';
    ctx.fillText('DAY ' + this.day, W - W * 0.01, bY + barH + 14);
};

Game.prototype.drawAlertBanner = function() {
    if (this.alertTimer <= 0) return;
    const W     = this.W, H = this.H;
    const alpha = Math.min(1, this.alertTimer / 40);
    const hex   = Math.floor(alpha * 255).toString(16).padStart(2, '0');
    ctx.font      = 'bold ' + (W * 0.034) + 'px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = (this.alertColor || '#ffff88') + hex;
    ctx.fillText(this.alertMsg, W / 2, this.ceilY - H * 0.013);
};

Game.prototype.drawAlienWarning = function() {
    if (!this.alienAttack) return;
    if (Math.floor(this.tick / 20) % 2 === 0) {
        ctx.fillStyle = 'rgba(231,76,60,0.13)';
        ctx.fillRect(0, this.ceilY, this.W, this.floorY - this.ceilY);
    }
    ctx.font      = 'bold ' + (this.W * 0.052) + 'px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(255,80,80,' + (0.6 + 0.4 * Math.sin(this.tick * 0.12)) + ')';
    ctx.fillText('ALIEN ATTACK!', this.W / 2, this.ceilY + (this.floorY - this.ceilY) * 0.22);
};

Game.prototype.drawMobileButtons = function() {
    const W = this.W, H = this.H;
    const sz  = W * 0.12;
    const gap = 5;
    const by  = H * 0.913;
    const pad = W * 0.015;
    this.btnLeft  = { x: pad,                   y: by, w: sz, h: sz };
    this.btnRight = { x: pad + sz + gap,         y: by, w: sz, h: sz };
    this.btnUp    = { x: W - pad - sz,           y: by, w: sz, h: sz };
    this.btnAct   = { x: W - pad - sz*2 - gap,   y: by, w: sz, h: sz };
    const btn = (b, label, active) => {
        ctx.fillStyle   = active ? 'rgba(60,120,200,0.55)' : 'rgba(20,30,50,0.65)';
        ctx.strokeStyle = active ? '#4d9de0' : 'rgba(80,120,180,0.45)';
        ctx.lineWidth   = 1.5;
        roundRect(b.x, b.y, b.w, b.h, 8); ctx.fill(); ctx.stroke();
        ctx.fillStyle = active ? '#ffffff' : '#8899bb';
        ctx.font      = 'bold ' + (sz * 0.40) + 'px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(label, b.x + b.w / 2, b.y + b.h / 2 + sz * 0.14);
    };
    btn(this.btnLeft,  '<', keys.left);
    btn(this.btnRight, '>', keys.right);
    btn(this.btnUp,    '^', !this.player.onGround);
    btn(this.btnAct,   'E', this.nearStation !== null || this.nearCozyBtn);
};

Game.prototype.draw = function() {
    const W = this.W, H = this.H;
    this.drawSpaceBg();
    this.drawHullExterior();
    this.drawOutside(this.camX);
    for (let i = 0; i < SHIP_ROOMS; i++) {
        const rx = i * ROOM_PX - this.camX;
        if (rx + ROOM_PX < -20 || rx > W + 20) continue;
        this.drawRoom(i);
    }
    this.stations.forEach(s => s.draw(this.camX, this.ceilY, this.tiles));
    this.drawCozyStation(this.camX);
    this.player.draw(this.camX);

    // Cozy mode overlay
    if (this.cozyMode) {
        ctx.fillStyle = 'rgba(10,30,60,0.18)';
        ctx.fillRect(0, 0, W, H);
        ctx.font      = (W * 0.028) + 'px monospace';
        ctx.textAlign = 'center';
        ctx.fillStyle = 'rgba(136,204,255,0.55)';
        ctx.fillText('\u2615 COZY MODE', W / 2, this.ceilY + H * 0.048);
    }

    ctx.font      = 'bold ' + (W * 0.026) + 'px monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#3a5070';
    ctx.fillText('I.S.S. MEISER  |  DECK A', W / 2, this.ceilY - H * 0.018);

    this.drawAlienWarning();
    this.drawResourceBars();
    this.drawAlertBanner();
    this.drawMobileButtons();
};
