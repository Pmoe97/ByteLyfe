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
| `47` | Relationships 2.0 (`47-romance.js`): open relationships, affairs that can be found out, flings who come back, romance events | No DOM. `ageUp` reaches `romanceTick` through a wrapper; `startRomance`, the hookup action and `npcTick` call into it at runtime. |
| `48` | Taboo family romance (`48-taboo.js`): opt-in adult-only (18+ both, master + subtype toggles, all default OFF), pedigree inbreeding (F stored as `p.inbred`), birth fallout, discovery events | No DOM. `ageUp` reaches `tabooTick` through a wrapper; `startRomance/marry/bornChild/pregnancyTick` call into it at runtime. |
| `49` | Cities (`49-cities.js`): city profiles (cost of living, pay, job hubs, traits), neighborhoods, local housing markets, moving, landlords, tenants, city and landlord events | No DOM. `ageUp` reaches `cityTick` through a wrapper; `financeTick`, `salaryFor`, `jobBoard`, the rentals and real-estate listings, `moveInto`, `assetTick`, emigration and job transfers call into it at runtime. |
| `50` | Currencies (`50-currency.js`): each country's currency and its yearly strength, money formatting per country, exchange when emigrating, foreign savings, currency events | No DOM. `ageUp` reaches `fxTick` through a wrapper (first phase); `runWithResult`, `createLife`, `continueAs` and the UI's `refresh` call `useCurrency`. |
| `51` | Chaos mode (`51-chaos.js`): superpowers, hero and villain careers, vampires, ascension, and their events; everything tagged `chaos` | No DOM. `ageUp` reaches `chaosTick` through a wrapper; `commitCrime` calls `powerCrimeEdge`. |
| `52` | Challenges (`52-challenges.js`): starting scenarios, goal kinds, hand-made challenges, the daily challenge and streaks | No DOM. `afterChange` calls `checkChallenge`. |
| `53` | Gambling (`53-gambling.js`): venues per city, standing and tiers, table games, horse racing, season and fight bets, poker, credit and debt collection, recovery, Silver Mesa trips, gambling events | No DOM. `ageUp` reaches `gamblingTick` through a wrapper (after Chaos); `doAction` settles a race left running; the table games in `21-activities.js` call `tableLoss`. |
| `54` | Owning the house (`54-house.js`): your book, racehorses (pets with `p.race`) and breeding, the big races, and the casino layer of the business engine, and their events | No DOM. `ageUp` reaches `houseTick` through a wrapper (after gambling); `bizForecast` calls `casinoMods` (through `industryMods`) and `companyYear` calls `casinoYear`; `settleRace` hands a race with `r.own` to `settleOwnRace`; `netWorth` adds `stableValue`. |
| `55–999` | Free for future engine files and expansions | No DOM. Must run in Node. |
| `1000+` | UI (`1000-ui-kit.js` … `1022-ui-house.js`, then `1999-boot.js`, which must stay last) | DOM. Reads the engine, never the other way round. `1007-ui-art.js` draws people and icons as SVG strings (the "Night Market" part libraries); `1008-ui-look.js` is the appearance editor. |

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

**Relationships 2.0.** `47-romance.js`. `M(s).open = { pid, since, by, jealous }` marks an open
relationship; `openWith(s, pid)` is true only while pid is still your partner, so a breakup ends it
without any cleanup. A lover's relationship record carries the affair: `sus` (how suspicious your
partner is, which sets the yearly odds of getting caught), `known` (your partner knows, because you
were open), and `hid` (when it became a secret). `startRomance` hands a second romance to
`affairBegins`, `npcTick` runs `affairYear` for each lover, and the hookup action keeps the person as a
`fling` (`makeFling`: the year you met, and the partner you cheated on, if any). Partner cheating
events in `npcTick` skip an open relationship. `romanceTick` (after `parentingTick`) builds jealousy in
open relationships and lets old flings fade. Romance actions, old and new, carry `group: 'romance'`,
and the person sheet lists them under Romance.

