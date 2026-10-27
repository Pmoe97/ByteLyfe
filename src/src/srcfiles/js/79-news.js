/* =====================================================================
 * 79-news.js — the paper. The world writes things down, and some of what it
 * writes is about you. A missing person, a series with a nickname, a
 * detective who "declined to elaborate", an arrest, a ransom note, the
 * council meeting nobody went to. Read it from the Case files menu.
 *
 * s.news = [{ y, kind, head, body, you }]   newest last, 80 at most
 *   kind   what it is (missing, attempt, search, hint1-3, nickname, found, body, arrest, ransom, reno, filler...)
 *   you    true when it is about something you did, or that happened to somebody you know
 *
 * newsPost(s, kind, vars) writes one from a template (NEWS_T). newsYear runs once a year (after invTick):
 * it follows every open case against you and writes what a reporter would, in three steps of "the police are
 * getting closer" (and a hint in your own life as it does: a gray sedan, a detective's card), then a little
 * ordinary news so the paper is not only about you. Nothing in it is graphic.
 * ===================================================================== */

const NEWS_MAX = 80;
// Templates: {{name}} {{full}} {{age}} {{city}} {{det}} {{nick}} {{verb}} {{n}} {{street}} {{how}}. Each kind has a few, so the paper does not repeat itself.
const NEWS_T = {
  missing: [
    ['{{full}}, {{age}}, missing in {{city}}', 'Police are asking anyone who saw {{name}} in the last days to come forward. {{ties}} "Please, just come home," a relative told reporters.'],
    ['VANISHED: {{full}} disappears without a trace', 'No note, no call, no sign. "Something is very wrong," said a neighbor. {{ties}}'],
    ['Volunteers comb {{city}} for missing {{name}}', 'Dozens gathered at dawn with flashlights and printed flyers. {{ties}}'],
  ],
  attempt: [
    ['Attempted abduction in {{city}}: suspect sought', '{{full}} told police a stranger tried to take {{name}} off the street, and got away. Officers are asking for witnesses and for any camera footage from the area.'],
    ['Police hunt would-be kidnapper after near miss', '"I got out, and I do not know how," {{name}} said. A description has been circulated.'],
  ],
  search: [
    ['Search for {{name}} goes on', 'It has been {{n}} since {{full}} disappeared. The family is holding a vigil on the weekend, and says it will not stop looking. Police say the case remains open.'],
    ['A year on, {{city}} still asks: where is {{name}}?', '"Every day," said a relative. "Every single day." Detectives say new information is welcome, and that no detail is too small.'],
  ],
  hint1: [
    ['Detectives canvass {{city}} in {{verb}} case', 'Lead detective {{det}} said investigators are "following several lines of inquiry" and declined to elaborate. A neighbor said officers had been through the street twice this week.'],
    ['Police "making progress" in {{verb}} investigation', '"We have a team on it, and we have a plan," {{det}} told reporters. Asked whether the department believes the incident is connected to others, {{det}} said only: "It is a possibility."'],
  ],
  hint2: [
    ['Police name a "person of interest" in {{verb}} case', '"We have a clearer picture of who we are looking for," {{det}} said. The person is believed to live locally and to be "organized." Investigators have asked residents to look back over the last year for anything unusual.'],
    ['Detective: "We know more than we are saying"', 'Investigators in the {{verb}} case have been seen at several addresses this month. {{det}} would not say whose.'],
  ],
  hint3: [
    ['Sources: arrest "days, not weeks" away in {{verb}} case', 'People close to the investigation say detectives have "what they need," and are waiting on a final piece. {{det}} declined to comment.'],
    ['Net closing in on suspect, say police sources', 'A senior officer, speaking on background, said the department "is very confident." {{det}} said only that the community would be "informed at the appropriate time."'],
  ],
  nickname: [
    ['The press has a name for them: "{{nick}}"', 'A string of linked cases has been tied together by detectives, and the city has started talking. "People are locking their doors," said a shopkeeper. {{det}} urged calm.'],
    ['"{{nick}}": police link a series, urge vigilance', 'Investigators believe the same person is responsible for several incidents. They are asking residents to report anything that seems "out of place."'],
  ],
  found: [
    ['{{full}} found alive', '{{name}} is in hospital, and "expected to recover," a spokesperson said. Police are seeking a suspect and have a detailed account to work from. {{how}}'],
    ['Missing {{name}} is home', 'After {{n}} away, {{full}} has been reunited with family. "Nothing else matters tonight," a relative said. Investigators say they have "a great deal to follow up."'],
  ],
  body: [
    ['Police confirm death of missing {{name}}', 'Detectives have confirmed that {{full}} has died, and are treating the case as a homicide. "Our thoughts are with the family," said a spokesperson.'],
    ['Investigators: missing {{name}} did not survive', 'The family has been told. A vigil will be held on the steps of city hall. Detectives say the investigation has "entered a new phase."'],
  ],
  arrest: [
    ['{{who}} charged in {{verb}} case', 'Police announced the arrest at a short press conference on {{day}}. "Justice is a long road, and tonight we took a step on it," said {{det}}.'],
    ['Arrest in {{verb}} investigation', 'A local resident has been taken into custody. Neighbors described them as "ordinary," a word that came up a great many times.'],
  ],
  reno: [
    ['Neighbors puzzled by construction on {{street}}', 'A reinforced addition to a private home has drawn comment, and one anonymous call to a tip line. The owner said it was "a storage project." The city says it is within the rules.'],
  ],
  ransom: [
    ['Ransom note stuns {{city}}: {{full}} "taken"', 'A note delivered to a family friend demands payment for the release of {{full}}. Police are urging calm and asking anyone with information to come forward.'],
    ['Strange demand arrives at {{city}} home', 'A ransom note for {{full}} has police and neighbors baffled. "I have never seen anything like it," said an officer. "I am not sure anyone has."'],
  ],
  ransom_end: [
    ['{{full}} safe, police say', 'The ransom case in {{city}} has come to an end. {{how}}'],
    ['Ransom case: "It was not what it looked like"', '{{how}}'],
  ],
};
const NEWS_FILLER = [
  ['Council debates new bike lanes', 'Residents on both sides packed the hall. Nobody changed their mind.'],
  ['Local bakery wins regional award', '"It is just bread," said the owner, in tears.'],
  ['Pothole on {{street}} now officially "a feature"', 'City crews say it is on the list. It has been on the list since spring.'],
  ['Heat advisory issued for the week', 'Officials urge residents to check on elderly neighbors and to drink water.'],
  ['Library reports record turnout for summer program', 'The reading challenge ended with a ceremony and a very large cake.'],
  ['High school team wins the district title', 'The coach called it "a team effort." The team called it "a miracle."'],
  ['Farmers market adds a second day', 'Vendors say the crowds are bigger than they were last year, and so are the prices.'],
  ['Rail line delayed again', 'Commuters were promised "a few weeks." They have heard that before.'],
  ['New cafe opens, immediately has a line', 'Reviews so far: "fine," "overpriced," "I will be back."'],
  ['Mayor cuts ribbon on small park', 'It has two benches and a very new tree. Photographs were taken.'],
  ['Storm knocks out power to hundreds', 'Crews restored service by morning. Residents were seen cheerfully eating the contents of their freezers.'],
  ['City museum announces new exhibit', 'It is about hats. Early word is that it is surprisingly good.'],
];

