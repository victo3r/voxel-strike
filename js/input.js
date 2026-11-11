// key bindings, two keys per action
const ACTIONS = [
  ['fwd', 'Move forward'], ['back', 'Move back'], ['left', 'Move left'], ['right', 'Move right'], ['jump', 'Jump'],
  ['shoot', 'Shoot'], ['aim', 'Aim / scope'], ['reload', 'Reload'], ['next', 'Next gun'], ['prev', 'Previous gun'],
  ['lookL', 'Look left'], ['lookR', 'Look right'], ['lookU', 'Look up'], ['lookD', 'Look down'],
  ['slot1', 'Primary slot'], ['slot2', 'Backup slot'], ['slot3', 'Melee slot'], ['slot4', 'Special slot'], ['slot5', 'Sniper slot'], ['slot6', 'Premium slot'],
  ['board', 'Leaderboard (hold)'], ['chat', 'Chat'], ['menu', 'Menu'],
];
const DEFAULT_BINDS = {
  fwd: ['KeyW', ''], back: ['KeyS', ''], left: ['KeyA', ''], right: ['KeyD', ''], jump: ['Space', ''],
  shoot: ['Mouse0', 'KeyF'], aim: ['Mouse2', 'ShiftLeft'], reload: ['KeyR', ''],
  next: ['WheelDown', 'KeyE'], prev: ['WheelUp', 'KeyQ'],
  lookL: ['ArrowLeft', ''], lookR: ['ArrowRight', ''], lookU: ['ArrowUp', ''], lookD: ['ArrowDown', ''],
  slot1: ['Digit1', ''], slot2: ['Digit2', ''], slot3: ['Digit3', ''], slot4: ['Digit4', ''], slot5: ['Digit5', ''], slot6: ['Digit6', ''],
  board: ['Tab', ''], chat: ['KeyT', 'Enter'], menu: ['KeyP', ''],
};
const copyBinds = b => Object.fromEntries(Object.entries(b).map(([k, v]) => [k, [...v]]));
let binds = copyBinds(DEFAULT_BINDS);
try { const saved = JSON.parse(localStorage.getItem('voxelstrike-binds')); if (saved) for (const k in binds) if (Array.isArray(saved[k])) binds[k] = [saved[k][0] ?? '', saved[k][1] ?? '']; } catch {}
if (Object.keys(binds).some(k => k !== 'menu' && binds[k].includes('KeyP'))) binds.menu = ['', '']; // P already used for something else
const saveBinds = () => { try { localStorage.setItem('voxelstrike-binds', JSON.stringify(binds)); } catch {} };
// look sensitivity
const DEFAULT_SENS = { mouse: 1, keys: 1 };
let sens = { ...DEFAULT_SENS };
try { const s = JSON.parse(localStorage.getItem('voxelstrike-sens')); if (s) for (const k in sens) if (s[k] > 0) sens[k] = s[k]; } catch {}
const saveSens = () => { try { localStorage.setItem('voxelstrike-sens', JSON.stringify(sens)); } catch {} };
// field of view
const FOV_DEF = 75, FOV_MIN = 60, FOV_MAX = 90;
let fovBase = FOV_DEF;
try { const f = +localStorage.getItem('voxelstrike-fov'); if (f >= FOV_MIN && f <= FOV_MAX) fovBase = f; } catch {}
function renderSens() {
  for (const k in sens) { $('sens_' + k).value = sens[k]; $('sensV_' + k).textContent = sens[k].toFixed(2) + '×'; }
  $('fovIn').value = fovBase; $('fovV').textContent = fovBase + '°';
  $('vol').value = volume; $('volV').textContent = Math.round(volume * 100) + '%';
  $('mvol').value = musicVol; $('mvolV').textContent = Math.round(musicVol * 100) + '%';
  // mute buttons
  document.querySelectorAll('.sliders .mute').forEach(b => { const m = mutes[b.dataset.m]; b.innerHTML = ico(m ? 'sndOff' : 'snd'); b.classList.toggle('on', m); });
  $('vol').classList.toggle('off', mutes.sfx); $('volV').classList.toggle('off', mutes.sfx);
  $('mvol').classList.toggle('off', mutes.music); $('mvolV').classList.toggle('off', mutes.music);
}
document.querySelectorAll('.sliders .mute').forEach(b => b.addEventListener('click', e => { e.stopPropagation(); const k = b.dataset.m; setMute(k, !mutes[k]); renderSens(); if (!mutes.sfx) sfx('ui'); }));
// other control options
const DEFAULT_OPTS = { aa: TOUCH ? 2 : 0, toggleAim: false, wheel: true, chat: true }; // thumbs get aim help
let opts = { ...DEFAULT_OPTS };
try { const o = JSON.parse(localStorage.getItem('voxelstrike-opts')); if (o) for (const k in opts) if (typeof o[k] === typeof opts[k]) opts[k] = o[k]; } catch {}
const saveOpts = () => { try { localStorage.setItem('voxelstrike-opts', JSON.stringify(opts)); } catch {} };
const AA_DESC = ['Off', 'Slows your aim near enemies and nudges it onto them, but fast flicks get no help', 'Like low but stronger'];
function renderOpts() {
  document.querySelectorAll('#aaQ button').forEach(b => b.classList.toggle('sel', +b.dataset.v === opts.aa));
  $('aaDesc').textContent = AA_DESC[opts.aa];
  $('optToggleAim').checked = opts.toggleAim; $('optWheel').checked = opts.wheel;
  $('optChat').checked = opts.chat && !cgNoChat(); $('optChat').disabled = cgNoChat(); // follow CrazyGames' chat setting
}
$('aaQ').addEventListener('click', e => { const b = e.target.closest('button'); if (!b || +b.dataset.v === opts.aa) return; opts.aa = +b.dataset.v; saveOpts(); renderOpts(); sfx('ui'); });
$('optToggleAim').addEventListener('change', e => { opts.toggleAim = e.target.checked; aimOn = false; saveOpts(); });
$('optWheel').addEventListener('change', e => { opts.wheel = e.target.checked; saveOpts(); });
$('optChat').addEventListener('change', e => { opts.chat = e.target.checked; saveOpts(); if (!opts.chat) $('chatLog').innerHTML = ''; });
let aimOn = false;
renderOpts();

