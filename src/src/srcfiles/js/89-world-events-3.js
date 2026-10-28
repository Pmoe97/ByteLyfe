/* =====================================================================
 * 89-world-events-3.js — personal events for the country rows of 09-data-history-3/4/5.js (see 89-world-events.js
 * for the rules): a night in a speakeasy, the Brexit vote, the boat to England, the Collor plan, the 500 percent week,
 * the gold-collecting drive, demonetisation, load-shedding, May 1968 and People Power. A date in history is `sure`,
 * so it comes the year it happens; the rest wait their turn.
 * ===================================================================== */

// Money taken out of cash first and then savings; the total can not go below zero.
function wdTake(s, amt) {
  const m = M(s), sv = Math.min(Math.max(0, m.invest.savings || 0), amt);
  m.invest.savings = (m.invest.savings || 0) - sv;
  m.money -= amt - sv;
  return amt;
}
const wdLiquid = (s) => Math.max(0, M(s).money) + Math.max(0, M(s).invest.savings || 0);
const wdMove = (s, cc, city, why) => {
  const cost = price(s, 400);
  if (!pay(s, cost)) return cantAfford(cost);
  const line = emigrateNow(s, cc, city);
  return { text: `${why} ${line.text}`, tone: 'good', emoji: line.emoji };
};

/* ---- Prohibition ------------------------------------------------------------------------------------------------------------- */
EV('wd_speakeasy', {
  ages: [18, 80], cooldown: 4, emoji: '🥃',
  when: (s) => worldHas(s, 'prohibition') && free(s) && !inService(s),
  text: 'A friend knows a door with no sign and a password. Behind it there is a piano, a smoky room, and a very good time. The police are said to look the other way, mostly.',
  choices: [
    ['Say the password and go in', (s) => {
      if (chance(0.12)) { const fine = Math.min(price(s, 120), Math.max(0, M(s).money)); M(s).money -= fine; add(s, { happy: -2 }); return { text: `The whistle blew halfway through the second song. You spent the night in a cell with forty people in evening clothes, and paid ${fmtMoney(fine)} to go home.`, tone: 'bad' }; }
      add(s, { happy: 4, health: -1 });
      return 'The piano player was brilliant, the drinks were terrible, and you danced until the sky went gray. Nobody remembered the password the next day.';
    }],
    { label: 'Offer to carry bottles for them', sub: 'Pays well, and it is against the law', fx: (s) => {
      addSkill(s, 'streetwise', 3);
      if (chance(0.25)) return sentence(s, 'bootlegging', 1, 'A federal agent was waiting at the dock.');
      const v = price(s, randInt(300, 900)); add(s, { money: v, karma: -2, happy: 1 });
      return `Two crates in the back of a truck, a long drive in the dark, and ${fmtMoney(v)} in an envelope. Nobody said a word to you, and that was part of the pay.`;
    } },
    ['Stay home', (s) => { add(s, { karma: 1 }); return 'You said you had to be up early. Your friend said you were no fun, and told the whole story in the morning anyway.'; }],
  ],
});

/* ---- the Brexit vote: any choice is fine, and families disagree whichever you make ---------------------------------------------- */
function wdBrexit(s, c, how) {
  const kin = c && c.pid && s.people[c.pid] ? nm(s, c.pid) : '';
  flag(s, 'brexitVote', how);
  add(s, { happy: -1 });
  if (kin) addRel(s, c.pid, -6);
  const line = how === 'home' ? 'You stayed home and watched it on the news, and woke up to the result like everyone else.' : `You marked your box and walked home past people who had marked theirs the other way.`;
  return `${line}${kin ? ` ${kin} had a very different view and said so, over lunch, for some time.` : ' Some of your family and friends were thrilled and the others were devastated, and by the evening it was hard to find a room that agreed.'}`;
}
EV('wd_brexit_vote', {
  ages: [18, 100], once: true, sure: true, emoji: '🗳️',
  when: (s) => s.year === 2016 && worldHas(s, 'brexit') && P(s).country === 'uk',
  ctx: (s) => someone(s, ['parent', 'sibling', 'spouse', 'partner', 'child', 'friend', 'grandparent']) || {},
  text: 'Today the country votes on whether to leave the European Union. Everyone you know has an opinion, and a good many of them have been telling you what it is for weeks.',
  choices: [
    ['Vote to leave', (s, c) => wdBrexit(s, c, 'leave')],
    ['Vote to remain', (s, c) => wdBrexit(s, c, 'remain')],
    ['Stay home', (s, c) => wdBrexit(s, c, 'home')],
  ],
});

