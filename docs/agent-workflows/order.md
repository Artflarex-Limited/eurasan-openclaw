# Order Management Workflow

**Agent Role:** Backend Lead  
**Objective:** Orchestrate the full order lifecycle on the Eurasan B2B Marketplace — from RFQ response through order creation, confirmation, and tracking through to fulfillment completion  
**Execution Mode:** Browser automation + state management via OpenClaw  

---

## Workflow Summary

The order management workflow equips an AI agent to handle the complete lifecycle of an order on the Eurasan platform. The agent receives RFQ responses, evaluates supplier quotes, creates and confirms orders, monitors fulfillment status, and tracks orders through to delivery completion.

---

## Trigger Conditions

This workflow runs when:
- An RFQ receives supplier responses and a buyer needs to evaluate and create an order
- A human operator sends `create order from [rfq_id]` with supplier selection
- A scheduled status check fires for pending or in-progress orders
- An order status update notification is received from the platform

**Required trigger parameters:**
```yaml
trigger_type: string           # "rfq_response" | "manual_create" | "status_check" | "fulfillment_update"
rfq_id: string                 # RFQ ID (for rfq_response and manual_create)
supplier_id: string            # Selected supplier to create order with (required for manual_create)
order_id: string               # Order ID (for status_check and fulfillment_update)
filters:
  status: string[]             # For status_check: statuses to monitor (e.g., ["confirmed", "shipped"])
  due_within_days: number      # For status_check: orders due within N days
check_fulfillment: boolean     # Whether to check fulfillment progress for in-progress orders
```

---

## Prerequisites

1. Agent must be authenticated on the Eurasan platform
2. `EURASAN_WEB_URL` must be set in the environment
3. For `rfq_response`: the RFQ must have at least one supplier response
4. For `manual_create`: `supplier_id` must be provided along with `rfq_id`
5. Active session token must be stored in `$EURASAN_TOKEN`
6. For fulfillment checks: agent must have access to the order tracking section

---

## Step-by-Step Instructions

### Mode A — RFQ Response → Order Creation

Triggered when an RFQ receives responses and a buyer selects a supplier.

#### Step 1: Load RFQ and Responses

1. **Navigate to RFQ detail page:**
   ```
   browser.navigate → ${{ EURASAN_WEB_URL }}/rfq/{rfq_id}
   ```

2. **Wait for RFQ detail section:**
   ```
   browser.wait_for_selector → ".rfq-detail, [data-rfq-id]"
   ```

3. **Extract RFQ metadata:**
   ```
   browser.evaluate → expression: extractRFQMetadata()
   ```
   Capture:
   - `rfq_id`
   - `title`
   - `created_date`
   - `deadline`
   - `line_items` — array of {product, quantity, unit, specifications}

4. **Scroll to responses section** and extract supplier responses:
   ```
   browser.evaluate → expression: extractSupplierResponses()
   ```
   Capture for each response:
   - `supplier_id`
   - `supplier_name`
   - `quoted_price`
   - `currency`
   - `lead_time_days`
   - `valid_until`
   - `notes`
   - `rating` — supplier's average rating
   - `response_date`

#### Step 2: Evaluate and Select Supplier

5. **Present or compute the best offer:**
   ```
   FOR each response IN responses:
       score = (quoted_price_weight * price_score)
             + (lead_time_weight * lead_time_score)
             + (rating_weight * rating_score)
       price_score = (1 - (price / min_price)) * 100  // normalize to best price
       lead_time_score = (1 - (lead_time_days / max_lead_time)) * 100
       rating_score = (rating / 5) * 100

   SELECT response with highest score as recommended
   ```

   Default weights: `price: 0.5`, `lead_time: 0.3`, `rating: 0.2`

6. **If the trigger includes a specific `supplier_id`**, use that supplier directly (skip scoring).

7. **Display comparison table** to the human operator (if interactive):
   ```
   Supplier Name | Price | Lead Time | Rating | Score
   ```

8. **Wait for confirmation** (if human-in-the-loop mode), or proceed automatically if `auto_confirm == true`.

#### Step 3: Create Order

9. **Click "Create Order"** on the selected response:
   ```
   browser.click → "[data-supplier-id={selected_supplier_id}] .create-order-btn"
   ```

10. **Wait for order form** to load:
    ```
    browser.wait_for_selector → ".order-form, [data-order-create]"
    ```

