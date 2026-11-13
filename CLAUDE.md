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
  `maps.mjs`, `gear.mjs`, `sets.mjs`, `bots.mjs`, `picker.mjs`, `anim.mjs`, `armory.mjs`, `lowfps.mjs`, `daily.mjs`, `chests.mjs`, `sky.mjs`, `roofs.mjs`, `cove.mjs`, `graveyard.mjs`, `farm.mjs`, `mobile.mjs`, `clicks.mjs`, `lance.mjs`, `wands.mjs`, `knockoff.mjs`, `outlines.mjs`, `first.mjs`, `missions.mjs`, `wildsets.mjs`, `secrets.mjs`, `crazy.mjs` and `boost.mjs` (both use the CrazyGames SDK in its local mode, so they need the internet); `node test/rejoin.mjs` checks that coming back to an online match
  keeps your score and `node test/band.mjs` checks the level bands for matchmaking (both run the server's code directly, no servers or browser); `node test/measure-bots.mjs ladder` measures bot hit rates per
  skill level. Online checks (`test/sim.mjs`, `test/e2e.mjs`, `test/cgauth.mjs` for CrazyGames sign-in and rooms, `test/stats.mjs` for the stats rows, `test/boards.mjs` for the boards and player cards, `test/zboard.mjs` for the zombie board, `test/prizes.mjs` for the weekly prizes) also need the local dev server described in the server README; run
  them one after the other (they share rooms). Zombie waves pauses without pointer lock, so headless tests set `locked = true`.
- `node ../voxel-strike-server/scripts/check-tables.mjs` must pass after changing any number the server also uses (weapon stats,
  match rules, rewards, armor, gear, map sizes/pads, zombie wave sizes and timing): the server keeps its own copy in `tables.js`.

## Shipping

- Cache busting is manual: bump `const V = NNN` in `index.html` for any JS change (and the `style.css?v=` query for CSS). Commit
  messages end with "Cache vNNN". Pushing `main` deploys the game.
- Server changes need `npx -y wrangler@3.114.17 deploy` in the server repo (Node 20 here, so wrangler 3); the user runs production
  deploys themselves.

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
- **Stats** are counted by the server only (room.js `saveStats`): signed-in players in public online rooms, into D1 `stats`,
  `stats_week` and `stats_guns`; `GET /stats/<id>` (a player card) and `GET /boards`
  (weekly / all-time top 50 by XP, wins or kills) read them; `js/boards.js` shows them (TOP in the lobby, clickable names). The daily reward (`js/daily.js`) and daily missions (`js/missions.js`) are client-side, in `prof.daily` and `prof.missions`.
- **Account** (`js/profile.js`, synced by `js/cloud.js`): level, coins, owned guns and stars, loadout, armor, boots and hats in
  `prof`, saved to localStorage and to the server when signed in. Zombie-wave shop coins are separate from account coins.
- **Maps** (`js/maps/*.js`) register with `startMap`, build meshes plus collision `solids` (`addBlock`/`addSlab`/`addSolid` in
  `world.js`) and `cover` (what stops bullets). Decorative detail goes through `detail()` so the low graphics setting can hide it.
- **Voxel models.** Guns (`GUN_MODELS` in weapons.js), armor, boots and hats are pixel boxes turned into geometry by `voxelGeos`,
  which also draws the black outline. A model's moving parts are `sub()` groups (`spin`, `round`, `mag`). Pictures of guns, armor, boots,
  hats and skins in the UI are 3D renders of the same models (`modelPic` in core.js).
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
