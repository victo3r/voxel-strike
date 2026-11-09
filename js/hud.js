// crosshairs: each gun has its own, made of [x, y, w, h] pixel rects
const CROSS_S = 80; // canvas size, 0, 0 is the middle
const xDot = (s = 2) => [[-s / 2, -s / 2, s, s]];
// lines out from the middle ('udlr' picks which)
function xLines(gap, len, t = 2, which = 'udlr') {
  const o = [];
  if (which.includes('r')) o.push([gap, -t / 2, len, t]);
  if (which.includes('l')) o.push([-gap - len, -t / 2, len, t]);
  if (which.includes('d')) o.push([-t / 2, gap, t, len]);
  if (which.includes('u')) o.push([-t / 2, -gap - len, t, len]);
  return o;
}
// pixel-art arcs of a circle
function xArcs(r, at, span, t = 2) {
  const R = Math.max(1, Math.round(r / t)), pts = new Set();
  for (let x = 0, y = R, d = 1 - R; x <= y; x++) { // midpoint circle
    for (const [a, b] of [[x, y], [y, x], [-x, y], [-y, x], [x, -y], [y, -x], [-x, -y], [-y, -x]]) pts.add(a + ',' + b);
    if (d < 0) d += 2 * x + 3; else { d += 2 * (x - y) + 5; y--; }
  }
  const o = [];
  for (const p of pts) {
    const [gx, gy] = p.split(',').map(Number), a = (Math.atan2(gy, gx) * 180 / Math.PI + 360) % 360;
    if (at.some(c => Math.abs(((a - c) % 360 + 540) % 360 - 180) <= span / 2)) o.push([gx * t - t / 2, gy * t - t / 2, t, t]);
  }
  return o;
}
const DIAG = [45, 135, 225, 315];
// square corners
function xCorners(h, arm, t = 2) {
  const o = [];
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) {
    const x = sx < 0 ? -h : h - arm, y = sy < 0 ? -h : h - t, vx = sx < 0 ? -h : h - t, vy = sy < 0 ? -h : h - arm;
    o.push([x, y, arm, t], [vx, vy, t, arm]);
  }
  return o;
}
// diagonal ticks
function xTicks(r0, r1, t = 2) {
  const o = [];
  for (const a of DIAG) for (let d = r0; d <= r1; d++) {
    const k = d / Math.SQRT2, rad = a * Math.PI / 180;
    o.push([Math.round(Math.sign(Math.cos(rad)) * k - t / 2), Math.round(Math.sign(Math.sin(rad)) * k - t / 2), t, t]);
  }
  return o;
}
// rifles: dot, gap, lines (faster guns get a wider gap)
const CROSSES = {
  ar: () => [...xDot(), ...xLines(5, 8)],
  thrasher: () => [...xDot(), ...xLines(6, 8)],
  eradicator: () => [...xDot(), ...xLines(9, 6), ...xTicks(10, 13)],
  voxel: () => [...xDot(), ...xLines(4, 6)],
  hitman: () => [...xDot(), ...xLines(4, 6)],
  knife: () => [...xDot(), ...xLines(4, 6)],
  herosword: () => [...xDot(), ...xLines(5, 7)],
  executioner: () => [...xDot(), ...xLines(5, 6), ...xTicks(8, 10)],
  shotgun: () => [...xDot(), ...xArcs(15, DIAG, 50)],
  trex: () => [...xDot(), ...xArcs(14, DIAG, 54)],
  starsmasher: () => [...xDot(), ...xLines(5, 8), ...xTicks(9, 11)],
  flame: () => [...xDot(), ...xArcs(18, DIAG, 40)],
  heatray: () => [...xDot(), ...xLines(3, 3), ...xArcs(10, DIAG, 44)],
  shockbeam: () => [...xDot(), ...xLines(3, 4), ...xTicks(9, 12)],
  frostwand: () => [...xDot(), ...xLines(3, 3), ...xCorners(9, 3)],
  warhammer: () => [...xDot(), ...xLines(6, 7)],
  sniper: () => [...xDot(), ...xLines(10, 5, 2, 'lrd')],
  semisniper: () => [...xDot(), ...xLines(8, 5, 2, 'lrd')],
  tigerbite: () => [...xDot(), ...xLines(9, 6, 2, 'lrd')],
  flare: () => [...xDot(), ...xCorners(8, 4)], // explosives: corners, bigger blast = bigger square
  rocket: () => [...xDot(), ...xCorners(13, 5)],
  grenade: () => [...xDot(), ...xCorners(11, 4)],
  aerial: () => [...xDot(), ...xCorners(13, 5)],
  crossbow: () => [...xDot(), ...xLines(7, 4, 2, 'lrd')],
};
const crossFor = w => (CROSSES[w.id] ?? (w.hold === 'pistol' || w.melee ? CROSSES.voxel : CROSSES.ar))();
// shooting kicks the crosshair out, then it settles back
let crossId = '', crossRects = [], crossOff = -1, crossK = 0, crossRed = false, crossRedWas = false;
// red when you're aiming at an enemy
const crossRay = new THREE.Raycaster(), crossNdc = new THREE.Vector2();
function crossOnEnemy(w) {
  if (respawnT > 0) return false;
  crossRay.setFromCamera(crossNdc, camera); crossRay.far = w.melee ? w.range : 150;
  const zz = crossRay.intersectObjects(shotTargets(), false)[0]?.object.userData.zombie;
  return !!zz && !zz.dead && !(zz.type === 'bot' && friendly(null, zz)) && (!zz.glowMs || zz.glowOn);
}
const CROSS_BACK = 26; // settle speed in pixels per second
function crossKick(px, max = 6) { if (crossK < max) crossK = Math.min(max, crossK + px); }
function kickFor(w) { return w.melee ? 2 : w.rocket || w.flare || w.grenade || w.scope || w.pellets > 1 ? 4 : 2.5; }
function tickCross(dt, w) { if (crossK > 0) crossK = Math.max(0, crossK - dt * CROSS_BACK); crossRed = crossOnEnemy(w); drawCross(w); }
function drawCross(w) {
  const off = Math.round(crossK);
  if (w.id === crossId && off === crossOff && crossRed === crossRedWas) return;
  if (w.id !== crossId) { crossId = w.id; crossRects = crossFor(w); }
  crossOff = off; crossRedWas = crossRed;
  const cv = $('cross'), dpr = Math.max(1, Math.round(devicePixelRatio || 1)), g = cv.getContext('2d'), c = CROSS_S / 2;
  if (cv.width !== CROSS_S * dpr) { cv.width = cv.height = CROSS_S * dpr; cv.style.width = cv.style.height = CROSS_S + 'px'; }
  const diag = Math.round(off * .75);
  const rects = !off ? crossRects : crossRects.map(([x, y, rw, rh]) => {
    const mx = x + rw / 2, my = y + rh / 2, sx = Math.abs(mx) > 1.5 ? Math.sign(mx) : 0, sy = Math.abs(my) > 1.5 ? Math.sign(my) : 0, k = sx && sy ? diag : off;
    return [x + sx * k, y + sy * k, rw, rh];
  });
  g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, CROSS_S, CROSS_S);
  g.fillStyle = 'rgba(0,0,0,.55)'; for (const [x, y, rw, rh] of rects) g.fillRect(c + x - 1, c + y - 1, rw + 2, rh + 2);
  g.fillStyle = crossRed ? '#ff3b3b' : '#fff'; for (const [x, y, rw, rh] of rects) g.fillRect(c + x, c + y, rw, rh);
}

