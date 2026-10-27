/* =====================================================================
 * 67-language.js — the language dial. Settings → Language: Clean (the
 * game as it was), Salty (people swear like people) or Unfiltered (they
 * swear like people who are really upset). It changes how people talk
 * and nothing else: no scene is more explicit at any setting.
 *
 *   {~clean|salty|unfiltered}   in any text run through vary() picks by the dial
 *                               (and falls back to the last one you give it)
 *   lang: 1 | 2                 on an event, or on a single event choice: it only exists at
 *                               that setting or above (checked like content tags)
 *   langFlavor(result)          when the dial is up, a good or bad outcome sometimes gets a
 *                               muttered word appended (called by runWithResult in 12-flow.js)
 * langLevel() and langPick() are in 00-util.js.
 * ===================================================================== */

const LANG_FLAVOR = {
  bad: [
    ['You swore under your breath.', '"Well, that sucked."', 'You said a word your grandmother would not approve of.'],
    ['"Shit." It was the only word that fit.', 'You swore, loudly and creatively, at no one in particular.', '"Fuck." You said it quietly, and then not quietly.', '"Well, that went to hell."'],
  ],
  good: [
    ['"Hell yes."', 'You grinned. Damn, that felt good.'],
    ['"Fuck yes."', '"Holy shit, that worked."'],
  ],
};
function langFlavor(r) {
  const L = langLevel();
  if (!L || !r || !r.tone || !LANG_FLAVOR[r.tone] || chance(0.65)) return '';
  return ' ' + pick(LANG_FLAVOR[r.tone][L - 1]);
}

