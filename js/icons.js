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
};
// hollow star for ones you don't own yet
ICON_ART.starO = ICON_ART.star.map((row, y, a) => [...row].map((ch, x) => ch === '#' && [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]].some(([dx, dy]) => a[y + dy]?.[x + dx] !== '#') ? '#' : '.').join(''));
ICON_ART.right = ICON_ART.left.map(r => [...r].reverse().join(''));
ICON_ART.up = ICON_ART.left[0].split('').map((_, x) => ICON_ART.left.map(r => r[x]).join(''));
ICON_ART.down = [...ICON_ART.up].reverse();
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
