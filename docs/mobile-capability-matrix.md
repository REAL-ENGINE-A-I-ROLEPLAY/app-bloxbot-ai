# Mobile vs Desktop Capability Matrix

| Capability | Mobile (iOS/Android) | Desktop (Electron) | Notes |
|---|---:|---:|---|
| Session list/create/archive | ✅ | ✅ | Shared backend contract |
| Chat prompts/responses | ✅ | ✅ | Mobile uses hosted backend APIs |
| Model selection | ✅ | ✅ | Shared settings shape |
| Agent selection | ✅ | ✅ | Shared settings shape |
| Provider auth management | ✅ | ✅ | Mobile must use secure storage + backend vaulting |
| Playtest plan review | ✅ | ✅ | Mobile read-only first |
| Roblox Studio MCP mutation | ❌ | ✅ | Desktop-only due Studio local runtime |
| Explorer live tree mutation | ❌ | ✅ | Desktop-only until remote bridge design is finalized |
| Local binary lifecycle (OpenCode download/run) | ❌ | ✅ | Replaced by hosted backend for mobile |

## UX rule

When a feature requires direct Studio mutation, mobile must show a clear desktop-required state and offer handoff actions (queue, save plan, open on desktop).
