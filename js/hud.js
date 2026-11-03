// ---- crosshairs: every gun has its own, drawn as pixel shapes (white with a dark edge so it shows on bright ground).
// Shapes are lists of [x, y, w, h] rectangles in screen pixels around the middle of the screen
const CROSS_S = 80; // canvas size in CSS pixels, the middle is 0, 0
const xDot = (s = 2) => [[-s / 2, -s / 2, s, s]];
// four lines out from the middle, starting gap pixels out. which: any of 'udlr'
function xLines(gap, len, t = 2, which = 'udlr') {
  const o = [];
  if (which.includes('r')) o.push([gap, -t / 2, len, t]);
  if (which.includes('l')) o.push([-gap - len, -t / 2, len, t]);
  if (which.includes('d')) o.push([-t / 2, gap, t, len]);
  if (which.includes('u')) o.push([-t / 2, -gap - len, t, len]);
  return o;
}
// pieces of a circle of radius r: one arc span degrees wide round each angle in at (0 = right, 90 = down)
function xArcs(r, at, span, t = 2) {
  const o = [], seen = new Set();
  for (const c of at) for (let a = c - span / 2; a <= c + span / 2; a += 1) {
    const x = Math.round(Math.cos(a * Math.PI / 180) * r - t / 2), y = Math.round(Math.sin(a * Math.PI / 180) * r - t / 2);
    if (!seen.has(x + ',' + y)) { seen.add(x + ',' + y); o.push([x, y, t, t]); }
  }
  return o;
}
const DIAG = [45, 135, 225, 315];
// the four corners of a square h pixels from the middle to its edge, each arm long, without the rest of its sides
function xCorners(h, arm, t = 2) {
  const o = [];
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) {
    const x = sx < 0 ? -h : h - arm, y = sy < 0 ? -h : h - t, vx = sx < 0 ? -h : h - t, vy = sy < 0 ? -h : h - arm;
    o.push([x, y, arm, t], [vx, vy, t, arm]);
  }
  return o;
}
// short ticks along the diagonals, from r0 to r1 pixels out
function xTicks(r0, r1, t = 2) {
  const o = [];
  for (const a of DIAG) for (let d = r0; d <= r1; d++) {
    const k = d / Math.SQRT2, rad = a * Math.PI / 180;
    o.push([Math.round(Math.sign(Math.cos(rad)) * k - t / 2), Math.round(Math.sign(Math.sin(rad)) * k - t / 2), t, t]);
  }
  return o;
}
// rifles: a dot, a gap, then lines. Faster-firing ones get a wider gap. Pistols (and the knife) are the same but tighter
const CROSSES = {
  ar: () => [...xDot(), ...xLines(5, 8)],
  thrasher: () => [...xDot(), ...xLines(6, 8)],
  eradicator: () => [...xDot(), ...xLines(9, 6), ...xTicks(10, 13)], // the widest rifle gap, plus ticks round it for the spray
  voxel: () => [...xDot(), ...xLines(4, 6)],
  hitman: () => [...xDot(), ...xLines(4, 6)],
  knife: () => [...xDot(), ...xLines(4, 6)],
  shotgun: () => [...xDot(), ...xArcs(15, DIAG, 50)], // a broken ring about the size of the pellet spread
  flame: () => [...xDot(), ...xArcs(18, DIAG, 40)],
  heatray: () => [...xDot(), ...xLines(3, 3), ...xArcs(10, DIAG, 44)], // a small ring with a tight cross inside for the beam
  sniper: () => [...xDot(), ...xArcs(6, [0], 360), ...xLines(10, 5, 2, 'lrd')], // a small circle, posts left, right and below
  flare: () => [...xDot(), ...xCorners(8, 4)], // explosives: square corners, bigger for a bigger blast
  rocket: () => [...xDot(), ...xCorners(13, 5)],
};
const crossFor = w => (CROSSES[w.id] ?? (w.hold === 'pistol' || w.melee ? CROSSES.voxel : CROSSES.ar))();
let crossId = '';
function drawCross(w) {
  if (w.id === crossId) return;
  crossId = w.id;
  const cv = $('cross'), dpr = Math.max(1, Math.round(devicePixelRatio || 1)), g = cv.getContext('2d'), rects = crossFor(w), c = CROSS_S / 2;
  cv.width = cv.height = CROSS_S * dpr; cv.style.width = cv.style.height = CROSS_S + 'px';
  g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, CROSS_S, CROSS_S);
  g.fillStyle = 'rgba(0,0,0,.55)'; for (const [x, y, rw, rh] of rects) g.fillRect(c + x - 1, c + y - 1, rw + 2, rh + 2);
  g.fillStyle = '#fff'; for (const [x, y, rw, rh] of rects) g.fillRect(c + x, c + y, rw, rh);
}

// ---- hit markers: four diagonal lines that shoot out from round the crosshair and fade. White = body, gold = headshot, red = it died.
// A shotgun blast or a beam lands lots of hits at once; within HM_GAP a marker only restarts for a better kind of hit
const HM_COL = { body: '#ffffff', head: '#ffd23f', kill: '#ff3b3b' }, HM_RANK = { body: 0, head: 1, kill: 2 }, HM_GAP = 70;
let hmT = -1e9, hmRank = -1;
function hitMarker(kind) {
  const now = performance.now();
  if (now - hmT < HM_GAP && HM_RANK[kind] <= hmRank) return;
  hmT = now; hmRank = HM_RANK[kind];
  const kill = kind === 'kill', far = kill ? 18 : 14, dur = kill ? 320 : 220;
  [...$('hm').children].forEach((el, i) => {
    const a = 45 + 90 * i;
    el.style.background = HM_COL[kind]; el.style.height = (kill ? 10 : 8) + 'px';
    el.getAnimations().forEach(x => x.cancel());
    // fully visible for the first part of the flight out, then fades as it slows
    const at = r => `rotate(${a}deg) translateY(${r}px)`;
    el.animate([{ transform: at(5), opacity: 1, easing: 'ease-out' }, { transform: at(5 + (far - 5) * .7), opacity: 1, offset: .45, easing: 'ease-out' },
      { transform: at(far), opacity: 0 }], { duration: dur });
  });
}
