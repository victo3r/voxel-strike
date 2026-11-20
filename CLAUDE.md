# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Voxel Strike is a browser FPS (three.js 0.160, plain JavaScript, no build step) served by GitHub Pages from `main` at
https://victo3r.github.io/voxel-strike/. Its server (accounts, cloud saves, friends, online rooms) is a separate repo at
`../voxel-strike-server` (Cloudflare Worker + Durable Objects + D1 at sync.gemforge.org); its README has the server commands.

## Running and testing

- Serve the folder and open it: `python -m http.server 8010 --bind 127.0.0.1`, then http://127.0.0.1:8010/?dev=1.
  **Never use port 8000** (another service on this PC owns it) and never kill processes by port; stop stray
  `http.server`/`wrangler`/`workerd` processes by command line.
- `?all=1` on 127.0.0.1/localhost uses a separate dev profile with everything owned (max level, coins, keys, every gun, armor,
  boots and hat, topped up each load); it never signs in or syncs. The tests don't use it.
- `?dev=1` (or a localhost page) points online play at `ws://127.0.0.1:8787`; `?srv=http://host:port` points saves, friends and
  play at another server (the tests use `?srv=http://127.0.0.1:9` to force offline).
- All tests live in `../voxel-strike-server/test/` and drive this game through headless Playwright (`playwright-core`, Chromium
  under `%LOCALAPPDATA%/ms-playwright`). Offline checks need only the 8010 server: `node test/zombies.mjs`, `recoil.mjs`,
  `maps.mjs`, `gear.mjs`, `sets.mjs`, `bots.mjs`, `picker.mjs`, `anim.mjs`, `armory.mjs`, `lowfps.mjs`, `daily.mjs`, `chests.mjs`, `sky.mjs`, `roofs.mjs`, `cove.mjs`, `graveyard.mjs`, `farm.mjs`, `mobile.mjs`, `clicks.mjs`, `lance.mjs`, `wands.mjs`, `knockoff.mjs`, `outlines.mjs`, `first.mjs`, `missions.mjs`, `wildsets.mjs`, `secrets.mjs`, `events.mjs`, `keyboards.mjs`, `arsenal.mjs`, `skins.mjs`, `sides.mjs`, `mythics.mjs`, `crystal.mjs`, `titanium.mjs`, `welcome.mjs`, `treasure.mjs`, `achievements.mjs`, `levelup.mjs`, `views.mjs` (first and third person show the same moves), `crazy.mjs` and `boost.mjs` (both use the CrazyGames SDK in its local mode, so they need the internet); `node test/rejoin.mjs` checks that coming back to an online match
  keeps your score, `node test/band.mjs` checks the level bands for matchmaking and `node test/audit.mjs` checks the save check's rules (all three run the server's code directly, no servers or browser); `node test/measure-bots.mjs ladder` measures bot hit rates per
  skill level. Online checks (`test/sim.mjs`, `test/e2e.mjs`, `test/cgauth.mjs` for CrazyGames sign-in and rooms, `test/stats.mjs` for the stats rows, `test/boards.mjs` for the boards and player cards, `test/zboard.mjs` for the zombie board, `test/prizes.mjs` for the weekly prizes, `test/coop.mjs` for co-op zombie waves, `test/coopback.mjs` for coming back to a co-op run after a reload, `test/saves.mjs` for the save check, `test/hostback.mjs` for a host coming back to its bots) also need the local dev server described in the server README; run
  them one after the other (they share rooms). Zombie waves pauses without pointer lock, so headless tests set `locked = true`.
