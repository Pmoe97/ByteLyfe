/* =====================================================================
 * 43-stories.js — multi-year story chains. A story opens like any random
 * event (its first chapter is registered with EV, so it rolls with the
 * year's events), then picks up a year or more later with whichever
 * chapter your choices led to.
 *
 * STORY(id, { title, ages, w, when, ctx, chapters: { start, name: Chapter, ... } })
 * Chapter = { emoji, text: string | (s, st) => string, when: (s, st) => bool,
 *             choices: [[label, fx(s, st)] | { label, sub, when, tags, fx }] | auto: fx(s, st) }
 *   st.d is the story's data (plain JSON: names, ids, amounts). A choice returns outcome
 *   text like an event choice, and calls nextChapter(s, st, 'chapter', lo, hi) to continue the
 *   story lo..hi years later. A choice that doesn't call next ends the story.
 *   A chapter whose `when` fails, or whose person (st.d.pid) has died, quietly ends it.
 * M(s).stories = { id: { ch, at, d } }   the stories you're in the middle of.
 * storyTick runs just before rollYearEvents: every chapter that's due fires.
 * ===================================================================== */

const STORIES = {};
const STORY_IDS = [];
const STORY_SEEN = new Set(); // 'id:chapter' reached this session (the verify harness reports the rest)

function STORY(id, def) {
  def.id = id;
  STORIES[id] = def;
  STORY_IDS.push(id);
  const start = def.chapters.start;
  EV('st_' + id, {
    ages: def.ages, w: def.w, once: true, emoji: start.emoji, title: def.title, ctx: def.ctx,
    when: (s) => !storyOpen(s, id) && (!def.when || def.when(s)),
    text: (s, c) => chapterText(start, s, { id, ch: 'start', d: c || {} }),
    choices: start.choices.map((raw) => {
      const o = Array.isArray(raw) ? { label: raw[0], fx: raw[1] } : raw;
      return Object.assign({}, o, {
        when: o.when ? (s, c) => o.when(s, { d: c || {} }) : undefined,
        sub: typeof o.sub === 'function' ? (s, c) => o.sub(s, { d: c || {} }) : o.sub,
        fx: (s, c) => {
          const st = { id, ch: 'start', d: Object.assign({}, c), next: null, at: 0 };
          STORY_SEEN.add(id + ':start');
          const r = o.fx(s, st);
          saveStory(s, st);
          return r;
        },
      });
    }),
  });
}
function stories(s) { return M(s).stories || (M(s).stories = {}); }
function storyOpen(s, id) { return !!(M(s).stories && M(s).stories[id]); }
function nextChapter(s, st, ch, lo, hi) { st.next = ch; st.at = s.year + randInt(lo ?? 1, hi ?? lo ?? 2); }
function chapterText(ch, s, st) { return typeof ch.text === 'function' ? ch.text(s, st) : ch.text; }
function saveStory(s, st) {
  if (st.next) { stories(s)[st.id] = { ch: st.next, at: st.at, d: st.d }; return; }
  delete stories(s)[st.id];
  if (st.ch !== 'start') tally(s, 'storiesDone');
}
function storyPerson(s, st) { const p = st.d.pid && s.people[st.d.pid]; return p && p.alive ? p : null; }

function storyTick(s) {
  if (s.dead || !M(s).stories) return;
  for (const id of Object.keys(M(s).stories)) {
    const sv = M(s).stories[id], def = STORIES[id], ch = def && def.chapters[sv.ch];
    if (!ch) { delete M(s).stories[id]; continue; }
    if (sv.at > s.year) continue;
    // Prison puts your stories on hold.
    if (inPrison(s)) { sv.at = s.year + 1; continue; }
    const st = { id, ch: sv.ch, d: sv.d, next: null, at: 0 };
    if ((sv.d.pid && !storyPerson(s, st)) || (ch.when && !ch.when(s, st))) { delete M(s).stories[id]; continue; }
    STORY_SEEN.add(id + ':' + sv.ch);
    const text = vary(chapterText(ch, s, st));
    if (ch.auto) {
      const before = snapStats(s);
      const r = ch.auto(s, st);
      const extra = typeof r === 'string' ? r : (r && r.text) || '';
      const full = vary((text + (extra ? ' ' + extra : '')).trim());
      const tone = r && r.tone ? r.tone : '';
      const deltas = diffStats(before, snapStats(s));
      log(s, `${ch.emoji ? ch.emoji + ' ' : ''}${full}`, tone, deltas);
      if (!s.dead) popup(s, { emoji: ch.emoji, title: def.title, text: full, deltas, tone, person: st.d.pid || null });
      saveStory(s, st);
    } else {
      const map = [], choices = [];
      ch.choices.forEach((raw, i) => {
        const o = Array.isArray(raw) ? { label: raw[0], fx: raw[1] } : raw;
        if (!tagsOn(o.tags) || (o.when && !o.when(s, st))) return;
        map.push(i);
        choices.push({ label: typeof o.label === 'function' ? o.label(s, st) : o.label, sub: typeof o.sub === 'function' ? o.sub(s, st) : o.sub || '', value: map.length - 1 });
      });
      if (!choices.length) { delete M(s).stories[id]; continue; }
      popup(s, { emoji: ch.emoji, title: def.title, text, handler: 'story', ctx: { id, ch: sv.ch, map }, choices, person: st.d.pid || null });
    }
    if (s.dead) return;
  }
}
onChoice('story', (s, ctx, idx) => {
  const sv = M(s).stories && M(s).stories[ctx.id], def = STORIES[ctx.id];
  if (!sv || !def || sv.ch !== ctx.ch) return;
  const raw = def.chapters[ctx.ch].choices[ctx.map[idx]];
  const o = Array.isArray(raw) ? { label: raw[0], fx: raw[1] } : raw;
  const st = { id: ctx.id, ch: ctx.ch, d: sv.d, next: null, at: 0 };
  if (!o || (sv.d.pid && !storyPerson(s, st))) { delete M(s).stories[ctx.id]; return { text: 'The moment passed.', quiet: true, nolog: true }; }
  const r = o.fx(s, st);
  saveStory(s, st);
  if (typeof r === 'string') return vary(r);
  if (r && r.text) r.text = vary(r.text);
  return r;
});

