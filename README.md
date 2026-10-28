# ByteLyfe

A free, text-based life simulator for [Perchance](https://perchance.org). Be born, grow up,
go to school, fall in love, chase a career, get rich or go broke, and continue the story as
your kids. Every feature is unlocked: God Mode, the Time Machine, custom lives, all careers.

All names, text, events and art are original. The game borrows the *genre* (a yearly
life-sim with stats and random events), not any other game's content.

## Run it locally

```bash
npm run dev
```

Open http://localhost:8750. The dev server wraps `index.html` the way Perchance does and
injects `local-dev/perchance-shim.js`, which stands in for the `kv-plugin` (saves go to
IndexedDB). Nothing to install: it uses Node's standard library only.

## Ship it to Perchance

The repo mirrors a Perchance generator that uses the **file tree**:

1. Paste `index.html` into the generator's **HTML panel**.
2. Paste `main.pjs` into the **lists panel**.
3. Zip the inner `src/src/` folder and upload it into the generator's file tree, so the
   files resolve at `src/src/srcfiles/...`.

When you change a file, bump its `?v=N` in `index.html` so browsers don't keep a stale copy.

## Check it

```bash
npm run verify     # syntax, emoji audit, and 300 simulated lives with invariant checks
npm run sim        # just the simulator (default 200 lives); add a count and seed: node dev/verify/sim-lives.mjs 1000 42
```

```bash
node dev/verify/sim-business.mjs     # business balance report: every industry, 20 years, two owner styles
```

`dev/verify/ui-smoke.js` is a browser-side smoke test: paste it into the console of the
running game to play 60 years through the real UI and report any errors.
Or run it headless: `node dev/verify/ui-smoke-run.mjs [years] [runs]` (needs Playwright).
Before committing, `python3 dev/bump-versions.py` bumps the `?v=N` cache-buster for every file you changed.

## Where things are

| Path | What |
| --- | --- |
| `index.html` | Perchance HTML panel: stylesheet links, the plugin bridge, and every script tag in load order |
| `main.pjs` | Perchance lists panel: `$meta` and plugin imports |
| `src/src/srcfiles/js/` | The game. `00–09` data, `10–29` engine, `30–33` event content, `34–999` expansions, `1000+` UI |
| `src/src/srcfiles/css/` | Styles, in cascade order |
| `local-dev/` | Dev server and the Perchance shim (never shipped) |
| `dev/verify/` | Node harnesses and the browser smoke test (never shipped) |
| `ref/` | Design docs: [`ARCHITECTURE.md`](ref/ARCHITECTURE.md), [`ROADMAP.md`](ref/ROADMAP.md) |