// aim assist: slows your aim near enemies, never moves it on its own
const AA = [null, { zone: 4.5, slow: .35, pull: .45, follow: .35 }, { zone: 5.5, slow: .42, pull: .6, follow: .45 }];
const AA_SLOW_V = 2, AA_FAST_V = 5.5, AA_RANGE = 80, AA_ACTIVE_MS = 150;
let aaT = null, aaLastT = 0, aaMoveAt = -1e9, aaFade = 0, aaPrev = null;
const aaV = new THREE.Vector3(), aaRay = new THREE.Raycaster();
const wrapA = a => Math.atan2(Math.sin(a), Math.cos(a));
// how far the crosshair is from an enemy
function aaErr(t) {
  let ey = wrapA(t.yaw - P.yaw); ey = Math.sign(ey) * Math.max(0, Math.abs(ey) - t.w);
  const ep = P.pitch < t.bot ? t.bot - P.pitch : P.pitch > t.top ? t.top - P.pitch : 0;
  return [ey, ep];
}
// pick the closest visible enemy near the crosshair
function aaTarget() {
  aaPick();
  // follow a moving enemy a little while you're aiming
  const L = AA[opts.aa], t = aaT;
  if (!t) { aaPrev = null; return; }
  const mid = (t.bot + t.top) / 2;
  if (aaPrev && aaPrev.z === t.z && performance.now() - aaMoveAt < AA_ACTIVE_MS && aaFade > 0) {
    const dy = wrapA(t.yaw - aaPrev.yaw), dp = mid - aaPrev.mid;
    if (Math.abs(dy) < .15 && Math.abs(dp) < .15) { // skip respawns
      const close = 1 - Math.hypot(...aaErr(t)) / t.zone, k = L.follow * aaFade * Math.max(0, close);
      P.yaw += dy * k; P.pitch = Math.max(-1.5, Math.min(1.5, P.pitch + dp * k));
    }
  }
  aaPrev = { z: t.z, yaw: t.yaw, mid };
}
function aaPick() {
  aaT = null;
  const L = AA[opts.aa]; if (!L || !locked || respawnT > 0) return;
  const c = camera.position, zone = THREE.MathUtils.degToRad(L.zone) * camera.fov / fovBase, near = [];
  for (const z of zombies) {
    if (z.dead || !z.glowMs || !z.glowOn) continue;
    const p = z.g.position, s = z.scale || 1, dx = p.x - c.x, dz = p.z - c.z, d = Math.hypot(dx, dz);
    if (d > AA_RANGE || d < .3) continue;
    const t = { z, zone, yaw: Math.atan2(-dx, -dz), w: Math.atan(.3 * s / d), bot: Math.atan2(p.y + .2 * s - c.y, d), top: Math.atan2(p.y + 1.85 * s - c.y, d) };
    const e = Math.hypot(...aaErr(t)); if (e < zone) near.push([e, t]);
  }
  near.sort((a, b) => a[0] - b[0]);
  for (const [, t] of near.slice(0, 3)) {
    const p = t.z.g.position, to = aaV.set(p.x, p.y + 1.1 * (t.z.scale || 1), p.z).sub(c), d = to.length();
    aaRay.set(c, to.divideScalar(d)); aaRay.far = d;
    if (!aaRay.intersectObjects(crateMeshes, false).length) { aaT = t; return; }
  }
}
// add aim assist to a mouse movement
function aaLook(dy, dp, dt) {
  const L = AA[opts.aa], a = Math.hypot(dy, dp);
  if (!L || !aaT || !a) return [dy, dp];
  const k = camera.fov / fovBase, v = a / Math.max(dt, .001);
  const fade = Math.max(0, Math.min(1, (AA_FAST_V * k - v) / ((AA_FAST_V - AA_SLOW_V) * k)));
  aaMoveAt = performance.now(); aaFade = fade;
  const [ey, ep] = aaErr(aaT), err = Math.hypot(ey, ep), close = 1 - err / aaT.zone;
  if (!fade || close <= 0) return [dy, dp];
  const slow = 1 - L.slow * fade * close; dy *= slow; dp *= slow;
  if (err > 0 && dy * ey + dp * ep > 0) { const amt = Math.min(err, L.pull * a * fade * close); dy += ey / err * amt; dp += ep / err * amt; }
  return [dy, dp];
}

