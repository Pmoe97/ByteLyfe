/* =====================================================================
 * 1007-ui-art.js — drawing people and icons as SVG strings.
 *
 *   avatarSVG(look, { age, stage, mood, frame, crop, size, bg, dead, label })
 *   personAvatar(p, size, opts)    portrait of a person as they look today
 *   figureSVG(look, body, { age, size, label })   standing figure, adults only
 *   personFigure(p, size)          same, for a person ( under 18)
 *   icon(name, size, cls)          one of the ICLIB icons
 *
 * AVLIB and ICLIB are the part libraries from the design canvas ("Night
 * Market" redesign). Looks and bodies come from 36-looks.js.
 * ===================================================================== */

const AVLIB = (() => {
  const n = (v) => +(+v).toFixed(2);
  const hx = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const mix = (a, b, t) => { const B = hx(b); return '#' + hx(a).map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join(''); };
  const lum = (h) => { const [r, g, b] = hx(h); return (0.299 * r + 0.587 * g + 0.114 * b) / 255; };
  const circ = (x, y, r) => `M${n(x - r)} ${n(y)} A${r} ${r} 0 1 0 ${n(x + r)} ${n(y)} A${r} ${r} 0 1 0 ${n(x - r)} ${n(y)} Z`;
  const ell = (x, y, rx, ry) => `M${n(x - rx)} ${n(y)} A${rx} ${ry} 0 1 0 ${n(x + rx)} ${n(y)} A${rx} ${ry} 0 1 0 ${n(x - rx)} ${n(y)} Z`;
  const rr = (x, y, w, h, r) => `M${n(x + r)} ${n(y)} H${n(x + w - r)} A${r} ${r} 0 0 1 ${n(x + w)} ${n(y + r)} V${n(y + h - r)} A${r} ${r} 0 0 1 ${n(x + w - r)} ${n(y + h)} H${n(x + r)} A${r} ${r} 0 0 1 ${n(x)} ${n(y + h - r)} V${n(y + r)} A${r} ${r} 0 0 1 ${n(x + r)} ${n(y)} Z`;
  // Mirror absolute M/L/C/Q/H/V paths across the centre line x = 100.
  const mirror = (d) => d.replace(/([MLCQHVZ])([^MLCQHVZ]*)/g, (m, c, a) => {
    const v = a.trim() ? a.trim().split(/[\s,]+/).map(Number) : [];
    if (c === 'H') return 'H' + v.map((x) => n(200 - x)).join(' ') + ' ';
    if (c === 'V' || c === 'Z') return c + v.join(' ') + ' ';
    return c + v.map((x, i) => (i % 2 ? x : n(200 - x))).join(' ') + ' ';
  });
  const both = (d) => d + ' ' + mirror(d);

  const SKIN = ['#FCE5D5', '#F5D0B5', '#E9BB94', '#D7A072', '#BD8253', '#9A6340', '#734629', '#4F2F1C'];
  const HAIR = { black: '#1F1B1E', espresso: '#3B2519', brown: '#6A4129', chestnut: '#8A4A2B', auburn: '#9E3E22', ginger: '#CF6D33', honey: '#C8924A', blonde: '#E4C077', platinum: '#EFE4CB', grey: '#A9A6A4', white: '#ECEAE6', rose: '#E58FB2', teal: '#38ABA4', violet: '#7A5BD8' };
  const EYEC = { brown: '#5B3920', dark: '#2E1E14', hazel: '#87662D', green: '#4B8A4D', blue: '#3B78C2', grey: '#7B8B98', amber: '#A9692A' };
  const BUILD = { slim: 0.93, regular: 1, broad: 1.07 };
  const GOLD = '#F2C14E';

  const FACES = {
    oval: 'M100 44 C122 44 139 60 139 86 C139 100 138 112 134 122 C128 138 114 150 100 150 C86 150 72 138 66 122 C62 112 61 100 61 86 C61 60 78 44 100 44 Z',
    round: 'M100 45 C124 45 141 61 141 88 C141 104 139 116 133 127 C125 141 113 148 100 148 C87 148 75 141 67 127 C61 116 59 104 59 88 C59 61 76 45 100 45 Z',
    square: 'M100 44 C123 44 140 60 140 86 C140 104 140 120 136 131 C131 143 116 150 100 150 C84 150 69 143 64 131 C60 120 60 104 60 86 C60 60 77 44 100 44 Z',
    heart: 'M100 44 C124 44 141 60 141 86 C141 101 137 113 130 124 C122 138 110 151 100 151 C90 151 78 138 70 124 C63 113 59 101 59 86 C59 60 76 44 100 44 Z',
    long: 'M100 42 C121 42 138 58 138 84 C138 104 137 119 132 131 C126 146 113 154 100 154 C87 154 74 146 68 131 C63 119 62 104 62 84 C62 58 79 42 100 42 Z',
  };
  const EYES = {
    almond: { w: 15, up: 5.2, lo: 3.6, tilt: 0.8, crease: 1 },
    round: { w: 14, up: 6, lo: 5, tilt: 0, crease: 1 },
    upturned: { w: 15.5, up: 5, lo: 3.3, tilt: 2, crease: 1 },
    downturned: { w: 15, up: 4.8, lo: 4, tilt: -1.6, crease: 1 },
    hooded: { w: 15, up: 4.2, lo: 3.6, tilt: 0.4, crease: 2 },
    monolid: { w: 15.5, up: 3.7, lo: 3.1, tilt: 1.2, crease: 0 },
  };
  const BROWS = {
    natural: { len: 17, arch: 2.6, th: 2.8, tilt: 0 },
    straight: { len: 17, arch: 0.8, th: 3, tilt: 0.6 },
    arched: { len: 17, arch: 3.8, th: 2.4, tilt: 0 },
    thick: { len: 18, arch: 2.2, th: 4.2, tilt: 0.2 },
    thin: { len: 16, arch: 3.4, th: 1.6, tilt: 0 },
    angled: { len: 17, arch: 3.6, th: 2.8, tilt: 1.8 },
  };
  const STAGE = {
    baby: { head: 'translate(0 16) translate(100 150) scale(1.15) translate(-100 -150)', sx: 0.66, sy: 0.78, iris: 5.6, eye: 1.18 },
    child: { head: 'translate(0 9) translate(100 150) scale(1.08) translate(-100 -150)', sx: 0.8, sy: 0.88, iris: 5.1, eye: 1.1 },
    teen: { head: 'translate(0 3)', sx: 0.92, sy: 0.96, iris: 4.6, eye: 1 },
    adult: { head: '', sx: 1, sy: 1, iris: 4.4, eye: 1 },
    senior: { head: '', sx: 0.98, sy: 1, iris: 4.2, eye: 0.97 },
  };
  const VIEWS = { bust: '0 0 200 200', head: '34 22 132 132', hair: '18 8 164 164', eyes: '66 64 68 68', brows: '66 58 68 68', nose: '74 86 52 52', mouth: '76 104 48 48' };
  const DEFAULT = { skin: 2, face: 'oval', hair: 'crop', hairColor: 'brown', eyes: 'almond', eyeColor: 'brown', brows: 'natural', nose: 'soft', mouth: 'smile', facial: 'none', glasses: 'none', headwear: 'none', earrings: 'none', outfit: 'tee', outfitColor: '#6C8CFF', build: 'regular', freckles: false, blush: false, lashes: false, bg: '#DCD6F7' };

  const stageOf = (age) => (age == null || age === '' ? 'adult' : age < 3 ? 'baby' : age < 13 ? 'child' : age < 20 ? 'teen' : age < 60 ? 'adult' : 'senior');

  const eyeGeo = (k, cx, cy, s, sc) => {
    const w = k.w * sc, up = k.up * sc, lo = k.lo * sc;
    const ox = cx - (s * w) / 2, ix = cx + (s * w) / 2, oy = cy - k.tilt, iy = cy + 0.6;
    const upper = `M${n(ox)} ${n(oy)} C${n(ox + s * w * 0.22)} ${n(cy - up)} ${n(ix - s * w * 0.34)} ${n(cy - up * 1.02)} ${n(ix)} ${n(iy)}`;
    const lowerC = `C${n(ix - s * w * 0.3)} ${n(cy + lo)} ${n(ox + s * w * 0.3)} ${n(cy + lo * 0.95)} ${n(ox)} ${n(oy)}`;
    const cy2 = k.crease === 2 ? 1.1 : 2.2;
    return {
      full: `${upper} ${lowerC} Z`,
      upper,
      lower: `M${n(ix)} ${n(iy)} ${lowerC}`,
      crease: `M${n(ox + s * w * 0.16)} ${n(cy - up - cy2 * 0.6)} C${n(ox + s * w * 0.4)} ${n(cy - up - cy2 * 1.5)} ${n(ix - s * w * 0.3)} ${n(cy - up - cy2 * 1.4)} ${n(ix - s * w * 0.04)} ${n(cy - up - cy2 * 0.4)}`,
      lash: `M${n(ox + s * 0.4)} ${n(oy - 0.2)} L${n(ox - s * 2.4)} ${n(oy - 2)}`,
      bag: `M${n(cx - 6)} ${n(cy + lo + 2.6)} C${n(cx - 2)} ${n(cy + lo + 4.4)} ${n(cx + 3)} ${n(cy + lo + 4.4)} ${n(cx + 6)} ${n(cy + lo + 2.2)}`,
      ix, ox, oy,
    };
  };
  const browGeo = (b, cx, cy, s, lift) => {
    const t = b.th / 2, ix = cx + s * 8, ox = cx - s * (b.len - 8);
    const iy = cy + b.tilt - lift, oy = cy + 1.4, px = cx - s * 2.5, py = cy - b.arch - lift * 0.35;
    return `M${n(ix)} ${n(iy - t)} C${n(ix - s * 3)} ${n(iy - t - 0.8)} ${n(px + s * 3)} ${n(py - t)} ${n(px)} ${n(py - t)} C${n(px - s * 3)} ${n(py - t)} ${n(ox + s * 2)} ${n(oy - 1.2)} ${n(ox)} ${n(oy)} C${n(ox + s * 2.5)} ${n(oy - 0.2)} ${n(px - s * 3)} ${n(py + t * 0.7)} ${n(px)} ${n(py + t * 0.7)} C${n(px + s * 3)} ${n(py + t * 0.7)} ${n(ix - s * 3)} ${n(iy + t + 0.2)} ${n(ix)} ${n(iy + t)} C${n(ix + s * 1.2)} ${n(iy + t - 0.6)} ${n(ix + s * 1.2)} ${n(iy - t + 0.6)} ${n(ix)} ${n(iy - t)} Z`;
  };

  const NOSES = {
    soft: (sk) => [{ d: 'M96.5 113.5 C95.5 116.5 97.5 118.5 100 118.5 C102.5 118.5 104.5 116.5 103.5 113.5', s: sk.shade, w: 2 }, { d: 'M103.5 99 C104.5 105 105.5 109 104.5 112', s: sk.shade, w: 1.6, o: 0.45 }],
    button: (sk) => [{ d: ell(100, 114, 5, 3.6), f: sk.shade, o: 0.35 }, { d: ell(97, 117, 1.4, 1) + ' ' + ell(103, 117, 1.4, 1), f: sk.deep, o: 0.55 }, { d: circ(98.6, 112.6, 1.3), f: sk.hi, o: 0.7 }],
    straight: (sk) => [{ d: 'M101 96 C101.5 104 102 109 104 113 C105 116 102.5 118.5 100 118.5 C98 118.5 96.5 117.8 95.5 116.5', s: sk.shade, w: 2 }],
    wide: (sk) => [{ d: 'M94 112 C91.5 115 93 119 97 118.5 C98.5 119.5 101.5 119.5 103 118.5 C107 119 108.5 115 106 112', s: sk.shade, w: 2 }, { d: 'M103.5 100 C104.5 105 105 108 104.6 110.5', s: sk.shade, w: 1.6, o: 0.4 }],
    pointed: (sk) => [{ d: 'M102 98 C104 106 107 111 106 115 C105 118 101 119 98 118', s: sk.shade, w: 2 }],
    round: (sk) => [{ d: 'M95 112 C93 116 95.5 119 98.5 118.5 L101.5 118.5 C104.5 119 107 116 105 112', s: sk.shade, w: 2 }, { d: circ(100, 113.2, 1.8), f: sk.hi, o: 0.75 }],
  };
  const MOUTHS = {
    smile: (sk) => [{ d: 'M89 127 C94 133 106 133 111 127 C106 129.5 94 129.5 89 127 Z', f: sk.lipDark }, { d: 'M93 131 C97 134 103 134 107 131 C103 132.6 97 132.6 93 131 Z', f: sk.lip, o: 0.7 }],
    grin: (sk) => [{ d: 'M88.5 126 C93 136 107 136 111.5 126 C104.5 128 95.5 128 88.5 126 Z', f: '#4A1C22' }, { d: 'M91 127.2 C97 128.6 103 128.6 109 127.2 C108.6 129 107.6 130.4 106.4 131 C102 131.8 98 131.8 93.6 131 C92.4 130.4 91.4 129 91 127.2 Z', f: '#FBF7F2' }, { d: 'M88.5 126 C93 136 107 136 111.5 126', s: sk.lipDark, w: 1.2, o: 0.6 }],
    neutral: (sk) => [{ d: 'M91.5 128 C96 129 104 129 108.5 128', s: sk.lipDark, w: 2.2 }, { d: 'M94 130 C97.5 133 102.5 133 106 130 C102 131.2 98 131.2 94 130 Z', f: sk.lip, o: 0.8 }],
    smirk: (sk) => [{ d: 'M91 129.5 C96 130.5 103 130 109.5 125.5', s: sk.lipDark, w: 2.2 }, { d: circ(111.4, 126.6, 0.9), f: sk.shade }],
    laugh: (sk) => [{ d: 'M88 125 C90 139 110 139 112 125 C104 127 96 127 88 125 Z', f: '#4A1C22' }, { d: 'M94 134.5 C97 132 103 132 106 134.5 C103 136.6 97 136.6 94 134.5 Z', f: '#E06B7A' }, { d: 'M90 125.8 C96 127.3 104 127.3 110 125.8 L109.6 128 C104 129.4 96 129.4 90.4 128 Z', f: '#FBF7F2' }],
    full: (sk) => [{ d: 'M89 128 C93 124.5 97 124.5 100 126 C103 124.5 107 124.5 111 128 C105 129 95 129 89 128 Z', f: sk.lip }, { d: 'M89 128 C95 129.5 105 129.5 111 128 C108 134.5 92 134.5 89 128 Z', f: mix(sk.lip, '#FFFFFF', 0.12) }, { d: 'M89 128 C95 129.2 105 129.2 111 128', s: sk.lipDark, w: 1.3 }],
    frown: (sk) => [{ d: 'M91 131 C96 126.6 104 126.6 109 131', s: sk.lipDark, w: 2.2 }],
  };

  const curlBlobs = [[60.5, 82, 9.5], [64, 66, 11], [74, 52, 12], [88, 43.5, 12.5], [100, 41, 13], [112, 43.5, 12.5], [126, 52, 12], [136, 66, 11], [139.5, 82, 9.5], [70, 70, 9], [130, 70, 9], [82, 62, 9], [118, 62, 9], [100, 58, 10]];
  const afroBlobs = [150, 180, 210, 240, 270, 300, 330, 360, 390].map((a) => [100 + 50 * Math.cos((a * Math.PI) / 180), 72 + 44 * Math.sin((a * Math.PI) / 180), 16]).concat([[52, 106, 13], [148, 106, 13]]);
  const curlMarks = (pts, s) => pts.map(([x, y, r]) => `M${n(x - r * 0.45)} ${n(y + r * 0.1)} A${n(r * 0.5)} ${n(r * 0.5)} 0 0 1 ${n(x + r * 0.3)} ${n(y - r * 0.35)}`).join(' ');
  const SLEEK = 'M58 94 C56 64 74 37 100 36 C126 37 144 64 142 94 C140 84 136 76 130 70 C120 64 110 62 100 62 C90 62 80 64 70 70 C64 76 60 84 58 94 Z';
  const LONGFRONT = 'M100 36 C76 36 58 52 57 82 C56 110 55 140 54 176 C58 182 66 184 72 180 C70 156 68 132 67 112 C66 96 70 82 78 70 C86 60 94 54 100 50 C106 54 114 60 122 70 C130 82 134 96 133 112 C132 132 130 156 128 180 C134 184 142 182 146 176 C145 140 144 110 143 82 C142 52 124 36 100 36 Z';

  // Each style returns { back: [layers], front: [layers] } in head space.
  const HAIRSTYLES = {
    none: () => ({}),
    bald: (c, sk) => ({ front: [{ d: ell(88, 58, 9, 4.5), f: sk.hi, o: 0.5, t2: 'rotate(-15 88 58)' }] }),
    buzz: (c) => ({ front: [{ d: 'M60.5 90 C59 62 76 41 100 41 C124 41 141 62 139.5 90 C137 80 132 72.5 124 68.5 C112 64.5 88 64.5 76 68.5 C68 72.5 63 80 60.5 90 Z', f: c.base, o: 0.9 }] }),
    crop: (c) => ({ front: [
      { d: 'M57 95 C55 64 72 36 100 35 C128 36 145 64 143 95 L139 95 C138 84 136 77 131 72 C126 71 121 70 116 71 C112 68 106 68 100 69 C94 68 88 68 84 71 C79 70 74 71 69 72 C64 77 62 85 61 95 Z', f: c.base },
      { d: 'M88 44 C92 52 92 60 90 68 M108 43 C112 52 113 60 111 68', s: c.shade, w: 1.4, o: 0.5 },
      { d: 'M76 46 C86 40 102 38 116 41', s: c.hi, w: 3, o: 0.6 },
    ] }),
    sidepart: (c) => ({ front: [
      { d: 'M57 96 C54 62 72 34 102 34 C130 35 146 62 143 96 L139 96 C139 84 137 74 131 67 C124 64 114 62 104 60 C97 58.5 91 57 87 55 C82 60 74 64 68 70 C64 76 61 86 61 96 Z', f: c.base },
      { d: 'M86 38 C84.5 44 85.5 50 87 55 M92 50 C104 52 118 56 128 62', s: c.shade, w: 1.5, o: 0.55 },
      { d: 'M96 43 C108 41 122 45 130 53', s: c.hi, w: 3, o: 0.55 },
    ] }),
    curls: (c) => ({ front: [
      { d: 'M58.5 92 C58.5 68 76 50 100 50 C124 50 141.5 68 141.5 92 C138 82 131 76 123 73.5 C115 71 107 72 100 71.5 C93 72 85 71 77 73.5 C69 76 62 82 58.5 92 Z ' + curlBlobs.map(([x, y, r]) => circ(x, y, r)).join(' '), f: c.base },
      { d: curlMarks(curlBlobs), s: c.shade, w: 1.6, o: 0.6 },
      { d: curlMarks([[74, 52, 12], [88, 43.5, 12.5], [100, 41, 13]]), s: c.hi, w: 1.8, o: 0.55, t2: 'translate(-1.5 -3)' },
    ] }),
    afro: (c) => ({
      back: [
        { d: ell(100, 76, 50, 46) + ' ' + afroBlobs.map(([x, y, r]) => circ(x, y, r)).join(' '), f: c.base },
        { d: curlMarks([[64, 44, 9], [80, 32, 9], [100, 27, 9], [120, 32, 9], [136, 44, 9], [150, 62, 9], [50, 62, 9], [146, 84, 9], [54, 84, 9], [150, 104, 8], [50, 104, 8]]), s: c.shade, w: 1.7, o: 0.55 },
        { d: curlMarks([[72, 36, 9], [90, 28, 9]]), s: c.hi, w: 1.8, o: 0.5 },
      ],
      front: [{ d: 'M58 96 C55 60 74 36 100 36 C126 36 145 60 142 96 C138 82 129 72 118 67.5 C108 64 92 64 82 67.5 C71 72 62 82 58 96 Z', f: c.base }, { d: curlMarks([[76, 50, 8], [94, 44, 8], [112, 46, 8], [128, 56, 8]]), s: c.shade, w: 1.6, o: 0.5 }],
    }),
    pixie: (c) => ({ front: [
      { d: 'M58 98 C54 66 70 38 100 36 C128 36 145 58 143 90 C142 93 140 96 139 98 C138 86 136 78 130 72 C121 77 105 81 90 81 C80 82 72 85 66 89 C63 92 62 95 61 98 Z M60 92 C59 98 59 104 60 109 C62 104 63.5 99 64 94 Z M140 92 C141 98 141 104 140 109 C138 104 136.5 99 136 94 Z', f: c.base },
      { d: 'M128 70 C116 75 102 78 90 79 M118 50 C110 58 100 64 88 68', s: c.shade, w: 1.5, o: 0.5 },
      { d: 'M84 44 C96 39 112 40 124 47', s: c.hi, w: 3, o: 0.55 },
    ] }),
    bob: (c) => ({
      back: [{ d: 'M59 96 C58 120 60 138 66 146 L134 146 C140 138 142 120 141 96 Z', f: c.back }],
      front: [
        { d: 'M100 36 C72 36 55 54 55 86 C55 106 55 124 58 142 C64 147 74 147 80 143 C74 126 70 110 70 94 C70 87 72 81 75.5 77 C84 78.5 92 79 100 79 C108 79 116 78.5 124.5 77 C128 81 130 87 130 94 C130 110 126 126 120 143 C126 147 136 147 142 142 C145 124 145 106 145 86 C145 54 128 36 100 36 Z', f: c.base },
        { d: 'M84 60 C82 66 82 72 84 78 M100 58 C99 66 99 72 100 79 M116 60 C118 66 118 72 116 78 M64 92 C64 110 66 126 70 140 M136 92 C136 110 134 126 130 140', s: c.shade, w: 1.4, o: 0.45 },
        { d: 'M70 50 C80 42 94 39 106 40', s: c.hi, w: 3, o: 0.55 },
      ],
    }),
    long: (c) => ({
      back: [{ d: 'M60 84 C56 120 54 160 52 198 L148 198 C146 160 144 120 140 84 Z', f: c.back }],
      front: [
        { d: LONGFRONT, f: c.base },
        { d: 'M100 37 L100 50 M63 92 C61 116 60 144 59 172 M137 92 C139 116 140 144 141 172', s: c.shade, w: 1.5, o: 0.5 },
        { d: 'M70 66 C65 90 63 120 62 152 M130 66 C135 90 137 120 138 152', s: c.hi, w: 2.5, o: 0.45 },
      ],
    }),
    wavy: (c) => ({
      back: [{ d: 'M58 86 C52 110 58 130 52 150 C48 166 54 184 52 198 L148 198 C146 184 152 166 148 150 C142 130 148 110 142 86 Z', f: c.back }],
      front: [
        { d: 'M100 35 C74 35 56 52 55 82 C53 100 58 112 54 128 C50 144 58 156 54 172 C58 182 70 184 76 178 C72 162 78 150 72 134 C68 120 70 104 70 94 C72 80 82 66 100 52 C118 66 128 80 130 94 C130 104 132 120 128 134 C122 150 128 162 124 178 C130 184 142 182 146 172 C142 156 150 144 146 128 C142 112 147 100 145 82 C144 52 126 35 100 35 Z', f: c.base },
        { d: 'M100 36 L100 52 M64 84 C61 98 66 110 62 124 C59 136 64 148 61 160 M136 84 C139 98 134 110 138 124 C141 136 136 148 139 160', s: c.shade, w: 1.5, o: 0.45 },
        { d: 'M66 70 C60 90 66 104 61 122 C57 138 64 150 60 166 M134 70 C140 90 134 104 139 122 C143 138 136 150 140 166', s: c.hi, w: 2.5, o: 0.45 },
      ],
    }),
    ponytail: (c) => ({
      back: [{ d: 'M126 46 C147 44 159 61 157 85 C155 109 147 130 151 158 C140 152 134 134 134 113 C134 93 140 75 130 60 Z', f: c.back }, { d: 'M144 70 C146 92 142 116 146 140', s: c.hi, w: 2.2, o: 0.4 }],
      front: [
        { d: SLEEK, f: c.base },
        { d: 'M84 63 C90 52 100 46 116 44 M70 72 C76 58 86 48 100 44', s: c.shade, w: 1.4, o: 0.5 },
        { d: 'M78 46 C90 40 110 40 122 46', s: c.hi, w: 3, o: 0.55 },
        { d: rr(130, 47, 9, 9, 3), f: '#E35D7A', t2: 'rotate(30 134.5 51.5)' },
      ],
    }),
    bun: (c) => ({
      back: [{ d: circ(100, 31, 15), f: c.base }, { d: 'M90 30 C92 24 104 22 110 28 M92 36 C98 39 106 38 110 34', s: c.shade, w: 1.5, o: 0.55 }],
      front: [
        { d: SLEEK, f: c.base },
        { d: 'M84 63 C90 52 100 46 116 44 M116 63 C110 52 100 46 84 44', s: c.shade, w: 1.4, o: 0.45 },
        { d: 'M78 46 C90 40 110 40 122 46', s: c.hi, w: 3, o: 0.55 },
      ],
    }),
    braids: (c) => ({
      back: [{ d: 'M58 84 C53 120 52 160 50 198 L150 198 C148 160 147 120 142 84 Z', f: c.back }],
      front: [
        { d: LONGFRONT, f: c.base },
        { d: 'M61 84 C60 110 59 140 58 174 M67 86 C66 112 65 142 64 178 M139 84 C140 110 141 140 142 174 M133 86 C134 112 135 142 136 178 M86 42 C88 48 90 54 92 58 M114 42 C112 48 110 54 108 58', s: c.hi, w: 2.2, o: 0.55, da: '3.2 2.4' },
        { d: 'M100 37 L100 50', s: c.shade, w: 1.6, o: 0.6 },
        { d: circ(58, 177, 2.4) + ' ' + circ(64, 181, 2.4) + ' ' + circ(142, 177, 2.4) + ' ' + circ(136, 181, 2.4), f: GOLD },
      ],
    }),
    receding: (c, sk) => ({ front: [
      { d: ell(90, 56, 10, 5), f: sk.hi, o: 0.45, t2: 'rotate(-12 90 56)' },
      { d: 'M78 52 C88 47 112 47 122 52 C112 50.5 88 50.5 78 52 Z', f: c.base, o: 0.55 },
      { d: 'M57 104 C55 90 57 76 64 66 C69 61 74 58.5 79 58 C73 66 68 74 65.5 84 C63.5 92 62.5 98 62 104 Z M143 104 C145 90 143 76 136 66 C131 61 126 58.5 121 58 C127 66 132 74 134.5 84 C136.5 92 137.5 98 138 104 Z', f: c.base },
    ] }),
    tuft: (c) => ({ front: [
      { d: 'M70 66 C76 54 86 47 100 47 C114 47 124 54 130 66 C122 60 112 57 100 57 C88 57 78 60 70 66 Z', f: c.base, o: 0.22 },
      { d: 'M95 46 C93 38 100 32.5 107.5 34 C103.5 36 101.5 40 102.5 45.5 Z', f: c.base },
    ] }),
  };

  const OUTFITS = {
    tee: (c) => [
      { d: 'M22 200 C22 182 32 170 52 165 C64 162 76 159 85 156 C89 163 111 163 115 156 C124 159 136 162 148 165 C168 170 178 182 178 200 Z', f: c.c },
      { d: 'M85 156 C89 163 111 163 115 156', s: c.s, w: 3.4 },
      { d: both('M52 166 C49 176 49 188 51 200'), s: c.s, w: 1.4, o: 0.4 },
    ],
    vneck: (c) => [
      { d: 'M22 200 C22 182 32 170 52 165 C64 162 76 159 85 156 L100 177 L115 156 C124 159 136 162 148 165 C168 170 178 182 178 200 Z', f: c.c },
      { d: 'M85 156 L100 177 L115 156', s: c.s, w: 3 },
      { d: both('M52 166 C49 176 49 188 51 200'), s: c.s, w: 1.4, o: 0.4 },
    ],
    hoodie: (c) => [
      { d: 'M22 200 C22 182 32 170 52 165 C64 162 76 159 85 156 C89 163 111 163 115 156 C124 159 136 162 148 165 C168 170 178 182 178 200 Z', f: c.c },
      { d: 'M68 170 C70 158 86 154 100 154 C114 154 130 158 132 170 C124 175 112 173 100 171.5 C88 173 76 175 68 170 Z', f: c.h },
      { d: 'M76 164 C84 159 116 159 124 164', s: c.s, w: 1.4, o: 0.45 },
      { d: 'M93.5 171 L92.5 188 M106.5 171 L107.5 188', s: '#F4F1EA', w: 2.2 },
      { d: circ(92.5, 189.5, 1.9) + ' ' + circ(107.5, 189.5, 1.9), f: '#F4F1EA' },
      { d: 'M66 200 C70 192 130 192 134 200', s: c.s, w: 1.6, o: 0.5 },
    ],
    collar: (c) => [
      { d: 'M22 200 C22 182 32 170 52 165 C64 162 76 159 85 156 C90 162 110 162 115 156 C124 159 136 162 148 165 C168 170 178 182 178 200 Z', f: c.c },
      { d: 'M100 163 L100 200', s: c.s, w: 1.4 },
      { d: circ(100, 178, 1.7) + ' ' + circ(100, 191, 1.7), f: c.s },
      { d: both('M86 153 L79.5 166 L97 172 L100 162 Z'), f: c.h, s: c.s, w: 1 },
    ],
    blazer: (c) => [
      { d: 'M22 200 C22 182 32 170 52 165 C64 162 76 159 85 156 L100 196 L115 156 C124 159 136 162 148 165 C168 170 178 182 178 200 Z', f: c.c },
      { d: 'M85 156 C90 161 110 161 115 156 L100 196 Z', f: '#F3F1EC' },
      { d: both('M85 156 L75 168 L84.5 173 L79 179 L99 197 Z'), f: c.s },
      { d: both('M52 166 C49 176 49 188 51 200'), s: c.s, w: 1.4, o: 0.5 },
    ],
    suit: (c) => [
      ...OUTFITS.blazer(c),
      { d: 'M96.8 162 H103.2 L104.6 168 L100 191 L95.4 168 Z', f: '#B33A4A' },
      { d: 'M96.4 160.5 H103.6 L102.6 165.5 H97.4 Z', f: '#8E2A38' },
    ],
    sweater: (c) => [
      { d: 'M22 200 C22 182 32 170 52 165 C64 162 76 159 84 156 L116 156 C124 159 136 162 148 165 C168 170 178 182 178 200 Z', f: c.c },
      { d: 'M84.5 139 C84.5 136.5 115.5 136.5 115.5 139 L116.5 160 C108 164 92 164 83.5 160 Z', f: c.c },
      { d: 'M84 149.5 C92 152.5 108 152.5 116 149.5', s: c.s, w: 1.6 },
      { d: 'M89 152.5 V161 M94.5 153.2 V162.5 M100 153.5 V163 M105.5 153.2 V162.5 M111 152.5 V161', s: c.s, w: 1.1, o: 0.45 },
      { d: both('M52 166 C49 176 49 188 51 200'), s: c.s, w: 1.4, o: 0.4 },
    ],
    scoop: (c) => [
      { d: 'M22 200 C22 182 32 170 52 165 C60 163 67 161.5 73 160.5 C82 176 118 176 127 160.5 C133 161.5 140 163 148 165 C168 170 178 182 178 200 Z', f: c.c },
      { d: 'M73 160.5 C82 176 118 176 127 160.5', s: c.s, w: 2.6 },
    ],
    tank: (c) => [
      { d: 'M42 200 C43 188 50 180 60 177 C70 181 84 185 100 185 C116 185 130 181 140 177 C150 180 157 188 158 200 Z', f: c.c },
      { d: rr(59, 158, 7.5, 24, 3.75) + ' ' + rr(133.5, 158, 7.5, 24, 3.75), f: c.c },
      { d: 'M60 177 C70 181 84 185 100 185 C116 185 130 181 140 177', s: c.s, w: 2 },
    ],
    onesie: (c) => [
      { d: 'M22 200 C22 182 32 170 52 165 C64 162 76 159 85 156 C89 163 111 163 115 156 C124 159 136 162 148 165 C168 170 178 182 178 200 Z', f: c.c },
      { d: 'M85 156 C89 164 111 164 115 156', s: c.h, w: 4.5 },
      { d: circ(100, 177, 2.2) + ' ' + circ(100, 189, 2.2), f: c.h },
    ],
  };

  const NECK = 'M86 118 L86 150 C86 154 84 156 80 157 C70 159 60 161.5 52 165 L52 200 L148 200 L148 165 C140 161.5 130 159 120 157 C116 156 114 154 114 150 L114 118 Z';
  const TORSO = 'M22 200 C22 182 32 170 52 165 C64 162 76 159 86 156 L114 156 C124 159 136 162 148 165 C168 170 178 182 178 200 Z';
  const EAR = 'M63 92 C56 88 51 92 51 101 C51 110 56 116 63 115 Z';
  const EAR_IN = 'M59.5 96 C55.5 95 54.5 99 55.5 103 C56.5 107 58.5 108 60.5 107';

  function build(look, stage, mood, ids) {
    const L = Object.assign({}, DEFAULT, look || {});
    const st = STAGE[stage] || STAGE.adult;
    const baby = stage === 'baby', kid = baby || stage === 'child';
    const base = typeof L.skin === 'string' ? L.skin : SKIN[Math.max(0, Math.min(7, L.skin | 0))];
    const sk = { base, shade: mix(base, '#6B2E1E', 0.22), deep: mix(base, '#3A140A', 0.45), blush: mix(base, '#F0506E', 0.42), lip: mix(base, '#B8405A', 0.42), lipDark: mix(base, '#4A1420', 0.6), hi: mix(base, '#FFFFFF', 0.32) };
    let hairBase = HAIR[L.hairColor] || L.hairColor || HAIR.brown;
    if (stage === 'senior' && !['grey', 'white', 'platinum'].includes(L.hairColor)) hairBase = mix(hairBase, '#B9B6B3', 0.72);
    const hc = { base: hairBase, back: mix(hairBase, '#000000', 0.2), shade: mix(hairBase, '#000000', 0.36), hi: mix(hairBase, '#FFFFFF', lum(hairBase) < 0.25 ? 0.22 : 0.34) };
    const browC = lum(hairBase) > 0.6 ? mix(hairBase, '#5A4232', 0.5) : mix(hairBase, '#000000', 0.12);
    const eyeC = EYEC[L.eyeColor] || L.eyeColor || EYEC.brown;
    const oc = L.outfitColor || '#6C8CFF';
    const cc = { c: oc, s: mix(oc, '#000000', 0.25), h: mix(oc, '#FFFFFF', 0.24) };

    const faceK = baby ? 'round' : stage === 'child' && ['long', 'square'].includes(L.face) ? 'oval' : FACES[L.face] ? L.face : 'oval';
    const hairK = baby ? (['none', 'bald'].includes(L.hair) ? 'none' : 'tuft') : HAIRSTYLES[L.hair] ? L.hair : 'crop';
    const eyeK = baby ? 'round' : EYES[L.eyes] ? L.eyes : 'almond';
    const noseK = baby ? 'button' : stage === 'child' && ['straight', 'pointed'].includes(L.nose) ? 'soft' : NOSES[L.nose] ? L.nose : 'soft';
    const outfitK = baby ? 'onesie' : OUTFITS[L.outfit] ? L.outfit : 'tee';
    const facialK = kid ? 'none' : stage === 'teen' && L.facial !== 'none' ? 'stubble' : L.facial;
    const headwear = baby ? 'none' : L.headwear;
    let mouthK = MOUTHS[L.mouth] ? L.mouth : 'smile', lift = 0;
    if (mood === 'sad') { mouthK = 'frown'; lift = 2.4; }
    else if (mood === 'neutral') mouthK = 'neutral';
    else if (mood === 'happy' && ['neutral', 'frown'].includes(mouthK)) mouthK = 'smile';
    if (baby && mood !== 'sad') mouthK = 'smile';

    const HT = st.head;
    const BT = `translate(100 200) scale(${n(st.sx * (BUILD[L.build] || 1))} ${st.sy}) translate(-100 -200)`;
    const out = [];
    const add = (g, t, arr) => arr.forEach((l) => out.push(Object.assign({}, l, { g, t: [t, l.t2].filter(Boolean).join(' ') })));
    const H = (g, arr) => add(g, HT, arr);
    const B = (g, arr) => add(g, BT, arr);
    const faceD = FACES[faceK];
    const hijab = headwear === 'hijab';
    const hair = hijab ? {} : HAIRSTYLES[hairK](hc, sk);
    const fclip = `url(#${ids.face})`, eclip = `url(#${ids.eyes})`;

    // back of head, body, clothes
    if (hair.back) H('hairBack', hair.back);
    if (outfitK === 'tank') B('body', [{ d: TORSO, f: sk.base }]);
    B('body', [{ d: NECK, f: sk.base }]);
    if (outfitK === 'scoop') B('body', [{ d: both('M84 165 C88 166.5 93 166.8 96 166'), s: sk.shade, w: 1.3, o: 0.6 }]);
    B('clothes', OUTFITS[outfitK](cc));
    if (hijab) H('hair', [
      { d: 'M100 31 C66 31 49 56 49 90 C49 118 54 140 60 156 C48 162 38 174 34 200 L166 200 C162 174 152 162 140 156 C146 140 151 118 151 90 C151 56 134 31 100 31 Z', f: mix(L.headwearColor || '#2BB3A3', '#000000', 0.12) },
      { d: 'M60 158 C76 170 124 170 140 158', s: mix(L.headwearColor || '#2BB3A3', '#000000', 0.3), w: 1.6, o: 0.55 },
    ]);

    // head
    H('face', [
      { d: both(EAR), f: sk.base },
      { d: both(EAR_IN), s: sk.shade, w: 1.6 },
      { d: 'M86.5 134 C92 145 108 145 113.5 134 L113.5 149 C108 155 92 155 86.5 149 Z', f: sk.shade, o: 0.55 },
      { d: faceD, f: sk.base },
      { d: 'M128 50 C142 66 144 108 128 134 C120 146 110 152 100 153 L156 153 L156 50 Z', f: sk.shade, o: 0.16, c: fclip },
    ]);
    if (stage === 'senior' && !L.smooth) H('features', [
      { d: 'M85 69 C92 67 108 67 115 69 M88 75 C94 73.6 106 73.6 112 75', s: sk.shade, w: 1.3, o: 0.5 },
      { d: both('M91 117 C87.5 121 87 125 88.5 129.5'), s: sk.shade, w: 1.5, o: 0.55 },
      { d: both('M71.5 97 L68.5 95.6 M71.5 100 L68 100.6'), s: sk.shade, w: 1.1, o: 0.55 },
    ]);
    if (L.blush || kid) H('features', [{ d: ell(78, 115, 7.5, 4.2) + ' ' + ell(122, 115, 7.5, 4.2), f: sk.blush, o: kid ? 0.42 : 0.34 }]);
    if (L.freckles && !baby) H('features', [{ d: [[88, 108], [92, 105.5], [95.5, 109.5], [104.5, 109.5], [108, 105.5], [112, 108], [84, 112], [116, 112], [90, 112.5], [110, 112.5], [86.5, 104], [113.5, 104]].map(([x, y]) => circ(x, y, 0.95)).join(' '), f: sk.deep, o: 0.42 }]);

    // facial hair, mouth, nose
    const fh = hc.base;
    if (facialK === 'stubble') H('features', [{ d: 'M60 96 C60 128 78 151 100 151 C122 151 140 128 140 96 C136 108 128 118 117 122 C111 119.5 105.5 119 100 119 C94.5 119 89 119.5 83 122 C72 118 64 108 60 96 Z', f: fh, o: 0.24, c: fclip }]);
    if (facialK === 'beard') H('features', [
      { d: 'M60 96 C60 130 80 152 100 152 C120 152 140 130 140 96 L136 96 C134 108 128 118 118 122.5 C112 119 106 118 100 118 C94 118 88 119 82 122.5 C72 118 66 108 64 96 Z', f: fh, c: fclip },
      { d: 'M78 136 C84 142 92 145 100 145 C108 145 116 142 122 136', s: hc.shade, w: 1.3, o: 0.45, c: fclip },
    ]);
    if (facialK === 'full') H('features', [
      { d: 'M58 92 C56 126 72 161 100 163 C128 161 144 126 142 92 L137 94 C135 108 128 118 118 122.5 C112 119 106 118 100 118 C94 118 88 119 82 122.5 C72 118 65 108 63 94 Z', f: fh },
      { d: 'M74 140 C82 150 92 154 100 154 C108 154 118 150 126 140 M86 152 C92 156 108 156 114 152', s: hc.shade, w: 1.4, o: 0.45 },
      { d: 'M70 118 C72 128 76 136 82 142', s: hc.hi, w: 1.8, o: 0.4 },
    ]);
    if (facialK === 'goatee') H('features', [{ d: 'M88 134 C88 144 94 150 100 150 C106 150 112 144 112 134 C108 137 104 138 100 138 C96 138 92 137 88 134 Z', f: fh, c: fclip }]);
    H('features', MOUTHS[mouthK](sk));
    if (['mustache', 'goatee', 'full', 'beard'].includes(facialK)) H('features', [{ d: 'M86 126.5 C89.5 120.5 96 119.5 100 122 C104 119.5 110.5 120.5 114 126.5 C110 125 105 124.6 100 125.2 C95 124.6 90 125 86 126.5 Z', f: fh }]);
    H('features', NOSES[noseK](sk));

    // eyes
    const sc = st.eye;
    const eL = eyeGeo(EYES[eyeK], 84, 99, 1, sc), eR = eyeGeo(EYES[eyeK], 116, 99, -1, sc);
    const ir = st.iris, line = '#2A1C17';
    const eyes = [
      { d: eL.full + ' ' + eR.full, f: '#FBF7F2' },
      { d: circ(84.3, 99.3, ir) + ' ' + circ(115.7, 99.3, ir), f: eyeC, c: eclip },
      { d: circ(84.3, 99.3, ir) + ' ' + circ(115.7, 99.3, ir), s: mix(eyeC, '#000000', 0.45), w: 0.8, c: eclip },
      { d: circ(84.3, 99.3, ir * 0.46) + ' ' + circ(115.7, 99.3, ir * 0.46), f: '#17100E', c: eclip },
      { d: circ(82.9, 97.6, ir * 0.27) + ' ' + circ(114.3, 97.6, ir * 0.27), f: '#FFFFFF', c: eclip },
      { d: circ(85.8, 100.8, ir * 0.12) + ' ' + circ(117.2, 100.8, ir * 0.12), f: '#FFFFFF', o: 0.8, c: eclip },
      { d: eL.upper + ' ' + eR.upper, s: line, w: 1.8 },
      { d: eL.lower + ' ' + eR.lower, s: sk.shade, w: 1, o: 0.6 },
    ];
    if (EYES[eyeK].crease) eyes.push({ d: eL.crease + ' ' + eR.crease, s: sk.shade, w: EYES[eyeK].crease === 2 ? 1.7 : 1.2, o: 0.6 });
    if (L.lashes) eyes.push({ d: eL.lash + ' ' + eR.lash, s: line, w: 1.6 });
    if (stage === 'senior' && !L.smooth) eyes.push({ d: eL.bag + ' ' + eR.bag, s: sk.shade, w: 1.1, o: 0.5 });
    H('features', eyes);

    // brows
    const bk = BROWS[L.brows] || BROWS.natural;
    H('features', [{ d: browGeo(bk, 84, 87, 1, lift) + ' ' + browGeo(bk, 116, 87, -1, lift), f: browC, o: baby ? 0.3 : stage === 'child' ? 0.75 : 1 }]);

    // extras under the hair
    if (L.earrings === 'studs' && !hijab && !baby) H('extras', [{ d: circ(55.5, 113.5, 2.2) + ' ' + circ(144.5, 113.5, 2.2), f: GOLD }]);
    if (L.earrings === 'hoops' && !hijab && !baby) H('extras', [{ d: circ(55.5, 118.5, 4.2) + ' ' + circ(144.5, 118.5, 4.2), s: GOLD, w: 1.8 }]);
    const gc = L.glassesColor || '#2A2140';
    if (L.glasses === 'round' && !baby) H('extras', [
      { d: circ(84, 99, 10) + ' ' + circ(116, 99, 10), f: '#FFFFFF', o: 0.12 },
      { d: circ(84, 99, 10) + ' ' + circ(116, 99, 10) + ' M94 98 C97 95.5 103 95.5 106 98 M74 97 L62 94 M126 97 L138 94', s: gc, w: 2.2 },
    ]);
    if (L.glasses === 'square' && !baby) H('extras', [
      { d: rr(72.5, 90.5, 23, 17, 4.5) + ' ' + rr(104.5, 90.5, 23, 17, 4.5), f: '#FFFFFF', o: 0.12 },
      { d: rr(72.5, 90.5, 23, 17, 4.5) + ' ' + rr(104.5, 90.5, 23, 17, 4.5) + ' M95.5 97 C98 95.5 102 95.5 104.5 97 M72.5 96 L62 94 M127.5 96 L138 94', s: gc, w: 2.4 },
    ]);

    // hair, headwear
    if (hair.front) H('hair', hair.front);
    if (hijab) {
      const c = L.headwearColor || '#2BB3A3';
      H('hair', [
        { d: 'M100 37 C74 37 57 57 57 88 C57 113 64 133 77 147 C84 154 92 158 100 158 C108 158 116 154 123 147 C136 133 143 113 143 88 C143 57 126 37 100 37 Z M100 58 C118 58 131 68 133.5 88 C135.5 108 130 127 118 139 C112 145 106 149 100 149 C94 149 88 145 82 139 C70 127 64.5 108 66.5 88 C69 68 82 58 100 58 Z', f: c, r: 'evenodd' },
        { d: 'M68 50 C80 41 96 38 110 40', s: mix(c, '#FFFFFF', 0.3), w: 2.6, o: 0.6 },
        { d: 'M72 142 C82 155 118 155 128 142', s: mix(c, '#000000', 0.3), w: 1.5, o: 0.5 },
      ]);
    }
    if (headwear === 'beanie') {
      const c = L.headwearColor || '#E35D7A', cs = mix(c, '#000000', 0.22);
      H('hair', [
        { d: 'M58 78 C58 50 76 31 100 31 C124 31 142 50 142 78 Z', f: c },
        { d: 'M80 38 C78 50 77 62 78 72 M100 32 V72 M120 38 C122 50 123 62 122 72', s: cs, w: 1.3, o: 0.45 },
        { d: 'M55 72 C55 68 59 66 63 66 L137 66 C141 66 145 68 145 72 L145 80 C145 84 141 86 137 86 L63 86 C59 86 55 84 55 80 Z', f: cs },
        { d: [64, 70, 76, 82, 88, 94, 100, 106, 112, 118, 124, 130, 136].map((x) => `M${x} 69 V83`).join(' '), s: mix(c, '#000000', 0.4), w: 1.2, o: 0.4 },
        { d: circ(100, 29, 7.5), f: mix(c, '#FFFFFF', 0.35) },
      ]);
    }

    return { layers: out, faceD, eyeClip: eL.full + ' ' + eR.full, sk, hc, cc, stage };
  }

  return { build, stageOf, VIEWS, DEFAULT, mix, circ, ell, rr, n, lum };
})();