11. **Pre-fill order form** from RFQ data and selected quote:
    ```
    browser.fill → "#order-quantity", rfq_line_item.quantity
    browser.fill → "#agreed-price", selected_quote.quoted_price
    browser.fill → "#lead-time", selected_quote.lead_time_days
    browser.select_option → "#delivery-address", from_address_book
    browser.fill → "#po-number", parameters.po_number  // if provided
    ```

12. **Review order summary** section:
    ```
    browser.wait_for_selector → ".order-summary"
    ```

13. **Submit order:**
    ```
    browser.click → "#submit-order"
    ```

14. **Wait for order confirmation:**
    ```
    browser.wait_for_selector → ".order-confirmation, [data-order-id]"
    ```

15. **Extract confirmation number:**
    ```
    browser.evaluate → expression: () => document.querySelector('.order-id, [data-order-id]').textContent.trim()
    ```
    Record: `order_id`, `confirmation_number`, `estimated_delivery_date`

---

### Mode B — Manual Order Creation

Triggered with explicit `rfq_id` and `supplier_id`.

1. **Navigate directly to order creation form with pre-selected context:**
   ```
   browser.navigate → ${{ EURASAN_WEB_URL }}/rfq/{rfq_id}/order?supplier={supplier_id}
   ```

2. **Pre-fill from URL parameters** — supplier_id and rfq_id are already encoded.

3. **Follow Steps 11–15 from Mode A** (fill form, review, submit, extract confirmation).

---

### Mode C — Order Status Check

Triggered on a schedule to monitor in-progress orders.

1. **Navigate to orders dashboard:**
   ```
   browser.navigate → ${{ EURASAN_WEB_URL }}/orders
   ```

2. **Set status filter** (if `filters.status` is provided):
   ```
   browser.click → "#status-filter"
   browser.select_option → [status options]
   ```

3. **Set due date filter** (if `filters.due_within_days` is provided):
   ```
   browser.fill → "#due-within-days", filters.due_within_days
   ```

4. **Click "Search" or apply filters** and wait for results:
   ```
   browser.wait_for_selector → ".order-list, [data-order-row]"
   ```

5. **Extract status for each matching order:**
   ```
   browser.evaluate → expression: extractOrderStatusList()
   ```
   Capture for each order:
   - `order_id`
   - `confirmation_number`
   - `supplier_name`
   - `status` (confirmed, shipped, in_transit, delivered, cancelled)
   - `order_date`
   - `estimated_delivery_date`
   - `actual_delivery_date` (if delivered)
   - `line_items_summary`

6. **Identify orders requiring attention:**
   - `status == "shipped"` and `estimated_delivery_date < today + 2 days` → flag as "arriving soon"
   - `status == "confirmed"` and `estimated_delivery_date < today` → flag as "overdue"
   - `status == "in_transit"` → check tracking details (if `check_fulfillment == true`)

7. **If `check_fulfillment == true`** for in-transit orders, click into each and extract tracking milestones:
   ```
   browser.click → "[data-order-id={order_id}]"
   browser.wait_for_selector → ".tracking-timeline"
   browser.evaluate → expression: extractTrackingMilestones()
   ```
   Capture:
   - `carrier`
   - `tracking_number`
   - `milestones[]` — {date, location, description, status}

---

### Mode D — Fulfillment Completion

Triggered when an order reaches "delivered" status or a delivery confirmation is received.

1. **Navigate to order detail:**
   ```
   browser.navigate → ${{ EURASAN_WEB_URL }}/order/{order_id}
   ```

2. **Verify delivery status:**
   ```
   browser.evaluate → expression: extractDeliveryConfirmation()
   ```
   Capture:
   - `delivered_at` — timestamp
   - `signed_by` — recipient name if available
   - `proof_of_delivery_url` — POD document link if available

3. **Record delivery event** in local state:
   ```json
   {
     "event": "order_delivered",
     "order_id": "string",
     "delivered_at": "ISO8601",
     "signed_by": "string",
     "pod_url": "string"
   }
   ```

4. **If post-delivery feedback is configured**, trigger satisfaction survey:
   ```
   browser.click → "#leave-feedback"
   browser.fill → "#rating", 5
   browser.fill → "#feedback-notes", "Thank you for your prompt delivery."
   browser.click → "#submit-feedback"
   ```

