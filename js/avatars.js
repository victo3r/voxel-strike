// avatars: your head in a square, with a frame round it and a background behind it (the leaderboards and player cards show them)
// lv: yours from that level; rank: for finishing that high on a weekly board; season: from that season's chests
const AV_FRAMES = [
  { id: '', name: 'Plain' },
  { id: 'steel', name: 'Steel', lv: 10 }, { id: 'ruby', name: 'Ruby', lv: 25 }, { id: 'titan', name: 'Titanium', lv: 50 },
  { id: 'bronze', name: 'Bronze', rank: 50 }, { id: 'silver', name: 'Silver', rank: 10 }, { id: 'gold', name: 'Champion', rank: 1 },
  { id: 'frost', name: 'Frosted', season: 'xmas26' }, { id: 'candy', name: 'Candy Cane', season: 'xmas26' },
];
const AV_BGS = [
  { id: '', name: 'Slate' },
  { id: 'moss', name: 'Moss', lv: 5 }, { id: 'sky', name: 'Sky', lv: 15 }, { id: 'dusk', name: 'Dusk', lv: 30 }, { id: 'ember', name: 'Ember', lv: 40 },
  { id: 'podium', name: 'Podium', rank: 3 }, { id: 'gold', name: 'Gold', rank: 1 },
  { id: 'snow', name: 'Snowfall', season: 'xmas26' }, { id: 'gift', name: 'Gift Wrap', season: 'xmas26' },
];
const AV = { f: AV_FRAMES, b: AV_BGS }, avOf = (k, id) => AV[k].find(X => X.id === id) || null;
const avHas = (k, X) => !!X && (X.lv ? prof.lv >= X.lv : X.rank || X.season ? !!prof.avs?.[k + ':' + X.id] : true);
const avHow = X => X.lv ? `LVL ${X.lv}` : X.rank ? (X.rank === 1 ? '1ST ON A WEEKLY BOARD' : `TOP ${X.rank} ON A WEEKLY BOARD`) : X.season ? `${seasonOf(X.season)?.name || 'SEASON'} CHESTS` : '';
const avWorn = () => ({ f: avHas('f', avOf('f', prof.av?.f)) ? prof.av.f : '', b: avHas('b', avOf('b', prof.av?.b)) ? prof.av.b : '' }); // what yours wears
function avWear(k, id) { const X = avOf(k, id); if (!avHas(k, X)) return false; prof.av = { ...avWorn(), [k]: id }; saveProf(); return true; }
const avGive = (k, id) => { if (avOf(k, id)) prof.avs = { ...prof.avs, [k + ':' + id]: 1 }; };
// a weekly prize brings the frames and backgrounds for that place (any of the boards)
function avPrize(rank) { let n = 0; for (const k of ['f', 'b']) for (const X of AV[k]) if (X.rank && rank <= X.rank && !prof.avs?.[k + ':' + X.id]) { avGive(k, X.id); n++; } return n; }
// the square itself: someone's head (or a picture to fill in later: lazy), in their frame, on their background
const avClean = av => ({ f: avOf('f', av?.f) ? av.f : '', b: avOf('b', av?.b) ? av.b : '' });
function avatar(look, av, cls = '', lazy = '') {
  const { f, b } = avClean(av);
  return `<span class="av${f ? ' avf-' + f : ''}${b ? ' avb-' + b : ''}${cls ? ' ' + cls : ''}">${lazy || `<img class="ai" src="${safePic(look, true)}">`}</span>`;
}
