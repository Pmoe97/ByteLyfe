# Architecture

> Living document. Update it when a file is added, renamed, or reordered.

## Layout

```
index.html                 Perchance HTML panel: links, plugin bridge, <script src> tags (the load order)
main.pjs                   Perchance lists panel: $meta, kv-plugin import
src/                       stands in for Perchance's top-level file-tree container
  src/                     the folder you zip and upload to Perchance
    srcfiles/js/N-*.js     the game, in load order (00–999 engine, 1000+ UI)
    srcfiles/css/NN-*.css  the stylesheet, in cascade order
local-dev/                 dev server + Perchance shim (not shipped)
dev/verify/                Node harnesses + browser smoke test (not shipped)
ref/                       these docs (not shipped)
```

Same layout as Slice-of-Life and FreeUseOfficeClicker, so a Perchance download/upload
round-trips with no path changes.

## Load order and the rules that keep it working

The JS files are **classic scripts sharing one global scope**. A top-level
`function`/`const` in any file is visible to every later file. The number prefix is the
load order, and `index.html`'s `<script>` tags are the source of truth.

| Range | Layer | Rule |
| --- | --- | --- |
| `00` | Utilities (`rand`, `pick`, `vary`, money formatting) | Pure |
| `01–08` | Data tables (countries, careers, diseases, crimes, assets, industries…) | Pure data, no logic at load |
| `10–29` | Engine | **No DOM.** Must run in Node. |
| `30–33` | Event content (`EV(...)` calls) | Uses engine helpers at runtime only |
| `34–35` | Business engine and company events | No DOM. `ageUp` reaches `businessTick` through a wrapper because it loads later. |
| `36` | Looks (`36-looks.js`): a face for everyone (`p.look`), a body for adults (`p.body`) | No DOM. Bodies only exist from `ADULT_AGE` (18). |
| `37` | The market (`37-market.js`): rival companies, the stock market, buying companies | No DOM. `businessTick` calls `marketTick` every year. |
| `38` | Royalty (`38-royalty.js`): the crown, succession, royal actions and royal events | No DOM. `ageUp` reaches `royalTick` through a wrapper; `createLife` and `continueAs` call into it at runtime. |
| `39` | The underworld (`39-underworld.js`): crime families, heists, heat, underworld careers, black market, street racing, and their events | No DOM. `ageUp` reaches `uwTick` through a wrapper. |
| `40` | Show business (`40-fame.js`): named works, charts, deals, agents, awards, royalties, talk shows and fame events | No DOM. `ageUp` reaches `showbizTick` through a wrapper. |
| `41` | Sports (`41-sports.js`): leagues and seasons, contracts, fighter rankings, racing, coaching and front-office careers, franchise titles, sports events | No DOM. `ageUp` reaches `sportsTick` through a wrapper; `specialApply` calls `startSportsCareer`. |
| `42` | Courts (`42-courts.js`): lawsuits, settlements, trials and appeals, small claims, a judge's docket and appointments, lawyers' clients, courts events | No DOM. `ageUp` reaches `courtTick` through a wrapper. |
| `43` | Story chains (`43-stories.js`): the `STORY` engine and multi-year stories | No DOM. `ageUp` reaches `storyTick` through a wrapper. Each story's opening is an `EV`. |
| `44` | Holidays and seasons (`44-holidays.js`): `HOL`, country holidays, climate-aware seasonal events | Event content. |
| `45` | The wider family (`45-family.js`): relatives made on demand, in-laws, family life, family events | No DOM. `ageUp` reaches `familyTick` through a wrapper; `marry`, `endRomance` and `continueAs` call into it at runtime. |
| `46` | Parenting (`46-parenting.js`): kids' schools, child acting and music, homework and discipline, arranged marriages, heirs and grooming, parenting events | No DOM. `ageUp` reaches `parentingTick` through a wrapper; `continueAs`, `estateShares` and the will call into it at runtime. |
| `46–999` | Free for future engine files and expansions | No DOM. Must run in Node. |
| `1000+` | UI (`1000-ui-kit.js` … `1014-ui-parenting.js`, then `1999-boot.js`, which must stay last) | DOM. Reads the engine, never the other way round. `1007-ui-art.js` draws people and icons as SVG strings (the "Night Market" part libraries); `1008-ui-look.js` is the appearance editor. |

