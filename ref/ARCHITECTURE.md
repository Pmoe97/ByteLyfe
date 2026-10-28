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
| `09` | History (`09-data-history.js`): the real events of 1900 to 2025 as rows (`H(id, {...})`), and the two illnesses they bring | Pure data. The row format is documented at the top of the file. |
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
| `55` | School life (`55-school-life.js`): teachers and the principal, the report card by subject, popularity, the school record, bullies, midterms, club and team seasons, the entrance exam, college applications and scholarships, school events | No DOM. `14-school.js` calls `startSchoolLife`, `schoolPull`, `schoolYearLife`, `newTeacher`, `endSchoolLife` and `highSchoolFinale`; it wraps a few person actions (pranks on teachers, picking on classmates, fights) at load. |
| `56` | Growing up at home (`56-growing-up.js`): Playtime, allowance and chores, asking your parents, house rules, grounding, curfew, sneaking out, home events | No DOM. `ageUp` reaches `youthTick` (home, then lessons) through a wrapper, after `houseTick`. Grounding wraps the `when` of the outings in `GROUNDED_BLOCKS` at load. |
| `57` | Classes and lessons (`57-lessons.js`): 52 disciplines with level ladders, teachers, practice, fees, level tests, recitals and competitions, lesson events | No DOM. `youthTick` calls `lessonsYear`; the instrument event in `30-events-young.js` calls `enrollLesson`. |
| `58` | Zoo & Wildlife Sanctuary (`58-zoo.js`): the zoo layer of the business engine: habitats, animals, breeding, breaches, admission | No DOM. `bizForecast` calls `zooMods` (through `industryMods`) and `companyYear` calls `zooYear`. |
| `59` | Military depth (`59-military.js`): wars per country, branches and specialties, deployments and defining moments, the draft, desertion and courts-martial, veterans' benefits, and their events | No DOM. `ageUp` reaches `militaryTick` through a wrapper (before `careerTick`); `specialTick` calls `militaryYear`, `specialApply` calls `startMilitaryCareer`, `leaveJob` calls `milLeft`, `financeTick` calls `vetIncome`, `medPrice` calls `vetCareMult`, `financeTerms` calls `vetLoanTerms`, `pensionFor` calls `militaryPension`, the interview and election odds call `vetHireEdge` and `vetElectionEdge`. |
| `60` | Secret agent (`60-spy.js`): the intelligence career, cover identities, missions and twists, assets, moles, double agents, capture, getting burned, memoirs, and their events | No DOM. `ageUp` reaches `spyTick` through a wrapper (before `careerTick`); `specialTick` calls `spyYear`, `specialApply` calls `spyApply`, `leaveJob` calls `spyLeft`. Reads the military layer (`mil`, `activeWar`, `FOES`) for veterans' hiring edge and mission foes. |
| `62` | The web (`62-web.js`): the secrets ledger, reputation, NPC-to-NPC ties, hearsay, the fact bus, neighborhood unease, and their events | No DOM. `ageUp` reaches `webTick` through a wrapper (after `youthTick`). `gcPeople` calls `webPrune`; `commitCrime`, `arrest`, the assault and murder actions, `affairBegins`, `caughtPopup`, `hookupFoundOut`, the hookup action and `promote` announce facts with `webFact`; interviews read `webHireEdge`, criminal trials read `webJuryEdge`, `cityMarketYear` reads `webUnease`, `continueAs` calls `webHeir`. |
| `63` | Investigations (`63-cases.js`): a case file for every crime, detectives who are people, evidence, series, interviews and warrants, going cold, skipping town, and the new crimes (arson, a romance scam, insider trading) | No DOM. `ageUp` reaches `invTick` through a wrapper (right after `webTick`). Listens on the fact bus (`crime_clean`, `crime_messy`, `killed`, `assault`, `extorted`); `62-web.js` calls `invTip` and `invScrub`. |
| `64` | Police casework (`64-detective.js`): a detective's caseload, ways to work a case, solving and wrong arrests, losing your own file, and strangers' crimes that hit people you know | No DOM. `careerTick` runs it through `onCareerYear('police')` (15-career.js); `invTick` calls `invWorldYear`. |
| `65` | Career cards (`65-work.js`): the engine that deals a job's yearly hand of decisions, plays them, and settles them | No DOM. Registers every deck's year through `onCareerYear` (15-career.js); `leaveJob` calls `wkLeft`; writes to the web (`webLearn`-style confidences, reputation, `work_done` facts). |
| `66` | Career decks (`66-work-decks.js`): doctor, surgeon, firefighter, bartender, chef, journalist, pilot, astronaut | Pure data plus a few card hooks. `wkRegister()` at the end hooks them up. Defines `W`, `WORDS`. |
| `67` | The language dial (`67-language.js`): result flavor, and events that only exist at Salty or Unfiltered | No DOM. `vary` (00-util.js) understands `{~clean|salty|unfiltered}`; `runWithResult` calls `langFlavor`; `eventEligible` and `fireEvent` check `lang`. |
| `68` | Intimacy (`68-intimacy.js`): nights with choices, spark, friends with benefits, protection and testing, and the events around them | No DOM. All behind `mature` + `mature_intimacy`. `ageUp` reaches `intimTick` through a wrapper (after `invTick`); the hookup action, `rx_fling_again` and `askOutOdds` call into it; the web gained a `sti` secret. |
| `69` | The substance ladder (`69-substances.js`): weed, pills, party drugs, cocaine and opioids on top of the habits the game has, tolerance, cravings, withdrawal, relapse, overdose scares, recovery, dealers, and the events around them | No DOM. All behind `mature` + `mature_substances`. `ageUp` reaches `subsYear` through a wrapper (after `intimTick`); `habit()` (19-health.js) records `M(s).used[id]`; `bodyTick`'s overdose roll calls `subsOverdose`; the rehab handler calls `subsRehab`. |
| `70` | Nightlife (`70-nightlife.js`): venues per city, a scene standing, and a night out as a chain of decisions | No DOM. The `nightlife` action (21-activities.js) calls `nightMenu` when Substances is on. Uses `wkPerson` (65-work.js), `subsDealer` and `subsUse` (69), `intimStart` (68). |
| `71` | Adult careers (`71-adult-work.js`): a club dancer, companion, subscription creator and club manager as card decks, with boundaries, local law and who knows | No DOM. All behind `mature` + `mature_adultwork`. Decks on the career-cards engine (`defWork`); `hire` calls `adultHired`; the web gained an `adult_work` secret (`webStake` and `webExpose` call back in). |
| `72` | Violence (`72-violence.js`): fights you can walk out of, self-defense and the inquiry, what to do after a killing, witnesses, haunting, gang and prison initiations | No DOM. All behind `mature` + `mature_violence`. `p_assault` and `pr_gang` (20-crime.js) and `mobJoin` (39-underworld.js) call in; listens to the web's `killed` fact; `ageUp` reaches `vioYear` through a wrapper. |
| `73` | The serial arc (`73-serial.js`): the turn, how you operate, the urge, acts, close calls, copycats, the people at home, ways out, fan mail and the memoir | No DOM. Behind the same switches. Built on the case-file series (63-cases.js) and the web; `serYear` through a wrapper. |
| `74` | Dark themes (`74-dark.js`): betrayal and revenge, stalking, moral injury | No DOM. Behind `mature` + `mature_themes`. The web records who told whom (`sec.told`); `ageUp` reaches `darkYear` through a wrapper; reads `flags.followed` from the adult careers, and the military and spy state. |
| `75` | Work life (`75-work-life.js`): favors (who owes whom) and workplace venues (the break room, the lounge) | No DOM. Favors feed card ways (`FAV`, 65-work.js), interviews (`favorRefEdge`, 15-career.js) and `web_silence` (62-web.js); `ageUp` reaches `favorYear` through a wrapper; venues tie coworkers together in the web and hand you hearsay. |
| `76` | Career decks, part two (`76-work-decks-2.js`): service, office, business, transport, public service and the trades | Pure data plus a few hooks. Defines `K`, `UNI` (cards any job can deal), `deckFor`. |
| `77` | Career decks, part three (`77-work-decks-3.js`): health, tech, science, law, education, media and the entertainment careers | Pure data. Uses `deckFor` from 76. |
| `78` | Abduction and captivity (`78-secret-space.js`): the six secret rooms (renovation projects), taking someone, care, escape, knocks, searches, and a death in care | No DOM. Behind `mature` + `mature_violence`. Registers into `RENOVATION_PROJECTS` (05-data-assets.js); `completeRenovation` (17-assets.js) calls `ssBuilt`; a captive is a relationship of kind `captive` (hidden from `relPeople`, `reachable` false); a death goes through the web's `killed` fact and 72-violence.js's "what now". `ageUp` reaches `capYear` through a wrapper. |
| `79` | The paper (`79-news.js`): articles about you and yours, detective hints by case progress, ordinary news | No DOM. `s.news`; `newsYear` through a wrapper; read on the Case files card (1028-ui-cases.js) in `1031-ui-news.js`. |
| `80` | Ransom notes (`80-ransom.js`): the other side of the note, from silly to serious, real and hoax | No DOM. An event (`kn_ransom`) behind the same switches; writes to the paper. |
| `81` | The web, part two (`81-web2.js`): a good name (deeds, pillar, the cushion), press and bus listeners, the deserter's, informant's and spy's secrets, places with regulars | No DOM. `onYear('web2')`. `62-web.js` calls `webCushion`, `webVoteEdge` and the `defSecretKind` hooks; 21-activities, 35, 34, 42, 60 announce facts; 53, 70 and 75 call `placeVisit`; 70 calls `placeIncident`. |
| `82` | Schemes (`82-schemes.js`): the Ponzi scheme, the long con and (Mature) the blackmail ring | No DOM. `onYear('schemes')`. A collapse opens a case (63-cases.js), a victim (84) and a news item (79). Secret kinds `fraud`, `long_con`, `blackmail_ring`. |
| `83` | The operation (`83-operation.js`): turf, product, supply, crew, rivals, raids, deaths, the cartel stage; a prison gang's ranks | No DOM. Behind `mature` + `mature_substances` (violent options also `mature_violence`). `onYear('operation')`; reads the underworld's dealer ladder (39) and `ratFound` is called by the web's `informant` secret. |
| `84` | Street justice (`84-street-justice.js`): victims and fallout, witnesses, the vigilante | No DOM. Fallout is ungated; witnesses are Mature, the vigilante Mature + Violence. Listens to the `victim` fact (announced by 82 and 83). `onYear('street')`. |
| `85` | Abuse (`85-abuse.js`): the victim's and the abuser's side of a toxic or abusive relationship | No DOM. Behind `mature` + `mature_themes`. `onYear('abuse')`. Nobody dies, nothing is sexual (checked by `dev/verify/abuse.mjs`). A victim's secret getting out is never a scandal (the `victim` flag on `defSecretKind`). |
| `86` | Careers, part two (`86-careers-plus.js`): forensics and profiler tracks, patrol, paramedic/teacher/lawyer full systems, cook-offs, farm and fishing seasons, twists | Pure data on the career-cards engine plus a few case-file hooks (`caseAid`). Adds two jobs to `JOBS` and `JOB_IDS`, replaces the decks of a few existing ones, wraps `CAREER_YEAR.police`. |
| `87` | Honors (`87-honors.js`): achievements and legacy titles for 81 to 86 | No DOM. Pure data. |
| `88` | The world (`88-world.js`): what is going on in a year and place, the knobs the rest of the game reads, the yearly world hook, historical wars | No DOM. `onYearStart('world', worldYear)` runs first in every year (25-ageup.js). Read through `wfx`/`wfxCat` by `jobOpenOdds`, `livingCost`, `cityMarketYear` (49), `careerTick` (15), `financeTick`, `financeTerms` (16, 17), `fxTick` (50), `marketYear` (37), `industryMods` (34), `warYear`/`draftYear` (59), `bodyTick` (19), `canGamble` (53). |
| `89` | World events (`89-world-events.js`): personal events (`wd_*`) and achievements for living through them | Event content. Each is gated on `worldHas(s, id)`. |
| `90` | Head start (`90-head-start.js`): start a custom life at any age (0 to 60), the years before lived on autopilot | No DOM. Called by the custom-life sheet (`1004-ui-title.js`) through `createLifeWithHeadStart`. `pushRewind` and `checkAchievements` read `s.headStart`; `tagsOn` (12-flow.js) is false while it runs. |
| `88–89`, `91–999` | Free for future engine files and expansions | No DOM. Must run in Node. |
| `1000+` | UI (`1000-ui-kit.js` … `1033-ui-world.js`, then `1999-boot.js`, which must stay last) | DOM. Reads the engine, never the other way round. `1007-ui-art.js` draws people and icons as SVG strings (the "Night Market" part libraries); `1008-ui-look.js` is the appearance editor. |

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
the same registry, so a new action is tested for free. An action can carry
`confirm: (s, t) => null | { title, text, yes, no }`: an object makes `doAction` ask "are you sure?"
first (a `confirmAction` popup) and run the action only on yes, so backing out costs nothing.
Asking out or rekindling with a relative uses it (`familyAskConfirm`, 18-relationships.js).

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
labels render as "Sister · Girlfriend" (`kinTitle`). When it ends, a relative is still family:
`endRomance` calls `tabooRestoreFamily`, which puts the family kind back (and the year the tie began,
`famSince`) and keeps the breakup as `exRom` ("Sister · Ex", "Sister · Ex-wife"), so they stay under Family
instead of Others. An in-law comes back only while your current partner is who they are an in-law through.
`migrate` (29-save.js) restores saves made before. Charged abusers (85-abuse.js) stay family the same way. Inbreeding is a real pedigree kinship
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

