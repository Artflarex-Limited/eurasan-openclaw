# Login Workflow

**Workflow Type:** Authentication
**OpenClaw Skill File:** `examples/login.sf`
**Error Codes:** `AuthError`, `MFAError`, `NetworkError`

---

## Overview

The login workflow establishes an authenticated session with the Eurasan B2B Marketplace platform. It handles standard credential authentication as well as optional MFA (Multi-Factor Authentication) when enabled on the account.

---

## Prerequisites

1. Valid Eurasan account with buyer access
2. `EURASAN_USERNAME` and `EURASAN_PASSWORD` configured in environment
3. `EURASAN_WEB_URL` set to the platform base URL
4. Chromium-based browser (Playwright manages this)
5. If MFA enabled: `EURASAN_MFA_SECRET` configured

---

## Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `username` | `string` | ✅ | Eurasan account username |
| `password` | `string` | ✅ | Account password |
| `mfa_code` | `string` | ❌ | 2FA code (if MFA is enabled) |

---

## Execution Steps

1. **Navigate to login page** — Go to `{EURASAN_WEB_URL}/login`
2. **Wait for login form** — Ensure `#username` and `#password` fields are present
3. **Fill credentials** — Enter username and password in respective fields
4. **Submit form** — Click `button[type=submit]`
5. **Handle MFA (if required)** — If MFA is enabled, enter the 2FA code in `#mfa-code` and submit
6. **Verify authentication** — Wait for navigation to `/dashboard/**`
7. **Extract session token** — Read `auth_token` from `sessionStorage`
8. **Return session data** — Provide token and session expiry timestamp

---

## Error Handling

| Error | Detection | Recovery |
|---|---|---|
| Invalid credentials | Form shows error message or redirects to `/login?error` | Raise `AuthError` immediately |
| MFA failure | MFA field shows error or times out | Raise `MFAError` immediately (no retry) |
| Network timeout | Request times out after 30s | Retry up to 3 times with exponential backoff |
| Session storage unavailable | Cannot read `auth_token` | Retry once, then raise `SessionError` |
| Rate limiting | HTTP 429 response | Wait 60s, then retry |

**Retry backoff:** Exponential starting at 1s, max 10s between attempts.

---

## Output

```json
{
  "auth_token": "string",
  "session_expiry": "ISO8601 timestamp",
  "username": "string",
  "mfa_enabled": boolean
}
```

---

## State Persistence

During login, state is maintained in `$WORKFLOW_CONTEXT`:
- Checkpoint after credential submission
- Checkpoint after MFA entry (if applicable)
- Checkpoint after token extraction

On failure, workflow resumes from the last successful checkpoint.

---

## Security Considerations

- Never log the `auth_token` value
- Store tokens securely; do not expose in console output
- Session expiry should trigger automatic re-authentication
- Use least-privilege buyer accounts for automation

---

## Testing

```bash
# Run login tests only
npm test -- --grep "auth"

# Run with visible browser
npm run test:headed
```

Test file: `tests/auth.test.js`

---

## Related Documentation

- [SKILL.md](../SKILL.md) — OpenClaw skill definition
- [OPENCLAW.md](../OPENCLAW.md) — Project overview
- [order-tracking.md](./order-tracking.md) — Order tracking workflow
- [rfq-creation.md](./rfq-creation.md) — RFQ creation workflow