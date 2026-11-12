// pixel icons, drawn in the color of the text around them
const ICON_ART = {
  star: ['.....#.....', '....###....', '....###....', '###########', '.#########.', '..#######..', '...#####...', '..###.###..', '..##...##..', '.##.....##.'],
  lock: ['..#####..', '.##...##.', '.#.....#.', '.#.....#.', '#########', '#########', '####.####', '####.####', '####.####', '#########', '#########'],
  cloud: ['.....####.....', '....######....', '.##.#######...', '#############.', '##############', '##############', '.############.'],
  left: ['....#', '...##', '..###', '.####', '#####', '.####', '..###', '...##', '....#'],
  close: ['##....##', '###..###', '.######.', '..####..', '..####..', '.######.', '###..###', '##....##'],
  pencil: ['.......##.', '......####', '.....#.###', '....#####.', '...#####..', '..#####...', '.#####....', '.####.....', '###.......', '##........'],
  heart: ['.##...##.', '####.####', '#########', '#########', '.#######.', '..#####..', '...###...', '....#....'],
  shield: ['#########', '##.....##', '##.....##', '##.....##', '##.....##', '.##...##.', '.##...##.', '..##.##..', '...###...', '....#....'],
  inf: ['.###.....###.', '##.##...##.##', '#...##.##...#', '#....###....#', '#...##.##...#', '##.##...##.##', '.###.....###.'],
  skull: ['.#######.', '#########', '#########', '##..#..##', '##..#..##', '####.####', '.#######.', '..#.#.#..', '..#####..'],
  aim: ['.....#.....', '...#####...', '..#..#..#..', '.#.......#.', '.#.......#.', '###..#..###', '.#.......#.', '.#.......#.', '..#..#..#..', '...#####...', '.....#.....'],
  reload: ['...#####...', '..##...##..', '.##.....#.#', '.#......###', '##.....####', '##.........', '##.........', '.#.......#.', '.##.....##.', '..##...##..', '...#####...'],
  snd: ['....#......', '...##....#.', '..###..#..#', '#####...#.#', '#####...#.#', '#####...#.#', '..###..#..#', '...##....#.', '....#......'],
  sndOff: ['....#......', '...##......', '..###.#...#', '#####..#.#.', '#####...#..', '#####..#.#.', '..###.#...#', '...##......', '....#......'],
  video: ['###########', '#.........#', '#...#.....#', '#...##....#', '#...###...#', '#...##....#', '#...#.....#', '#.........#', '###########'],
  trophy: ['.#########.', '##.#####.##', '#..#####..#', '.#.#####.#.', '..#######..', '...#####...', '....###....', '.....#.....', '....###....', '..#######..'],
  check: ['.......#', '......##', '#....##.', '##..##..', '.####...', '..##....'],
  pause: ['###.###', '###.###', '###.###', '###.###', '###.###', '###.###', '###.###', '###.###'],
  bullet: ['..##..', '.####.', '.####.', '######', '######', '######', '######', '......', '######', '######'],
  chat: ['.#########.', '###########', '###########', '###########', '###########', '.#########.', '..##.......', '.#.........'],
  head: ['.....#.....', '...#####...', '..#..#..#..', '.#...#...#.', '.#.......#.', '#####.#####', '.#.......#.', '.#...#...#.', '..#..#..#..', '...#####...', '.....#.....'],
};
// full-color icons
const ICON_PIX = {
  gift: { pal: { o: '#141414', r: '#d8433b', d: '#9e2a24', y: '#ffd75e' }, rows: [
    '...oo...oo...', '..oyyo.oyyo..', '..oyoyoyoyo..', '...ooyyyoo...', 'ooooooyoooooo', 'orrrrryrrrrro', 'orrrrryrrrrro',
    'ooooooyoooooo', '.orrrryrrrro.', '.orrrryrrrro.', '.orrrryrrrro.', '.oddddyddddo.', '.ooooooooooo.'] },
  dice: { pal: { o: '#141414', w: '#e9e9e9', l: '#ffffff', s: '#a9aeb7', p: '#1c1c1c', q: '#2e2f33' }, rows: [
    '...oooooooooooo', '..ollllpplllloo', '.olllllllllloso', 'oooooooooooosso', 'owwwwwwwwwwosso', 'owppwwwwppwosso',
    'owppwwwwppwosqo', 'owwwwwwwwwwosso', 'owwwwppwwwwosso', 'owwwwppwwwwosso', 'owwwwwwwwwwosqo', 'owppwwwwppwosso',
    'owppwwwwppwoso.', 'owwwwwwwwwwoo..', 'oooooooooooo...'] },
  key: { pal: { o: '#1a1408', y: '#ffc933', l: '#fff0a0', d: '#e09a12' }, rows: [
    '.oooo.........', 'ollllo........', 'oyooyooooooooo', 'oyooylllllllyo', 'oddddooooddodo', '.oooo...oddodo', '........oooooo'] },
};
// hollow star for ones you don't own yet
ICON_ART.starO = ICON_ART.star.map((row, y, a) => [...row].map((ch, x) => ch === '#' && [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]].some(([dx, dy]) => a[y + dy]?.[x + dx] !== '#') ? '#' : '.').join(''));
ICON_ART.right = ICON_ART.left.map(r => [...r].reverse().join(''));
ICON_ART.up = ICON_ART.left[0].split('').map((_, x) => ICON_ART.left.map(r => r[x]).join(''));
ICON_ART.down = [...ICON_ART.up].reverse();
ICON_ART.plus = ['..###..', '..###..', '#######', '#######', '#######', '..###..', '..###..']; // medkit
ICON_ART.fast = ['#...#...', '##..##..', '###.###.', '########', '###.###.', '##..##..', '#...#...']; // speed
ICON_ART.crown = ['#....#....#', '##..###..##', '###.###.###', '###########', '###########', '.#########.', '...........', '.#########.'];
ICON_ART.clock = ['...#####...', '.#########.', '.####.####.', '#####.#####', '#####.#####', '#####...###', '###########', '###########', '.#########.', '.#########.', '...#####...'];
// mouse buttons and the wheel, for key labels
{
  const M = ['..#####..', '.#..#..#.', '#...#...#', '#...#...#', '#...#...#', '#########', '#.......#', '#.......#', '#.......#', '#.......#', '.#.....#.', '..#####..'];
  const fill = f => M.map((r, y) => [...r].map((c, x) => c === '#' || (y > 0 && y < 5 && x > r.indexOf('#') && x < r.lastIndexOf('#') && f(x)) ? '#' : '.').join(''));
  const up = ['..#..', '.###.', '#####', '..#..', '..#..'], down = [...up].reverse();
  ICON_ART.mouse = M;
  ICON_ART.mL = fill(x => x < 4);
  ICON_ART.mR = fill(x => x > 4);
  ICON_ART.mM = fill(x => x >= 3 && x <= 5);
  ICON_ART.m4 = M.map((r, y) => (y === 8 || y === 9 ? '##' : '..') + r); // side buttons: back is the lower one
  ICON_ART.m5 = M.map((r, y) => (y === 6 || y === 7 ? '##' : '..') + r);
  ICON_ART.mUp = ICON_ART.mM.map((r, y) => r + '.' + (up[y] || '.....'));
  ICON_ART.mDown = ICON_ART.mM.map((r, y) => r + '.' + (down[y - 7] || '.....'));
}
// booster lightning bolt
{
  const m = ['.....#####', '....#####.', '....####..', '...####...', '..####....', '.#########', '.########.', '....####..', '....###...', '...###....', '...##.....', '..##......', '..#.......'];
  const W = m[0].length + 2, H = m.length + 2, at = (x, y) => m[y - 1]?.[x - 1] === '#';
  const rows = [];
  for (let y = 0; y < H; y++) {
    let r = '';
    for (let x = 0; x < W; x++) r += at(x, y) ? (!at(x - 1, y) ? 'l' : !at(x + 1, y) ? 'd' : 'y') : [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => at(x + dx, y + dy)) ? 'o' : '.';
    rows.push(r);
  }
  ICON_PIX.bolt = { pal: { o: '#1a1408', y: '#ffc933', l: '#fff0a0', d: '#e09a12' }, rows };
}
// full-color icon with a dark outline drawn round it
const outlined = (rows, pal) => {
  const at = (x, y) => rows[y - 1]?.[x - 1] && rows[y - 1][x - 1] !== '.', W = Math.max(...rows.map(r => r.length)) + 2, H = rows.length + 2, out = [];
  for (let y = 0; y < H; y++) { let r = ''; for (let x = 0; x < W; x++) r += at(x, y) ? rows[y - 1][x - 1] : [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => at(x + dx, y + dy)) ? 'o' : '.'; out.push(r); }
  return { pal: { o: '#141414', ...pal }, rows: out };
};
// XP gem
ICON_PIX.xp = outlined(['..lllgggddd..', '.llllgggdddd.', 'lllllgggddddd', 'ggggggggggggg', '.gggggggggdd.', '..ggggggggd..', '...gggggdd...', '....ggggd....', '.....ggd.....', '......g......'],
  { l: '#c8ffe0', g: '#2fbf71', d: '#16804a' });
