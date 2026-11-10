// touch controls: a move stick on the left, drag on the right to look, buttons for the rest (moved and sized in settings)
if (TOUCH) {
  const tc = document.createElement('div'); tc.id = 'tc';
  const tb = (id, a, icon) => `<button id="${id}" class="tb" data-a="${a}">${ico(icon)}</button>`;
  tc.innerHTML = '<div id="tStick"><i></i></div><div id="tGuns">GUNS</div>' + tb('tFire', 'shoot', 'bullet') + tb('tFire2', 'shoot', 'bullet') + tb('tAim', 'aim', 'aim') + tb('tJump', 'jump', 'up') + tb('tReload', 'reload', 'reload')
    + '<div id="tTop">' + tb('tChat', 'chat', 'chat') + tb('tBoard', 'board', 'trophy') + tb('tMenu', 'menu', 'pause') + '</div>'
    + '<div id="tEdit"><span>Drag a button to move it</span><label>SIZE <input id="tSize" type="range" min=".6" max="1.6" step=".05"></label><button id="tLeft"></button><button id="tReset">RESET</button><button id="tDone">DONE</button></div>';
  $('hud').after(tc); // over the scope
  $('sensLbl').textContent = 'Look sensitivity';
  const stick = $('tStick'), knob = stick.firstChild, R = 52, DEAD = .14, LOOK = .0055, TAP_MS = 110;
  // where the buttons sit: size, and the middle from the screen size
  const PADS = {
    tFire: { s: 86, at: (W, H) => [W - 70, H - 92] },
    tAim: { s: 56, at: (W, H) => [W - 70, H - 186] },
    tJump: { s: 64, at: (W, H) => [W - 166, H - 96] },
    tReload: { s: 50, at: (W, H) => [W - 160, H - 170] },
    tFire2: { s: 64, at: (W, H) => [78, H * .42] }, // a second fire button for the left thumb
  };
  let lay = { pos: {}, size: {}, left: true };
  try { const t = JSON.parse(localStorage.getItem('voxelstrike-touch')); if (t?.pos && t?.size) lay = { ...lay, ...t }; } catch {}
  const saveLay = () => { try { localStorage.setItem('voxelstrike-touch', JSON.stringify(lay)); } catch {} };
  function layout() {
    const W = innerWidth, H = innerHeight;
    for (const id in PADS) {
      const s = PADS[id].s * (lay.size[id] || 1), p = lay.pos[id], [x, y] = p ? [p[0] * W, p[1] * H] : PADS[id].at(W, H);
      const cx = Math.max(s / 2, Math.min(W - s / 2, x)), cy = Math.max(s / 2, Math.min(H - s / 2, y));
      Object.assign($(id).style, { width: s + 'px', height: s + 'px', left: cx - s / 2 + 'px', top: cy - s / 2 + 'px', fontSize: Math.round(s * .42) + 'px' });
    }
    $('tFire2').classList.toggle('off', !lay.left);
    $('tLeft').textContent = 'LEFT FIRE: ' + (lay.left ? 'ON' : 'OFF');
  }
  layout(); addEventListener('resize', layout);

  const own = new Map(); // finger: what it's doing
  let lookT = 0;
  const homeStick = () => { stick.style.left = stick.style.top = ''; knob.style.transform = ''; stick.classList.remove('on'); tStick.x = tStick.y = 0; };
  const sync = a => { keys['T:' + a] = [...own.values()].some(o => o.a === a); };
  function look(dx, dy, t) {
    if (!locked || !dx && !dy) return;
    const s = LOOK * sens.mouse * camera.fov / fovBase, gap = t - lookT; lookT = t;
    const [ay, ap] = aaLook(-dx * s, -dy * s, gap > 0 && gap < 100 ? gap / 1000 : 1 / 60);
    P.yaw += ay; P.pitch = Math.max(-1.5, Math.min(1.5, P.pitch + ap));
  }
  function moveStick(o, x, y) {
    let dx = x - o.x, dy = y - o.y; const d = Math.hypot(dx, dy);
    if (d > R) { dx *= R / d; dy *= R / d; }
    knob.style.transform = `translate(${dx}px,${dy}px)`;
    const k = Math.min(1, d / R), m = k < DEAD ? 0 : (k - DEAD) / (1 - DEAD) / (k || 1);
    tStick.x = dx / R * m; tStick.y = dy / R * m;
  }
  // a new finger takes the stick or the look over (a lost lift can't jam them)
  const drop = a => { for (const [id, o] of own) if (o.a === a) own.delete(id); };
  // a gun on the hotbar under the tap (the hotbar sits under the controls)
  const slotAt = (x, y) => $('hotbar').classList.contains('aimed') ? -1 : [...$('hotbar').children].findIndex(el => { const r = el.getBoundingClientRect(); return x >= r.left - 3 && x <= r.right + 3 && y >= r.top - 8 && y <= r.bottom + 8; });
  tc.addEventListener('pointerdown', e => {
    if (e.target.closest('#tEdit')) return;
    e.preventDefault();
    if (editing) return editDown(e);
    const s = slotAt(e.clientX, e.clientY);
    if (s >= 0) { const before = cur; selectSlot(s); if (cur !== before) aimOn = false; return; }
    const b = e.target.closest('.tb'), a = b?.dataset.a;
    if (b) {
      b.classList.add('down');
      if (a === 'menu') { unlockMouse(); return; }
      if (a === 'chat') { openChat(); return; }
      if (a === 'board') { keys['T:board'] = !keys['T:board']; b.classList.toggle('on', keys['T:board']); return; }
      own.set(e.pointerId, { a, b, x: e.clientX, y: e.clientY, t: performance.now() });
      keys['T:' + a] = true; press('T:' + a);
      if (a === 'aim') b.classList.toggle('on', aimOn);
      return;
    }
    if (e.clientX < innerWidth * .42) { // the stick starts under your thumb
      drop('stick');
      const x = Math.max(R + 8, e.clientX), y = Math.min(innerHeight - R - 8, Math.max(R + 8, e.clientY));
      stick.style.left = x + 'px'; stick.style.top = y + 'px'; stick.classList.add('on');
      own.set(e.pointerId, { a: 'stick', x, y }); moveStick({ x, y }, e.clientX, e.clientY);
    } else { drop('look'); own.set(e.pointerId, { a: 'look', x: e.clientX, y: e.clientY }); lookT = e.timeStamp; }
  });
  tc.addEventListener('pointermove', e => {
    if (editing) return editMove(e);
    const o = own.get(e.pointerId); if (!o) return;
    if (o.a === 'stick') return moveStick(o, e.clientX, e.clientY);
    look(e.clientX - o.x, e.clientY - o.y, e.timeStamp); o.x = e.clientX; o.y = e.clientY; // a thumb on a button can still aim
  });
  const up = e => {
    e.target.closest?.('.tb')?.classList.remove('down');
    if (editing) return editUp(e);
    const o = own.get(e.pointerId); if (!o) return;
    own.delete(e.pointerId);
    if (o.a === 'stick') { if (![...own.values()].some(x => x.a === 'stick')) homeStick(); return; }
    o.b?.classList.remove('down');
    if (o.b) { const wait = TAP_MS - (performance.now() - o.t); if (wait > 0) setTimeout(() => sync(o.a), wait); else sync(o.a); } // a quick tap still lasts a frame or two
  };
  ['touchstart', 'touchend'].forEach(t => tc.addEventListener(t, e => { if (!e.target.closest('#tEdit')) e.preventDefault(); }, { passive: false })); // no fake click on the menu that opens under your finger
  tc.addEventListener('pointerup', up); tc.addEventListener('pointercancel', up);
  // shown while you play
  let aimSync = 0;
  document.addEventListener('pointerlockchange', () => {
    tc.classList.toggle('on', locked); document.body.classList.toggle('tcOn', locked); // the HUD hides behind menus
    own.clear(); homeStick(); tc.querySelectorAll('.tb').forEach(b => b.classList.remove('down', 'on'));
    $('tBoard').style.display = pvp() ? '' : 'none';
    $('tChat').style.display = net.on && chatOn() ? '' : 'none';
    clearInterval(aimSync); if (locked) aimSync = setInterval(() => $('tAim').classList.toggle('on', aimOn), 100);
  });

  // moving and sizing the buttons (settings, CONTROLS)
  let editing = false, sel = null, drag = null;
  const markSel = () => { tc.querySelectorAll('.tb').forEach(b => b.classList.toggle('sel', b.id === sel)); $('tSize').value = lay.size[sel] || 1; $('tSize').disabled = !sel; };
  function editDown(e) {
    const b = e.target.closest('.tb'); if (!b || !PADS[b.id]) return;
    const r = b.getBoundingClientRect();
    sel = b.id; drag = { id: e.pointerId, dx: e.clientX - (r.left + r.width / 2), dy: e.clientY - (r.top + r.height / 2) }; markSel();
  }
  function editMove(e) {
    if (!drag || e.pointerId !== drag.id) return;
    lay.pos[sel] = [(e.clientX - drag.dx) / innerWidth, (e.clientY - drag.dy) / innerHeight]; layout();
  }
  function editUp(e) { if (drag && e.pointerId === drag.id) { drag = null; saveLay(); } }
  function editTouch(on) {
    editing = on; sel = null; drag = null; markSel(); layout();
    tc.classList.toggle('edit', on); if (on) homeStick();
  }
  $('tEditBtn').addEventListener('click', () => { editTouch(true); sfx('ui'); });
  $('tDone').addEventListener('click', () => { editTouch(false); sfx('ui'); });
  $('tReset').addEventListener('click', () => { lay = { pos: {}, size: {}, left: true }; saveLay(); sel = null; markSel(); layout(); sfx('ui'); });
  $('tLeft').addEventListener('click', () => { lay.left = !lay.left; saveLay(); layout(); sfx('ui'); });
  $('tSize').addEventListener('input', e => { if (!sel) return; lay.size[sel] = +e.target.value; layout(); });
  $('tSize').addEventListener('change', saveLay);

  addEventListener('pointerup', () => touchFull(), { once: true }); // Android: fullscreen from the first tap
  // held upright: pause under the turn-sideways note
  addEventListener('resize', () => { if (innerHeight > innerWidth && locked) unlockMouse(); });
}
