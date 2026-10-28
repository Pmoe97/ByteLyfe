/* =====================================================================
 * 89-world-events-5.js — personal events for the generated years (92-world-future.js): a lockdown and a vaccine in a new
 * pandemic, and the news that your employer is cutting jobs in a downturn. They share the choices of the real ones
 * (89-world-events.js). Each stores the year it came in a flag, like wd_games (89-world-events-4.js).
 * ===================================================================== */

const wdGenRow = (s, f) => worldActive(s).find((a) => a.ev.future && f(a));
// The flag is the row's id and the year it came: asked again when you choose, it must still pass (23-events.js).
const wdGenOnce = (s, key, a) => { const f = flag(s, key + a.id); return !f || f === s.year; };

EV('wd_gen_lockdown', {
  ...EVENTS.wd_lockdown, once: false, cooldown: 1,
  when: (s) => { const a = wdGenRow(s, (x) => x.ev.pandemic && x.i === 0); return !!a && wdGenOnce(s, 'gl_', a); },
  ctx: (s) => { const a = wdGenRow(s, (x) => x.ev.pandemic && x.i === 0); if (!a) return null; flag(s, 'gl_' + a.id, s.year); return { id: a.id }; },
});
EV('wd_gen_vaccine', {
  ...EVENTS.wd_covid_vaccine, once: false, cooldown: 1,
  when: (s) => { const a = wdGenRow(s, (x) => x.ev.pandemic && x.i === 1); return !!a && wdGenOnce(s, 'gv_', a); },
  ctx: (s) => { const a = wdGenRow(s, (x) => x.ev.pandemic && x.i === 1); if (!a) return null; flag(s, 'gv_' + a.id, s.year); return { id: a.id }; },
});

const wdSlump = (s) => wdGenRow(s, (x) => x.ev.kind === 'econ' && x.ev.tone !== 'good' && x.i === 0);
EV('wd_gen_layoffs', {
  ages: [20, 64], sure: true, cooldown: 1, emoji: '📦',
  when: (s) => { const a = wdSlump(s); return !!a && wdGenOnce(s, 'gk_', a) && !!M(s).career && free(s) && !inService(s); },
  ctx: (s) => { const a = wdSlump(s); if (!a) return null; flag(s, 'gk_' + a.id, s.year); return { id: a.id }; },
  text: (s, c) => `Your employer has told everyone that it has to cut costs while ${HIST[c.id].name} lasts. Nobody knows yet who is on the list, and the meeting is on Friday.`,
  choices: [
    ['Offer to take a pay cut to stay', (s, c) => {
      const k = M(s).career, a = HIST[c.id];
      k.salary = Math.round(k.salary * 0.92); k.safe = a.years[1]; add(s, { happy: -2 });
      return `You went to your manager before the meeting and offered eight percent off. The job is yours until ${a.years[1]}, at ${fmtMoney(k.salary)} a year.`;
    }],
    { label: 'Ask for the severance and go', sub: (s) => (M(s).career ? fmtMoney(Math.round(M(s).career.salary * 0.25)) : ''), fx: (s) => {
      const v = Math.round(M(s).career.salary * 0.25), title = careerTitle(s);
      leaveJob(s, 'laidoff'); tally(s, 'layoffs'); add(s, { money: v, happy: -3 });
      return { text: `You asked to be on the list, and they were glad of it. As a ${title}, you left with ${fmtMoney(v)} and a handshake, and a very long job search ahead.`, tone: 'bad' };
    } },
    ['Keep your head down', (s) => { const k = M(s).career; k.perf = clamp100(k.perf + 3); return 'You worked harder than anyone, and did not mention it. Whether that is enough depends on who is deciding.'; }],
  ],
});
