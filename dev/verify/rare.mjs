// Rare events and actions:  node dev/verify/rare.mjs
//
// The life simulator almost never reaches these (they need a particular life: two secret lovers, a veteran with a
// claim, a spy with a failure on file), so each gets a state built for it here, and every choice is played on a clone.
import { loadGame } from './loadgame.mjs';

const ctx = loadGame({ quiet: true });
const g = (name) => ctx.run(name);
ctx.seedRng(8801);
let errors = 0;
ctx.console.error = () => { errors++; };
let failures = 0;
const ok = (cond, msg) => { if (!cond) { failures++; console.log('  ✖ ' + msg); } };
const META = g('META'), EVENTS = g('EVENTS'), ACTIONS = g('ACTIONS');
const clone = (s) => JSON.parse(JSON.stringify(s));
const P = (s) => s.people[s.playerId];
const adult = (age) => { const s = ctx.createLife({ country: 'us', year: 2000 }); s.year = 2000 + age; s.pending = []; s.player.edu.current = null; s.player.money = 2e6; return s; };
const person = (s, kind, rel, extra) => { const p = ctx.makeAdultNear(s, { minAge: 25, maxAge: 40 }); ctx.setRel(s, p.id, kind, rel); if (extra) Object.assign(ctx.relOf(s, p.id), extra); return p; };
const withPartner = (s) => { const p = person(s, 'partner', 70); p.partner = s.playerId; P(s).partner = p.id; return p; };
const tags = (on) => { for (const t of ['mature', 'mature_intimacy', 'mature_substances', 'mature_violence', 'mature_themes']) META.settings[t] = on; };

// Fires an event on a state and plays every choice on its own clone.
function everyChoice(name, s, ev) {
  ok(ctx.eventEligible(s, ev), `${name}: eligible in the state built for it`);
  let fired = 0, played = 0;
  for (let i = 0; i < 12; i++) {
    const t = clone(s);
    if (!ctx.fireEvent(t, ev)) continue;
    fired++;
    const pp = t.pending.find((q) => q.handler === 'event');
    if (!pp) continue;
    for (let k = 0; k < pp.choices.length; k++) {
      const u = clone(t), q = u.pending.find((x) => x.handler === 'event'), e0 = errors;
      try { ctx.resolvePopup(u, q.id, k); played++; } catch (e) { ok(false, `${name}: choice ${k} threw ${e.message}`); }
      ok(errors === e0, `${name}: choice ${k} logged an error`);
      for (let n = 0; n < 8 && u.pending.length; n++) { const r = u.pending[0]; try { ctx.resolvePopup(u, r.id, Math.max(0, r.choices.findIndex((c) => !c.disabled)), r.input ? 'X' : undefined); } catch (e) { ok(false, `${name}: follow-up threw ${e.message}`); break; } }
    }
  }
  ok(fired > 0 && played > 0, `${name}: fires, and its choices play (${fired} fired)`);
}

/* the secret-lover events -------------------------------------------------------------------- */
tags(true);
{
  const s = adult(35); withPartner(s); person(s, 'lover', 30);
  everyChoice('rx_blackmail', s, EVENTS.rx_blackmail);
  const t = adult(35); withPartner(t); person(t, 'lover', 85);
  everyChoice('rx_doorstep', t, EVENTS.rx_doorstep);
  const u = adult(35); withPartner(u); person(u, 'lover', 60); person(u, 'lover', 60);
  everyChoice('rx_double_booked', u, EVENTS.rx_double_booked);
  const v = adult(30); person(v, 'fling', 70, { met: v.year - 1 });
  everyChoice('rx_fling_stalker', v, EVENTS.rx_fling_stalker);
  tags(false);
  ok(!ctx.eventEligible(s, EVENTS.rx_blackmail) && !ctx.eventEligible(t, EVENTS.rx_doorstep) && !ctx.eventEligible(v, EVENTS.rx_fling_stalker), 'the mature romance events need Mature');
  tags(true);
}
/* a morning of regret ------------------------------------------------------------------------ */
{
  const s = adult(30);
  ctx.intimOf(s).yrs = [s.year - 1, s.year - 2, s.year - 3];
  everyChoice('in_regret', s, EVENTS.in_regret);
}
/* spies ------------------------------------------------------------------------------------------ */
tags(false);
{
  const spyLife = (level) => { const s = adult(35); s.player.skills.acting = 50; ctx.hire(s, 'spy', level); ctx.ensureSpy(s); s.pending = []; return s; };
  const a = spyLife(1); everyChoice('spy_reporter', a, EVENTS.spy_reporter);
  const b = spyLife(1); ctx.spy(b).ok = 4; everyChoice('spy_award', b, EVENTS.spy_award);
  const c = spyLife(3); ctx.spy(c).fail = 2; everyChoice('spy_scapegoat', c, EVENTS.spy_scapegoat);
}
/* veterans ---------------------------------------------------------------------------------------- */
{
  const s = adult(45);
  const m = ctx.ensureMil(s);
  m.vet = true; m.claim = { approved: true, appeals: 0 }; m.rating = 10; m.wounds = [{ y: s.year - 10, sev: 50 }]; m.ptsd = 40;
  ok(ACTIONS.vet_appeal.when(s), 'vet_appeal: a veteran with a low rating can appeal');
  let up = 0, denied = 0;
  for (let i = 0; i < 40; i++) { const t = clone(s); t.player.counters = {}; const e0 = errors; ctx.doAction(t, 'vet_appeal'); ok(errors === e0, 'vet_appeal logged an error'); if (t.player.mil.rating > 10) up++; else denied++; ok(t.player.mil.claim.appeals === 1, 'vet_appeal: counted'); }
  ok(up > 3 && denied > 3, `vet_appeal: the board raises it (${up}) or denies it (${denied})`);
  { const t = clone(s); t.player.counters = {}; ctx.doAction(t, 'vet_appeal'); t.pending = []; ctx.doAction(t, 'vet_appeal'); ok(t.player.mil.claim.appeals === 1, 'vet_appeal: once a year'); }
  const u = adult(45); ctx.ensureMil(u).vet = true; ok(!ACTIONS.vet_appeal.when(u), 'vet_appeal: nothing to appeal without an approved claim');
}
/* the underworld ----------------------------------------------------------------------------------- */
{
  const s = adult(30);
  ctx.uw(s).heat = 50;
  everyChoice('uw_cop_bribe', s, EVENTS.uw_cop_bribe);
  const t = clone(s); ctx.fireEvent(t, EVENTS.uw_cop_bribe); const pp = t.pending.find((q) => q.handler === 'event'); const before = t.player.uw.heat; ctx.resolvePopup(t, pp.id, 0); ok(t.player.uw.heat < before, 'uw_cop_bribe: paying him cools your file');
  const u = adult(30); ctx.uw(u).heat = 5; ok(!ctx.eventEligible(u, EVENTS.uw_cop_bribe), 'uw_cop_bribe: only when it is hot');
}
tags(false);
console.log(failures ? `\n✖ ${failures} check(s) failed` : '✓ rare event checks passed');
process.exit(failures ? 1 : 0);