// hit markers: white = body, gold = headshot, red = kill
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
    const at = r => `rotate(${a}deg) translateY(${r}px)`;
    el.animate([{ transform: at(5), opacity: 1, easing: 'ease-out' }, { transform: at(5 + (far - 5) * .7), opacity: 1, offset: .45, easing: 'ease-out' },
      { transform: at(far), opacity: 0 }], { duration: dur });
  });
}
// kill notice under the crosshair: a streak gets its badge and name, the big ones animate and have their own sound
const STREAK_ICON = { 2: 'k2', 3: 'k3', 4: 'k4', 5: 'ace', 10: 'fury', 20: 'rampage', 50: 'violence' };
const STREAK_SND = { 5: 'streak_ace', 10: 'streak_fury', 20: 'streak_rampage', 50: 'streak_violence' };
let killNoteT;
function killNotice(text, streak, head) {
  const el = $('killNote'), st = STREAKS[streak], k = st && STREAK_ICON[streak];
  el.innerHTML = (st ? `<div class="ki">${ico('s_' + k)}</div><div class="kn">${st[1]}</div>` : '') + `<div class="kt">${text}</div>`;
  el.className = ''; void el.offsetWidth; el.className = 'show' + (k ? ' k-' + k : '');
  clearTimeout(killNoteT); killNoteT = setTimeout(() => el.className = el.className.replace('show', 'gone'), streak >= 10 && st ? 2600 : 1500);
  const big = st && STREAK_SND[streak];
  if (big) { sfx(big, { v: 1.5 }); musicDuck(BUF[big]?.buf.duration ?? 1.5); } // over the music, which is loud by then
  else sfx(head || st ? 'killSpecial' : 'kill');
}

// health and armor bars, top left; the armor bar takes the colour of the armor you wear
const armorCss = () => { const T = armorOf(matchArmor()); return !T ? '#c9ced6' : T.champ ? '#c8a2ff' : `rgb(${(T.bar?.[0] ?? T.hi).join()})`; };
const armorFill = () => { const T = armorOf(matchArmor()); if (!T) return '#c9ced6'; if (T.champ) return `linear-gradient(90deg,${Object.values(GEMS).map(c => `rgb(${c.join()})`).join()})`; const [hi, c, dk] = T.bar ?? [T.hi, T.c, T.dk]; return `linear-gradient(180deg,rgb(${hi.join()}),rgb(${c.join()}) 60%,rgb(${dk.join()}))`; };
function vitBar(id, v, max, icon) {
  const el = $(id), k = max > 0 ? Math.max(0, Math.min(1, v / max)) : 0, key = `${Math.ceil(v)}/${max}/${id === 'arm' ? matchArmor() : ''}`;
  if (el._k === key) return; el._k = key;
  el.style.display = max > 0 ? '' : 'none'; if (!(max > 0)) return;
  const [ic, bar] = el.children, [lag, fill, num] = bar.children;
  if (!ic.innerHTML) ic.innerHTML = ico(icon);
  lag.style.width = fill.style.width = k * 100 + '%';
  num.textContent = Math.ceil(Math.max(0, v));
  if (id === 'arm') { fill.style.background = armorFill(); ic.style.color = armorCss(); }
}