/* ---- helpers for stories ------------------------------------------------- */
function storyName(s, cc, g) { const c = cc || P(s).country, gender = g || pick(['m', 'f']); return { first: randomFirst(c, gender), last: randomLast(c), g: gender }; }
// A new person who matters to the story, near your age unless told otherwise.
function storyPersonNew(s, o) {
  const p = makePerson(s, Object.assign({ age: clamp(A(s) + randInt(-3, 3), 0, 99), country: P(s).country }, o));
  p.city = o && o.city ? o.city : COUNTRIES[p.country].cities.includes(P(s).city) ? P(s).city : pick(COUNTRIES[p.country].cities);
  assignNpcLife(s, p);
  return p;
}
const regularCareer = (s) => hasCareer(s) && !JOBS[M(s).career.id].special;

/* ---- the stories ----------------------------------------------------------- */
STORY('stray', {
  title: 'The stray', ages: [6, 70], w: 0.8, when: (s) => free(s) && !myPets(s).some((p) => p.species === 'dog'),
  chapters: {
    start: {
      emoji: '🐕', text: 'A scruffy dog with one floppy ear has been showing up at your door every evening.',
      choices: [
        ['Leave out some food', (s, st) => { st.d.name = pick(PET_NAMES); add(s, { karma: 1 }); nextChapter(s, st, 'regular', 1); return 'The dog wolfed it down and wagged its whole body at you.'; }],
        ['Shoo it away', () => 'It slunk off down the street. You think about it sometimes.'],
      ],
    },
    regular: {
      emoji: '🐕', text: (s, st) => `The scruffy dog waits on your doorstep every night now. The neighbors have started calling it ${st.d.name}.`,
      choices: [
        ['Adopt it', (s, st) => {
          if (A(s) < 18 && !parentsAgree(s)) return `Your parents said no. ${st.d.name} found a home down the street, and still wags at you every morning.`;
          const pet = giftPet(s, 'dog');
          pet.name = st.d.name;
          st.d.pet = pet.id;
          add(s, { happy: 8 });
          nextChapter(s, st, 'hero', 2, 5);
          return `${st.d.name} is officially yours. The first night, they slept across your feet.`;
        }],
        ['Take it to a shelter', (s, st) => { add(s, { karma: 2 }); return `The shelter found ${st.d.name} a family with a big backyard.`; }],
      ],
    },
    hero: {
      emoji: '🐶', when: (s, st) => !!s.pets[st.d.pet] && s.pets[st.d.pet].alive,
      text: (s, st) => `In the middle of the night, ${st.d.name} would not stop barking.`,
      choices: [
        ['Get up and check', (s, st) => { add(s, { happy: 8 }); s.pets[st.d.pet].rel = clamp100(s.pets[st.d.pet].rel + 20); return { text: `The kitchen was full of smoke. You got everyone out in time. ${st.d.name} saved your life.`, tone: 'good' }; }],
        ['Roll over and go back to sleep', (s, st) => { add(s, { happy: -2 }); return `In the morning you found muddy footprints by the back door. Whoever it was, ${st.d.name} scared them off.`; }],
      ],
    },
  },
});

