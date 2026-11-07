// CrazyGames SDK: only loads on their site (or with ?cg=1), does nothing elsewhere
const CG_ON = /(^|\.)crazygames\.(com|io)$/.test(location.hostname) || /[?&]cg=1(&|$)/.test(location.search);
const CG_KEYS = new Set(['voxelstrike-profile', 'voxelstrike-name', 'voxelstrike-best']); // progress saved to their Data module
const cg = { on: false, sdk: null, settings: { disableChat: false, muteAudio: false }, playing: false, ad: false, loaded: false };
const cgCall = f => { if (!cg.on) return; try { return f(cg.sdk); } catch (e) { console.warn('CrazyGames SDK', e); } };
const cgNoChat = () => cg.on && !!cg.settings.disableChat;
const cgQuiet = () => cg.on && (!!cg.settings.muteAudio || cg.ad);
function cgSettings(s) {
  cg.settings = { ...cg.settings, ...s };
  if (typeof cgHush === 'function') cgHush();
  if (typeof renderOpts === 'function') renderOpts();
}
// copy progress writes to their Data module too
function cgSaves() {
  const data = cg.sdk.data, set = Storage.prototype.setItem, del = Storage.prototype.removeItem;
  // their copy wins; a key only this device has gets copied up
  for (const k of CG_KEYS) {
    const v = data.getItem(k);
    if (v !== null && v !== undefined) set.call(localStorage, k, String(v));
    else { const l = localStorage.getItem(k); if (l !== null) data.setItem(k, l); }
  }
  Storage.prototype.setItem = function (k, v) { set.call(this, k, v); if (this === localStorage && CG_KEYS.has(k)) cgCall(s => s.data.setItem(k, String(v))); };
  Storage.prototype.removeItem = function (k) { del.call(this, k); if (this === localStorage && CG_KEYS.has(k)) cgCall(s => s.data.removeItem(k)); };
}
window.cgReady = !CG_ON ? Promise.resolve() : new Promise(res => {
  const t = setTimeout(res, 6000); // don't hold the game up if the SDK is slow or blocked
  const s = document.createElement('script');
  s.src = 'https://sdk.crazygames.com/crazygames-sdk-v3.js';
  s.onerror = () => { clearTimeout(t); res(); };
  s.onload = async () => {
    try {
      const SDK = window.CrazyGames.SDK;
      await SDK.init();
      if (SDK.environment === 'disabled') throw new Error('disabled here');
      cg.sdk = SDK; cg.on = true; document.body.classList.add('cg'); // hides our own sign-in and friends
      try { cgSaves(); } catch (e) { console.warn('CrazyGames data', e); }
      cgSettings(SDK.game.settings || {});
      SDK.game.addSettingsChangeListener(cgSettings);
      SDK.game.loadingStart();
    } catch (e) { cg.on = false; console.warn('CrazyGames SDK', e); }
    clearTimeout(t); res();
  };
  document.head.append(s);
});
// loading is done
function cgLoaded() { if (cg.loaded) return; cg.loaded = true; cgCall(s => s.game.loadingStop()); }
// tell them when we start or stop playing (they ignore changes under 1 s apart)
let cgSentT = -1e9;
function cgPlay(on) {
  on = on && !cg.ad;
  if (!cg.on || on === cg.playing || performance.now() - cgSentT < 1100) return;
  cg.playing = on; cgSentT = performance.now(); cgCall(s => on ? s.game.gameplayStart() : s.game.gameplayStop());
}
// rewarded ad: reward() only if watched to the end
function cgRewarded(reward, fail = () => {}) {
  if (!cg.on || cg.ad) return fail(cg.on ? 'busy' : 'off');
  const end = () => { cg.ad = false; document.body.classList.remove('cgAd'); cgHush(); };
  cgCall(s => s.ad.requestAd('rewarded', {
    adStarted: () => { cg.ad = true; document.body.classList.add('cgAd'); cgHush(); },
    adFinished: () => { end(); reward(); },
    adError: e => { end(); console.warn('CrazyGames rewarded ad', e); fail(e?.code || 'other'); },
  }));
}
// midgame ad on the results screen (sound off and clicks blocked while it plays)
function cgMidgame() {
  if (!cg.on || cg.ad) return;
  const end = () => { if (!cg.ad) return; cg.ad = false; document.body.classList.remove('cgAd'); cgHush(); };
  cgCall(s => s.ad.requestAd('midgame', {
    adStarted: () => { cg.ad = true; document.body.classList.add('cgAd'); cgHush(); },
    adFinished: end,
    adError: end,
  }));
}
