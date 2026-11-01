// keybinds and input
// ---------- keybinds ----------
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
const held = a => binds[a].some(c => c && keys[c]);
const isBind = (a, code) => binds[a].includes(code);
function nice(code) {
  if (!code) return '—';
  const named = { Mouse0: 'Left Click', Mouse1: 'Middle Click', Mouse2: 'Right Click', Mouse3: 'Mouse 4', Mouse4: 'Mouse 5',
    WheelUp: 'Scroll Up', WheelDown: 'Scroll Down', ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→',
    ShiftLeft: 'L Shift', ShiftRight: 'R Shift', ControlLeft: 'L Ctrl', ControlRight: 'R Ctrl', AltLeft: 'L Alt', AltRight: 'R Alt' };
  return named[code] ?? code.replace(/^Key|^Digit/, '');
}
function renderHelp() {
  const b = a => binds[a].filter(Boolean).map(nice).join('/') || '—';
  $('help').textContent = `${b('fwd')}${b('left')}${b('back')}${b('right')} move · ${b('jump')} jump · ${b('shoot')} shoot · ${b('aim')} aim/scope · ${b('reload')} reload · ${b('lookL')}${b('lookR')}${b('lookU')}${b('lookD')} look · ${[1, 2, 3, 4, 5, 6].map(n => b('slot' + n)).join('')} or ${b('next')}/${b('prev')} switch weapons${mode === 'zombies' ? ' (press a slot again to flip between guns you bought in it)' : ''} · hold ${b('board')} leaderboard (deathmatch)`;
  renderHotbar(); // slot key labels follow your binds
}
let rebinding = null; // { a: action, s: slot }
function renderBinds() {
  $('bindList').innerHTML = ACTIONS.map(([a, label]) => `<span>${label}</span>` + [0, 1].map(s =>
    `<button data-a="${a}" data-s="${s}" class="${rebinding && rebinding.a === a && rebinding.s === s ? 'wait' : ''}">${rebinding && rebinding.a === a && rebinding.s === s ? 'press…' : nice(binds[a][s])}</button>`).join('')).join('');
}
function assign(code) {
  const { a, s } = rebinding; rebinding = null;
  if (code !== null) {
    if (code) for (const k in binds) binds[k] = binds[k].map(c => c === code ? '' : c); // a key can only do one thing
    binds[a][s] = code; saveBinds(); renderHelp(); beep(700, .05);
  }
  renderBinds();
}
// start listening on mousedown and stop it there, so the same click can't get bound as Left Click
$('bindList').addEventListener('mousedown', e => {
  const b = e.target.closest('button'); if (!b || rebinding) return; // while waiting, let the click through to be bound
  e.stopPropagation(); e.preventDefault();
  rebinding = { a: b.dataset.a, s: +b.dataset.s }; renderBinds();
});
$('ctrlBtn').addEventListener('click', e => { e.stopPropagation(); rebinding = null; renderBinds(); $('binds').style.display = 'flex'; });
$('bindDone').addEventListener('click', () => { rebinding = null; $('binds').style.display = 'none'; });
$('bindReset').addEventListener('click', () => { rebinding = null; binds = copyBinds(DEFAULT_BINDS); saveBinds(); renderHelp(); renderBinds(); });
renderHelp();
// ways out of the controls menu: the ✕ button, or Esc when you're not in the middle of setting a key
const closeBinds = () => { rebinding = null; $('binds').style.display = 'none'; };
$('bindX').addEventListener('click', closeBinds);
addEventListener('keydown', e => { if (e.code === 'Escape' && !rebinding && $('binds').style.display === 'flex') closeBinds(); });

// ---------- input ----------
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
  if (chatting) return; // the chat box handles its own keys (js/chat.js)
  if (locked && (e.code === 'Space' || e.code.startsWith('Arrow') || e.code === 'Tab' || isBind('chat', e.code))) e.preventDefault(); // so the T doesn't get typed into chat
  if (e.target.tagName === 'INPUT') return; // typing your name in the lobby
  if (e.repeat) return;
  keys[e.code] = true;
  press(e.code);
});
addEventListener('keyup', e => keys[e.code] = false);
addEventListener('mousedown', e => {
  const code = 'Mouse' + e.button;
  if (rebinding) { if (!e.target.closest('#bindReset,#bindDone,#bindX')) { e.preventDefault(); assign(code); } return; }
  if (chatting) { e.preventDefault(); return; } // clicking while typing doesn't shoot or steal focus from the chat box
  keys[code] = true; press(code);
});
addEventListener('mouseup', e => keys['Mouse' + e.button] = false);
addEventListener('contextmenu', e => e.preventDefault());
addEventListener('mousemove', e => {
  if (!locked) return;
  const sens = .0022 * camera.fov / 75; // slower aim when zoomed
  P.yaw -= e.movementX * sens;
  P.pitch = Math.max(-1.5, Math.min(1.5, P.pitch - e.movementY * sens));
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
  renderer.domElement.requestPointerLock()?.catch?.(() => {});
});
document.addEventListener('pointerlockchange', () => {
  locked = document.pointerLockElement === renderer.domElement;
  $('menu').style.display = locked || shopOpen || inLobby || matchOver ? 'none' : 'flex';
  $('shop').style.display = shopOpen && !locked ? 'flex' : 'none';
  if (locked) closeArmory();
  if (!locked) {
    // the menu doesn't pause anything: the match keeps going behind it, so you can still get shot while you're in here
    for (const k in keys) keys[k] = false;
    $('msg').textContent = dead ? `${newBest ? 'NEW BEST! ' : ''}You died on wave ${wave} with ${kills} kills.` : '';
    $('go').textContent = dead ? '[ CLICK TO TRY AGAIN ]' : '[ CLICK TO GO BACK IN ]';
    $('armBtn').style.display = mode === 'dm' ? '' : 'none'; // zombie waves has its own shop between waves
    renderHelp(); // the slot-flip tip only shows in zombie waves
  }
});
// if the browser refuses to re-lock the mouse, show the menu so you can click back in
document.addEventListener('pointerlockerror', () => { if (!shopOpen && !inLobby && !matchOver) { $('msg').textContent = 'Click to continue'; $('menu').style.display = 'flex'; } });