for (const k in sens) $('sens_' + k).addEventListener('input', e => { sens[k] = +e.target.value; saveSens(); renderSens(); });
$('fovIn').addEventListener('input', e => { fovBase = Math.max(FOV_MIN, Math.min(FOV_MAX, +e.target.value || FOV_DEF)); try { localStorage.setItem('voxelstrike-fov', fovBase); } catch {} renderSens(); });
$('vol').addEventListener('input', e => { setVolume(+e.target.value); renderSens(); });
$('mvol').addEventListener('input', e => { setMusicVolume(+e.target.value); renderSens(); });
$('vol').addEventListener('change', () => sfx('ui'));
renderSens();
// graphics settings
const GFX_DESC = {
  high: 'Full resolution and smooth edges, best on a gaming PC',
  medium: 'No edge smoothing and standard resolution, good for laptops and Chromebooks',
  low: 'Medium without the grass, fireflies and light shafts, and a shorter view',
};
const saveGfx = () => { try { localStorage.setItem('voxelstrike-gfx', JSON.stringify(gfx)); } catch {} };
function renderGfx() {
  document.querySelectorAll('#gfxQ button').forEach(b => b.classList.toggle('sel', b.dataset.q === gfx.q));
  $('gfxDesc').textContent = GFX_DESC[gfx.q];
  document.body.classList.toggle('lowfx', gfx.q === 'low');
  $('gfxRes').value = gfx.res; $('gfxResV').textContent = Math.round(gfx.res * 100) + '%';
  $('gfxFps').checked = gfx.fps; $('fps').style.display = gfx.fps ? '' : 'none';
  $('gfxNote').textContent = gfxQ().aa !== gfxAA ? 'Edge smoothing turns ' + (gfxQ().aa ? 'on' : 'off') + ' the next time you reload the page.' : '';
}
$('gfxQ').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b || b.dataset.q === gfx.q) return;
  gfx.q = b.dataset.q; saveGfx(); applyGfx(); renderGfx(); sfx('ui');
});
$('gfxRes').addEventListener('input', e => { gfx.res = +e.target.value; saveGfx(); applyGfx(); renderGfx(); });
$('gfxFps').addEventListener('change', e => { gfx.fps = e.target.checked; saveGfx(); renderGfx(); });
renderGfx();
// touch buttons press 'T:<action>'
const held = a => keys['T:' + a] || binds[a].some(c => c && keys[c]);
const isBind = (a, code) => code === 'T:' + a || binds[a].includes(code);
function nice(code) {
  if (!code) return '-';
  const named = { Mouse0: 'Left Click', Mouse1: 'Middle Click', Mouse2: 'Right Click', Mouse3: 'Mouse 4', Mouse4: 'Mouse 5',
    WheelUp: 'Scroll Up', WheelDown: 'Scroll Down', ArrowUp: ico('up'), ArrowDown: ico('down'), ArrowLeft: ico('left'), ArrowRight: ico('right'),
    ShiftLeft: 'L Shift', ShiftRight: 'R Shift', ControlLeft: 'L Ctrl', ControlRight: 'R Ctrl', AltLeft: 'L Alt', AltRight: 'R Alt' };
  return named[code] ?? code.replace(/^Key|^Digit/, '');
}
const renderHelp = () => renderHotbar();
let rebinding = null;
function renderBinds() {
  $('bindList').innerHTML = ACTIONS.map(([a, label]) => `<span>${label}</span>` + [0, 1].map(s =>
    `<button data-a="${a}" data-s="${s}" class="${rebinding && rebinding.a === a && rebinding.s === s ? 'wait' : ''}">${rebinding && rebinding.a === a && rebinding.s === s ? 'press…' : nice(binds[a][s])}</button>`).join('')).join('');
}
function assign(code) {
  const { a, s } = rebinding; rebinding = null;
  if (code !== null) {
    if (code) for (const k in binds) binds[k] = binds[k].map(c => c === code ? '' : c);
    binds[a][s] = code; saveBinds(); renderHelp(); sfx('ui');
  }
  renderBinds();
}
// rebinding a key (on mousedown so the click itself isn't bound)
$('bindList').addEventListener('mousedown', e => {
  const b = e.target.closest('button'); if (!b || rebinding) return;
  e.stopPropagation(); e.preventDefault();
  rebinding = { a: b.dataset.a, s: +b.dataset.s }; renderBinds(); sfx('ui');
});
// settings tabs
let setTab = 'controls';
function showSetTab(t) {
  setTab = t; rebinding = null; renderBinds(); if (t === 'players') renderPlayers();
  document.querySelectorAll('#setTabs button').forEach(b => b.classList.toggle('sel', b.dataset.t === t));
  document.querySelectorAll('#setBody section').forEach(s => s.style.display = s.dataset.t === t ? '' : 'none');
  $('setBody').scrollTop = 0;
}
$('setTabs').addEventListener('click', e => { const b = e.target.closest('button'); if (b && b.dataset.t !== setTab) { showSetTab(b.dataset.t); sfx('ui'); } });
function openSettings() { $('acctErr').textContent = ''; showSetTab(setTab); $('binds').style.display = 'flex'; }
$('ctrlBtn').addEventListener('click', e => { e.stopPropagation(); openSettings(); });
$('bindReset').addEventListener('click', () => { rebinding = null; binds = copyBinds(DEFAULT_BINDS); saveBinds(); sens = { ...DEFAULT_SENS }; saveSens(); fovBase = FOV_DEF; try { localStorage.removeItem('voxelstrike-fov'); } catch {} renderSens(); opts = { ...DEFAULT_OPTS }; aimOn = false; saveOpts(); renderOpts(); renderHelp(); renderBinds(); });
renderHelp();
const closeBinds = () => { rebinding = null; $('binds').style.display = 'none'; $('acctPass').value = ''; };
$('bindX').addEventListener('click', closeBinds);
addEventListener('keydown', e => { if (e.code === 'Escape' && !rebinding && $('binds').style.display === 'flex') closeBinds(); });

