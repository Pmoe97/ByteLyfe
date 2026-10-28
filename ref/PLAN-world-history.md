# Plan: real-world history, a head start, and two family fixes

> Written for the implementer. Work the phases in order, one commit per phase (or per sub-phase
> where marked). Each phase is shippable on its own and ends green on `npm run verify`.
> House rules from `ref/ARCHITECTURE.md` apply everywhere: engine files have no DOM and must run in
> Node, popups are plain JSON, money is stored in US dollars and shown with `fmtMoney`/`price`
> (never write a "$"), emoji no newer than Emoji 12 (the audit fails otherwise), no square or curly
> brackets in `index.html` markup, bump `?v=N` with `python3 dev/bump-versions.py` before committing,
> and update `ref/ARCHITECTURE.md` (the load-order table and "The engine in one page") and the
> "Built" part of `ref/ROADMAP.md` in the same commit as the code.

## What this covers

1. **Family fixes** (small, do first): a confirmation popup before starting a romance with a
   relative, and breaking up with a relative puts them back in your family instead of "Others".
2. **Start at any age** in a custom life: the years before are lived for you on autopilot, and you
   don't get to pick what happens in them.
3. **Real-world history**: the biggest geopolitical and economic events of 1900 to 2025 change the
   game for lives that live through them: the economy, jobs, housing, wars and the draft,
   pandemics, disasters in your city, and personal events that put you inside the moment.

## Decisions already made (change them here before starting, if you disagree)

| # | Decision | Default chosen | Why |
| --- | --- | --- | --- |
| D1 | History setting | New toggle `history`, **on** by default | It only changes lives that live in years 1900 to 2025, so today-born lives are untouched until Phase 7. |
| D2 | When a random life is born | Unchanged: **this year**. Add a setting `randomBirth: 'now' \| 'past'` ("Born any year since 1920"), default `'now'` | Until era gates exist (Phase 7), a random 1950 life still has smartphones and crypto. Flip the default after Phase 7 if you want. |
| D3 | Real names | Real event, war and place names; real foes in historical wars ("the Axis powers", "North Korea"). **No real people's names** (say "the president", "the prime minister") | Matches "All names... original" for people; history itself isn't anyone's IP. |
| D4 | Random fictional wars | Suppressed for years covered by the history table when `history` is on; unchanged otherwise | Otherwise you'd fight "the Valdorian War" during WWII. |
| D5 | Historical drafts | Follow history: men only, with each war's age band. Women may volunteer (enlist as now). One exception kept for accuracy: UK 1942 to 1945 also calls up unmarried women 20 to 30, to the auxiliary services or war work | A "historical" draft that ignores history feels wrong. The fictional draft (non-history years) stays as it is (anyone 18 to 30). |
| D6 | Civil wars | Use the war machinery with `civil: true`: the foe is "the other side", texts never pick a side, the call-up comes from "the forces holding your city" | No side-picking mechanics in civil wars. |
| D7 | Atrocities and terror | Never a gameplay mechanic, never a choice. At most one sober news line (for example, independence and partition). Terror attacks show only as news plus their knock-on effects (travel slump, wars). No mechanics keyed on race, ethnicity or religion (the game doesn't model them and shouldn't start here) | Respect. |
| D8 | Starting age range | 0 to 60 | A constant (`HEAD_START_MAX`), easy to change. |
| D9 | Death or prison during a head start | Re-roll the head start (same choices, new luck), up to 10 tries | Nobody wants "You died at 12" as the first screen. |
| D10 | Time Machine after a head start | The rewind buffer is cleared, so the chosen age is the floor | The point is that you don't choose what happened before. |
| D11 | Future years (after 2025) | Phase 7 adds generated world events (recessions, booms, pandemics, disasters) under the same toggle | So everyone gets the system eventually. |

---

## Phase 1: family fixes

### 1a. Breaking up with a relative keeps them family

**The bug, reproduced.** With taboo romance on, ask out a sibling, then break up. `endRomance`
(`18-relationships.js:632`) does `setRel(s, pid, 'ex', ...)`, so the relationship kind becomes
`ex`. `REL_GROUPS` (`02-data-people.js:86`) files `ex` under **Others**, not **Family**, so they
"disappear" from Family (the title reads "Brother · Ex" because `r.wasFam` survives). While the kind
is `partner`/`ex`, every system that looks for `sibling` (or `parent`, `child`...) also skips them:
family events, `familyTick`, `tabooTick`'s family drift. `setRel` also resets `since`.

Reproduction (Node, in the scratch harness or a new test):

```js
META.settings.taboo = true; META.settings.taboo_sibling = true;
// a life with an adult sibling
startRomance(s, sib.id);   // kind 'partner', r.wasFam = 'sibling', r.taboo = 'taboo_sibling'
endRomance(s, sib.id, 'ex'); // kind 'ex' -> REL_GROUPS 'Others'  (the bug)
```

**Fix.**
- In `tabooOnRomanceStart` (`48-taboo.js:259`), also store `r.famSince = old since` when it sets
  `r.wasFam` (read it before `setRel` overwrote it: pass it in from `startRomance` /
  `affairBegins`, or record `since` before the `setRel` call in `startRomance`).
- In `endRomance` (`18-relationships.js:632`): if the record has `wasFam` and the family tie still
  holds, restore the family kind instead of `kind`:
  - `const back = prevWasFam && familyTieHolds(s, pid, prevWasFam)`;
  - `familyTieHolds`: true when `bloodKinshipInfo(s, pid)` is non-null, or when `wasFam` is any kind
    other than `inlaw`; for `inlaw`, true only while your current partner/spouse is the person
    they're an in-law through (their parent or sibling). Put it in `48-taboo.js` next to
    `bloodKinshipInfo`.
  - If `back`: `setRel(s, pid, prevWasFam, rel)`, then restore `since = famSince` if stored, keep
    `taboo` and `wasFam`, and set `r.exRom = kind` (`'ex'` or `'exspouse'`) so the history is kept.
  - Otherwise behave as today.
- `kinTitle` (`13-people.js`): when `r.exRom` is set on a family kind, show "Sister · Ex" or
  "Sister · Ex-wife" (use `kinLabel('ex'|'exspouse', p)`), in the same dual-label style it already
  uses for `r.taboo`.
- `p_askout` already allows a taboo-eligible relative (the `isTabooFamily` branch), so asking them
  out again works without `p_rekindle`. Leave `p_rekindle`'s `wasFam` branch as it is.
- `startRomance` with a restored relative: clear `r.exRom` when a romance starts again.
- **Old saves:** in `migrate` (`29-save.js:141`), for every rel with kind `ex`/`exspouse` and a
  `wasFam` whose tie still holds, apply the same restore. Keep the restore in one function
  (`tabooRestoreFamily(s, pid, exKind)` in `48-taboo.js`) and call it from both places.

### 1b. Confirm before starting a romance with family

Make it a general action feature, so it can be reused:

- `defAction` gains an optional `confirm: (s, t) => null | { title, text, yes, no, emoji }`.
- In `doAction` (`12-flow.js:148`): after `actionAvailable`, if `a.confirm` returns an object, push
  a popup with `handler: 'confirmAction'`, `ctx: { id, t }`, choices `[{ label: yes, value: true },
  { label: no || 'Never mind', value: false }]`, and return without running the action.