**Taboo family romance.** `48-taboo.js`. Strictly opt-in and adult-only: the master
`taboo` switch plus one subtype switch (`taboo_parent`, `taboo_step`, `taboo_sibling`,
`taboo_child`, `taboo_grand`, `taboo_extended`, `taboo_inlaw`, all default OFF) must both
be on, and both partners must be 18+. Teens are blocked everywhere (eligibility, `startRomance`,
dates, rekindles). `tabooTagFor` maps a person to their subtype from their stored `taboo`
flag, their relationship kind, or the blood tree (`bloodKinshipInfo` reads
`p.parents`/`p.children`, so a sibling who became a partner is still recognised); dual
labels render as "Sister · Girlfriend" (`kinTitle`). Inbreeding is a real pedigree kinship
(`tabooKinship` recursion): unrelated 0, cousin 0.0625, sibling or parent-child 0.25, and
repeat inbred matings climb fast. The result is stored as `p.inbred` (+ `p.tabooDepth`) on
each child; births apply extra miscarriage odds and a defect chance that is low the first
generation and rises sharply later. Romance start, marriage and yearly `tabooTick` apply
neutral-sim fallout (karma/fame dings, family disapproval, blocked parental blessing,
blood-safe in-law handling) plus gated discovery events.

**Cities.** `49-cities.js`. `CITY_INFO[cc][city]` is pure data parsed from `CITY_ROWS`: `size`
(metro, big, mid, small), `col` (cost of living against the country average), `wage` (pay against
the country average), `hubs` (`JOB_CATS` that hire a lot) and `traits` (capital, coast, tourist...).
Prices stay country-based (`price`); the city multiplies on top: `rentMult` for rents, `houseMult` for
home prices, `colLiving` for lifestyle costs (`livingCost`), `wageOf` inside `salaryFor`, and
`jobOpenOdds` for the job board. `s.cityMarket['cc:city'] = { idx, g, tiers }` lives at the top of the
save, made the first time a city is touched: `cityMarketYear` moves `idx` (rents and prices) around 1
each year, `houseGrowth` adds that year's `g` to a home's value, and `tiers` holds each of the four
neighborhoods' current tier (they gentrify). Neighborhood names come from `hoodNames(cc, city)`,
hashed from the city's name, so nothing about them is saved; `P(s).hood` is where you live now.
- **Renting:** a lease in `M(s).housing` also holds `city`, `hood`, `rtype`, `since`, `deposit` and the
  landlord `ll = { name, style, mood, stars, corp }`, plus `issue`, `withheld`, `owed`, `notice` and
  `inspected` while those apply. `landlordOf` makes a landlord for leases from older saves.
  `renterYear` (in `cityTick`) runs repairs, the yearly raise (capped by `tenantLaw`) and eviction
  notices; `signLease` and `leaveRental` handle moving in and out (deposits), and `rentToPay` is what
  `financeTick` charges.