const ICLIB = (() => {
  const n = (v) => +(+v).toFixed(2);
  const c = (x, y, r) => `M${n(x - r)} ${n(y)} A${r} ${r} 0 1 0 ${n(x + r)} ${n(y)} A${r} ${r} 0 1 0 ${n(x - r)} ${n(y)} Z`;
  const e = (x, y, rx, ry) => `M${n(x - rx)} ${n(y)} A${rx} ${ry} 0 1 0 ${n(x + rx)} ${n(y)} A${rx} ${ry} 0 1 0 ${n(x - rx)} ${n(y)} Z`;
  const rr = (x, y, w, h, r) => `M${n(x + r)} ${n(y)} H${n(x + w - r)} A${r} ${r} 0 0 1 ${n(x + w)} ${n(y + r)} V${n(y + h - r)} A${r} ${r} 0 0 1 ${n(x + w - r)} ${n(y + h)} H${n(x + r)} A${r} ${r} 0 0 1 ${n(x)} ${n(y + h - r)} V${n(y + r)} A${r} ${r} 0 0 1 ${n(x + r)} ${n(y)} Z`;
  const pts = (cx, cy, R, r, k, rot) => Array.from({ length: k * 2 }, (_, i) => { const a = ((rot + (i * 180) / k) * Math.PI) / 180, d = i % 2 ? r : R; return `${n(cx + d * Math.cos(a))} ${n(cy + d * Math.sin(a))}`; });
  const star = (cx, cy, R, r, k = 5, rot = -90) => 'M' + pts(cx, cy, R, r, k, rot).join(' L') + ' Z';
  const starRight = (cx, cy, R, r) => `M${cx} ${cy} L` + pts(cx, cy, R, r, 5, -90).slice(0, 6).join(' L') + ' Z';
  const rays = (cx, cy, r1, r2, k, off) => Array.from({ length: k }, (_, i) => { const a = ((off + (i * 360) / k) * Math.PI) / 180; return `M${n(cx + r1 * Math.cos(a))} ${n(cy + r1 * Math.sin(a))} L${n(cx + r2 * Math.cos(a))} ${n(cy + r2 * Math.sin(a))}`; }).join(' ');
  const spark = (x, y, r) => `M${x} ${n(y - r)} Q${n(x + r * 0.16)} ${n(y - r * 0.16)} ${n(x + r)} ${y} Q${n(x + r * 0.16)} ${n(y + r * 0.16)} ${x} ${n(y + r)} Q${n(x - r * 0.16)} ${n(y + r * 0.16)} ${n(x - r)} ${y} Q${n(x - r * 0.16)} ${n(y - r * 0.16)} ${x} ${n(y - r)} Z`;
  const gear = (cx, cy, R, r, k) => {
    const p = [], step = 360 / k;
    for (let i = 0; i < k; i++) {
      [[-0.25, r], [-0.13, R], [0.13, R], [0.25, r]].forEach(([f, d]) => { const a = ((i + f) * step * Math.PI) / 180; p.push(`${n(cx + d * Math.cos(a))} ${n(cy + d * Math.sin(a))}`); });
    }
    return 'M' + p.join(' L') + ' Z';
  };
  const leaf = (x, y, rot, L = 5.4, W = 2.6) => {
    const t = (rot * Math.PI) / 180, cs = Math.cos(t), sn = Math.sin(t);
    const P = (u, v) => `${n(x + u * cs - v * sn)} ${n(y + u * sn + v * cs)}`;
    return `M${P(0, -L)} Q${P(W * 1.3, 0)} ${P(0, L)} Q${P(-W * 1.3, 0)} ${P(0, -L)} Z`;
  };
  const heart = (x, y, s) => {
    const P = (u, v) => `${n(x + u * s)} ${n(y + v * s)}`;
    return `M${P(0, 9)} C${P(-6, 5)} ${P(-9, 2)} ${P(-9, -1.6)} C${P(-9, -4.6)} ${P(-6.8, -6.8)} ${P(-4.2, -6.8)} C${P(-2.4, -6.8)} ${P(-0.8, -5.8)} ${P(0, -4.4)} C${P(0.8, -5.8)} ${P(2.4, -6.8)} ${P(4.2, -6.8)} C${P(6.8, -6.8)} ${P(9, -4.6)} ${P(9, -1.6)} C${P(9, 2)} ${P(6, 5)} ${P(0, 9)} Z`;
  };

  const P = {
    sun: ['#FFC83D', '#F29A0E', '#FFE58A'],
    coral: ['#FF5D7A', '#D63A5C', '#FFA3B4'],
    sky: ['#4FA8FF', '#2B6FDB', '#A8D3FF'],
    orchid: ['#C77DFF', '#8F48E6', '#E7C6FF'],
    mint: ['#34D399', '#0E9E6C', '#A3F0CD'],
    teal: ['#2CCFC0', '#0F948A', '#9DEDE5'],
    amber: ['#FFB547', '#E07A12', '#FFDA9C'],
    violet: ['#8B6CFF', '#5C40DE', '#C8BBFF'],
    tan: ['#D99A5B', '#A6672F', '#F3CB98'],
    slate: ['#8E96BC', '#5C6488', '#CBD0EA'],
    pink: ['#FF8FC7', '#DE559B', '#FFC8E3'],
  };
  const INK = '#2A2140', WHITE = '#FFFFFF', CREAM = '#FFF4E2';
  const F = (d, f, o, t) => ({ d, f, o, t });
  const S = (d, s, w, o, t) => ({ d, s, w, o, t });
  const FS = (d, f, w, o, t) => ({ d, f, s: f, w, o, t });
  const U = (d, w) => ({ d, s: 'currentColor', w: w || 3.4 });

  const I = {
    happy: () => { const [b, d, l] = P.sun; return [S(rays(24, 24, 17.5, 21.5, 8, 22.5), d, 3.2), F(c(24, 24, 13.5), b), S('M15.4 19.6 A9.6 9.6 0 0 1 21 13.8', l, 2.6), F(c(19.6, 22, 1.8), INK), F(c(28.4, 22, 1.8), INK), S('M18.6 27 Q24 32.4 29.4 27', INK, 2.2), F(e(16.3, 26.6, 2.1, 1.3), P.coral[2], 0.85), F(e(31.7, 26.6, 2.1, 1.3), P.coral[2], 0.85)]; },
    health: () => { const [b, d, l] = P.coral; return [F('M24 41 C12.5 33.5 5.5 26 5.5 17.8 C5.5 11.6 10.3 7 16.1 7 C19.6 7 22.4 8.8 24 11.6 C25.6 8.8 28.4 7 31.9 7 C37.7 7 42.5 11.6 42.5 17.8 C42.5 26 35.5 33.5 24 41 Z', b), F('M42.5 17.8 C42.5 26 35.5 33.5 24 41 C31 34 36.5 26.5 37.5 19.5 C38.2 14.2 35.8 9.6 32.2 7.6 C38 7.9 42.5 12.2 42.5 17.8 Z', d, 0.55), S('M10.5 15.5 C11 12.6 13 10.6 15.8 10.3', l, 2.4), S('M9 23 H16.5 L19.5 17 L24 29.5 L27.5 20.5 L29.5 24 H39', WHITE, 2.6)]; },
    smarts: () => { const [b, d, l] = P.sky; return [F('M23 9.5 C19.5 7 14 8 12.5 12.5 C8.5 13 6 17 7.5 21 C4.5 23.5 4.8 29 8.5 31 C8 35.5 11.5 39 16 38.5 C17.8 41.2 21 41.6 23 40 Z', b), F('M25 9.5 C28.5 7 34 8 35.5 12.5 C39.5 13 42 17 40.5 21 C43.5 23.5 43.2 29 39.5 31 C40 35.5 36.5 39 32 38.5 C30.2 41.2 27 41.6 25 40 Z', b), F('M25 26 C30 28 36 27 41.6 24.5 C42.6 27.4 41.8 30 39.5 31 C40 35.5 36.5 39 32 38.5 C30.2 41.2 27 41.6 25 40 Z', d, 0.35), S('M12.5 12.5 C14.5 13.5 15.5 15.5 15 18 M7.5 21 C10.5 20.5 13 22 13.5 25 M8.5 31 C11 30 14 30.5 15.5 33 M19 19.5 C21 21 21 24 19.5 26.5', d, 2), S('M35.5 12.5 C33.5 13.5 32.5 15.5 33 18 M40.5 21 C37.5 20.5 35 22 34.5 25 M39.5 31 C37 30 34 30.5 32.5 33 M29 19.5 C27 21 27 24 28.5 26.5', d, 2), S('M11 17 C11.4 15.4 12.4 14.2 14 13.6', l, 2)]; },
    looks: () => { const [b, d, l] = P.orchid; return [FS('M23 5 Q25 21.5 41 24 Q25 26.5 23 43 Q21 26.5 5 24 Q21 21.5 23 5 Z', b, 2), F('M23 24 L41 24 Q25 26.5 23 43 Z', d, 0.45), F('M23 24 L23 5 Q21 21.5 5 24 Z', l, 0.5), F(spark(38.5, 10.5, 6), P.sun[0]), F(c(10, 38, 2.2), l)]; },
    karma: () => { const [b, d, l] = P.teal; return [F(c(24, 24, 18), l), F('M24 6 A18 18 0 0 1 24 42 A9 9 0 0 1 24 24 A9 9 0 0 0 24 6 Z', d), F(c(24, 15, 3), d), F(c(24, 33, 3), l), S(c(24, 24, 18), d, 2)]; },
    fame: () => { const [b, d, l] = P.amber; return [FS(star(24, 25.5, 19, 8.6), b, 3), F(starRight(24, 25.5, 19, 8.6), d, 0.32), S('M17.5 18.5 L21 12.5', l, 2.2), F(spark(41, 8, 3.6), P.sun[2]), F(c(6.5, 9, 1.6), P.sun[2])]; },
    money: () => { const [b, d, l] = P.mint; return [F(rr(9, 8.5, 34, 22, 4), d, 1, 'rotate(-9 26 19.5)'), F(rr(5, 15, 38, 24, 4), b), S(rr(8.5, 18.5, 31, 17, 2.5), l, 1.5, 0.9), F(c(24, 27, 6), l), S(c(24, 27, 3.2), d, 1.6), F(c(12.5, 22.5, 1.6) + ' ' + c(35.5, 31.5, 1.6), l)]; },
    coin: () => { const [b, d, l] = P.sun; return [F(c(24, 26, 17), P.amber[1]), F(c(24, 23, 17), b), S(c(24, 23, 12.5), d, 1.8), F(star(24, 23, 7, 3.2), d, 0.85), S('M12.4 17.6 A12.5 12.5 0 0 1 18.6 11.6', l, 2.4)]; },
    career: () => { const [b, d, l] = P.tan; return [S('M18 15.5 V12 Q18 9.5 20.5 9.5 H27.5 Q30 9.5 30 12 V15.5', d, 3), F(rr(5, 15, 38, 26, 5.5), b), F('M5 27 Q24 32 43 27 V35.5 Q43 41 37.5 41 H10.5 Q5 41 5 35.5 Z', d, 0.4), F(rr(20, 24, 8, 7, 2), P.sun[0]), F(rr(22.5, 26.5, 3, 2, 0.8), d), S('M9.5 19.5 H15', l, 2.2)]; },
    school: () => { const [b, d, l] = P.sky; return [S('M19.5 11 V9.5 Q19.5 6.5 22.5 6.5 H25.5 Q28.5 6.5 28.5 9.5 V11', d, 2.6), F(rr(9, 10, 30, 32, 10), b), F('M9 21 Q9 10 19 10 H29 Q39 10 39 21 V22 Q24 26 9 22 Z', d, 0.3), F(rr(14.5, 27, 19, 11, 4), d, 0.55), S('M17.5 30.5 H30.5', l, 1.8), F(rr(22, 20, 4, 5, 1.2), P.sun[0]), S('M12.5 18 V33', l, 2, 0.7)]; },
    assets: () => { const [b, d, l] = P.coral; return [F(rr(31, 8, 6, 10, 1.5), d), F(rr(9.5, 20, 29, 21, 3), CREAM), F('M30 20 H35.5 Q38.5 20 38.5 23 V38 Q38.5 41 35.5 41 H30 Z', P.tan[2], 0.6), FS('M24 6.5 L43.5 23 H4.5 Z', b, 3.5), S('M10 20 L22.5 9.5', l, 2), F(rr(20, 28.5, 8, 12.5, 2.5), P.tan[0]), F(c(26, 35.5, 0.9), P.tan[1]), F(rr(12, 26, 6.5, 6.5, 1.5) + ' ' + rr(30, 26, 6.5, 6.5, 1.5), P.sky[2])]; },
    people: () => { const [b, d, l] = P.violet; return [F(c(31.5, 15, 6), l), F('M20.5 41 C20.5 31 25.5 25 31.5 25 C37.5 25 42.5 31 42.5 41 Z', l), F(c(18.5, 17, 7.3), b), F('M5 43 C5 32 11 26.5 18.5 26.5 C26 26.5 32 32 32 43 Z', b), S('M13.6 14.2 Q15 11.6 17.8 11', l, 2), S('M9.5 36 Q10.5 32 13.5 30', l, 2, 0.8)]; },
    activities: () => { const [b, d] = P.coral; return [F(c(22, 26, 17), b), F(c(22, 26, 12.2), CREAM), F(c(22, 26, 7.6), b), F(c(22, 26, 3.2), CREAM), S('M22.5 25.5 L38 10', P.slate[0], 2.6), F('M38 10 L36 4.5 L41 7 Z', P.violet[0]), F('M38 10 L43.5 12 L41 7 Z', P.violet[1]), S('M9 21 A13.5 13.5 0 0 1 14 14.5', P.coral[2], 2, 0.9)]; },
    mind: () => { const [b, d, l] = P.pink; return [F('M24 37 C14 37.5 6 33.5 3.5 27 C11 25 19 28 24 37 Z M24 37 C34 37.5 42 33.5 44.5 27 C37 25 29 28 24 37 Z', d), F('M24 37 C15 34 10.5 26 11 16.5 C18 19 23 27 24 37 Z M24 37 C33 34 37.5 26 37 16.5 C30 19 25 27 24 37 Z', b), F('M24 8 C30 14 31 28 24 37 C17 28 18 14 24 8 Z', l), F('M24 8 C30 14 31 28 24 37 Z', b, 0.45), S('M8 42 Q16 39 24 42 T40 42', P.teal[0], 2.4)]; },
    medical: () => { const [b, d, l] = P.coral; return [S('M18 13 V10 Q18 7.5 20.5 7.5 H27.5 Q30 7.5 30 10 V13', P.slate[1], 2.8), F(rr(5, 13, 38, 28, 6), b), F('M5 31 H43 V35 Q43 41 37 41 H11 Q5 41 5 35 Z', d, 0.45), FS('M20.5 19.5 H27.5 V24 H32 V31 H27.5 V35.5 H20.5 V31 H16 V24 H20.5 Z', WHITE, 1.5), S('M9.5 18 H14', l, 2.2)]; },
    love: () => { const [b, d, l] = P.pink; return [F(rr(4.5, 12, 39, 27, 4.5), l), S('M6.5 37 L19 26.5 M41.5 37 L29 26.5', b, 1.8), F('M5.5 14 L24 28.5 L42.5 14 Q42 12 39.5 12 H8.5 Q6 12 5.5 14 Z', b), F(heart(24, 26.6, 0.8), P.coral[0]), S('M19.4 23.9 Q19.9 22.9 21 22.8', P.coral[2], 1.4)]; },
    party: () => [FS('M6 42 L15.5 17.5 L30.5 32.5 Z', P.sun[0], 2), S('M10.3 32.7 L15.3 37.7 M13.2 25.4 L22.6 34.8', P.coral[0], 2.6), S('M15.5 17.5 L30.5 32.5', P.sun[1], 2.6), S('M21 16 C21.5 11 26 12 27 7.5', P.violet[0], 2.4), S('M31.5 26 C35 23 39 26.5 42.5 23.5', P.sky[0], 2.4), F(c(36, 13, 2), P.mint[0]), F(rr(30, 3.5, 3.6, 3.6, 0.8), P.coral[0], 1, 'rotate(20 31.8 5.3)'), F(c(41.5, 33, 1.8), P.sun[0]), F(c(26.5, 19.5, 1.4), P.pink[0]), F(rr(39.5, 15.5, 3.2, 3.2, 0.8), P.violet[2], 1, 'rotate(-20 41 17)')],
    paw: () => { const [b, d, l] = P.tan; return [F('M24 42 C17.5 42 12.5 38.2 12.5 33.2 C12.5 27.6 17.6 23.5 24 23.5 C30.4 23.5 35.5 27.6 35.5 33.2 C35.5 38.2 30.5 42 24 42 Z', b), F(e(11.5, 21.5, 4.2, 5.4), b, 1, 'rotate(-25 11.5 21.5)'), F(e(19.5, 12.5, 4.4, 5.7), b, 1, 'rotate(-8 19.5 12.5)'), F(e(28.5, 12.5, 4.4, 5.7), b, 1, 'rotate(8 28.5 12.5)'), F(e(36.5, 21.5, 4.2, 5.4), b, 1, 'rotate(25 36.5 21.5)'), F('M35.5 33.2 C35.5 38.2 30.5 42 24 42 C29 39.5 32 36 32.6 31 Z', d, 0.4), S('M17.5 31 Q18.5 28 21.5 27 M17.6 10 Q18.4 8.6 19.8 8.3', l, 2)]; },
    clover: () => { const [b, d, l] = P.mint; const lf = 'M24 24 C19 20.5 15.5 17.5 15.5 13.5 C15.5 10.6 17.7 8.5 20.2 8.5 C21.9 8.5 23.3 9.4 24 10.8 C24.7 9.4 26.1 8.5 27.8 8.5 C30.3 8.5 32.5 10.6 32.5 13.5 C32.5 17.5 29 20.5 24 24 Z'; return [S('M24 25 C25 32 28 38 34 43', d, 3), F(lf, b), F(lf, b, 1, 'rotate(90 24 24)'), F(lf, b, 1, 'rotate(180 24 24)'), F(lf, b, 1, 'rotate(270 24 24)'), F(lf, d, 0.3, 'rotate(90 24 24)'), F(lf, d, 0.3, 'rotate(180 24 24)'), S('M24 22 V12.5', d, 1.4, 0.6), S('M24 22 V12.5', d, 1.4, 0.6, 'rotate(90 24 24)'), S('M24 22 V12.5', d, 1.4, 0.6, 'rotate(180 24 24)'), S('M24 22 V12.5', d, 1.4, 0.6, 'rotate(270 24 24)'), S('M18 11.8 Q18.8 10.6 20.2 10.4', l, 1.8), F(c(24, 24, 2), d)]; },
    bag: () => { const [b, d, l] = P.pink; return [S('M17 19 V14 Q17 7.5 24 7.5 Q31 7.5 31 14 V19', d, 2.8), FS('M8.5 16.5 H39.5 L37.6 40 Q37.3 43 34.3 43 H13.7 Q10.7 43 10.4 40 Z', b, 1.5), F('M31.5 16.5 H39.5 L37.6 40 Q37.3 43 34.3 43 H31.5 Z', d, 0.32), F(c(17, 20, 1.6) + ' ' + c(31, 20, 1.6), d), F(heart(24, 29.5, 0.55), WHITE, 0.92), S('M12.6 22 V36', l, 2, 0.8)]; },
    plane: () => { const r = 'rotate(45 24 24)'; return [F('M24 17.5 L42.5 27 Q43.5 27.6 43.5 28.7 V30.5 L24 25.5 L4.5 30.5 V28.7 Q4.5 27.6 5.5 27 Z', P.sky[0], 1, r), F('M24 35 L31.5 39.5 V42 L24 40 L16.5 42 V39.5 Z', P.sky[1], 1, r), F('M24 3.5 C26.5 3.5 27.5 7 27.5 11 V36 C27.5 40 26 43.5 24 44 C22 43.5 20.5 40 20.5 36 V11 C20.5 7 21.5 3.5 24 3.5 Z', '#F5F8FF', 1, r), F('M24 3.5 C26.5 3.5 27.5 7 27.5 11 V36 C27.5 40 26 43.5 24 44 Z', P.slate[2], 0.55, r), F('M22.2 10.5 Q24 7 25.8 10.5 Z', P.sky[1], 1, r)]; },
    megaphone: () => { const [b, d, l] = P.amber; return [F(rr(13.5, 28, 5.5, 10.5, 2.4), P.slate[1]), F(rr(5, 18, 7, 12, 2.5), d), F('M11 18.5 L33 8.5 Q35 7.6 35 9.8 V38.2 Q35 40.4 33 39.5 L11 29.5 Z', b), F('M11 24 H35 V38.2 Q35 40.4 33 39.5 L11 29.5 Z', d, 0.32), F(e(35, 24, 3.2, 14.5), d), S('M15 18.5 L28 12.6', l, 2), S('M40 17 Q43 24 40 31', P.coral[0], 2.4), S('M43 13 Q47 24 43 35', P.coral[2], 2.2)]; },
    mask: () => [S('M5 21 C2.5 22 2 25 3 27 M43 21 C45.5 22 46 25 45 27', P.violet[2], 1.8), { d: 'M4.5 21 C4.5 15.5 9 13.5 15 14 C19 14.4 22 16.4 24 18.6 C26 16.4 29 14.4 33 14 C39 13.5 43.5 15.5 43.5 21 C43.5 28.5 38.5 33.5 31.5 33.5 C27.8 33.5 25.4 31 24 28.4 C22.6 31 20.2 33.5 16.5 33.5 C9.5 33.5 4.5 28.5 4.5 21 Z ' + e(15.5, 22.5, 4.6, 3.3) + ' ' + e(32.5, 22.5, 4.6, 3.3), f: '#463A78', s: P.violet[2], w: 1.4, r: 'evenodd' }, S('M8.5 18.5 Q11 16.3 15 16.3', P.violet[2], 2, 0.9), S('M28 17 Q30 16.2 33 16.2', P.violet[2], 1.6, 0.7)],
    scroll: () => { const [b, d] = P.tan; return [F(rr(10, 8.5, 26, 31, 2.5), '#FBE9C8'), S('M15 16 H31 M15 21 H31 M15 26 H26', b, 1.8), F(rr(7.5, 5.5, 31, 6.5, 3.25), b), F(rr(9.5, 36, 31, 6.5, 3.25), b), F(c(9.5, 8.75, 2.2) + ' ' + c(38.5, 39.25, 2.2), d), F('M30 36 L28.5 43 L31.5 41.5 L33 44 L34.5 37 Z', P.coral[1]), F(c(33, 32, 5.5), P.coral[0]), F(star(33, 32, 2.9, 1.3), P.coral[2])]; },
    dice: () => { const [b, d, l] = P.violet; return [FS('M24 5 L41.5 14 L24 23 L6.5 14 Z', l, 2.5), FS('M6.5 14 L24 23 V43 L6.5 34 Z', b, 2.5), FS('M41.5 14 L24 23 V43 L41.5 34 Z', d, 2.5), F(e(24, 14, 2.7, 1.5), WHITE), F(e(10.9, 22.3, 1.5, 2.1) + ' ' + e(19.6, 34.8, 1.5, 2.1), WHITE, 0.95), F(e(28.4, 25.8, 1.5, 2.1) + ' ' + e(32.8, 28.5, 1.5, 2.1) + ' ' + e(37.1, 31.3, 1.5, 2.1), WHITE, 0.9)]; },
    wand: () => [S('M8 40 L26 22', P.violet[0], 4.4), S('M9.5 37 L14 32.5', P.violet[2], 1.4, 0.8), S('M23 25 L26 22', WHITE, 4.4), FS(star(31.5, 16.5, 9, 4.1), P.sun[0], 2.2), F(starRight(31.5, 16.5, 9, 4.1), P.sun[1], 0.3), F(c(29.4, 13.8, 1.3), P.sun[2]), F(spark(41, 31, 4), P.sun[2]), F(spark(17, 8.5, 3.4), P.violet[2]), F(c(42, 7, 1.6), P.pink[0])],
    trophy: () => { const [b, d, l] = P.sun; return [S('M14 12 H9.5 Q6.5 12 6.5 15.5 Q6.5 21 13.5 22.5 M34 12 H38.5 Q41.5 12 41.5 15.5 Q41.5 21 34.5 22.5', d, 2.6), FS('M13 7 H35 V17 Q35 28 24 28 Q13 28 13 17 Z', b, 2), F('M27.5 7 H35 V17 Q35 28 24 28 Q29.5 25.5 30.5 17 Q31 11 27.5 7 Z', d, 0.4), F('M21.5 27.5 H26.5 L27.5 33.5 H20.5 Z', d), F(rr(13.5, 33, 21, 8.5, 2.5), P.violet[0]), F(rr(19, 35.8, 10, 3, 1), P.violet[2]), F(star(23.5, 16, 4.6, 2.1), l), S('M17 10.5 V17', l, 2.2)]; },
    laurel: () => {
      const [b, d, l] = P.amber; const outer = [], inner = [];
      [104, 128, 152, 176, 200, 224].forEach((a) => { const t = (a * Math.PI) / 180; outer.push(leaf(24 + 16 * Math.cos(t), 22 + 16 * Math.sin(t), a - 30)); });
      [116, 140, 164, 188, 212].forEach((a) => { const t = (a * Math.PI) / 180; inner.push(leaf(24 + 12 * Math.cos(t), 22 + 12 * Math.sin(t), a + 30, 4.6, 2.2)); });
      const flip = (d) => d.replace(/(-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)/g, (m, x, y) => `${n(48 - Number(x))} ${y}`);
      const O = outer.join(' '), In = inner.join(' ');
      return [S('M20.7 36.1 A14.5 14.5 0 0 1 14.7 10.9 M27.3 36.1 A14.5 14.5 0 0 0 33.3 10.9', d, 1.8), F(O + ' ' + flip(O), b), F(In + ' ' + flip(In), l), F('M18.5 38.5 L24 35.5 L29.5 38.5 L28 43.5 L24 40.8 L20 43.5 Z', P.coral[0]), F(star(24, 22, 6.5, 3), P.sun[0])];
    },
    gear: () => { const [b, d, l] = P.slate; return [{ d: gear(24, 24, 20, 15.5, 8) + ' ' + c(24, 24, 6.5), f: b, s: b, w: 1.6, r: 'evenodd' }, { d: c(24, 24, 11.5) + ' ' + c(24, 24, 6.5), f: l, r: 'evenodd' }, S(c(24, 24, 6.5), P.violet[0], 2.8), S('M14.5 16 A11.5 11.5 0 0 1 19 13', WHITE, 2, 0.7)]; },
    crown: () => { const [b, d, l] = P.sun; return [FS('M6.5 17.5 L15.5 26 L24 11.5 L32.5 26 L41.5 17.5 L38 37 H10 Z', b, 3), F('M24 11.5 L32.5 26 L41.5 17.5 L38 37 H24 Z', d, 0.28), F(rr(9, 32.5, 30, 7.5, 2.5), d), F(c(24, 36.25, 2.4), P.coral[0]), F(c(15.5, 36.25, 1.8), P.sky[0]), F(c(32.5, 36.25, 1.8), P.mint[0]), F(c(6.5, 15.8, 2.6) + ' ' + c(24, 9.6, 2.8) + ' ' + c(41.5, 15.8, 2.6), l)]; },
    hourglass: () => [F('M13 9 H35 C35 18 28.5 21 26.5 24 C28.5 27 35 30 35 39 H13 C13 30 19.5 27 21.5 24 C19.5 21 13 18 13 9 Z', P.sky[2], 0.55), F('M16 12 H32 C31 17.5 26.5 20 24 22.5 C21.5 20 17 17.5 16 12 Z', P.sun[0]), S('M24 22.5 V31', P.sun[0], 1.4), F('M15.5 38 C16.5 32.5 21 31 24 30.5 C27 31 31.5 32.5 32.5 38 Z', P.sun[0]), F('M24 30.5 C27 31 31.5 32.5 32.5 38 H24 Z', P.sun[1], 0.35), S('M12 10 V38 M36 10 V38', P.tan[0], 2), F(rr(9.5, 5, 29, 5, 2.5) + ' ' + rr(9.5, 38, 29, 5, 2.5), P.tan[1]), S('M16.5 14.5 Q17 18 19.5 20.5', WHITE, 1.4, 0.75)],
    tree: () => { const [b, d, l] = P.mint; return [F('M21.5 28 H26.5 L27.5 42 H20.5 Z', P.tan[1]), S('M24 33 L18.5 27.5 M24 31 L29.5 26', P.tan[1], 2.2), F(c(24, 16, 11) + ' ' + c(14, 22, 8) + ' ' + c(34, 22, 8) + ' ' + c(24, 24, 9), b), F(c(34, 23, 6.2) + ' ' + c(26, 27.5, 5), d, 0.35), F(c(19, 12.5, 3.2), l, 0.85), F(c(11.5, 20.5, 2), l, 0.7), F(c(28.5, 14.5, 1.9), P.coral[0]), F(c(16.5, 24.5, 1.7), P.coral[0]), F(c(31.5, 25, 1.7), P.sun[0]), S('M14 43 H34', d, 2.4)]; },
    cake: () => { const [b, d, l] = P.pink; return [F(e(24, 41.5, 18, 2.8), P.slate[2]), F(rr(8, 23, 32, 18, 4), l), F(rr(8, 33.5, 32, 3, 0.5), b, 0.55), F('M8 27 Q8 23 12 23 H36 Q40 23 40 27 V28.5 Q38 31.5 36 28.5 Q34 25.5 32 28.5 Q30 31.5 28 28.5 Q26 25.5 24 28.5 Q22 31.5 20 28.5 Q18 25.5 16 28.5 Q14 31.5 12 28.5 Q10 25.5 8 28.5 Z', b), F(rr(15, 13, 3.5, 10, 1), P.sky[0]), F(rr(22.25, 11, 3.5, 12, 1), P.sun[0]), F(rr(29.5, 13, 3.5, 10, 1), P.mint[0]), F('M16.75 6 C18.9 8.8 18.7 11.5 16.75 11.8 C14.8 11.5 14.6 8.8 16.75 6 Z M24 4 C26.2 6.8 26 9.5 24 9.8 C22 9.5 21.8 6.8 24 4 Z M31.25 6 C33.4 8.8 33.2 11.5 31.25 11.8 C29.3 11.5 29.1 8.8 31.25 6 Z', P.amber[0]), F(c(16.75, 10.2, 0.9) + ' ' + c(24, 8.2, 0.9) + ' ' + c(31.25, 10.2, 0.9), P.sun[2])]; },
    gradcap: () => { const [b, d, l] = P.violet; return [F('M12.5 21 V30.5 C12.5 35.5 35.5 35.5 35.5 30.5 V21 L24 26.5 Z', '#4A33B8'), F('M24 26.5 L35.5 21 V30.5 C35.5 32.5 31 34 26 34.3 Z', '#3A2898', 0.6), FS('M24 9 L45 18.5 L24 28 L3 18.5 Z', d, 2), S('M10 18.5 L24 12.2', l, 1.6, 0.6), F(c(24, 18.5, 1.8), P.sun[0]), S('M24 18.5 L38.5 22 V31', P.sun[0], 1.8), F('M37 30.5 H40 L41 37 H36 Z', P.sun[0])]; },
    piggy: () => { const [b, d, l] = P.pink; return [F(rr(12, 34, 5, 8, 2) + ' ' + rr(27, 34, 5, 8, 2), d), S('M7.5 25 C4 24 4 20 7 20.5', d, 1.8), F(e(23, 27, 16, 12.5), b), FS('M14 17 L16 9.5 L22 15.5 Z', d, 1.5), F(e(38.5, 28, 4.6, 4), l), F(e(37.2, 28, 0.9, 1.3) + ' ' + e(39.8, 28, 0.9, 1.3), d), F(c(31, 23.5, 1.5), INK), S('M18 16.2 H26', d, 2), F(c(22, 8, 4.6), P.sun[0]), S(c(22, 8, 2.6), P.sun[1], 1.2), S('M13 22 Q15.5 18.5 20 17.8', l, 2.2)]; },
    car: () => { const [b, d, l] = P.coral; return [F('M5.5 31 C5.5 27 7.5 25 11.5 24.2 L15.8 16.2 C16.8 14.2 18.6 13 21 13 H30 C32.2 13 34 14.2 35 16.2 L38.8 24 C42 24.6 43.5 26.8 43.5 30 V33.5 Q43.5 35.5 41.5 35.5 H7.5 Q5.5 35.5 5.5 33.5 Z', b), F('M18.6 16.6 Q19.2 15.5 20.5 15.5 H23.5 V23.8 H14.8 Z M26 15.5 H29.6 Q31 15.5 31.7 16.7 L35.2 23.8 H26 Z', P.sky[2]), S('M7 28.5 H42', d, 1.4, 0.6), F(rr(39, 26.5, 4, 2.6, 1.2), P.sun[0]), F(rr(5.5, 26.5, 2.5, 2.6, 1), d), F(c(14, 35.5, 5.2) + ' ' + c(34.5, 35.5, 5.2), INK), F(c(14, 35.5, 2.2) + ' ' + c(34.5, 35.5, 2.2), P.slate[2]), S('M20 14.8 H29', l, 1.6)]; },
    ring: () => [S(c(24, 30, 11.5), P.sun[1], 4.2), S('M14 26 A11.5 11.5 0 0 1 20 19.8', P.sun[2], 1.6), F('M21 18.5 H27 L26 21.5 H22 Z', P.sun[1]), FS('M16.5 11 L20.5 5.5 H27.5 L31.5 11 L24 19.5 Z', P.sky[2], 1.4), F('M16.5 11 H31.5 L24 19.5 Z', P.sky[0], 0.55), S('M20.5 5.5 L22 11 L24 5.5 L26 11 L27.5 5.5', WHITE, 1, 0.75), F(spark(37, 7, 3.4), WHITE)],
    rattle: () => [S('M27 27 L38.5 38.5', P.sky[0], 5), S(c(40.5, 40.5, 3.6), P.sky[1], 2.4), F(c(19.5, 19.5, 12.5), P.sun[0]), S('M8.2 16 Q19.5 11 30.8 16 M8.2 23 Q19.5 28 30.8 23', P.coral[0], 2.6), F(c(19.5, 19.5, 2.4), P.coral[2]), S('M12 13.5 Q14.5 10.5 18 10', P.sun[2], 2.2)],
    dove: () => [F('M22 22 C20 14 22 7 29 3.5 C29.5 11 28.5 17 26 22 Z', P.slate[2]), F('M7 27 C11 24 17 22.5 24 23 C28 23.3 30.5 22 32.5 19.5 C34 17.5 36.5 16.5 39 17.2 C41 17.8 42 19.3 42 20.5 L42 23 C41.5 25 40 26.5 38 28 C34 33 27 36.5 19 36.5 C14.5 36.5 11 35 8.5 33 L3.5 34.5 L6 30 Z', WHITE), S('M7 27 C11 24 17 22.5 24 23 C28 23.3 30.5 22 32.5 19.5 C34 17.5 36.5 16.5 39 17.2 C41 17.8 42 19.3 42 20.5 L42 23 C41.5 25 40 26.5 38 28 C34 33 27 36.5 19 36.5 C14.5 36.5 11 35 8.5 33 L3.5 34.5 L6 30 Z', P.slate[0], 1.2, 0.6),F('M8.5 33 C11 35 14.5 36.5 19 36.5 C27 36.5 34 33 38 28 C32 31 24 33 16 32 Z', P.slate[2], 0.7), F('M15 26 C13 17.5 16 9.5 24.5 5 C25 13 23.5 20.5 20.5 27 Z', '#E3EAFF'), S('M17.5 22 C17.5 17 19 13 22 9.5', P.sky[0], 1.2, 0.6), F(c(38.2, 20.2, 1.1), INK), F('M42 19.8 L45.5 21.6 L42 23.2 Z', P.amber[0]), S('M41 26 C37 30 33 32 29 33', P.mint[1], 1.6), F(leaf(35, 29.4, 60, 2.8, 1.3) + ' ' + leaf(31.4, 31.6, 70, 2.8, 1.3), P.mint[0])],
    prison: () => { const [b, d, l] = P.slate; return [F(rr(7, 6, 34, 36, 6), d), F(rr(11, 10, 26, 28, 3), '#2A2148'), F(c(30.5, 17, 3.4), P.sun[2]), F(c(32, 15.8, 2.6), '#2A2148'), F(rr(15.2, 8, 3.2, 32, 1.6) + ' ' + rr(22.4, 8, 3.2, 32, 1.6) + ' ' + rr(29.6, 8, 3.2, 32, 1.6), l), F(rr(9, 22.5, 30, 3.4, 1.7), b)]; },
    globe: () => { const [b, d, l] = P.sky; return [F(c(24, 24, 18), b), F('M14 11 C18 9 22 10 23 13 C24 16 21 17 19 19 C17 21 18 24 15.5 25.5 C13 27 10.5 25 9 22 C7.6 19 9 14.5 14 11 Z M27 21 C30 19 34 20 35.5 23 C37 26 36 30 33 33 C30.5 35.5 29 38 26.5 37.5 C24.5 37 25 33 25.5 30 C26 27 24.5 23.5 27 21 Z M31 9.5 C34 9.5 37.5 11.5 38.5 14 C36 14.5 33 14 31 12.5 Z', P.mint[0]), F('M24 6 A18 18 0 0 1 24 42 A13 18 0 0 0 24 6 Z', d, 0.32), S('M10.6 15.4 A15.5 15.5 0 0 1 16.4 9.6', l, 2)]; },
    logo: () => [F(rr(2, 2, 44, 44, 14), '#6C4FF6'), F('M2 30 V32 Q2 46 16 46 H32 Q46 46 46 32 V30 Z', '#5A3DE8', 0.6), F(rr(13, 31, 7, 7, 1.6) + ' ' + rr(28, 31, 7, 7, 1.6), WHITE), F(rr(20.5, 31, 7, 7, 1.6), '#C8BBFF'), S('M24 31 C24 26 23.5 22.5 21.5 19', P.mint[2], 2.4), F('M22.5 20.5 C17 21 12.5 18 11.5 12.5 C17 12 21.5 15 22.5 20.5 Z', P.mint[0]), F('M23 18 C23.5 11.5 28 7.5 34.5 7.5 C34.5 14 30 18 23 18 Z', P.mint[2]), S('M21.4 19.4 L14.6 14 M24.4 16.6 L31.6 10.2', P.mint[1], 1, 0.7)],

    heartbreak: () => { const [b, d, l] = P.coral; const hp = 'M24 41 C12.5 33.5 5.5 26 5.5 17.8 C5.5 11.6 10.3 7 16.1 7 C19.6 7 22.4 8.8 24 11.6 C25.6 8.8 28.4 7 31.9 7 C37.7 7 42.5 11.6 42.5 17.8 C42.5 26 35.5 33.5 24 41 Z'; return [F(hp, b), F('M42.5 17.8 C42.5 26 35.5 33.5 24 41 C31 34 36.5 26.5 37.5 19.5 C38.2 14.2 35.8 9.6 32.2 7.6 C38 7.9 42.5 12.2 42.5 17.8 Z', d, 0.55), S('M24 11.6 L20.5 19 L26.5 24 L21.5 31 L24 41', '#4A1428', 2.6), S('M10.5 15.5 C11 12.6 13 10.6 15.8 10.3', l, 2.4)]; },
    cards: () => [F(rr(8, 10, 21, 29, 3.5), P.violet[0], 1, 'rotate(-12 18.5 24.5)'), S('M12 15 L25 34', P.violet[2], 1.4, 0.6, 'rotate(-12 18.5 24.5)'), F(rr(19, 9, 21, 29, 3.5), WHITE, 1, 'rotate(9 29.5 23.5)'), F(heart(29.5, 23.5, 0.62), P.coral[0], 1, 'rotate(9 29.5 23.5)'), F(c(23.5, 13.5, 1.6) + ' ' + c(35.5, 33.5, 1.6), P.coral[0], 1, 'rotate(9 29.5 23.5)')],
    music: () => { const [b, d, l] = P.violet; return [F('M19 12 L39 7 V14 L19 19 Z', d), S('M19 13 V34 M39 8 V30', d, 3), F(e(14, 35, 6, 4.6), b, 1, 'rotate(-18 14 35)'), F(e(34, 31, 6, 4.6), b, 1, 'rotate(-18 34 31)'), S('M10.5 33 Q12 30.5 15 30.5', l, 1.8)]; },
    palette: () => [{ d: 'M24 6 C35 6 43 13 43 22 C43 28 38 30 34 29 C30 28 28 31 29 34 C30 38 28 42 22 42 C12 42 5 34 5 24 C5 13 13 6 24 6 Z ' + e(31, 35.5, 2.6, 2.1), f: P.tan[2], r: 'evenodd' }, F(c(14, 21, 3.6), P.coral[0]), F(c(22, 13, 3.4), P.sun[0]), F(c(32, 14.5, 3.4), P.mint[0]), F(c(13, 31, 3.4), P.sky[0]), F(c(37.5, 22, 2.6), P.violet[0]), S('M9 17 Q10 12 14 10', WHITE, 1.6, 0.6)],
    plate: () => [S('M5 9 V22 M3 9 V16 M7 9 V16 M5 22 V40', P.slate[1], 2.2), S('M43 9 C46 14 46 21 43 23 V40', P.slate[1], 2.4), F(c(24, 25, 15), P.slate[2]), F(c(24, 25, 11), WHITE), F('M17 24 C17 19 21 17 25 18 C30 17 32 21 31 25 C33 29 30 33 25 32 C20 34 16 30 17 24 Z', '#FFF7E8'), F(c(24.5, 25, 4.4), P.sun[0]), F(c(23.2, 23.7, 1.3), P.sun[2])],
    dumbbell: () => [S('M12 24 H36', P.slate[1], 3.6), F(rr(6, 13, 7, 22, 2.5) + ' ' + rr(35, 13, 7, 22, 2.5), P.coral[0]), F(rr(12, 17, 4, 14, 1.6) + ' ' + rr(32, 17, 4, 14, 1.6), P.coral[1]), F(rr(2.5, 19, 4.5, 10, 1.5) + ' ' + rr(41, 19, 4.5, 10, 1.5), P.slate[0]), S('M8.5 16 V22', P.coral[2], 1.6, 0.8)],
    phone: () => [F(rr(13, 3.5, 22, 41, 5), '#3A3060'), F(rr(15.5, 8.5, 17, 29, 2), P.sky[0]), F('M15.5 8.5 H24 L15.5 21 Z', P.sky[2], 0.45), F(rr(18, 12, 4.5, 4.5, 1.2), P.coral[0]), F(rr(25.5, 12, 4.5, 4.5, 1.2), P.sun[0]), F(rr(18, 19, 4.5, 4.5, 1.2), P.mint[0]), F(rr(25.5, 19, 4.5, 4.5, 1.2), P.violet[2]), F(rr(21, 5.4, 6, 1.6, 0.8), '#1A1530'), S('M21 41 H27', P.slate[2], 1.6)],
    laptop: () => [F(rr(8, 8, 32, 23, 3), '#3A3060'), F(rr(10.5, 10.5, 27, 18, 1.5), P.sky[0]), S('M14 15.5 H23 M14 19.5 H29 M14 23.5 H20', WHITE, 1.8, 0.85), F('M2.5 33 H45.5 L42.5 38.5 Q41.8 39.5 40.2 39.5 H7.8 Q6.2 39.5 5.5 38.5 Z', P.slate[0]), S('M20 35.5 H28', P.slate[2], 1.6)],
    flask: () => { const g = 'M19.5 6 H28.5 V18 L39 37 Q41 42 36 42 H12 Q7 42 9 37 L19.5 18 Z'; return [F(g, P.sky[2], 0.5), F('M14.6 28 H33.4 L39 37 Q41 42 36 42 H12 Q7 42 9 37 Z', P.mint[0]), F(c(20, 35, 1.8) + ' ' + c(27, 32, 1.3) + ' ' + c(29, 38, 1.5), P.mint[2]), S(g, P.sky[1], 1.4, 0.8), F(rr(17.5, 4, 13, 4, 2), P.slate[1]), S('M22.5 11 V17', WHITE, 1.6, 0.6)]; },
    rocket: () => [F('M15 22 L8 32 V37 L15 31 Z M33 22 L40 32 V37 L33 31 Z', P.coral[0]), F('M24 3.5 C31 9 34 18 33 30 H15 C14 18 17 9 24 3.5 Z', '#F4F1EA'), F('M24 3.5 C31 9 34 18 33 30 H24 Z', P.slate[2], 0.6), F(c(24, 16.5, 4.2), P.sky[0]), S(c(24, 16.5, 4.2), P.slate[1], 1.6), F(rr(18, 30, 12, 4, 1.5), P.slate[1]), F('M18 34 H30 C30 39 27 43 24 45.5 C21 43 18 39 18 34 Z', P.amber[0]), F('M21 34 H27 C27 37 25.5 40 24 41.5 C22.5 40 21 37 21 34 Z', P.sun[2])],
    scales: () => [S('M24 8 V40', P.tan[1], 2.8), F(rr(14, 39, 20, 4.5, 2), P.tan[1]), S('M7 14 H41', P.sun[1], 2.6), F(c(24, 9.5, 2.8), P.sun[0]), S('M7 14 L3 28 M7 14 L11 28 M41 14 L37 28 M41 14 L45 28', P.sun[1], 1.2), F('M2 28 H12 Q12 33.5 7 33.5 Q2 33.5 2 28 Z M36 28 H46 Q46 33.5 41 33.5 Q36 33.5 36 28 Z', P.sun[0])],
    columns: () => [FS('M24 5 L43 15 H5 Z', P.slate[2], 2), F(rr(6, 15, 36, 4, 1), P.slate[0]), F(rr(9, 19, 5, 17, 1) + ' ' + rr(17.3, 19, 5, 17, 1) + ' ' + rr(25.7, 19, 5, 17, 1) + ' ' + rr(34, 19, 5, 17, 1), '#F4F1EA'), F(rr(5, 36, 38, 4, 1) + ' ' + rr(3, 40, 42, 4, 1.5), P.slate[0]), F(c(24, 11, 1.8), P.sun[0])],
    flame: () => [F('M24 4 C30 12 38 18 38 28 C38 37 31 44 24 44 C17 44 10 37 10 28 C10 22 14 17 17 14 C17 20 19 23 22 24 C21 17 21 10 24 4 Z', P.coral[0]), F('M24 20 C28 25 32 29 32 34 C32 39 28 43 24 43 C20 43 16 39 16 34 C16 30 19 27 21 26 C21 30 23 31 24 31 C24 27 23 24 24 20 Z', P.amber[0]), F('M24 32 C26.5 35 28 37 28 39 C28 41.5 26 43 24 43 C22 43 20 41.5 20 39 C20 37 22 35 24 32 Z', P.sun[2])],
    key: () => { const t = 'rotate(-35 24 24)'; return [{ d: c(14, 24, 9) + ' ' + c(14, 24, 3.6), f: P.sun[0], r: 'evenodd', t }, F(rr(21, 21.5, 23, 5, 2), P.sun[0], 1, t), F(rr(35, 25.5, 4, 6, 1) + ' ' + rr(40, 25.5, 3, 4.5, 1), P.sun[0], 1, t), S('M8.5 19 A7 7 0 0 1 13 16', P.sun[2], 2, 0.9, t), S('M21 26.5 H44', P.sun[1], 1.2, 0.6, t)]; },
    gift: () => [F(rr(8, 20, 32, 22, 3), P.coral[0]), F(rr(6, 14, 36, 8, 2.5), P.coral[1]), F(rr(21, 14, 6, 28, 0.5), P.sun[0]), F('M24 14 C20 6 12 7 14 12 C15 14 20 14 24 14 Z M24 14 C28 6 36 7 34 12 C33 14 28 14 24 14 Z', P.sun[0]), S('M24 14 L19 10 M24 14 L29 10', P.sun[1], 1.4, 0.8), S('M10.5 24 V37', P.coral[2], 1.8, 0.7)],
    drink: () => [F('M9 8 H39 L24 25 Z', P.sky[2], 0.55), F('M13.5 12 H34.5 L24 23.6 Z', P.pink[0]), S('M9 8 H39', WHITE, 1.4, 0.8), S('M24 25 V40', P.slate[2], 2.4), F(e(24, 41, 9, 2.6), P.slate[2]), S('M31 10 L37 3', P.tan[1], 1.6), F(c(31, 10, 3), P.coral[0])],
    handshake: () => [F('M2 17 L13 13 L19 20 L12 28 L2 26 Z', P.sky[0]), F('M46 17 L35 13 L29 20 L36 28 L46 26 Z', P.violet[0]), F('M35 14 C31 12 27 13 24 15 L19 18.5 C17 20 19 22.5 21.5 21.5 L26 18.8 L32 24.5 L36 27.5 Z', '#9A6340'), F('M13 13.5 C17 11.8 21 12.8 24 15 L31 21 C33 23 31 26 28 24 L26.5 23 C27.5 25.5 25 27.5 23 25.8 C23.5 28.3 21 29.6 19 28 C19 30.3 16.5 31 15 29.4 L12 27.6 Z', '#E9BB94'), S('M23 25.8 L20.5 23.5 M19 28 L17 26', '#C99872', 1.2)],
    bulb: () => [F('M24 4.5 C32 4.5 37 10.5 37 18 C37 24 33 27 31 31 V34 H17 V31 C15 27 11 24 11 18 C11 10.5 16 4.5 24 4.5 Z', P.sun[0]), F('M31 31 V34 H24 V12 C30 14 34 18 33 23 C32.5 26 31.5 28.5 31 31 Z', P.amber[0], 0.4), S('M16.5 13 C17.5 10 19.5 8.6 22 8', P.sun[2], 2.2), S('M20 27 L22 20 L24 25 L26 20 L28 27', P.amber[1], 1.6), F(rr(17, 34, 14, 4, 1.5) + ' ' + rr(18, 38.5, 12, 3.5, 1.5), P.slate[0]), F(rr(21, 42, 6, 2.5, 1.2), P.slate[1])],
    controller: () => [F('M12 15 H36 C42 15 45 22 45 30 C45 37 40 40 36 36 L32 32 H16 L12 36 C8 40 3 37 3 30 C3 22 6 15 12 15 Z', P.slate[1]), F('M11 22 H14 V19 H17 V22 H20 V25 H17 V28 H14 V25 H11 Z', P.slate[2]), F(c(32, 20.5, 2.2), P.coral[0]), F(c(36.5, 24.5, 2.2), P.sun[0]), F(c(27.5, 24.5, 2.2), P.sky[0]), F(c(32, 28.5, 2.2), P.mint[0]), S('M10 18 Q14 16.5 18 16.5', P.slate[2], 1.6)],
    clapper: () => [F(rr(6, 18, 36, 24, 3), P.slate[1]), F('M6 18 H42 V23 H6 Z', P.slate[2]), F('M11 18 L15 23 H19 L15 18 Z M21 18 L25 23 H29 L25 18 Z M31 18 L35 23 H39 L35 18 Z', P.slate[1]), F('M6 11.5 L40 5.5 L41.2 11 L7.2 17 Z', P.slate[1]), F('M12 10.5 L17 9.7 L19 15.2 L14 16 Z M23 8.6 L28 7.7 L30 13.2 L25 14.1 Z M34 6.6 L39 5.8 L40.5 11.2 L36 12 Z', WHITE), S('M11 30 H24 M11 35.5 H30', P.slate[2], 2)],
    box: () => [F('M24 6 L42 14 L24 22 L6 14 Z', P.tan[2]), F('M6 14 L24 22 V42 L6 34 Z', P.tan[0]), F('M42 14 L24 22 V42 L42 34 Z', P.tan[1]), S('M15 10 L33 18 V24', P.sun[1], 3)],
    building: () => [F(rr(9, 7, 21, 37, 2), P.sky[1]), F(rr(30, 19, 11, 25, 2), P.sky[0]), F([13, 18.5, 24].map((x) => [11, 17, 23, 29].map((y) => rr(x, y, 3.2, 3.6, 0.6)).join(' ')).join(' ') + ' ' + [33.5, 37].map((x) => [23, 29, 35].map((y) => rr(x, y, 2.4, 3, 0.5)).join(' ')).join(' '), WHITE, 0.85), F(rr(16.5, 37, 6, 7, 1), '#2A2148')],
    chartup: () => [F(rr(5, 6, 38, 36, 6), P.slate[2]), S('M11 34 L18 26 L24 30 L35 16', P.mint[1], 3.2), F('M29.5 14.5 L37.5 12 L36 20.5 Z', P.mint[1]), S('M11 38 H37', P.slate[0], 1.6, 0.7)],
    chartdown: () => [F(rr(5, 6, 38, 36, 6), P.slate[2]), S('M11 14 L18 22 L24 18 L35 32', P.coral[1], 3.2), F('M29.5 33.5 L37.5 36 L36 27.5 Z', P.coral[1]), S('M11 38 H37', P.slate[0], 1.6, 0.7)],
    chat: () => [F('M8 8 H40 Q44 8 44 12 V28 Q44 32 40 32 H22 L13 40 V32 H8 Q4 32 4 28 V12 Q4 8 8 8 Z', P.sky[0]), F(c(15, 20, 2.5) + ' ' + c(24, 20, 2.5) + ' ' + c(33, 20, 2.5), WHITE), S('M9 12 H15', P.sky[2], 1.8, 0.8)],
    bell: () => [F('M24 6 C32 6 36 12 36 20 V28 L40 34 H8 L12 28 V20 C12 12 16 6 24 6 Z', P.sun[0]), F('M24 6 C32 6 36 12 36 20 V28 L40 34 H24 Z', P.amber[0], 0.35), F(c(24, 38.5, 4), P.amber[1]), F(c(24, 5, 2.5), P.amber[1]), S('M16.5 15 Q17.5 11.5 21 10', P.sun[2], 2)],
    sad: () => [F(c(24, 24, 18), P.sun[0]), F(c(18.5, 21, 1.9) + ' ' + c(29.5, 21, 1.9), INK), S('M13.5 16 L19.5 13.5 M34.5 16 L28.5 13.5', INK, 1.8), S('M17 33.5 Q24 27.5 31 33.5', INK, 2.4), F('M31 25 C33 29 33 31 31 32 C29 31 29 29 31 25 Z', P.sky[0])],
    angry: () => [F(c(24, 24, 18), P.coral[0]), F(c(18.5, 23, 2) + ' ' + c(29.5, 23, 2), INK), S('M13 15.5 L21 19.5 M35 15.5 L27 19.5', INK, 2.6), S('M17 34 Q24 28.5 31 34', INK, 2.4), F(c(24, 24, 18), P.coral[1], 0.18)],
    thermometer: () => [F(rr(19.5, 5, 9, 32, 4.5), WHITE), S(rr(19.5, 5, 9, 32, 4.5), P.slate[1], 1.6), F(rr(22, 15, 4, 23, 2), P.coral[0]), F(c(24, 37, 7), P.coral[0]), S(c(24, 37, 7), P.coral[1], 1.4), S('M28.5 12 H31 M28.5 17 H31 M28.5 22 H31 M28.5 27 H31', P.slate[1], 1.4), F(c(21.8, 35, 1.6), P.coral[2])],
    warning: () => [FS('M24 6 L43 39 H5 Z', P.amber[0], 3.4), F('M24 6 L43 39 H24 Z', P.amber[1], 0.3), F(rr(22, 16, 4, 13, 2), INK), F(c(24, 34, 2.4), INK)],
    book: () => [F('M3 12 V41 C10 39 18 39 24 43 C30 39 38 39 45 41 V12 C38 10 30 10 24 13 C18 10 10 10 3 12 Z', P.sky[1]), F('M24 12.5 C18 8.5 10 8.5 5 10.5 V38 C10 36.5 18 36.5 24 40 Z', '#F4F1EA'), F('M24 12.5 C30 8.5 38 8.5 43 10.5 V38 C38 36.5 30 36.5 24 40 Z', '#E9E4F7'), S('M9 16 C13 15 17 15.5 20.5 17 M9 21 C13 20 17 20.5 20.5 22 M9 26 C13 25 17 25.5 20.5 27 M27.5 17 C31 15.5 35 15 39 16 M27.5 22 C31 20.5 35 20 39 21', P.slate[0], 1.3, 0.8)],
    mail: () => [F(rr(5, 11, 38, 27, 4.5), P.sky[2]), S('M7 36 L19 26 M41 36 L29 26', P.sky[0], 1.8), F('M6 13 L24 27.5 L42 13 Q41.5 11 39 11 H9 Q6.5 11 6 13 Z', P.sky[0]), S('M9 15.5 L13 18.5', WHITE, 1.6, 0.7)],
    couch: () => [F(rr(8, 13, 32, 17, 5), P.violet[0]), F(rr(10, 26, 28, 10, 3), P.violet[2]), F(rr(3, 21, 9, 17, 4) + ' ' + rr(36, 21, 9, 17, 4), P.violet[1]), F(rr(6.5, 37, 3, 5, 1) + ' ' + rr(38.5, 37, 3, 5, 1), P.tan[1]), S('M24 15 V25', P.violet[1], 1.4, 0.6)],
    lock: () => [S('M16 22 V15 A8 8 0 0 1 32 15 V22', P.slate[0], 4), F(rr(9, 21, 30, 23, 6), P.sun[0]), F(rr(24, 21, 15, 23, 6), P.sun[1], 0.35), F(c(24, 30.5, 3.2), P.amber[1]), F(rr(22.6, 31, 2.8, 7, 1.2), P.amber[1]), S('M13.5 26 V36', P.sun[2], 2, 0.8)],
    receipt: () => [F('M11 5 H37 V43 L33.7 40.5 L30.5 43 L27.2 40.5 L24 43 L20.8 40.5 L17.5 43 L14.3 40.5 L11 43 Z', '#F4F1EA'), S('M16 11.5 H32 M16 17 H32 M16 22.5 H27', P.slate[1], 1.8), S('M16 31 H32', P.mint[1], 2.6), F('M28.5 5 H37 V13 Z', P.slate[2], 0.6)],

    'ui-menu': () => [U('M12 15 H36 M12 24 H36 M12 33 H28')],
    'ui-close': () => [U('M15 15 L33 33 M33 15 L15 33')],
    'ui-back': () => [U('M28.5 12 L16.5 24 L28.5 36')],
    'ui-chev': () => [U('M19.5 12 L31.5 24 L19.5 36')],
    'ui-plus': () => [U('M24 12 V36 M12 24 H36')],
    'ui-check': () => [U('M12 25 L20.5 33.5 L36 15', 4)],
    'ui-shuffle': () => [U('M8 15 H14 C24 15 24 33 34 33 H40 M34 27 L40 33 L34 39 M8 33 H14 C17.5 33 19.5 30.5 21 27.5 M27 20.5 C28.5 17.5 30.5 15 34 15 H40 M34 9 L40 15 L34 21', 3)],
    'ui-edit': () => [U('M30 9.5 L38.5 18 L19 37.5 L9 39 L10.5 29 Z M26 13.5 L34.5 22', 3)],
    'part-skin': () => [U('M24 6 C30 15 37 21 37 29 C37 36.5 31 42 24 42 C17 42 11 36.5 11 29 C11 21 18 15 24 6 Z', 3), U('M17.5 30 Q18 34.5 22 36.5', 2.6)],
    'part-face': () => [U('M24 7 C33 7 38 14 38 23 C38 33 31.5 41 24 41 C16.5 41 10 33 10 23 C10 14 15 7 24 7 Z', 3), U('M19 32 Q24 35.5 29 32', 2.6)],
    'part-hair': () => [U('M10 35 C7 18 14 7 24 7 C34 7 41 18 38 35', 3), U('M14.5 24 C14.5 33.5 19 40 24 40 C29 40 33.5 33.5 33.5 24', 3), U('M14.5 24 C20 23 27 19.5 30.5 13.5', 3)],
    'part-eye': () => [U('M5 24 C10 16 17 13 24 13 C31 13 38 16 43 24 C38 32 31 35 24 35 C17 35 10 32 5 24 Z', 3), U(c(24, 24, 5), 3)],
    'part-brow': () => [U('M7 31 C13 21 25 17 41 21', 5.5)],
    'part-nose': () => [U('M25 8 C26 17 30 24 31.5 29.5 C32.5 35 28.5 38 24 37.5 C21.5 37.2 19.5 36 18 34', 3)],
    'part-mouth': () => [U('M8 21 C13 19 19 20 24 22.5 C29 20 35 19 40 21 C36 31 30.5 35.5 24 35.5 C17.5 35.5 12 31 8 21 Z M8 21 C16 26 32 26 40 21', 3)],
    'part-beard': () => [U('M8 12 C8 29 15 41 24 41 C33 41 40 29 40 12 C36 21 30 25 24 24 C18 25 12 21 8 12 Z', 3), U('M17 29 Q24 26 31 29', 2.6)],
    'part-glasses': () => [U(c(14.5, 26, 7.5) + ' ' + c(33.5, 26, 7.5) + ' M22 25 C23 23 25 23 26 25 M7 25 L4 19 M41 25 L44 19', 3)],
    'part-shirt': () => [U('M17 7 L8 12 L4 22 L11 25 L13 21 V41 H35 V21 L37 25 L44 22 L40 12 L31 7 C29 11 19 11 17 7 Z', 3)],
    'part-pants': () => [U('M13 7 H35 L38 42 H28 L24 19 L20 42 H10 Z M13 13 H35', 3)],
    'part-body': () => [U(c(24, 8.5, 4.5), 3), U('M16 44 L17 29 L13 27 L14 18.5 Q14.5 16 18 16 H30 Q33.5 16 34 18.5 L35 27 L31 29 L32 44 M24 31 V44', 3)],
  };
  return { I };
})();