/* ---- the boat to England: no visa within the islands ------------------------------------------------------------------------------ */
EV('wd_boat_to_england', {
  ages: [18, 40], once: true, emoji: '🚢',
  when: (s) => P(s).country === 'ie' && (worldHas(s, 'ie_emigration_50s') || worldHas(s, 'ie_emigration_80s')) && free(s) && !inService(s) && !inSchool(s) && !M(s).career,
  text: (s) => (s.year < 1970 ? 'There is no work for you here, and the boat to England leaves from Dublin on Friday. Half your class is already over there, laying roads and building flats.' : 'There is no work for you here, and the ferry and the cheap flights all go the same way. Half your class is already in London, in Boston, or in Sydney.'),
  choices: [
    { label: 'Go to England', sub: (s) => fmtMoney(price(s, 400)), fx: (s) => wdMove(s, 'uk', pick(['London', 'Birmingham', 'Manchester', 'Liverpool']), 'You packed one case. Your mother stood at the port in her good coat and did not wave until the boat was a dot.') },
    { label: 'Go to America', sub: (s) => fmtMoney(price(s, 400)), when: (s) => s.year >= 1950, fx: (s) => wdMove(s, 'us', pick(['New York', 'Boston', 'Chicago']), 'An aunt in the Bronx had sent the fare and a name to ask for. You landed with an address on a piece of paper.') },
    ['Stay and hope', (s) => { add(s, { happy: -3 }); return 'You stayed. You did what odd jobs there were. Every Christmas the house filled with the people who had gone, and emptied again.'; }],
  ],
});

/* ---- Brazil: the savings freeze ----------------------------------------------------------------------------------------------------- */
const wdFrozen = (s) => Math.max(0, wdLiquid(s) - price(s, 1000));
EV('wd_collor_plan', {
  ages: [18, 100], once: true, sure: true, emoji: '🔒',
  when: (s) => s.year === 1990 && worldHas(s, 'br_hyperinflation') && wdFrozen(s) >= price(s, 800),
  text: (s) => `Overnight, the new government has frozen almost every bank account in the country. You may take out ${fmtMoney(price(s, 1000))}. The rest of your ${fmtMoney(wdFrozen(s))} stays where it is for eighteen months.`,
  choices: [
    ['Wait it out', (s) => { const lost = wdTake(s, Math.round(wdFrozen(s) * 0.35)); add(s, { happy: -4 }); return { text: `The money came back in installments, in a currency worth a third less than the one it went in as. You lost ${fmtMoney(lost)} to the wait.`, tone: 'bad' }; }],
    { label: 'Hire a lawyer to claim an exception', sub: (s) => fmtMoney(price(s, 500)), fx: (s) => {
      const fee = price(s, 500);
      if (!pay(s, fee)) return cantAfford(fee);
      if (chance(0.45)) { add(s, { happy: 3 }); return { text: 'A judge granted you an exception. The lawyer charged like a surgeon and was worth it. You had your money by March.', tone: 'good' }; }
      const lost = wdTake(s, Math.round(wdFrozen(s) * 0.35)); add(s, { happy: -5 });
      return { text: `The case went nowhere for a year. Then the money came back anyway, ${fmtMoney(lost)} lighter, and the lawyer had been paid in full already.`, tone: 'bad' };
    } },
    ['Find a man who knows a back door', (s) => {
      add(s, { karma: -2 });
      if (chance(0.2)) { const lost = wdTake(s, Math.round(wdFrozen(s) * 0.7)); add(s, { happy: -8 }); return { text: `He took a fee up front and was never seen again. You are out ${fmtMoney(lost)}, and there is nobody to report it to.`, tone: 'bad' }; }
      const lost = wdTake(s, Math.round(wdFrozen(s) * 0.15)); add(s, { happy: 2 });
      return `He kept ${fmtMoney(lost)} and had the rest in your hand by Friday, in notes. You did not ask how.`;
    }],
  ],
});

