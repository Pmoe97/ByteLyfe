/* =====================================================================
 * 91-era.js — what had been invented yet. A life in 1955 has no social media, no smartphone and no crypto; a job that did not
 * exist is not on the board. Only while the history setting is on (88-world.js histOn); with it off, everything is always there.
 *
 *   eraHas(s, what)      is it there yet, where this life is lived
 *   eraYear(cc, what)    the year it reached a country
 *   eraJobOk(s, jobId)   has the job been invented
 *   eraMedicine(s)       how well the doctors of the time cure things (1 today)
 *
 * `what` is one of the "firsts" of 09-data-history-6.js (radio, tv, color, computer, mobile, web, smartphone, social), read per
 * country from the year in the row, or one of the worldwide dates below. An event or a choice says `era: 'social'`, and an
 * action says `era: 'dating'`; they are hidden before then (23-events.js, 12-flow.js).
 * ===================================================================== */

const ERA_FIRST = { radio: 'first_radio', tv: 'first_tv', color: 'first_color_tv', computer: 'first_home_computer', mobile: 'first_mobile', web: 'first_web', smartphone: 'first_smartphone', social: 'first_social' };
const ERA_WORLD = { lottery: 1964, games: 1972, index: 1976, crypto: 2010 }; // the first modern state lottery, video games (the first arcade hit), the first index fund for everyone, Bitcoin
const ERA_AFTER = { dating: ['web', 1] }; // online dating: a year after the web reaches you
// Jobs that did not exist before a year (anything not listed always has).
const JOB_ERA = { trainer: 1960, software: 1960, astronaut: 1960, paramedic: 1970, profiler: 1972, callcenter: 1975, it: 1980, data: 1995, creator: 2005 };

function eraYear(cc, what) {
  if (ERA_FIRST[what]) { const e = HIST[ERA_FIRST[what]]; return e ? evRange(e, cc)[0] : 0; }
  if (ERA_WORLD[what]) return ERA_WORLD[what];
  if (ERA_AFTER[what]) return eraYear(cc, ERA_AFTER[what][0]) + ERA_AFTER[what][1];
  return 0;
}
function eraHas(s, what) {
  if (!histOn() || !s || !s.playerId || !s.people[s.playerId]) return true;
  return s.year >= eraYear(P(s).country, what);
}
function eraJobOk(s, id) { return !histOn() || !JOB_ERA[id] || s.year >= JOB_ERA[id]; }
function eraMedicine(s) { return !histOn() ? 1 : s.year < 1940 ? 0.75 : s.year < 1970 ? 0.9 : 1; }