function press(code) {
  if (!locked || chatting) return;
  if (isBind('menu', code)) { unlockMouse(); return; } // like Esc, but stays fullscreen
  if (isBind('chat', code)) { openChat(); if (chatting) return; }
  if (isBind('shoot', code)) shoot();
  if (isBind('reload', code)) reload();
  if (isBind('aim', code) && (opts.toggleAim || code === 'T:aim')) aimOn = !aimOn;
  const sw = opts.wheel || !code.startsWith('Wheel');
  const before = cur;
  if (sw && isBind('next', code)) cycle(1);
  if (sw && isBind('prev', code)) cycle(-1);
  for (let s = 0; s < CATS.length; s++) if (sw && isBind('slot' + (s + 1), code)) selectSlot(s);
  if (cur !== before) aimOn = false;
}
addEventListener('keydown', e => {
  if (rebinding) {
    e.preventDefault();
    assign(e.code === 'Escape' ? null : (e.code === 'Backspace' || e.code === 'Delete') ? '' : e.code);
    return;
  }
  if (chatting) return;
  if (locked && (e.code === 'Space' || e.code.startsWith('Arrow') || e.code === 'Tab' || isBind('chat', e.code))) e.preventDefault();
  if (e.target.tagName === 'INPUT') return;
  if (e.repeat) return;
  keys[e.code] = true;
  press(e.code);
});
addEventListener('keyup', e => keys[e.code] = false);
addEventListener('mousedown', e => {
  gestureAt = performance.now();
  if (TOUCH) return; // taps make fake mouse clicks
  const code = 'Mouse' + e.button;
  if (rebinding) { if (!e.target.closest('#bindReset,#bindX,#setTabs,.sliders,.seg,.tick')) { e.preventDefault(); assign(code); } return; }
  if (chatting) { e.preventDefault(); return; }
  // clicks on menus don't shoot
  if (!locked) return;
  keys[code] = true; press(code);
});
addEventListener('mouseup', e => keys['Mouse' + e.button] = false);
addEventListener('contextmenu', e => e.preventDefault());
// lock the mouse, asking for raw input to avoid camera snaps
function lockMouse() {
  if (TOUCH) { touchFull(); setTouchLock(true); return; }
  const el = renderer.domElement;
  clearTimeout(relockT); relockT = 0;
  let p;
  try { p = el.requestPointerLock({ unadjustedMovement: true }); } catch { p = null; }
  if (p?.catch) p.catch(() => el.requestPointerLock()?.catch?.(() => {}));
  else if (!p && document.pointerLockElement !== el) el.requestPointerLock()?.catch?.(() => {});
}
function unlockMouse() { if (TOUCH) setTouchLock(false); else document.exitPointerLock(); }
function setTouchLock(on) { if (touchLock === on) return; touchLock = on; document.dispatchEvent(new Event('pointerlockchange')); }
// phones: fullscreen and sideways while you play (CrazyGames does its own)
function touchFull() {
  if (cg.on || document.fullscreenElement || !document.documentElement.requestFullscreen) return;
  document.documentElement.requestFullscreen({ navigationUI: 'hide' }).then(() => screen.orientation?.lock?.('landscape').catch(() => {})).catch(() => {});
}
document.addEventListener('visibilitychange', () => { if (document.hidden && TOUCH) unlockMouse(); });
// Chrome refuses to relock right after Esc, so keep retrying for a bit
let gestureAt = -1e9, relockT = 0;
const RELOCK_FOR = 3000, RELOCK_EVERY = 150;
const canRelock = () => !locked && !shopOpen && !inLobby && !matchOver && !armOpen && $('binds').style.display !== 'flex' && $('away').style.display !== 'flex';
let lastMove = 0;
addEventListener('mousemove', e => {
  if (!locked || TOUCH) return;
  const dx = e.movementX, dy = e.movementY, m = Math.hypot(dx, dy);
  // ignore one-off huge mouse jumps (a browser glitch)
  if (m > 250 && m > lastMove * 8 + 60) { lastMove = m; return; }
  lastMove = m;
  const s = .0022 * sens.mouse * camera.fov / fovBase;
  const gap = e.timeStamp - aaLastT; aaLastT = e.timeStamp;
  const [ay, ap] = aaLook(-dx * s, -dy * s, gap > 0 && gap < 100 ? gap / 1000 : 1 / 60);
  P.yaw += ay;
  P.pitch = Math.max(-1.5, Math.min(1.5, P.pitch + ap));
});
let wheelT = 0;
addEventListener('wheel', e => {
  if (!e.deltaY) return;
  const code = e.deltaY > 0 ? 'WheelDown' : 'WheelUp';
  if (rebinding) { assign(code); return; }
  const now = performance.now(); if (now - wheelT < 120) return;
  wheelT = now; press(code);
}, { passive: true });
$('menu').addEventListener('click', () => {
  if (dead) restart();
  lockMouse();
});
// switching windows mid-match shows a small CLICK TO PLAY bar instead of the menu
const TAP = TOUCH ? 'Tap' : 'Click';
if (TOUCH) $('awayBar').firstChild.textContent = 'TAP TO PLAY';
let blurAt = -1e9, unlockAt = -1e9;
const AWAY_MS = 300;
const runsBehindMenu = () => pvp() && !dead && !shopOpen && !inLobby && !matchOver;
function showAway(on) { $('away').style.display = on ? 'flex' : 'none'; if (on) $('menu').style.display = 'none'; }
addEventListener('blur', () => {
  blurAt = performance.now();
  if (!locked && blurAt - unlockAt < AWAY_MS && runsBehindMenu() && $('menu').style.display !== 'none') showAway(true);
});
$('away').addEventListener('click', () => lockMouse());
const awayMenu = () => { showAway(false); $('menu').style.display = 'flex'; };
$('awayMenu').addEventListener('click', e => { e.stopPropagation(); awayMenu(); });
addEventListener('keydown', e => { if (e.code === 'Escape' && !rebinding && !locked && $('away').style.display === 'flex') awayMenu(); });
document.addEventListener('pointerlockchange', () => {
  locked = TOUCH ? touchLock : document.pointerLockElement === renderer.domElement;
  net.onLock?.(locked);
  if (!locked) unlockAt = performance.now();
  const away = !locked && runsBehindMenu() && (!document.hasFocus() || unlockAt - blurAt < AWAY_MS);
  showAway(away);
  $('menu').style.display = locked || away || shopOpen || inLobby || matchOver ? 'none' : 'flex';
  $('menuTip').textContent = cg.on && binds.menu[0] ? `Tip: press ${nice(binds.menu[0])} for this menu to stay in fullscreen` : '';
  $('shop').style.display = shopOpen && !locked ? 'flex' : 'none';
  if (locked) closeArmory();
  if (!locked) {
    for (const k in keys) keys[k] = false;
    aimOn = false;
    $('menuTitle').textContent = dead ? 'YOU DIED' : pvp() ? 'MENU' : 'PAUSED';
    $('menuPlay').textContent = dead ? 'TRY AGAIN' : pvp() ? 'BACK TO GAME' : 'RESUME';
    $('msg').textContent = dead ? `${newBest ? 'NEW BEST! ' : ''}Wave ${wave} · ${kills} kills. ${TAP} to try again` : pvp() ? '' : TAP + ' to resume';
    $('armBtn').style.display = $('menuFriends').style.display = pvp() ? '' : 'none';
    $('menuPlayers').style.display = net.on ? '' : 'none';
    renderHelp();
  }
});
// mouse lock refused: retry for a bit, then show the menu
document.addEventListener('pointerlockerror', () => {
  if (shopOpen || inLobby || matchOver) return;
  if (performance.now() - gestureAt < RELOCK_FOR) { if (!relockT) relockT = setTimeout(() => { relockT = 0; if (canRelock()) lockMouse(); }, RELOCK_EVERY); return; }
  showAway(false); $('menuTitle').textContent = 'MENU'; $('msg').textContent = TAP + ' to continue'; $('menu').style.display = 'flex';
});

