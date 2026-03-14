/* ================================================================
   tilesheet.js
   Named tile coordinate map for platformPack_tilesheet.png
   Sheet size: 1472 x 720px  |  Tile size: 104 x 104px
   Grid: 14 columns (col0–col13) x 6 rows (row0–row5)
         + partial row6 at sy=624 (96px tall)

   Usage:
     ctx.drawImage(tiles, TILES.floor.sx, TILES.floor.sy, 104, 104, dx, dy, dw, dh);
   ================================================================ */

const TILES = {

    // ── Row 0 (sy = 0) ──────────────────────────────────────────
    ceilOutLeft:        { sx:    0, sy:   0 },  // col0  — used for EVA zone ceiling (left)
    ceilOutRight:       { sx:  104, sy:   0 },  // col1  — used for EVA zone ceiling (right)
    col2_row0:          { sx:  208, sy:   0 },  // col2
    col3_row0:          { sx:  312, sy:   0 },  // col3
    col4_row0:          { sx:  416, sy:   0 },  // col4
    col5_row0:          { sx:  520, sy:   0 },  // col5
    col6_row0:          { sx:  624, sy:   0 },  // col6
    col7_row0:          { sx:  728, sy:   0 },  // col7
    col8_row0:          { sx:  832, sy:   0 },  // col8
    col9_row0:          { sx:  936, sy:   0 },  // col9
    col10_row0:         { sx: 1040, sy:   0 },  // col10
    col11_row0:         { sx: 1144, sy:   0 },  // col11
    col12_row0:         { sx: 1248, sy:   0 },  // col12
    col13_row0:         { sx: 1352, sy:   0 },  // col13

    // ── Row 1 (sy = 104) ────────────────────────────────────────
    col0_row1:          { sx:    0, sy: 104 },  // col0
    col1_row1:          { sx:  104, sy: 104 },  // col1
    col2_row1:          { sx:  208, sy: 104 },  // col2
    col3_row1:          { sx:  312, sy: 104 },  // col3
    col4_row1:          { sx:  416, sy: 104 },  // col4
    col5_row1:          { sx:  520, sy: 104 },  // col5
    col6_row1:          { sx:  624, sy: 104 },  // col6
    col7_row1:          { sx:  728, sy: 104 },  // col7
    col8_row1:          { sx:  832, sy: 104 },  // col8
    col9_row1:          { sx:  936, sy: 104 },  // col9
    col10_row1:         { sx: 1040, sy: 104 },  // col10
    col11_row1:         { sx: 1144, sy: 104 },  // col11
    col12_row1:         { sx: 1248, sy: 104 },  // col12
    col13_row1:         { sx: 1352, sy: 104 },  // col13

    // ── Row 2 (sy = 208) ────────────────────────────────────────
    ceilLeft:           { sx:    0, sy: 208 },  // col0  — ceiling tile (left variant)
    ceilMid:            { sx:  104, sy: 208 },  // col1  — ceiling tile (mid variant)
    ceilRight:          { sx:  208, sy: 208 },  // col2  — ceiling tile (right variant)
    col3_row2:          { sx:  312, sy: 208 },  // col3
    col4_row2:          { sx:  416, sy: 208 },  // col4
    col5_row2:          { sx:  520, sy: 208 },  // col5
    col6_row2:          { sx:  624, sy: 208 },  // col6
    col7_row2:          { sx:  728, sy: 208 },  // col7
    col8_row2:          { sx:  832, sy: 208 },  // col8
    col9_row2:          { sx:  936, sy: 208 },  // col9
    col10_row2:         { sx: 1040, sy: 208 },  // col10
    col11_row2:         { sx: 1144, sy: 208 },  // col11
    col12_row2:         { sx: 1248, sy: 208 },  // col12
    col13_row2:         { sx: 1352, sy: 208 },  // col13

    // ── Row 3 (sy = 312) ────────────────────────────────────────
    col0_row3:          { sx:    0, sy: 312 },  // col0
    col1_row3:          { sx:  104, sy: 312 },  // col1
    col2_row3:          { sx:  208, sy: 312 },  // col2
    floor:              { sx:  312, sy: 312 },  // col3  — main floor tile
    col4_row3:          { sx:  416, sy: 312 },  // col4
    col5_row3:          { sx:  520, sy: 312 },  // col5
    col6_row3:          { sx:  624, sy: 312 },  // col6
    col7_row3:          { sx:  728, sy: 312 },  // col7
    col8_row3:          { sx:  832, sy: 312 },  // col8
    col9_row3:          { sx:  936, sy: 312 },  // col9
    col10_row3:         { sx: 1040, sy: 312 },  // col10
    col11_row3:         { sx: 1144, sy: 312 },  // col11
    col12_row3:         { sx: 1248, sy: 312 },  // col12
    col13_row3:         { sx: 1352, sy: 312 },  // col13

    // ── Row 4 (sy = 416) ────────────────────────────────────────
    col0_row4:          { sx:    0, sy: 416 },  // col0
    ladder:             { sx:  104, sy: 416 },  // col1  — ladder tile
    col2_row4:          { sx:  208, sy: 416 },  // col2
    wall:               { sx:  312, sy: 416 },  // col3  — wall / bulkhead tile
    col4_row4:          { sx:  416, sy: 416 },  // col4
    greyVent:           { sx:  520, sy: 416 },  // col5
    blackKey:           { sx:  624, sy: 416 },  // col6
    blueKey:            { sx:  728, sy: 416 },  // col7
    yellowKey:          { sx:  832, sy: 416 },  // col8
    greenKey:           { sx:  936, sy: 416 },  // col9
    orangeKey:          { sx: 1040, sy: 416 },  // col10
    fullHeart:          { sx: 1144, sy: 416 },  // col11
    col12_row4:         { sx: 1248, sy: 416 },  // col12
    col13_row4:         { sx: 1352, sy: 416 },  // col13

    // ── Row 5 (sy = 520) ────────────────────────────────────────
    col0_row5:          { sx:    0, sy: 520 },  // col0
    col1_row5:          { sx:  104, sy: 520 },  // col1
    col2_row5:          { sx:  208, sy: 520 },  // col2
    col3_row5:          { sx:  312, sy: 520 },  // col3
    col4_row5:          { sx:  416, sy: 520 },  // col4
    doorTop:            { sx:  520, sy: 520 },  // col5  — door top sprite
    col6_row5:          { sx:  624, sy: 520 },  // col6
    col7_row5:          { sx:  728, sy: 520 },  // col7
    col8_row5:          { sx:  832, sy: 520 },  // col8
    col9_row5:          { sx:  936, sy: 520 },  // col9
    col10_row5:         { sx: 1040, sy: 520 },  // col10
    col11_row5:         { sx: 1144, sy: 520 },  // col11
    col12_row5:         { sx: 1248, sy: 520 },  // col12
    col13_row5:         { sx: 1352, sy: 520 },  // col13

    // ── Row 6 — partial (sy = 624, only 96px tall) ──────────────
    doorBottom:         { sx:  520, sy: 624 },  // col5  — door bottom sprite
    // other col6_row6 tiles exist but are cropped; add as needed

};