/* ---- SVG output ------------------------------------------------------- */
let _artId = 0;
function layersToSvg(layers) {
  let out = '';
  for (const l of layers) {
    out += `<path d="${l.d}" fill="${l.f || 'none'}"`;
    if (l.s && l.s !== 'none') out += ` stroke="${l.s}" stroke-width="${l.w || 0}" stroke-linecap="round" stroke-linejoin="round"`;
    if (l.o != null && l.o !== 1) out += ` opacity="${l.o}"`;
    if (l.t) out += ` transform="${l.t}"`;
    if (l.c) out += ` clip-path="${l.c}"`;
    if (l.r && l.r !== 'nonzero') out += ` fill-rule="${l.r}"`;
    if (l.da) out += ` stroke-dasharray="${l.da}"`;
    out += '/>';
  }
  return out;
}

// avatarSVG(look, { age, stage, mood, frame: circle|squircle|none, crop, size, bg, dead, label })
function avatarSVG(look, o) {
  o = o || {};
  const id = 'av' + (++_artId);
  const ids = { frame: id + 'f', eyes: id + 'e', face: id + 'c' };
  const stage = o.stage || AVLIB.stageOf(o.age);
  const built = AVLIB.build(look, stage, o.mood || '', ids);
  const crop = AVLIB.VIEWS[o.crop] ? o.crop : 'bust';
  const frame = o.frame || 'circle';
  const portrait = crop === 'bust' && frame !== 'none';
  const view = portrait ? '18 20 164 164' : AVLIB.VIEWS[crop];
  const [vx, vy, vw, vh] = view.split(' ').map(Number);
  let frameD = `M${vx} ${vy} H${vx + vw} V${vy + vh} H${vx} Z`;
  if (portrait && frame === 'circle') frameD = 'M18 102 A82 82 0 1 0 182 102 A82 82 0 1 0 18 102 Z';
  if (portrait && frame === 'squircle') frameD = 'M100 20 C162 20 182 40 182 102 C182 164 162 184 100 184 C38 184 18 164 18 102 C18 40 38 20 100 20 Z';
  const framed = frame !== 'none' || crop !== 'bust';
  const bg = o.bg || look.bg || '#DCD6F7';
  const size = o.size || 48;
  return `<svg class="av${o.dead ? ' dead' : ''}" viewBox="${view}" width="${size}" height="${size}" role="img" aria-label="${esc(o.label || 'Portrait')}"><defs><clipPath id="${ids.frame}"><path d="${frameD}"/></clipPath><clipPath id="${ids.eyes}"><path d="${built.eyeClip}"/></clipPath><clipPath id="${ids.face}"><path d="${built.faceD}"/></clipPath></defs><g${framed ? ` clip-path="url(#${ids.frame})"` : ''}>${framed ? `<path d="${frameD}" fill="${bg}"/>` : ''}${layersToSvg(built.layers)}</g></svg>`;
}

