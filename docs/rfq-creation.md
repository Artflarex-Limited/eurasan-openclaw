# RFQ Creation Workflow

**Workflow Type:** RFQ (Request for Quotation)
**OpenClaw Skill File:** `examples/rfq-creation.sf`
**Error Codes:** `RFQError`, `SessionError`, `NetworkError`

---

## Overview

The RFQ creation workflow enables buyers to create Requests for Quotation on the Eurasan B2B Marketplace. It supports multi-product RFQs with detailed specifications, deadlines, and supplier notes.

---

## Prerequisites

1. Authenticated session (see [login.md](./login.md))
2. Valid `auth_token` stored in session
3. `EURASAN_WEB_URL` set to platform base URL
4. Buyer account with RFQ creation permissions

---

## Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `products` | `array` | ✅ | Array of `{name, quantity, unit}` objects |
| `specifications` | `string` | ❌ | Detailed product specifications |
| `deadline` | `string` | ❌ | Delivery deadline in `YYYY-MM-DD` format |
| `notes` | `string` | ❌ | Additional notes for suppliers |

**Products array structure:**
```json
[
  {"name": "Steel Pipes", "quantity": 500, "unit": "tons"},
  {"name": "Valves", "quantity": 200, "unit": "pcs"}
]
```

---

## Execution Steps

1. **Navigate to RFQ form** — Go to `{EURASAN_WEB_URL}/rfq/create`
2. **Wait for form** — Ensure `#rfq-form` is present and loaded
3. **Add products** — For each product in the array:
   - Click `#add-product-btn`
   - Fill `#product-name`, `#product-quantity`, `#product-unit`
4. **Fill specifications** — Enter detailed specs in `#specifications` if provided
5. **Set deadline** — Enter delivery deadline in `#deadline` if provided
6. **Add notes** — Enter supplier notes in `#notes` if provided
7. **Review RFQ** — Verify all fields are populated correctly
8. **Submit RFQ** — Click `#submit-rfq`
9. **Capture confirmation** — Wait for `.confirmation-number` element
10. **Extract confirmation number** — Parse and return the RFQ confirmation ID

---

## Error Handling

| Error | Detection | Recovery |
|---|---|---|
| Session timeout | 401 response or redirect to `/login` | Re-authenticate and restart RFQ flow |
| Form validation error | Frontend validation message | Re-fetch form, repopulate all fields, retry |
| Submission failure | HTTP error or no confirmation element | Retry up to 2 times, then raise `RFQError` |
| Network failure | Request timeout or 5xx response | Retry with exponential backoff (max 3 attempts) |
| Rate limiting | HTTP 429 response | Wait 120s, then retry |
| Product not found | Validation error on product entry | Log warning, continue with remaining products |

**Retry backoff:** 1s → 2s → 4s (exponential), max 3 retries.

---

## Output

```json
{
  "confirmation_number": "RFQ-YYYY-NNNNN",
  "estimated_response_time": "2-3 business days",
  "products_submitted": number,
  "deadline": "YYYY-MM-DD" or null,
  "created_at": "ISO8601 timestamp"
}
```

---

## State Persistence

Checkpoints are saved at:
- After each product is added
- After specifications are filled
- After deadline is set
- After notes are added
- Before submission

On failure, workflow resumes from the last checkpoint with all form data preserved.

---

## Security Considerations

- Verify session is still valid before starting RFQ creation
- Do not log confirmation numbers with sensitive product details
- Rotate sessions periodically during high-volume operations
- Use least-privilege accounts (buyer role only)

---

## Testing

```bash
# Run RFQ tests only
npm test -- --grep "RFQ"

# Run with visible browser
npm run test:headed
```

Test file: `tests/rfq.test.js`

---

## Example Usage

```bash
openclaw run examples/rfq-creation.sf --env .env \
  --param products='[{"name":"Steel Pipes","quantity":500,"unit":"tons"}]' \
  --param specifications='API 5L Grade B, seamless' \
  --param deadline='2026-08-01'
```

---

## Related Documentation

- [login.md](./login.md) — Authentication workflow
- [order-tracking.md](./order-tracking.md) — Order tracking workflow
- [SKILL.md](../SKILL.md) — OpenClaw skill definition
- [OPENCLAW.md](../OPENCLAW.md) — Project overview