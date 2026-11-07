# The X Protocol — independent Render engine, unchanged World experience

## What is implemented

The X Protocol now has its **own executable Node web service** (`protocol-dedicated-server.mjs`). It uses the original `createProtocolService`, `engine.mjs`, advantage transactions, cast, results, awards, wagers, inheritance, and player performance statistics. It does **not** create a second inventory, an alternative schema, a second season, or a separate account login.

World optionally becomes a light authenticated bridge (`protocol-remote-proxy.mjs`). The browser still opens the current `/juegos/x-protocol/` and keeps its existing World WebSocket. All scenes, 18-character portraits, cinematic intro, María's monitor, animations, ranks, votes, skulls and duels are **the same**. The remote engine owns ceremony writes; World forwards event packets to exactly the right browser session and retains its own exploration and welfare rules.

- Separate Render CPU/RAM and backend event loop when configured.
- Same existing Supabase `DATABASE_URL`, same scoped world tables via `serverDatabase`, same advantage ownership via `world_shop_items`, same episode snapshots, leaderboard and history.
- `PROTOCOL_BRIDGE_SECRET` (>=32 characters), automatically generated in a shared Render environment group. The browser never gets this secret and cannot directly invoke private game actions on the dedicated service.
- Permission checks enforced by the dedicated service using the existing account IDs and World permissions. World also authenticates each HTTP request before forwarding.
- The official user's 14.83-second MP4 video is already bundled, has mobile inline muted autoplay and can use the separate static CDN.
- World forwards player presence/vitals/environment to the new engine every two seconds, but **not** its heavy physics packets.
- Purchase/gift notices go to the new engine, and it periodically refreshes the canonical item ownership in the common database. Buying or using an advantage cannot create separate inventory copies.
- The remote engine continues storing progress and can recover after a worker restart. Each browser is reattached to its original World socket without reloading the full World bootstrap on a bridge reconnection.
- STAFF phase, spectators' loading and the current ceremony are synchronized back to World for start invitations, login/re-entry and exit to camp.
- If not enabled, World continues using the existing local `createProtocolService` **unchanged**.

## Blueprint deployment

The repository's `render.yaml` declares three services:

1. `the-xpedition-universe`: existing community + World service.
2. `the-xpedition-protocol`: newly separate Node service, runs `node protocol-dedicated-server.mjs`, with the original `DATABASE_URL` copied securely from the World service.
3. `the-xpedition-protocol-media`: static CDN for the official intro video.

A Render environment group named `the-xpedition-protocol-bridge` generates the *same* `PROTOCOL_BRIDGE_SECRET` for World and the new service. `PROTOCOL_SERVICE_HOST` is referenced automatically from the new service's Render external hostname. Do not put secret values into GitHub or a browser `*.mjs`.

**Important:** adding services to `render.yaml` does *not* create them unless an existing Render Blueprint is synced. If Render was set up manually, deploy the dedicated and static services by connecting this repo from the Render Dashboard and copy the env vars through the Render environment UI. Never create a *second copy* of the existing production World service from a new Blueprint without first confirming management.

## Safe activation (with the dedicated service already running)

1. Ensure the new Render service is Healthy at `https://<actual-service-host>/api/health`. It reports `service: x-protocol-dedicated`. Confirm its `DATABASE_URL` is **the same** as World and its `PROTOCOL_BRIDGE_SECRET` matches World's generated group value.
2. Ensure World receives `PROTOCOL_SERVICE_HOST` from the new service or a correctly set `PROTOCOL_SERVICE_URL`.
3. Finish any existing live ceremony. **Do not switch authority mid-ceremony.** The source of truth must have only one engine writing it at a time.
4. Set **`PROTOCOL_ENGINE_REMOTE_ENABLED=true` on the existing World service** in Render and redeploy World. This is deliberately not hardcoded in `render.yaml`: enabling it automatically before the other service exists would break current production.
5. Start a test ceremony using the real World menu. Check `/api/world/x-protocol/start-plan` (STAFF), start with 18 seats, and verify the intro, monitor and rankings on two different devices.
6. Check STAFF `/api/world/x-protocol/performance` metrics, character standings and inventory, then disable a participant's WebSocket and confirm recovery.
7. If anything regresses, finish/cancel the current ceremony first, set `PROTOCOL_ENGINE_REMOTE_ENABLED=false` and redeploy World. Do not change, delete or migrate database tables: the next local engine recovers the existing persisted ceremony state.

### Hosting limitations

A **separate Render web service is required** to isolate CPU and sockets; an in-process worker on the same Free instance is *not* equivalent. Free services can sleep/restart and share platform limits, so no architecture guarantees the exact same latency as localhost on Free. The two web services may also consume the limited free instance-hour allowance. Choose appropriate Render paid instances if reliable always-on production performance is essential. No paid service is created automatically and no account is charged from this code change.

### Verification in GitHub Actions

`tests/protocol-dedicated-service.test.mjs` exercises an isolated engine + authentication + shared DB + 18 cast seats + advantage purchase + stats + STAFF return.

`tests/protocol-dedicated-world-network.test.mjs` starts *real* separate World and protocol HTTP/WS services and verifies STAFF launch, 18 cast members, spectator, intro, pause/resume and return without changing original World browser sockets.

`tests/protocol-dedicated-browser.test.mjs` exercises the **original approved interface** in real desktop Chrome and mobile emulation against the separate engine. The existing original-motor Chromium regression tests and all other phase/rank/asset tests also run.

The new authority is disabled until an authorized Render deployment/health check and a deliberate opt-in switch. GitHub CI does not prove that the user's separate Render service is actually online, so production should not be represented as fully migrated until tested live.