// The look as it should be drawn today: wrinkles smoothed by a recent facelift,
// thinning hair for people carrying the balding gene.
function lookToday(p, age) {
  const L = ensureLook(G, p);
  const out = Object.assign({}, L);
  if (L.smoothUntil && L.smoothUntil >= G.year) out.smooth = true;
  if (L.balding && age >= 45 && ['crop', 'sidepart', 'buzz', 'curls', 'pixie'].includes(L.hair)) out.hair = 'receding';
  return out;
}
function moodOf(p) { const h = p.stats ? p.stats.happy : 60; return h < 30 ? 'sad' : h >= 70 ? 'happy' : ''; }
function personAge(p) { return p.alive ? bodyAge(G, p) : Math.min((p.deathYear || G.year) - p.birthYear, p.frozenAge ?? Infinity); }
function personAvatar(p, size, o) {
  const age = personAge(p);
  return avatarSVG(lookToday(p, age), Object.assign({ age, mood: p.alive ? moodOf(p) : '', dead: !p.alive, size, label: fullName(p) }, o || {}));
}

/* ---- the full figure (adults only) --------------------------------------
 * A 200 x 420 standing figure: the portrait's head scaled onto a body whose
 * outline comes from p.body. Always clothed. figureSVG refuses anyone under
 * ADULT_AGE, so a child's body is never drawn. */