- `node ../voxel-strike-server/scripts/check-tables.mjs` must pass after changing any number the server also uses (weapon stats,
  match rules, rewards, armor, gear, map sizes/pads, zombie wave sizes and timing): the server keeps its own copy in `tables.js`.
  After changing a price or an unlock level, run `node ../voxel-strike-server/scripts/make-prices.mjs` too (the save check's `prices.js`).

## Shipping

- Updates are named Alpha N: a new whole number for one that adds real content, N.1, N.2 for small ones (fixes, a visual
  change). Alpha 10 was v208, the last of the old numbers. The name is also the cache key: set `const V = 'alpha-N'` and the
  `style.css?v=alpha-N` query in `index.html` on every update. Commit messages end with "Alpha N". Pushing `main` deploys the game.
- Server changes need `npx wrangler deploy` in the server repo (Node 26 here; `npx wrangler` runs the repo's own wrangler 4); the user
  runs production deploys themselves.

## Architecture

- **One global scope.** `index.html` loads every file in `js/` as a classic script in a fixed order (the `FILES` list). Files share
  top-level `const`/`let`/`function` declarations directly, so order matters and there are no imports. three.js (r160, kept in `lib/`) is
  loaded as a module and exposed as `window.THREE`.
- **Everything that fights is in `zombies`** (`js/modes/zombies.js`): zombies, offline bots (`type: 'bot'`) and other online
  players (`remote: true`, `pid`). Your bullets, knife, fire and rockets hit them through the same paths (`hurtZombie`,
  `hurtPlayer`, `blast`, `applyBurn`).
- **Modes.** `mode` is `'zombies'` or a bot/PvP mode; `pvp()` tells them apart. `js/modes/deathmatch.js` runs every non-zombie
  match offline (rules in `RULES`, the bot AI in `updateBot`, bot skill levels in `SKILLS`, rewards) and `setupMode()` sets up
  whichever mode was picked; `restart()` (input.js) resets the world. The frame loop is in `js/main.js`.
- **Online** (`js/net.js`): the client owns its movement and detects hits locally, then claims them; the server validates and
  owns health, scores, clock, respawns and pickup pads. One player's client (the host) runs the room's bots with the offline AI
  and streams them. Protocol and server rules are in the server repo's `docs/` (spec-v2.md, spec-b.md, spec-c.md, spec-friends.md).
- **Co-op zombie waves** (`js/coop.js`, spec-coop.md): `mode` stays `'zombies'`; `net.coop` / `net.pvp` say which kind of room you're
  in (`net.on` is just "in a room"). The host's client runs the zombies, everyone else draws mirrors (`z.mirror`) and sends hits to it;
  zombies chase `ZT` (the nearest player who's up), never `P.pos` directly.
- **Stats** are counted by the server only (room.js `saveStats`): signed-in players in public online rooms, into D1 `stats`,
  `stats_week` and `stats_guns`; `GET /stats/<id>` (a player card) and `GET /boards`
  (weekly / all-time top 50 by XP, wins or kills) read them; `js/boards.js` shows them (TOP in the lobby, clickable names). The daily reward (`js/daily.js`; a new player's first seven are the welcome week, each after a game that day), daily missions (`js/missions.js`), weekly events (`js/events.js`) and achievements (`js/achievements.js`: one-time goals claimed in the lobby for XP and more) are client-side, in `prof.daily`, `prof.missions`, `prof.event` and `prof.ach`.
- **Account** (`js/profile.js`, synced by `js/cloud.js`): level, coins, owned guns and stars, loadout, armor, boots and hats in
  `prof`, saved to localStorage and to the server when signed in. The server checks each save against its last copy (`audit.js`
  there: XP and worth may only grow as fast as play allows) and the game goes back to the server's copy when one is refused. At the top level XP makes titanium bars instead (`prof.bars`, one per `BAR_XP`),
  which craft the pieces that have `bars`. Zombie-wave shop coins are separate from account coins.
- **Maps** (`js/maps/*.js`) register with `startMap`, build meshes plus collision `solids` (`addBlock`/`addSlab`/`addSolid` in
  `world.js`) and `cover` (what stops bullets). Decorative detail goes through `detail()` so the low graphics setting can hide it.
- **Voxel models.** Guns (`GUN_MODELS` in weapons.js), armor, boots and hats are pixel boxes turned into geometry by `voxelGeos`,
  which also draws the black outline. A model's moving parts are `sub()` groups (`spin`, `round`, `mag`). Pictures of guns, armor, boots,
  hats and skins in the UI are 3D renders of the same models (`modelPic` in core.js).
- **Guns that grow.** A gun with `grow` (the Crystal Companion, from golden chests only) takes its numbers (`statsAt(i, stars, lv)`) and its model's
  crystals (`growStage`, the fourth argument of `makeGun`) from its owner's level: yours by default, a bot's or another player's from their
  record (`rec.lv`, sent in the gear online). The server does the same sums in `tables.js`.
- **One set of moves for every view.** Kicks, melee swings, wand flicks and reloads come from `heldAnim` in `js/held.js`, which first person,
  bots/other players and the lobby character all apply; a new animation goes there, never into one view (`test/views.mjs` checks).
- **Baked hold poses (gotcha).** How bots and the armory character hold each gun is solved once and baked into `HOLD_BAKED` in
  `js/hold.js`, keyed by each `GUN_MODELS` entry's source length. Editing a gun model invalidates its pose and every player's
  browser re-solves it (seconds of stutter). Re-bake with `node ../voxel-strike-server/scripts/bake-holds.mjs` (8010 server
  running); `test/anim.mjs` fails while any pose is stale.

- **CrazyGames** (`js/crazy.js`, loaded before everything else): their SDK loads only on their domains or with `?cg=1`, and every
  `cg*` call is a no-op elsewhere. It reports loading and gameplay start/stop, follows their mute and chat settings, asks for a
  midgame ad on results screens, mirrors progress keys (`CG_KEYS`) into their Data module, and replaces our own sign-in: a CrazyGames player is signed in to our server
  with their account (`cgSignIn` in cloud.js, `POST /auth/cg`), named by their CrazyGames username, and online rooms are reported to their
  site so friends can join and invite links work (`cgRoom` / `fromInvite` in net.js).

## Conventions

- Comments are short and human: a one-line label like "weapon stats" or a brief why, never multi-line explanations or
  field legends (the code is public and CrazyGames reviewers may read it). Skip comments that restate the code. Details that
  are easy to break go in `../voxel-strike-server/docs/game-notes.md` (private); read it before changing a system and keep it
  up to date.
- Browser-default UI (scroll bars and the like) should be styled to match the game's UI.
