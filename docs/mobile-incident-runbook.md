# Mobile Companion Incident Runbook (Initial)

## Severity levels

- **SEV-1**: complete outage (mobile cannot load sessions/chat)
- **SEV-2**: major degradation (high error rate, delayed responses, broken streaming)
- **SEV-3**: partial impairment (specific provider/agent/path affected)

## Triage checklist

1. Confirm backend `/health` status and deployment version.
2. Check API error rate for:
   - `GET /api/sessions`
   - `POST /api/sessions`
   - `GET /api/sessions/:id/messages`
   - `POST /api/sessions/:id/messages`
   - `GET /api/sessions/:id/events`
3. Confirm any auth, rate-limit, or upstream provider failures.
4. Validate mobile app can reconnect after network changes.

## Immediate mitigations

- Restart unhealthy backend pods/instances.
- Temporarily reduce rate limits only if capacity is available.
- Disable non-critical features (e.g., streaming extras) before core chat/session APIs.
- Communicate desktop handoff path if mobile message flow is degraded.

## Recovery criteria

- Session/message API success > 99%
- Stream reconnect succeeds across iOS/Android test devices
- No elevated crash rate after mitigation deployment

## Post-incident follow-up

- Publish incident summary and timeline
- Add or update automated checks reproducing the failure path
- Update architecture/capability docs if behavior changed