const FIG = (() => {
  const { n, mix, circ, ell } = AVLIB;
  const HEAD_T = 'translate(100 86) scale(0.62) translate(-100 -150)';
  const pt = (x, y, c) => ({ x, y, c });
  // A smooth closed or open path through points; points with c set are corners.
  function smooth(pts, closed) {
    const N = pts.length;
    const at = (i) => pts[closed ? (i + N) % N : Math.max(0, Math.min(N - 1, i))];
    const tan = pts.map((p, i) => (p.c ? [0, 0] : [(at(i + 1).x - at(i - 1).x) / 2, (at(i + 1).y - at(i - 1).y) / 2]));
    let d = `M${n(pts[0].x)} ${n(pts[0].y)}`;
    const last = closed ? N : N - 1;
    for (let i = 0; i < last; i++) {
      const a = pts[i], b = at(i + 1), ta = tan[i], tb = tan[(i + 1) % N];
      d += ` C${n(a.x + ta[0] / 3)} ${n(a.y + ta[1] / 3)} ${n(b.x - tb[0] / 3)} ${n(b.y - tb[1] / 3)} ${n(b.x)} ${n(b.y)}`;
    }
    return d + (closed ? ' Z' : '');
  }
  // Right-side offsets from the centre line -> a closed outline mirrored to the left.
  const R = (off, y, c) => pt(100 + off, y, c);
  const outline = (right) => smooth(right.concat(right.slice().reverse().map((p) => pt(200 - p.x, p.y, p.c))), true);
  const flipX = (x) => 200 - x;
  const line = (a, b) => `M${n(a[0])} ${n(a[1])} L${n(b[0])} ${n(b[1])}`;

  function metrics(look, b) {
    const f = b.fat / 100, mu = b.muscle / 100, ch = b.chest / 100, hp = b.hips / 100, gl = b.glutes / 100;
    const bs = { slim: 0.95, regular: 1, broad: 1.06 }[look.build] || 1;
    const M = { f, mu, ch, hp, gl };
    M.neck = 9 + mu * 1.8 + f * 2;
    M.sh = (40 + mu * 8 + f * 5) * bs;
    M.chest = 29 + ch * 5 + f * 9 + mu * 4;
    M.bust = M.chest + ch * 4;
    M.waist = 21 + f * 17 + mu * 2.5;
    M.hip = 29 + hp * 10 + f * 11 + gl * 3;
    M.seat = M.hip + gl * 6 + f * 1.5;
    M.thighC = (M.seat + 1.4) / 2;
    M.thigh = 13 + f * 9 + mu * 3 + gl * 2.5;
    M.inner = Math.max(1.6, M.thighC - M.thigh);
    M.kneeC = 13.5 + f * 3 + hp * 2;
    M.knee = 7.4 + f * 3.6 + mu * 1.2;
    M.calf = 8.4 + f * 4 + mu * 2.8;
    M.ankle = 4.6 + f * 1;
    M.ax = M.kneeC - 1;
    M.armU = 9.5 + f * 7 + mu * 5.5;
    M.armL = 7.8 + f * 4 + mu * 3.2;
    // Low enough that a round arm cap sits inside the shoulder line.
    M.shJ = [100 + M.sh - 6.5, 110];
    const ex = Math.max(M.sh - 1.5, M.waist + M.armU / 2 + 1.5) + f * 1.5;
    M.elbow = [100 + ex, 166];
    M.wrist = [100 + Math.max(ex + 1.5, M.seat + M.armL / 2 + 2), 222];
    return M;
  }

  function bodyOutline(M) {
    return outline([
      R(M.neck, 80, 1), R(M.neck, 94), R(M.neck + 5, 99.5), R(M.sh - 6, 102), R(M.sh, 109), R(M.chest, 124), R(M.bust, 137),
      R(M.waist, 168), R(M.hip, 196), R(M.seat, 214), R(M.thighC + M.thigh, 238), R(M.kneeC + M.knee, 300),
      R(M.kneeC - 0.5 + M.calf, 332), R(M.ax + M.ankle, 384), R(M.ax + M.ankle, 394, 1), R(M.ax - M.ankle, 394, 1),
      R(M.ax - M.ankle, 384), R(M.kneeC - 0.5 - M.calf * 0.82, 334), R(M.kneeC - M.knee, 300), R(M.inner, 252), R(1.4, 228, 1),
    ]);
  }
  const armPath = (M, side) => {
    const fx = side < 0 ? flipX : (x) => x;
    return { upper: line([fx(M.shJ[0]), M.shJ[1]], [fx(M.elbow[0]), M.elbow[1]]), lower: line([fx(M.elbow[0]), M.elbow[1]], [fx(M.wrist[0]), M.wrist[1]]) };
  };
  // A point part-way along a segment (for sleeve ends).
  const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  // A tapered band from a to b, w0 wide at a and w1 wide at b (sleeves).
  const band = (a, b, w0, w1) => {
    const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L;
    return `M${n(a[0] + (nx * w0) / 2)} ${n(a[1] + (ny * w0) / 2)} L${n(b[0] + (nx * w1) / 2)} ${n(b[1] + (ny * w1) / 2)} L${n(b[0] - (nx * w1) / 2)} ${n(b[1] - (ny * w1) / 2)} L${n(a[0] - (nx * w0) / 2)} ${n(a[1] - (ny * w0) / 2)} Z`;
  };
  const hemLine = (a, b, w) => {
    const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L;
    return `M${n(b[0] + (nx * w) / 2)} ${n(b[1] + (ny * w) / 2)} L${n(b[0] - (nx * w) / 2)} ${n(b[1] - (ny * w) / 2)}`;
  };

  const LOOSE = { tee: 0.5, vneck: 0.4, hoodie: 0.9, collar: 0.6, sweater: 0.6, scoop: 0.3, tank: 0.2, blazer: 0.55, suit: 0.55, onesie: 0.6 };
  const HEM = { tee: 208, vneck: 206, hoodie: 212, collar: 206, sweater: 206, scoop: 204, tank: 204, blazer: 216, suit: 216, onesie: 208 };
  const SLEEVE = { tee: 'short', vneck: 'short', scoop: 'short', hoodie: 'long', collar: 'long', sweater: 'long', blazer: 'long', suit: 'long', tank: 'none', onesie: 'short' };

  function topShape(M, kind) {
    const loose = LOOSE[kind] ?? 0.5, hemY = HEM[kind] || 208;
    const waistTop = M.waist + 2 + loose * Math.max(0, (M.bust + M.hip) / 2 - M.waist - 2);
    const tank = kind === 'tank';
    const side = [
      tank ? R(M.chest - 3, 110, 1) : R(M.neck + 3.5, 96.5, 1),
      ...(tank ? [] : [R(M.sh - 5.5, 100.5), R(M.sh + 1.2, 108.5)]),
      R(M.chest + 1.5, 124), R(M.bust + 1.6, 137), R(waistTop, 168), R(Math.max(M.hip + 2, waistTop), 194), R(Math.max(M.hip + 2.5, waistTop), hemY, 1),
    ];
    const neckY = { tee: 104, hoodie: 104, collar: 103, sweater: 99, vneck: 118, scoop: 121, tank: 125, blazer: 104, suit: 104, onesie: 104 }[kind] || 104;
    const right = side.slice(1);
    const pts = [side[0]].concat(right, [pt(100, hemY + 1.5)], right.slice().reverse().map((p) => pt(200 - p.x, p.y, p.c)), [pt(200 - side[0].x, side[0].y, 1), pt(100, neckY, kind === 'vneck' ? 1 : 0)]);
    if (kind === 'scoop') { pts[0] = R(M.neck + 9, 98.5, 1); pts[pts.length - 2] = pt(200 - pts[0].x, 98.5, 1); }
    return { d: smooth(pts, true), hemY, waistTop };
  }

  function bottomShape(M, kind) {
    const wb = M.waist + (M.hip - M.waist) * 0.55 + 2;
    if (kind === 'skirt') {
      return outline([R(wb, 186, 1), R(M.hip + 2.6, 198), R(M.seat + 4, 216), R(M.seat + 9, 286, 1)]).replace(/ Z$/, '') + ' Z';
    }
    if (kind === 'shorts') {
      return outline([R(wb, 186, 1), R(M.hip + 2.2, 198), R(M.seat + 2.3, 214), R(M.thighC + M.thigh + 2.4, 240), R(M.thighC + M.thigh * 0.95 + 2.6, 266, 1), R(Math.max(1.6, M.thighC - M.thigh * 0.95 - 2.2), 266, 1), R(1.8, 234, 1)]);
    }
    const legHem = Math.max(M.ankle + 3.8, M.calf * 0.62 + 2.4);
    return outline([
      R(wb, 186, 1), R(M.hip + 2.2, 198), R(M.seat + 2.3, 214), R(M.thighC + M.thigh + 2.2, 240), R(M.kneeC + M.knee + 2.6, 300),
      R(M.kneeC - 0.5 + M.calf + 2.4, 332), R(M.ax + legHem, 388, 1), R(M.ax - legHem, 388, 1), R(M.kneeC - 0.5 - M.calf * 0.82 - 2.2, 334),
      R(M.kneeC - M.knee - 2.4, 300), R(Math.max(1.6, M.inner - 1.4), 252), R(1.8, 232, 1),
    ]);
  }

  function shoe(M, side, color) {
    const ax = side > 0 ? 100 + M.ax : 100 - M.ax, s = side, a = M.ankle;
    const X = (dx) => n(ax + dx * s);
    return `M${X(-a - 1.5)} 385 C${X(-a - 2.5)} 394 ${X(-7)} 401 ${X(-5.5)} 404 L${X(9)} 404 C${X(13)} 404 ${X(13.5)} 398.5 ${X(9)} 396.5 C${X(6)} 395.5 ${X(a + 1.5)} 392 ${X(a + 1.5)} 385 Z`;
  }

  function build(look, b, sk, ids) {
    const M = metrics(look, b);
    const out = [];
    const add = (o) => out.push(o);
    const top = look.outfit && LOOSE[look.outfit] !== undefined ? look.outfit : 'tee';
    const c = look.outfitColor || '#6C8CFF', cS = mix(c, '#000000', 0.25), cH = mix(c, '#FFFFFF', 0.24);
    const bc = look.bottomColor || '#3F5A8A', bS = mix(bc, '#000000', 0.28);
    const shoeC = look.shoeColor || '#F4F1EA';
    const bottom = top === 'suit' ? 'trousers' : look.bottom || 'jeans';
    const pantsC = top === 'suit' ? c : bc, pantsS = top === 'suit' ? cS : bS;

    add({ d: ell(100, 405, 46, 4.5), f: '#000000', o: 0.18 });
    // skin
    add({ d: bodyOutline(M), f: sk.base, s: sk.shade, w: 1.1 });
    // knee and collarbone hints on bare skin
    add({ d: `M${n(100 + M.kneeC - 3)} 302 Q${n(100 + M.kneeC)} 305 ${n(100 + M.kneeC + 3)} 302 M${n(100 - M.kneeC - 3)} 302 Q${n(100 - M.kneeC)} 305 ${n(100 - M.kneeC + 3)} 302`, s: sk.shade, w: 1.1, o: 0.5 });
    add({ d: `M${n(100 - M.neck - 2)} 104 Q${n(100 - M.neck - 9)} 103 ${n(100 - M.sh + 10)} 105 M${n(100 + M.neck + 2)} 104 Q${n(100 + M.neck + 9)} 103 ${n(100 + M.sh - 10)} 105`, s: sk.shade, w: 1.1, o: 0.45 });

    // bottoms, then shoes, then the top over the waistband
    add({ d: bottomShape(M, bottom), f: pantsC, s: pantsS, w: 1 });
    if (bottom === 'jeans' || bottom === 'trousers' || bottom === 'shorts') {
      const wb = M.waist + (M.hip - M.waist) * 0.55 + 2;
      add({ d: `M100 188 L100 ${bottom === 'shorts' ? 214 : 206}`, s: pantsS, w: 1.2, o: 0.8 });
      if (bottom === 'jeans') add({ d: `M${n(100 - wb + 5)} 194 Q${n(100 - wb + 10)} 202 ${n(100 - wb + 17)} 196 M${n(100 + wb - 5)} 194 Q${n(100 + wb - 10)} 202 ${n(100 + wb - 17)} 196`, s: mix(bc, '#FFFFFF', 0.25), w: 1, o: 0.7 });
      if (bottom === 'trousers') add({ d: `M${n(100 + M.kneeC)} 222 L${n(100 + M.kneeC - 0.6)} 386 M${n(100 - M.kneeC)} 222 L${n(100 - M.kneeC + 0.6)} 386`, s: pantsS, w: 0.9, o: 0.5 });
    }
    if (bottom === 'skirt') add({ d: `M${n(100 - M.seat - 6)} 270 Q100 276 ${n(100 + M.seat + 6)} 270`, s: bS, w: 1, o: 0.45 });
    for (const sd of [1, -1]) {
      add({ d: shoe(M, sd, shoeC), f: shoeC, s: mix(shoeC, '#000000', 0.3), w: 1 });
      const ax = 100 + M.ax * sd;
      add({ d: `M${n(ax - 6 * sd)} 402.5 L${n(ax + 10 * sd)} 402.5`, s: mix(shoeC, '#000000', 0.35), w: 1.6, o: 0.6 });
    }

    const T = topShape(M, top);
    add({ d: T.d, f: c, s: cS, w: 1 });
    // arms hang in front of the torso's sides, so they go over the top
    const arms = [armPath(M, 1), armPath(M, -1)];
    for (const a of arms) {
      add({ d: a.upper, s: sk.shade, w: M.armU + 1.4 });
      add({ d: a.lower, s: sk.shade, w: M.armL + 1.4 });
    }
    for (const a of arms) {
      add({ d: a.upper, s: sk.base, w: M.armU });
      add({ d: a.lower, s: sk.base, w: M.armL });
    }
    // sleeves
    const sl = SLEEVE[top] || 'short';
    for (const a of [1, -1]) {
      const fx = a < 0 ? flipX : (x) => x;
      const sj = [fx(M.shJ[0]), M.shJ[1]], el = [fx(M.elbow[0]), M.elbow[1]], wr = [fx(M.wrist[0]), M.wrist[1]];
      const wU = M.armU + 3.4, wL = M.armL + 3;
      if (sl === 'short') {
        const end = lerp(sj, el, 0.45);
        add({ d: circ(sj[0], sj[1], wU / 2) + ' ' + band(sj, end, wU, wU - 0.6), f: c });
        add({ d: hemLine(sj, end, wU - 0.6), s: cS, w: 1.4 });
      } else if (sl === 'long') {
        const end = lerp(el, wr, 0.86), mid = (wU + wL) / 2;
        add({ d: circ(sj[0], sj[1], wU / 2) + ' ' + band(sj, el, wU, mid) + ' ' + circ(el[0], el[1], mid / 2) + ' ' + band(el, end, mid, wL), f: c });
        add({ d: band(lerp(el, wr, 0.78), end, wL, wL), f: cS, o: 0.55 });
      }
    }
    // shape cues on the clothing
    if (M.ch > 0.32) {
      const y = 139 + M.ch * 6, o = Math.min(0.55, 0.15 + M.ch * 0.4);
      add({ d: `M${n(100 - M.bust + 4)} ${n(y - 3)} Q${n(100 - M.bust * 0.5)} ${n(y + 5)} ${n(100 - 2.5)} ${n(y - 1)} M${n(100 + M.bust - 4)} ${n(y - 3)} Q${n(100 + M.bust * 0.5)} ${n(y + 5)} ${n(100 + 2.5)} ${n(y - 1)}`, s: cS, w: 1.3, o });
    } else if (M.mu > 0.55) {
      add({ d: `M${n(100 - M.chest + 5)} 132 Q${n(100 - M.chest * 0.45)} 139 100 133 M${n(100 + M.chest - 5)} 132 Q${n(100 + M.chest * 0.45)} 139 100 133`, s: cS, w: 1.2, o: Math.min(0.5, M.mu - 0.4) });
    }
    if (M.f > 0.52) add({ d: `M${n(100 - T.waistTop * 0.6)} 183 Q100 ${n(190 + M.f * 8)} ${n(100 + T.waistTop * 0.6)} 183`, s: cS, w: 1.3, o: Math.min(0.5, M.f - 0.35) });

    // outfit details
    if (top === 'hoodie') {
      add({ d: `M${n(100 - M.neck - 6)} 99 Q100 110 ${n(100 + M.neck + 6)} 99`, s: cH, w: 4.5 });
      add({ d: `M96 104 L95.4 122 M104 104 L104.6 122`, s: '#F4F1EA', w: 1.6 });
      add({ d: `M${n(100 - 17)} 204 L${n(100 - 13)} 186 L${n(100 + 13)} 186 L${n(100 + 17)} 204`, s: cS, w: 1.2, o: 0.6 });
    }
    if (top === 'tee' || top === 'onesie') add({ d: `M${n(100 - M.neck - 3.5)} 96.5 Q100 104 ${n(100 + M.neck + 3.5)} 96.5`, s: cS, w: 2.4 });
    if (top === 'vneck') add({ d: `M${n(100 - M.neck - 3.5)} 96.5 L100 118 L${n(100 + M.neck + 3.5)} 96.5`, s: cS, w: 2 });
    if (top === 'scoop') add({ d: `M${n(100 - M.neck - 9)} 98.5 Q100 ${n(121 + 0)} ${n(100 + M.neck + 9)} 98.5`, s: cS, w: 2 });
    if (top === 'tank') {
      for (const sd of [1, -1]) add({ d: `M${n(100 + sd * (M.sh - 13))} 100 L${n(100 + sd * (M.chest - 5))} 112`, s: c, w: 5.5 });
      add({ d: `M${n(100 - M.chest + 3)} 110 Q100 125 ${n(100 + M.chest - 3)} 110`, s: cS, w: 1.6 });
    }
    if (top === 'sweater') {
      add({ d: `M${n(100 - M.neck - 2.5)} 99 L${n(100 - M.neck - 2)} 83 Q100 81 ${n(100 + M.neck + 2)} 83 L${n(100 + M.neck + 2.5)} 99 Q100 101 ${n(100 - M.neck - 2.5)} 99 Z`, f: c, s: cS, w: 1 });
      add({ d: `M${n(100 - M.neck - 2.2)} 91 Q100 93 ${n(100 + M.neck + 2.2)} 91`, s: cS, w: 1.2 });
      add({ d: `M${n(100 - T.waistTop - 1)} ${T.hemY - 4} L${n(100 + T.waistTop + 1)} ${T.hemY - 4}`, s: cS, w: 1.1, o: 0.6 });
    }
    if (top === 'collar') {
      add({ d: `M100 104 L100 ${T.hemY}`, s: cS, w: 1.1 });
      add({ d: [118, 140, 162, 184].map((y) => circ(100, y, 1.3)).join(' '), f: cS });
      add({ d: `M${n(100 - M.neck - 3.5)} 96 L${n(100 - 10)} 108 L100 103 Z M${n(100 + M.neck + 3.5)} 96 L${n(100 + 10)} 108 L100 103 Z`, f: cH, s: cS, w: 1 });
    }
    if (top === 'blazer' || top === 'suit') {
      add({ d: `M${n(100 - M.neck - 3)} 97 L100 150 L${n(100 + M.neck + 3)} 97 Q100 103 ${n(100 - M.neck - 3)} 97 Z`, f: '#F3F1EC' });
      if (top === 'suit') add({ d: 'M97.6 103 L102.4 103 L103.6 108 L100 140 L96.4 108 Z', f: '#B33A4A' });
      add({ d: `M${n(100 - M.neck - 3.5)} 97 L${n(100 - M.neck - 9)} 112 L${n(100 - M.neck - 4)} 116 L${n(100 - M.neck - 7)} 121 L99 152 Z M${n(100 + M.neck + 3.5)} 97 L${n(100 + M.neck + 9)} 112 L${n(100 + M.neck + 4)} 116 L${n(100 + M.neck + 7)} 121 L101 152 Z`, f: cS });
      add({ d: circ(100, 168, 1.6) + ' ' + circ(100, 184, 1.6), f: cS });
    }
    for (const sd of [1, -1]) {
      const wx = sd > 0 ? M.wrist[0] : flipX(M.wrist[0]);
      add({ d: ell(wx + 0.6 * sd, M.wrist[1] + 8.5, 4.2 + M.f, 7.2), f: sk.base, s: sk.shade, w: 1 });
    }
    return out;
  }
  return { build };
})();

