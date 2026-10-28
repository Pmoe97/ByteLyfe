/* =====================================================================
 * 87-honors.js — achievements and legacy titles for the finishing pass:
 * a good name, schemes and the operation, street justice, the careers of
 * part two, and the way out of a bad relationship. Counters come from the
 * systems' own tally() calls (lifeCount, LC) and from what they leave
 * on the player (M(s).scheme.done is the record of how each venture ended).
 * ===================================================================== */

const endedLike = (s, kind, how) => !!(M(s).scheme && M(s).scheme.done.some((d) => d.kind === kind && (!how || [].concat(how).includes(d.how))));
ACHIEVEMENTS.push(
  { id: 'good_pillar', name: 'Pillar of the Community', emoji: '🏛️', desc: 'Become a pillar of the community.', check: (s) => !!webRep(P(s)).pillar },
  { id: 'good_organizer', name: 'Block Captain', emoji: '🎈', desc: 'Organize three things for the neighborhood.', check: (s) => LC(s, 'organized') >= 3 },
  { id: 'good_name', name: 'Spotless', emoji: '🕊️', desc: 'Reach a good name of 90% after age 30.', check: (s) => A(s) >= 30 && webRep(P(s)).name >= 90 },
  { id: 'pz_fall', name: 'House of Cards', emoji: '📉', desc: 'Watch an investment scheme collapse.', check: (s) => LC(s, 'schemesCollapsed') >= 1 },
  { id: 'pz_honest', name: 'The Honest Exit', emoji: '🤝', desc: 'Wind down an investment scheme and pay everyone back.', check: (s) => endedLike(s, 'ponzi', 'wound down') },
  { id: 'con_clean', name: 'Come Clean', emoji: '🕯️', desc: 'Confess a long con and give some of it back.', check: (s) => endedLike(s, 'con', 'confessed') },
  { id: 'ring_squeeze', name: 'Leverage', emoji: '✉️', desc: 'Squeeze five people with what you know.', check: (s) => LC(s, 'squeezes') >= 5 },
  { id: 'op_network', name: 'A Network', emoji: '📦', desc: 'Build an operation into a network.', check: (s) => !!M(s).op && opStage(M(s).op) >= 2 },
  { id: 'op_out', name: 'Out Clean', emoji: '🚪', desc: 'Close an operation and pay your crew off.', check: (s) => endedLike(s, 'operation', 'closed') },
  { id: 'op_death', name: 'What It Costs', emoji: '🕯️', desc: 'Close an operation after somebody died of what you sold.', check: (s) => endedLike(s, 'operation', 'quit after a death') },
  { id: 'vig_lantern', name: 'The Lantern', emoji: '🏮', desc: 'Become a name the papers use.', check: (s) => !!M(s).vig && M(s).vig.rep >= 25 },
  { id: 'fallout_in', name: 'Walk In', emoji: '🚶', desc: 'Turn yourself in to a victims\' group.', check: (s) => LC(s, 'turnedIn') >= 1 },
  { id: 'ab_out', name: 'Out', emoji: '🕯️', desc: 'Leave an abusive relationship.', check: (s) => endedLike(s, 'abuse', ['left', 'left, with a plan', 'reported']) },
  { id: 'ab_changed', name: 'A Different Person', emoji: '💭', desc: 'Do the work and stop being the one who hurts someone.', check: (s) => endedLike(s, 'abuse', 'changed') },
  { id: 'work_forensic', name: 'The Evidence Speaks', emoji: '🔬', desc: 'Help close three cases from the lab or the profile room.', check: (s) => LC(s, 'casesAided') >= 3 },
  { id: 'work_twist', name: 'Plot Twist', emoji: '🌀', desc: 'Get three twists after a good result at work.', check: (s) => LC(s, 'workTwists') >= 3 },
  { id: 'work_cookoff', name: 'World Champion', emoji: '🥇', desc: 'Win the world cook-off.', check: (s) => LC(s, 'worldCook') >= 1 },
);
LEGACY_TITLES.unshift(
  { id: 'pillar_t', name: 'Pillar of the Community', emoji: '🏛️', check: (s) => !!webRep(P(s)).pillar },
  { id: 'con_artist', name: 'Con Artist', emoji: '🎭', check: (s) => LC(s, 'schemesCollapsed') >= 1 && LC(s, 'conStarted') >= 1 },
  { id: 'vigilante_t', name: 'Vigilante', emoji: '🏮', check: (s) => LC(s, 'vigStarted') >= 1 && M(s).record.some((r) => r.crime === 'vigilantism') },
);
