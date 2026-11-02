// every action has two slots; codes are keyboard e.code values, 'Mouse0'-'Mouse4', or 'WheelUp'/'WheelDown'
const ACTIONS = [
  ['fwd', 'Move forward'], ['back', 'Move back'], ['left', 'Move left'], ['right', 'Move right'], ['jump', 'Jump'],
  ['shoot', 'Shoot'], ['aim', 'Aim / scope'], ['reload', 'Reload'], ['next', 'Next gun'], ['prev', 'Previous gun'],
  ['lookL', 'Look left'], ['lookR', 'Look right'], ['lookU', 'Look up'], ['lookD', 'Look down'],
  ['slot1', 'Primary slot'], ['slot2', 'Backup slot'], ['slot3', 'Melee slot'], ['slot4', 'Special slot'], ['slot5', 'Sniper slot'], ['slot6', 'Premium slot'],
  ['board', 'Leaderboard (hold)'], ['chat', 'Chat'],
];
const DEFAULT_BINDS = {
  fwd: ['KeyW', ''], back: ['KeyS', ''], left: ['KeyA', ''], right: ['KeyD', ''], jump: ['Space', ''],
  shoot: ['Mouse0', 'KeyF'], aim: ['Mouse2', 'ShiftLeft'], reload: ['KeyR', ''],
  next: ['WheelDown', 'KeyE'], prev: ['WheelUp', 'KeyQ'],
  lookL: ['ArrowLeft', ''], lookR: ['ArrowRight', ''], lookU: ['ArrowUp', ''], lookD: ['ArrowDown', ''],
  slot1: ['Digit1', ''], slot2: ['Digit2', ''], slot3: ['Digit3', ''], slot4: ['Digit4', ''], slot5: ['Digit5', ''], slot6: ['Digit6', ''],
  board: ['Tab', ''], chat: ['KeyT', 'Enter'],
};
const copyBinds = b => Object.fromEntries(Object.entries(b).map(([k, v]) => [k, [...v]]));
let binds = copyBinds(DEFAULT_BINDS);
try { const saved = JSON.parse(localStorage.getItem('voxelstrike-binds')); if (saved) for (const k in binds) if (Array.isArray(saved[k])) binds[k] = [saved[k][0] ?? '', saved[k][1] ?? '']; } catch {}
const saveBinds = () => { try { localStorage.setItem('voxelstrike-binds', JSON.stringify(binds)); } catch {} };
// sensitivity multipliers: mouse/trackpad look and arrow-key look, 1 = default speed
const DEFAULT_SENS = { mouse: 1, keys: 1 };
let sens = { ...DEFAULT_SENS };
try { const s = JSON.parse(localStorage.getItem('voxelstrike-sens')); if (s) for (const k in sens) if (s[k] > 0) sens[k] = s[k]; } catch {}
const saveSens = () => { try { localStorage.setItem('voxelstrike-sens', JSON.stringify(sens)); } catch {} };
function renderSens() {
  for (const k in sens) { $('sens_' + k).value = sens[k]; $('sensV_' + k).textContent = sens[k].toFixed(2) + '×'; }
  $('vol').value = volume; $('volV').textContent = Math.round(volume * 100) + '%';
  $('mvol').value = musicVol; $('mvolV').textContent = Math.round(musicVol * 100) + '%';
}
for (const k in sens) $('sens_' + k).addEventListener('input', e => { sens[k] = +e.target.value; saveSens(); renderSens(); });
$('vol').addEventListener('input', e => { setVolume(+e.target.value); renderSens(); });
$('mvol').addEventListener('input', e => { setMusicVolume(+e.target.value); renderSens(); });
$('vol').addEventListener('change', () => sfx('ui'));
renderSens();
const held = a =>binds[a].some(c => c && keys[c]);
const isBind = (a, code) => binds[a].includes(code);
function nice(code) {
  if (!code) return '—';
  const named = { Mouse0: 'Left Click', Mouse1: 'Middle Click', Mouse2: 'Right Click', Mouse3: 'Mouse 4', Mouse4: 'Mouse 5',
    WheelUp: 'Scroll Up', WheelDown: 'Scroll Down', ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→',
    ShiftLeft: 'L Shift', ShiftRight: 'R Shift', ControlLeft: 'L Ctrl', ControlRight: 'R Ctrl', AltLeft: 'L Alt', AltRight: 'R Alt' };
  return named[code] ?? code.replace(/^Key|^Digit/, '');
}
const renderHelp = () => renderHotbar(); // the hotbar shows each slot's key, so it redraws when binds change
let rebinding = null; // { a: action, s: slot }
function renderBinds() {
  $('bindList').innerHTML = ACTIONS.map(([a, label]) => `<span>${label}</span>` + [0, 1].map(s =>
    `<button data-a="${a}" data-s="${s}" class="${rebinding && rebinding.a === a && rebinding.s === s ? 'wait' : ''}">${rebinding && rebinding.a === a && rebinding.s === s ? 'press…' : nice(binds[a][s])}</button>`).join('')).join('');
}
function assign(code) {
  const { a, s } = rebinding; rebinding = null;
  if (code !== null) {
    if (code) for (const k in binds) binds[k] = binds[k].map(c => c === code ? '' : c); // a key can only do one thing
    binds[a][s] = code; saveBinds(); renderHelp(); sfx('ui');
  }
  renderBinds();
}
// start listening on mousedown and stop it there, so the same click can't get bound as Left Click
$('bindList').addEventListener('mousedown', e => {
  const b = e.target.closest('button'); if (!b || rebinding) return; // while waiting, let the click through to be bound
  e.stopPropagation(); e.preventDefault();
  rebinding = { a: b.dataset.a, s: +b.dataset.s }; renderBinds();
});
// settings page: CONTROLS / SOUND / ACCOUNT tabs. It opens on whichever tab you used last
let setTab = 'controls';
function showSetTab(t) {
  setTab = t; rebinding = null; renderBinds();
  document.querySelectorAll('#setTabs button').forEach(b => b.classList.toggle('sel', b.dataset.t === t));
  document.querySelectorAll('#setBody section').forEach(s => s.style.display = s.dataset.t === t ? '' : 'none');
  $('setBody').scrollTop = 0;
}
$('setTabs').addEventListener('click', e => { const b = e.target.closest('button'); if (b && b.dataset.t !== setTab) { showSetTab(b.dataset.t); sfx('ui'); } });
function openSettings() { $('acctErr').textContent = ''; showSetTab(setTab); $('binds').style.display = 'flex'; }
$('ctrlBtn').addEventListener('click', e => { e.stopPropagation(); openSettings(); });
$('bindReset').addEventListener('click', () => { rebinding = null; binds = copyBinds(DEFAULT_BINDS); saveBinds(); sens = { ...DEFAULT_SENS }; saveSens(); renderSens(); renderHelp(); renderBinds(); });
renderHelp();
const closeBinds = () => { rebinding = null; $('binds').style.display = 'none'; $('acctPass').value = ''; };
$('bindX').addEventListener('click', closeBinds);
addEventListener('keydown', e => { if (e.code === 'Escape' && !rebinding && $('binds').style.display === 'flex') closeBinds(); });

