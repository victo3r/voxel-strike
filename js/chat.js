// Bots never talk on their own. They only answer when you say something (hi, gg, lol, compliments, trash talk,
// or now and then a plain "?" / "ok" to anything else). Bots with names in another language usually answer in it.
// The NATO-named bot never talks.
let chatting = false, chatQ = [], chatGap = 0;
const CHAT_KEEP = 9; // seconds a line stays up before it fades (they all show while you're typing)
const SAY = {
  en: { hi: ['hi', 'hey', 'yo', 'hello', 'sup', 'hii', 'gl hf', 'hey guys', 'heyy'], gg: ['gg', 'gg wp', 'ggs', 'good game', 'gg ez'],
    died: ['nice shot', 'lucky', 'bruh', 'how', 'wow', 'lag', 'ugh', 'nooo', 'who keeps shooting me', 'bro what', 'ok that was clean', 'camper'],
    kill: ['ez', 'lol', 'gotcha', 'sorry', 'oops', 'get good', 'too easy'], streak: ['im on fire', 'cant stop me', 'ez', 'who next'],
    lol: ['lol', 'lmao', 'haha', 'xd', 'LOL'], bot: ['not a bot lol', 'im not a bot', 'bro thinks im a bot', '?? no'],
    ty: ['ty', 'thx', 'thanks', 'tyty', 'u too'], trash: ['ok', 'lol ok', 'cope', 'sure buddy', 'says you', 'k'],
    meh: ['?', 'what', 'ok', 'lol', 'huh', 'k', 'idk'] },
  es: { hi: ['hola', 'holaa', 'buenas', 'hola a todos'], gg: ['gg', 'buena partida', 'gg bien jugado'],
    died: ['que suerte', 'noo', 'buen tiro', 'lag', 'casi', 'que??'], kill: ['jaja', 'ez', 'facil'], lol: ['jajaja', 'jaja', 'xd'] },
  pt: { hi: ['oi', 'ola', 'eae', 'salve'], gg: ['gg', 'boa partida'], died: ['sorte', 'boa', 'lag', 'aff', 'nao acredito'],
    kill: ['kkkk', 'ez', 'facil'], lol: ['kkkkk', 'kkk', 'rsrs'] },
  de: { hi: ['hallo', 'moin', 'servus', 'hi'], gg: ['gg', 'gutes spiel'], died: ['glück gehabt', 'nicht schlecht', 'lag', 'mist', 'boah'],
    kill: ['ez', 'haha', 'zu einfach'], lol: ['haha', 'lol'] },
  fr: { hi: ['salut', 'slt', 'bonjour', 'coucou'], gg: ['gg', 'bien joué', 'gg à tous'], died: ['bien joué', 'la chance', 'lag', 'nooon'],
    kill: ['mdr', 'ez', 'trop facile'], lol: ['mdr', 'ptdr', 'lol'] },
  it: { hi: ['ciao', 'ciao a tutti', 'salve'], gg: ['gg', 'bella partita'], died: ['che fortuna', 'bel colpo', 'lag', 'noo'],
    kill: ['ahah', 'ez', 'troppo facile'], lol: ['ahahah', 'lol'] },
  ru: { hi: ['привет', 'всем привет', 'ку'], gg: ['gg', 'хорошая игра'], died: ['повезло', 'лаги', 'норм', 'блин'],
    kill: ['изи', 'хаха'], lol: ['ахах', 'лол', 'хахах'] },
  zh: { hi: ['你好', '大家好', 'hi'], gg: ['gg', '打得好'], died: ['好枪法', '卡了', '啊啊啊', '运气好'], kill: ['哈哈', '太简单了', '666'],
    lol: ['哈哈哈', '233', '666'] },
  ja: { hi: ['こんにちは', 'よろしく', 'hi'], gg: ['gg', 'おつかれ'], died: ['ナイス', 'ラグい', 'くそ'], kill: ['w', 'www', '楽勝'], lol: ['www', '笑'] },
  ko: { hi: ['안녕', '안녕하세요', 'hi'], gg: ['gg', '수고'], died: ['아 뭐야', '렉', '나이스'], kill: ['ㅋㅋ', 'ez'], lol: ['ㅋㅋㅋ', 'ㅎㅎ'] },
};
const esc = s => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