/* ---- things that only happen when people talk like people ----------------------- */
EV('ln_road_rage', {
  ages: [17, 80], lang: 1, emoji: '🚗', title: 'Cut off', cooldown: 4,
  when: (s) => M(s).license && free(s),
  text: 'A driver swerves across two lanes to make an exit, missing your bumper by an inch. You are still holding the wheel very hard.',
  choices: [
    ['Lean on the horn', (s) => { add(s, { happy: 1 }); return vary('You leaned on the horn for a full {~three seconds|three seconds, shouting "{~oh, come on|what the hell|what the fuck}!"|three seconds, shouting every word you know}. The other car did not notice.'); }],
    ['Breathe and let it go', (s) => { add(s, { karma: 1, happy: 1 }); return 'You counted to ten, and then to twenty. It was nobody’s day but yours.'; }],
    { label: 'Give them a hand gesture', lang: 1, fx: (s) => { add(s, { happy: 2, karma: -1 }); return chance(0.15) ? (add(s, { happy: -4 }), 'It was the wrong car. The driver was very large and very polite about it, which was worse.') : vary('You made a sign that needs no translation. For one second, you felt amazing.'); } },
    { label: 'Chase them down and scream', lang: 2, fx: (s) => {
      if (chance(0.3)) { add(s, { health: -4, happy: -5 }); return { text: 'You followed them for four miles, screaming at the windshield. They turned into a police station. You kept driving, very quickly, in the other direction.', tone: 'bad' }; }
      add(s, { happy: 3, karma: -3 });
      return 'You pulled up at the light and told them, in detail, what you thought of their driving, their mother and their car. They did not hear any of it. You felt great until you got home.';
    } },
  ],
});
EV('ln_boss_meeting', {
  ages: [20, 70], lang: 1, emoji: '🗯️', title: 'The meeting', cooldown: 4,
  when: (s) => !!M(s).career && free(s),
  text: 'Your boss presents a plan in front of everybody that will obviously fail and will obviously be blamed on your team.',
  choices: [
    ['Nod and take notes', (s) => { M(s).career.perf = clamp100(M(s).career.perf + 1); return 'You nodded and took notes. Three months later you were right, and nobody remembered you said anything.'; }],
    ['Politely raise your concerns', (s) => { const c = M(s).career; if (chance(0.55 + skill(s, 'charisma') / 300)) { c.perf = clamp100(c.perf + 5); return 'You said it calmly, with numbers. Your boss thanked you for your input and quietly changed the plan.'; } c.perf = clamp100(c.perf - 3); return 'You raised your concerns. Your boss nodded in the way that means "I was not listening."'; }],
    { label: 'Tell them exactly what you think', lang: 1, fx: (s) => { const c = M(s).career; if (chance(0.4)) { c.perf = clamp100(c.perf + 6); add(s, { happy: 4 }); return vary('You said, "{~This is a really bad idea|This is a damn bad idea|This is a fucking terrible idea}," and then you proved it. Half the room looked at their shoes. The other half looked at you with something like love.'); } c.perf = clamp100(c.perf - 8); add(s, { happy: 2 }); return { text: vary('You said, "{~This will not work|This is a damn mess|This is a fucking mess}," a little louder than you meant to. Your boss smiled with all their teeth. You will be hearing about this.'), tone: 'bad' }; } },
    { label: 'Tell them where to put it', lang: 2, fx: (s) => { if (chance(0.35)) { fire(s, 'You told your boss, in front of the whole team, precisely where they could put the plan. It was a very specific location. You were escorted out by security, who looked impressed.'); add(s, { happy: 6 }); return; } M(s).career.perf = clamp100(M(s).career.perf - 12); return { text: 'You told your boss, in front of the whole team, exactly where to put the plan. The silence lasted a full ten seconds. It has been the best and worst ten seconds of your career.', tone: 'bad' }; } },
  ],
});
EV('ln_stubbed_toe', {
  ages: [8, 90], lang: 1, emoji: '🦶', title: 'The coffee table', cooldown: 3,
  text: 'You walk into the coffee table, toe first, in the dark.',
  auto: (s) => { add(s, { happy: -2, health: -1 }); return vary('You said {~"ouch"|a word that is not in the dictionary|a word that is, in fact, several words} and hopped around the room on one foot.'); },
});
EV('ln_game_night', {
  ages: [18, 70], lang: 1, emoji: '🎲', title: 'Game night', cooldown: 3,
  when: (s) => !!pickRel(s, ['friend', 'bestie']),
  ctx: (s) => someone(s, ['friend', 'bestie']),
  text: (s, c) => `${nm(s, c.pid)} landed on your property for the third time, and has started talking trash.`,
  choices: [
    ['Take it with a smile', (s, c) => { addRel(s, c.pid, 3); return 'You took the loss with grace. It was extremely annoying for everyone, including you.'; }],
    ['Give it right back', (s, c) => { addRel(s, c.pid, 6); add(s, { happy: 4 }); return vary('You gave it right back: "{~Is that the best you have?|Is that the best you’ve got, you clown?|Is that the best you’ve got, you absolute asshole?}" The table lost it. Somebody cried laughing.'); }],
    { label: 'Flip the board', lang: 2, fx: (s, c) => { addRel(s, c.pid, -5); add(s, { happy: 3 }); return 'You flipped the board. The pieces went everywhere. For a second, nobody said a word, and then everybody said several.'; } },
  ],
});
EV('ln_kid_word', {
  ages: [22, 60], lang: 1, emoji: '🧒', title: 'Where did they learn that?', cooldown: 4,
  when: (s) => relPeople(s, ['child']).some((k) => ageOf(s, k) >= 3 && ageOf(s, k) <= 9),
  ctx: (s) => ({ pid: pick(relPeople(s, ['child']).filter((k) => ageOf(s, k) >= 3 && ageOf(s, k) <= 9)).id }),
  text: (s, c) => `${nm(s, c.pid)} just said a word at the dinner table. A very specific word. In your exact voice.`,
  choices: [
    ['Calmly explain it is a grown-up word', (s, c) => { addRel(s, c.pid, 2); return 'You explained, with a straight face, that some words are for grown-ups. They asked which grown-up taught it. You studied your plate.'; }],
    ['Laugh before you can stop yourself', (s, c) => { addRel(s, c.pid, 4); add(s, { happy: 3 }); return 'You tried not to laugh, and failed. They said it twice more, for the applause.'; }],
    ['Own up to it', (s, c) => { add(s, { karma: 2 }); return 'You admitted it was your word, and your fault. It was a better parenting moment than you deserve.'; }],
  ],
});
EV('ln_roommate_fight', {
  ages: [18, 40], lang: 1, emoji: '🍕', title: 'Whose leftovers', cooldown: 3,
  text: 'Someone ate your leftovers. The labeled ones. With your name on them in marker. The pizza box is still on the counter.',
  choices: [
    ['Leave a polite note', () => 'You left a polite note. It was passive-aggressive in a way that was almost an art form.'],
    ['Confront them', (s) => { add(s, { happy: 2 }); return vary('"Did you eat my {~food|damn leftovers|fucking leftovers}?" There was a pause. "…Maybe." It ended in a very long conversation about boundaries and a very short one about pizza.'); }],
    { label: 'Burn the house down (figuratively)', lang: 2, fx: (s) => { add(s, { happy: 3, karma: -1 }); return 'You shouted a list of grievances that went back eleven months and included the tone of voice they use on the phone. A door was slammed. Then, quietly, a pizza was ordered for both of you.'; } },
  ],
});
