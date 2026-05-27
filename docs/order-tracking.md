# Order Tracking Workflow

**Workflow Type:** Order Management
**OpenClaw Skill File:** `examples/order-tracking.sf`
**Error Codes:** `OrderNotFoundError`, `NetworkError`

---

## Overview

The order tracking workflow retrieves the current status of an order on the Eurasan B2B Marketplace by confirmation number. It extracts order details including status, timeline, items, and supplier information.

---

## Prerequisites

1. Authenticated session (see [login.md](./login.md))
2. Valid `auth_token` stored in session
3. `EURASAN_WEB_URL` set to platform base URL
4. Valid confirmation number (RFQ or order)

---

## Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `confirmation_number` | `string` | ✅ | RFQ or order confirmation number |

---

## Execution Steps

1. **Navigate to orders dashboard** — Go to `{EURASAN_WEB_URL}/orders`
2. **Wait for search interface** — Ensure `#order-search` field is present
3. **Enter confirmation number** — Fill `#order-search` with the provided confirmation number
4. **Execute search** — Click `#search-btn`
5. **Wait for results** — Wait for `.order-result` element to appear
6. **Extract order data** — Parse the following from the DOM:
   - `status` — Current order status (e.g., confirmed, shipped, delivered)
   - `timeline` — Array of status change events with timestamps
   - `items` — Array of ordered products with quantities
   - `supplier` — Supplier name, contact, and fulfillment details
7. **Return status object** — Provide complete order information

---

## Order Status Values

| Status | Description |
|---|---|
| `pending` | Order created, awaiting supplier confirmation |
| `confirmed` | Supplier confirmed, preparing for shipment |
| `in_production` | Order is being manufactured/processed |
| `shipped` | Order has been dispatched |
| `delivered` | Order completed and received |
| `cancelled` | Order was cancelled |
| `on_hold` | Order is paused pending action |

---

## Error Handling

| Error | Detection | Recovery |
|---|---|---|
| Order not found | No `.order-result` element after search | Retry twice with exponential backoff, then raise `OrderNotFoundError` |
| Search timeout | Search takes longer than 30s | Retry with longer wait (60s) |
| Network failure | Request timeout or 5xx response | Retry with exponential backoff (max 3 attempts) |
| Rate limiting | HTTP 429 response | Wait 60s, then retry |
| Session expired | 401 response or redirect to `/login` | Re-authenticate and restart search |

**Retry backoff:** Exponential starting at 1s, max 10s between attempts.

---

## Output

```json
{
  "confirmation_number": "string",
  "status": "string",
  "timeline": [
    {"event": "Order created", "timestamp": "ISO8601", "details": "string"}
  ],
  "items": [
    {"name": "string", "quantity": number, "unit": "string", "price": "string"}
  ],
  "supplier": {
    "name": "string",
    "contact": "string",
    "location": "string"
  },
  "estimated_delivery": "YYYY-MM-DD" or null,
  "last_updated": "ISO8601 timestamp"
}
```

---

## State Persistence

Checkpoints are saved at:
- After navigation to orders dashboard
- After search execution
- After data extraction

On failure, workflow resumes from the last checkpoint.

---

## Scheduled Monitoring

For ongoing order monitoring, run the workflow on a schedule:

```yaml
trigger:
  type: schedule
  cron: "0 9 * * *"  # Daily at 9 AM

filters:
  status: ["confirmed", "in_production", "shipped"]
  due_within_days: 7
check_fulfillment: true
```

---

## Security Considerations

- Cache order data appropriately — do not poll excessively
- Store supplier information securely
- Log order IDs only, never item quantities or values
- Use read-only access for tracking accounts when possible

---

## Testing

```bash
# Run order tracking tests only
npm test -- --grep "order"

# Run with visible browser
npm run test:headed
```

Test file: `tests/order.test.js`

---

## Example Usage

```bash
# Track a specific order
openclaw run examples/order-tracking.sf --env .env \
  --param confirmation_number=RFQ-2025-12345

# Monitor multiple orders
openclaw run examples/order-tracking.sf --env .env \
  --param confirmation_number=ORD-2025-67890
```

---

## Related Documentation

- [login.md](./login.md) — Authentication workflow
- [rfq-creation.md](./rfq-creation.md) — RFQ creation workflow
- [SKILL.md](../SKILL.md) — OpenClaw skill definition
- [OPENCLAW.md](../OPENCLAW.md) — Project overview