function chatLine(html) {
  const d = document.createElement('div'); d.className = 'cl'; d.innerHTML = html; $('chatLog').append(d);
  while ($('chatLog').children.length > 8) $('chatLog').firstChild.remove();
  setTimeout(() => d.classList.add('old'), CHAT_KEEP * 1000);
}
const chatSay = (r, text) => chatLine(`${nameTag(r)}<span>: ${esc(text)}</span>`);

// a bot maybe says something of this kind, after a short human-ish delay. chance = how likely it bothers.
function botSay(r, kind, chance = 1, delay = 1 + Math.random() * 2) {
  if (!r || r.you || r.quiet || Math.random() > chance) return;
  const mine = SAY[r.lang] ?? SAY.en, en = SAY.en;
  // other-language bots switch to English a third of the time
  const pool = (r.lang !== 'en' && Math.random() < .35) || !mine[kind] ? en[kind] : mine[kind];
  if (!pool) return;
  let text = pickN(pool);
  if (Math.random() < .15 && /^[a-z ]+$/.test(text)) text = text.toUpperCase();
  chatQ.push({ r, text, t: delay });
}
// each frame (from updateDM): send queued bot lines when they're due, with a gap so they don't all land at once
function chatTick(dt) {
  chatGap -= dt;
  for (const m of chatQ) m.t -= dt;
  const i = chatQ.findIndex(m => m.t <= 0);
  if (i >= 0 && chatGap <= 0) {
    const [m] = chatQ.splice(i, 1);
    if (recs.includes(m.r)) { chatSay(m.r, m.text); chatGap = .6 + Math.random() * .8; }
  }
}
function botsHear(text) {
  const t = text.toLowerCase(), bots = recs.filter(r => !r.you && !r.quiet);
  const some = (kind, max, chance) => [...bots].sort(() => Math.random() - .5).slice(0, max).forEach(r => botSay(r, kind, chance, 1.2 + Math.random() * 2.5));
  if (/\bbots?\b/.test(t)) some('bot', 1, .8);
  else if (/^(hi+|hey+|hello|yo|sup|hola|salut|ciao|hallo|oi|привет|你好)\b/.test(t)) some('hi', 2, .6);
  else if (/\bgg\b|good game/.test(t)) some('gg', 3, .6);
  else if (/(lol|lmao|haha|xd|jaja|mdr|kkk)/.test(t)) some('lol', 1, .4);
  else if (/\b(nice|ns|nt|gj|wp|good shot|well played)\b/.test(t)) some('ty', 1, .6);
  else if (/\b(ez|noob|nub|trash|bad|camper|hacker|hacks?)\b/.test(t)) some('trash', 1, .6);
  else some('meh', 1, .25);
}

function openChat() {
  if (chatting || mode !== 'dm' || matchOver) return;
  chatting = true; for (const k in keys) keys[k] = false;
  $('chat').classList.add('open'); $('chatIn').value = ''; $('chatIn').focus();
}
function closeChat() {
  if (!chatting) return;
  chatting = false; $('chat').classList.remove('open'); $('chatIn').blur();
}
$('chatIn').addEventListener('keydown', e => {
  e.stopPropagation();
  if (e.code === 'Enter' || e.code === 'NumpadEnter') {
    e.preventDefault();
    const text = $('chatIn').value.replace(/\s+/g, ' ').trim().slice(0, 80);
    if (text) { chatSay(youRec, text); botsHear(text); sfx('ui', { v: .5 }); }
    closeChat();
  } else if (e.code === 'Escape') { e.preventDefault(); closeChat(); }
});
$('chatIn').addEventListener('keyup', e => e.stopPropagation());
document.addEventListener('pointerlockchange', () => { if (document.pointerLockElement !== renderer.domElement) closeChat(); }); // Esc unlocks the mouse first
function resetChat() { closeChat(); chatQ = []; chatGap = 0; $('chatLog').innerHTML = ''; }