**Head start.** `90-head-start.js`. A custom life can begin at any age up to `HEAD_START_MAX` (60).
`createLifeWithHeadStart(opts, age)` is `createLife` plus `headStart(s, age)`: age up year by year, answer every
popup from a policy (`HS_POLICY`, falling back to a random enabled choice that leans away from "never mind" rows
and anything marked bad), and once a year let the life director take ordinary actions through the same action
registry the menus use: apply for a job (the best interview answer is chosen), rent a place, use the dating app,
propose, plan the wedding, try for a baby, save into the index fund. Answering popups alone leaves most characters
at 25 unemployed and single with their parents, which is why the director exists. It never commits crimes,
gambles, cheats, quits, emigrates or dates family; while it runs `HEAD_START_RUN` makes `tagsOn` false, so nothing
behind a content switch happens in those years, and event choices whose code commits a crime, joins the mob, builds a
habit or gambles are skipped when another choice exists. A character who dies or ends in prison is re-rolled with the
same choices (`HEAD_START_TRIES`, then a life from birth). The rewind buffer is cleared at the end, an adult gets a
free restyle, and a "Your story so far" popup (`hsSummary`) opens the life. The custom-life sheet's "Start at age"
field moves the birth year back with it until the player types a birth year of their own.

**The world.** `09-data-history.js` and `88-world.js`. An event is a row of data: the years and places it covers, how hard
it hits each country (`sev`) and how strong it is in each year (`curve`), numbers it adds to the game (`fx`: jobs, layoff, cut, pay,
housing, living, rates, tax, mood, each a number scaled by the curve or an array of one value a year), and the rest as
properties of the row: `market`, `crypto`, `fxShock`, `biz`, `disease`, `blast`, `closed`, `furlough`, `support`, `cash`,
`war`, and the texts. `worldAt(year, cc, city)` lists what is active (memoized), `wfx(s, knob)` adds a knob up over it, and
`wfxCat` scales it per kind of job (`cats`). The game reads those numbers where it already decides things (the list in the
layout table); nothing in the row is code. `worldYear` (first in every year) tells you about an event the first time you
live through it (a popup for the big kinds; a child gets the family's version), then does what is yearly: mood, payments,
lost savings, illness for you and for people you know (an `ageMult` table makes it deadlier for the old), a disaster in
your city, parents and spouses losing work and finding it again, and a line in the paper. Layoffs come through
`worldCareerYear` (a furlough where the country pays one). Real wars come from `historyWarYear`: while history governs a
year no made-up war starts, a war row starts and ends in its years with its own draft (ages, men only, women when it says
so), and `endWar` uses the row's ending. The stock market follows the row's `market` returns (and without one, no random
crash or boom). `s.world.seen` (one per family line) remembers what has been announced, `M(s).worldLived` what this character
lived through. Everything is behind `META.settings.history` (on by default) and inside `HIST_FROM..HIST_TO`. The World
sheet and header chip are `1033-ui-world.js`; `dev/verify/globals.mjs` keeps top-level names unique across files (a
repeated name silently replaces the earlier one).

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

**A year (`ageUp`).** The world (`onYearStart`: what is going on, the year's payments, illness, disasters, who loses a job) → currencies → body → pregnancy → school → career → businesses and the market →
prison → money → assets → cities (rent, landlords, tenants) → fame → the people around you → the wider family → parenting →
romance → taboo family romance → royalty → the underworld →
show business → sports → courts → chaos → gambling → the house (your book and stable) → growing up (home, lessons) → the web (ties, gossip, leaks) → investigations (case files, detectives) → pets → milestones → story chapters → random events → new illness → death check. The order
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

**Military.** `59-military.js`. Wars live at the top of the save in `s.wars = { cc: { 'us': { war, quiet } }, log }`,
one war at a time per country and shared by the whole family line. `warYear` (from `militaryTick`) starts a war
with odds that rise the longer the country has been at peace, moves its `momentum` each year, switches the
draft on in a hot war, and ends it in a result (`endWar`: logs it, pays war bonds, turns serving relatives into veterans).
`activeWar(s)` is read-only; only `warYear` creates slots.
- **Your record:** `M(s).mil` is made when you first serve and stays for life: branch, specialty, term, years served,
  tours, wounds, medals, `ptsd` (combat stress, with a `ptsd` disease at 45+), `vet`, `discharge`, `deserter`,
  `rating`/`claim` (disability), `edLeft` (years of schooling aid), `loanUsed`. `ensureMil` makes a default record
  for careers added by God Mode. `inService`, `isVeteran` and `isDeserter` are the questions everything else asks.
- **The service year:** `militaryYear` (from `specialTick`) runs basic training, ranks, misconduct, term ends
  (`termEnd`, stop-loss), medical boards and deployment orders. `runTour` rolls death, wounds, capture, stress,
  medals and combat pay from branch, specialty and posture; `MOMENTS` are the popups that follow.
- **Leaving:** every way out of the uniform goes through `leaveJob`, which calls `milLeft`; `separate(s, type)`
  names the discharge first. `FULL_VET` (honorable, retired, medical) keep every benefit; `vetHas(s, what)` is the
  one test for care, home loan, schooling and disability.
- **The draft and desertion:** `draftYear` offers a notice once per war; `desert` and `deserterYear` hunt
  deserters, `milCourt` ends in a dishonorable discharge via `sentence` (the `desertion` and `draft_evasion`
  entries are added to `CRIMES` there).
- **Relatives:** `p.mil = { since, vet }` marks a relative in uniform; `familyWar` enlists, wounds and kills them
  during a war.

**Secret agent.** `60-spy.js`, drawn by `1026-ui-spy.js` (`spyCard` on the Intelligence menu, `spySection` on the Work sheet,
sheets `dossier` and `assets`). The career is the `spy` entry in `JOBS` (`special: 'spy'`).
- **Your file:** `M(s).spy` is made at recruitment and stays for life: agency, handle, training `track`, `cover`
  `{ id, strength }`, `heat` (foreign attention), `standing` (with your own agency), `desk`, the mission log, `assets`,
  `turned` (selling secrets), `controlled` (a double you run for the agency), `burned`, `alumni`, `disavowed`, `captive`.
  `ensureSpy` makes one for God Mode careers. `inAgency`, `spyCtx` and `spyAlumnus` are the questions the rest asks.
- **Recruitment:** `spyApply` (from `specialApply`) is the vetting; the `spy_recruiter` event hires a bright graduate
  directly. `startSpyCareer` sets defaults first and then asks for a cover and a track, so a popup nobody answers still
  leaves a valid file. The first working year is the academy (`spyAcademy`).
- **Missions:** `offerMission` (from `spyYear`) picks one by rank and training; `SPY_MISSIONS[id].ways` are
  `[label, skill, sub]` approaches and `missionOdds` scores each. `runMission` resolves to success, partial, blown,
  captured or killed. Successes can raise a `SPY_TWISTS` popup. The mole hunt is its own popup (`offerMole`).
- **Cover and heat:** cover erodes with use and settles in quiet years; `checkBurn` calls `burnSpy` when cover hits
  zero or heat hits 100, which asks for a new identity, a desk, a resignation or a tell-all (`writeMemoir`).
- **Assets:** `makeAsset` (capped at six live), `assetsYear` pays reports and loses sources; every way out of the
  job goes through `leaveJob`, which calls `spyLeft` to cut them loose and make you an alumnus.
- **Double agents:** a pitch (`spy_approach`) makes you a controlled double or a traitor; `traitorYear` pays and
  rolls `exposeTraitor` (defect, deal or fight; `treason`, `espionage` and `leak` are added to `CRIMES` there).
  A captured spy waits in prison for a swap (`spyTick`).

**The web.** `62-web.js`, drawn by `1027-ui-web.js` (`webCard` on the profile, `webFacts` chips on a
person's page, sheet `web`, and a "Secrets & gossip" section of person actions with `group: 'web'`). It is the
layer that lets systems affect each other instead of each keeping to itself. Build new content on it.
- **Secrets:** `s.web.secrets[id] = { kind, subj, other, rom, sev, ev, knows, out, hush }` at the top of the
  save, so it outlives each character. `SECRET_KINDS` lists the kinds (the player's `affair`, `cheated`, `crime`
  and `killing`, and the `npc_*` ones the circle generates). `webNewSecret` makes one, `webLive`/`webMine`/`webHeard`
  list them, `webLabel`/`webRumor` say them in words. `sev` is how bad it would be, `ev` how much proof there is.
- **Leaking:** `webLeak` (from `webTick`) gives each living knower a yearly chance to tell someone along their
  ties (`webLeakOdds`: enemies and exes talk, loved ones don't, a bought silence in `hush` mostly holds).
  `webLearn` adds a knower, raises `ev`, calls `webStake` when the person it matters most to finds out (a
  partner finds an affair, through the old `caughtPopup`), and `webCheckPublic` calls `webExpose` once five people
  know or the proof is strong. A crime or killing nobody talked about can still be called in (`ev / 600` a
  year). Exposure costs reputation, may push entries onto `M(s).flags.heat` for the cold-case roll, and for an
  NPC's secret changes their life (an affair ends a marriage, a firing takes the job).
- **Ties:** `webTies(s, p)` is everyone a person could tell: family from the family tree, `p.ties` for the
  rest, and you when they know you. `webWeave` links your coworkers, classmates and friends to each other every
  year; `webLink` keeps it symmetric and capped at six. `webPrune` (also run by `gcPeople`) drops anything pointing
  at a person who is gone.
- **Hearsay:** when a secret about someone else reaches you, `webHearsay` asks what to do (keep quiet, ask them,
  help, pass it on, and with Mature on squeeze them). `webCircleDrama` gives the people you know a few secrets of
  their own each year, adults only.
- **Reputation:** `webRep(p) = { name, scandal }`, read through `webHireEdge` (interviews) and `webJuryEdge`
  (criminal trials), drifting back to neutral, half passed to an heir by `webHeir`.
- **Facts:** `onWebFact(type, fn)` registers a listener, `webFact(s, type, data)` announces; a listener that
  throws is logged and skipped. Announced today: `crime_clean`, `arrested`, `killed`, `assault`, `affair_begun`,
  `affair_found`, `fling_cheat`, `fling_found`, `promoted`. Add a fact in the file that knows it happened, and
  a listener here (or in your own file) for what it should cause.
- **Unease:** `webUneaseAdd` raises a city's unease (a killing is 6, a fight 1.5), `webUnease` is what
  `cityMarketYear` subtracts from the city's price growth, and it fades 20% a year. The `web_vigil` event is
  how the block reacts.
- **Actions and events:** `web_silence` (ask, pay or, with Mature, lean on someone who knows), `web_confront`,
  `web_coverup` (Crime menu); events `web_canvass`, `web_vigil`, `web_shunned` and the Mature `web_hush_money`.
- **Tests:** `dev/verify/web.mjs`, and the life simulator checks secrets, ties and reputation stay valid.

**Investigations.** `63-cases.js` and `64-detective.js`, drawn by `1028-ui-cases.js` (`invCard` opens the Case
files menu, category `cases`). Every crime leaves a case file; a detective works it; the year decides whether it
goes cold, comes back or ends in an arrest. This replaces the old "caught" roll and cold-case lottery
(`flags.heat` is still read for old saves).
- **The file:** `s.inv = { seq, list, dets }` at the top of the save. A case holds `crime`, `fam` (its family, for
  series), where and when, `who` (your person id, or `null` for a stranger), `victim`, `ev: { trace, wit, dig }`
  (what there is to find: physical traces, witnesses, digital records), `prog` (0-100) and `status`
  (`open`, `cold`, `solved`, `closed`). `INV_PROFILE` is what each crime leaves behind. `invOpen` makes one
  (a messy getaway leaves twice as much), `invEvidence` changes it (and wakes a cold case on new evidence),
  `invTip` and `invScrub` are what the web calls.
- **The detective:** a real person (`p.det = { skill, obs, solved }`, relationship kind `detective`), one per
  city, made by `invDetective` and dropped from your people when no case of yours is open. `obs` is how
  personal it gets: a linked case adds 8, an arrest resets it.
- **The year (`invCaseYear`):** `T` is how promising the case is from the evidence, the detective's skill and
  obsession, a series and a murder's priority, less your cover (streetwise, cunning, laying low, being in
  another city). Each year a break comes with chance `T / 150`: progress jumps 30-45 and one kind of evidence
  grows. Evidence fades (traces 2, witnesses 3 a year). At 40 a detective interviews you (`invTalk`: answer,
  lawyer, a friend's alibi that can crack, an envelope), at 70 there is a warrant (`invWarrant`), at 100 it is
  an arrest through the ordinary `arrest` trial. Three years without a lead goes cold; a tip, new forensics or a
  linked case reopens it; a case closes by time except murder.
- **Series:** `invLink` joins cases of the same family within six years, shares one detective across cities, and
  at three cases gives the press nickname and unease. This is the base the serial offenders build on.
- **The web:** each case and its secret point at each other (`c.sec`, `sec.case`). Another knower is a witness
  (`invTip`), an exposed secret is a tip, a friend's alibi puts them in the secret, and `web_coverup` thins the
  evidence. Murder and assault open cases through the fact bus; a fight's victim may or may not report it
  (family less often); squeezing someone (`extorted`) can be reported.
- **Your options:** `inv_laylow`, `inv_flee` (a new city; the file follows with chance 0.35, 0.6 in a series),
  and the interview and warrant choices.
- **Police casework:** the `police` career is not special; `onCareerYear('police', ...)` (a hook in `careerTick`
  that every career can use) gives a Detective (level 2 and up) a caseload of strangers' crimes
  (`M(s).dt.load`, `2 + level` open cases). `det_work` picks a file and a way to work it (`DT_WAYS`: witnesses,
  forensics, records, stakeout, informant, profile, or pull in your main suspect). Success adds evidence and
  progress; at 100 `dtSolve` pays performance, fame and name. A premature arrest is usually wrong and costs.
  Cases you leave alone are worked by colleagues and can go cold (which costs performance). `det_pull_file`
  loses your own file, at the risk of being fired and charged.
- **Strangers:** `invWorldYear` gives a 16% yearly chance that a stranger's crime hits someone in your circle
  (they are shaken, the city gets uneasy, you may help), works those cases in the background and clears old files.
- **Tests:** `dev/verify/inv.mjs`; the simulator has a detective persona and checks evidence, progress and
  statuses stay in range.

**Career cards.** `65-work.js` (engine), `66-work-decks.js` (data), `1029-ui-work.js` (the "Your desk" section of
the Work sheet). A job stops being a number that drifts: each year it deals a hand of cards, each card is one to
four decisions with readable odds, and the way you play moves a meter that belongs to that career. The spy
(60-spy.js) and detective (64-detective.js) are the same idea built by hand.
- **A deck** is `defWork(jobIds, { meter, cards, desk?, fired?, gate?, deal? })`. A card is `{ id, name, emoji, min?,
  max?, w?, when?, base, pay?, risk?, die?, who?, learn?, intro?, stages: [{ text, ways, ok?, bad? }], ok, meh, bad,
  fx?, after? }`. A way is `W(label, skill, sub, mod?, cost?)`, where the skill is a skill id or `smarts`, `looks`,
  `health`. Text may use `[who]`, `[first]` and `[amt]` (not braces, which `vary` owns). To add a career, add a deck.
- **State:** `M(s).work[jobId] = { m, ok, meh, bad, hand: [{ hid, cid, c }], seq, flags }`. `m` is the meter
  (patient trust, squad trust, credibility, safety record, mission readiness...), `flags` is the deck's own memory
  (an astronaut's certifications and flights).
- **The year (`wkYear`, through `onCareerYear`):** whatever was left on the desk is handled on autopilot (the best way
  at each decision, at 8 points worse odds, logged in one line); the meter drifts toward 50 and feeds performance
  (`(m - 50) * 0.1`), so ordinary promotions, raises and firings still apply; a deck's `gate` can hold you back
  (an astronaut who has not trained); a meter at 8 or below can get you fired; then `wkDeal` draws a new hand from the
  cards allowed at your rank, and offers the first as a popup (you can put it off).
- **Playing a card:** `wkStagePopup` shows each decision with every way's odds (`wkOdds`: the way's skill, your meter,
  your performance, your smarts, plus the card's base and the way's modifier). `wkStage` rolls it and moves to the next
  stage; `wkConclude` turns the results into good (all wins), so-so (half or more) or bad, applies `fx` (meter,
  performance, karma, happiness, health, fame, good name, scandal), pays the bonus, may injure or kill (`risk`, `die`),
  runs `after`, and announces `work_done` on the fact bus.
- **People:** a card with `who` makes a person you meet again (`wkPerson`): a patient, client, regular, source or
  survivor, a relationship kind in the Work group (capped at eight per kind, tied into the web as workmates). A card
  with `learn` makes them confide a web secret (`wkLearn`, `via` remembers where it came from); spreading what a
  patient, client or regular told you costs your name.
- **Extras in decks:** the journalist's `wk_publish` prints a secret you have heard (strong proof makes a story,
  thin proof a retraction), and an astronaut's mission is a four-stage card that only comes when you have not flown in
  two years.
- **Tests:** `dev/verify/work.mjs` (every card, every way, many seeds) and the simulator's work persona.
- **What a way can carry:** `W(label, skill, sub, mod, cost, kind, eff)`. `kind: 'walk'` (the `WALK` helper in 71) is a way that
  always works and ends the card at no cost (`wkWalk`); autopilot takes it when a card has one, so nothing happens on your
  behalf that you did not choose. `eff` is applied the moment the way is chosen, whatever the dice say (`wkEff`: `money`,
  `karma`, `happy`, `health`, `fame`, `name`, `scandal`, `m`, `perf`, `secret`), and `dirty: true` keeps autopilot off it.
  That is how a shortcut costs what it costs even when it works, and how an honest way can pay in karma and name.
  A deck can also carry `tags` (it deals nothing, and never to a minor, while a switch is off: `wkLive`), `payMul(s, st)`
  and `kv(s, st)` (extra rows on the Work sheet).

**Abduction, the paper and the ransom note.** `78-secret-space.js`, `79-news.js`, `80-ransom.js`, `1031-ui-news.js`. Behind
`mature` and `mature_violence` (the same switches as 72-73), adults only: the player, every profile on offer, every captive and every
ransom target is 18 or over, and `dev/verify/kidnap.mjs` enforces it and scans the text for what must never be there.
Nothing sexual, nothing graphic, nothing instructional. There is always a way out, and every step has "Not tonight".
- **The rooms:** `SPACES` (Attic Hideaway, Garage Bay, Garden Shed, Finished Basement, Hidden Room, The Dungeon) register
  themselves as unshared renovation projects with a `secret` flag and the violence tags, so they appear in the ordinary
  contractor flow (17-assets.js) only with the switches on. Each has `integ` (how well it holds), `comfort`, `conceal`, `quiet`,
  `risk` (the chance a contractor reports you), a cost and an effect on the house's value (the Dungeon costs a tenth). The
  work's quality scales integrity. `ssBuilt` is the ending; `ssTip` is the contractor's call.
- **Taking someone:** `kn_kidnap` (Crime menu, three random adult strangers and "Not tonight") and `kn_kidnap_person` (anyone you
  know). Then where (if you have more than one room), then watch first / lure / ambush (odds from your skills, their
  wits, the room's concealment and the heat on the house), then `capTake`. A failure is an attempted-kidnapping case (and
  sometimes an arrest). Success opens a `kidnapping` case in the existing case-file engine (family `abduction`, so they
  series-link and get a press nickname), a web secret, an article, and a relationship of kind `captive`.
- **Holding:** `M(s).kn = { cap, heat, taken, freed, lost }` and one captive at a time, with supplies, health, spirit and the
  room's current integrity. `cap_feed`, `cap_med`, `cap_comf` and `cap_rein` are the care actions (limits per year); `kn_release`
  lets them go (or surrenders). `capYear` wears everything down: neglect and despair kill, a strong room holds and a weak one
  does not (`capEscape`), a neighbor knocks (`capKnock`), a partner notices (`capHome`), a search comes (`capSearch`). Being in
  prison means nobody comes. A death (`capDie`) is the web's `killed` fact with `how: 'captive'`: 72-violence.js asks what you do
  now, with one more option, paying someone, which means someone else knows.
- **The paper:** `s.news`, written by `newsPost` from templates (`NEWS_T`). `newsYear` follows every open case against you:
  at progress 15, 40 and 70 an article gets steadily more sure of itself, and a line in your own life says a car is parked
  across the street, then that a card was left in your door. Nicknames, a search that goes on, a conviction, a ransom note and
  two ordinary stories a year. It is read from the Case files card.
- **The note:** `kn_ransom` builds a note about someone you know (never a child, never a captive) from a kind of kidnapper
  (`RANSOM_TYPES`: amateurs, a crew, a rival, an eccentric, a group chat, the person themselves, a misunderstanding), what it is pinned
  with, what it asks and what it threatens, from silly to serious. Whether it is real is settled when it arrives. Every choice
  (pay, haggle, call the police, look into it, do nothing, send a counter-offer) has an ending for a hoax (`RANSOM_REVEALS`, the
  funnier half) and one for a real kidnapping (`RANSOM_REAL`); the bad ones are rare, and only from a serious kidnapper.
- **Tests:** `dev/verify/kidnap.mjs`; the simulator's persona (`i % 40 === 39`) and invariants (a captive is an adult, alive and a
  captive; the paper stays short).

**Work life and the rest of the ladder.** `75-work-life.js`, `76-work-decks-2.js`, `77-work-decks-3.js`.
- **Every ordinary job has a deck** (about 70 in all; sports, the military, the spy, politics and police have their own systems).
  `deckFor(id, { meter, emoji, words, uni, cards, t })` builds one: a meter, a handful of universal cards (`UNI`: a bad idea from
  above, the crunch, trouble on the team, a coworker who needs a hand, rumors of cuts, your own mistake, a recruiter,
  a chance to learn; written once with `{{team}}`, `{{boss}}` filled in per category) and three bespoke cards. `K(...)` writes
  a one-decision card in one line.
- **Shortcuts cost what they cost.** A way marked `dirty` never beats the best honest way on odds (checked by
  `dev/verify/lifework.mjs`), costs karma or odds, ends in its own words (`say`, or `WK_DIRTY_SAY`) and never ends with a
  good meter, and autopilot never picks one. Phase 3's moral options (the drug-rep lunch, the quiet chart fix, the slid
  fake ID, the warm fish, the cooler moved) were rebalanced the same way.
- **Favors:** `M(s).favors = { pid: n }` (n > 0 they owe you, n < 0 you owe them, capped at +5 and -3). `favor_do` earns
  them, `favor_ask` spends one (free and certain from someone who owes you, a gamble and a debt from someone who does not),
  `favorYear` calls in what you owe. A card way with kind `'favor'` (`FAV(label, skill)`) is +25 points of odds for one
  favor, greyed out when nobody owes you one, and never taken on autopilot. `web_silence` can call in a favor to keep a
  secret quiet. A reference you were promised helps interviews this year.
- **Venues:** `WORK_VENUES` has two places per job category. `wv_hang` ("Hang out where people talk", twice a year):
  join the conversation (you hear things, through the web's hearsay, and two coworkers get tied together), buy a round
  (a favor), take a side (a gamble), or keep to yourself. `wv_party` is the yearly party.

**Adult careers.** `71-adult-work.js`. Behind `mature` and `mature_adultwork` (`ADULT_TAGS`; `adultOn()`), both off by default.
Four jobs (`club_dancer`, `companion`, `creator`, `club_owner`, `JOBS[id].adult`, category `night`) that sit on the job board
only while the switches are on (`boardIds` in 15-career.js, never in `JOB_IDS`, so no NPC gets one), with an audition in place
of the interview (`JOBS[id].interview`). Age 18, and 21 for the club.
- **House rules, checked by `dev/verify/adult.mjs`:** consent-forward, fade-to-black, no coercion path, no minors. Every card that
  puts a person in front of you has a `WALK` way; the fake-ID card in the club deck turns everyone away, every way.
- **Boundaries:** `M(s).work[id].flags.bound` (0 Careful, 1 Balanced, 2 Bold), set by the `adult_bounds` action. It weights cards
  (`bw(careful, balanced, bold)`, and `when` hides the riskier offers at Careful) and scales pay (`payMul`).
- **Who knows:** `hire` calls `adultHired`, which asks who should know (`adultOpen`): private makes a web secret of kind
  `adult_work` (`note` is the job id), family tells your partner and the adults close to you (`adultReact`: told by you goes
  better than found out), open leaves nothing to leak. `webStake` calls `adultPartnerFound` when your partner hears it from
  somebody else, and `webExpose` calls `adultExposed`. `adultSlip` is how a card lets it get out; `adult_tell` ("Come clean")
  lets you do it on your terms later. `flags.vis` is `private`, `family` or `open`.
- **Local law:** `ADULT_LAW` (a stylized per-country map: `legal`, `gray`, `illegal`) picks which of the companion's three
  law cards is dealt. A failed sting is `arrestMinor(s, 'solicitation')`, a citation that is on your record and never a felony.
- **Stalking hook:** `flags.followed` (a year) is set when a regular or fan will not take no. The later stalking systems read it.
- **Tests:** `dev/verify/adult.mjs`; the simulator's adult persona (`i % 20 === 15`) and its adult-career invariants.

**Violence and the serial arc.** `72-violence.js` and `73-serial.js`. Behind `mature` and `mature_violence` (`VIO_TAGS`;
`vioOn()`), both off by default, adults only (18+, and every other person in a scene is an adult). Violence is abstract
(odds and outcomes), there is never anything sexual in it, nothing is a how-to, and nothing is made to look like a good
idea. `dev/verify/violence.mjs` scans the text for what must never be there.
- **A fight you pick:** with the switches on, `p_assault` calls `vioFight`: back down, say it out loud, or throw the first
  punch, then how far (quickly, fight it out, all out). All out can go too far (`vioFightDeath`). Walking away is free.
- **A fight that picks you:** the `vio_attacked` event (hand it over, run, talk, fight back). A death in self-defense
  (`vioDefenseKill`) is no secret and no case, but it weighs, and the inquiry (`vioInquiry`) decides whether it is charged
  as manslaughter (a non-menu crime, `CRIMES.manslaughter`).
- **After a killing:** `onWebFact('killed')` asks what you do next (`vioAfter`): get away clean, scrub the evidence (both
  are odds on the case's `ev`), call a friend (who then knows, a web secret), or turn yourself in. A witness
  (`vioWitness`, from `vioYear` on a case with `ev.wit >= 40`) can be paid, threatened, avoided, or you can confess. There
  is no way to kill one.
- **Conscience:** `M(s).vio.haunt` (0-100) costs happiness every year, fades, and is eased by help (`vio_help`, a friend,
  telling someone). `vioNight` is the bad nights.
- **Proving yourself:** `vioInitiation` from `mobJoin` and `pr_gang`: take the beating, do what they ask, prove yourself
  against someone, or back out. Two prison events (protection, someone hurt on the yard).
- **The serial arc (73):** after the second killing, `serTurn` (get help, turn yourself in, keep going), then `serMo` (how
  you operate: careful, quick or close to home). `M(s).ser.urge` builds every year and asks at 70 (hold on, get help,
  give in); an act (`serAct`) is who (a stranger passing through, a neighbor, someone who knows you, or not tonight), then
  a roll, then `webFact('killed')` so the case, the secret and "what now" all come from the existing systems; crimes of one
  hand join into a series, one detective, and a press name (63-cases.js). Close calls, copycats (a case with `copy: true`
  that confuses the others), the partner who notices, `ser_stop`, `ser_help`, fan mail in prison, a memoir, and the titles
  Notorious and Never Caught. The Case files sheet shows "What you carry".
- **The kidnapper** is separate: `78-secret-space.js` (see "Abduction, the paper and the ransom note").
- **Tests:** `dev/verify/violence.mjs`; the simulator's persona (`i % 20 === 19`) and invariants.

**Dark themes.** `74-dark.js`. Behind `mature` and `mature_themes` (`DARK_TAGS`; `darkOn()`), both off by default, adults
only, nothing graphic, nothing sexual, and always a way out. `M(s).dark = { moral, stalk, grudge, helped, betrayed, quiet }`.
- **Betrayal:** `webLearn` (62-web.js) records `sec.told[learner] = teller`. When one of your secrets gets out through
  gossip, `darkYear` finds the person you trusted who passed it on (`dkBetray`: confront, forgive, cut off, make them pay).
  `dkRevenge` is a choice with a price: let it go (always earns karma), expose what you heard about them (`webExpose`),
  sabotage (can come back on you), or court. Events: a coworker takes your credit, a partner hides a debt.
- **Stalking:** a fan, an ex, or a regular who `flags.followed` (adult careers) starts `stalk` (a level 0-100 that climbs
  every year you do nothing). `dkStalk` offers document and report (odds, an order), tell people, security, confront,
  or ignore; at 70 the scare (`dkScare`); an order can be broken (arrest); it ends, then three quiet years. The other
  side is `dk_obsession`: an ex you cannot let go of, and what pushing it costs (a citation for harassment).
- **Moral injury:** `moral` (0-100) is the weight of an order obeyed, a false report signed, or a source left behind.
  Events for soldiers at war (`dk_mil_order`, `dk_mil_civilians`) and spies (`dk_spy_asset`, which marks the asset
  `dropped` or `dead`). It costs happiness every year, fades, and `dkMoral` offers a counselor, a veterans' group, a
  friend, drink, or carrying on. `dk_counsel` is the action.
- **Tests:** `dev/verify/dark.mjs`; the simulator's persona (`i % 20 === 5`) and invariants. The Case files sheet shows
  "What you carry" for conscience, urge, moral weight and a stalker.

**The language dial.** `67-language.js`, with `langLevel` and `langPick` in `00-util.js` and a segmented control in
Settings (`META.settings.language`: `clean`, `salty`, `unfiltered`; default clean). It is only about how people talk.
- **Tokens:** `{~clean|salty|unfiltered}` in any text run through `vary` picks by the dial and falls back to the last
  option given; plain `{a|b|c}` still picks at random. New text should use it wherever someone would swear.
- **Gated content:** `lang: 1 | 2` on an event, or on a single event choice, makes it exist only at that setting or
  above (checked in `eventEligible`, `fireEvent` and when the answer is applied, like content tags). The simulator
  fails if one shows up below its level.
- **Flavor:** `langFlavor(result)` (from `runWithResult`) sometimes appends a muttered word to a good or bad outcome
  when the dial is up: mild at Salty, strong at Unfiltered. Nothing changes at Clean, and nothing in the game is more
  explicit at any setting.

**Intimacy.** `68-intimacy.js`, `1030-ui-intimacy.js` (chips on a person's page). Behind `mature` and `mature_intimacy`
(`INT_TAGS`; `intimOn()`), both off by default. Adults only (18+ on both sides, enforced in `intimStart`, in every
action's `when` and in every event's `ages`), consensual, with a way out at every step, and fade-to-black.
- **A night:** with the switches on, the hookup action (and "Hook up again") starts `intimStart` instead of the old
  one-liner. Popups: how you start (`inScene`: talk first, say plainly what you want, go with the flow, or "Not
  tonight"; they may say no too), protection (`inProtect`: protect, ask about a test, skip it, or change your mind),
  the night (`intimNight`: chemistry plus how clearly you talked decides electric, good or awkward; fade-to-black text),
  and the morning after (`inMorning`). A night while you are with someone and not open is a `fling_cheat` fact, so it
  becomes a web secret that can leak.
- **Consequences:** infection odds are 14% skipping protection, 2% with it, 0.6% after a test; they are **silent**
  (`known: false`) until a test, a checkup or symptoms a year on. Pregnancy odds scale with fertility, with
  contraception (`intim.bc`, a small yearly cost) cutting them to a quarter; a skipped night can bring a scare popup.
  `in_test` finds infections; a known one brings `in_sti_tell` (tell them, wait, or say nothing, which becomes a web
  secret of kind `sti`).
- **Spark:** `rels[pid].spark` (0-100) on partners, spouses, fiances, friends with benefits and flings drifts down
  each year (children and age cool it, a warm relationship helps) and a cold one cools the relationship. Actions on a
  partner: a night in, a weekend away, a talk about what you both want, something new together, a counselor.
- **Friends with benefits:** relationship kind `fwb`, asked for (`in_fwb_ask`: not with family, only when you are free
  to), nights (`in_fwb_night`, straight to the protection step), `in_fwb_define` (date or end it), and a yearly
  `feel` that can end in a popup where one of you wants more. It ends by itself when either of you gets serious.
- **Reputation:** five nights in three years is a reputation (`intimRep`), which costs a little with people who want
  something steady (`intimDateEdge`, read by `askOutOdds`) and a point of good name a year.
- **Events:** an ex texts at 1 a.m., a spark at work, a dating-app match, a tagged photo, a dry spell, an anniversary,
  a quiet morning of regret, and the diagnosis conversation.
- **Tests:** `dev/verify/intim.mjs`; the simulator flips the dial per life and fails on a night before 18.

**Substances and nightlife.** `69-substances.js` and `70-nightlife.js`. Behind `mature` and `mature_substances`
(`SUB_TAGS`; `subsOn()`), both off by default, adults only. It is about consequences: nothing says how anything is made
or taken, and none of it is made to look like a good idea.
- **The ladder:** `SUBSTANCES` lists the rungs (alcohol 0, weed 1, pills and party drugs 2, cocaine 3, opioids 4) with
  `hook` (habit added per use), `tol` (tolerance added), `od` (chance a use goes wrong) and `risk` (chance buying it gets you
  arrested). The new habits are real `ADDICTIONS` (`weed`, `cocaine`, `opioids`), so rehab, the finance sheet's habit
  cost and the health tick already handle them. `subMaxTier` is what gets offered: the next rung only opens after use
  of the one below.
- **Using:** `subsUse(s, id, { free, mixed })` pays, rolls the high (dulled by tolerance), adds the habit, builds tolerance
  (`M(s).subs[id].tol`), and returns `{ high, od, relapse }`; a use after a bad habit has been put down is a relapse.
  `habit()` in `19-health.js` writes `M(s).used[id] = year` for every positive use, old code included, so withdrawal
  counts alcohol and party drugs the base game already hands out.
- **The year (`subsYear`):** an unused substance fades tolerance and counts a year clean; a hooked person who did not
  use goes through withdrawal (health and happiness) and may get a craving popup (`subCraving`: hold on, call someone,
  or give in; a sponsor makes holding on far likelier).
- **Overdose:** `subsOverdose(s, id)` replaces the old instant death while the switch is on. With a friend nearby you
  usually survive (80% less a little per rung), alone about 45%; a survivor gets `subWake`: rehab, swear off it, or shrug.
- **Recovery:** `sub_meeting` (health menu) lowers the worst habit; after three a sponsor (relationship kind `sponsor`)
  gives you their number. Rehab (existing) now also resets tolerance (`subsRehab`). A year clean after a serious habit
  is an event and an achievement.
- **People:** dealers (kind `dealer`) turn up at nights out; `sub_buy` buys, and can get you ripped off or arrested
  (`possession` is a crime). Friends who offer, a work screening that fires users, an intervention at the kitchen
  table, a friend who overdoses in the back room (you can save them, or not), a dealer's call, a Monday you cannot
  account for.
- **A night out:** `nightMenu` offers three venues per city (`s.nightlife['cc:city']`: a bar, a club, and an after-hours
  place that only opens once your scene standing `M(s).night.scene` is 25). A night is a chain of popups sharing a small
  context (`nightStep`): how hard you go, then a shuffled plan of offers (a round, or a hard offer from the ladder) and
  incidents (a fight, a drunk friend, a lost phone, the bouncer), then how you get home (taxi, a friend's couch, walk,
  drive, or go home with someone when Intimacy is on). Driving impaired risks a crash, an arrest (`dui`) and death.
  The morning costs happiness and health in proportion to the night.
- **Tests:** `dev/verify/subs.mjs`, and the simulator checks tolerance, first use (never before 18), scene standing and
  `used` years.

**Zoos.** `58-zoo.js`, drawn on the company sheet by `zooSection` (`1024-ui-zoo.js`). A zoo is a company with
`ind: 'zoo'` and `co.zoo = { ticketPrice, welfare, visitorSat, exhibits, animals, breeding, ... }`, made on first
touch by `zooOf`.
- **Admission:** `zooAppeal(z)` turns the collection and its care into `Q` and a *fair price*
  (`34 * Q`). `zooMods` scales revenue by `Q * (fee / 28) * crowd`, where `crowd` falls as the ticket
  rises above the fair price, so the best of the four tiers (`ZOO_TICKET_PRICES`) climbs from Discount to
  VIP as the zoo improves. A zoo hides the company's generic Pricing action (`biz_pricing`); its generic
  product is an "attraction", not a habitat.
- **Care:** keepers (`ops`) per animal set welfare and happiness; habitats wear (`condition`, `security`)
  and `zoo_repair` restores them. Low condition or security raises `escapeRisk` in `zooYear`, which can
  open a `zooEscape` popup. Bills go through `zooCharge`: cash first, the rest on the company loan.
- **Breeding:** `zoo_breed` pairs a grown male and female (`zooBreedAge` from the species lifespan) who
  aren't already in a program. `zooYear` advances programs by `zooBreedRate` (zoologists, `rnd`); a
  program ends if a parent has left, and a baby goes to a habitat with room or to a partner zoo for a fee.
- **Tests:** `dev/verify/zoo.mjs`; the life simulator has a zoo persona and checks habitats, animals
  and care stay in range.

**Home projects and pets.** `17-assets.js` (projects) and `18-relationships.js` (pets).
- **Renovations:** `RENOVATION_PROJECTS` and `CONTRACTOR_TIERS` (`05-data-assets.js`). `asset_project` opens
  a catalog (`openProjectCatalog`): a single-unit home is offered all ten projects, a building with several
  units splits them into shared additions (`unit: null`) and interiors (one unit). A contractor bid can
  finish well, overrun, botch or skip town (`renovHireContractor`). Value, upkeep (solar) and rent
  (`marketRent`, an interior's boost is its unit's share) all read `a.renovations`. The `renov_*`
  actions only work in the home you live in. `asset_renovate` is plain repairs.
- **Pets:** exotic species (`exotic: true`, bought with `adopt_exotic`), tricks (`pet_train`), grooming,
  shows (`PET_SHOW_LEVELS`) and breeding. Pets have a `sex`; only a female breeds (`BREEDABLE_PETS`), with a
  male of her species or a stud, a litter every other year, at most `MAX_HOME_PETS` animals at home.
- **Loans and family debt:** `payOffLoan` opens a menu (`payLoanCustom` takes any amount); `p_pay_debt`
  lets you pay down a relative's `npcDebt`.

**Growing up.** `55-school-life.js`, `56-growing-up.js`, `57-lessons.js`.
- **The school year** (`schoolYearLife`, from `schoolTick` before the year advances): subjects drift
  (`driftSubjects`: each subject's offset from the overall grade follows `aptitude` and the teacher),
  popularity moves toward `popTarget` (looks, charisma, fame, the clique's `pop`, club ranks, traits, a
  bully), the report card is logged (`reportCard`, which `parentsSeeCard` reacts to), each club has its
  season (`clubSeason`), a bully may turn up or keep at it (`bullyYear`), and midterms may come. At most
  two popups a year. `schoolPull` (the teacher's liking, a bully) shifts the grade target.
- **People:** the teacher (`kind 'teacher'`, `p.teaches` a `SUBJECTS` id, a new one each school year) and
  the principal (`kind 'principal'`, one per school) are made by `newTeacher` and `newPrincipal`; a bully
  is `kind 'bully'` and `cur.bully`. `kinTitle` names teachers by subject and instructors by lesson.
- **The record:** `schoolTrouble(s, kind, why)` writes `M(s).edu.conduct`. Three detentions in a year
  become a suspension; repeated suspensions can expel you, which re-enrolls you in the same stage and
  year at a new school (`enrollSchool`), popularity near zero. Existing detentions (yelling, cheating,
  clowning) call it.
- **Clubs:** `SCHOOL_CLUBS` (`02-data-people.js`) has ranks, a kind, a minimum stage, tryouts, a big event
  (`comp`) and a `moment`. `cur.club[id] = { r, pts, yrs, last }`; points come from years, practice (the
  `cp_<id>` counter) and skill. Rank 3 needs your last two years (and the council's needs an election).
  Club records carry into the next school two ranks lower.
- **College:** `M(s).edu.resume` collects highlights (ranks, titles, lesson milestones, valedictorian)
  with weights; `examRec` keeps the best entrance-exam percentile. `cp_apply` picks up to four from
  `collegeCatalog` (`COLLEGE_TIERS` in `03-data-edu.js`) and stores `M(s).edu.apps`; at graduation
  `highSchoolFinale` names a valedictorian and decides: `appStrength` (grades, exam, résumé, essay, less
  the record) plus noise against each tier's `bar`, with `scholarshipFor`. The offers become the first
  choice after graduation; `openMajorPicker(s, 'university', offer)` skips the admissions roll, and the
  college's `tier` is kept on the degree (the interview odds read it).
- **Home:** `M(s).home` (see the file header) matters while `atHome`. `parentsSayYes` (money,
  relationship, strictness) decides requests and the richest parent pays; `groundFor` grounds (strict
  parents more often); `homeYear` pays the allowance and cuts it for no chores.
- **Lessons:** `LESSON_FAMS` and `LESSON_TYPES` (`03-data-edu.js`); `M(s).lessons[id] = { lvl, xp, yrs, on,
  pid, medals, best }`, up to three active. `lessonsYear` charges the fee (`parentsPayLessons`: your
  parents while you live with them, through 18), adds xp (practice counted as `lp_<id>`, skill, talent
  traits, an owned instrument, the teacher), tests for the next level (`lessonNeed`), and holds a
  showcase (`lessonShow`) if you didn't enter one. `lessonMilestone` tallies black belts, diplomas,
  fluency and grandmasters and adds to the résumé.

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
| `dev/verify/sim-lives.mjs` | Plays N random lives (with heirs) through the real engine with a random-choice bot. Checks stats stay 0–100, no NaN anywhere, no dangling people, no `undefined`/`NaN` in any text, handlers exist, export/import round-trips. Each life switches every content tag on or off at random and fails if anything tagged shows up while its tag is off. Persona lives steer the first generation into rare paths so they get tested too: one life in ten is born royal, and others get a sports career at 19, a fame career at 20, the streetwise skill to get into the underworld at 18, or a judge or lawyer job at 36, a chaos persona (Chaos switched on) gets powers at 14, becomes a hero or a villain at 18 and, every other time, a vampire at 45 who feeds when hungry and walks into the sunrise at 130, one life in ten plays a challenge (hand-made, daily or random), and a city persona rents at 20, moves city at 26 and 41, and at 30 buys a duplex to live in plus two homes to rent out, then plays landlord and tenant every year. Also checks that no building holds more tenants than units, and that a life that never lived in the US never shows a plain "$123" (one life in seven shows US dollars by setting). Prints a balance summary, including businesses, the courts, the family and cities, and lists events that never fired, actions that never ran and story chapters never reached. The underworld persona gambles too, with a bookie tab at 25, and owns the house: half of them run a book from 23, the other half buy two racehorses at 30 and open a casino at 35, then use Track & Book, racehorse or casino actions most years. Racehorses' numbers stay in range and a book always has punters. The courts persona also grows up on purpose: three Playtime, home, lessons, school or teacher actions a year until 18 (a bright kid every other time); popularity, subject offsets, club ranks and lesson levels must stay in range. A zoo persona (every twentieth life) opens a zoo at 28 and runs zoo actions most years; habitats, animals, welfare and cash must stay in range and no habitat may exceed its capacity. Flags: `--shard k/n` plays lives k, k+n, …; `--json <file>` writes the raw numbers; `--merge <files>` adds shards up and prints one summary. |
| `dev/verify/tags.mjs` | Content tags: every tag in use is in `CONTENT_TAGS` with a Settings default, and the filters hide tagged events, choices and actions (checked on fixture content, so it works before anything is tagged). Prints how much content carries tags. |
| `dev/verify/taboo.mjs` | Taboo gates: master + 7 subtype defaults OFF, per-kind gate matrix (master-only / subtype-only / wrong-subtype / teen-player / teen-partner all stay closed), tree persistence when a sibling becomes a partner, pedigree F (sibs 0.25, cousins 0.0625, second-gen 0.375), birth tallies, event gating (tag + real partner), dual kin label, no-leak on a generated family. |
| `dev/verify/cities.mjs` | Cities: every city has a profile and four stable neighborhood names; pay, rents and home prices follow the city; tech hubs out-hire small cities; moving takes your spouse and kids and returns your deposit; Germany caps raises at 3%; an expired notice ends a lease; a duplex holds you plus one tenant; background checks reveal the same applicants; unpaid rent leads to eviction; old saves get tenants and landlords. |
| `dev/verify/currency.mjs` | Currencies: every country has one; local formats (₹8,30,000 and ₹8.3L, 5,000 kr, -£250, ¥7.5M); the US-dollar setting; forty years of a Japanese life with no stray "$"; strengths stay in bounds and average about 1; emigrating converts at the strength ratio less 2% (nothing inside the eurozone, savings in the new currency come along free); foreign savings cost 1.5%, ride the currencies and keep their foreign amount; trips abroad cost more with weak money. |
| `dev/verify/chaos.mjs` | Chaos mode: every Chaos event and action is tagged; with the switch off the menu is empty and the tick does nothing; powers never repeat and kids don't see the casino uses; going public makes you famous; picking a side names you and makes a nemesis with powers; reputation climbs the ranks; outed heroes earn sponsorships; a well-fed vampire reaches 150 with a 30-year-old body, can't have children, can't turn anyone under 18, and a cure resumes aging; ascending as an archangel ends the life with the Archangel title and the next generation hears from them. |
| `dev/verify/challenges.mjs` | Challenges: every start and goal exists; a date always gives the same daily and another date another one; the starts (broke, royal, orphan, sickly, prodigy) set up what they say; goals complete when met and the challenge counts once; dying without it fails it; "die broke" only counts at death; daily streaks build, reset after a gap and ignore replays; the Chaos challenge hides while Chaos is off. |
| `dev/verify/zoo.mjs` | The zoo: founding gives two habitats and three animals; ticket tiers, new habitats, acquisitions, breeding, enrichment, vet and inspection work; a breeding program yields a newborn and welfare holds with enough keepers; a breach never takes cash below zero; only grown animals breed, a program ends when a parent leaves, a full habitat is never overfilled; the best ticket tier rises with the collection; repairs restore habitats and the generic pricing menu is hidden. |
| `dev/verify/youth.mjs` | Growing up: school starts at five with a teacher and a principal who are people; the teacher is named for their subject and a new one comes each year with a report card; a young artist does better in art than English; three detentions make a suspension and repeated suspensions expel you to a new school in the same grade; standing up to a bully works some of the time and fighting back can get you suspended; tryouts cut unfit kids; three clubs at most; captain only in your last years, on your record; the entrance exam follows smarts; strong applications get into elite schools and weak ones still get in somewhere; a full ride is free and the degree keeps the college tier; babies have Playtime; grounding hides outings, leaves sneaking out and ends with the year; the allowance comes from your parents; strict parents catch you more; house rules end at 18; lessons come with a teacher, parents pay, steady practice climbs to a black belt faster than none; quitting keeps your level; no lessons in a language you speak; adults pay their own way. |
| `dev/verify/house.mjs` | Owning the house: a standard book keeps about 5% of what's bet; an unlicensed book draws heat and a licensed one none; a felony blocks the license and some countries have none; credit fills the slate; a family eventually asks for its fifth and takes it; a raid on a bookie is a bookmaking charge; prison ends an unlicensed book; the big game's expected result is the hold and laying off locks a profit; a yearling from the sale is a named pet with a pedigree that goes into training at two and grows toward its ceiling; great horses win far more than poor ones; at nine they retire to the broodmare band or stud; a mare bred to your stallion foals next year with both parents' blood; horses count toward net worth and never run away; only three-year-olds run the Derby, once; the Gold Cup needs a stakes win; a big race pays its purse at the finish and goes on the record; a champion wins the Derby often but not always; a casino needs a clean record, has a venue in its city you can't gamble in, moves its revenue with the house edge, wins more whale years than it loses, often loses its license over a skim, and casino chains own casinos in other cities. |
| `dev/verify/gambling.mjs` | Gambling: every city has a bookie and Silver Mesa its casinos and resorts; venues persist and belong to crime families or hotel companies; wagering climbs to Whale and the jet is free; bookies lend and the app doesn't; race odds carry a take, every horse finishes once and never runs backwards, the payout waits for the finish and another action settles it; season bets pay when the season is played; debts escalate and grow; 400 beatings break bones far more often than they kill; family is untouched with Mature off; markers become lawsuits; the self-exclusion list shuts casinos but not bookies; counting cards bans you across the chain; the main event is only in Silver Mesa. |
| `dev/verify/sim-business.mjs` | Business balance report (add an industry id as the third argument to run just that one): every industry run 20 years under a sensible owner (who also franchises and buys a small rival when flush) and a hands-off owner. Survival, profit, size, IPO readiness, franchising and acquisitions at years 1/5/10/20. |
| `dev/verify/web.mjs` | The web: an affair is a secret and the partner learning it fires the caught popup; a circle weaves into symmetric, capped ties that never dangle; a rumor reaches you as a popup and every choice runs; squeezing, leaning and the hush-money call stay hidden with Mature off; a killing is a secret that chills the victim's friends and makes the city uneasy, and an uneasy city's prices grow slower; scandal costs interviews and juries and heirs inherit half; a bought silence makes a knower far less likely to talk; a throwing listener never breaks the game; teenagers hear no gossip; every web event and every choice runs. |
| `dev/verify/inv.mjs` | Investigations: a crime opens a case with a detective who is a person and evidence in range, tied to its secret; a series links, shares a detective and earns a nickname; strong evidence ends in an arrest, a careful culprit's case goes cold and a tip reopens it, and a murder never closes; every choice in the interview and warrant popups runs and an alibi can crack; witnesses and exposure feed the case and destroying evidence thins it; laying low and skipping town work; arson, a romance scam and insider trading leave cases; a detective gets a caseload, every way of working a case runs, solving pays and wrong arrests cost, pulling your own file works or gets you fired; strangers' crimes hit people you know and old files clear; thirty years of ticks stay in range and the file saves whole. |
| `dev/verify/work.mjs` | Career cards: every deck is on a real job and every card is complete, with real skills and clean text; a year's turn deals a hand and offers the first card; every card, every way, many seeds runs without errors and keeps the meter in range; all wins, a split and all losses come out good, so-so and bad; autopilot handles what you leave and is always a little worse than playing it yourself; a card's person becomes someone you know, the cast is capped, and a regular's confidence is a web secret; a strong meter lifts performance, a ruined one gets you fired, an astronaut cannot skip training; journalists publish (or retract), a doctor who spreads a patient's secret pays, quitting clears the desk; thirty years in every career stay in range and save whole. |
| `dev/verify/intim.mjs` | The dial and intimacy: `{~a|b|c}` picks by the setting and falls back; flavor appears only when the dial is up and strong words only at Unfiltered; language-gated events and choices appear at their own level and answering after the dial moved does nothing; with Mature or Intimacy off the old hookup is unchanged and no new action or event exists; nothing runs for anyone under 18 on either side; every path through a scene runs, "not tonight" and "I changed my mind" leave nothing, and a cheating night is a secret; skipping protection is far riskier than protecting or testing, contraception helps, infections are silent until found; spark rises with care and falls with neglect; friends with benefits can be asked for, spent, ended or dated, and only when free; the diagnosis conversation and a hidden diagnosis; every event and choice at every setting; a long life with everything on. |
| `dev/verify/subs.mjs` | Substances and nightlife: with Mature or Substances off the old night out and the old overdose are unchanged; nothing runs for anyone under 18; offers climb a rung at a time; tolerance dulls the high and sharpens the hook and mixing makes it riskier; a relapse is counted; a hooked person who stops goes through withdrawal and cravings, every craving choice runs, and a sponsor makes holding on far likelier; meetings, a sponsor, rehab and a year clean; a friend nearby changes an overdose a lot, the second chance has a way out, and it can end badly; dealers, a buy that can go wrong; after-hours is invite only, every path through a night out runs, the drive home is dangerous; every event and choice, a screening that catches use, a friend who can be saved; long lives with everything on. |
| `dev/verify/emoji-audit.mjs` | Fails on emoji newer than Emoji 12, which render as boxes on Windows 10. |
| `dev/verify/godmode.mjs` | God Mode's per-person rules: parent and child ages, a spouse never under 18, bodies removed and restored across 18, clean names, clamped stats, trait conflicts and the limit of four, age limits on jobs, money, education, gender, orientation and home, and which relationships can change kind. |
| `dev/verify/run-all.mjs` | `npm run verify`: the syntax check (in-process), then every other check as its own process, in parallel (one per core, `VERIFY_JOBS=n` to cap it), with each check's output printed when it finishes. The 300-life simulator is split into shards (a count that shares no factor with 10, so the personas spread evenly) and merged into one summary. About a minute on 12 cores. |
| `dev/verify/ui-smoke.js` | Paste into the browser console: plays 60 years through the real UI, opening every sheet. |

## The finishing pass (81 to 87)

- **Yearly turns without editing the list.** `onYear(name, fn)` (25-ageup.js) registers a yearly turn that runs, in load
  order, in one phase after `capYear` and before the paper. A hook that throws is logged and skipped, so a new system can
  never stop the year. Files from 81 on use it; older files still have their own wrappers.
- **New kinds of secret.** `defSecretKind(kind, { sev, icon, mine, rumor, expose, stake, tipOdds, victim })` (62-web.js).
  `expose` runs when it gets out, `tipOdds` is a yearly risk with no knower needed, `victim` (a function or `true`) means its
  getting out is no scandal for the subject. Used by 81 (`deserter`, `informant`, `spy_life`), 82 (`fraud`, `long_con`,
  `blackmail_ring`), 83 (`operation`), 84 (`vigilante`) and 85 (`abuse`).
- **Places.** `s.web.places[key]` (81-web2.js): `placeVisit(s, key, { kind, name, emoji }, [pids])`, `placeRegular`, `placeIncident`,
  `placeVibe`, `placesYours`. A card deck can name its place with `def.place(s)` and the people it deals become regulars
  (65-work.js). Regulars are tied to each other (`work` for a workplace, `place` otherwise).
- **Facts added to the bus:** `good_deed`, `biz_event`, `biz_failed`, `court_verdict`, `spy_burned`, `memoir_out`, `secret_out`,
  `place_incident` (all in 81), `victim` (announced by 82/83/84, `s.web.victims`).
- **Career-cards extras (65-work.js):** `twist` and `only` on a card (a follow-up that opens at once after a good result),
  `def.yearStart` (a season, a class), `def.place`, `def.kv`.
- **Ventures UI.** `opsCard()` on the profile and `SHEETS.ops` (1032-ui-ops.js) show the scheme, the con, the files, the
  operation and the vigilante; their actions are in the Schemes & Rackets, Underworld and Street Justice menus.
- **Tests.** `web2`, `schemes`, `operation`, `justice`, `abuse` and `careers2` in `dev/verify/`; `ui-smoke-run.mjs` runs the
  browser smoke test in headless Chromium; `dev/bump-versions.py` bumps the `?v=N` cache-busters of every changed file.