---

### Phase — Output

Regardless of mode, the workflow returns a structured status object:

```json
{
  "workflow_mode": "rfq_response|manual_create|status_check|fulfillment_update",
  "executed_at": "ISO8601 timestamp",
  "orders_processed": "number",
  "orders": [
    {
      "order_id": "string",
      "confirmation_number": "string",
      "rfq_id": "string",
      "supplier_id": "string",
      "supplier_name": "string",
      "status": "string",
      "total_value": "number",
      "currency": "string",
      "lead_time_days": "number",
      "order_date": "string",
      "estimated_delivery_date": "string",
      "actual_delivery_date": "string or null",
      "tracking_number": "string or null",
      "tracking_milestones": [],
      "flags": ["string"],
      "pod_url": "string or null"
    }
  ],
  "summary": {
    "new_orders_created": "number",
    "status_changes_detected": "number",
    "orders_requiring_attention": "number",
    "delivered": "number"
  }
}
```

---

## Tools Used

| Tool | Purpose |
|------|---------|
| `browser.navigate` | Navigate to RFQ, order, or orders dashboard pages |
| `browser.wait_for_selector` | Wait for form and list elements to render |
| `browser.click` | Trigger order creation, open order details, submit |
| `browser.fill` | Fill form fields (quantity, price, lead time, PO number) |
| `browser.select_option` | Select from dropdowns (delivery address, status filter) |
| `browser.evaluate` | Extract metadata, responses, status, tracking from DOM |
| `browser.getAttribute` | Extract hrefs and data attributes for deep linking |

---

## Decision Logic

```
FOR each order IN orders:
    IF status == "confirmed" AND estimated_delivery_date < today:
        FLAG as "overdue" — log and notify operator

    IF status == "shipped" AND due_within_days == 2:
        FLAG as "arriving_soon" — log and notify operator

    IF status == "delivered" AND feedback_not_submitted:
        TRIGGER feedback workflow

    IF tracking_available AND check_fulfillment == true:
        FETCH tracking milestones
        UPDATE order object with tracking data

    IF order not found during status check:
        LOG warning
        CONTINUE to next order
```

---

## Error Handling

| Error | Recovery |
|-------|----------|
| RFQ not found (404) | Return `RFQNotFoundError`; do not proceed |
| No supplier responses on RFQ | Return empty responses list; abort order creation; log |
| Selected supplier no longer active | Return `SupplierUnavailableError` with alternative supplier suggestions |
| Order form submission fails | Retry up to 3 times with 5s wait; if still failing, log form state and raise `OrderCreateError` |
| Session expired during order creation | Re-run `login`, resume from last step (re-populate form if possible) |
| Order not found during status check | Skip; log as `order_not_found`; do not block remaining checks |
| Tracking page returns 404 | Set `tracking_number: null`; do not fail the status check |
| Duplicate order creation attempt | Detect if order already exists for this RFQ+supplier combo; return existing order_id |
| Rate limit during status check | Pause 30s; retry; if still failing, return partial results with `status: "rate_limited"` |

---

## Example Input

```yaml
trigger: "create order from rfq-2026-05-17-042"
trigger_type: "rfq_response"
rfq_id: "rfq-2026-05-17-042"
supplier_id: "sup-technova-001"
auto_confirm: false
po_number: "PO-2026-0517-042"
```

## Example Output

```json
{
  "workflow_mode": "rfq_response",
  "executed_at": "2026-05-17T17:00:00Z",
  "orders_processed": 1,
  "orders": [
    {
      "order_id": "ord-2026-05-17-042",
      "confirmation_number": "CONF-2026-051742",
      "rfq_id": "rfq-2026-05-17-042",
      "supplier_id": "sup-technova-001",
      "supplier_name": "Shenzhen TechNova Electronics",
      "status": "confirmed",
      "total_value": 24500,
      "currency": "USD",
      "lead_time_days": 14,
      "order_date": "2026-05-17",
      "estimated_delivery_date": "2026-05-31",
      "actual_delivery_date": null,
      "tracking_number": null,
      "tracking_milestones": [],
      "flags": [],
      "pod_url": null
    }
  ],
  "summary": {
    "new_orders_created": 1,
    "status_changes_detected": 0,
    "orders_requiring_attention": 0,
    "delivered": 0
  }
}
```

---

*Last updated: 2026-05-17*