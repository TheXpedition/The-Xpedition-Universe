# The X Protocol — official Apocalypse II video and static media rollout

## Completed in GitHub

- User-supplied intro uploaded and transcoded to `public/juegos/x-protocol/media/intro-apocalypse-ii-20261107.mp4`.
- Exact running time: 14.833 seconds. 854x480, H.264 MP4 with AAC stereo, 30 fps, fast-start.
- The existing original clip remains in the repository as a fallback.
- The user-facing ceremony still opens at `/juegos/x-protocol/`, with unchanged layout, STAFF controls, cast, inventories, rankings and performance statistics.
- On server startup, the official clip is chosen only if it really exists; a previously saved deliberate custom STAFF clip remains authoritative.
- The video autoplays inline on Android and iPhone (normally muted until the browser grants sound). The player can unmute on a regular interaction; there is **no** button required to start the video.
- Future CDN failures fall back to the same video served locally from World. Nothing in the player writes inventory or other game state.

## Separate static Render media service

The default `render.yaml` now declares a second static service named `the-xpedition-protocol-media`; the original Node World service and all its private database settings are unchanged.

If the workspace is managed by a Render Blueprint, sync the Blueprint so Render creates the static service. If the original Node service was configured manually, connecting the separate static site requires an authorized Render account action:

1. Render Dashboard > **New** > **Static Site**, connect `TheXpedition/The-Xpedition-Universe` from branch `main`.
2. Name: `the-xpedition-protocol-media`. Build command:
   `mkdir -p protocol-cdn/juegos/x-protocol/media && cp public/juegos/x-protocol/media/intro-apocalypse-ii-20261107.mp4 public/juegos/x-protocol/media/intro-daa3534cac20-smooth.mp4 public/juegos/x-protocol/media/intro-warmup.mp4 protocol-cdn/juegos/x-protocol/media/`
3. Publish directory: `./protocol-cdn`. Deploy with successful CI checks.
4. Open its assigned Render URL, then `/juegos/x-protocol/media/intro-apocalypse-ii-20261107.mp4`. Confirm HTTP 200, video starts in browser, and Range requests are supported.
5. In Render's existing **the-xpedition-universe** service > **Environment**, add `PROTOCOL_MEDIA_CDN_ORIGIN=https://<the actual media site hostname>/`. Do not use a guessed domain or a URL with a path or query.
6. Let Render redeploy World so it begins sending CDN video URLs. Audio/video synchronization and ceremony data still use the same existing World application, independent from media delivery.

The optional `render-protocol-media.yaml` file can also be selected as a custom Blueprint path if the primary `render.yaml` is not managed as a Blueprint. **Do not create both**; they define the same media service.

## Verify before claiming performance improvements

- STAFF starts once from the World menu with 18 participants/bots.
- Chrome and a real iPhone/Android browser begin the same 14.833-second intro automatically (muted if required by OS policy).
- Rankings display their portraits and text inside the LED monitor on desktop and mobile.
- After a dropped socket the viewer reconnects and continues the existing ceremony, not a new session.
- A used advantage is charged once, and all rankings, votes, performance statistics, betting wallet and inventory history stay in the existing database.
- Inspect the Render logs for WebSocket closure reasons before claiming the Free instance is sufficiently performant.

## Rollback

Remove `PROTOCOL_MEDIA_CDN_ORIGIN` from World: it immediately returns to bundled local video delivery on the next deployment. The old intro is retained. To switch the official video back, use a deliberate STAFF media override or roll back the code change; never delete game database records.

**Important:** Splitting media traffic into a CDN does not split the ceremony's backend CPU or WebSocket workload. The optional `PROTOCOL_ENGINE_WORKER=true` from the previous PR remains disabled. A fully independent backend service still needs a separately configured Render service and authenticated handoff; its deployment has not been completed in this change.
