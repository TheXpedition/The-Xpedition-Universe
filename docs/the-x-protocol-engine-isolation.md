# The X Protocol: staged isolated engine

This document describes the opt-in migration from the shared World tick to an isolated rules worker without changing the game.

## Invariants: never change

- All existing scenes, Total Drama art, animations, host narration, live cinema and STAFF controls remain in the original browser application.
- The public event schedule, voting, duel decisions, skulls and elimination rules continue to use `public/juegos/x-protocol/engine.mjs`, unchanged.
- The authoritative state remains in `world_environment` and all public rankings, participant performance and past season statistics retain the same shape.
- Account access and session cookies remain in World.
- Advantages and item ownership remain in the shared shop and inventory databases. Using an advantage remains one transaction: validate ownership, apply the effect and consume the item together. It must never be consumed twice on reconnect.
- The elimination outcome, betting wallet and inheritance inventory remain authoritative in World transactions.
- Audio autoplay limitations still apply. The video must continue without a per-player play button, muted if the browser blocks audible autoplay.

## Stage 1: isolated rules computation (implemented, OPT-IN)

A dedicated Node worker executes the same pure `tickProtocol` rules when `PROTOCOL_ENGINE_WORKER=true`. The World service still validates STAFF and participant requests, owns WebSockets, persists stats and performs transactions. If the worker fails or stalls, the existing inline rules engine resumes with the current unmodified state. Use the STAFF-only `GET /api/world/x-protocol/performance` endpoint to inspect active/fallback status, tick timing, audience size and lag.

The default remains off so existing production behavior does **not** change merely because this branch is merged. Activate only in a controlled staging server, compare behavior with the inline engine and monitor its memory impact. In a memory-constrained Render Free service, an extra worker may worsen resource pressure.

This is a separate **rules-processing thread**, not a separate Render compute instance. Do not describe Stage 1 as a solution to all WebSocket disconnections, since the World event loop still owns the socket transport.

## Stage 2: truly independent Render service (not implemented or deployed yet)

Deploy The X Protocol as its own web/private service with separate CPU/RAM. Route only ceremony HTTP and WebSocket traffic through an authenticated World gateway. Retain one user identity, one canonical database, one source of truth for the current ceremony and a transactional inventory interface. The client-facing URL and controls should not change. Maintain bidirectional start/finish redirects to World.

A dedicated private service needs a paid Render service; Render Free web services cannot receive inbound private-network requests. A separate public Free service is possible but shares the sleep/restart limitations and requires secure session handoff and a public gateway. Never copy credentials into GitHub.

Before switching live traffic, require:
1. Full 18-player ceremony in Chrome plus mobile device simulation, including STAFF controls and intro autoplay.
2. Fault injection: interrupt WebSockets during the intro, resume without reloading or spending advantages twice.
3. Compare scoreboard, participant performance, gifts, history and all affected inventory rows against the existing service.
4. Run the old and new engines in a non-authoritative shadow test; only one may write state and reward balances.
5. Rollback by disabling routing to the new engine without deleting or migrating database data.

## Production rollout policy

Keep Stage 1 feature-flagged until all CI checks pass. Do not add `PROTOCOL_ENGINE_WORKER=true` to the existing `render.yaml` without observing actual production memory availability. A true Stage 2 service cannot be automatically deployed from GitHub code alone; it needs explicit Render service configuration and resource selection.

## Performance, loading and visual presentation implemented on the branch

- Passive scenes and intro use fewer unchanged server snapshots; interactive votes, skull movement and duels retain faster updates. Phase changes and authoritative decisions still broadcast immediately.
- Countdown timers are visually interpolated without altering server-side vote deadlines, duel timing, rankings or participant performance.
- Character sprites and Maria/ceremony scenes decode in limited parallel batches to reduce mobile freezes. Upcoming duel backdrops are prefetched. When a new scene takes longer to load, the renderer keeps the previous valid frame instead of flashing a placeholder/black gap.
- All 18 ranking portrait assets are available. Ranking images are warmed before the results phase, with fallback to the original cast image if a thumbnail fails.
- The physical LED monitor keeps its original scene coordinates. Ranking text, portrait and history are fitted relative to the monitor's own dimensions; compact landscape phones hide the tiny history strip but preserve the principal portrait, place and name. The full history remains part of the ceremony and can still be inspected.
- A Chromium E2E check now tests actual desktop and landscape-mobile monitors, portrait loading, position inside the monitor, rankings, synchronized intro and STAFF controls; screenshots are uploaded as CI artifacts.
- The built-in public intro can optionally be served from a separate Render Static Site (render-protocol-media.yaml) by setting PROTOCOL_MEDIA_CDN_ORIGIN on the World service. The application falls back to the original bundled media path if the CDN fails. Uploaded private STAFF media is never routed through the public static site.

None of these improvements changes the 18-participant elimination rules, account identities, inventory ownership, advantages, coins, ranking results or stored performance statistics. Changes remain on an unmerged PR while under verification.

**Resource warning:** Stage 1 is an optional rules worker on the same instance and does not isolate CPU/memory or World WebSockets. The independent Stage 2 Render service requires an additional service, secure session handoff and one authoritative database writer; it has not been implemented or launched yet.