- **Owning:** a house asset carries `cc`, `city`, `hood`, `units`, `rentLvl`, `mgr` and `tenants`
  (plain records, not people). `tenantsOf` turns a pre-Cities rental into one tenant. `rentRoll` is the
  rent `financeTick` collects (late payers, professional non-payers, payment plans, the manager's 8%);
  `propertyYear` runs moods, damage, move-outs, lease renewals, repair requests and evictions.
  `cityTick` allows at most two landlord or tenant popups a year; the rest resolve on their own.
- **Moving:** `relocate` moves you, your spouse and dependents (and maybe a partner), and records the
  city in `M(s).places`; `cityGo` adds the job transfer and the new home. Emigration and witness
  protection call `cityArrive`, and the `job_transfer` event calls `transferTo`.

**Currencies.** `50-currency.js`. Every amount in the engine is stored in US dollars (the same
numbers `price` makes); only the display changes. `useCurrency(s)` sets `MONEY_FMT` (declared in
`00-util.js`) to the player's currency, `{ sym, rate, post, indian }`, and `fmtMoney`, `fmtMoneyShort`
and `fmtPrice` (share prices) use it; pass a currency as the second argument to show a sum in another
one (`fmtIn(code, n)`, where the dollar reads "US$" if it's foreign). `useCurrency` runs in
`runWithResult`, at the start of every year (`fxTick`), in `createLife` and `continueAs`, and in the
UI's `refresh`, so text is always written in the currency of the moment; the "Money shown in" setting
(`META.settings.currency = 'usd'`) turns it off. Never write a "$" into text: format the amount, or
make the description a function (achievement `desc` and goal `text` may be functions, read through
`achDesc` and `goalText`).
- **Strength:** `s.fx[code] = { str, prev }` at the top of the save, around 1, rolled each year by
  `fxTick`. Display rates are fixed, so local prices don't move; strength only matters across
  borders. `rateText` and `pairText` show today's market rate.
- **Emigrating:** `exchangeOnEmigrate` multiplies cash by `strength(old) / strength(new)` less 2%,
  re-values foreign savings the same way, and turns savings in the new currency into cash.
- **Foreign savings:** `M(s).fxSave[code]` is a holding's value in your own money; `fxTick` moves it
  with the two currencies, `fxUnits` gives the foreign amount (which stays put), and `netWorth`
  includes it.

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
`tags: ['chaos']`, `['mature']`, or `['taboo', 'taboo_sibling']` (`CONTENT_TAGS` in `12-flow.js`).
`taboo` is the master switch for consensual adult-only family romance (18+ both, never
teens); the seven subtype tags (`taboo_parent`, `taboo_step`, `taboo_sibling`,
`taboo_child`, `taboo_grand`, `taboo_extended`, `taboo_inlaw`) control who is eligible.
Tagged content only appears while every one of its tags is switched on in Settings
(`META.settings.chaos` / `.mature` / `.taboo` + subtype, global across lives, all off by
default). `tagsOn(tags)` is the one check: `eventEligible`, `fireEvent` (per choice), the
answer re-check, `rollBizEvent` and `actionAvailable` all call it. A new tag needs a
`CONTENT_TAGS` entry and a boolean default in `META.settings`. The Settings toggles are
built from `CONTENT_TAGS`, with the taboo master + subtypes grouped in their own section.

**A year (`ageUp`).** Currencies → body → pregnancy → school → career → businesses and the market →
prison → money → assets → cities (rent, landlords, tenants) → fame → the people around you → the wider family → parenting →
romance → taboo family romance → royalty → the underworld →
show business → sports → courts → chaos → gambling → the house (your book and stable) → pets → milestones → story chapters → random events → new illness → death check. The order
is in `AGE_PHASES` (`25-ageup.js`).

**Health.** Health drifts toward a target set by age and fitness (`healthTarget`), and
illness and habits pull it down. Yearly death odds come from `mortality(age, health)`.
Both use `bodyAge(s, p)`, the age a body acts and looks: a vampire's stops at `p.frozenAge`.
So does `diseaseTick`, which picks new illnesses for that age.
Event age ranges, body drift and avatars use it too, so a 200-year-old vampire still gets
the events of the 30-year-old they look like.
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

**Business.** `08-data-business.js` holds the 24 industries (the Sports Franchise's seasons and titles come from `41-sports.js`, the casino's floor from `54-house.js`), `34-business.js` the engine
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
character: 72 rival firms, three per industry (`firms[id] = { name, ind, rev, margin, rep, q, val, ticker, sh,
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

**God Mode.** `28-sandbox.js` holds every edit as `Sandbox.*` (no DOM), for you and, through the
`npc*` methods, for anyone else. `npcAgeRange` keeps parents at least 14 years older than their
children and a romantic partner on your side of 18, `npcAge` removes or adds a body as someone
crosses 18, and `npcKind` only swaps friends, best friends and enemies. The God Mode sheet is in
`1005-ui-system.js`, the per-person editor in `1018-ui-godmode.js` (`SHEETS.npcEdit`, opened from
`godRow` on a person's page), and the look editor takes `'god:<id>'` for someone else. `godOn()`
reads `META.settings.godMode`; every God Mode entry point checks it.

**Chaos mode.** `51-chaos.js`. Everything is tagged `chaos`, and `chaosTick` returns at once
while the switch is off; state that already exists (powers, a vampire's frozen age) stays put.
- **Powers:** `p.powers` on any person (a nemesis has them too); `grantPower` adds one.
  `POWER_USES[power]` holds each power's uses as `[label, outcome, minAge]`. `M(s).sup` is your
  control, `outed` (secret blown) and cape career: `side`, `alias`, `rep` (ranks at `CAPE_RANK_AT`),
  `nemesis` (a person id), `wins`, `henchmen`, `team`. `capeYear` pays sponsorships into the
  finance sheet or charges for henchmen.
- **Vampires:** `p.vamp = { year, sire }` and `p.frozenAge` (see Health). `M(s).blood` holds hunger
  (rises each year; feeding lowers it; at 100 you waste away), `hunt` (hunters' interest, from
  feeding) and how many you've turned. `canConceive` refuses vampires. `cureVampire` sets the
  birth year so aging resumes from the age you looked.
- **Ascension:** `ascend` records `s.ancestor = { kind, name, year }` at the top of the save and ends
  the life with a cause starting "while" or "after"; `anc_*` events reach later generations.
- The Supernatural menu (`super` in `ACT_CATS`, added at load) opens with `chaosCard`
  (`1019-ui-chaos.js`); `chaosFacts` puts chips on people's pages.

**Challenges.** `52-challenges.js`. A definition is `{ id, name, emoji, start, goals: [[kind, n]],
stars, chaos, daily }`: `start` is a key of `CH_STARTS` (createLife options, sometimes a function,
plus an optional `setup`), and each goal a key of `CH_GOALS` (`text(n)`, `check(s, n)`, the values
`gen` may pick, and `atDeath` for goals that only count when you die). `startChallenge` makes the life
and records `s.challenge` (goals with `done` flags, and `pid`: only that character can finish it).
`checkChallenge` runs in `afterChange`, so goals tick off the moment they're met; when they're all
done, `challengeDone` records it, and a death with goals left marks it failed. `dailyChallenge(key)`
generates from a seeded generator (`seededRand(strHash(...))`), never the game's own random numbers,
so a date always gives the same challenge. Results live in `META.challenges` (`done`, the daily
`streak` and `best`, `history`), saved with the other meta folders. The UI is `1020-ui-challenges.js`.

**Gambling.** `53-gambling.js`. Venues are summary records, not companies: `s.venues[id] = { kind,
name, owner, glam, open, horses }`, indexed per city in `s.venueIdx['cc:city']`, made by `venuesIn` the
first time anything looks at a city and shared by the family line. An owner is a crime family (`fam`), a
market firm (`firm`: casino companies for some casinos, hotel companies for resorts), your own casino
company (`co`, 54-house.js) or a bookie's name (made a person, kind `bookie`, the first time you owe them:
`bookieOf`). `VENUE_KINDS` sets each kind's games, limits and credit. Your side
lives in `M(s).gamb`: `at[venueId]` (wagered, `tier` from `TIERS`, `banned`, counting `heat`), open season
`bets`, `debts`, the pending `race`, `poker`, the self-exclusion year and this year's `trip`.
- **Money in and out:** `stake` pays a bet in cash or on credit (`addDebt`), `wagered` records it and moves
  tiers and the habit. The old table games (`bjSettle`, roulette, `spinSlots`) settle their own wins and
  call `tableLoss`, which can offer a chase.
- **Races:** `raceField` posts odds (`raceOdds`, from each horse's `racePower`, less a 15% take). `runRace`
  draws the finishing order from the same strengths, so the odds are fair, then each horse's path to the
  line (front-runners go early, stayers come late, surges) as the frames the race screen draws
  (`1021-ui-gambling.js`). The bet stores the race as `M(s).gamb.race` without paying.
  `settleRace` pays at the finish line; `settleRaceQuietly` (in `doAction` and `gamblingTick`) handles a race
  nobody watched.
- **Debts:** `debtYear` adds interest and climbs `stage` 1–4 for unpaid bookie and mob debts (reminder,
  visit, `beating`, favor; family harm only with Mature on) and turns a year-old casino marker into a
  lawsuit through `getSued`.

**The house.** `54-house.js`. Everything here belongs to the current character except the horses.
- **The book:** `M(s).book` (`bk_start`) holds punters (a number, not people), prices (`vig`, a row of
  `BOOK_VIG`), `credit`, `layoff`, `legal`, the family's `tax` or `threat`, `rep`, the `owed` slate and last
  year's numbers. `bookYear` (in `houseTick`) grows or shrinks the punters toward `bookCap`, takes a handle,
  keeps the hold plus a swing that laying off narrows, pays the 15% betting tax or the family's fifth, and
  adds heat while unlicensed (`uwTick`'s raids charge `bookmaking`, a crime added here). It can raise up to
  two popups a year: the family, a deadbeat, a sharp, or `bigGame`, whose outcomes come from `gameResults`
  (the expected result is always the hold).
- **Racehorses:** pets (species `horse`) with `p.race` (see the file header). `makeRacehorse` makes one;
  `stableYear` grows the young toward `ps`/`pt` (`growHorse`, faster with a better trainer), runs a season
  for each racer (`horseSeason`: ordinary races against the home track's horses and stakes against
  `strongRivals`, places drawn by `simPlace` from the same strengths as the race screen), retires them at
  nine, foals mares in foal (`foaling`), pays stud fees (`studYear`), and charges training fees, all into
  the finance sheet. `horseValue` prices a horse with no randomness; `stableValue` adds it to `netWorth`.
  `s.studBook` (the year's public stallions) is shared by the family line. `petTick` never lets a racehorse
  run away.
- **Big races:** `BIG_RACES` (Derby, Cup, Gold Cup); `bigRacesFor` says which a horse may enter this year.
  Entering builds a field around `runnerOf(p)`, runs it with `runRace`, and stores it as `M(s).gamb.race`
  with `own: { pid, key, name, purse, won }`; `settleRace` passes it to `settleOwnRace`, which pays the purse
  and any bet and records the result on the horse.
- **Casinos:** industry `casino` (`req: { clean: true }`, checked in `industryMissing`). `co.casino` holds
  the house `edge`, the `vip` room, surveillance (`eye`), the `skim`, a family `threat`, `probation` and
  `scandals`. `casinoMods` gives `bizForecast` (through `industryMods`) a revenue multiplier, a reputation
  pull and the cost of cameras and the VIP room; `casinoYear`, called by `companyYear`, adds the whales'
  result (`last.whales`, kept out of the valuation) and costs no forecast sees (`last.special`: cheats,
  fines, the skim, arson), may audit the count room (`commission`, `revokeLicense`) and may offer a skim.
  `casinoVenue` keeps the flagship as a venue with owner `{ co }`; `visitVenue` sends you to
  `ownVenueVisit` instead of a table, and `houseTick` hands the venue on once the casino isn't yours.

**Saving.** `29-save.js` wraps the Perchance `kv-plugin` (`root.kv`), falling back to
`localStorage`, then memory. Folders: `saves` (one JSON state per life), `rewind` (the last
5 Time Machine snapshots), `meta` (index, settings, achievements, Hall of Lives, challenges).

## Adding content

- **An event:** add an `EV(...)` to the right `30–33` file. Return outcome text from each
  choice. Use `ctx: (s) => someone(s, ['friend'])` to involve a person (`c.pid`).
- **A story or a holiday:** add a `STORY(...)` to `43-stories.js` or a `HOL(...)` to `44-holidays.js`.
- **A job:** add an entry to `JOBS` in `04-data-careers.js`. Requirements are data
  (`req: { edu, majors, degree, trade, smarts, looks, sk, license, clean, drink, age, maxAge }`).
- **An activity:** `defAction` in `21-activities.js` with a `cat` from `ACT_CATS`.
- **An illness, crime, pet, car class, house type, vacation:** add a row to the data file.
- **Absurd/supernatural, extra-dark, or taboo content:** give the event, choice or action
  `tags: ['chaos']`, `tags: ['mature']`, or `tags: ['taboo']` (+ the matching subtype tag,
  e.g. `['taboo', 'taboo_sibling']`). Standard BitLife-level content (affairs, murder,
  addiction) stays untagged. Romantic content still needs its own adult-only `when`, because
  tags don't check age — taboo content additionally requires 18+ both in its `when` via
  `tabooRomanceAllowed`.

Run `npm run verify` after any engine or content change. The simulator reports events that
never fired and actions that never ran, which usually means a `when` that can't be true.

## Verify tools

| Tool | What it does |
| --- | --- |
| `dev/verify/sim-lives.mjs` | Plays N random lives (with heirs) through the real engine with a random-choice bot. Checks stats stay 0–100, no NaN anywhere, no dangling people, no `undefined`/`NaN` in any text, handlers exist, export/import round-trips. Each life switches every content tag on or off at random and fails if anything tagged shows up while its tag is off. Persona lives steer the first generation into rare paths so they get tested too: one life in ten is born royal, and others get a sports career at 19, a fame career at 20, the streetwise skill to get into the underworld at 18, or a judge or lawyer job at 36, a chaos persona (Chaos switched on) gets powers at 14, becomes a hero or a villain at 18 and, every other time, a vampire at 45 who feeds when hungry and walks into the sunrise at 130, one life in ten plays a challenge (hand-made, daily or random), and a city persona rents at 20, moves city at 26 and 41, and at 30 buys a duplex to live in plus two homes to rent out, then plays landlord and tenant every year. Also checks that no building holds more tenants than units, and that a life that never lived in the US never shows a plain "$123" (one life in seven shows US dollars by setting). Prints a balance summary, including businesses, the courts, the family and cities, and lists events that never fired, actions that never ran and story chapters never reached. The underworld persona gambles too, with a bookie tab at 25, and owns the house: half of them run a book from 23, the other half buy two racehorses at 30 and open a casino at 35, then use Track & Book, racehorse or casino actions most years. Racehorses' numbers stay in range and a book always has punters. Flags: `--shard k/n` plays lives k, k+n, …; `--json <file>` writes the raw numbers; `--merge <files>` adds shards up and prints one summary. |
| `dev/verify/tags.mjs` | Content tags: every tag in use is in `CONTENT_TAGS` with a Settings default, and the filters hide tagged events, choices and actions (checked on fixture content, so it works before anything is tagged). Prints how much content carries tags. |
| `dev/verify/taboo.mjs` | Taboo gates: master + 7 subtype defaults OFF, per-kind gate matrix (master-only / subtype-only / wrong-subtype / teen-player / teen-partner all stay closed), tree persistence when a sibling becomes a partner, pedigree F (sibs 0.25, cousins 0.0625, second-gen 0.375), birth tallies, event gating (tag + real partner), dual kin label, no-leak on a generated family. |
| `dev/verify/cities.mjs` | Cities: every city has a profile and four stable neighborhood names; pay, rents and home prices follow the city; tech hubs out-hire small cities; moving takes your spouse and kids and returns your deposit; Germany caps raises at 3%; an expired notice ends a lease; a duplex holds you plus one tenant; background checks reveal the same applicants; unpaid rent leads to eviction; old saves get tenants and landlords. |
| `dev/verify/currency.mjs` | Currencies: every country has one; local formats (₹8,30,000 and ₹8.3L, 5,000 kr, -£250, ¥7.5M); the US-dollar setting; forty years of a Japanese life with no stray "$"; strengths stay in bounds and average about 1; emigrating converts at the strength ratio less 2% (nothing inside the eurozone, savings in the new currency come along free); foreign savings cost 1.5%, ride the currencies and keep their foreign amount; trips abroad cost more with weak money. |
| `dev/verify/chaos.mjs` | Chaos mode: every Chaos event and action is tagged; with the switch off the menu is empty and the tick does nothing; powers never repeat and kids don't see the casino uses; going public makes you famous; picking a side names you and makes a nemesis with powers; reputation climbs the ranks; outed heroes earn sponsorships; a well-fed vampire reaches 150 with a 30-year-old body, can't have children, can't turn anyone under 18, and a cure resumes aging; ascending as an archangel ends the life with the Archangel title and the next generation hears from them. |
| `dev/verify/challenges.mjs` | Challenges: every start and goal exists; a date always gives the same daily and another date another one; the starts (broke, royal, orphan, sickly, prodigy) set up what they say; goals complete when met and the challenge counts once; dying without it fails it; "die broke" only counts at death; daily streaks build, reset after a gap and ignore replays; the Chaos challenge hides while Chaos is off. |
| `dev/verify/house.mjs` | Owning the house: a standard book keeps about 5% of what's bet; an unlicensed book draws heat and a licensed one none; a felony blocks the license and some countries have none; credit fills the slate; a family eventually asks for its fifth and takes it; a raid on a bookie is a bookmaking charge; prison ends an unlicensed book; the big game's expected result is the hold and laying off locks a profit; a yearling from the sale is a named pet with a pedigree that goes into training at two and grows toward its ceiling; great horses win far more than poor ones; at nine they retire to the broodmare band or stud; a mare bred to your stallion foals next year with both parents' blood; horses count toward net worth and never run away; only three-year-olds run the Derby, once; the Gold Cup needs a stakes win; a big race pays its purse at the finish and goes on the record; a champion wins the Derby often but not always; a casino needs a clean record, has a venue in its city you can't gamble in, moves its revenue with the house edge, wins more whale years than it loses, often loses its license over a skim, and casino chains own casinos in other cities. |
| `dev/verify/gambling.mjs` | Gambling: every city has a bookie and Silver Mesa its casinos and resorts; venues persist and belong to crime families or hotel companies; wagering climbs to Whale and the jet is free; bookies lend and the app doesn't; race odds carry a take, every horse finishes once and never runs backwards, the payout waits for the finish and another action settles it; season bets pay when the season is played; debts escalate and grow; 400 beatings break bones far more often than they kill; family is untouched with Mature off; markers become lawsuits; the self-exclusion list shuts casinos but not bookies; counting cards bans you across the chain; the main event is only in Silver Mesa. |
| `dev/verify/sim-business.mjs` | Business balance report (add an industry id as the third argument to run just that one): every industry run 20 years under a sensible owner (who also franchises and buys a small rival when flush) and a hands-off owner. Survival, profit, size, IPO readiness, franchising and acquisitions at years 1/5/10/20. |
| `dev/verify/emoji-audit.mjs` | Fails on emoji newer than Emoji 12, which render as boxes on Windows 10. |
| `dev/verify/godmode.mjs` | God Mode's per-person rules: parent and child ages, a spouse never under 18, bodies removed and restored across 18, clean names, clamped stats, trait conflicts and the limit of four, age limits on jobs, money, education, gender, orientation and home, and which relationships can change kind. |
| `dev/verify/run-all.mjs` | `npm run verify`: the syntax check (in-process), then every other check as its own process, in parallel (one per core, `VERIFY_JOBS=n` to cap it), with each check's output printed when it finishes. The 300-life simulator is split into shards (a count that shares no factor with 10, so the personas spread evenly) and merged into one summary. About a minute on 12 cores. |
| `dev/verify/ui-smoke.js` | Paste into the browser console: plays 60 years through the real UI, opening every sheet. |