function showLobby(on) {
  inLobby = on;
  $('lobby').style.display = on ? 'flex' : 'none';
  $('hud').style.display = on ? 'none' : '';
  vm.visible = !on;
  if (on) { $('menu').style.display = 'none'; showAway(false); camera.fov = fovBase; camera.updateProjectionMatrix(); musicLobby(); armIcon(); }
}
$('lobbyBtn').addEventListener('click', e => { e.stopPropagation(); net.leave(); restart(); showLobby(true); });

// the play button brings up mode select, then map select
const ALL_MAPS = ['roofs', 'forest', 'cove', 'resort', 'sky'];
const V_MAPS = 10; // bump when the map pictures change
const MODES = [
  // zombies only on the yard for now
  { id: 'zombies', name: 'ZOMBIE WAVES', desc: 'Test your loadout and strategy against endless zombie waves', maps: ['yard'] },
  { id: 'dm', name: 'DEATHMATCH', desc: 'A 4 minute free-for-all, top score wins', maps: ALL_MAPS },
  { id: 'team', name: 'TEAM FIGHT', desc: '4 minutes of blue vs red, most kills wins', maps: ALL_MAPS },
  { id: 'blitzMenu', name: 'BLITZ', desc: '90 seconds to rack up all the kills you can', sub: [
    { id: 'blitz', name: 'FREE FOR ALL', title: 'BLITZ · FREE FOR ALL', desc: 'Everyone for themselves, most kills wins', maps: ALL_MAPS },
    { id: 'blitzTeam', name: 'TEAM', title: 'BLITZ · TEAM', desc: 'Blue vs red, most kills wins', maps: ALL_MAPS },
  ] },
  { id: 'private', name: 'PRIVATE MATCH', desc: 'Make a room for friends or join one with a code', priv: true },
];
const PLAY_MODES = MODES.flatMap(m => m.sub ? m.sub.map(s => ({ ...s, parent: m.id })) : m.priv ? [] : [m]);
if (!MAPS[mapId]) mapId = 'yard';
const savedMode = localStorage.getItem('voxelstrike-mode');
if (PLAY_MODES.some(m => m.id === savedMode)) mode = savedMode;
// which page of the picker you're on
let pickMode = null, pickPriv = false;
// ONLINE / VS BOTS switch
const onlinePref = () => { if (net.wsOk === false) return false; const s = localStorage.getItem('voxelstrike-online'); return s === null ? true : s === '1'; };
function renderPill() {
  const on = onlinePref(), blocked = net.wsOk === false;
  document.querySelectorAll('#pickPill button').forEach(b => { b.classList.toggle('sel', (b.dataset.on === '1') === on); b.disabled = blocked && b.dataset.on === '1'; });
  $('pillNote').textContent = blocked ? 'Online play is not available on this network' : on ? 'Play against other people' : 'A match against bots on this device';
}
$('pickPill').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b || b.disabled) return;
  localStorage.setItem('voxelstrike-online', b.dataset.on); renderPill(); sfx('ui');
});
const PRIV_CARDS = [
  { id: 'privCreate', name: 'CREATE ROOM', desc: 'Pick a mode and map, then share the code' },
  { id: 'privJoin', name: 'JOIN WITH CODE', desc: 'Type in the 6-letter code from a friend' },
];
function renderPick() {
  const m = PLAY_MODES.find(m => m.id === pickMode), group = MODES.find(g => g.id === pickMode && g.sub);
  const priv = pickMode === 'private', join = pickMode === 'privJoin', create = pickMode === 'privCreate';
  $('pickTitle').textContent = m ? m.title || m.name : group ? group.name : priv ? 'PRIVATE MATCH' : join ? 'JOIN WITH A CODE' : create ? 'PRIVATE · SELECT MODE' : 'SELECT MODE';
  const back = m ? (m.parent ? 'BLITZ' : pickPriv ? 'PRIVATE' : 'MODES') : group ? (pickPriv ? 'PRIVATE' : 'MODES') : priv ? 'MODES' : join || create ? 'PRIVATE' : 'BACK';
  $('pickBack').innerHTML = ico('left') + ' ' + back;
  $('pickList').className = m ? 'maps' : join ? 'code' : 'modes';
  const pill = !!m && m.id !== 'zombies' && !pickPriv;
  $('pickPill').style.display = pill ? '' : 'none'; if (pill) renderPill();
  const card = o => `<div class="mc" data-id="${o.id}"><button data-mode="${o.id}"><img class="mi" src="${MODE_ICONS[o.id]}"><b>${o.name}</b></button><button class="go" data-go="${o.id}" tabindex="-1">${o.priv || o.id.startsWith('priv') ? 'OPEN' : 'PLAY'}</button></div>`;
  pickSel = null; $('pickDesc').classList.remove('in'); $('pickDesc').textContent = m ? m.desc : '';
  if (join) {
    $('pickList').innerHTML = `<div class="codeBox"><p>Ask a friend for their room code</p><input id="codeIn" maxlength="6" placeholder="CODE" autocomplete="off" spellcheck="false" autocapitalize="characters"><button id="codeGo">JOIN</button><p id="codeErr"></p></div>`;
    $('codeIn').focus(); return;
  }
  // map cards
  $('pickList').innerHTML = m
    ? m.maps.map(id => { const d = MAPS[id], size = d.size[0].toUpperCase() + d.size.slice(1), r = RULES[m.id];
        return `<button data-map="${id}" style="background-image:linear-gradient(transparent 45%,rgba(0,0,0,.72)),url('img/maps/${id}.jpg?v=${V_MAPS}')"><b>${d.name.toUpperCase()}</b><small>${size}${r ? ` · ${r.players[d.size]} players` : ''}</small></button>`; }).join('')
    : (priv ? PRIV_CARDS : group ? group.sub : create ? MODES.filter(x => x.id !== 'zombies' && !x.priv) : MODES).map(card).join('');
}
// first click selects a mode card, second click opens it
let pickSel = null;
const PICK_CARDS = [...MODES, ...MODES.flatMap(m => m.sub || []), ...PRIV_CARDS];
function pickCard(id) {
  pickSel = id;
  document.querySelectorAll('#pickList .mc').forEach(c => c.classList.toggle('sel', c.dataset.id === id));
  const d = $('pickDesc'); d.textContent = PICK_CARDS.find(c => c.id === id)?.desc || '';
  d.classList.remove('in'); void d.offsetWidth; d.classList.add('in');
}
const pickOpen = () => $('pick').style.display === 'flex';
function showPick(on) {
  $('pick').style.display = on ? 'flex' : 'none';
  $('lobbyUI').style.display = on ? 'none' : '';
  if (on) { pickMode = null; pickPriv = false; renderPick(); }
}
$('playBtn').addEventListener('click', () => { showPick(true); net.probe?.(); sfx('ui'); });
$('pickBack').addEventListener('click', () => {
  const m = PLAY_MODES.find(m => m.id === pickMode), group = MODES.find(g => g.id === pickMode && g.sub);
  if (pickMode === 'private') pickMode = null;
  else if (pickMode === 'privJoin' || pickMode === 'privCreate') { pickMode = 'private'; pickPriv = false; }
  else if (m) pickMode = m.parent ?? (pickPriv ? 'privCreate' : null);
  else if (group) pickMode = pickPriv ? 'privCreate' : null;
  else { showPick(false); sfx('ui'); return; }
  renderPick(); sfx('ui');
});
function joinWithCode() {
  const code = ($('codeIn')?.value || '').toUpperCase().replace(/[^A-Z2-9]/g, '');
  if (code.length !== 6) { $('codeErr').textContent = 'A code is 6 letters and numbers'; return; }
  $('codeErr').textContent = ''; sfx('ui'); net.start({ code });
}
$('pickList').addEventListener('click', e => {
  if (e.target.closest('#codeGo')) return joinWithCode();
  const b = e.target.closest('button'); if (!b || !(b.dataset.mode || b.dataset.map || b.dataset.go)) return;
  if (b.dataset.mode && pickSel !== b.dataset.mode) { pickCard(b.dataset.mode); sfx('ui'); return; }
  if (b.dataset.mode || b.dataset.go) {
    const id = b.dataset.mode || b.dataset.go;
    if (id === 'private') { pickMode = 'private'; pickPriv = false; renderPick(); sfx('ui'); return; }
    if (id === 'privCreate' || id === 'privJoin') { pickMode = id; pickPriv = id === 'privCreate'; renderPick(); sfx('ui'); return; }
    pickMode = id;
    const m = PLAY_MODES.find(m => m.id === pickMode);
    if (m) {
      mode = pickMode; localStorage.setItem('voxelstrike-mode', mode);
      if (!m.maps.includes(mapId)) mapId = m.maps[0];
    }
    renderPick(); sfx('ui'); return;
  }
  mapId = b.dataset.map; localStorage.setItem('voxelstrike-map', mapId);
  // online: net.js finds a room
  if (mode !== 'zombies' && (pickPriv || onlinePref())) { net.start({ mode, map: mapId, create: pickPriv }); return; }
  showPick(false); restart(); showLobby(false); lockMouse();
});
$('pickList').addEventListener('keydown', e => { if (e.target.id === 'codeIn' && (e.code === 'Enter' || e.code === 'NumpadEnter')) { e.preventDefault(); joinWithCode(); } });
addEventListener('keydown', e => { if (e.code === 'Escape' && inLobby && pickOpen()) $('pickBack').click(); });
// your name
$('nameIn').value = myName;
const saveName = () => { $('nameIn').value = setMyName($('nameIn').value); };
$('nameIn').addEventListener('change', saveName);
$('nameIn').addEventListener('blur', saveName);
$('nameIn').addEventListener('keydown', e => { if (e.code === 'Enter' || e.code === 'NumpadEnter') $('nameIn').blur(); });
$('nameDice').addEventListener('click', () => { $('nameIn').value = setMyName(newMyName(myName)); sfx('ui'); });
document.addEventListener('pointerlockchange', () => { if (document.activeElement === $('nameIn')) $('nameIn').blur(); });
$('lobbySet').addEventListener('click', () => { openSettings(); sfx('ui'); });