function press(code) { // one-shot actions fire on the press, held actions are read every frame in update()
  if (!locked || chatting) return;
  if (isBind('chat', code)) { openChat(); if (chatting) return; }
  if (isBind('shoot', code)) shoot();
  if (isBind('reload', code)) reload();
  if (isBind('next', code)) cycle(1);
  if (isBind('prev', code)) cycle(-1);
  for (let s = 0; s < CATS.length; s++) if (isBind('slot' + (s + 1), code)) selectSlot(s);
}
addEventListener('keydown', e => {
  if (rebinding) {
    e.preventDefault();
    assign(e.code === 'Escape' ? null : (e.code === 'Backspace' || e.code === 'Delete') ? '' : e.code);
    return;
  }
  if (chatting) return;
  if (locked && (e.code === 'Space' || e.code.startsWith('Arrow') || e.code === 'Tab' || isBind('chat', e.code))) e.preventDefault(); // so the T doesn't get typed into chat
  if (e.target.tagName === 'INPUT') return; // typing your name in the lobby
  if (e.repeat) return;
  keys[e.code] = true;
  press(e.code);
});
addEventListener('keyup', e => keys[e.code] = false);
addEventListener('mousedown', e => {
  const code = 'Mouse' + e.button;
  if (rebinding) { if (!e.target.closest('#bindReset,#bindX,#setTabs,.sliders')) { e.preventDefault(); assign(code); } return; }
  if (chatting) { e.preventDefault(); return; } // clicking while typing doesn't shoot or steal focus from the chat box
  keys[code] = true; press(code);
});
addEventListener('mouseup', e => keys['Mouse' + e.button] = false);
addEventListener('contextmenu', e => e.preventDefault());
// unadjustedMovement asks for raw mouse input, which avoids Chrome on Windows
// sometimes reporting one huge fake movement (the camera "snap").
// Browsers that don't support it (e.g. some Chromebooks) fall back to a normal lock.
function lockMouse() {
  const el = renderer.domElement;
  let p;
  try { p = el.requestPointerLock({ unadjustedMovement: true }); } catch { p = null; }
  if (p?.catch) p.catch(() => el.requestPointerLock()?.catch?.(() => {}));
  else if (!p && document.pointerLockElement !== el) el.requestPointerLock()?.catch?.(() => {});
}
let lastMove = 0;
addEventListener('mousemove', e => {
  if (!locked) return;
  const dx = e.movementX, dy = e.movementY, m = Math.hypot(dx, dy);
  // drop a lone spike far bigger than the movement just before it (browser glitch, not a real flick)
  if (m > 250 && m > lastMove * 8 + 60) { lastMove = m; return; } // only ever skips one event in a row
  lastMove = m;
  const s = .0022 * sens.mouse * camera.fov / 75; // slower aim when zoomed
  P.yaw -= dx * s;
  P.pitch = Math.max(-1.5, Math.min(1.5, P.pitch - dy * s));
});
let wheelT = 0;
addEventListener('wheel', e => {
  if (!e.deltaY) return;
  const code = e.deltaY > 0 ? 'WheelDown' : 'WheelUp';
  if (rebinding) { assign(code); return; }
  const now = performance.now(); if (now - wheelT < 120) return; // trackpads send tons of scroll events
  wheelT = now; press(code);
}, { passive: true });
$('menu').addEventListener('click', () => {
  if (dead) restart();
  lockMouse();
});
document.addEventListener('pointerlockchange', () => {
  locked = document.pointerLockElement === renderer.domElement;
  $('menu').style.display = locked || shopOpen || inLobby || matchOver ? 'none' : 'flex';
  $('shop').style.display = shopOpen && !locked ? 'flex' : 'none';
  if (locked) closeArmory();
  if (!locked) {
    // the menu doesn't pause: the match keeps running behind it
    for (const k in keys) keys[k] = false;
    // zombie waves death: the title says so, and clicking the background starts a new run
    $('menuTitle').textContent = dead ? 'YOU DIED' : 'MENU';
    $('msg').textContent = dead ? `${newBest ? 'NEW BEST! ' : ''}Wave ${wave} · ${kills} kills. Click to try again` : '';
    $('armBtn').style.display = mode === 'dm' ? '' : 'none'; // zombie waves has its own shop between waves
    renderHelp();
  }
});
// if the browser refuses to re-lock the mouse, show the menu so you can click back in
document.addEventListener('pointerlockerror', () => { if (!shopOpen && !inLobby && !matchOver) { $('menuTitle').textContent = 'MENU'; $('msg').textContent = 'Click to continue'; $('menu').style.display = 'flex'; } });

