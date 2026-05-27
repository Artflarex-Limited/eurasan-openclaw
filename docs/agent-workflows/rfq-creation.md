# Eurasan RFQ Creation Workflow

Create a Request for Quotation (RFQ) on the Eurasan B2B Marketplace platform.

## Workflow File

`examples/rfq-creation.sf`

## Description

The RFQ Creation workflow automates the process of submitting a Request for Quotation to suppliers on the Eurasan B2B Marketplace. It supports multiple product line items, optional specifications, delivery deadlines, and additional notes for suppliers.

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `products` | array | Yes | Array of product objects (see Product Object below) |
| `specifications` | string | No | Detailed product specifications or requirements |
| `deadline` | string | No | Delivery deadline in YYYY-MM-DD format |
| `notes` | string | No | Additional notes or instructions for suppliers |

### Product Object

Each item in the `products` array must contain:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Product name or part number |
| `quantity` | number | Yes | Requested quantity |
| `unit` | string | Yes | Unit of measure (e.g., "pcs", "kg", "boxes") |

## Steps

### 1. navigate_to_rfq
Navigates the browser to the RFQ creation form.

```yaml
- name: navigate_to_rfq
  action: browser.navigate
  args:
    url: ${{ EURASAN_WEB_URL }}/rfq/create
```

### 2. wait_for_form
Waits for the RFQ form to be present and interactive.

```yaml
- name: wait_for_form
  action: browser.wait_for_selector
  args:
    selector: "#rfq-form"
```

### 3. add_products (foreach)
Iterates over each product in the `products` array and adds a line item to the RFQ form.

```yaml
- name: add_products
  foreach: ${{ parameters.products }}
  steps:
    - name: click_add_product
      action: browser.click
      args:
        selector: "#add-product-btn"

    - name: fill_product
      action: browser.fill
      args:
        selector: "#product-name"
        value: ${{ item.name }}

    - name: fill_quantity
      action: browser.fill
      args:
        selector: "#product-quantity"
        value: ${{ item.quantity }}

    - name: fill_unit
      action: browser.fill
      args:
        selector: "#product-unit"
        value: ${{ item.unit }}
```

For each product, the workflow:
1. Clicks "Add Product" to create a new line item
2. Fills in the product name
3. Fills in the quantity
4. Fills in the unit of measure

### 4. fill_specifications (conditional)
If `specifications` parameter is provided, fills the specifications field.

```yaml
- name: fill_specifications
  if: ${{ parameters.specifications }}
  action: browser.fill
  args:
    selector: "#specifications"
    value: ${{ parameters.specifications }}
```

### 5. fill_deadline (conditional)
If `deadline` parameter is provided, fills the delivery deadline field.

```yaml
- name: fill_deadline
  if: ${{ parameters.deadline }}
  action: browser.fill
  args:
    selector: "#deadline"
    value: ${{ parameters.deadline }}
```

### 6. fill_notes (conditional)
If `notes` parameter is provided, fills the additional notes field.

```yaml
- name: fill_notes
  if: ${{ parameters.notes }}
  action: browser.fill
  args:
    selector: "#notes"
    value: ${{ parameters.notes }}
```

### 7. submit_rfq
Clicks the submit button to submit the RFQ.

```yaml
- name: submit_rfq
  action: browser.click
  args:
    selector: "#submit-rfq"
```

### 8. wait_for_confirmation
Waits for the confirmation number element to appear.

```yaml
- name: wait_for_confirmation
  action: browser.wait_for_selector
  args:
    selector: ".confirmation-number"
```

### 9. extract_confirmation
Extracts the confirmation number from the success page.

```yaml
- name: extract_confirmation
  action: browser.evaluate
  args:
    expression: |
      () => {
        const el = document.querySelector('.confirmation-number');
        return el ? el.textContent.trim() : null;
      }
```

## Output

| Field | Type | Description |
|-------|------|-------------|
| `confirmation_number` | string | RFQ confirmation number from success page |
| `submitted_at` | timestamp | When the RFQ was submitted |

## Error Handling

| Error | Max Retries | Backoff | Action |
|-------|-------------|---------|--------|
| `RFQError` | 2 | Linear | Raise error after all retries exhausted |

### on_validation_error
On form validation failure, the workflow re-fetches the form state and repopulates all fields before retrying (up to 2 times with linear backoff).

### on_session_error
If the session expires during submission, the workflow re-authenticates and resumes the RFQ flow from the beginning.

### on_submission_error
On submission failure, retries up to 2 times before raising `RFQError`.

## Usage Example

### Single Product RFQ
```bash
openclaw run examples/rfq-creation.sf --env .env \
  --param products='[{"name":"Widget A","quantity":100,"unit":"pcs"}]' \
  --param deadline="2026-06-01" \
  --param notes="Please include shipping estimates"
```

### Multi-Product RFQ with Specifications
```bash
openclaw run examples/rfq-creation.sf --env .env \
  --param products='[
    {"name":"Component X","quantity":50,"unit":"kg"},
    {"name":"Component Y","quantity":25,"unit":"kg"}
  ]' \
  --param specifications="Must meet ISO 9001 certification standards" \
  --param deadline="2026-06-15" \
  --param notes="Flexible on delivery date if price is competitive"
```

## Sequence Diagram

```
┌─────────────┐    ┌──────────────┐    ┌─────────────┐    ┌──────────────┐
│   Agent     │───▶│ navigate_to  │───▶│ wait_for_   │───▶│ add_products │
│             │    │ rfq          │    │ form        │    │ (foreach)    │
└─────────────┘    └──────────────┘    └─────────────┘    └──────┬───────┘
                                                                  │
                                            ┌────────────────────┴────────────────────┐
                                            │ For each product:                         │
                                            │  click_add_product → fill_product →     │
                                            │  fill_quantity → fill_unit              │
                                            └────────────────────┬────────────────────┘
                                                                 │
                                              ┌──────────────────┴──────────────────┐
                                              │                                     │
                                        ┌─────▼──────────┐    ┌─────────▼─────────┐
                                        │ fill_          │    │ fill_notes        │
                                        │ specifications │    │ (if provided)     │
                                        └────┬───────────┘    └───────────────────┘
                                             │
                                       ┌─────▼──────────┐
                                       │ fill_deadline  │
                                       │ (if provided)   │
                                       └────┬───────────┘
                                            │
                                      ┌─────▼─────────┐
                                      │ submit_rfq    │
                                      └────┬──────────┘
                                           │
                                   ┌───────▼────────────┐
                                   │ wait_for_          │
                                   │ confirmation       │
                                   └───────┬────────────┘
                                           │
                                   ┌───────▼────────────┐
                                   │ extract_           │
                                   │ confirmation        │
                                   └────────────────────┘
```

## Notes

- The `products` array is required and must contain at least one product.
- The deadline must be in `YYYY-MM-DD` format.
- The unit field supports any string value; common values include: `pcs`, `kg`, `lbs`, `boxes`, `pallets`, `meters`, `feet`.
- If session timeout occurs mid-submission, the workflow re-authenticates and restarts the entire RFQ flow.
- The confirmation number format depends on Eurasan platform conventions (e.g., `RFQ-2026-00123`).