STORY('penpal', {
  title: 'Pen pal', ages: [8, 13], w: 0.9, when: free,
  ctx: (s) => { const cc = pick(COUNTRY_IDS.filter((c) => c !== P(s).country)); return Object.assign({ cc }, storyName(s, cc)); },
  chapters: {
    start: {
      emoji: '✉️', text: (s, st) => `Your class is matching students with pen pals abroad. You got ${st.d.first} from ${COUNTRIES[st.d.cc].name}.`,
      choices: [
        ['Write a long first letter', (s, st) => { addSkill(s, 'writing', 2); nextChapter(s, st, 'letters', 1, 2); return `You wrote six pages about your ${pick(['pet', 'favorite cereal', 'bedroom', 'best friend'])}.`; }],
        ['Write two lines and forget about it', (s, st) => `${st.d.first} wrote back twice. You never did.`],
      ],
    },
    letters: {
      emoji: '✉️', text: (s, st) => `A thick envelope arrived from ${st.d.first}, full of photos and a pressed flower.`,
      choices: [
        ['Write back every month', (s, st) => { add(s, { smarts: 1, happy: 3 }); addSkill(s, 'writing', 2); nextChapter(s, st, 'meet', 4, 7); return `You and ${st.d.first} now know everything about each other's lives.`; }],
        ['Let it fade', (s, st) => `The letters slowed, then stopped. You still have ${st.d.first}'s photos in a shoebox.`],
      ],
    },
    meet: {
      emoji: '🤝', when: (s) => A(s) >= 15, text: (s, st) => `${st.d.first}, your pen pal from ${COUNTRIES[st.d.cc].name}, is visiting your city and wants to finally meet.`,
      choices: [
        ['Meet up', (s, st) => {
          const p = storyPersonNew(s, { first: st.d.first, last: st.d.last, gender: st.d.g, country: st.d.cc, age: A(s) });
          setRel(s, p.id, 'friend', 80);
          st.d.pid = p.id;
          add(s, { happy: 8 });
          nextChapter(s, st, 'abroad', 3, 8);
          return { text: `You recognized ${p.first} instantly. You talked until the café closed.`, person: p.id };
        }],
        ['It would be too weird', (s, st) => `You told ${st.d.first} you were sick. You weren't.`],
      ],
    },
    abroad: {
      emoji: '✈️', when: (s) => A(s) >= 18, text: (s, st) => `${s.people[st.d.pid].first} invited you to come stay in ${COUNTRIES[st.d.cc].name}.`,
      choices: [
        { label: 'Book a flight', sub: (s) => fmtMoney(price(s, 1500)), fx: (s, st) => { const c = price(s, 1500); if (!pay(s, c)) return cantAfford(c); addRel(s, st.d.pid, 15); tally(s, 'vacations'); add(s, { happy: 10 }); return `Two weeks with ${s.people[st.d.pid].first}'s family. They fed you until you could not move.`; } },
        ['Maybe someday', (s, st) => { addRel(s, st.d.pid, -5); return 'Someday is a long way off.'; }],
      ],
    },
  },
});

STORY('band', {
  title: 'The garage band', ages: [14, 19], w: 0.9, when: free,
  ctx: () => ({ band: `The ${pick(['Velvet', 'Rusty', 'Neon', 'Paper', 'Static', 'Midnight', 'Feral', 'Electric'])} ${pick(['Raccoons', 'Lunchboxes', 'Satellites', 'Ghosts', 'Thunder', 'Dentists', 'Parakeets', 'Echoes'])}`, role: pick(['drummer', 'bassist', 'singer', 'keyboard player']) }),
  chapters: {
    start: {
      emoji: '🎸', text: (s, st) => `Your friends are starting a band in someone's garage. They're calling it ${st.d.band}, and they need a ${st.d.role}.`,
      choices: [
        ['Join the band', (s, st) => { addSkill(s, 'music', 4); add(s, { happy: 4 }); nextChapter(s, st, 'gig', 1); return 'Practice is loud, the garage smells like gasoline, and you love it.'; }],
        ['Pass', () => 'They found someone else. They were terrible. You went to every show anyway.'],
      ],
    },
    gig: {
      emoji: '🎤', text: (s, st) => `${st.d.band} landed its first real gig at {a pizza place|a bowling alley|a battle of the bands|a cousin's wedding}.`,
      choices: [
        ['Play your heart out', (s, st) => {
          addSkill(s, 'music', 3);
          if (skill(s, 'music') + randInt(0, 50) >= 45) { st.d.hit = true; add(s, { happy: 8 }); nextChapter(s, st, 'label', 1, 2); return { text: 'The crowd went wild. Someone filmed it, and it got passed around school for weeks.', tone: 'good' }; }
          add(s, { happy: -3 });
          nextChapter(s, st, 'reunion', 15, 25);
          return 'You missed your cue twice. The pizza was good, though. The band broke up that summer.';
        }],
        ['Get stage fright and bail', (s) => { add(s, { happy: -4 }); return 'The band played without you. Nobody brought it up again, which was worse.'; }],
      ],
    },
    label: {
      emoji: '📝', text: (s, st) => `A small label wants to sign the ${st.d.role} of ${st.d.band}. Just you, not the rest of the band.`,
      choices: [
        ['Go solo', (s, st) => { addSkill(s, 'music', 5); add(s, { fame: 5, karma: -3 }); st.d.solo = true; nextChapter(s, st, 'reunion', 15, 25); return 'You put out an EP. Your old bandmates unfollowed you in the same hour.'; }],
        ['Stick with the band', (s, st) => { add(s, { karma: 3, happy: 2 }); nextChapter(s, st, 'reunion', 15, 25); return `The label walked. ${st.d.band} played every dive bar in the region instead.`; }],
      ],
    },
    reunion: {
      emoji: '🎸', when: (s) => A(s) >= 30, text: (s, st) => `It's been years. A promoter wants ${st.d.band} back together for one night only.`,
      choices: [
        ['Do the reunion show', (s, st) => { const pay = price(s, randInt(2, st.d.hit ? 40 : 6) * 1000); add(s, { money: pay, happy: 10, fame: st.d.hit ? 2 : 0 }); return `You still knew every chord. ${st.d.solo ? 'The band even forgave you for going solo. Mostly.' : 'The whole crowd sang the chorus.'} Your cut: ${fmtMoney(pay)}.`; }],
        ['Leave the past alone', () => 'Some songs are better as memories.'],
      ],
    },
  },
});