function newsOf(s) { return s.news || (s.news = []); }
function newsFill(str, v) { return String(str).replace(/\{\{(\w+)\}\}/g, (x, k) => (v[k] === undefined ? '' : v[k])); }
function newsPost(s, kind, v, you) {
  if (A(s) < 6 && kind !== 'filler') return;
  const T = kind === 'filler' ? NEWS_FILLER : NEWS_T[kind];
  if (!T || !T.length) return;
  v = Object.assign({ city: P(s).city, street: pick(['Maple Street', 'Harbor Road', 'Fifth Avenue', 'Elm Court', 'the old mill road']), n: 'a year', det: 'the lead detective', day: 'Tuesday' }, v || {});
  if (v.ties === undefined && v.name) v.ties = '';
  if (typeof v.ties === 'number') v.ties = v.ties <= 1 ? `${v.name} had few close contacts, which is making the search harder.` : v.ties >= 4 ? `${v.name} is well known locally, and a community search has begun.` : `${v.name} had a small circle of friends and family.`;
  const t = pick(T), list = newsOf(s);
  const a = { y: s.year, kind, head: newsFill(t[0], v), body: newsFill(t[1], v), you: kind !== 'filler' && you !== false };
  list.push(a);
  if (list.length > NEWS_MAX) list.splice(0, list.length - NEWS_MAX);
  if (a.you && ['missing', 'nickname', 'found', 'body', 'arrest', 'attempt', 'ransom'].includes(kind)) log(s, `📰 ${a.head}`, ['body', 'arrest'].includes(kind) ? 'bad' : '');
  return a;
}
// The yearly paper: what a reporter would write about every case against you, and a little ordinary news.
function newsYear(s) {
  if (s.dead || A(s) < 6) return;
  const list = newsOf(s);
  for (const c of typeof invMine === 'function' ? invMine(s, (x) => x.status === 'open') : []) {
    const d = typeof invDet === 'function' ? invDet(s, c) : null, v = { det: d ? 'Detective ' + d.last : 'the lead detective', verb: invVerb(c), name: c.vname ? c.vname.split(' ')[0] : 'the victim', full: c.vname || 'the victim', city: c.city || P(s).city };
    if (c.prog >= 70 && !c.news3) { c.news3 = true; newsPost(s, 'hint3', v); log(s, '🕵️ A detective’s card was left in your door. It just says "Call me."', 'bad'); }
    else if (c.prog >= 40 && !c.news2) { c.news2 = true; newsPost(s, 'hint2', v); log(s, '🕵️ A gray sedan has been parked across from your house three evenings this week.', 'bad'); }
    else if (c.prog >= 15 && !c.news1) { c.news1 = true; newsPost(s, 'hint1', v); }
    if (c.nick && !c.newsNick) { c.newsNick = true; newsPost(s, 'nickname', Object.assign({ nick: c.nick }, v)); }
    if (c.crime === 'kidnapping' && c.victim && s.year - c.year >= 1 && knCap(s) && knCap(s).pid === c.victim) newsPost(s, 'search', Object.assign({ n: nOf(s.year - c.year, 'year') }, v));
  }
  // The ordinary news, which is most of it.
  const n = list.filter((a) => a.kind === 'filler' && a.y === s.year).length;
  for (let i = n; i < 2; i++) newsPost(s, 'filler', {}, false);
  if (typeof webUneaseHere === 'function' && webUneaseHere(s) >= 4 && chance(0.5)) {
    const a = { y: s.year, kind: 'filler', head: `Residents of ${P(s).city} uneasy after a hard year`, body: 'Neighbors say they are locking their doors more than they used to. Police say crime is "within normal ranges," and that people are welcome to feel what they feel.', you: false };
    list.push(a);
  }
  if (list.length > NEWS_MAX) list.splice(0, list.length - NEWS_MAX);
}
// A conviction makes the paper.
onWebFact('arrested', (s, d) => {
  const c = CRIMES[d.crime];
  if (!c || !c.felony) return;
  const cs = invMine(s, (x) => x.crime === d.crime)[0], det = cs && invDet(s, cs);
  newsPost(s, 'arrest', { who: fullName(P(s)), verb: c.verb, det: det ? 'Detective ' + det.last : 'the lead detective' });
});
