// ---- game icons: small pixel-art shapes used everywhere instead of emoji or text symbols.
// Each one is a mask filled with the color of the text around it, with a hard dark shadow like the text's.
// ico('star') gives the HTML to drop into any text. '#' = filled, '.' = empty
const ICON_ART = {
  star: ['.....#.....', '....###....', '....###....', '###########', '.#########.', '..#######..', '...#####...', '..###.###..', '..##...##..', '.##.....##.'],
  lock: ['..#####..', '.##...##.', '.#.....#.', '.#.....#.', '#########', '#########', '####.####', '####.####', '####.####', '#########', '#########'],
  dice: ['.##########.', '############', '##..####..##', '##..####..##', '############', '#####..#####', '#####..#####', '############', '##..####..##', '##..####..##', '############', '.##########.'],
  cloud: ['.....####.....', '....######....', '.##.#######...', '#############.', '##############', '##############', '.############.'],
  left: ['....#', '...##', '..###', '.####', '#####', '.####', '..###', '...##', '....#'],
  close: ['##....##', '###..###', '.######.', '..####..', '..####..', '.######.', '###..###', '##....##'],
  pencil: ['.......##.', '......####', '.....#.###', '....#####.', '...#####..', '..#####...', '.#####....', '.####.....', '###.......', '##........'],
  heart: ['.##...##.', '####.####', '#########', '#########', '.#######.', '..#####..', '...###...', '....#....'],
  shield: ['#########', '##.....##', '##.....##', '##.....##', '##.....##', '.##...##.', '.##...##.', '..##.##..', '...###...', '....#....'],
  inf: ['.###.....###.', '##.##...##.##', '#...##.##...#', '#....###....#', '#...##.##...#', '##.##...##.##', '.###.....###.'],
  skull: ['.#######.', '#########', '#########', '##..#..##', '##..#..##', '####.####', '.#######.', '..#.#.#..', '..#####..'],
  head: ['.....#.....', '...#####...', '..#..#..#..', '.#...#...#.', '.#.......#.', '#####.#####', '.#.......#.', '.#...#...#.', '..#..#..#..', '...#####...', '.....#.....'],
};
// the hollow star (a star you don't own yet): just the edge of the filled one
ICON_ART.starO = ICON_ART.star.map((row, y, a) => [...row].map((ch, x) => ch === '#' && [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]].some(([dx, dy]) => a[y + dy]?.[x + dx] !== '#') ? '#' : '.').join(''));
ICON_ART.right = ICON_ART.left.map(r => [...r].reverse().join(''));
ICON_ART.up = ICON_ART.left[0].split('').map((_, x) => ICON_ART.left.map(r => r[x]).join('')); // turned on its side
ICON_ART.down = [...ICON_ART.up].reverse();
{
  const S = 8, css = [];
  for (const [name, rows] of Object.entries(ICON_ART)) {
    const w = Math.max(...rows.map(r => r.length)), c = document.createElement('canvas'); c.width = w * S; c.height = rows.length * S;
    const g = c.getContext('2d'); g.fillStyle = '#fff';
    rows.forEach((row, y) => [...row].forEach((ch, x) => { if (ch === '#') g.fillRect(x * S, y * S, S, S); }));
    css.push(`.ic-${name}{--m:url(${c.toDataURL()});--ar:${w / rows.length}}`);
  }
  const st = document.createElement('style'); st.textContent = css.join('\n'); document.head.append(st);
}
const ico = (name, cls = '') => `<span class="ic ic-${name}${cls ? ' ' + cls : ''}"><i></i></span>`;
// a row of max stars: the ones in use, then ones you own but aren't using (dimmed), then hollow ones you don't own
const starRow = (used, owned = used, max = owned) => ico('star').repeat(used) + ico('star', 'dim').repeat(Math.max(0, owned - used)) + ico('starO').repeat(Math.max(0, max - owned));
// buttons in index.html that are just an icon, or an icon and a word
$('custRand').innerHTML = $('nameDice').innerHTML = ico('dice');
$('cloudBtn').innerHTML = ico('cloud');
$('armX').innerHTML = $('bindX').innerHTML = ico('close') + ' CLOSE';
$('next').innerHTML = 'NEXT WAVE ' + ico('right');
// sets an element's HTML only when it changed (for HUD text updated every frame)
const setHTML = (el, html) => { if (el._h !== html) { el._h = html; el.innerHTML = html; } };