// ---------- lobby ----------
// PLAY starts a fresh game in the arena. LOBBY (from the pause or death screen) ends the game and goes back.
function showLobby(on) {
  inLobby = on;
  $('lobby').style.display = on ? 'flex' : 'none';
  $('hud').style.display = on ? 'none' : '';
  vm.visible = !on; // hide the gun in your hands while the lobby camera spins
  if (on) { $('menu').style.display = 'none'; camera.fov = 75; camera.updateProjectionMatrix(); }
}
$('playBtn').addEventListener('click', () => {
  restart(); showLobby(false);
  renderer.domElement.requestPointerLock()?.catch?.(() => {});
});
$('lobbyBtn').addEventListener('click', e => { e.stopPropagation(); restart(); showLobby(true); });
$('modes').addEventListener('click', e => { // pick a mode; PLAY starts whichever one is highlighted
  const b = e.target.closest('.mode'); if (!b || b.disabled) return;
  document.querySelectorAll('.mode').forEach(m => m.classList.toggle('sel', m === b));
  mode = b.dataset.mode; beep(600, .05);
});
// pick a map; it remembers your choice for next time
const markMap = () => document.querySelectorAll('.map').forEach(m => m.classList.toggle('sel', m.dataset.map === mapId));
if (!MAPS[mapId]) mapId = 'yard';
markMap();
$('maps').addEventListener('click', e => {
  const b = e.target.closest('.map'); if (!b) return;
  mapId = b.dataset.map; localStorage.setItem('pg_map', mapId); markMap(); beep(600, .05);
});
// your name: saves when you click away or press Enter. Blank goes back to the old one. 🎲 rolls a random one.
$('nameIn').value = myName;
const saveName = () => { $('nameIn').value = setMyName($('nameIn').value); };
$('nameIn').addEventListener('change', saveName);
$('nameIn').addEventListener('blur', saveName);
$('nameIn').addEventListener('keydown', e => { if (e.code === 'Enter' || e.code === 'NumpadEnter') $('nameIn').blur(); });
$('nameDice').addEventListener('click', () => { $('nameIn').value = setMyName(newMyName(myName)); beep(600, .05); });
document.addEventListener('pointerlockchange', () => { if (document.activeElement === $('nameIn')) $('nameIn').blur(); });
$('lobbyCtrl').addEventListener('click', () => { rebinding = null; renderBinds(); $('binds').style.display = 'flex'; });
showLobby(true);

function restart() {
  zombies.forEach(z => scene.remove(z.g)); zombies.length = 0;
  booms.forEach(b => scene.remove(b.m)); booms.length = 0;
  rockets.forEach(r => scene.remove(r.m)); rockets.length = 0;
  flames.forEach(f => scene.remove(f.m)); flames.length = 0;
  flares.forEach(f => scene.remove(f.m)); flares.length = 0;
  parts.forEach(p => scene.remove(p.m)); parts.length = 0;
  useMap(mapId); setupPads(); // load the map you picked in the lobby
  Object.assign(P, { vy: 0, yaw: 0, pitch: 0, hp: 100, max: 100, armor: 0, maxArmor: 0, kx: 0, kz: 0 }); P.pos.set(0, 0, 0);
  wave = 0; toSpawn = 0; waveWait = 1.5; kills = 0; coins = 0; dead = false; shopWave = 0; shopOpen = false; armorBought = 0; waveReward = '';
  WEAPONS.forEach((w, i) => { lvl[i] = 0; applyLvl(i); ammo[i] = w.mag; owned[i] = !!w.free; reserve[i] = w.inf ? Infinity : w.free ? resMax(i) : 0; }); reloading = 0; newBest = false;
  emptyPads();
  cur = gi('voxel'); resetSlots(); buildGun(); renderHotbar();
  setupMode(); // deathmatch loadout, pause-menu tips (modes/deathmatch.js)
}