- `onChoice('confirmAction', (s, ctx, yes) => ...)`: on `false`, return
  `{ text: 'You thought better of it.', quiet: true, nolog: true }`; on `true`, re-check
  `actionAvailable(ACTIONS[ctx.id], s, ctx.t)` (return "The moment passed." quietly if not), then
  `return ACTIONS[ctx.id].run(s, ctx.t)`. `resolvePopup` already wraps handlers in `runWithResult`,
  so results, chips and follow-up popups behave exactly like a normal action.
- Add `confirm` to `p_askout` and `p_rekindle`: return the object only when
  `isTabooFamily(s, pid)` or `relOf(s, pid).wasFam`. Text: `Ask out ${kinOf(s, pid)}, ${p.first}?`
  with a sub-line "They're family." Yes: "Yes, ask them out" (use the pronoun helper: "ask her
  out"), No: "No, never mind". The yearly `bump(s, 'askout_' + pid)` stays inside `run`, so
  backing out costs nothing.

### Tests (Phase 1)

Extend `dev/verify/taboo.mjs`:
- start a romance with an adult sibling, break up: kind is `sibling`, `REL_GROUPS` group is
  Family, title is "Brother · Ex" or "Sister · Ex", `since` is the original.
- same with marriage and `divorce`: kind returns to the family kind, `exRom === 'exspouse'`.
- an in-law partner after you split from your spouse falls back to `ex`.
- `migrate` restores a save made with the old behavior.
- `doAction(s, 'p_askout', sibId)` pushes a `confirmAction` popup and starts no romance; choosing
  "No" leaves no romance and no bump; choosing "Yes" runs the ask-out.
- `doAction` on a non-family ask-out pushes no confirm popup.

---

## Phase 2: start at any age (a head start)

**Status: built** (`90-head-start.js`, `dev/verify/headstart.mjs`). Differences from the text below: content behind a
switch is hidden by a global `HEAD_START_RUN` that `tagsOn` reads (not by `s.headStart`), and event choices whose code
commits a crime, joins the mob, builds a habit or gambles are skipped when another exists (`HS_RISKY`); the check plays a
head-started life ten more years instead of adding head-start lives to `sim-lives.mjs`, whose personas all assume a
life that starts at birth.

### What a player sees

In **Design a custom life**, next to "Birth year", a **Start at age** number field (0 to
`HEAD_START_MAX`, default 0). Under it: *"The years before that are lived for you. You won't choose
what happens in them."* and *"You'll start in {year}, age {n}."* If the player hasn't touched the
birth year (it's still this year), changing the starting age moves the birth year back so the life
starts in the present (`CUSTOM.yearTouched` tracks an edit). Pressing **Be born** with an age above 0
shows a short "Living your first N years..." state, then opens the game at that age with a
**"Your story so far"** popup on top, and the life log holds every year that was lived.

### Why the autopilot needs a "life director"

A prototype that only answered popups at random left almost every character at 25 unemployed,
single and living with their parents (1 of 60 had a job; 5 had a partner; none had kids). Popups
alone don't move a life forward; the player's own actions do. So the head start answers popups
with a policy **and** takes a few ordinary, sensible actions each year. Speed is fine: about 120 ms
per life to age 25, 170 ms to age 40, in Node.

### Engine: `90-head-start.js` (new, no DOM)

```js
const HEAD_START_MAX = 60;
function headStart(s, age)  // ages s up to `age`, answering everything; returns s
```

- Loop: `while (!s.dead && A(s) < age) { ageUp(s); hsAnswerAll(s); hsDirector(s); hsAnswerAll(s); }`
  (answer once before the first `ageUp` too: birth can queue popups).
- `s.flags`-style marker while it runs: `s.headStart = true` (top of save), deleted at the end.
  Anything that should behave differently during a head start reads it (see below).
- When done: `delete REWIND[s.id]` (D10); `M(s).freeRestyle = A(s) >= 18 && !hadCustomLook`;
  push the summary popup (below).
- `createLifeWithHeadStart(opts, age)`: `createLife(opts)` then `headStart`; if the result is dead
  or in prison, try again with the same `opts` (D9), up to 10 times; after that, return the last
  living try even if it's in prison, or a fresh life at age 0 with a log line saying the head start
  didn't take.

**Answering popups: `hsAnswer(s, pp)`.** A table `HS_ANSWER[handler] = (s, pp) => choiceIndex`,
with a weighted-random default:
- default: random among enabled choices, choices with `tone: 'bad'` weighted 0.2, never a choice
  whose `value` is `-1`/`null` when another exists (those are "Never mind" rows that would loop).
- `afterHigh`: smarts ≥ 70, or wealth comfortable/rich with smarts ≥ 55: `offers` if present, else
  `university`. Smarts 45 to 70: community 35%, trade 25%, work 35%, gap 5%. Below 45: work 70%,
  trade 30%.
- `pickMajor`: a major whose `MAJORS[id].smarts` ≤ your smarts, weighted by your related skill;
  never `null`.
- `funding`: parents' help if offered, else a scholarship, else loans; never cancel.
- College offers (`cpChoose`/`cpPick`): the best tier that's affordable or funded.
- `comingOfAge`: `false` (Phase 2 sets `freeRestyle` at the end instead).
- `milDraft`: `report` 70%, `defer` 30%; never `flee` or `bribe`.
- `event`: the default rule.
- Any handler not listed: the default rule. Info popups (no handler): choice 0.

**The life director: `hsDirector(s)`**, once a year, using only this whitelist (existing actions
through `doAction`, then `hsAnswerAll`):
- Age 18+, free, not in school, no career: apply for the best-paid open job with no
  `missingReqs` (`jobBoard`, `applyJob`), up to 3 tries a year.
- Age 20+, has a career, lives with parents: 45% a year, `find_rental` and take the cheapest
  listing whose rent is at most 35% of salary.
- Age 18+, single: 30% a year, ask out an eligible friend or acquaintance (**never family**; skip
  anyone `isTabooFamily`), if one exists.
- Partner for 2+ years, age 23+: 25% a year propose (cheapest affordable ring); engaged: plan the
  wedding (cheapest affordable).
- Married, 24 to 40, fewer kids than a per-life target (1 to 3, rolled once and stored on the
  head-start state): 30% a year `p_baby`.
- Money above six months of living costs: 30% of the excess into the index fund (or savings, when
  Phase 7 era gates say there's no fund yet).
- **Never:** crimes, gambling, substances, affairs, anything tagged `chaos`, `mature` or `taboo`,
  quitting a job, emigrating. The world (random events, Phase 3 history) still happens to you.

**The summary popup.** Title "Your story so far". A few lines, each only when it applies: age and
city; school or highest degree; job; partner/spouse and kids; home; money; the biggest things that
happened (relatives who died, from the log; Phase 3 world events lived through). End with "The
details are in your life log."

**During a head start** (read `s.headStart`): achievement popups are not shown (the unlock still
counts), and `META.settings.autoPopups` is ignored.

### UI (`1004-ui-title.js`)

- `CUSTOM.startAge = 0`, `CUSTOM.yearTouched = false`; `INPUT.cust` sets `yearTouched` when the
  birth year changes and clamps `startAge` to `0..HEAD_START_MAX`.
- The field and the two notes described above.
- `CLICK.custStart`: if `startAge > 0`, render a small "Living your first N years..." sheet, then
  (after a `setTimeout(0)` so it paints) call `createLifeWithHeadStart(o, CUSTOM.startAge)` and
  `startLife`.

### Tests (Phase 2): `dev/verify/headstart.mjs` (add to `run-all.mjs`)

For 40 seeds × start ages 0, 5, 12, 18, 25, 40, 60, in a few countries:
- no throws, no `console.error`, `A(s) === age`, `s.pending` holds only the summary popup,
  `s.headStart` is gone, `REWIND[s.id]` is empty, never dead.
- at 25 and 40: at least half are employed or in school, at 40 at least half have had a partner.
- never a taboo romance, never a crime on the record from the director (a record can still come
  from events; assert it's rare, under 10%).
- the summary text has no "undefined", "NaN" or "$" in a non-US life.
Also make 1 in 20 lives in `sim-lives.mjs` start with a head start to a random age 0 to 40.

---

## Phase 3: the world engine (history, part one)

The system that makes real events data. Content comes in Phases 4 to 6.

### Files

| File | What |
| --- | --- |
| `09-data-history.js` (new) | Pure data: the `HIST` table (`H(id, def)`), `HIST_FROM = 1900`, `HIST_TO = 2025`. |
| `25-ageup.js` (edit) | Add `onYearStart(name, fn)` and `runYearStartHooks(s)`, run as the **first** phase of `AGE_PHASES` (before `fxTick`), same try/catch rule as `onYear`. |
| `88-world.js` (new) | The engine: what's active, the knobs, announcements, one-off effects, pandemics, disasters, NPC effects, historical wars, the "world" news. `onYearStart('world', worldYear)`. |
| `89-world-events.js` (new) | Personal events (`EV`) tied to world events, and achievements. |
| `1033-ui-world.js` (new) | The World sheet and the header chip. |
| `1005-ui-system.js`, `29-save.js` (edit) | The `history` toggle (D1) and `randomBirth` (D2). |

### The data shape (`09-data-history.js`)

```js
const HIST_FROM = 1900, HIST_TO = 2025;
const HIST = {}, HIST_IDS = [];
function H(id, def) { def.id = id; HIST[id] = def; HIST_IDS.push(id); }

H('depression', {
  name: 'the Great Depression', emoji: '🏚️', kind: 'econ',      // econ | war | pandemic | disaster | moment | unrest
  years: [1929, 1939],
  where: 'all',                                // 'all', or ['us', 'de', ...]
  cities: null,                                // for local events: ['us:Miami'] (cityKey form)
  sev: { us: 1, de: 1, ca: 0.9, au: 0.9, uk: 0.7, fr: 0.7, _: 0.6 },   // per country; _ = everyone else
  curve: [0.3, 0.7, 1, 1, 0.9, 0.7, 0.6, 0.5, 0.6, 0.5, 0.3],             // one per year, from years[0]
  fx: { jobs: -0.45, layoff: 0.12, cut: 0.1, pay: -0.03, housing: -0.06, living: -0.08, mood: -2 },
  cats: { layoff: { public: 0.3, education: 0.4, health: 0.5 } },        // per JOB_CATS multipliers
  market: { 1929: -0.10, 1930: -0.25, 1931: -0.43, 1932: -0.09, 1933: 0.50 /* ... */ },
  open: { title: 'Black Tuesday', text: '...', kid: '...' },             // first year (popup)
  yearly: ['...', '...'],                                                  // a log line in later years ({a|b} ok)
  close: '...',                                                            // logged the year after it ends
  news: [['Head', 'Body'], ...],                                           // for the paper
});
```

### The knobs ("effect vocabulary")

Every knob is optional. For a numeric knob the value this year is
`fx[key] × curve[year - years[0]] × sev[country]`, summed over everything active for your country
(and city, for `cities` events). `wfx(s, key)` returns that sum; `wfxCat(s, key, cat)` applies the
`cats` multiplier.

| Knob | Meaning | Applied in (one small edit each) |
| --- | --- | --- |
| `jobs` | job-board odds × (1 + v), floored at 0.05 | `jobOpenOdds` (`49-cities.js:140`); per-category via `cats.jobs` |
| `layoff` | yearly chance to be laid off | `careerTick` (`15-career.js:198`), new `layOff(s, why)` next to `fire` |
| `cut` | one-time pay cut, once per event per job (`c.cuts[id]`) | `careerTick` |
| `pay` | added to the yearly raise (negative freezes raises) | `careerTick` raise line |
| `housing` | added to a city's yearly change `g` | `cityMarketYear` (`49-cities.js:150`) |
| `living` | living costs × (1 + v) while active (not compounding) | `livingCost` (`49-cities.js:127`) |
| `rates` | added to savings and bond returns, and to the rate of new loans | `financeTick` invest loop (`16-money.js:99`), `addLoan` |
| `tax` | added to the income tax rate | `financeTick` (`country(s).tax + wfx(s,'tax')`) |
| `mood` | happiness each year (players 6+) | `worldYear` |
| `fxShock` | `{ CUR: v }`: a currency's strength × (1 + v) that year | `fxTick` (`50-currency.js:75`), after the random move |
| `cash` | `{ year: share }`: a share of cash and savings lost, with a popup | `worldYear` |
| `biz` | `{ industry: v }`: demand for a business industry | `industryMods` (`34-business.js:239`), `firmYear` growth `g` (`37-market.js:113`) |
| `market` | exact stock-market return by year (± a little noise); `marketCc: { jp: {...} }` for a country's own market | `marketYear` (`37-market.js:85`) |
| `crypto` | exact crypto return by year | `financeTick` invest loop |
| `disease` | `{ id, odds, ages, npc }`: infection odds a year, and NPC death odds by age | `worldYear` (uses `getSick`, `npcDies`) |
| `war` | per-country war definitions (below) | `warYear` (`59-military.js:94`) |
| `blast` | for `cities` events: `{ home, hurt, dead, npc }` odds | `worldYear` |
| `closed` | `['travel', 'nightlife', 'gambling', 'gym', 'school']` | the `when` of those actions, via `worldClosed(s, what)` |
| `support` | `{ cc: usd }` one-time payment per adult that year | `worldYear` |
| `furlough` | in these countries a world layoff becomes 80% pay instead | `layOff` |
| `draftWomen` | see D5 | `draftYear` |

**Market rule.** With history on and `HIST_FROM <= year <= HIST_TO`: if any active event has a
`market` value for this year (the country-specific one first), use it plus `gauss(0, 0.02)`.
Otherwise use `gauss(0.08, 0.11)` and **skip** the random crash/boom roll (real crashes are
authored). The year-end "the stock market crashed" log line in `marketTick` should name the event
when there is one ("Stocks fell 43% this year as the Depression deepened"). Crypto: only authored
years move it when history is on; before Phase 7 adds the era gate, years without data use the
normal roll.

**Layoffs.** `worldLayoff(s)` in `careerTick`, after `CAREER_YEAR` and before the raise:
`odds = wfxCat(s, 'layoff', j.cat) × (1.4 - c.perf / 100)`; never for `j.special` careers (military,
politics, spy, sports...) or while you're CEO of your own company. `layOff(s, why)`:
`leaveJob(s, 'laidoff')`, `tally(s, 'layoffs')`, `add(s, { happy: -8 })`, an announce titled
"Laid off" that names the event. With `furlough` for your country, keep the job and log "You were
furloughed on 80% pay" (salary × 0.8 for that year only). Interviews: a past layoff is not a mark
against you (check that `leaveJob`'s reason isn't read as "fired" anywhere).

**People around you.** In `worldYear`, the same layoff odds hit parents, spouse and adult siblings
with a `p.job` (non-student): `p.job = null`, and for parents and spouse a log line ("Your mother
lost her job at the mill."). For a child, a parent's layoff costs `happy -3` and, when
`56-growing-up.js` reads the household, a smaller allowance. `cash` events also cut NPC `p.money`.

### What's active, and announcing it

- `worldActive(s)`: memoized per `s.year` and `P(s).country`/`city` in `s.world.now`
  (`{ yr, cc, city, list: [{ id, k }] }`, `k` the intensity this year). Empty when the setting is
  off or the year is outside `HIST_FROM..HIST_TO` (until Phase 7).
- `s.world = { now, seen: { id: year }, lived: [] }` at the top of the save (one world per family
  line, like `s.wars` and `s.market`). `M(s).worldLived = [id]` per character (for the obituary
  and achievements).
- `worldYear(s)` (the start-of-year hook):
  1. compute `worldActive`;
  2. for each event active for the first time in this family line (`!s.world.seen[id]`): mark it
     seen, and `announce` it (`open.title`, `open.text`, or `open.kid` when you're under 13). Small
     events (`moment` and `disaster` outside your city) are a log line, not a popup;
  3. for events already seen: one `yearly` line now and then (40%, not every year);
  4. the year after an event ends: its `close` line;
  5. one-off effects: `cash`, `support`, `disease`, `blast`, NPC layoffs and deaths, `mood`;
  6. post 1 or 2 of its `news` items to the paper (`s.news`, `kind: 'world'`, `you: false`), at any
     age (it's history), and swap one of the two filler items for it;
  7. add the id to `M(s).worldLived` once.
- Wording: announcements are written for the player's age. A kid hears it through the family
  ("Your parents talk about the war in low voices"); an adult gets the facts and what it means for
  them ("Jobs will be scarce. Hold on to the one you have.").

### Historical wars (`59-military.js`)

A `war` knob holds one entry per country:

```js
war: {
  uk: { name: 'the Second World War', foe: 'the Axis powers', foeAdj: 'Axis', theater: 'Europe and North Africa',
        years: [1939, 1945], intensity: 4, draft: [1939, 1945], draftAges: [18, 41], draftWomen: [1942, 1945], result: 'victory',
        end: 'The war in Europe ended in May, and in the Pacific in August. There were street parties everywhere.' },
  de: { ..., result: 'defeat', end: '...' },
}
```

- `warYear(s)` (`59-military.js:94`): when history is on and `HIST_FROM <= s.year <= HIST_TO`,
  call `historyWarYear(s)` (in `88-world.js`) and return: it starts the authored war for your
  country in its first year (a `makeWar`-shaped object with the authored fields plus `hid` and
  `hyears`, so the rest of the military code works unchanged), sets `w.draft` only inside
  `draft` years, and ends it in its last year with `endWar` using the authored `result` and `end`
  text. No random wars inside the window.
- `endWar` takes an optional custom text (the authored `end`), used instead of the generic one.
- `draftYear` (`59-military.js:470`): use `w.draftAges` when set (default 18 to 30). For a
  historical war, only men are called (D5) unless `draftWomen` covers this year (then unmarried
  women 20 to 30 too, and the popup offers "the auxiliary services or war work").
- A war you move away from keeps running in its country's slot (that's already how slots work).
- `civil: true` wars (D6): the war is "at home": the popup and texts say "the forces holding your
  city", and the foe is "the other side". The military career works the same.

### Settings, sheet and chip

- `29-save.js`: `history: true`, `randomBirth: 'now'` in `META.settings`.
- `1005-ui-system.js`, Gameplay card: a toggle "🌍 Real-world history" ("Lives in past years
  live through real events: the Depression, the World Wars, 2008, the pandemic. Off: the world is
  fictional, as before."), and a segmented "Random lives are born: This year | Any year since 1920".
- `CLICK.newRandom` (`1004-ui-title.js`): with `randomBirth === 'past'`, pass a random
  `year` from 1920 to this year.
- Custom life: quick-pick chips under Birth year: "1912 · Grew up in the Depression",
  "1946 · Postwar baby", "1965 · Cold War kid", "1981 · Millennial", "1997 · Gen Z".
- `1033-ui-world.js`: **The World** sheet. "Right now" lists active events with a plain sentence
  per knob that's in play ("Jobs are scarce. Layoffs are likely. Rents and home prices are
  falling."), then "In your lifetime" lists `worldLived` with years. Reach it from a header chip in
  `.g-chips` (`1001-ui-game.js`) shown while a major event (not `moment`) is active: "🌍 The Great
  Depression". Also a row in the menu.
- Death screen and Hall of Lives: "Lived through: the Great Depression, the Second World War, the
  Moon landing" (the three or four biggest by kind).

### Tests (Phase 3): `dev/verify/world.mjs` (add to `run-all.mjs`)

- Data sanity: every `H` has `years[0] <= years[1]` inside the window, `where` country ids exist,
  `cities` exist in `CITY_INFO`, `curve` length equals the span, `market`/`crypto` years are inside
  `years`, every `war` country exists and its years are inside the event, every emoji passes the
  audit, no "$" in any text.
- Behavior: lives born 1900, 1925, 1950, 1975 and 2000 in every country, played to 2025 by the
  same bot as `sim-lives.mjs` with history on: no throws; authored market years match their value
  within 0.06; no random (non-`hid`) war starts inside the window; each country's authored wars
  start and end in their years; a draft happens only inside `draft` years and only to men (except
  `draftWomen`); pandemic years infect someone; `M(s).worldLived` is filled.
- History off: no world popups, no `s.world.seen`, random wars still possible (run 200 lives,
  expect at least one).
- Every world `EV` choice plays on a clone (reuse `everyChoice` from `rare.mjs`).
- `sim-lives.mjs`: personas with `i % 10 === 6` are born in a random year 1900 to 2000.

---

## Phase 4: the headline events (history, part two)

Fifteen events everybody alive would remember. Each gets: the data row, its knobs, 2 to 4
personal events (`89-world-events.js`, ids `wd_*`), and 4 to 6 news items. Numbers are starting
points for tuning, not gospel. Market returns are approximate US large-company returns (Appendix A).

| # | Event | Years, where | What it does in the game | Personal events (ideas) |
| --- | --- | --- | --- | --- |
| 1 | **The Great War** (WWI) | 1914 to 1918; per-country entries in Appendix B | War, draft (men), relatives enlist and some die (`familyWar` already does this from intensity), `mood -2`, `living +0.08` | Too young to enlist: lie about your age? (15 to 17, risky). A letter from the front. Armistice Day: the bells. |
| 2 | **The 1918 flu** | 1918 to 1920, everywhere; `sev` India 2 | New disease `flu1918` (`sev 15`, `fatal 0.03`, ×2 for ages 20 to 40, ×1.5 under 5 and over 65). Infection odds 0.25 / 0.12 / 0.05 by year. NPC death odds by age. `closed: ['nightlife', 'school']` in 1918 | Wear a mask or not. Nurse a sick parent (health risk, big relationship gain). School closed for the autumn. |
| 3 | **The Great Depression** | 1929 to 1939, everywhere; US and Germany worst | The table above: crash, layoffs, pay cuts, job board halved, house prices and rents fall, deflation (`living -0.08`), market per Appendix A | Bank run: withdraw everything now or trust the bank (20% it fails and takes your savings, until 1934 in the US). Breadline. A parent lost their job (child). Ride the rails looking for work (young adult). The Dust Bowl takes the family farm (US, farm jobs). |
| 4 | **The Second World War** | 1937/1939 to 1945; per-country entries in Appendix B | War, draft (D5), rationing (`living +0.15`, `mood -3`; UK rationing runs on as its own event to 1954), war bonds (already in `59-military.js`), bombing of cities (Appendix B: `blast` events), occupation (France 1940 to 1944, Philippines 1942 to 1945), women in war work (job board +0.3 for women in trades and transport) | Evacuated to the countryside (UK kids, 1939). The air-raid siren: the shelter or the Underground. A victory garden. VE Day and VJ Day street parties. Enlist the day after Pearl Harbor (US 1941). |
| 5 | **The postwar boom** | 1946 to 1973 in the West; Japan 1955 to 1973; Germany's "economic miracle" 1950 to 1966; Korea's "Miracle on the Han" 1962 to 1996 | `jobs +0.25`, `pay +0.02`, `housing +0.03`, `mood +1`. Baby boom: lives born 1946 to 1964 in us, ca, uk, au, fr, de get one more sibling on average (`generateFamily`) | The first family car. The first television (1950s). A new house in the suburbs. |
| 6 | **The Korean War** | 1950 to 1953; Korea at home (intensity 4); us, uk, ca, au, ph, fr, za send troops | War (Appendix B). Korea: Seoul, Incheon, Daejeon `blast`, refugees, `mood -6`. Japan: the war-supply boom (`jobs +0.2`) | Flee south with the family (Korea). The armistice: a country divided. |
| 7 | **The Cold War** | 1947 to 1991, everywhere (ambient, small) | `mood -0.5` in crisis years. Moments: Sputnik (1957), the Berlin Wall (1961), the Cuban Missile Crisis (1962, `mood -4` for one year), Chernobyl (1986, Sweden and Germany) | Duck-and-cover drill (kids). Build a fallout shelter (adult, money). "Don't eat the mushrooms" (Sweden 1986). |
| 8 | **The Vietnam War** | us 1965 to 1973; au 1962 to 1972; kr 1964 to 1973 | War. US: the draft lottery, 1969 to 1972 (a lottery number from your birthday; number ≤ 195 means a draft notice). Australia: the birthday ballot for 20-year-olds, 1965 to 1972. `mood -1` | Your number came up. Protest the war (karma, fame, risk of arrest) or stay out of it. |
| 9 | **The Moon landing** | 1969, everywhere (moment) | `mood +3`. Kids 6 to 15: +science skill, and a one-time push toward space careers | Where were you? Watch it with family (relationship +), at school, or sleep through it. |
| 10 | **Oil shocks and stagflation** | 1973 to 1975 and 1979 to 1982, everywhere | `living +0.12`, `rates +0.06` (savings pay more, new loans cost more), market 1973 -0.15, 1974 -0.26, `jobs -0.15`, `biz: { airline: -0.2 }`, transport layoffs | Gas lines: wait two hours or bike. A mortgage at 16%: buy now or wait. |
| 11 | **Black Monday** | 1987, everywhere (moment) | Market +0.05 for the year, but a popup in October for anyone holding stocks or the index fund: "down 22% in a day: sell or hold?" Selling locks in -0.2 on those holdings; holding rides the year | (the popup is the event) |
| 12 | **The Wall comes down** | 1989 to 1991, everywhere (moment); Germany's reunification 1990 | `mood +3` (Germany +6). Germany: a solidarity surcharge (`tax +0.02`, 1991 on). The Cold War event ends in 1991 | A piece of the Wall (Berlin): keep it or sell it. |
| 13 | **The dot-com boom and bust** | boom 1995 to 1999, bust 2000 to 2002, everywhere | Boom: tech `jobs +0.4`, tech `pay +0.04`, `biz: { tech: +0.3, games: +0.2 }`. Bust: market per Appendix A, tech `layoff 0.15`, `biz: { tech: -0.4 }` | Stock options at your tech job: cash out now or hold (huge win in 1999, bust in 2001). A startup idea. |
| 14 | **September 11 and the long wars** | 2001 (moment, everywhere); Afghanistan 2001 to 2021, Iraq 2003 to 2011 (Appendix B) | 2001: `mood -3`, `biz: { airline: -0.4, hotel: -0.2 }`, transport layoffs; then limited wars. No draft anywhere. News and knock-on effects only (D7) | Enlist (US, UK, AU, CA 18 to 30): the recruiter's office. Flying again for the first time. |
| 15 | **The 2008 financial crisis** | 2007 to 2012 everywhere; worst in us, uk, ie, es; the euro debt crisis 2010 to 2013 in ie, es, it | Market 2007 +0.05, 2008 -0.37, 2009 +0.26. `housing -0.10` (us, ie, es, uk), layoffs in business, trades and real estate, `jobs -0.35`. Euro crisis: austerity (`tax +0.02`, public `cut 0.08`), youth emigration events (ie, es) | Your house is worth less than the mortgage: keep paying, sell at a loss, or walk away (credit hit). Your bank failed (savings above a guarantee are at risk). Leave for Australia or Canada? (ie, es young adults). |
| 16 | **COVID-19** | 2020 to 2022, everywhere | New disease `covid` (fatal odds rise steeply with age; under 40 almost none). NPC deaths of older relatives. 2020: `closed: ['travel', 'nightlife', 'gambling', 'gym', 'school']`, service, fame, sports and transport layoffs, `furlough` in uk, ie, ca, au, de, fr, it, es, se, jp, kr; `support` us 1200 (2020) and 2000 (2021), jp 900, small ones in br, za, ph, in, mx, ng. Market 2020 +0.18 (with a March crash popup like Black Monday), 2021 +0.27. Housing boom 2021 (`housing +0.08`). Remote work: office, tech and business careers never hit by its layoffs | Lockdown: what do you do with the time (a skill, baking, games, calling family)? Wedding postponed. A vaccine is available (2021): get it now, later, or not. Visit a grandparent through a window. |
| 17 | **The inflation surge** | 2021 to 2023, everywhere; Europe's energy crisis 2022 (fr, de, it, es, uk, ie, se) | `living +0.08` (Europe +0.12 in 2022), `rates +0.04` in 2022 and 2023, market 2022 -0.18, crypto 2022 -0.64, `housing -0.03` in 2023 | Your rent went up 15%: pay, negotiate or move. The energy bill (Europe 2022). |

(17 rows: the Cold War and the Moon landing are small "moments" around the big ones.)

**Personal-event rules.** `EV('wd_bankrun', { ages: [18, 120], when: (s) => worldHas(s, 'depression') && ..., ... })`.
`worldHas(s, id)` is true while the event is active for your country. Use `once: true` for
milestones and `cooldown` for repeatable ones. Each event's choices must have a real trade-off
(money, risk, relationships, karma), like the existing events in `32-events-adult.js`.

---

## Phase 5: country events (history, part three)

Mostly data rows (knobs and texts), with one personal event where it's marked ★. Keep each small.

| Country | Events |
| --- | --- |
| United States | Prohibition 1920 to 1933 (bartending not on the job board; a "bootlegging" option in the underworld; ★ a speakeasy night), the Dust Bowl 1931 to 1939 (part of #3), the Volcker rates 1980 to 1982 (`rates +0.08`), the 2008 foreclosure wave (part of #15) |
| Canada | WWI conscription crisis 1917, the 1998 ice storm (Montreal, Ottawa), the 2015 to 2016 oil bust (Calgary, Edmonton: `jobs -0.3`, `housing -0.06`) |
| United Kingdom | The Blitz 1940 to 1941 (London, Liverpool, Birmingham, Manchester, Glasgow, Belfast, Cardiff, Bristol: `blast`), rationing to 1954, National Service 1949 to 1960 (a peacetime call-up for men 18 to 20: ★ the brown envelope), the Great Smog of London 1952 (older relatives' death odds, health), the Winter of Discontent 1978 to 1979 (`mood -2`, public strikes), the Falklands 1982, Black Wednesday 1992 (`fxShock GBP -0.15`, `rates +0.03`), the Troubles 1969 to 1998 (Belfast: city unease via the web's `webUnease`, `mood -1`), the Brexit vote 2016 (`fxShock GBP -0.12`; ★ how did you vote? Leave, Remain or stay home, with a family argument either way, never taking a side) |
| Ireland | The War of Independence 1919 to 1921 and the Civil War 1922 to 1923 (`civil`), "the Emergency" 1939 to 1945 (neutral: rationing only), the emigration years 1950s and 1980s (★ the boat to England or America), the Celtic Tiger 1995 to 2007 (`jobs +0.3`, `pay +0.03`, `housing +0.10`), the bust 2008 to 2013 (`housing -0.15`, construction layoffs, ★ emigrate) |
| Australia | WWI and WWII volunteers (no WWI draft), Darwin bombed 1942, Cyclone Tracy (Darwin 1974), the 1991 recession, the mining boom 2003 to 2012 (Perth), the Brisbane floods 2011, Black Saturday 2009 (Melbourne), Black Summer 2019 to 2020 (Sydney, Canberra smoke and fire) |
| Mexico | The Revolution 1910 to 1920 (`civil`), the 1982 debt crisis (`fxShock MXN -0.4`), the 1985 earthquake (Mexico City), the Tequila crisis 1994 to 1995 (`fxShock MXN -0.45`, `rates +0.15`: mortgages hurt, layoffs), the 2017 earthquake (Mexico City, Puebla) |
| Brazil | Hyperinflation 1986 to 1994 (each year, a share of cash above a small buffer melts; savings are indexed and safe), ★ the Collor plan freezes savings 1990, the Plano Real 1994 (`mood +3`), the 2014 to 2016 recession, the 2014 World Cup and 2016 Rio Olympics, the 2024 floods (Porto Alegre) |
| France | The 1910 Paris flood, occupation 1940 to 1944, Indochina 1946 to 1954, Algeria 1954 to 1962 (conscripts from 1956), May 1968 (school and university closed for weeks, then minimum wage +35%: `pay +0.1` that year for service jobs), the 2003 heat wave (older relatives' death odds) |
| Germany | Hyperinflation 1922 to 1923 (`cash` 1922: 0.5, 1923: 0.99, savings and bonds too; property is safe), WWII bombing (Hamburg 1943, Cologne 1942, Berlin 1943 to 1945, Dresden 1945, plus Frankfurt, Munich, Stuttgart, Düsseldorf, Bremen, Leipzig), the hard years 1945 to 1948 (`living +0.2`, `mood -4`), the currency reform 1948 (`cash` 0.9), the economic miracle 1950 to 1966, the Berlin Wall 1961 to 1989 (Berlin moments), the Hamburg flood 1962, reunification 1990, the Elbe flood 2002 (Dresden) |
| Italy | WWI from 1915, WWII 1940 to 1943 then the Italian campaign 1943 to 1945 (north: `civil`-style unrest), the economic miracle 1958 to 1963, the Florence and Venice floods 1966, the Irpinia earthquake 1980 (Naples), the lira crisis 1992, the debt crisis 2011 to 2013 |
| Spain | The Civil War 1936 to 1939 (`civil`; Madrid, Barcelona, Bilbao, Valencia `blast`), the hunger years 1939 to 1952 (rationing), the economic miracle 1959 to 1973, the transition 1975 to 1978 (`mood +2`), Barcelona 1992 and the Seville Expo, the housing bust 2008 to 2013 (unemployment near 25%: `jobs -0.5`; ★ emigrate) |
| Sweden | Neutral in both wars (rationing only), the banking crisis 1990 to 1994 (`housing -0.12`, ★ the 500% interest rate week, 1992), Chernobyl fallout 1986 |
| Japan | The Great Kantō earthquake 1923 (Tokyo, Yokohama: severe), the war from 1937, the bombing of cities 1944 to 1945 (Tokyo, Osaka, Nagoya, Kobe, Yokohama, Fukuoka), the occupation 1945 to 1952, the high-growth era 1955 to 1973, the Tokyo Olympics 1964, the bubble 1986 to 1989 and the lost decade 1990 to 2003 (its own market: Appendix A), the Kobe earthquake 1995, the Tōhoku earthquake and tsunami 2011 (Sendai severe, Tokyo shaken) and the nuclear accident (`mood -3`, energy saving) |
| South Korea | Wartime mobilization under Japanese rule 1939 to 1945 and liberation 1945 (`mood +6`), the Korean War (#6), the Miracle on the Han 1962 to 1996, the Seoul Olympics 1988, the IMF crisis 1997 to 1998 (`fxShock KRW -0.45`, layoffs, its own market: 1997 -0.42, 1998 +0.49; ★ the gold-collecting campaign: donate your gold for the country) |
| India | Independence and partition 1947 (news only, D7), the wars of 1947, 1962, 1965, 1971 and 1999 (no draft), liberalization 1991 (`jobs +0.25` in tech, office and business, `pay +0.03` through 2010), the 2004 tsunami (Chennai, Kochi), the 2005 Mumbai flood, the 2018 Kerala floods (Kochi), ★ demonetisation 2016 (86% of your cash is suddenly invalid: queue at the bank and deposit it (lose some days and a little), or lose it) |
| Nigeria | Independence 1960 (`mood +4`), the Civil War 1967 to 1970 (`civil`; Enugu, Port Harcourt, Benin City), the oil boom 1971 to 1980, the oil bust and structural adjustment 1982 to 1986 (`fxShock NGN -0.6`), the 2016 recession, the 2023 naira float (`fxShock NGN -0.45`) |
| Philippines | The Japanese occupation 1942 to 1945 and the Battle of Manila 1945 (Manila, Quezon City, Makati), independence 1946, People Power 1986 (`mood +4`), the Luzon earthquake 1990 (Baguio), the 1997 crisis (`fxShock PHP -0.3`), Typhoon Ondoy 2009 (Manila, Quezon City) |
| South Africa | WWI and WWII volunteers, the first all-race election 1994 (`mood +5`, news; D7: no apartheid mechanics), the rand crashes 2001 and 2015, the 2010 World Cup (Johannesburg, Cape Town, Durban), load-shedding 2008 and 2014 to 2023 (`mood -1`, business costs up, ★ buy a generator or solar), the Durban floods 2022 |

Currency codes for `fxShock` are what `curOf(cc)` returns (`COUNTRY_CURRENCY` in
`50-currency.js`): USD, CAD, GBP, EUR, AUD, MXN, BRL, SEK, JPY, KRW, INR, NGN, PHP, ZAR. Ireland,
France, Germany, Italy and Spain all use EUR in the game, so a shock to one of their old
currencies (the lira in 1992) would hit all five. Until Phase 7b gives them their pre-2002
currencies, use `jobs`, `rates` and `mood` for those events and leave `fxShock` out.

---

## Phase 6: local moments (history, part four)

Small, city-level, mostly positive. A log line or one popup, a short local effect.

- **The Olympics come to your city** (two years before through the Games: `jobs +0.1`,
  `housing +0.04` for that city; the year of: ★ volunteer, buy tickets, or rent your place to
  visitors): London 1908, 1948, 2012; Stockholm 1912; Paris 1924, 2024; Los Angeles 1932, 1984;
  Melbourne 1956; Rome 1960; Tokyo 1964, 2021 (held without crowds); Mexico City 1968; Munich 1972;
  Montreal 1976; Seoul 1988; Barcelona 1992; Atlanta 1996; Sydney 2000; Rio de Janeiro 2016.
  Winter Games: Sapporo 1972, Calgary 1988, Turin 2006, Vancouver 2010.
- **Disasters in your city** (`blast` odds by severity; if you own a home there, a repair bill or
  an insurance popup; rentals may end the lease; `housing` dips then rebounds; construction jobs
  up the year after): the Halifax Explosion 1917, the Miami hurricane 1926 (also ends Florida's
  land boom), the Great Kantō earthquake 1923, the Great Smog 1952, the Hamburg flood 1962, the
  Florence flood 1966, Cyclone Tracy 1974, the Brisbane flood 1974, the New York blackout 1977, the
  Irpinia earthquake 1980, the Mexico City earthquake 1985, the Great Storm 1987 (London), the
  Luzon earthquake 1990, Hurricane Andrew 1992 (Miami), the Northridge earthquake 1994 (Los
  Angeles), the Kobe earthquake 1995, the Chicago heat wave 1995, the ice storm 1998, the Elbe flood
  2002 (Dresden), the Canberra fires 2003, the Northeast blackout 2003 (New York), the heat wave
  2003 (France, Italy, Spain), Typhoon Maemi 2003 (Busan), the tsunami 2004, the Mumbai flood 2005,
  Black Saturday 2009, Typhoon Ondoy 2009, the Nashville flood 2010, the Brisbane floods 2011,
  Tōhoku 2011, Hurricane Sandy 2012 (New York), the Calgary flood 2013, Hurricane Harvey 2017
  (Houston), the 2017 Mexico City earthquake, the Kerala floods 2018, Black Summer 2019 to 2020,
  the Texas winter storm 2021 (Houston), the Pacific Northwest heat dome 2021 (Seattle, Portland),
  the Durban floods 2022, the Porto Alegre floods 2024, the Los Angeles wildfires 2025.
- **Firsts** (a log line, `mood +1`; Phase 7 turns them into era gates): radio in the home (1920s),
  television (1950s), color TV (late 1960s), the home computer (around 1980), the web (around
  1995), mobile phones (1990s), smartphones (2007), social media (2004 to 2006).

---

## Phase 7: the future and the era (history, part five; optional)

### 7a. Generated world events after 2025

`worldFuture(s)` in `88-world.js`, under the same `history` toggle (D11). Each future year rolls,
from `s.world.future` (saved, shared by the family line):
- a recession about every 8 to 12 years (1 to 3 years: a crash in the first year, layoffs, job
  board down, housing down), sometimes a boom after it;
- a pandemic about once in 60 years (a generated disease, milder than 1918, with lockdowns);
- a disaster for your city by its traits (`coast`: storms and floods; others: heat, fire, quakes);
- names like "the Slump of 2041" or "the 2058 flu", never a real name.
When the generator owns the future, `marketYear` skips its own random crash roll in those years.
Random fictional wars stay as they are.

### 7b. Era gates (lives in past years feel like their time)

Only when `history` is on, read through one helper `eraHas(s, what)`:
- social media (`social_join` and sponsorships): from 2004;
- crypto in the investment menu: from 2010; the index fund: from 1976; online dating (if an
  action exists): from 1995;
- video games (the `gaming` habit and game-related events): from 1972;
- careers that need the modern world (software, data, IT, cyber specialty, content creator): from
  the 1970s to 2000s, per job; check `JOBS` and pick sensible years;
- medicine: cure odds × 0.75 before 1940 (no antibiotics), × 0.9 to 1970;
- money shown in the old currency before the euro (franc, mark, lira, peseta, Irish pound before
  2002; the Reichsmark before 1948 in Germany). Display only, via `curOf(cc)` and the year.
After 7b, consider flipping D2's default.

---

## Content and tone rules

- Plain, short sentences, the game's usual voice. Wry humor in light moments (gas lines, the
  euro rounding prices up), serious and gentle in tragedies (a death in the 1918 flu, a bombing).
- Never cheer a war, never mock a disaster. No graphic detail.
- Name events, places and wars. Never name real people (D3).
- D7 always: no mechanics for atrocities, no choices that make light of them, nothing keyed on
  race, ethnicity or religion.
- Political events are neutral: the game never says who was right.
- Every amount through `price()`/`fmtMoney()`. `{a|b}` for variety. Emoji ≤ Emoji 12.

## Order of work and commits

1. Phase 1 (one commit). 2. Phase 2 (one commit). 3. Phase 3 with three events wired end to end
(the Depression, WWII for uk/us/de, COVID) to prove the engine (one commit). 4. The rest of
Phase 4 (one or two commits). 5. Phase 5 (one commit per two or three countries is fine).
6. Phase 6. 7. Phase 7a, then 7b.

Before every commit: `npm run verify` green, `python3 dev/bump-versions.py`, ARCHITECTURE and
ROADMAP updated. For UI work, also run `node dev/verify/ui-smoke-run.mjs 60 2`.

---

## Appendix A: approximate stock-market returns (for `market`)

US large companies, total return, rounded. Use these for `where: 'all'` events.

| Year | Return | Year | Return | Year | Return |
| --- | --- | --- | --- | --- | --- |
| 1929 | -0.10 | 1940 | -0.10 | 2000 | -0.09 |
| 1930 | -0.25 | 1941 | -0.12 | 2001 | -0.12 |
| 1931 | -0.43 | 1942 | +0.20 | 2002 | -0.22 |
| 1932 | -0.08 | 1946 | -0.08 | 2003 | +0.29 |
| 1933 | +0.54 | 1973 | -0.15 | 2007 | +0.05 |
| 1934 | -0.01 | 1974 | -0.26 | 2008 | -0.37 |
| 1935 | +0.48 | 1975 | +0.37 | 2009 | +0.26 |
| 1936 | +0.34 | 1987 | +0.05 | 2020 | +0.18 |
| 1937 | -0.35 | | | 2021 | +0.29 |
| 1938 | +0.31 | | | 2022 | -0.18 |
| | | | | 2023 | +0.26 |

Japan's own market (`marketCc.jp`), approximate: 1986 +0.43, 1987 +0.15, 1988 +0.40, 1989 +0.29,
1990 -0.39, 1991 -0.04, 1992 -0.26, 1997 -0.21, 1998 -0.09, 1999 +0.37, 2000 -0.27, 2001 -0.24,
2002 -0.19, 2003 +0.25. Korea (`marketCc.kr`): 1997 -0.42, 1998 +0.49.

Crypto (`crypto`, roughly Bitcoin's year; only from 2010): 2014 -0.58, 2015 +0.35, 2016 +1.2,
2017 +13, 2018 -0.73, 2019 +0.9, 2020 +3.0, 2021 +0.6, 2022 -0.64, 2023 +1.55, 2024 +1.2.

## Appendix B: historical wars

`I` = intensity (1 limited to 4 total war, as in `59-military.js`). Draft years are when men of
the age band can be called; "none" means volunteers only. Results: V victory, D defeat,
C ceasefire or a negotiated end (always with an authored `end` text).

| War | Country | Years | I | Draft (ages) | Result | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| The Great War | uk | 1914 to 1918 | 4 | 1916 to 1918 (18 to 41) | V | |
| | fr | 1914 to 1918 | 4 | 1914 to 1918 (18 to 45) | V | |
| | de | 1914 to 1918 | 4 | 1914 to 1918 (18 to 45) | D | |
| | it | 1915 to 1918 | 4 | 1915 to 1918 (18 to 40) | V | |
| | us | 1917 to 1918 | 3 | 1917 to 1918 (21 to 30, then 18 to 45 in 1918) | V | |
| | ca | 1914 to 1918 | 3 | 1917 to 1918 (20 to 45) | V | |
| | au | 1914 to 1918 | 3 | none | V | conscription votes failed |
| | ie | 1914 to 1918 | 3 | none | V | still part of the UK; never conscripted |
| | in, za | 1914 to 1918 | 2 | none | V | |
| | jp, br | 1914 or 1917 to 1918 | 1 | none | V | |
| War of Independence | ie | 1919 to 1921 | 2 | none | V (the Treaty) | |
| Civil War | ie | 1922 to 1923 | 2 | none | `civil` | |
| The Revolution | mx | 1910 to 1920 | 3 | 1913 to 1916 (18 to 40) | `civil` | |
| The Spanish Civil War | es | 1936 to 1939 | 4 | 1936 to 1939 (18 to 35) | `civil` | |
| The Second World War | uk | 1939 to 1945 | 4 | 1939 to 1945 (18 to 41); women 1942 to 1945 (D5) | V | |
| | fr | 1939 to 1945 | 4 | 1939 to 1940 (20 to 45) | V | occupied 1940 to 1944 |
| | de | 1939 to 1945 | 4 | 1939 to 1945 (18 to 45) | D | |
| | it | 1940 to 1943 | 4 | 1940 to 1943 (18 to 40) | D (the armistice) | then the campaign 1943 to 1945 |
| | jp | 1937 to 1945 | 4 | 1937 to 1945 (20 to 40) | D | |
| | us | 1941 to 1945 | 4 | 1941 to 1945 (18 to 37) | V | |
| | ca | 1939 to 1945 | 3 | 1944 to 1945 (19 to 45) | V | |
| | au | 1939 to 1945 | 3 | 1942 to 1945 (18 to 35) | V | |
| | ph | 1941 to 1945 | 4 | none | V (liberation) | occupied 1942 to 1945 |
| | in, za | 1939 to 1945 | 2 | none | V | |
| | br, mx | 1942 to 1945 | 1 | none | V | |
| The Korean War | kr | 1950 to 1953 | 4 | 1950 to 1953 (18 to 35) | C | at home |
| | us | 1950 to 1953 | 3 | 1950 to 1953 (18 to 26) | C | |
| | uk, ca, au | 1950 to 1953 | 2 | uk National Service only | C | |
| | ph, fr, za | 1950 to 1953 | 1 | none | C | |
| The First Indochina War | fr | 1946 to 1954 | 2 | none | D | |
| The Algerian War | fr | 1954 to 1962 | 3 | 1956 to 1962 (20 to 27) | C | independence 1962 |
| Partition and Kashmir | in | 1947 to 1948 | 2 | none | C | D7 |
| The Sino-Indian War | in | 1962 | 2 | none | D | |
| The Indo-Pakistani wars | in | 1965; 1971 | 2 | none | C; V | |
| The Nigerian Civil War | ng | 1967 to 1970 | 3 | none | `civil` | |
| The Vietnam War | us | 1965 to 1973 | 3 | 1965 to 1972 (18 to 26; the lottery from 1969) | C | |
| | au | 1962 to 1972 | 2 | 1965 to 1972 (20; the birthday ballot) | C | |
| | kr | 1964 to 1973 | 2 | 1964 to 1973 (20 to 28) | C | |
| The Falklands | uk | 1982 | 1 | none | V | |
| The Gulf War | us, uk | 1990 to 1991 | 2 | none | V | |
| | fr, ca, it, au, es, kr | 1990 to 1991 | 1 | none | V | |
| Kargil | in | 1999 | 1 | none | V | |
| Afghanistan | us | 2001 to 2021 | 2 | none | C | |
| | uk, ca, fr, es, se | 2001 to 2014 | 1 (uk 2) | none | C | |
| | au, de, it | 2001 to 2021 | 1 | none | C | |
| | kr | 2002 to 2007 | 1 | none | C | |
| Iraq | us | 2003 to 2011 | 3 | none | C | |
| | uk, au | 2003 to 2009 | 2 (au 1) | none | C | |
| | es, ph | 2003 to 2004 | 1 | none | C | |
| | it | 2003 to 2006 | 1 | none | C | |
| | kr | 2004 to 2008 | 1 | none | C | |

Neutral in the World Wars (rationing and mood only, no war): Sweden (both), Spain (both),
Ireland (WWII, "the Emergency"), Mexico (WWI).

## Needs your call (not in this plan unless you say so)

- **Marriage laws by year** (same-sex marriage legal from: Canada 2005, Spain 2005, South Africa
  2006, Sweden 2009, Brazil 2013, France 2013, UK 2014, Ireland 2015, US 2015, Germany 2017,
  Australia 2017, Mexico 2022). Making the game block marriages before then is accurate but
  restricts players; a gentler version only adds a happy "you can finally marry" moment for a
  long-time couple.
- **Peacetime conscription** beyond the UK's National Service (South Korea today, France until
  1996, Germany until 2011, Sweden on and off).
- **Era-accurate jobs for women** (marriage bars, closed professions). Accurate, but the game
  would start blocking choices by gender; not recommended.
