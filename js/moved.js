// the old github.io copy: the game is Blockslingers now, at blockslingers.com
const MOVED = location.hostname === 'victo3r.github.io' || /[?&]moved=1\b/.test(location.search);
let movedShown = false, movedBack = false;
function renderMoved() {
  const me = auth && !auth.cg ? auth.user : null;
  $('movedBox').innerHTML = `<h1>NEW NAME, NEW HOME</h1><p>Voxel Strike is now <b>Blockslingers</b> and it lives at <b>blockslingers.com</b></p>` +
    `<p>${me ? `Sign in there as <b>${esc(me)}</b> and all your stuff comes with you` : 'Make an account here first and all your stuff comes with you'}</p>` +
    `<div class="mvB">${me ? '' : '<button id="movedAcct">MAKE AN ACCOUNT</button>'}<button id="movedGo" class="go">TAKE ME THERE</button><button id="movedX">LATER</button></div>`;
}
const openMoved = () => { renderMoved(); $('moved').style.display = 'flex'; };
const closeMoved = () => { $('moved').style.display = 'none'; };
$('moved').addEventListener('click', e => {
  e.stopPropagation();
  const id = e.target.closest('button')?.id;
  if (id === 'movedGo') { location.href = 'https://blockslingers.com/'; return; }
  if (id === 'movedAcct') { closeMoved(); movedBack = true; setTab = 'account'; openSettings(); sfx('ui'); return; }
  if (id === 'movedX' || e.target.id === 'moved') { closeMoved(); sfx('ui'); }
});
// once in the lobby, and again after making an account from it
setInterval(() => {
  if (!MOVED || !inLobby || document.body.classList.contains('boot')) return;
  if ([$('binds'), $('armory'), $('boost'), $('pick'), $('daily')].some(el => el && getComputedStyle(el).display !== 'none')) return;
  if (!movedShown || (movedBack && auth)) { movedShown = true; movedBack = false; openMoved(); }
}, 500);
