// player names: your saved name, plus the name pool bots draw from.
// The bot that's there when the match starts gets a NATO-alphabet name ("Foxtrot"). The ones that join later
// get names that look like real people made them, so a lobby full of bots doesn't feel like one.
// Most are English. The rest are spread across other big languages, and each name remembers its language
// so that bot can chat in it (js/chat.js).
const NAME_MAX = 16;
const pickN = a => a[Math.random() * a.length | 0];

// ---------- English ----------
const N_ADJ = ['Brave', 'Silent', 'Swift', 'Crazy', 'Lucky', 'Angry', 'Happy', 'Sneaky', 'Wild', 'Dark', 'Golden', 'Frozen', 'Mighty',
  'Tiny', 'Fat', 'Lazy', 'Epic', 'Toxic', 'Salty', 'Spicy', 'Fuzzy', 'Rapid', 'Iron', 'Shadow', 'Crimson', 'Electric', 'Savage', 'Sleepy',
  'Hungry', 'Fierce', 'Noble', 'Royal', 'Rusty', 'Cosmic', 'Mad', 'Bold', 'Clever', 'Grumpy', 'Ancient', 'Burning', 'Silver', 'Stealthy',
  'Wicked', 'Jolly', 'Mystic', 'Frosty', 'Neon', 'Stormy', 'Lone', 'Sly', 'Red', 'Blue', 'Purple', 'Big', 'Little', 'Cool', 'Super', 'Hyper'];
const N_NOUN = ['Lion', 'Tiger', 'Wolf', 'Fox', 'Bear', 'Eagle', 'Hawk', 'Shark', 'Panda', 'Dragon', 'Ninja', 'Pirate', 'Knight', 'Wizard',
  'Sniper', 'Hunter', 'Ghost', 'Robot', 'Potato', 'Taco', 'Noodle', 'Pickle', 'Muffin', 'Cookie', 'Penguin', 'Llama', 'Goat', 'Viper',
  'Cobra', 'Falcon', 'Raven', 'Phoenix', 'Panther', 'Rhino', 'Gorilla', 'Monkey', 'Duck', 'Frog', 'Cat', 'Dog', 'Bunny', 'Turtle', 'Storm',
  'Blade', 'Bullet', 'Rocket', 'Cactus', 'Banana', 'Waffle', 'Nugget', 'Yeti', 'Kraken', 'Samurai', 'Viking', 'Cowboy', 'Chef', 'Goblin'];
// gamer-tag style names, the kind people pick when they want to sound cool
const N_TAGS = ['Vortex', 'Shadow', 'Zyro', 'Nova', 'Frost', 'Blaze', 'Raven', 'Phantom', 'Reaper', 'Jinx', 'Viper', 'Echo', 'Hex',
  'Onyx', 'Kairo', 'Lunar', 'Pixel', 'Glitch', 'Nexus', 'Havoc', 'Rogue', 'Zenith', 'Apex', 'Ember', 'Static', 'Volt', 'Cipher', 'Riot',
  'Talon', 'Wraith', 'Sable', 'Cryo', 'Drift', 'Fury', 'Nyx', 'Orbit', 'Pulse', 'Rift', 'Slayer', 'Specter', 'Venom', 'Xeno', 'Zero',
  'Axel', 'Blitz', 'Crux', 'Dusk', 'Flux', 'Grim', 'Hydra', 'Ignis', 'Jolt', 'Krypt', 'Mako', 'Neon', 'Omen', 'Prism', 'Quake', 'Rune',
  'Sky', 'Titan', 'Umbra', 'Vex', 'Wolfie', 'Zap', 'NoScope', 'Headshot', 'OneTap', 'Sweaty', 'Clutch', 'Tryhard', 'Snipez', 'Quickscope',
  'Laggy', 'Noob', 'ProGamer', 'NotABot', 'Camper', 'Spammer', 'Reloading', 'Dorito', 'MrBean', 'SirLag', 'Kawaii', 'Chungus', 'Bobby',
  'Goose', 'Boop', 'Pog', 'Yeet', 'Bonk', 'Sus', 'Moist', 'Bruh', 'DeathStar', 'Skull', 'Maverick', 'Ronin', 'Shogun'];
// first names, the way kids type them as usernames
const N_FIRST = ['jake', 'tyler', 'ethan', 'noah', 'liam', 'mason', 'logan', 'owen', 'ryan', 'kyle', 'jayden', 'aiden', 'caleb', 'dylan',
  'max', 'sam', 'ben', 'leo', 'eli', 'zach', 'nate', 'josh', 'mia', 'ava', 'emma', 'lily', 'zoe', 'chloe', 'ella', 'maya', 'ruby', 'nora',
  'jack', 'luke', 'evan', 'cole', 'alex', 'jordan', 'chris', 'brandon', 'kevin', 'danny', 'tommy', 'charlie', 'grace', 'hannah', 'sophie'];
