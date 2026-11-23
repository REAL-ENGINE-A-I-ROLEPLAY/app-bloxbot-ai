# BloxBot Mobile Companion Backend

This service is the initial hosted backend for iOS/Android companion flows.

## Current scope

- Session list/create APIs
- Message send/read APIs
- Server-Sent Events (SSE) stream per session
- Capability endpoint to separate mobile-safe and desktop-only features

## Run locally

```sh
pnpm --filter @bloxbot/backend dev
```

Default port: `8787` (override with `PORT`).