STORY('capsule', {
  title: 'Time capsule', ages: [8, 12], w: 1, when: free,
  chapters: {
    start: {
      emoji: '📦', text: 'You and your friends are burying a time capsule in the park, to dig up in twenty years.',
      choices: [
        ['Bury your favorite toy', (s, st) => { st.d.item = 'toy'; st.d.toy = pick(['robot', 'plush dinosaur', 'action figure', 'yo-yo', 'toy race car']); nextChapter(s, st, 'dig', 20); return `You said goodbye to your ${st.d.toy}. It was hard.`; }],
        ['Write a letter to your future self', (s, st) => { st.d.item = 'letter'; st.d.dream = pick(['an astronaut', 'a famous chef', 'a pop star', 'a veterinarian', 'rich', 'a pro athlete', 'a detective']); nextChapter(s, st, 'dig', 20); return `You asked future you if you became ${st.d.dream}.`; }],
        ['Bury a jar of coins', (s, st) => { st.d.item = 'coins'; nextChapter(s, st, 'dig', 20); return 'You emptied your piggy bank into a pickle jar.'; }],
      ],
    },
    dig: {
      emoji: '⛏️', text: 'Twenty years ago, you buried a time capsule in the park. Today you dug it up.',
      auto: (s, st) => {
        if (st.d.item === 'toy') { add(s, { happy: 6 }); return `Your old ${st.d.toy}, a little damp. You laughed until you cried.`; }
        if (st.d.item === 'letter') { add(s, { happy: 4 }); const c = M(s).career; return `Ten-year-old you asked if you became ${st.d.dream}. ${c ? `You're ${aAn(careerTitle(s).toLowerCase())}. Close enough?` : 'You are still working on it.'}`; }
        const v = price(s, randInt(40, 3000));
        add(s, { money: v, happy: 4 });
        return `A coin dealer said a few of your coins are rare now. They paid ${fmtMoney(v)}.`;
      },
    },
  },
});

STORY('feud', {
  title: 'The neighbor feud', ages: [25, 90], w: 0.8, when: (s) => free(s) && !!myHouse(s),
  ctx: (s) => storyName(s),
  chapters: {
    start: {
      emoji: '🌳', text: (s, st) => `Your new neighbor, ${st.d.first} ${st.d.last}, planted a hedge two feet onto your property.`,
      choices: [
        ['Talk it over', (s, st) => {
          if (chance(0.6 + skill(s, 'charisma') / 300)) { const p = storyPersonNew(s, { first: st.d.first, last: st.d.last, gender: st.d.g, age: clamp(A(s) + randInt(-10, 10), 25, 90) }); setRel(s, p.id, 'friend', 55); return { text: `${st.d.first} apologized and moved the hedge. You traded zucchini all summer.`, person: p.id }; }
          nextChapter(s, st, 'escalate', 1);
          return `${st.d.first} said the property line is "a matter of opinion."`;
        }],
        ['Rip the hedge out yourself', (s, st) => { add(s, { karma: -1, happy: 2 }); nextChapter(s, st, 'escalate', 1); return 'Very satisfying. Very loud. Very visible from their kitchen window.'; }],
        ['Let it go', () => 'Two feet of lawn is a small price for peace.'],
      ],
    },
    escalate: {
      emoji: '🦩', text: (s, st) => `${st.d.first} struck back: forty plastic flamingos on your lawn and a strongly worded letter.`,
      choices: [
        { label: 'Build a spite fence', sub: (s) => fmtMoney(price(s, 4000)), fx: (s, st) => { const c = price(s, 4000); if (!pay(s, c)) return cantAfford(c); add(s, { karma: -2, happy: 3 }); nextChapter(s, st, 'court', 1); return 'Twelve feet tall and painted a hideous orange. Worth every penny.'; } },
        ['Bake a peace pie', (s, st) => { add(s, { karma: 3 }); return `${st.d.first} cried a little. The flamingos are gone. You're friends now, somehow.`; }],
      ],
    },
    court: {
      emoji: '⚖️', text: (s, st) => `${st.d.first} ${st.d.last} is taking you to court over the spite fence.`,
      choices: [
        ['See them in court', (s, st) => { getSued(s, 'property', { vs: `${st.d.first} ${st.d.last}`, cap: st.d.last, their: 6 }); }],
        ['Tear down the fence and apologize', (s, st) => { add(s, { happy: -3, karma: 2 }); return `${st.d.first} dropped the case. The flamingos came back, though.`; }],
      ],
    },
  },
});

STORY('secret_sibling', {
  title: 'A family secret', ages: [25, 70], w: 0.6, when: (s) => free(s) && relPeople(s, ['parent'], { dead: true }).length > 0,
  chapters: {
    start: {
      emoji: '📜', text: 'Clearing out a closet, you found old letters your parent hid for decades. They mention a child you never knew about.',
      choices: [
        { label: 'Take a DNA test and look', sub: (s) => fmtMoney(price(s, 100)), fx: (s, st) => { const c = price(s, 100); if (!pay(s, c)) return cantAfford(c); nextChapter(s, st, 'found', 1); return 'You mailed off a tube of spit and tried not to think about it.'; } },
        ['Burn the letters', (s) => { add(s, { happy: -2 }); return 'Some doors are better left closed. You think.'; }],
      ],
    },
    found: {
      emoji: '🧬', text: 'The DNA site found a match: a half-sibling, living a few hours away.',
      choices: [
        ['Reach out', (s, st) => {
          const parent = pick(relPeople(s, ['parent'], { dead: true }));
          const p = storyPersonNew(s, { age: clamp(A(s) + randInt(-8, 8), 18, 99) });
          if (parent) { p.parents = [parent.id]; parent.children.push(p.id); }
          setRel(s, p.id, 'halfsibling', 50);
          st.d.pid = p.id;
          add(s, { happy: 5 });
          nextChapter(s, st, 'bond', 1, 3);
          return { text: `${p.first} wrote back within the hour: "I always wondered."`, person: p.id };
        }],
        ['Leave it be', () => 'You closed the app. The match is still there, waiting.'],
      ],
    },
    bond: {
      emoji: '🦃', text: (s, st) => `${s.people[st.d.pid].first}, your half-sibling, invited you to their family's holiday dinner.`,
      choices: [
        ['Go', (s, st) => { addRel(s, st.d.pid, 20); add(s, { happy: 6 }); return 'Their kids have your nose. Everyone noticed.'; }],
        ['Make an excuse', (s, st) => { addRel(s, st.d.pid, -10); return 'Maybe next year.'; }],
      ],
    },
  },
});

STORY('startup', {
  title: 'The big idea', ages: [22, 50], w: 0.8, when: free,
  ctx: (s) => { const c = someone(s, ['friend', 'bestie', 'sibling', 'coworker'], (p) => ageOf(s, p) >= 20); return c ? Object.assign(c, { app: pick(['rates sandwiches', 'finds you a parking spot', 'matches dogs for playdates', 'translates baby cries', 'splits restaurant bills to the cent', 'tells you which line at the store is fastest']) }) : null; },
  chapters: {
    start: {
      emoji: '💡', text: (s, st) => `${nm(s, st.d.pid)} is quitting their job to build an app that ${st.d.app}. They want you to invest.`,
      choices: [
        { label: 'Invest', sub: (s) => fmtMoney(price(s, 10000)), fx: (s, st) => { const c = price(s, 10000); if (!pay(s, c)) return cantAfford(c); st.d.stake = c; addRel(s, st.d.pid, 10); nextChapter(s, st, 'pivot', 1, 2); return `${nm(s, st.d.pid)} hugged you and called you their first believer.`; } },
        ['Wish them luck', (s, st) => { st.d.stake = 0; nextChapter(s, st, 'pivot', 1, 2); return 'You bought them a celebratory muffin instead.'; }],
      ],
    },
    pivot: {
      emoji: '📉', text: (s, st) => `${nm(s, st.d.pid)}'s startup is almost out of money. ${st.d.stake ? "They're asking you for more." : "They're asking everyone they know for help."}`,
      choices: [
        { label: 'Put money in', sub: (s) => fmtMoney(price(s, 25000)), fx: (s, st) => { const c = price(s, 25000); if (!pay(s, c)) return cantAfford(c); st.d.stake += c; addRel(s, st.d.pid, 10); nextChapter(s, st, 'exit', 2, 4); return 'They pivoted to selling to businesses. Everyone says that is a good sign.'; } },
        ['Say no', (s, st) => { nextChapter(s, st, 'exit', 2, 4); return `${nm(s, st.d.pid)} said they understood. They are still going.`; }],
      ],
    },
    exit: {
      emoji: '🚀', text: (s, st) => `News about ${nm(s, st.d.pid)}'s startup.`,
      auto: (s, st) => {
        if (chance(0.35)) {
          if (!st.d.stake) { add(s, { happy: -6 }); return 'A tech giant bought it for a fortune. You could have been rich. You are happy for them. Mostly.'; }
          const payout = Math.round(st.d.stake * randFloat(5, 40));
          add(s, { money: payout, happy: 15 });
          return { text: `A tech giant bought it! Your stake paid out ${fmtMoney(payout)}.`, tone: 'good' };
        }
        add(s, { happy: st.d.stake ? -6 : 0 });
        return { text: `It shut down for good.${st.d.stake ? ' Your money went with it.' : ''} ${nm(s, st.d.pid)} is already talking about the next idea.`, tone: st.d.stake ? 'bad' : '' };
      },
    },
  },
});

STORY('old_house', {
  title: 'The old house', ages: [30, 85], w: 0.6, when: free,
  chapters: {
    start: {
      emoji: '🏚️', text: 'A lawyer wrote to say that a great-aunt you never met left you her crumbling farmhouse in the countryside.',
      choices: [
        ['Keep it and go see it', (s, st) => { nextChapter(s, st, 'fixer', 1); return 'You booked a visit for the spring.'; }],
        ['Sell it sight unseen', (s) => { const v = price(s, randInt(40, 120) * 1000); add(s, { money: v }); return `A developer paid ${fmtMoney(v)}. You never saw the place.`; }],
      ],
    },
    fixer: {
      emoji: '🏚️', text: "The farmhouse's roof leaks, the pipes groan, and something lives in the attic.",
      choices: [
        { label: 'Renovate it', sub: (s) => fmtMoney(price(s, 60000)), fx: (s, st) => { const c = price(s, 60000); if (!pay(s, c)) return cantAfford(c); nextChapter(s, st, 'done', 2, 4); return 'You hired a crew. They found a 1950s newspaper inside a wall.'; } },
        ['Sell it as it is', (s) => { const v = price(s, randInt(50, 90) * 1000); add(s, { money: v }); return `You sold it for ${fmtMoney(v)} to a couple with big dreams.`; }],
        { label: 'Investigate the attic', tags: ['chaos'], fx: (s, st) => { add(s, { happy: 5 }); st.d.ghost = true; nextChapter(s, st, 'done', 2, 4); return 'It was a ghost. A polite one. She says you can stay if you keep the radio tuned to jazz.'; } },
      ],
    },
    done: {
      emoji: '🏡', text: (s, st) => `Your great-aunt's farmhouse is finished${st.d.ghost ? ', and the ghost approves of the curtains' : ''}. The whole village came to look.`,
      choices: [
        ['Keep it', (s, st) => {
          const value = price(s, randInt(250, 450) * 1000);
          M(s).assets.push({ id: uid(s, 'a'), kind: 'house', type: 'farmhouse', emoji: '🌾', name: 'Restored Farmhouse', cond: 95, beds: randInt(3, 5), built: s.year - randInt(80, 140), value, paid: 0, since: s.year });
          tally(s, 'housesBought');
          add(s, { happy: 8 });
          return 'It is yours now: a restored farmhouse with a view of the hills.';
        }],
        ['Sell it', (s) => { const v = price(s, randInt(250, 600) * 1000); add(s, { money: v, happy: 4 }); return `A city family paid ${fmtMoney(v)}, more than you ever imagined.`; }],
      ],
    },
  },
});

STORY('old_flame', {
  title: 'The one that got away', ages: [30, 65], w: 0.7, when: free,
  ctx: (s) => storyName(s, null, dateGenderFor(P(s))),
  chapters: {
    start: {
      emoji: '🛒', text: (s, st) => `You ran into ${st.d.first} ${st.d.last}, your old high school sweetheart, in the cereal aisle.`,
      choices: [
        ['Grab a coffee', (s, st) => {
          const p = storyPersonNew(s, { first: st.d.first, last: st.d.last, gender: st.d.g, age: A(s) + randInt(-1, 1) });
          setRel(s, p.id, 'ex', 55);
          st.d.pid = p.id;
          add(s, { happy: 4 });
          nextChapter(s, st, 'texts', 1);
          return { text: `Two hours flew by. ${p.first} still laughs the same way.`, person: p.id };
        }],
        ['Wave and keep walking', () => 'You made it to the checkout with your heart pounding.'],
      ],
    },
    texts: {
      emoji: '💬', text: (s, st) => `${s.people[st.d.pid].first} keeps texting. They say they never stopped thinking about you.`,
      choices: [
        { label: 'Give it another shot', when: (s, st) => !hasRomance(s) && !s.people[st.d.pid].partner, fx: (s, st) => startRomance(s, st.d.pid) },
        { label: 'Meet them in secret', when: (s, st) => hasRomance(s) && !s.people[st.d.pid].partner, fx: (s, st) => startRomance(s, st.d.pid) },
        ['Keep it friendly', (s, st) => { setRel(s, st.d.pid, 'friend', 60); return `You and ${s.people[st.d.pid].first} are friends now. Just friends.`; }],
        ['Block their number', (s, st) => { addRel(s, st.d.pid, -30); return 'Some chapters are closed for a reason.'; }],
      ],
    },
  },
});

STORY('marathon', {
  title: 'The marathon', ages: [20, 65], w: 0.9, when: free,
  chapters: {
    start: {
      emoji: '🏃', text: 'A friend talked you into signing up for a marathon. It is ten months away.',
      choices: [
        ['Train every single day', (s, st) => { st.d.train = 2; addSkill(s, 'fitness', 6); add(s, { health: 2 }); nextChapter(s, st, 'race', 1); return 'You bought very expensive shoes and a very tight shirt.'; }],
        ['Train on weekends', (s, st) => { st.d.train = 1; addSkill(s, 'fitness', 3); nextChapter(s, st, 'race', 1); return 'Long runs on Sundays. Pancakes after.'; }],
        ['Wing it', (s, st) => { st.d.train = 0; nextChapter(s, st, 'race', 1); return 'How hard can 26 miles be?'; }],
      ],
    },
    race: {
      emoji: '🏁', text: 'Race day. Twenty thousand runners and a guy dressed as a banana.',
      choices: [
        ['Go out fast', (s, st) => raceDay(s, st, -10)],
        ['Pace yourself', (s, st) => raceDay(s, st, 10)],
      ],
    },
  },
});
function raceDay(s, st, mod) {
  const score = skill(s, 'fitness') + st.d.train * 15 + P(s).stats.health / 4 - Math.max(0, A(s) - 45) + mod + randInt(-20, 20);
  if (score >= 55) { add(s, { happy: 12, health: 2 }); tally(s, 'marathons'); return { text: `You crossed the finish line in ${randInt(3, 5)} hours and ${randInt(1, 59)} minutes. Strangers cheered. You cried.`, tone: 'good' }; }
  if (chance(0.3)) { getSick(s, 'broken_leg'); return { text: 'You hit the wall at mile 18 and fell badly. The medics were very kind.', tone: 'bad' }; }
  add(s, { happy: -4 });
  return 'You hit the wall at mile 18 and walked the rest. The banana beat you.';
}

STORY('office_pool', {
  title: 'The office pool', ages: [20, 70], w: 0.8, when: regularCareer,
  chapters: {
    start: {
      emoji: '🎟️', text: 'Your coworkers run a weekly lottery pool. Want in?',
      choices: [
        { label: 'Chip in every week', sub: (s) => `${fmtMoney(price(s, 250))}/yr`, fx: (s, st) => { const c = price(s, 250); if (!pay(s, c)) return cantAfford(c); st.d.in = true; nextChapter(s, st, 'draw', 1, 3); return 'You picked your birthday as the lucky numbers.'; } },
        ['No thanks', (s, st) => { st.d.in = false; nextChapter(s, st, 'draw', 1, 3); return 'You told them the lottery is a tax on hope.'; }],
      ],
    },
    draw: {
      emoji: '🎰', when: regularCareer, text: 'The office lottery pool hit!',
      auto: (s, st) => {
        const big = chance(0.3);
        if (!st.d.in) { add(s, { happy: big ? -12 : -2 }); return big ? { text: 'Every single person in the pool quit the next morning. You are now the whole department.', tone: 'bad' } : 'They each won enough for a nice dinner. They did not invite you.'; }
        const share = price(s, big ? randInt(80, 600) * 1000 : randInt(100, 900));
        add(s, { money: share, happy: big ? 15 : 3 });
        return { text: big ? `It was the jackpot. Your share: ${fmtMoney(share)}.` : `It was a small prize. Your share: ${fmtMoney(share)}.`, tone: 'good' };
      },
    },
  },
});

STORY('whistleblower', {
  title: 'The cover-up', ages: [22, 70], w: 0.7, when: (s) => regularCareer(s) && M(s).career.level >= 1,
  ctx: () => ({ what: pick(['dumping waste in the river', 'faking safety tests', 'cooking the books', 'selling customer data', 'hiding a product defect']) }),
  chapters: {
    start: {
      emoji: '📂', text: (s, st) => `You found files proving your company has been ${st.d.what}.`,
      choices: [
        ['Report it to the regulators', (s, st) => { add(s, { karma: 5 }); nextChapter(s, st, 'fallout', 1); return 'You sent everything to the regulators. Your hands were shaking.'; }],
        ['Pretend you never saw it', (s, st) => { add(s, { karma: -5 }); nextChapter(s, st, 'scandal', 2, 4); return 'You deleted the files from your downloads folder. Twice.'; }],
      ],
    },
    fallout: {
      emoji: '🕵️', when: regularCareer, text: 'Your company figured out who blew the whistle.',
      choices: [
        ['Stand your ground', (s, st) => { if (chance(0.5)) fire(s, 'You were fired for "performance issues" the week after the investigation began.'); nextChapter(s, st, 'award', 1, 2); return 'You kept your head high in every meeting.'; }],
        ['Go to the press', (s, st) => { add(s, { fame: 6 }); nextChapter(s, st, 'award', 1, 2); return 'Your interview led the evening news.'; }],
      ],
    },
    award: {
      emoji: '🏅', text: (s, st) => `Regulators fined your old company millions for ${st.d.what}.`,
      auto: (s) => { const amt = price(s, randInt(50, 500) * 1000); add(s, { money: amt, karma: 5, happy: 10 }); return { text: `As the whistleblower, you received an award of ${fmtMoney(amt)}.`, tone: 'good' }; },
    },
    scandal: {
      emoji: '📰', text: (s, st) => `The truth came out anyway: your company was ${st.d.what}. Investigators want to know what you knew.`,
      choices: [
        ['Tell them everything', (s) => { add(s, { karma: 3 }); return 'They thanked you for your cooperation. You sleep a little better.'; }],
        ['Say you knew nothing', (s) => { if (chance(0.3)) return arrest(s, 'scam'); add(s, { karma: -3 }); return 'They believed you. For now.'; }],
      ],
    },
  },
});

STORY('recipe', {
  title: 'The family recipe', ages: [10, 60], w: 0.8, when: free,
  ctx: (s) => { const c = someone(s, ['grandparent', 'parent'], (p) => ageOf(s, p) >= 55); return c ? Object.assign(c, { dish: pick(['dumplings', 'stew', 'apple pie', 'curry', 'tamales', 'lasagna', 'jollof rice']) }) : null; },
  chapters: {
    start: {
      emoji: '🥘', text: (s, st) => `${nm(s, st.d.pid)} pressed a stained index card into your hand: the family's secret ${st.d.dish} recipe.`,
      choices: [
        ['Promise to keep it secret', (s, st) => { addRel(s, st.d.pid, 10); addSkill(s, 'cooking', 3); delete st.d.pid; nextChapter(s, st, 'contest', 2, 6); return 'You practiced it until the kitchen smelled exactly right.'; }],
        ['Post it online', (s, st) => { addRel(s, st.d.pid, -15); add(s, { karma: -1 }); return 'It got 40,000 likes. Your family did not speak to you for a month.'; }],
      ],
    },
    contest: {
      emoji: '🏆', when: (s) => A(s) >= 16 && free(s), text: (s, st) => 'A city cooking contest is looking for entries.',
      choices: [
        ['Enter with the family recipe', (s, st) => {
          addSkill(s, 'cooking', 2);
          if (skill(s, 'cooking') + randInt(0, 60) >= 55) { const w = price(s, 2500); add(s, { money: w, happy: 10, fame: 1 }); return { text: `Your ${st.d.dish} won first prize and ${fmtMoney(w)}. The judges asked for seconds.`, tone: 'good' }; }
          add(s, { happy: -2 });
          return `Your ${st.d.dish} came in fourth. The judges said it "needed salt." It did not need salt.`;
        }],
        ['Keep it in the family', () => 'Some things are not for strangers.'],
      ],
    },
  },
});

STORY('road_trip', {
  title: 'One last road trip', ages: [60, 95], w: 1, when: free,
  ctx: (s) => someone(s, ['friend', 'bestie', 'sibling', 'spouse', 'partner'], (p) => ageOf(s, p) >= 50),
  chapters: {
    start: {
      emoji: '🗺️', text: (s, st) => `${nm(s, st.d.pid)} wants to drive across the country together, like you always said you would.`,
      choices: [
        ['Start planning', (s, st) => { addRel(s, st.d.pid, 8); nextChapter(s, st, 'trip', 1); return 'You bought a paper map. You are not going to use it.'; }],
        ['Maybe next year', () => 'Next year has a way of turning into the year after.'],
      ],
    },
    trip: {
      emoji: '🚙', text: (s, st) => `The road trip with ${nm(s, st.d.pid)} is finally happening.`,
      choices: [
        ['Take the scenic route', (s, st) => { addRel(s, st.d.pid, 20); add(s, { happy: 12 }); tally(s, 'vacations'); return 'Three thousand miles of mountains, diners and terrible car singing.'; }],
        ['Stop at every roadside attraction', (s, st) => { addRel(s, st.d.pid, 20); add(s, { happy: 14 }); tally(s, 'vacations'); return `You saw the world's largest ball of twine, a dinosaur made of hubcaps, and ${nm(s, st.d.pid)} cry at a waterfall.`; }],
      ],
    },
  },
});

STORY('storage_auction', {
  title: 'The storage unit', ages: [20, 80], w: 0.7, when: free,
  chapters: {
    start: {
      emoji: '📦', text: 'An abandoned storage unit is going up for auction. Through the door, you can see a dusty tarp over something big.',
      choices: [
        { label: 'Bid on it', sub: (s) => fmtMoney(price(s, 800)), fx: (s, st) => { const c = price(s, 800); if (!pay(s, c)) return cantAfford(c); st.d.paid = c; nextChapter(s, st, 'open', 1); return 'You won the auction. Opening it is a whole-day job.'; } },
        ['Watch someone else win it', () => 'They found a jet ski. You will never stop thinking about it.'],
      ],
    },
    open: {
      emoji: '🔦', text: 'You finally pulled the tarp off the big thing in your storage unit.',
      auto: (s, st) => {
        const r = rand();
        if (r < 0.15) { const v = price(s, randInt(15, 120) * 1000); add(s, { money: v, happy: 12 }); return { text: `A ${pick(['vintage motorcycle', 'grand piano', 'pinball machine collection', 'crate of rare comic books'])}! A collector paid ${fmtMoney(v)}.`, tone: 'good' }; }
        if (r < 0.55) { const v = price(s, randInt(300, 2500)); add(s, { money: v }); return `Old furniture and a box of records. You sold it all for ${fmtMoney(v)}.`; }
        add(s, { happy: -3 });
        return 'Forty boxes of tax returns from 1987, and a mannequin that stares.';
      },
    },
  },
});

STORY('apprentice', {
  title: 'The apprentice', ages: [16, 40], w: 0.6, when: free,
  ctx: (s) => Object.assign({ craft: pick(['woodworking', 'clockmaking', 'violin making', 'bookbinding', 'glassblowing']) }, storyName(s)),
  chapters: {
    start: {
      emoji: '🔨', text: (s, st) => `${st.d.first} ${st.d.last}, an old master of ${st.d.craft}, offers to take you on as an apprentice.`,
      choices: [
        ['Accept', (s, st) => { addSkill(s, 'art', 4); add(s, { happy: 3 }); nextChapter(s, st, 'test', 2, 3); return 'Your first job was sweeping the workshop. For a month.'; }],
        ['You have other plans', (s, st) => `${st.d.first} nodded slowly. "The door stays open," they said.`],
      ],
    },
    test: {
      emoji: '🔧', text: (s, st) => `${st.d.first} says it is time for your first real piece, made entirely on your own.`,
      choices: [
        ['Take your time and get it perfect', (s, st) => { addSkill(s, 'art', 5); if (skill(s, 'art') + randInt(0, 50) > 50) { st.d.good = true; nextChapter(s, st, 'legacy', 3, 8); return { text: `${st.d.first} turned it over in their hands for a long time, then said "good." It is the best word you have ever heard.`, tone: 'good' }; } nextChapter(s, st, 'legacy', 3, 8); return `${st.d.first} pointed out nine flaws. Then made you start over.`; }],
        ['Rush it to impress them', (s, st) => { addSkill(s, 'art', 2); return `It fell apart in ${st.d.first}'s hands. You were not invited back.`; }],
      ],
    },
    legacy: {
      emoji: '🏚️', text: (s, st) => `${st.d.first} is retiring, and wants to leave you the workshop and all the tools.`,
      choices: [
        ['Carry on the craft', (s, st) => { addSkill(s, 'art', 5); const v = price(s, randInt(5, 30) * 1000); add(s, { money: v, happy: 10 }); return `Your first commission paid ${fmtMoney(v)}. ${st.d.first} came to see it, and cried a little.`; }],
        ['Sell the tools to a museum', (s) => { const v = price(s, randInt(10, 40) * 1000); add(s, { money: v }); return `The museum paid ${fmtMoney(v)}. The workshop is a coffee shop now.`; }],
      ],
    },
  },
});
