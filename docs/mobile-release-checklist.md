# Mobile Release Checklist (Initial)

## Build and validation

- [ ] `pnpm typecheck:all` passes
- [ ] `pnpm test` passes for desktop/shared code
- [ ] Backend health + session/message API smoke checks pass
- [ ] Mobile app boots in Expo on both iOS and Android simulators/devices

## Security and privacy

- [ ] No provider secrets stored in plain text on device
- [ ] Backend enforces authenticated session ownership
- [ ] API rate limits enabled
- [ ] Privacy disclosures updated for mobile analytics/telemetry

## Platform readiness

- [ ] iOS keychain usage validated
- [ ] Android secure keystore usage validated
- [ ] Push notification permissions and channel behavior tested
- [ ] Deep links tested for session navigation

## Rollout

- [ ] TestFlight build uploaded and verified
- [ ] Play Internal Testing build uploaded and verified
- [ ] Crash dashboard monitored through staged rollout window
- [ ] Rollback plan tested
