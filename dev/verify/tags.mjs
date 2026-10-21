// Content-tag checks: every tag used by real content is a known tag with a Settings
// default, and the filters hide tagged events, choices and actions while their switch
// is off. Uses throwaway fixture content, so it works before any real content is tagged.
//
//   node dev/verify/tags.mjs
import { loadGame } from './loadgame.mjs';

const ctx = loadGame({ quiet: true });
const g = (name) => ctx.run(name);
ctx.seedRng(7);
const TAGS = g('CONTENT_TAGS'), META = g('META');
const EVENTS = g('EVENTS'), BIZ_EVENTS = g('BIZ_EVENTS'), ACTIONS = g('ACTIONS');

const fails = [];
const fail = (msg) => fails.push(msg);
const setTags = (on) => { for (const k in TAGS) META.settings[k] = on.includes(k); };

// 1. Every tag in use is known, and every known tag has a boolean default.
for (const k in TAGS) if (typeof META.settings[k] !== 'boolean') fail(`tag "${k}" has no boolean default in META.settings`);
function checkTags(where, tags) {
  if (tags === undefined) return 0;
  if (!Array.isArray(tags) || !tags.length) { fail(`${where}: tags must be a non-empty array`); return 0; }
  for (const t of tags) if (!TAGS[t]) fail(`${where}: unknown tag "${t}"`);
  return 1;
}
const count = { events: 0, choices: 0, bizEvents: 0, actions: 0 };
for (const id in EVENTS) {
  count.events += checkTags(`event ${id}`, EVENTS[id].tags);
  (EVENTS[id].choices || []).forEach((c, i) => { if (!Array.isArray(c)) count.choices += checkTags(`event ${id} choice ${i}`, c.tags); });
}
for (const id in BIZ_EVENTS) count.bizEvents += checkTags(`company event ${id}`, BIZ_EVENTS[id].tags);
for (const id in ACTIONS) count.actions += checkTags(`action ${id}`, ACTIONS[id].tags);

// 2. The filters, on fixtures.
let ran = 0;
ctx.EV('__tag_event', { ages: [0, 200], tags: ['chaos'], text: 'Fixture.', auto: () => '' });
ctx.EV('__tag_choice', { ages: [0, 200], text: 'Fixture.', choices: [['Plain', () => 'ok'], { label: 'Chaos only', tags: ['chaos'], fx: () => { ran++; return 'ok'; } }] });
ctx.defAction({ id: '__tag_action', cat: '__test', label: 'Fixture', tags: ['mature'], run: () => 'ok' });
ctx.defAction({ id: '__tag_both', cat: '__test', label: 'Fixture', tags: ['chaos', 'mature'], run: () => 'ok' });
const s = ctx.createLife({});
s.pending = [];
const listed = () => ctx.actionList(s, '__test').map((a) => a.id).sort().join(',');
const choicesShown = () => { s.pending = []; ctx.fireEvent(s, EVENTS.__tag_choice); return s.pending[0].choices.length; };

setTags([]);
if (!ctx.eventEligible(s, EVENTS.__tag_choice)) fail('untagged event not eligible');
if (ctx.eventEligible(s, EVENTS.__tag_event)) fail('chaos event eligible with chaos off');
if (listed() !== '') fail(`tagged actions listed with every tag off: ${listed()}`);
if (ctx.doAction(s, '__tag_action')) fail('doAction ran a mature action with mature off');
if (choicesShown() !== 1) fail('chaos choice shown with chaos off');

setTags(['chaos']);
if (!ctx.eventEligible(s, EVENTS.__tag_event)) fail('chaos event not eligible with chaos on');
if (choicesShown() !== 2) fail('chaos choice hidden with chaos on');
if (listed() !== '') fail(`chaos alone unlocked: ${listed()}`);

setTags(['mature']);
if (listed() !== '__tag_action') fail(`mature alone should list only __tag_action, got: ${listed()}`);

setTags(['chaos', 'mature']);
if (listed() !== '__tag_action,__tag_both') fail(`every tag on should list both, got: ${listed()}`);

// Switching a tag off while its choice is on screen: answering it does nothing.
setTags(['chaos']);
s.pending = [];
ctx.fireEvent(s, EVENTS.__tag_choice);
setTags([]);
ctx.resolvePopup(s, s.pending[0].id, 1);
if (ran) fail('a chaos choice ran after chaos was switched off');

console.log(`Tagged content: ${count.events} events, ${count.choices} event choices, ${count.bizEvents} company events, ${count.actions} actions`);
if (fails.length) {
  console.log(`\n❌ ${fails.length} tag check failures:`);
  for (const f of fails) console.log('  - ' + f);
  process.exit(1);
}
console.log('✅ Content tags OK.');