// pixel icons for the lobby buttons
function pixIcon(rows, col, scale = 4) {
  const h = rows.length, w = rows[0].length, c = document.createElement('canvas');
  c.width = (w + 2) * scale; c.height = (h + 2) * scale;
  const g = c.getContext('2d'), on = (x, y) => rows[y]?.[x] === 'X';
  for (let y = -1; y <= h; y++) for (let x = -1; x <= w; x++) {
    const fill = on(x, y), edge = !fill && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => on(x + a, y + b));
    if (!fill && !edge) continue;
    g.fillStyle = fill ? (y < h / 2 ? col[0] : col[1]) : '#000';
    g.fillRect((x + 1) * scale, (y + 1) * scale, scale, scale);
  }
  return c.toDataURL();
}
$('setIcon').src = pixIcon([
  '.....XXXX.....',
  '..XX.XXXX.XX..',
  '.XXXXXXXXXXXX.',
  '.XXXXXXXXXXXX.',
  '..XXXXXXXXXX..',
  'XXXXXX..XXXXXX',
  'XXXXX....XXXXX',
  'XXXXX....XXXXX',
  'XXXXXX..XXXXXX',
  '..XXXXXXXXXX..',
  '.XXXXXXXXXXXX.',
  '.XXXXXXXXXXXX.',
  '..XX.XXXX.XX..',
  '.....XXXX.....',
], ['#d8dde4', '#9aa3ae']);
// play button triangle
$('playIcon').src = (() => {
  const N = 22, S = 10, SS = 6, c = document.createElement('canvas'); c.width = c.height = N * S;
  const g = c.getContext('2d'), P = [[4.5, 2], [20.5, 11], [4.5, 20]], W = 1.35;
  const edges = P.map((a, k) => { const b = P[(k + 1) % 3], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy); return [dy / l, -dx / l, a]; });
  const out = (x, y) => Math.max(...edges.map(([nx, ny, a]) => (x - a[0]) * nx + (y - a[1]) * ny)) * (edges[0][0] * (P[2][0] - P[0][0]) + edges[0][1] * (P[2][1] - P[0][1]) > 0 ? -1 : 1);
  const mix = (a, b, k) => a.map((v, i) => v + (b[i] - v) * k), LINE = [13, 74, 40];
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    let fill = 0, line = 0;
    for (let j = 0; j < SS; j++) for (let i = 0; i < SS; i++) { const d = out(x + (i + .5) / SS, y + (j + .5) / SS); if (d < 0) fill++; else if (d < W) line++; }
    const cov = (fill + line) / (SS * SS); if (!cov) continue;
    const top = mix([255, 255, 255], [212, 242, 221], y / N), col = mix(LINE, top, fill / (fill + line));
    g.fillStyle = `rgba(${col.map(Math.round)},${Math.min(1, cov * 1.15)})`; g.fillRect(x * S, y * S, S, S);
  }
  return c.toDataURL();
})();
// mode icons
function artIcon(rows, pal, scale = 8) {
  const h = rows.length, w = Math.max(...rows.map(r => r.length)), c = document.createElement('canvas');
  c.width = w * scale; c.height = h * scale;
  const g = c.getContext('2d');
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let col = pal[rows[y][x]]; if (!col) continue;
    if (typeof col === 'function') col = col(x, y, w, h);
    g.fillStyle = col; g.fillRect(x * scale, y * scale, scale, scale);
    if (col !== '#000' && y >= h / 2) { g.fillStyle = 'rgba(0,0,0,.12)'; g.fillRect(x * scale, y * scale, scale, scale); }
  }
  return c.toDataURL();
}
const BOLT_ICON = [
  '....KKKKKK.', '...KyyyyyK.', '...KyyyyK..', '..KyyyyK...', '..KyyyKKKKK', '.KyyyyyyyyK',
  '.KKKKKyyyK.', '.....KyyK..', '....KyyK...', '....KyK....', '...KyK.....', '...KK......',
];
const LOCK_ICON = [
  '....KKKK....', '...KbbbbK...', '..KbbKKbbK..', '..KbK..KbK..', '..KbK..KbK..', '.KKKKKKKKKK.',
  '.KyyyyyyyyK.', '.KyyyKKyyyK.', '.KyyyKKyyyK.', '.KyyyyKyyyK.', '.KyyyyyyyyK.', '.KKKKKKKKKK.',
];
const KEY_ICON = [
  '..KKKK..........', '.KyyyyK.........', 'KyyyyyyKKKKKKKKK', 'KyyKKyyyyyyyyyyK', 'KyyKKyyKKKKyKyKK',
  'KyyyyyyK..KyKyK.', '.KyyyyK...KKKKK.', '..KKKK..........',
];
// stopwatch
const CLOCK_ICON = (() => {
  const N = 13, c = 6, rows = ['.....KKK.....', '.....KwK.....'];
  for (let y = 0; y < N; y++) {
    let r = '';
    for (let x = 0; x < N; x++) { const d = Math.hypot(x - c, y - c); r += d > 6.4 ? '.' : d > 5.4 || (x === c && y >= 2 && y <= c) || (y === c && x >= c && x <= c + 3) ? 'K' : 'w'; }
    rows.push(r);
  }
  return rows;
})();
const iconFigure = c => ['KKKKKKK', 'KhhhhhK', 'KsssssK', 'KsKsKsK', 'KsssssK', 'KKKKKKK', `K${c.repeat(5)}K`, `K${c.repeat(5)}K`, `K${c.repeat(5)}K`, `K${c.repeat(5)}K`, 'KKKKKKK'];
const TEAM_ICON = iconFigure('b').map((r, k) => r + '..' + iconFigure('r')[k]);
const MODE_ICONS = {
  zombies: artIcon([
    'KKKKKKKKKKKK', 'KddddddddddK', 'KdgggddgggdK', 'KggggggggggK', 'KgKKggggKKgK', 'KgKKggggKKgK',
    'KggggggggggK', 'KggggggggggK', 'KggKKKKKKggK', 'KggggggggggK', 'KggggggggggK', 'KKKKKKKKKKKK',
  ], { K: '#000', g: '#5aa844', d: '#3d7d2e' }, 11),
  dm: artIcon([
    '....KKKKKKKK....', '..KKWWWWWWWWKK..', '.KWWWWWWWWWWWWK.', 'KWWWWWWWWWWWWWGK', 'KWWWWWWWWWWWWWGK', 'KWWKKKKWWKKKKWGK',
    'KWWKRRKWWKRRKWGK', 'KWWKKKKWWKKKKWGK', 'KWWWWWWKKWWWWWGK', '.KWWWWKKKKWWWGK.', '..KWWWWWWWWWGK..', '..KWKWKWKWKWGK..',
    '..KWKWKWKWKWGK..', '...KKKKKKKKKK...',
  ], { K: '#000', W: '#f0f0ea', G: '#b9bcc2', R: '#e0302a' }),
  team: artIcon(TEAM_ICON, { K: '#000', h: '#5a3a1e', s: '#e8b48a', b: '#3d7ce6', r: '#e0453a' }),
  blitzMenu: artIcon(CLOCK_ICON, { K: '#000', w: '#fff3c4' }),
  blitz: artIcon(BOLT_ICON, { K: '#000', y: '#ffd23a' }),
  blitzTeam: artIcon(BOLT_ICON, { K: '#000', y: (x, y) => x + y < 11 ? '#3d7ce6' : '#e0453a' }),
  private: artIcon(LOCK_ICON, { K: '#000', y: '#e0b84a', b: '#aab2bc' }),
  privCreate: artIcon(LOCK_ICON, { K: '#000', y: '#e0b84a', b: '#aab2bc' }),
  privJoin: artIcon(KEY_ICON, { K: '#000', y: '#e0b84a' }),
};
showLobby(true);

