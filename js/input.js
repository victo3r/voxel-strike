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
// graphics (per device, see core.js)
const GFX_DESC = {
  high: 'Full resolution with smooth edges. Best for a gaming PC.',
  medium: 'No edge smoothing, and high-resolution screens draw at standard resolution. A good fit for Chromebooks and laptops.',
  low: 'Like medium, plus no grass, fireflies or light shafts, blurrier textures far away and a shorter view distance.',
};
const saveGfx = () => { try { localStorage.setItem('voxelstrike-gfx', JSON.stringify(gfx)); } catch {} };
function renderGfx() {
  document.querySelectorAll('#gfxQ button').forEach(b => b.classList.toggle('sel', b.dataset.q === gfx.q));
  $('gfxDesc').textContent = GFX_DESC[gfx.q];
  document.body.classList.toggle('lowfx', gfx.q === 'low'); // menus skip the background blur on low
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
// settings page: CONTROLS / SOUND / GRAPHICS / ACCOUNT tabs. It opens on whichever tab you used last
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
    $('armBtn').style.display = pvp() ? '' : 'none'; // zombie waves has its own shop between waves
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
// A mode with `sub` opens a second page to pick between its versions (Blitz: free for all or team) before the maps.
// Player counts on the map cards come from RULES in modes/deathmatch.js
const ALL_MAPS = ['yard', 'forest', 'resort'];
const V_MAPS = 3; // bump when the map pictures are retaken
const MODES = [
  { id: 'zombies', name: 'ZOMBIE WAVES', desc: 'Survive the waves, earn coins, beat the boss every 5 waves', maps: ALL_MAPS },
  { id: 'dm', name: 'DEATHMATCH', desc: '4 minute free-for-all. Highest score wins', maps: ALL_MAPS },
  { id: 'team', name: 'TEAM FIGHT', desc: '4 minutes, blue vs red. The team with the most kills wins', maps: ALL_MAPS },
  { id: 'blitzMenu', name: 'BLITZ', desc: '90 seconds. Rack up as many kills as you can', sub: [
    { id: 'blitz', name: 'FREE FOR ALL', title: 'BLITZ · FREE FOR ALL', desc: 'Everyone for themselves. Most kills wins', maps: ALL_MAPS },
    { id: 'blitzTeam', name: 'TEAM', title: 'BLITZ · TEAM', desc: 'Blue vs red. The team with the most kills wins', maps: ALL_MAPS },
  ] },
];
const PLAY_MODES = MODES.flatMap(m => m.sub ? m.sub.map(s => ({ ...s, parent: m.id })) : [m]); // the ones you can actually start
if (!MAPS[mapId]) mapId = 'yard';
const savedMode = localStorage.getItem('voxelstrike-mode');
if (PLAY_MODES.some(m => m.id === savedMode)) mode = savedMode;
let pickMode = null; // null = choosing a mode, a mode with sub = choosing its version, otherwise the mode whose maps are listed
function renderPick() {
  const m = PLAY_MODES.find(m => m.id === pickMode), group = MODES.find(g => g.id === pickMode && g.sub);
  $('pickTitle').textContent = m ? m.title || m.name : group ? group.name : 'SELECT MODE';
  $('pickBack').textContent = m || group ? '◀ ' + (m?.parent ? 'BLITZ' : 'MODES') : '◀ BACK';
  $('pickList').className = m ? 'maps' : 'modes';
  const card = o => `<button data-mode="${o.id}"><img class="mi" src="${MODE_ICONS[o.id]}"><b>${o.name}</b><small>${o.desc}</small></button>`;
  // map cards show a picture of the map (img/maps/, taken from above in the game itself)
  $('pickList').innerHTML = m
    ? m.maps.map(id => { const d = MAPS[id], size = d.size[0].toUpperCase() + d.size.slice(1), r = RULES[m.id];
        return `<button data-map="${id}" style="background-image:linear-gradient(transparent 45%,rgba(0,0,0,.72)),url('img/maps/${id}.jpg?v=${V_MAPS}')"><b>${d.name.toUpperCase()}</b><small>${size}${r ? ` · ${r.players[d.size]} players` : ''}</small></button>`; }).join('')
    : (group ? group.sub : MODES).map(card).join('');
}
const pickOpen = () => $('pick').style.display === 'flex';
function showPick(on) {
  $('pick').style.display = on ? 'flex' : 'none';
  $('lobbyUI').style.display = on ? 'none' : '';
  $('lookPick').style.display = on ? 'none' : '';
  if (on) { pickMode = null; renderPick(); }
}
$('playBtn').addEventListener('click', () => { showPick(true); sfx('ui'); });
$('pickBack').addEventListener('click', () => {
  if (pickMode) { pickMode = PLAY_MODES.find(m => m.id === pickMode)?.parent ?? null; renderPick(); } else showPick(false);
  sfx('ui');
});
$('pickList').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  if (b.dataset.mode) {
    pickMode = b.dataset.mode;
    const m = PLAY_MODES.find(m => m.id === pickMode);
    if (m) { // a mode you can play (not the Blitz page): remember it, then show its maps
      mode = pickMode; localStorage.setItem('voxelstrike-mode', mode);
      if (!m.maps.includes(mapId)) mapId = m.maps[0];
    }
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
// PLAY: a pixel-art triangle on a 22-pixel grid with sharp corners. Instead of a hard black staircase, each pixel along the edge
// gets an in-between color by how much of it the triangle and its dark green outline cover, so the edge looks smooth up close
// but you can still see the pixels
$('playIcon').src = (() => {
  const N = 22, S = 10, SS = 6, c = document.createElement('canvas'); c.width = c.height = N * S;
  const g = c.getContext('2d'), P = [[4.5, 2], [20.5, 11], [4.5, 20]], W = 1.35; // corners, outline width (grid pixels)
  // signed distance past each edge (negative = inside), the triangle is where all three are under 0. Growing by W keeps the corners sharp
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
// mode icons: pixel art with its black outline drawn in. pal maps each letter to a color, or to a function of (x, y) for split colors.
// The bottom half is shaded a little darker
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
const iconFigure = c => ['KKKKKKK', 'KhhhhhK', 'KsssssK', 'KsKsKsK', 'KsssssK', 'KKKKKKK', `K${c.repeat(5)}K`, `K${c.repeat(5)}K`, `K${c.repeat(5)}K`, `K${c.repeat(5)}K`, 'KKKKKKK'];
const TEAM_ICON = iconFigure('b').map((r, k) => r + '..' + iconFigure('r')[k]);
const MODE_ICONS = {
  zombies: artIcon([ // a plain blocky zombie head: dark hair, two eyes, a flat mouth
    'KKKKKKKKKKKK', 'KddddddddddK', 'KdgggddgggdK', 'KggggggggggK', 'KgKKggggKKgK', 'KgKKggggKKgK',
    'KggggggggggK', 'KggggggggggK', 'KggKKKKKKggK', 'KggggggggggK', 'KggggggggggK', 'KKKKKKKKKKKK',
  ], { K: '#000', g: '#5aa844', d: '#3d7d2e' }, 11),
  dm: artIcon([
    '....KKKKKKKK....', '..KKWWWWWWWWKK..', '.KWWWWWWWWWWWWK.', 'KWWWWWWWWWWWWWGK', 'KWWWWWWWWWWWWWGK', 'KWWKKKKWWKKKKWGK',
    'KWWKRRKWWKRRKWGK', 'KWWKKKKWWKKKKWGK', 'KWWWWWWKKWWWWWGK', '.KWWWWKKKKWWWGK.', '..KWWWWWWWWWGK..', '..KWKWKWKWKWGK..',
    '..KWKWKWKWKWGK..', '...KKKKKKKKKK...',
  ], { K: '#000', W: '#f0f0ea', G: '#b9bcc2', R: '#e0302a' }),
  team: artIcon(TEAM_ICON, { K: '#000', h: '#5a3a1e', s: '#e8b48a', b: '#3d7ce6', r: '#e0453a' }),
  blitzMenu: artIcon([
    '.....KKKK.....', '.....KwwK.....', '...KKKKKKKK...', '..KwwwwwwwwK..', '.KwwwwKwwwwwK.', 'KwwwwwKwwwwwwK',
    'KwwwwwKwwwwwwK', 'KwwwwwKKKKwwwK', 'KwwwwwwwwwwwwK', 'KwwwwwwwwwwwwK', '.KwwwwwwwwwwK.', '..KwwwwwwwwK..', '...KKKKKKKK...',
  ], { K: '#000', w: '#fff3c4' }),
  blitz: artIcon(BOLT_ICON, { K: '#000', y: '#ffd23a' }),
  blitzTeam: artIcon(BOLT_ICON, { K: '#000', y: (x, y) => x + y < 11 ? '#3d7ce6' : '#e0453a' }),
};
showLobby(true);

function restart() {
  zombies.forEach(z => scene.remove(z.g)); zombies.length = 0;
  booms.forEach(b => scene.remove(b.m)); booms.length = 0;
  rockets.forEach(r => scene.remove(r.m)); rockets.length = 0;
  flames.forEach(f => scene.remove(f.m)); flames.length = 0;
  flares.forEach(f => scene.remove(f.m)); flares.length = 0; clearBeams();
  parts.forEach(p => scene.remove(p.m)); parts.length = 0;
  useMap(mapId); setupPads();
  Object.assign(P, { drowned: false, burn: 0, vy: 0, yaw: 0, pitch: 0, hp: 100, max: 100, armor: 0, maxArmor: 0, dr: 0, kx: 0, kz: 0, lx: 0, lz: 0, onRamp: false }); P.pos.set(0, 0, 0); P.pos.lag = 0;
  wave = 0; toSpawn = 0; waveWait = 1.5; kills = 0; coins = 0; dead = false; shopWave = 0; shopOpen = false; armorBought = 0; waveReward = '';
  WEAPONS.forEach((w, i) => { lvl[i] = 0; applyLvl(i); ammo[i] = w.mag; owned[i] = !!w.free; reserve[i] = w.inf ? Infinity : w.free ? resMax(i) : 0; }); cancelReload(); soundsOff(); newBest = false;
  emptyPads();
  cur = gi('voxel'); resetSlots(); buildGun(); renderHotbar();
  setupMode();
}