- **Function hoisting stops at the file edge.** Code that runs at *load time* (top-level
  statements, like `const AGE_PHASES = [bodyTick, …]`) can only use names from earlier
  files. Calls made later (from a click, from `ageUp`) can use anything.
- The Node harness (`dev/verify/loadgame.mjs`) reads the script tags from `index.html` and
  loads every file numbered below 1000. There is no second list to keep in step. A new engine
  file only needs its `<script>` tag (before the UI tags).
- Bump the file's `?v=N` in `index.html` whenever you change it.
- Never put square or curly brackets in `index.html` **markup**: Perchance evaluates them
  in the HTML panel. Inside `<script>` tags they are fine.

## The engine in one page

**State.** One save is one family line (`s`). `s.people` holds every person who matters,
including the player. `s.player` (`M(s)`) holds what only the current character has:
money, school, career, relationships (`rels[pid] = { kind, rel, since }`), assets, loans,
diseases, prison, skills, goals. Continuing as your child rebuilds `s.player` for the heir
(`continueAs`). Accessors: `P(s)` player person, `M(s)` player block, `A(s)` age.

**Popups.** Everything shown as a dialog is a plain-JSON popup in `s.pending`. A popup with
a `handler` calls `HANDLERS[name](s, ctx, value, input)` when a choice is picked
(`onChoice(name, fn)` registers one). Popups save with the game, so handlers must only rely
on `ctx` (ids, numbers), never closures.

**Actions.** Every menu entry is `defAction({ id, cat, label, emoji, target, when, run, sub })`.
The UI builds menus from `actionList(s, cat, target)` and the bot in `sim-lives.mjs` uses
the same registry, so a new action is tested for free.

**Results.** Actions and handlers return outcome text (or `{ text, title, emoji, tone,
quiet, nolog, person }`). `runWithResult` logs it, measures what changed (the chips under
each line), and shows it next, ahead of anything already queued.

**Events.** `EV(id, { ages, w, when, ctx, emoji, text, choices | auto, once, cooldown, prison })`.
`rollYearEvents` fires one to three eligible events per year. `{a|b|c}` in any text picks
one option at random (`vary`). Conditions are checked again when the player answers, so an
event can't act on a job you lost in the meantime.

**The wider family.** `45-family.js`. Relatives are made the first time something looks for
them, never at birth: `ensureRelatives` (your aunts and uncles, their spouses and kids, your
nieces and nephews), `ensureInlaws` (a partner's parents and siblings) and `ensureTreeFor` (anyone's
family tree). `p.kin` marks a person whose parents and siblings have been made, `p.kids` an aunt or
uncle whose children have. Your relatives join `M(s).rels` as `aunt`, `cousin` and `nibling`;
in-laws, your siblings' spouses and your children's spouses as `inlaw`, and `kinTitle`
(`13-people.js`) works out which in-law from the tree ("Future mother-in-law", "Son-in-law").
Relatives made only for someone else's tree carry `p.tree = <their id>`, and `gcPeople` keeps them
while it keeps that person. `familyTick` (after `npcTick`) runs siblings', cousins' and nieces' and
nephews' promotions, weddings, babies and divorces. `continueAs` calls `rebuildExtended`.