// reset the world for a new game (spot = where the server put you)
function restart(spot) {
  boostStart();
  zombies.forEach(z => scene.remove(z.g)); zombies.length = 0;
  booms.forEach(b => scene.remove(b.m)); booms.length = 0;
  rockets.forEach(r => scene.remove(r.m)); rockets.length = 0;
  flames.forEach(f => scene.remove(f.m)); flames.length = 0;
  flares.forEach(f => scene.remove(f.m)); flares.length = 0; grenades.forEach(g => scene.remove(g.m)); grenades.length = 0; clearBeams(); clearTracers(); clearLances(); clearBolts(scene); recoilReset();
  parts.forEach(p => scene.remove(p.m)); parts.length = 0; clearDrops(scene);
  useMap(mapId); setupPads();
  Object.assign(P, { drowned: false, burn: 0, slowT: 0, stunT: 0, stunCD: 0, vy: 0, mvx: 0, mvz: 0, yaw: 0, pitch: 0, hp: 100, max: 100, armor: 0, maxArmor: 0, dr: 0, kx: 0, kz: 0, lx: 0, lz: 0, onRamp: false }); P.pos.set(0, groundAt(0, 0, .35, floorY(0, 0)), 0); P.pos.lag = 0;
  if (spot) { P.pos.set(spot.x, spot.y ?? 0, spot.z); P.yaw = spot.yaw ?? 0; }
  wave = 0; toSpawn = 0; waveWait = 1.5; kills = 0; coins = 0; dead = false; shopWave = 0; shopOpen = false; armorBought = 0; waveReward = ''; resetRun(); zRunNew();
  WEAPONS.forEach((w, i) => { lvl[i] = 0; applyLvl(i); ammo[i] = w.mag; owned[i] = !!w.free; reserve[i] = w.inf ? Infinity : w.free ? resMax(i) : 0; }); cancelReload(); soundsOff(); newBest = false;
  emptyPads();
  cur = gi('voxel'); aimOn = false; resetSlots(); buildGun(); renderHotbar();
  setupMode();
}
