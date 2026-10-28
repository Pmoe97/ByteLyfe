/* =====================================================================
 * 89-world-events-4.js — personal events for the local moments of 09-data-history-6.js (see 89-world-events.js for the
 * rules): the Games in your city, and the morning after a disaster. Plus two achievements.
 * ===================================================================== */

/* ---- the Games ------------------------------------------------------------------------------------------------------------------ */
const wdGamesNow = (s) => worldActive(s).find((a) => a.ev.games === s.year);
EV('wd_games', {
  ages: [12, 100], sure: true, cooldown: 1, emoji: '🏅',
  // (the flag is the year it came, so the check when you choose still passes: 23-events.js asks `when` again)
  when: (s) => { const a = wdGamesNow(s); return !!a && (!flag(s, 'games_' + a.id) || flag(s, 'games_' + a.id) === s.year); },
  ctx: (s) => { const a = wdGamesNow(s); if (!a) return null; flag(s, 'games_' + a.id, s.year); return { id: a.id }; },
  text: (s, c) => (HIST[c.id].empty
    ? `The Games open this summer in ${P(s).city}, and the stands will be empty. The whole world will watch on television, and the city is quiet.`
    : `The Games open this ${HIST[c.id].emoji === '⛷️' ? 'winter' : 'summer'} in ${P(s).city}. The streets are full of flags and visitors, and everyone you know has a plan.`),
  choices: [
    { label: 'Volunteer at the Games', when: (s) => A(s) >= 14, fx: (s) => {
      add(s, { karma: 2, happy: 3 });
      if (chance(0.3)) {
        const d = makeDateCandidate(s, { country: P(s).country });
        const p = makePerson(s, { first: d.first, last: d.last, gender: d.gender, age: d.age, country: d.country, looks: d.looks, smarts: d.smarts, job: d.job, edu: d.edu });
        setRel(s, p.id, 'friend', 60);
        return { text: `You gave directions in six languages and carried a great many boxes. You also met ${p.first}, who was doing the same thing, and you have kept in touch.`, tone: 'good', person: p.id };
      }
      return 'You gave directions in a bright jacket for two weeks, carried a great many boxes, and watched a final from the back row. You were too tired to cheer, and you cheered anyway.';
    } },
    { label: 'Buy tickets', sub: (s) => fmtMoney(price(s, 250)), when: (s, c) => !HIST[c.id].empty, fx: (s) => {
      const cost = price(s, 250);
      if (!pay(s, cost)) return cantAfford(cost);
      add(s, { happy: 5 });
      return { text: 'You sat in the sun among sixty thousand people and watched a race that was over before you had finished your drink. You will describe it for years.', tone: 'good' };
    } },
    { label: 'Rent your place to visitors', when: (s, c) => !HIST[c.id].empty && ['own', 'rent'].includes(M(s).housing.type), fx: (s) => {
      const v = price(s, M(s).housing.type === 'own' ? 2500 : 1200);
      if (M(s).housing.type === 'rent' && chance(0.3)) { M(s).money -= Math.min(price(s, 300), Math.max(0, M(s).money)); add(s, { happy: -2 }); return { text: 'Your landlord found out about the visitors, and charged you a fee for it. You came out ahead, though not by much.', tone: 'bad' }; }
      add(s, { money: v, happy: -1 });
      return `You slept on a friend’s couch for two weeks, and a family from abroad slept in your bed. They left a thank-you note and ${fmtMoney(v)}.`;
    } },
    ['Watch it on television', (s) => { add(s, { happy: 1 }); return 'You kept the streets at a distance and watched from the couch. The coverage was excellent, and so was the quiet.'; }],
  ],
});

/* ---- the morning after a disaster ------------------------------------------------------------------------------------------------ */
const wdDisaster = (s) => worldActive(s).find((a) => a.ev.kind === 'disaster' && a.ev.blast && a.i <= 1 && a.k >= 0.2 && (!flag(s, 'aft_' + a.id) || flag(s, 'aft_' + a.id) === s.year));
const wdDamaged = (s) => M(s).assets.find((q) => q.kind === 'house' && (q.city || P(s).city) === P(s).city && (q.cond ?? 100) < 85);
EV('wd_aftermath', {
  ages: [14, 100], sure: true, cooldown: 1, emoji: '🧱',
  when: (s) => !!wdDisaster(s) && free(s),
  ctx: (s) => { const a = wdDisaster(s); if (!a) return null; flag(s, 'aft_' + a.id, s.year); return { id: a.id }; },
  text: (s, c) => `${cap(HIST[c.id].cause)} has passed. ${P(s).city} is picking itself up, and everyone you know has something that needs doing.`,
  choices: [
    ['Help your neighbors dig out', (s) => { add(s, { karma: 3, happy: 1, health: -1 }); relAll(s, K_FRIENDS, 4); return 'You spent the week with a shovel and a wheelbarrow, on other people’s property as much as on your own. Nobody forgot it.'; }],
    { label: 'Repair your home', sub: (s) => fmtMoney(price(s, 5000)), when: (s) => !!wdDamaged(s), fx: (s) => {
      const cost = price(s, 5000);
      if (!pay(s, cost)) return cantAfford(cost);
      const h = wdDamaged(s); h.cond = 95; h.value = Math.round((h.value || 0) * 1.08);
      return `The builders were booked for months, and then two of them came and did it in a week. It cost ${fmtMoney(cost)}, and it looks better than before.`;
    } },
    { label: 'Find somewhere new to live', when: (s) => M(s).housing.type === 'homeless', fx: (s) => { openRentals(s, `You are looking for a place to live in ${P(s).city}, along with half the city.`); return { text: 'You started on the notices on the lamp posts. There is not much, and everyone is looking at it.', quiet: true }; } },
    { label: 'Give to the relief fund', sub: (s) => fmtMoney(price(s, 150)), fx: (s) => { const c = price(s, 150); if (!pay(s, c)) return cantAfford(c); add(s, { karma: 2, happy: 1 }); return 'You put it in an envelope, and walked it to the church hall yourself. It was a small amount, and so were most of the others.'; } },
    { label: 'Leave the city', sub: 'A fresh start somewhere else', fx: (s) => {
      const cc = P(s).country, to = pick(COUNTRIES[cc].cities.filter((x) => x !== P(s).city));
      const dep = wdResettle(s, cc, to, `You arrived in ${to} with what you could carry. Find a place to live.`);
      add(s, { happy: -2 });
      return `You loaded what was left into a borrowed truck and drove to ${to}. It took a while to stop looking back. ${dep}`.trim();
    } },
  ],
});

/* ---- living through them ------------------------------------------------------------------------------------------------------------ */
ACHIEVEMENTS.push(
  { id: 'wd_host_city', name: 'Hometown Games', emoji: '🏅', desc: 'Live in a city while it hosts the Olympic Games.', check: (s) => (M(s).worldLived || []).some((id) => HIST[id] && HIST[id].games) },
  { id: 'wd_weathered', name: 'Weathered It', emoji: '🧱', desc: 'Live through a disaster in your own city.', check: (s) => (M(s).worldLived || []).some((id) => HIST[id] && HIST[id].kind === 'disaster' && HIST[id].blast && HIST[id].cities) },
);
