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
  target: ['...#####...', '..#.....#..', '.#..###..#.', '#..#...#..#', '#.#..#..#.#', '#.#.###.#.#', '#.#..#..#.#', '#..#...#..#', '.#..###..#.', '..#.....#..', '...#####...'],
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
  friends: ['..##.....##..', '.####...####.', '.####...####.', '..##.....##..', '.............', '.####...####.', '######.######', '######.######'],
  lobby: ['.........##..', '.........##..', '....#........', '...###...#...', '..#####.###..', '.###########.', '#############'],
  isle: ['......#......', '.....###.....', '....#####....', '...#######...', '......#......', '#############', '.###########.', '..#########..', '...#######...', '....#####....', '.....###.....', '......#......'],
  pine: ['.....#.....', '....###....', '...#####...', '....###....', '..#######..', '...#####...', '.#########.', '###########', '.....#.....', '.....#.....'],
  castle: ['......#......', '......###....', '......#......', '....#.#.#....', '....#####....', '#.#.#####.#.#', '###.#####.###', '###.#####.###', '#############', '#####...#####', '####.....####', '####.....####'],
  volcano: ['..#...#...#..', '...#..#..#...', '....#.#.#....', '.............', '....##.##....', '...###.###...', '..#########..', '.###########.', '#############'],
  aurora: ['.....#.....', '.#...#...#.', '..#..#..#..', '...#.#.#...', '....###....', '###########', '....###....', '...#.#.#...', '..#..#..#..', '.#...#...#.', '.....#.....'],
  swords: ['##.........##', '###.......###', '.###.....###.', '..###...###..', '...###.###...', '....#####....', '.....###.....', '....#####....', '.#####.#####.', '..###...###..', '..###...###..', '.#..#...#..#.', '#...........#'],
  flag: ['##.......', '#####....', '#######..', '#########', '#######..', '#####....', '##.......', '#........', '#........', '#........'],
  blade: ['...#...', '..###..', '..###..', '..###..', '..###..', '..###..', '..###..', '#######', '#######', '...#...', '...#...', '..###..'],
  cactus: ['.....##....', '....####...', '....####...', '.##.####...', '.##.####.##', '.##.####.##', '.#######.##', '..######.##', '....#######', '....######.', '....####...', '....####...'],
  ship: ['......#......', '.....##.##...', '....###.###..', '...####.####.', '..#####.####.', '.######.####.', '......#......', '#############', '.###########.', '..#########..'],
  ghost: ['...#####...', '..#######..', '.#########.', '.##..#..##.', '.##..#..##.', '.#########.', '.#########.', '.#########.', '.#########.', '.##.###.##.', '.#...#...#.'],
  rocket: ['.....#.....', '....###....', '....###....', '...#####...', '...##.##...', '...##.##...', '...#####...', '...#####...', '..#######..', '.##.###.##.', '.#..#.#..#.', '....#.#....'],
  fish: ['.....####.....', '...########.##', '..#.########.#', '.############.', '..##########.#', '...########.##', '.....####.....'],
  candy: ['#...........#', '##..#####..##', '###.#####.###', '#############', '###.#####.###', '##..#####..##', '#...........#'],
};
// full-color icons
const ICON_PIX = {
};
// hollow star for ones you don't own yet
ICON_ART.starO = ICON_ART.star.map((row, y, a) => [...row].map((ch, x) => ch === '#' && [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]].some(([dx, dy]) => a[y + dy]?.[x + dx] !== '#') ? '#' : '.').join(''));
ICON_ART.right = ICON_ART.left.map(r => [...r].reverse().join(''));
ICON_ART.up = ICON_ART.left[0].split('').map((_, x) => ICON_ART.left.map(r => r[x]).join(''));
ICON_ART.down = [...ICON_ART.up].reverse();
ICON_ART.plus = ['..###..', '..###..', '#######', '#######', '#######', '..###..', '..###..']; // medkit
ICON_ART.flair = ['.....#.....', '.....#.....', '....###....', '....###....', '..#######..', '###########', '..#######..', '....###....', '....###....', '.....#.....', '.....#.....']; // inspect: a glint
ICON_ART.fast = ['#...#...', '##..##..', '###.###.', '########', '###.###.', '##..##..', '#...#...']; // speed
ICON_ART.crown = ['#....#....#', '##..###..##', '###.###.###', '###########', '###########', '.#########.', '...........', '.#########.'];
ICON_ART.clock = ['...#####...', '.#########.', '.####.####.', '#####.#####', '#####.#####', '#####...###', '###########', '###########', '.#########.', '.#########.', '...#####...'];
ICON_ART.eye = ['...#####...', '.##.....##.', '#...###...#', '#..#####..#', '#...###...#', '.##.....##.', '...#####...']; // shown on you
ICON_ART.eyeShut = ['...........', '...........', '#.........#', '.##.....##.', '...#####...', '...#.#.#...', '...........']; // hidden
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
// full-color icon with a dark outline drawn round it
const outlined = (rows, pal) => {
  const at = (x, y) => rows[y - 1]?.[x - 1] && rows[y - 1][x - 1] !== '.', W = Math.max(...rows.map(r => r.length)) + 2, H = rows.length + 2, out = [];
  for (let y = 0; y < H; y++) { let r = ''; for (let x = 0; x < W; x++) r += at(x, y) ? rows[y - 1][x - 1] : [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => at(x + dx, y + dy)) ? 'o' : '.'; out.push(r); }
  return { pal: { o: '#141414', ...pal }, rows: out };
};
// 3D icons, lit like the titanium bar: the face in front with its top and right sides showing, drawn big and scaled smoothly
const pixRing = (g, pal) => { // a dark outline round a grid with a free pixel on every side
  const lit = (x, y) => !'.o'.includes(g[y]?.[x] ?? '.');
  for (let y = 0; y < g.length; y++) for (let x = 0; x < g[y].length; x++) if (g[y][x] === '.' && (lit(x + 1, y) || lit(x - 1, y) || lit(x, y + 1) || lit(x, y - 1))) g[y][x] = 'o';
  return { pal, rows: g.map(r => r.join('')), smooth: true };
};
const pixGrid = (w, h) => Array.from({ length: h }, () => Array(w).fill('.'));
const pixFace = rows => (x, y) => (rows[y]?.[x] ?? '.') !== '.';
function pixSolid(W, H, face, pal, depth = 1, top = 'T', side = 'R') { // a flat shape with thickness
  const on = (x, y) => x >= 0 && y >= 0 && x < W && y < H && !!face(x, y), g = pixGrid(W + depth + 2, H + depth + 2);
  for (let k = depth; k > 0; k--) for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (on(x, y)) g[y + 1 + depth - k][x + 1 + k] = on(x + 1, y) ? top : side;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (on(x, y)) g[y + 1 + depth][x + 1] = face(x, y);
  return pixRing(g, pal);
}
function pixVox(boxes, f, pal, cut = () => false) { // a little voxel model: boxes [x0, y0, z0, x1, y1, z1] (z goes back), f(face, x, y, z, box) colours what shows
  const V = new Map(), k = (x, y, z) => x + ',' + y + ',' + z;
  boxes.forEach(([x0, y0, z0, x1, y1, z1], i) => { for (let z = z0; z < z1; z++) for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) if (!cut(x, y, z)) V.set(k(x, y, z), i); });
  const has = (x, y, z) => V.has(k(x, y, z)), P = [...V.keys()].map(s => s.split(',').map(Number));
  const x0 = Math.min(...P.map(p => p[0] + p[2])), y0 = Math.min(...P.map(p => p[1] - p[2])), g = pixGrid(Math.max(...P.map(p => p[0] + p[2])) - x0 + 3, Math.max(...P.map(p => p[1] - p[2])) - y0 + 3);
  for (const [x, y, z] of P.sort((a, b) => b[2] - a[2])) { // far to near
    const c = f(!has(x, y, z - 1) ? 'f' : !has(x, y - 1, z) ? 't' : !has(x + 1, y, z) ? 'r' : 'n', x, y, z, V.get(k(x, y, z)));
    if (c) g[y - z - y0 + 1][x + z - x0 + 1] = c;
  }
  return pixRing(g, pal);
}
const PIX_GOLD = { o: '#3d2604', H: '#fff6c8', L: '#ffe066', y: '#ffc933', d: '#e09a12', X: '#c27c0e', T: '#ffe58a', R: '#a8660a' };
const pixLit = (on, x, y, mid = 'y') => !on(x, y - 1) ? 'H' : !on(x, y + 1) ? 'd' : mid; // lit along the top, shaded along the bottom
// chest key: a round ring on the blade's line
{
  const T = ['.......##.###', '.......##.###', '..........###'], on = (x, y) => { const d = Math.hypot(x + .5 - 5, y + .5 - 5); return (d <= 5.05 && d > 2.05) || (x >= 9 && x <= 10 && y >= 3 && y <= 6) || (x >= 9 && x <= 21 && (y === 4 || y === 5)) || T[y - 6]?.[x - 9] === '#'; };
  ICON_PIX.key = pixSolid(22, 10, (x, y) => on(x, y) && pixLit(on, x, y), PIX_GOLD, 1);
}
// booster lightning bolt
{
  const on = pixFace(['.....#####', '....#####.', '....####..', '...####...', '..####....', '.#########', '.########.', '....####..', '....###...', '...###....', '...##.....', '..##......', '..#.......']);
  ICON_PIX.bolt = pixSolid(10, 13, (x, y) => on(x, y) && (!on(x, y - 1) || !on(x - 1, y) ? 'H' : !on(x, y + 1) || !on(x + 1, y) ? 'd' : 'y'), PIX_GOLD, 2);
}
// coin, turned a little: the face an ellipse and its ridged edge showing on the right
const COIN_PIX = (() => {
  const g = pixGrid(15, 16), R = 5.2;
  for (let y = 0; y < 14; y++) for (let x = 0; x < 13; x++) {
    const e = (y - 6.5) / 7, u = (x + .5 - R) / R, s = Math.sqrt(1 - e * e), q = Math.hypot(u, e), lit = -u * .6 - e * .8;
    if (Math.abs(u) <= s) g[y + 1][x + 1] = q > .8 ? (lit > .25 ? 'H' : lit > -.2 ? 'L' : 'd') : q > .64 ? (lit > 0 ? 'd' : 'X') : Math.abs(u) < .14 && Math.abs(e) < .36 ? (lit > 0 ? 'H' : 'L') : lit > .35 ? 'L' : lit > -.35 ? 'y' : 'd';
    else if (u > 0 && u * R <= R * s + 2.2) g[y + 1][x + 1] = y % 2 ? 'X' : 'R';
  }
  return pixRing(g, PIX_GOLD);
})();
// XP gem, cut
ICON_PIX.xp = (() => {
  const W = 13, c = 6, hw = [3, 4, 5, 6, 6, 5, 4, 3, 2, 1, 0], g = pixGrid(W + 2, hw.length + 2);
  hw.forEach((h, y) => { for (let x = c - h; x <= c + h; x++) {
    const dx = x - c, crown = y < 4;
    g[y + 1][x + 1] = crown ? (y === 3 ? 'G' : Math.abs(dx) < 3 ? (y === 0 && dx < 0 ? 'W' : 't') : dx < 0 ? 'L' : 'g') : Math.abs(dx) <= (10 - y) * .3 ? 'm' : dx < 0 ? 'g' : 'd';
  } });
  g[2][4] = 'W';
  return pixRing(g, { o: '#0d2a1a', W: '#ffffff', t: '#9ff0c0', L: '#c8ffe0', G: '#5ad690', g: '#2fbf71', m: '#22a060', d: '#16804a' });
})();
// daily gift: a box under its lid, a ribbon both ways and a bow
ICON_PIX.gift = pixVox([[1, 3, 1, 11, 11, 5], [0, 0, 0, 12, 3, 5], [2, -3, 2, 4, -1, 3], [8, -3, 2, 10, -1, 3], [3, -2, 2, 5, 0, 3], [7, -2, 2, 9, 0, 3], [5, -1, 2, 7, 0, 3]], (f, x, y, z, b) => {
  const rib = x === 5 || x === 6;
  if (b > 1) return f === 't' ? 'l' : f === 'r' ? 'Y' : rib && y === -1 ? 'K' : 'y'; // the bow
  if (f === 'n') return 'l'; // under the bow
  if (f === 'f') return rib ? 'y' : b ? 'h' : y === 10 ? 'D' : 'r';
  if (f === 't') return rib || z === 2 ? 'l' : 'R';
  return z === 2 ? 'Y' : b ? 'D' : 'E';
}, { o: '#141414', r: '#d8433b', h: '#ec5a50', R: '#f2786e', D: '#9a2a24', E: '#7c1f1b', y: '#ffd75e', l: '#fff0a0', Y: '#d99a22', K: '#e8b23a' });
// random name and look: two arrows crossing, the one going up passes under
{
  const seg = (px, py, [ax, ay, bx, by]) => { const dx = bx - ax, dy = by - ay, t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy))); return Math.hypot(px - ax - t * dx, py - ay - t * dy); };
  const path = (ya, yb) => [[.5, ya, 4.5, ya], [4.5, ya, 13.5, yb], [13.5, yb, 14.5, yb]], A = path(2.5, 11.5), B = path(11.5, 2.5);
  const head = (px, py, cy) => px >= 14 && px <= 19.5 && Math.abs(py - cy) <= 2.6 * (19.5 - px) / 5.5;
  ICON_PIX.shuffle = pixSolid(20, 14, (x, y) => {
    const px = x + .5, py = y + .5;
    return A.some(s => seg(px, py, s) <= 1.02) || head(px, py, 11.5) || ((B.some(s => seg(px, py, s) <= 1.02) || head(px, py, 2.5)) && seg(px, py, A[1]) > 2.07) ? 'F' : null;
  }, { o: '#171c26', F: '#e2e7ee' }, 0);
}
// settings gear: a round body, eight square teeth and a hole, flat
{
  const N = 17, c = N / 2, on = (x, y) => {
    const dx = x + .5 - c, dy = y + .5 - c, d = Math.hypot(dx, dy);
    if (d < 2.9 || x < 0 || y < 0 || x >= N || y >= N) return false;
    if (d <= 5.7) return true;
    for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4, u = dx * Math.cos(a) + dy * Math.sin(a), v = -dx * Math.sin(a) + dy * Math.cos(a); if (u > 0 && u < 8.4 && Math.abs(v) < 1.75) return true; }
    return false;
  };
  ICON_PIX.gear = pixSolid(N, N, (x, y) => on(x, y) && (y < c ? 'F' : 'G'), { o: '#171c26', F: '#d3d9e2', G: '#a3adbb' }, 0);
}
// achievement star, cut into lit and shaded halves
ICON_PIX.ach = (() => {
  const cx = 9.5, cy = 10.2, V = [...Array(10)].map((_, i) => { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 4.4 : 9.6; return [cx + Math.cos(a) * r, cy + Math.sin(a) * r]; });
  return pixSolid(19, 19, (x, y) => {
    const px = x + .5, py = y + .5, i = Math.floor((((Math.atan2(py - cy, px - cx) + Math.PI / 2) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI)) / (Math.PI / 5)) % 10;
    const [ax, ay] = V[i], [bx, by] = V[(i + 1) % 10], ex = bx - ax, ey = by - ay, side = (q, r) => ex * (r - ay) - ey * (q - ax);
    if (side(px, py) * side(cx, cy) < 0) return null;
    const l = Math.hypot(ex, ey), nx = ey / l, ny = -ex / l, out = side(cx, cy) > 0 ? -1 : 1, b = (nx * -.55 + ny * -.83) * out;
    return b > .55 ? 'H' : b > .1 ? 'L' : b > -.3 ? 'y' : b > -.7 ? 'd' : 'X';
  }, PIX_GOLD, 1);
})();
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
function pixPic({ pal, rows }, S) {
  const w = Math.max(...rows.map(r => r.length)), c = document.createElement('canvas'); c.width = w * S; c.height = rows.length * S;
  const g = c.getContext('2d');
  rows.forEach((row, y) => [...row].forEach((ch, x) => { if (pal[ch]) { g.fillStyle = pal[ch]; g.fillRect(x * S, y * S, S, S); } }));
  return c;
}
{
  const S = 8, css = [];
  for (const [name, rows] of Object.entries(ICON_ART)) {
    const w = Math.max(...rows.map(r => r.length)), c = document.createElement('canvas'); c.width = w * S; c.height = rows.length * S;
    const g = c.getContext('2d'); g.fillStyle = '#fff';
    rows.forEach((row, y) => [...row].forEach((ch, x) => { if (ch === '#') g.fillRect(x * S, y * S, S, S); }));
    css.push(`.ic-${name}{--m:url(${c.toDataURL()});--ar:${w / rows.length}}`);
  }
  for (const [name, art] of Object.entries(ICON_PIX)) { const c = pixPic(art, S); css.push(`.ic-${name}{--m:url(${c.toDataURL()});--ar:${c.width / c.height}}`); }
  const st = document.createElement('style'); st.textContent = css.join('\n'); document.head.append(st);
  document.documentElement.style.setProperty('--coin', `url(${pixPic(COIN_PIX, S).toDataURL()})`);
}
const ico = (name, cls = '') => `<span class="ic ic-${name}${ICON_PIX[name] ? ICON_PIX[name].smooth ? ' px sm' : ' px' : ''}${cls ? ' ' + cls : ''}"><i></i></span>`;
// stars: in use, owned but unused (dim), not owned (hollow)
const starRow = (used, owned = used, max = owned) => ico('star').repeat(used) + ico('star', 'dim').repeat(Math.max(0, owned - used)) + ico('starO').repeat(Math.max(0, max - owned));
// icon buttons
$('custRand').innerHTML = $('nameDice').innerHTML = ico('shuffle');
$('cloudBtn').innerHTML = ico('cloud'); $('friendsBtn').insertAdjacentHTML('afterbegin', ico('friends'));
$('armX').innerHTML = $('bindX').innerHTML = ico('close') + ' CLOSE';
$('next').innerHTML = 'NEXT WAVE ' + ico('right');
// only touch the DOM when the HTML changed
const setHTML = (el, html) => { if (el._h !== html) { el._h = html; el.innerHTML = html; } };
