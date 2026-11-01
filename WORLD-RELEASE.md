# World publication

The main community server stays on `node server.mjs`. World runs separately on
`node world-server.mjs`; it shares the existing private PostgreSQL schema and
account sessions through a single-use handoff. No review database is deployed.

`render.yaml` adds a free World web service and references the existing service's
database configuration inside Render. World registers its assigned public URL in
`world_environment`; the main site's World entry reads that registration. Existing
`WORLD_URL` configuration takes precedence. No second password is needed.

World is closed by default. Primary STAFF can open or close it at
`#moderacion/world`. Confirmed Apocalypse II direct/audition slots grant participant
access. A visual casting badge does not. Other accounts enter as spectators;
eliminated, withdrawn, disqualified, injured and deceased entries stay inactive.

The full World intro appears after loading on every entry. Its first completion is
saved per account in `world_intro_views`; only subsequent entries show **Omitir**.
Desktop and mobile MP4 files retain all 1,918 frames, 64.6 seconds, and the original
AAC audio. Opening a second tab does not invalidate the first playback.

## Verification

- Fresh `npm ci` succeeded with Node 24.
- The main site's 220 existing tests have exactly the same eight pre-existing
  failures as untouched production commit `c23e85dc36034b33bac6be6703faf508d92ce011`
  (old catalog, casting and Showdown expectations). No new failures in that suite.
- Publication checks exercise account handoff/logout, closed access, actual casting
  membership, spectator isolation, shared spectator avatars, Last Grip/Protocol
  sockets, purchased wallpaper downloads, and per-account intro completion.
- Browser checks cover the main World entry, STAFF open/close control, actual
  separate-process entry, complete first playback, and Omitir on the next entry.
- Import closure and individual asset sizes were checked before committing.

## Rollback

Re-deploy the previous main commit to revert the main navigation/bridge. All schema
changes are additive; do not delete World tables to roll back application code.
World can also be closed immediately in Moderation while the main site stays up.

Render's free service and bandwidth quotas still apply. Public deployment is only
confirmed after the live World service is registered and passes its health check.