/* ---- Sweden: the 500 percent week --------------------------------------------------------------------------------------------------- */
EV('wd_500_percent', {
  ages: [22, 90], once: true, sure: true, emoji: '📈',
  when: (s) => s.year === 1992 && worldHas(s, 'se_banking_crisis') && !!wdMortgage(s),
  text: (s) => `The central bank has raised its overnight rate to 500 percent to defend the krona. The mortgage on your ${wdMortgage(s).a.name} floats with it: ${fmtMoney(wdMortgage(s).l.balance)} is still owed.`,
  choices: [
    { label: 'Pay part of it off now', sub: (s) => fmtMoney(Math.round(Math.min(wdLiquid(s), wdMortgage(s).l.balance * 0.25))), fx: (s) => {
      const { l } = wdMortgage(s), amt = Math.round(Math.min(wdLiquid(s), l.balance * 0.25));
      if (amt < price(s, 200)) return { text: 'You had nothing to put against it. You held your breath.', tone: 'bad' };
      wdTake(s, amt); l.balance -= amt; add(s, { happy: 1 });
      return `You emptied your savings into the loan, ${fmtMoney(amt)} of it. The rate was back to normal in a few days, and so was your sleep.`;
    } },
    ['Fix the rate for five years', (s) => {
      const fee = price(s, 500); M(s).money -= fee; add(s, { happy: -1 });
      return `The bank charged ${fmtMoney(fee)} to fix it at a high number. The rate fell later, and you were stuck with it. You slept well, though.`;
    }],
    ['Sit tight', (s) => {
      const cost = Math.round(wdMortgage(s).l.balance * 0.02); M(s).money -= cost; add(s, { happy: -3 });
      return { text: `It was only for a few days, but the interest was real. It cost you ${fmtMoney(cost)}, and you read the paper standing up for a week.`, tone: 'bad' };
    }],
  ],
});

/* ---- South Korea: the gold-collecting drive -------------------------------------------------------------------------------------------- */
EV('wd_gold_drive', {
  ages: [15, 95], once: true, sure: true, emoji: '💍',
  when: (s) => s.year === 1998 && worldHas(s, 'kr_imf_crisis') && P(s).country === 'kr',
  text: 'The country has asked its citizens to donate their gold, to pay the rescue loan back. Banks have set up tables with scales, and the line goes around the block. Your family has a few rings in a drawer.',
  choices: [
    { label: 'Donate your gold', sub: (s) => `Worth about ${fmtMoney(price(s, 300))}`, fx: (s) => { add(s, { karma: 3, happy: 3 }); for (const p of relPeople(s, ['parent', 'grandparent', 'spouse'])) addRel(s, p.id, 3); M(s).money -= Math.min(price(s, 300), Math.max(0, M(s).money)); return { text: 'You stood in line with your grandmother’s ring in your hand. The man behind the table wrote your name in a book. It was a good day, and the drawer is lighter.', tone: 'good' }; } },
    ['Sell it for the cash', (s) => { const v = price(s, 300); add(s, { money: v, karma: -1, happy: -1 }); return `Gold fetched a record price that week. You walked out with ${fmtMoney(v)}. A neighbor saw you leave the jeweler’s and looked away.`; }],
    ['Keep it', () => 'The gold stayed in the drawer. Some of your neighbors lined up, and some did not, and nobody said much about it afterwards.'],
  ],
});

/* ---- India: demonetisation -------------------------------------------------------------------------------------------------------------------- */
const wdNotes = (s) => Math.round(Math.max(0, M(s).money) * 0.2 * 0.86); // a fifth of what you have is in cash, and most of that is in the old notes
EV('wd_demonetisation', {
  ages: [18, 100], once: true, sure: true, emoji: '💵',
  when: (s) => s.year === 2016 && worldHas(s, 'in_demonetisation') && wdNotes(s) >= price(s, 100),
  text: (s) => `At midnight, the largest notes stop being money. About ${fmtMoney(wdNotes(s))} of what you keep at home is in them. You can exchange them at a bank, if you can get through the door.`,
  choices: [
    ['Queue at the bank for days', (s) => { const lost = Math.round(wdNotes(s) * 0.03); M(s).money -= lost; add(s, { happy: -3, health: -1 }); return { text: `You stood in the heat for most of a week, and lost your voice arguing with the man at the counter. You got it all back except ${fmtMoney(lost)} in errors and little costs.`, tone: 'bad' }; }],
    ['Pay someone to deposit it', (s) => { const lost = Math.round(wdNotes(s) * 0.12); M(s).money -= lost; add(s, { karma: -1, happy: -1 }); return `A cousin of a cousin who knows the manager took ${fmtMoney(lost)} to do it. You did not enjoy the arrangement, and you were home by lunch.`; }],
    ['Spend the notes while shops will take them', (s) => { const lost = Math.round(wdNotes(s) * 0.25); M(s).money -= lost; add(s, { happy: 1 }); return `Gold shops, petrol pumps and tailors took them for a day, at a markup. You bought a great many things you did not need, and lost ${fmtMoney(lost)} in the exchange.`; }],
  ],
});