// zombie head, for the zombie board
ICON_PIX.zombie = outlined(['ggggggggg', 'ggdgggggg', 'ggggggdgg', 'geegggeeg', 'gergggerg', 'ggggmgggg', 'ggmmmmmgg', 'gdgggggdg', 'ggggggggg'],
  { g: '#62b043', d: '#3f7d28', e: '#16200f', r: '#d8433b', m: '#2a160e' });
// kill streak badges
{
  const SK = ['.bbbbbbb.', 'bbbbbbbbs', 'bbbbbbbbs', 'bbeebeebs', 'bbeebeebs', 'bbbbkbbbs', '.bbbbbbs.', '..bkbks..', '..bbbss..'];
  const pad = (rows, l, r = l) => rows.map(x => '.'.repeat(l) + x + '.'.repeat(r));
  const side = (a, b) => a.map((x, i) => x + '.' + b[i]);
  const bone = { b: '#eeeae0', s: '#b9b3a6', e: '#1a1a1a', k: '#1a1a1a' };
  ICON_PIX.s_k2 = outlined(side(SK, SK), bone);
  ICON_PIX.s_k3 = outlined([...pad(SK, 5), ...side(SK, SK)], bone);
  ICON_PIX.s_k4 = outlined(['h...........h', 'hh.........hh', '.hhggggggghh.', '.ggggggggggg.', 'ggkkgggggkkgg', 'ggggkkgkkgggg', 'gggeegggeeggg', 'ggggggggggggg', 'gkwkwkwkwkwkg', 'gkkkkkkkkkkkg', 'gkkwkwkwkwkkg', '.gkkkkkkkkkg.', '..ggggggggg..'],
    { g: '#3f8f2e', h: '#e8dfc8', k: '#140a0a', e: '#ff2a2a', w: '#ffffff' }); // horns, angry brows, red eyes, fangs
  { // ace: pilot's wings round a target
    const L = ['.........', 'ddd......', 'yyyyd....', '.lyyyyd..', '..lyyyyyd', '...lyyyyy', '....llyyy', '......lly', '.........'];
    const C = ['..d..', '.dyd.', 'dyryd', 'yrwry', 'dyryd', '.dyd.', '..d..', '.....', '.....'];
    ICON_PIX.s_ace = outlined(L.map((l, i) => l + C[i] + [...l].reverse().join('')), { y: '#ffc933', l: '#fff0a0', d: '#e09a12', r: '#d8433b', w: '#ffffff' });
  }
  const FL = ['.....r.....', '....rr.....', '....rrr..r.', '...rrnr..rr', '..rrnnrr.rr', '..rnnnnrrrr', '.rrnnynnnrr', '.rnnyyynnr.', 'rrnyylyynrr', 'rnnyllllynr', 'rnyylllyynr', '.rnyyyyynr.', '..rrnnnrr..'];
  ICON_PIX.s_fury = outlined(FL, { r: '#d8331b', n: '#ff8a1e', y: '#ffd23f', l: '#fff6c8' });
  ICON_PIX.s_rampage = outlined(['h...........h', 'hh.........hh', '.hh.bbbbbbbhh', '..hbbbbbbbbs.', '..bbbbbbbbbs.', '..bbeebeebbs.', '..bbeebeebbs.', '..bbbbkbbbbs.', '...bbbbbbbs..', '....bkbkbs...', '....bbbbss...'].map(r => r.slice(0, 13)),
    { h: '#efe6cf', b: '#c9302c', s: '#8a1c1a', e: '#ffd23f', k: '#1a1a1a' });
  ICON_PIX.s_violence = outlined([...pad(['.r...r...r.', 'rnr.rnr.rnr', 'nynnnynnnyn'], 1, 1), ...pad(SK, 2)].map(r => r.padEnd(13, '.').slice(0, 13)),
    { r: '#c4122f', n: '#ff4a8a', y: '#ffd0e8', b: '#3a1840', s: '#24102a', e: '#ff2a4a', k: '#ff2a4a' });
}
{
  const S = 8, css = [];
  for (const [name, rows] of Object.entries(ICON_ART)) {
    const w = Math.max(...rows.map(r => r.length)), c = document.createElement('canvas'); c.width = w * S; c.height = rows.length * S;
    const g = c.getContext('2d'); g.fillStyle = '#fff';
    rows.forEach((row, y) => [...row].forEach((ch, x) => { if (ch === '#') g.fillRect(x * S, y * S, S, S); }));
    css.push(`.ic-${name}{--m:url(${c.toDataURL()});--ar:${w / rows.length}}`);
  }
  for (const [name, { pal, rows }] of Object.entries(ICON_PIX)) {
    const w = Math.max(...rows.map(r => r.length)), c = document.createElement('canvas'); c.width = w * S; c.height = rows.length * S;
    const g = c.getContext('2d');
    rows.forEach((row, y) => [...row].forEach((ch, x) => { if (pal[ch]) { g.fillStyle = pal[ch]; g.fillRect(x * S, y * S, S, S); } }));
    css.push(`.ic-${name}{--m:url(${c.toDataURL()});--ar:${w / rows.length}}`);
  }
  const st = document.createElement('style'); st.textContent = css.join('\n'); document.head.append(st);
}
const ico = (name, cls = '') => `<span class="ic ic-${name}${ICON_PIX[name] ? ' px' : ''}${cls ? ' ' + cls : ''}"><i></i></span>`;
// stars: in use, owned but unused (dim), not owned (hollow)
const starRow = (used, owned = used, max = owned) => ico('star').repeat(used) + ico('star', 'dim').repeat(Math.max(0, owned - used)) + ico('starO').repeat(Math.max(0, max - owned));
// icon buttons
$('custRand').innerHTML = $('nameDice').innerHTML = ico('dice');
$('cloudBtn').innerHTML = ico('cloud');
$('armX').innerHTML = $('bindX').innerHTML = ico('close') + ' CLOSE';
$('next').innerHTML = 'NEXT WAVE ' + ico('right');
// only touch the DOM when the HTML changed
const setHTML = (el, html) => { if (el._h !== html) { el._h = html; el.innerHTML = html; } };
