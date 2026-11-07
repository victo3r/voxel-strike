// CrazyGames: their SDK (https://docs.crazygames.com/sdk/intro/), used only when the game runs on CrazyGames (or with ?cg=1 on
// 127.0.0.1 to try it: their SDK then runs in its local mode, ads show as a text overlay). Anywhere else (GitHub Pages, the tests)
// nothing is loaded and every cg* call does nothing, so the game is exactly as before.
// The loader in index.html runs this first and waits for cgReady (at most 6 s) before the rest of the game, so the saves below
// are in place before profile.js reads them.
// What it does on CrazyGames:
//   - tells CrazyGames when loading ends and when you're playing (cgPlay, every frame from main.js: in a match or run, mouse
//     locked, not dead, no shop, no results, no ad) so their site knows when it may show things
//   - their "mute audio" setting silences everything, and so does an ad (cgHush: sound.js puts a gain in front of the speakers)
//   - their "disable chat" setting turns chat off and hides the Show chat switch (chat.js / input.js read cgNoChat)
//   - a midgame ad at the end of a match or run (cgMidgame, from the results screen): sound off and nothing clickable while it
//     plays; CrazyGames decides how often (at most one every 3 minutes) and skips it when it's too soon
//   - your progress (level, coins, guns, look, name, best waves) is kept in their Data module, so it follows a CrazyGames account
//     across devices; a guest's progress moves into their account when they log in. Settings stay on each device
//   - logged in to CrazyGames, you're signed in to our server with that account too (cloud.js cgSignIn): your CrazyGames username
//     is your name, and friends and cloud saves work. There's no sign-up or password of ours there
const CG_ON = /(^|\.)crazygames\.(com|io)$/.test(location.hostname) || /[?&]cg=1(&|$)/.test(location.search);
const CG_KEYS = new Set(['voxelstrike-profile', 'voxelstrike-name', 'voxelstrike-best']); // the progress kept in their Data module
const cg = { on: false, sdk: null, settings: { disableChat: false, muteAudio: false }, playing: false, ad: false, loaded: false };
const cgCall = f => { if (!cg.on) return; try { return f(cg.sdk); } catch (e) { console.warn('CrazyGames SDK', e); } };
const cgNoChat = () => cg.on && !!cg.settings.disableChat;
const cgQuiet = () => cg.on && (!!cg.settings.muteAudio || cg.ad);
function cgSettings(s) {
  cg.settings = { ...cg.settings, ...s };
  if (typeof cgHush === 'function') cgHush(); // sound.js
  if (typeof renderOpts === 'function') renderOpts(); // input.js: the Show chat switch
}
// every progress write also goes to their Data module (it batches writes itself)
function cgSaves() {
  const data = cg.sdk.data, set = Storage.prototype.setItem, del = Storage.prototype.removeItem;
  // their copy wins (it's the account's); a key only this device has (an old guest save) is copied up once
  for (const k of CG_KEYS) {
    const v = data.getItem(k);
    if (v !== null && v !== undefined) set.call(localStorage, k, String(v));
    else { const l = localStorage.getItem(k); if (l !== null) data.setItem(k, l); }
  }
  Storage.prototype.setItem = function (k, v) { set.call(this, k, v); if (this === localStorage && CG_KEYS.has(k)) cgCall(s => s.data.setItem(k, String(v))); };
  Storage.prototype.removeItem = function (k) { del.call(this, k); if (this === localStorage && CG_KEYS.has(k)) cgCall(s => s.data.removeItem(k)); };
}
window.cgReady = !CG_ON ? Promise.resolve() : new Promise(res => {
  const t = setTimeout(res, 6000); // never hold the game up for long (a blocked or slow SDK: the game runs without it)
  const s = document.createElement('script');
  s.src = 'https://sdk.crazygames.com/crazygames-sdk-v3.js';
  s.onerror = () => { clearTimeout(t); res(); };
  s.onload = async () => {
    try {
      const SDK = window.CrazyGames.SDK;
      await SDK.init();
      if (SDK.environment === 'disabled') throw new Error('disabled here');
      cg.sdk = SDK; cg.on = true; document.body.classList.add('cg'); // style.css hides our own sign-in and friends
      try { cgSaves(); } catch (e) { console.warn('CrazyGames data', e); }
      cgSettings(SDK.game.settings || {});
      SDK.game.addSettingsChangeListener(cgSettings);
      SDK.game.loadingStart();
    } catch (e) { cg.on = false; console.warn('CrazyGames SDK', e); }
    clearTimeout(t); res();
  };
  document.head.append(s);
});
// the first frames are drawn (main.js bootDone)
function cgLoaded() { if (cg.loaded) return; cg.loaded = true; cgCall(s => s.game.loadingStop()); }
// playing or not (main.js, every frame), said each time it changes. Their SDK ignores a start or stop sent within a second of the
// last one, so a change that comes sooner waits until a second has passed (a quick pause and back says nothing at all)
let cgSentT = -1e9;
function cgPlay(on) {
  on = on && !cg.ad;
  if (!cg.on || on === cg.playing || performance.now() - cgSentT < 1100) return;
  cg.playing = on; cgSentT = performance.now(); cgCall(s => on ? s.game.gameplayStart() : s.game.gameplayStop());
}
// a rewarded ad (js/boost.js: WATCH AD for a booster). reward() only once it has been watched to the end; fail(code) otherwise
// ('adsDisabled' and 'adblock' mean no ads this session, so the button goes away)
function cgRewarded(reward, fail = () => {}) {
  if (!cg.on || cg.ad) return fail('other');
  const end = () => { cg.ad = false; document.body.classList.remove('cgAd'); cgHush(); };
  cgCall(s => s.ad.requestAd('rewarded', {
    adStarted: () => { cg.ad = true; document.body.classList.add('cgAd'); cgHush(); },
    adFinished: () => { end(); reward(); },
    adError: e => { end(); fail(e?.code || 'other'); },
  }));
}
// a midgame ad at a natural break (the results screen of a match or run). The game doesn't wait on it: the ad plays over the page,
// and while it plays the sound is off and clicks are blocked (body.cgAd). CrazyGames skips it quietly when it's too soon
function cgMidgame() {
  if (!cg.on || cg.ad) return;
  const end = () => { if (!cg.ad) return; cg.ad = false; document.body.classList.remove('cgAd'); cgHush(); };
  cgCall(s => s.ad.requestAd('midgame', {
    adStarted: () => { cg.ad = true; document.body.classList.add('cgAd'); cgHush(); }, // only once it really starts
    adFinished: end,
    adError: end, // none to show, too soon, an ad blocker: nothing happens
  }));
}