// figureSVG(look, body, { age, size, label }): the standing figure, or '' for anyone under 18.
function figureSVG(look, body, o) {
  o = o || {};
  if (!body || !(o.age >= ADULT_AGE)) return '';
  const id = 'fg' + (++_artId);
  const ids = { frame: id + 'f', eyes: id + 'e', face: id + 'c' };
  const stage = AVLIB.stageOf(o.age);
  const head = AVLIB.build(look, stage, o.mood || '', ids);
  const HT = 'translate(100 86) scale(0.62) translate(-100 -150)';
  const reT = (l) => Object.assign({}, l, { t: (HT + ' ' + (l.t || '')).trim() });
  const back = head.layers.filter((l) => l.g === 'hairBack').map(reT);
  const front = head.layers.filter((l) => !['hairBack', 'body', 'clothes'].includes(l.g)).map(reT);
  const fig = FIG.build(look, body, head.sk, ids);
  const h = o.size || 320, w = Math.round((h * 200) / 420);
  return `<svg class="fig" viewBox="0 0 200 420" width="${w}" height="${h}" role="img" aria-label="${esc(o.label || 'Full figure')}"><defs><clipPath id="${ids.eyes}"><path d="${head.eyeClip}"/></clipPath><clipPath id="${ids.face}"><path d="${head.faceD}"/></clipPath></defs>${layersToSvg(back)}${layersToSvg(fig)}${layersToSvg(front)}</svg>`;
}
function personFigure(p, size) {
  const age = personAge(p);
  if (!p.alive || age < ADULT_AGE) return '';
  const body = ensureBody(G, p);
  return figureSVG(lookToday(p, age), body, { age, size, mood: moodOf(p), label: fullName(p) + ', full figure' });
}