**Parenting.** `46-parenting.js`. Choices are stored on the child: `p.school = { kind, name, paid, free }`
(private, boarding or homeschool, ages 5 to 17; no `p.school` means public), `p.stage` (a child
performer's fame, earnings, trust and where the pay goes), `p.groom` and `p.mobGroom` (years learning
the business or the family trade) and `p.arranged`. At boarding school `p.flags.awayFromYou` is set,
and `dependents` (`16-money.js`) skips them. `M(s).heir` is the named heir. `parentingTick` (right
after `familyTick`) asks where a four-year-old will go to school, charges tuition onto this year's
finance sheet, runs gigs and burnout, and drops an heir who has died. Parenting actions are ordinary
person actions with `group: 'parent'`, and the person sheet lists them under Parenting. In
`continueAs`, the named heir takes the companies even when you continue as another child
(`passBusiness`, which turns them into market rivals with `companyToFirm`). A crime family goes to the
heir or to an underboss (`passMob`; if you are the heir, a popup asks first). `childLegacy` carries
fame, a trust fund, skills and the school into the new life.

**Stories.** `STORY(id, { title, ages, w, when, ctx, chapters })` in `43-stories.js` is a chain of
events across years. The `start` chapter is registered as an ordinary event (`st_<id>`, once per
life), so it rolls with the year's events. A choice calls `nextChapter(s, st, 'name', lo, hi)` to
continue the story lo..hi years later; a choice that doesn't ends it. Open stories live in
`M(s).stories = { id: { ch, at, d } }`, where `d` is the story's own JSON data (names, ids,
amounts). `storyTick` runs just before `rollYearEvents` and fires every chapter that's due, as a
popup (`choices`) or a logged line (`auto`). A chapter is skipped, ending the story, when its
`when` fails or its person (`d.pid`) has died, and it waits while you're in prison.

**Holidays.** `HOL(id, countries, def)` in `44-holidays.js` is `EV('hol_' + id, def)` limited to
the countries that celebrate it (`null` = everywhere), with a two-year cooldown. It counts the
holidays you celebrate. Seasonal events use climate lists (`SNOWY`, `STORMY`, `SOUTHERN`).

**Content tags.** Events, single event choices, company events and actions can carry
`tags: ['chaos']` or `['mature']` (`CONTENT_TAGS` in `12-flow.js`). Tagged content only
appears while every one of its tags is switched on in Settings (`META.settings.chaos` /
`.mature`, global across lives, both off by default). `tagsOn(tags)` is the one check:
`eventEligible`, `fireEvent` (per choice), the answer re-check, `rollBizEvent` and
`actionAvailable` all call it. A new tag needs a `CONTENT_TAGS` entry and a boolean default in
`META.settings`. The Settings toggle is built from `CONTENT_TAGS`.

**A year (`ageUp`).** Body → pregnancy → school → career → businesses and the market →
prison → money → assets → fame → the people around you → the wider family → royalty → the underworld →
show business → sports → courts → pets → milestones → story chapters → random events → new illness → death check. The order
is in `AGE_PHASES` (`25-ageup.js`).