const N_SUFFIX = ['Plays', 'Gaming', 'YT', 'TV', 'Pro', 'GG', 'xD', 'HD', 'Official', 'Real'];
const N_NUMS = ['1', '2', '7', '9', '11', '13', '21', '23', '42', '64', '77', '88', '99', '101', '123', '321', '777', '999', '007', '360',
  '2008', '2009', '2010', '2011', '2012', '2013', '1337'];
const num = () => Math.random() < .55 ? pickN(N_NUMS) : String(10 + (Math.random() * 90 | 0));

// ---------- other languages ----------
// [weight out of 100, full names in that language]. English takes whatever weight is left (about 60%).
const N_LANGS = {
  es: [9, ['LeonValiente', 'LoboNegro', 'ElTigre', 'Fuego', 'Sombra', 'ElCrack', 'Rayo', 'DragonRojo', 'Pollito', 'ElProXD', 'Toro',
    'Guerrero', 'Calavera', 'Halcon', 'Tiburon', 'ElLoco', 'ElMasPro', 'Gatito', 'Fantasma', 'Relampago', 'Mateo', 'Santi', 'Diego',
    'Sofi', 'Valen', 'Javi', 'Pepe', 'Carlitos', 'Nacho', 'ElChapulin', 'Churro', 'Taquito', 'Zorro', 'Pantera', 'Cazador']],
  pt: [6, ['LoboMau', 'Raio', 'Sombra', 'Guerreiro', 'Tubarao', 'Gabriel', 'Joao', 'Pedrinho', 'Monstro', 'Brabo', 'Matador', 'Fera',
    'Leao', 'Caveira', 'Lucas', 'Rafa', 'Thiago', 'ReiDoCampo', 'Pastel', 'Coxinha', 'Mito', 'Jacare', 'Capivara', 'Brasileiro']],
  de: [5, ['SchnellerWolf', 'Blitz', 'Donner', 'SchwarzerAdler', 'Krieger', 'Eisbaer', 'Feuerfaust', 'Lukas', 'Finn', 'Jonas', 'Leon',
    'DerBoss', 'Kartoffel', 'Wurst', 'Sturm', 'Jaeger', 'Panzer', 'Schatten', 'Fuchs', 'Drache', 'Bratwurst', 'Brezel', 'Hans']],
  fr: [5, ['LoupNoir', 'LeRenard', 'Foudre', 'Ombre', 'LionFeroce', 'ChatNoir', 'Baguette', 'LePro', 'Hugo', 'Theo', 'Lea', 'Louis',
    'Nathan', 'Croissant', 'Fromage', 'Tonnerre', 'Fantome', 'Chasseur', 'LeRoi', 'Requin', 'Corbeau', 'Gros', 'Petit']],
  it: [4, ['LupoNero', 'Fulmine', 'Tigre', 'Drago', 'LeoneForte', 'Ombra', 'Marco', 'Luca', 'Giulia', 'Matteo', 'PizzaBoss', 'IlCapo',
    'Spaghetti', 'Tempesta', 'Falco', 'Squalo', 'Fantasma', 'Guerriero', 'Gnocchi', 'Mozzarella']],
  ru: [4, ['Волк', 'Медведь', 'Снайпер', 'Тень', 'Призрак', 'Mishka', 'Vanya', 'Dimon', 'Kotik', 'Tankist', 'Ivan', 'Sasha', 'Kolya',
    'Babushka', 'Борщ', 'Кот', 'Ястреб', 'Убийца']],
  zh: [4, ['小龙', '无敌战神', '夜猫子', '狙神', '孤狼', '小白', '大魔王', '冰雪', '火龙', '天下第一', '小明', '王者', '老虎', '熊猫',
    'LongWang', 'XiaoMing', 'Tianlong', 'Wei', 'Chen', 'Haoran', 'Zhang', 'Lin']],
  ja: [3, ['サクラ', '忍者', '鬼', 'Kitsune', 'Ryu', 'Kaito', 'Yuki', 'Ookami', 'Hikari', 'Sora', 'Raijin', 'Haruto', 'Ren', 'Senpai',
    'Neko', 'Sushi', 'Tanuki', 'Kage', 'Akuma', 'ねこ']],
  ko: [2, ['호랑이', '민준', '지수', 'Minjun', 'Jisoo', 'Hyun', 'Taeyang', 'Seojun', 'Kimchi', 'Doyun', '불꽃', '용']],
};
const N_LATIN = s => /^[\x00-\x7f]*$/.test(s); // only add number tags and the like to names in plain letters

