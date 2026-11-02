# World servers

STAFF creates servers directly at the main site's `#world` page. Each server has
its own season, inventory,  character ownership, health, shelters, weather,
challenge results, elimination order and track record. A new server has no game
progress and requires the full intro again, even for an existing site account.
Only the actual Apocalypse profile style grants player entry; explicit style
overrides follow the site's own rules. Eliminated people can watch their server.

World remains closed by default. STAFF opens it at Moderation → World and can
also close individual servers. Rooms can automatically fill challenge/ceremony
places with bots, including one real participant and 17 bots.

## Hosting and persistence

The current main service starts an isolated World hub automatically. No second
Render login or paid service is required. HTTP and sockets use `/world-play/`;
each active room runs in an isolated worker so maps, physics and bots cannot mix.
Inactive rooms save and release their worker. The free instance currently admits
two active rooms at once, with a memory guard to protect the main site. More
servers may be saved and resumed. Normal Render capacity/bandwidth limits apply.

Game data uses separate private PostgreSQL tables per room. Accounts, login,
profile styles and private site messages remain shared. Site coins/inventory are
not reset or consumed by World. Per-room leases fence writes from stale workers
during restart or deployment. Schema changes are additive; no existing game or
account data is deleted. No review accounts or databases are published.

An explicitly configured `WORLD_URL` can point to a standalone hub instead and
disables the embedded hub. Do not run two independent hubs for the same room.

## Intro

First playback per account and server is complete, audible and has no pause,
mute or skip controls. Entry from World prepares the media element during the
user's entry gesture, then the full video begins after loading. The first
completion is saved on the server. Later entries show Omitir and normal controls.
The desktop/mobile encodes preserve all 1,918 frames, 64.6 seconds and original AAC.

## Checks and rollback

`npm run test:world` checks server isolation, profile access, normal SSO/logout,
one human with bots, intro rules, inventory, stale-worker fencing and bot gifts.
The main site's 220-test suite retains its eight pre-existing catalog/casting/
Showdown expectation failures from production baseline c23e85d, with no new ones.
Browser checks cover creation, separate entries and full automatic first playback.

Close World in Moderation before maintenance. Previous code is preserved in Git
backup branches. Rollback code without deleting any World tables.

Monedas y tickets pertenecen al perfil y se comparten entre todos los servidores; las compras descuentan de ese saldo único. Los objetos comprados, personajes, mascotas, wallpapers y avances permanecen en el servidor correspondiente. María Villegas se incluye automáticamente en la colección del STAFF, sin compra y sin poder transferirla.
