# Mobile + Backend Architecture (Companion-First)

## Why this architecture

A true 1:1 port of the Electron desktop app to iOS/Android is not feasible because the desktop app depends on:

- Electron main/preload runtime
- Local OpenCode binary lifecycle management
- Local Roblox Studio MCP integration (desktop-only)

To support mobile safely, we run orchestration in a hosted backend and keep Studio mutation on desktop.

## Workspace layout

- `/mobile` — Expo mobile client (iOS/Android)
- `/backend` — hosted API + event stream
- `/packages/contracts` — shared request/response/event schemas
- `/src` + `/electron` — existing desktop app, still the Studio execution host

## Initial backend responsibilities

- Session list/create
- Message send/list
- Per-session SSE event stream
- Capability endpoint advertising desktop-only boundaries

## Capability separation model

Mobile supports:

- chat
- session browsing and management
- provider/agent selections
- read-only playtest/planning flows

Desktop-only:

- direct Roblox Studio MCP mutation workflows

## Next extraction milestones

1. Move OpenCode runtime management from local desktop process to deployable service.
2. Add authenticated user identity and tenant isolation.
3. Add provider credential vaulting and rotation.
4. Add robust streaming transport and reconnect semantics.
5. Add desktop handoff APIs for Studio-bound actions.