/* ---- icons ------------------------------------------------------------ */
const ICON_CACHE = {};
function icon(name, size, cls) {
  if (!ICLIB.I[name]) return '';
  if (!ICON_CACHE[name]) ICON_CACHE[name] = layersToSvg(ICLIB.I[name]());
  return `<svg class="ic${cls ? ' ' + cls : ''}" viewBox="0 0 48 48" width="${size || 24}" height="${size || 24}" aria-hidden="true">${ICON_CACHE[name]}</svg>`;
}
const STAT_ICONS = { happy: 'happy', health: 'health', smarts: 'smarts', looks: 'looks', karma: 'karma', fame: 'fame', money: 'money' };
const CAT_ICONS = { gamble: 'clover', super: 'mind', mind: 'mind', health: 'medical', love: 'love', social: 'party', family: 'paw', money: 'clover', shop: 'bag', travel: 'plane', fame: 'megaphone', crime: 'mask', legal: 'scroll', court: 'scales', prison: 'prison' };
const CAT_HUES = { gamble: '#34D399', super: '#8B6CFF', mind: '#FF8FC7', health: '#FF5D7A', love: '#FF8FC7', social: '#FFC83D', family: '#D99A5B', money: '#34D399', shop: '#FF8FC7', travel: '#4FA8FF', fame: '#FFB547', crime: '#8B6CFF', legal: '#D99A5B', court: '#4FA8FF', prison: '#8E96BC' };
// Emoji used across the game's content, grouped by the drawn icon that stands in
// for them. Anything not listed keeps its emoji, drawn inside the same tile.
const EMOJI_GROUPS = {
  rattle: "👶🍼🧸🧒", cake: "🎂🧁🍰", gradcap: "🎓", book: "📚📖📘📗📔📕📙📒", school: "🏫🎒✏️🖍️📐",
  career: "💼👔", money: "💰💵💸🤑💲💳💱", piggy: "🏦🥫",
  assets: "🏠🏡🏘️🏚️🏙️🌆🏯🏰", building: "🏢🏭🏬🏪🏨🏗️🧱", car: "🚗🚙🚘🏎️🚕🚐🚌🚜🛵🏍️🏁🛣️🚇",
  plane: "✈️🛫🛩️🚁🧳🏖️🏝️🗺️🛳️🚤⛵🛥️🛶🏕️⛰️🌅🌊", globe: "🌍🌎🌏🛂🧭📍",
  ring: "💍💒💎💠", heartbreak: "💔", love: "💕💞💓💘💝💌💋😘🥰🌹💐🌷😏", health: "❤️❤🩸",
  medical: "🩺🏥💊💉🩹🚑🦷🦴😷👩‍⚕️👂👁️🦶🦵🦻", thermometer: "🤒🤧🤕🦠🥵🥶🤮🤢😵🚬",
  happy: "😊😁😀😄😇☀️🌤️😂🤗", sad: "😢😟😰😱😫😞😔😖🥱😴😬😒🌧️🙈", angry: "😡😤🤬😠💢🗯️👊✊",
  paw: "🐾🐶🐕🐈🐱🐹🐇🦜🐠🐢🦎🐍🐎🐴🏇🐐🦮🐖🦊🐺🦦🦔🐝🐛🐜🦢🦈🦋🦄🦒🐭🐣",
  party: "🎉🥳🎈🎊🕺💃🎡🎢🎠🤘", drink: "🍺🍻🍸🍶🥂🍷🍾☕",
  plate: "🍽️🍳🍕🍔🍝🥘🌮🍜🍟🍿🍦🍫🍪🍭🍬🌭🥐🍎🍋🥗🥦🍩🌶️👨‍🍳🥕",
  trophy: "🏆🥇🏅🎖️💯🔝🏟️🎯", fame: "⭐🌟💫🤩🦸", looks: "✨💅💄💇💈", clover: "🍀🎰", dice: "🎲", cards: "🃏♠️♟️",
  music: "🎸🎻🎹🎷🎺🥁🎤🎶🎵🎼🎧🎙️🪕", palette: "🎨🖌️🖼️", clapper: "🎬🎭📺🎟️🎫📸📷🎥",
  controller: "🎮🕹️👾", phone: "📱📲📞☎️🤳📵", laptop: "💻🖥️⌨️👩‍💻🤖💿", flask: "🔬🧪🧬⚗️☢️", rocket: "🚀☄️",
  scales: "⚖️👩‍⚖️", columns: "🏛️🗳️", scroll: "📜📝📋📄📑🗂️✍️🖋️📰", receipt: "🧾", chartup: "📈💹⬆️", chartdown: "📉",
  prison: "⛓️🚔🚓🚨", lock: "🔒", mask: "🦹🕵️🔪💀😈🕳️👻🦇🕶️⚔️🗡️🧛🏹🕴️", flame: "🔥💥⚡🌋", key: "🔑🗝️🔓🚪", gift: "🎁", handshake: "🤝🙏🤲✋",
  bulb: "💡🔮🧙", box: "📦🚚", chat: "💬🗣️💭🤐", megaphone: "📣📢🔊", mail: "✉️📧📭📮📤", bell: "🔔⏰⏱️",
  warning: "⚠️🚫🚧", dove: "🕊️⚰️🥀🕯️", tree: "🌳🌲🌱🌿🌾🌻🌼🌺", dumbbell: "🏋️💪🥊🥋🏃⛷️🏊🎾🏀⚽🏈🛹👟",
  hourglass: "⏳⌛⏪", crown: "👑", couch: "🛋️🛏️🪑🛁🚿", karma: "☯️😇", mind: "🧘🌀🌙", gear: "⚙️🛠️🔧🔩🧰🔨",
  bag: "🛍️🛒🏷️👛👗👕🧢", people: "👥👪👨‍👩‍👧‍👦👵👋🙋", smarts: "🧠🤓🧩🔢🧮",
};
const EMOJI_RE = /(?:\p{Extended_Pictographic}|\p{Regional_Indicator})(?:️|‍\p{Extended_Pictographic}|\p{Regional_Indicator}|\p{Emoji_Modifier})*/gu;
const bareEmoji = (s) => String(s || '').replace(/️/g, '');
const EMOJI_ICONS = {};
for (const name in EMOJI_GROUPS) for (const e of EMOJI_GROUPS[name].match(EMOJI_RE) || []) if (ICLIB.I[name]) EMOJI_ICONS[bareEmoji(e)] = name;
function emojiIcon(emoji, size) { const k = EMOJI_ICONS[bareEmoji(emoji)]; return k ? icon(k, size) : ''; }
// True when a string is nothing but one emoji (the ico of a list row, say).
function isEmoji(s) { const m = typeof s === 'string' && s.match(EMOJI_RE); return !!m && m.length === 1 && m[0] === s.trim(); }
// An emoji as the game should show it: its drawn icon when there is one, else the emoji itself.
function emo(e, size) { return emojiIcon(e, size || 24) || `<span class="emo" style="font-size:${Math.round((size || 24) * 0.78)}px">${e}</span>`; }
// "🎓 Some text" -> the icon followed by the text, for labels that start with an emoji.
function emoLabel(s, size) {
  const str = String(s || ''), m = str.match(LEAD_EMOJI_RE);
  return m ? `<span class="emo-label">${emo(m[1], size || 20)}<span>${esc(str.slice(m[0].length))}</span></span>` : esc(str);
}
const LEAD_EMOJI_RE = /^((?:\p{Extended_Pictographic}|\p{Regional_Indicator})(?:️|‍\p{Extended_Pictographic}|\p{Regional_Indicator}|\p{Emoji_Modifier})*)\s*/u;