function showLobby(on) {
  inLobby = on;
  $('lobby').style.display = on ? 'flex' : 'none';
  $('hud').style.display = on ? 'none' : '';
  vm.visible = !on;
  if (on) { $('menu').style.display = 'none'; camera.fov = 75; camera.updateProjectionMatrix(); musicLobby(); armIcon(); }
}
$('lobbyBtn').addEventListener('click', e => { e.stopPropagation(); restart(); showLobby(true); });

// PLAY: pick a mode, then one of the maps that mode can be played on. Picking the map starts the match.
const MODES = [
  { id: 'zombies', name: 'ZOMBIE WAVES', desc: 'Survive the waves, earn coins, beat the boss every 5 waves', maps: ['yard', 'forest', 'resort'] },
  { id: 'dm', name: 'DEATHMATCH', desc: '4 minute free-for-all. Highest score wins', maps: ['yard', 'forest', 'resort'] },
];
const MAP_PLAYERS = { small: 4, medium: 8, large: 8 };
if (!MAPS[mapId]) mapId = 'yard';
const savedMode = localStorage.getItem('voxelstrike-mode');
if (MODES.some(m => m.id === savedMode)) mode = savedMode;
let pickMode = null; // null = choosing a mode, otherwise the mode whose maps are listed
function renderPick() {
  const m = MODES.find(m => m.id === pickMode);
  $('pickTitle').textContent = m ? m.name : 'SELECT MODE';
  $('pickBack').textContent = m ? '◀ MODES' : '◀ BACK';
  $('pickList').className = m ? 'maps' : 'modes';
  $('pickList').innerHTML = m
    ? m.maps.map(id => { const d = MAPS[id], size = d.size[0].toUpperCase() + d.size.slice(1);
        return `<button data-map="${id}" class="${id === mapId ? 'sel' : ''}"><b>${d.name.toUpperCase()}</b><small>${size}${m.id === 'dm' ? ` · ${MAP_PLAYERS[d.size]} players` : ''}</small></button>`; }).join('')
    : MODES.map(o => `<button data-mode="${o.id}" class="${o.id === mode ? 'sel' : ''}"><b>${o.name}</b><small>${o.desc}</small></button>`).join('');
}
const pickOpen = () => $('pick').style.display === 'flex';
function showPick(on) {
  $('pick').style.display = on ? 'flex' : 'none';
  $('lobbyUI').style.display = on ? 'none' : '';
  $('lookPick').style.display = on ? 'none' : '';
  if (on) { pickMode = null; renderPick(); }
}
$('playBtn').addEventListener('click', () => { showPick(true); sfx('ui'); });
$('pickBack').addEventListener('click', () => { if (pickMode) { pickMode = null; renderPick(); } else showPick(false); sfx('ui'); });
$('pickList').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  if (b.dataset.mode) {
    mode = pickMode = b.dataset.mode; localStorage.setItem('voxelstrike-mode', mode);
    if (!MODES.find(m => m.id === mode).maps.includes(mapId)) mapId = MODES.find(m => m.id === mode).maps[0];
    renderPick(); sfx('ui'); return;
  }
  mapId = b.dataset.map; localStorage.setItem('voxelstrike-map', mapId);
  showPick(false); restart(); showLobby(false); lockMouse();
});
addEventListener('keydown', e => { if (e.code === 'Escape' && inLobby && pickOpen()) $('pickBack').click(); });
// your name: saves when you click away or press Enter. Blank goes back to the old one. 🎲 rolls a random one.
$('nameIn').value = myName;
const saveName = () => { $('nameIn').value = setMyName($('nameIn').value); };
$('nameIn').addEventListener('change', saveName);
$('nameIn').addEventListener('blur', saveName);
$('nameIn').addEventListener('keydown', e => { if (e.code === 'Enter' || e.code === 'NumpadEnter') $('nameIn').blur(); });
$('nameDice').addEventListener('click', () => { $('nameIn').value = setMyName(newMyName(myName)); sfx('ui'); });
document.addEventListener('pointerlockchange', () => { if (document.activeElement === $('nameIn')) $('nameIn').blur(); });
$('lobbySet').addEventListener('click', () => { openSettings(); sfx('ui'); });