**Health.** Health drifts toward a target set by age and fitness (`healthTarget`), and
illness and habits pull it down. Yearly death odds come from `mortality(age, health)`.
A cause of death is the phrase after "died". `deathPhrase` adds "of" or "in" ("of a
stroke", "in a car crash"). A cause that starts with while/after/during/in is used as written
("in single combat with a goose").

**Prison.** `M(s).prison` holds the sentence, `behavior` (parole odds), gang and juvie flag.
Contraband (`CONTRABAND` in `07-data-crime.js`) sits in `prison.stash` and disappears with
the prison record on release or escape. `contrabandPrice` rolls resale prices once a year
into `prison.market`. `spikeContraband` raises them, and `bustStash` confiscates the stash
and applies the penalty.

**Money.** Yearly: salary after tax, pensions, rents, sponsorships in; lifestyle, rent,
upkeep, kids, pets, habits, loan payments out. Debt accrues interest, and hopeless debt
triggers a forced bankruptcy. `M(s).lastFinance` keeps the breakdown for the Finances sheet.

**Business.** `08-data-business.js` holds the 23 industries (the Sports Franchise's seasons and titles come from `41-sports.js`), `34-business.js` the engine
and `35-events-business.js` the company events. Staff are *pools per role* (`team[role] =
{ n, skill, pay, morale }`), not people, so a company scales from one food truck to an
airline without bloating saves. `bizForecast(s, co)` is the one P&L model. It runs the year
(`companyYear`), feeds the company sheet's projection, prices "one more hire"
(`marginalProfit`), and steers autopilot hiring (`autoStaff`, which keeps a hire only if the
forecast improves).
- **Demand** comes from reputation, product quality (with freshness), the pricing tier and
  sales staff, and falls with each extra location (saturation).
- **Reputation** settles toward what quality and marketing earn.
- **Valuation** is a revenue multiple driven by a smoothed growth trend.
- **Industry numbers:** each industry's `unit` (revenue per worker) is set so a new business
  breaks even at about 45% demand. Run `node dev/verify/sim-business.mjs` after changing any of them.
- **Owner pay:** your salary is queued in `M(s).bizIncome` and taxed by `financeTick`.
- **Inheritance:** companies are left out of the estate split and pass whole to the heir in `continueAs`.
- **Franchising:** `co.franchise = { outlets, fee, since }`. `franchiseYear` grows or shrinks
  the outlet count each year. `franchiseFees` (outlets × an outlet's sales × royalty) is
  revenue in `bizForecast` with a 15% support cost. Royalties count three times toward the
  valuation, and a big network pulls the reputation target down a little.

**Market.** `37-market.js` keeps `s.market` at the top level of the save, so it outlives each
character: 66 rival firms (`firms[id] = { name, ind, rev, margin, rep, q, val, ticker, sh,
price, beta, div, … }`) plus this year's market return (`ret`) and index. Firms are summary
numbers, not companies, so they stay cheap to save. `marketTick` (from `businessTick`) rolls
the year's return once (`marketYear`). Then each firm's revenue moves with the market and its
own reputation. A listed firm's price moves with the market (scaled by `beta`), its own
growth, and a pull toward its fair value. Firms can go public, and a failed firm is replaced
by a new one. Your shares are `M(s).stocks[firmId] = { sh, cost }` and count in `netWorth`.
The index fund in `financeTick` uses the same `marketReturn`. Buying a firm turns it into a
normal company (`firmToCompany`) or merges it into yours (`mergeFirm`). Locations and staff
pools are rebuilt from the firm's revenue (`firmLocations`, `staffLocations`).

**Royalty.** `38-royalty.js` keeps `s.crown` at the top level of the save, so the crown outlives
each character: the country, the house, the reigning `monarch` (a person id), the `reigns`
history (for regnal numbers), and `abolished`.
- **Royal blood:** `p.royal` marks the first royals; descendants inherit it through
  `royalBlood`. `royalTick` also writes it onto close family each year, so it survives
  `gcPeople`, which always keeps the monarch.
- **Succession:** `successionLine` walks up from the monarch to the oldest royal ancestor it
  can find, then lists the living royal descendants eldest-first. `p.renounced` removes a
  person and their line, and `p.abdicated` removes a former monarch.
- **Titles:** `royalTitle` and `royalName` work out titles from that line, so nothing is
  stored per person.
- **When the crown passes:** `crownCheck` or `passCrown` moves it on when the monarch dies
  (`royalTick` runs after `npcTick`, so it happens the same year), abdicates, or dies as the
  player (`continueAs` calls `crownCheck`).
- **The player's standing:** `M(s).royal = { approval, patronages }`. The allowance is paid in
  `royalTick` and added to that year's finance sheet.

**Underworld.** `39-underworld.js` keeps the rival crime families in `s.underworld.families`
(three per country, created when first needed: `familiesIn`), shared by the whole family
line. Everything about the current character is in `M(s).uw`, created on first contact:
- **Family standing:** family, rank, respect, made, crew, turf, rackets, and an enemy family.
- **Careers:** dealer rank and rep, contracts done (`hits`), and the loan `book`.
- **Black market:** the `collection` and the museum.
- **Heat** (0-100), and whether you're an informant (`rat`).

`uwTick` runs after `financeTick`, so racket income, crew payroll, loan interest and museum
tickets go straight into money and that year's finance sheet. It also handles the boss
falling, getting made, promotions, dealer rank-ups, loot gaining value, heat cooling, and
raids (an `arrest` with a crime that fits what you've been doing). The new crimes (racketeering,
kidnapping, trafficking...) are rows in `CRIMES`, so trials and sentencing work unchanged.

**Show business.** `40-fame.js` turns each fame career into a kind of work (`KIND_OF_JOB`:
musician → album, author → book, comedian → special, director → film, producer → record,
actor → role, model → campaign). `sb_make` replaces the old big-break action.
- **Releasing:** a release goes through popups (genre → budget → title, or casting offers for
  roles and campaigns) to `releaseWork`, the one reception model.
  - Quality comes from the career skill, budget, deal polish, genre mastery and agent.
  - Critics see quality plus noise.
  - Commercial pull comes from quality, fame, reach (from the deal or your own company, the
    agent, and prestige or film budget) and the genre trend (`s.trends`, rolled yearly).
  - Pull sets the chart peak and gross revenue. The player gets the royalty `share` (or a fee),
    and hits can call `promote`.
- **Storage:** `M(s).sb` holds the works (the last 60), agent tier, deal, genre mastery and
  awards.
- **Each year:** `showbizTick` (after `financeTick`) pays back-catalog royalties into that
  year's finances and runs award season for last year's releases.
- **UI:** the "Your work" section of the Work sheet and the `works` sheet are in
  `1010-ui-fame.js`.

**Sports.** `41-sports.js` keeps one 12-team league per sport in `s.leagues`, shared by the family line, and
the current character's sports life in `M(s).sp` (sport, team, contract years, seasons, career
totals per sport, honors, `fighter` and `racer` records).
- **Seasons:** `sportsTick` runs after `financeTick` and plays one season for the current sports
  career. `playSeason` updates every team's rating and record and crowns a champion from the
  top four. Your effect on your team comes from `playerRating` (athlete) or your skill and
  roster moves (coach, front office).
- **Athletes:** stat lines come from each sport's `season(rating, minutes)`. Free agency fires
  when the contract runs out.
- **Fighters:** they fight through `sp_fight`. Opponent strength scales with rank, and a
  champion needs near-peak skill. Rank and belt set the career level directly (`setLevel`), so
  `specialTick` skips random promotions for fighters and racers.
- **Racers:** each race simulates a 20-car field (rating × 0.6 + car × 0.4 + noise), and points
  decide the championship.
- **Coaching careers:** coach and front-office jobs use `special: 'coach'`.
- **Franchises:** a franchise you own (`sportsteam` industry) gets a yearly title chance from
  its product quality and reputation.

**Courts.** `42-courts.js` keeps everything in `M(s).court`, created on first contact: open
`cases`, the last 40 finished ones (`past`), a judge's `docket` and `bench` record, and a lawyer's
trial `practice`.
- **A case** is plain JSON: which side you're on, a `type` from `CASE_TYPES`, who the other side
  is (a person `pid`, a market `firm`, or just a name), the `claim`, its hidden `merit` (how good
  it really is for you), the other side's lawyer edge (`their`), your `lawyer` (a `COUNSEL` id)
  and the trial year. `co` means one of your companies is the defendant: it pays the fees and any
  judgment. Every suit starts at `chooseCounsel`, which files it when a lawyer is picked.
- **The odds:** `caseOdds` turns merit, both lawyers' edges, karma and charisma into a win chance.
  Representing yourself uses `selfDefense` (in `20-crime.js`, shared with criminal trials): a law
  degree, years as a lawyer or judge, and charisma.
- **Each year** (`courtTick`, after `financeTick`), `caseYear` bills the yearly fee into the finance
  sheet, drops cases whose other side is gone, rolls discovery (merit moves), and either makes a
  settlement offer or, in the trial year, opens the testimony popup. `verdict` sets the judgment;
  the loser may appeal, and `appealRuling` decides it the next year. `finalize` moves the money and
  closes the case.
- **Judges:** `judge` is `appointed` in `JOBS`, so `careerTick` never promotes it and it gets no
  raise or promotion requests. `judgeYear` handles the backlog and the appointments instead, up to a
  nomination and the `ctConfirm` hearing. The docket (`docketOf`) is rolled once a year for the
  judge's rung: criminal and civil cases, appeals, then `LANDMARKS`.
- **Lawyers** take two clients a year (`ct_client`), each a two-step popup.

**Saving.** `29-save.js` wraps the Perchance `kv-plugin` (`root.kv`), falling back to
`localStorage`, then memory. Folders: `saves` (one JSON state per life), `rewind` (the last
5 Time Machine snapshots), `meta` (index, settings, achievements, Hall of Lives).

## Adding content

- **An event:** add an `EV(...)` to the right `30–33` file. Return outcome text from each
  choice. Use `ctx: (s) => someone(s, ['friend'])` to involve a person (`c.pid`).
- **A story or a holiday:** add a `STORY(...)` to `43-stories.js` or a `HOL(...)` to `44-holidays.js`.
- **A job:** add an entry to `JOBS` in `04-data-careers.js`. Requirements are data
  (`req: { edu, majors, degree, trade, smarts, looks, sk, license, clean, drink, age, maxAge }`).
- **An activity:** `defAction` in `21-activities.js` with a `cat` from `ACT_CATS`.
- **An illness, crime, pet, car class, house type, vacation:** add a row to the data file.
- **Absurd/supernatural or extra-dark content:** give the event, choice or action
  `tags: ['chaos']` or `tags: ['mature']`. Standard BitLife-level content (affairs, murder,
  addiction) stays untagged. Romantic content still needs its own adult-only `when`, because
  tags don't check age.

Run `npm run verify` after any engine or content change. The simulator reports events that
never fired and actions that never ran, which usually means a `when` that can't be true.

## Verify tools

| Tool | What it does |
| --- | --- |
| `dev/verify/sim-lives.mjs` | Plays N random lives (with heirs) through the real engine with a random-choice bot. Checks stats stay 0–100, no NaN anywhere, no dangling people, no `undefined`/`NaN` in any text, handlers exist, export/import round-trips. Each life switches every content tag on or off at random and fails if anything tagged shows up while its tag is off. Persona lives steer the first generation into rare paths so they get tested too: one life in ten is born royal, and others get a sports career at 19, a fame career at 20, the streetwise skill to get into the underworld at 18, or a judge or lawyer job at 36. Prints a balance summary, including businesses, the courts and the family, and lists events that never fired, actions that never ran and story chapters never reached. |
| `dev/verify/tags.mjs` | Content tags: every tag in use is in `CONTENT_TAGS` with a Settings default, and the filters hide tagged events, choices and actions (checked on fixture content, so it works before anything is tagged). Prints how much content carries tags. |
| `dev/verify/sim-business.mjs` | Business balance report (add an industry id as the third argument to run just that one): every industry run 20 years under a sensible owner (who also franchises and buys a small rival when flush) and a hands-off owner. Survival, profit, size, IPO readiness, franchising and acquisitions at years 1/5/10/20. |
| `dev/verify/emoji-audit.mjs` | Fails on emoji newer than Emoji 12, which render as boxes on Windows 10. |
| `dev/verify/run-all.mjs` | Syntax check + emoji audit + content tags + 300-life sim (`npm run verify`). |
| `dev/verify/ui-smoke.js` | Paste into the browser console: plays 60 years through the real UI, opening every sheet. |