// one English name: adjective + noun, a gamer tag, or a first name, dressed up the way people actually type them
function enName() {
  const r = Math.random();
  if (r < .35) { // BraveLion, brave_lion, BraveLion42, xBraveLionx
    const a = pickN(N_ADJ), n = pickN(N_NOUN), s = Math.random();
    if (s < .4) return a + n;
    if (s < .6) return a + n + num();
    if (s < .75) return (a + '_' + n).toLowerCase();
    if (s < .85) return a.toLowerCase() + n.toLowerCase() + num();
    if (s < .93) return a + '_' + n;
    return 'x' + a + n + 'x';
  }
  if (r < .8) { // Vortex, Vortex_77, xVortex, ItzVortex, VortexYT, iiVortex, VORTEX
    const t = pickN(N_TAGS), s = Math.random();
    if (s < .3) return t;
    if (s < .5) return t + num();
    if (s < .58) return t + '_' + num();
    if (s < .65) return 'x' + t;
    if (s < .72) return 'Itz' + t;
    if (s < .77) return 'ii' + t;
    if (s < .85) return t + pickN(N_SUFFIX);
    if (s < .9) return t.toLowerCase();
    if (s < .94) return t.toUpperCase();
    if (s < .97) return 'xX' + t + 'Xx';
    return 'TTV_' + t;
  }
  // jake2010, Mia_xo, EthanPlays, lily_77
  const f = pickN(N_FIRST), F = f[0].toUpperCase() + f.slice(1), s = Math.random();
  if (s < .4) return f + num();
  if (s < .55) return F + pickN(N_SUFFIX);
  if (s < .7) return f + '_' + num();
  if (s < .8) return F + pickN(N_NOUN);
  if (s < .9) return 'its' + f;
  return F;
}
function langName(list) {
  const b = pickN(list);
  if (!N_LATIN(b)) return Math.random() < .2 ? b + num() : b; // 小龙, 小龙77
  const s = Math.random();
  if (s < .5) return b;
  if (s < .8) return b + num();
  if (s < .9) return b + '_' + num();
  return b.toLowerCase();
}
// a random name that looks like a real player made it. Returns { name, lang }.
function randomName() {
  let roll = Math.random() * 100;
  for (const lang in N_LANGS) {
    const [w, list] = N_LANGS[lang];
    if ((roll -= w) < 0) return { name: langName(list), lang };
  }
  return { name: enName(), lang: 'en' };
}
// names for one match: no repeats, nothing too long, nothing the same as yours
function nameMaker(taken) {
  const used = new Set(taken.map(s => s.toLowerCase()));
  return () => {
    for (let i = 0; i < 50; i++) {
      const n = randomName();
      if (n.name.length > NAME_MAX || used.has(n.name.toLowerCase()) || NATO_SET.has(n.name.toLowerCase())) continue;
      used.add(n.name.toLowerCase()); return n;
    }
    return { name: 'Player' + (1000 + Math.random() * 9000 | 0), lang: 'en' };
  };
}
// the bot that's in the match with you from the start gets a plain NATO-alphabet name ("Foxtrot").
// These names are kept only for bots (no real-looking name can be one exactly), so later a playstyle can hang off each.
const BOT_DEFAULTS = ['Alpha', 'Bravo', 'Charlie', 'Delta', 'Echo', 'Foxtrot', 'Golf', 'Hotel', 'India', 'Juliett', 'Kilo', 'Lima',
  'Mike', 'November', 'Oscar', 'Papa', 'Quebec', 'Romeo', 'Sierra', 'Tango', 'Uniform', 'Victor', 'Whiskey', 'Xray', 'Yankee', 'Zulu'];
const NATO_SET = new Set(BOT_DEFAULTS.map(s => s.toLowerCase()));
const defaultBotName = (not = '') => { // never the same as your name
  const ok = BOT_DEFAULTS.filter(s => s.toLowerCase() !== not.toLowerCase());
  return pickN(ok);
};

// ---------- your name: saved in the browser, set in the lobby ----------
function cleanName(s) { return String(s ?? '').replace(/[<>&"']/g, '').replace(/\s+/g, ' ').trim().slice(0, NAME_MAX); }
// the default name a new player gets, and what the dice rolls: always adjective + noun (BraveLion, BraveLion42)
function newMyName(not = '') {
  for (let i = 0; i < 20; i++) {
    let n = pickN(N_ADJ) + pickN(N_NOUN);
    if (Math.random() < .5) n += 10 + (Math.random() * 90 | 0);
    if (n.length <= NAME_MAX && n.toLowerCase() !== not.toLowerCase()) return n;
  }
  return 'BraveLion' + (10 + (Math.random() * 90 | 0));
}
let myName = cleanName(localStorage.getItem('voxelstrike-name'));
if (!myName) { myName = newMyName(); localStorage.setItem('voxelstrike-name', myName); }
function setMyName(s) {
  const n = cleanName(s);
  if (n) { myName = n; try { localStorage.setItem('voxelstrike-name', n); } catch {} }
  return myName;
}
