/* =====================================================================
 * 25-ageup.js — one year passes. The order of the phases matters:
 * the body ages first, then school, work, money, the people around you,
 * random events, new illnesses, and finally the death check.
 * ===================================================================== */

// businessTick (34-business.js), royalTick (38-royalty.js), uwTick (39-underworld.js),
// showbizTick (40-fame.js) and sportsTick (41-sports.js) live in later files, so they're
// called through wrappers. royalTick follows npcTick so a monarch who died this year is
// succeeded the same year.
const AGE_PHASES = [
  bodyTick, pregnancyTick, schoolTick, careerTick, (s) => businessTick(s), prisonTick, financeTick,
  assetTick, fameTick, npcTick, (s) => royalTick(s), (s) => uwTick(s), (s) => showbizTick(s), (s) => sportsTick(s), petTick, milestoneTick, rollYearEvents, diseaseTick, deathCheck,
];

function ageUp(s) {
  if (s.dead || s.pending.length) return false;
  pushRewind(s);
  gcPeople(s);
  s.year++;
  const m = M(s);
  m.lastCounters = m.counters;
  m.counters = {};
  startYearLog(s);
  for (const phase of AGE_PHASES) {
    phase(s);
    if (s.dead) break;
  }
  afterChange(s);
  s.updated = Date.now();
  return true;
}
function lastCount(s, key) { return (M(s).lastCounters || {})[key] || 0; }
// The UI opens the appearance editor while freeRestyle is set (refresh() in 1000-ui-kit.js).
onChoice('comingOfAge', (s, ctx, yes) => { M(s).freeRestyle = !!yes; });

function milestoneTick(s) {
  const a = A(s), m = M(s);
  if (a === 18) {
    if (m.trust > 0) { m.money += m.trust; log(s, `💼 Your trust fund of ${fmtMoney(m.trust)} was released to you.`, 'good'); m.trust = 0; }
    log(s, "🎂 You turned 18. You're an adult now.", 'good');
    ensureBody(s, P(s));
    popup(s, {
      emoji: '🎂', title: "You're 18!", tone: 'good', handler: 'comingOfAge',
      text: "You're officially an adult. You can move out, work full-time, date adults, and make your own choices. Want to settle on your adult look, from face to full figure?",
      choices: [{ label: 'Design my adult look', sub: 'One free redesign, body included', value: true }, { label: 'Keep me as I am', value: false }],
    });
  }
  if (a === 13) log(s, "🎂 You're a teenager now.");
  if (a === country(s).drive && !m.license && free(s)) log(s, "🚗 You're old enough to take your driving test (Activities → Identity & Legal).");
  if (a === 100) log(s, '🎂 You turned 100! A whole century.', 'good');
  if (a >= 30 && m.housing.type === 'parents' && !inPrison(s) && chance(0.2)) {
    const p = relPeople(s, ['parent'])[0];
    if (p) log(s, `🏠 ${p.first} keeps leaving apartment listings on your pillow.`);
  }
  if (m.housing.type === 'parents' && A(s) >= 18 && !relPeople(s, ['parent']).length && !inPrison(s)) {
    m.housing = { type: 'homeless', assetId: null, rent: 0, name: '' };
    announce(s, { emoji: '🏚️', title: 'Nowhere to live', text: 'With your parents gone, the family home is gone too. You need to find a place to live.', tone: 'bad' });
  }
}