/* ---- South Africa: the lights go out ------------------------------------------------------------------------------------------------------------ */
EV('wd_generator', {
  ages: [20, 100], once: true, emoji: '🔌',
  when: (s) => worldHas(s, 'za_loadshedding') && free(s) && wdLiquid(s) >= price(s, 400) && !flag(s, 'wdPower'),
  text: 'The lights go out for four hours, twice a day, on a schedule that changes every week. The food in the fridge is warm, and the neighbors are buying generators.',
  choices: [
    { label: 'Buy a small generator', sub: (s) => fmtMoney(price(s, 600)), fx: (s) => { const c = price(s, 600); if (!pay(s, c)) return cantAfford(c); flag(s, 'wdPower', 'gen'); add(s, { happy: 1 }); return 'It is loud, it smells, and the fridge stays cold. You are the only house on the street with a light on, and you feel slightly guilty about it.'; } },
    { label: 'Put solar panels on the roof', sub: (s) => fmtMoney(price(s, 4000)), fx: (s) => { const c = price(s, 4000); if (!pay(s, c)) return cantAfford(c); flag(s, 'wdPower', 'solar'); add(s, { happy: 2 }); return { text: 'The installer was booked for months and then it was done in a day. The meter runs backwards, and the lights stay on.', tone: 'good' }; } },
    ['Get a gas stove and candles', (s) => { M(s).money -= Math.min(price(s, 60), Math.max(0, M(s).money)); addSkill(s, 'cooking', 2); return 'You learned to cook by candlelight, and your pasta got better. The fridge is still a problem.'; }],
    ['Put up with it', (s) => { add(s, { happy: -1 }); return 'You bought a good torch and learned the schedule by heart.'; }],
  ],
});
// A generator softens the years of load-shedding and a solar roof pays back a little each year.
onYear('worldPower', (s) => {
  const f = flag(s, 'wdPower');
  if (!f || !worldHas(s, 'za_loadshedding') || P(s).country !== 'za') return;
  if (chance(f === 'solar' ? 0.8 : 0.5)) add(s, { happy: 1 });
  if (f === 'solar') add(s, { money: price(s, 150) });
});

/* ---- France: May 1968 ---------------------------------------------------------------------------------------------------------------------------------- */
EV('wd_may_68', {
  ages: [15, 60], once: true, sure: true, emoji: '✊',
  when: (s) => s.year === 1968 && worldHas(s, 'may_68') && P(s).country === 'fr' && free(s),
  ctx: (s) => someone(s, ['parent']) || {},
  text: 'Students have taken over the university, and the factories are on strike. Everything is closed, there are barricades in the street, and a great many people are discovering they have opinions.',
  choices: [
    ['Join the students at the barricades', (s, c) => {
      add(s, { happy: 3, karma: 1 }); if (c.pid) addRel(s, c.pid, -4);
      if (chance(0.08)) { add(s, { health: -8 }); return { text: 'The police charged at dawn. You were hit by a baton and spent a night in a hospital corridor. You would not say you regretted it.', tone: 'bad' }; }
      return 'You sang until your voice went and argued about everything until dawn. Nothing was the same afterwards, though it is hard to say what exactly changed.';
    }],
    ['Join the strike', (s) => { add(s, { happy: 1 }); return 'You put down your tools with everyone else and sat in the sun for three weeks. The raise they won was real, and so were the wages you did not get.'; }],
    ['Stay out of it', (s) => { add(s, { happy: -1 }); return 'You kept your head down and queued for petrol. The whole country seemed to be on the other side of a glass door.'; }],
  ],
});

/* ---- the Philippines: People Power ----------------------------------------------------------------------------------------------------------------------- */
EV('wd_people_power', {
  ages: [12, 90], once: true, sure: true, emoji: '🌼',
  when: (s) => s.year === 1986 && worldHas(s, 'ph_people_power') && P(s).country === 'ph' && free(s),
  text: 'Thousands of people are walking toward the avenue, and the radio says tanks are on the way. The crowd is singing, and there are nuns in the front row.',
  choices: [
    ['Go to the avenue with the crowd', (s) => { add(s, { happy: 6, karma: 2 }); if (chance(0.04)) { add(s, { health: -6 }); return { text: 'You were bruised in the crowd, and you were there when the soldiers lowered their guns. You would not trade it.', tone: 'good' }; } return { text: 'You stood in the road for two days holding a candle, and a soldier took a flower from your hand. It was the best two days of your life, and nobody was hurt.', tone: 'good' }; }],
    ['Bring food and water to the crowd', (s) => { M(s).money -= Math.min(price(s, 30), Math.max(0, M(s).money)); add(s, { happy: 4, karma: 3 }); return 'You carried bread and water to the front, and a soldier thanked you in a very small voice.'; }],
    ['Stay home and listen to the radio', (s) => { add(s, { happy: 2 }); return 'You stayed by the radio with the doors locked. When it was over, you went out in the street, and everyone was hugging.'; }],
  ],
});
