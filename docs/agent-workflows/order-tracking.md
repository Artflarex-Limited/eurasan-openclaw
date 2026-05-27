# Eurasan Order Tracking Workflow

Track order status by confirmation number on the Eurasan B2B Marketplace platform.

## Workflow File

`examples/order-tracking.sf`

## Description

The Order Tracking workflow allows you to query the status of an order or RFQ by its confirmation number. It navigates to the orders dashboard, searches for the order, and extracts status, timeline, items, and supplier information.

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `confirmation_number` | string | Yes | The RFQ or order confirmation number |

## Steps

### 1. navigate_to_orders
Navigates the browser to the orders dashboard.

```yaml
- name: navigate_to_orders
  action: browser.navigate
  args:
    url: ${{ EURASAN_WEB_URL }}/orders
```

### 2. search_order
Fills the search field with the confirmation number.

```yaml
- name: search_order
  action: browser.fill
  args:
    selector: "#order-search"
    value: ${{ parameters.confirmation_number }}
```

### 3. submit_search
Clicks the search button to execute the query.

```yaml
- name: submit_search
  action: browser.click
  args:
    selector: "#search-btn"
```

### 4. wait_for_results
Waits for the order result element to appear.

```yaml
- name: wait_for_results
  action: browser.wait_for_selector
  args:
    selector: ".order-result"
```

### 5. extract_status
Extracts order details from the results page using JavaScript evaluation.

```yaml
- name: extract_status
  action: browser.evaluate
  args:
    expression: |
      () => {
        const statusEl = document.querySelector('.order-status');
        const timelineEl = document.querySelector('.order-timeline');
        const itemsEl = document.querySelector('.order-items');
        const supplierEl = document.querySelector('.order-supplier');
        return {
          status: statusEl ? statusEl.textContent.trim() : null,
          timeline: timelineEl ? timelineEl.textContent.trim() : null,
          items: itemsEl ? itemsEl.textContent.trim() : null,
          supplier: supplierEl ? supplierEl.textContent.trim() : null
        };
      }
```

## Output

| Field | Type | Description |
|-------|------|-------------|
| `status` | string | Current order status (e.g., "Processing", "Shipped", "Delivered") |
| `timeline` | string | Order timeline or history |
| `items` | string | List of ordered items |
| `supplier` | string | Supplier name or identifier |

## Error Handling

| Error | Max Retries | Backoff | Action |
|-------|-------------|---------|--------|
| `OrderNotFoundError` | 2 | Exponential | Raise error after all retries exhausted |

### on_not_found
Raised when the confirmation number does not match any order. The workflow retries up to 2 times with exponential backoff before raising `OrderNotFoundError`.

### on_search_timeout
On search timeout, retries with a longer wait period before attempting again.

## Usage Example

### Basic Order Tracking
```bash
openclaw run examples/order-tracking.sf --env .env \
  --param confirmation_number=RFQ-2026-00123
```

### With jq for Parsing Output
```bash
openclaw run examples/order-tracking.sf --env .env \
  --param confirmation_number=ORD-2026-00456 \
  --output json | jq '.status'
```

## Sequence Diagram

```
┌─────────────┐    ┌──────────────┐    ┌─────────────┐    ┌──────────────┐
│   Agent     │───▶│ navigate_to   │───▶│ search_     │───▶│ submit_      │
│             │    │ orders        │    │ order       │    │ search       │
└─────────────┘    └──────────────┘    └─────────────┘    └──────┬───────┘
                                                                    │
                                                            ┌───────▼─────────┐
                                                            │ wait_for_       │
                                                            │ results         │
                                                            └───────┬─────────┘
                                                                    │
                                                            ┌───────▼─────────┐
                                                            │ extract_status  │
                                                            │ (JS evaluation) │
                                                            └─────────────────┘
```

## Output Structure

The workflow returns a structured status object:

```json
{
  "status": "Processing",
  "timeline": "Order received: 2026-05-15\nSupplier confirmed: 2026-05-16\nProcessing: 2026-05-17",
  "items": "Widget A x 100 pcs\nComponent X x 50 kg",
  "supplier": "Acme Supplies Ltd."
}
```

## Common Status Values

| Status | Description |
|--------|-------------|
| `Pending` | Order submitted, awaiting supplier response |
| `Processing` | Supplier has accepted and is processing |
| `Shipped` | Order has been shipped |
| `Delivered` | Order has been delivered |
| `Cancelled` | Order was cancelled |
| `Rejected` | Supplier rejected the order |

## Notes

- The confirmation number format should match Eurasan's format (e.g., `RFQ-YYYY-NNNNN` or `ORD-YYYY-NNNNN`).
- If the order is not found, verify the confirmation number is correct and try again.
- The timeline field contains a text representation of the order history; actual format may vary.
- The workflow uses CSS class selectors (`.order-status`, `.order-timeline`, etc.) which may change if the Eurasan platform UI is updated.