// pixel icons for the lobby buttons, drawn from a grid with a dark outline added round the edge
function pixIcon(rows, col, scale = 4) {
  const h = rows.length, w = rows[0].length, c = document.createElement('canvas');
  c.width = (w + 2) * scale; c.height = (h + 2) * scale;
  const g = c.getContext('2d'), on = (x, y) => rows[y]?.[x] === 'X';
  for (let y = -1; y <= h; y++) for (let x = -1; x <= w; x++) {
    const fill = on(x, y), edge = !fill && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => on(x + a, y + b));
    if (!fill && !edge) continue;
    g.fillStyle = fill ? (y < h / 2 ? col[0] : col[1]) : '#000'; // lighter top half, darker bottom half
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
$('playIcon').src = pixIcon(Array.from({ length: 13 }, (_, y) => Array.from({ length: 11 }, (_, x) => x <= Math.min(y, 12 - y) * 1.7 ? 'X' : '.').join('')), ['#ffffff', '#d6f5d0']);
showLobby(true);

function restart() {
  zombies.forEach(z => scene.remove(z.g)); zombies.length = 0;
  booms.forEach(b => scene.remove(b.m)); booms.length = 0;
  rockets.forEach(r => scene.remove(r.m)); rockets.length = 0;
  flames.forEach(f => scene.remove(f.m)); flames.length = 0;
  flares.forEach(f => scene.remove(f.m)); flares.length = 0;
  parts.forEach(p => scene.remove(p.m)); parts.length = 0;
  useMap(mapId); setupPads();
  Object.assign(P, { drowned: false, burn: 0, vy: 0, yaw: 0, pitch: 0, hp: 100, max: 100, armor: 0, maxArmor: 0, kx: 0, kz: 0, lx: 0, lz: 0, onRamp: false }); P.pos.set(0, 0, 0); P.pos.lag = 0;
  wave = 0; toSpawn = 0; waveWait = 1.5; kills = 0; coins = 0; dead = false; shopWave = 0; shopOpen = false; armorBought = 0; waveReward = '';
  WEAPONS.forEach((w, i) => { lvl[i] = 0; applyLvl(i); ammo[i] = w.mag; owned[i] = !!w.free; reserve[i] = w.inf ? Infinity : w.free ? resMax(i) : 0; }); cancelReload(); soundsOff(); newBest = false;
  emptyPads();
  cur = gi('voxel'); resetSlots(); buildGun(); renderHotbar();
  setupMode();
}
