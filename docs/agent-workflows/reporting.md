# Reporting Workflow

**Agent Role:** Analytics  
**Objective:** Aggregate RFQ data, order metrics, supplier performance, and conversion rates into structured reports for human review or automated dashboards  
**Execution Mode:** Data aggregation + formatting via OpenClaw  

---

## Workflow Summary

The reporting workflow instructs an AI agent to collect activity data from the Eurasan platform, aggregate it across configurable time windows and dimensions, and produce a structured report. Reports can be generated on demand or on a schedule, and output in JSON or Markdown format for delivery to human operators or downstream systems.

---

## Trigger Conditions

This workflow runs when:
- A human operator sends `generate report for [period]`
- A scheduled report trigger fires (daily/weekly/monthly)
- A campaign milestone is reached and a report is requested
- An API call hits the report endpoint with parameters

**Required trigger parameters:**
```yaml
report_type: string           # "rfq_summary" | "order_performance" | "supplier_scorecard" | "full_dashboard"
period:
  start: string               # ISO8601 date — beginning of reporting window
  end: string                # ISO8601 date — end of reporting window
filters:
  category: string[]          # Optional product categories to include
  supplier_ids: string[]      # Optional supplier IDs to filter
  status: string[]            # Optional status filters (e.g., ["pending", "confirmed"])
output_format: string         # "json" | "markdown"
include_charts: boolean       # Whether to include chart data objects (default: false)
delivery:
  channel: string            # "return" | "email" | "file"
  destination: string         # Email address or file path depending on channel
```

---

## Prerequisites

1. Agent must be authenticated on the Eurasan platform with access to the reporting/metrics section
2. `EURASAN_WEB_URL` must be set in the environment
3. Report type must be supported (see supported types below)
4. Start date must be before end date
5. For scheduled reports, the scheduling system must be pre-configured with report parameters

---

## Step-by-Step Instructions

### Phase 1 — Data Collection

#### RFQ Summary Report (`rfq_summary`)

1. **Navigate to RFQ dashboard:**
   ```
   browser.navigate → ${{ EURASAN_WEB_URL }}/reports/rfqs
   ```

2. **Set date range filters:**
   - Fill start date input with `period.start`
   - Fill end date input with `period.end`
   - Click "Apply" or refresh

3. **Apply category filter** if `filters.category` is specified:
   ```
   browser.click → "#category-filter"
   browser.select_option → matching option for each category
   ```

4. **Wait for report table to load:**
   ```
   browser.wait_for_selector → ".rfq-table, [data-rfq-report]"
   ```

5. **Extract summary metrics** from the top-of-page summary cards:
   ```
   browser.evaluate → expression: extractSummaryCards()
   ```
   Capture:
   - `total_rfqs` — total RFQs in period
   - `submitted` — count of submitted RFQs
   - `pending_response` — count awaiting supplier response
   - `converted` — count that resulted in orders
   - `conversion_rate` — percentage

6. **Extract RFQ line items** by iterating pages:
   ```
   browser.evaluate → expression: extractRFQLines()
   ```
   For each page, capture:
   - `rfq_id`
   - `created_date`
   - `category`
   - `product_summary`
   - `status`
   - `supplier_count` — number of suppliers contacted
   - `response_count` — responses received
   - `lowest_quote` — lowest received quote amount
   - `avg_quote` — average quote amount
   - `deadline`

7. **Navigate through pagination** until all rows for the period are collected.

#### Order Performance Report (`order_performance`)

1. **Navigate to orders dashboard:**
   ```
   browser.navigate → ${{ EURASAN_WEB_URL }}/reports/orders
   ```

2. **Set date range filters** (same as RFQ summary).

3. **Apply status filter** if specified (e.g., only `confirmed` and `shipped` orders).

4. **Extract performance metrics:**
   ```
   browser.evaluate → expression: extractOrderMetrics()
   ```
   Capture:
   - `total_orders` — orders in period
   - `total_order_value` — sum of order values
   - `avg_order_value`
   - `median_order_value`
   - `orders_by_status` — breakdown by status (confirmed, shipped, delivered, cancelled)
   - `orders_by_category` — breakdown by product category
   - `repeat_order_count` — orders from repeat buyers
   - `new_customer_count`

5. **Extract order timeline data:**
   - Average lead time (days from order to delivery)
   - On-time delivery rate
   - Cancellation rate

#### Supplier Scorecard Report (`supplier_scorecard`)

1. **Navigate to supplier analytics:**
   ```
   browser.navigate → ${{ EURASAN_WEB_URL }}/reports/suppliers
   ```

2. **Apply supplier ID filter** if `filters.supplier_ids` is specified.

3. **Extract scorecard data for each supplier:**
   ```
   browser.evaluate → expression: extractSupplierScorecard()
   ```
   Capture:
   - `supplier_id`
   - `company_name`
   - `total_orders` — orders placed with this supplier in period
   - `total_spend` — sum of order values
   - `avg_rating` — average buyer rating
   - `response_rate` — % of RFQs responded to
   - `avg_response_time_hours`
   - `on_time_delivery_rate`
   - `quality_issues` — count of reported issues
   - `rfq_to_order_conversion` — % of RFQs that became orders

### Phase 2 — Aggregation

6. **For each report type**, compute aggregate statistics:

   **For `rfq_summary`:**
   - Breakdown by status (pie chart data)
   - Conversion rate trend (line chart data by week)
   - Top categories by RFQ volume
   - Average response count per RFQ
   - Average quote spread (lowest vs. highest)

   **For `order_performance`:**
   - Monthly order volume trend
   - Category distribution
   - Average order value trend
   - Top suppliers by order volume
   - Repeat vs. new customer ratio

   **For `supplier_scorecard`:**
   - Top 10 suppliers by total spend
   - Top 10 suppliers by rating
   - Suppliers with highest response rate
   - Suppliers with most quality issues

7. **If `include_charts` is `true`**, produce chart data objects:
   ```json
   {
     "chart_type": "bar|line|pie",
     "title": "string",
     "labels": ["string"],
     "datasets": [{ "label": "string", "data": [number] }]
   }
   ```

### Phase 3 — Formatting

8. **Format the report** per `output_format`:

   **If `output_format == "markdown"`:**
   - Use headers, tables, and bullet lists
   - Include a summary section at the top with key metrics
   - Add a footer with report metadata (generated_at, period, report_type)
   - Include a "Recommendations" section with suggested next actions based on data

   **If `output_format == "json"`:**
   - Return a flat JSON object with all metrics
   - Include `generated_at`, `report_type`, `period`, `filters` as metadata
   - Include `charts` array if `include_charts == true`

### Phase 4 — Delivery

9. **Handle delivery** per `delivery.channel`:

   **If `return`:**
   - Return the formatted report as the workflow output

   **If `email`:**
   ```
   email.send → {
     to: delivery.destination,
     subject: "[Eurasan Report] {report_type} — {period.start} to {period.end}",
     body: formatted_report (markdown or summary + link to JSON),
     attachments: [] // JSON report file if large
   }
   ```

   **If `file`:**
   ```
   file.write → {
     path: delivery.destination,
     content: formatted_report
   }
   ```

10. **Output a delivery confirmation:**
    ```json
    {
      "report_id": "string",
      "report_type": "string",
      "period": { "start": "string", "end": "string" },
      "generated_at": "ISO8601 timestamp",
      "record_count": "number",
      "delivery": {
        "channel": "string",
        "destination": "string",
        "status": "delivered|pending|failed",
        "delivered_at": "ISO8601 timestamp or null"
      },
      "file_size_bytes": "number or null"
    }
    ```

---

## Tools Used

| Tool | Purpose |
|------|---------|
| `browser.navigate` | Navigate to report pages |
| `browser.wait_for_selector` | Wait for report tables to render |
| `browser.click` | Apply filters, navigate pagination |
| `browser.fill` | Set date range inputs |
| `browser.select_option` | Select filter options |
| `browser.evaluate` | Extract structured data from DOM |
| `browser.getAttribute` | Extract href links for drill-down data |
| `email.send` | Deliver report via email |
| `file.write` | Write report to file system |

---

## Decision Logic

```
IF report_type == "full_dashboard":
    RUN all three report types (rfq_summary, order_performance, supplier_scorecard)
    MERGE into single dashboard report

IF period.end is in the future:
    SET period.end to current date
    LOG warning: "end date adjusted to today"

IF record_count == 0 for all data:
    GENERATE empty report with warning message
    DO NOT abort the workflow

IF browser times out during extraction:
    RETRY up to 3 times
    IF still failing, FILL missing data with null
    LOG error with missing section name

IF delivery.channel == "email" AND email fails:
    RETRY once
    IF still failing, FALL BACK to file write
    NOTIFY operator of delivery failure
```

---

## Error Handling

| Error | Recovery |
|-------|----------|
| Report page returns 403 (insufficient permissions) | Abort with `PermissionError`; log which report type failed |
| Date range too large (page timeout) | Auto-split into weekly sub-ranges; aggregate results; log split |
| No data for period | Return empty report with `total_records: 0`; do not treat as error |
| Filter returns no results | Return empty report; do not fail |
| Delivery destination unreachable | Retry once; log failure; fall back to `return` channel |
| Malformed date in filter | Return `ValidationError` with field name; do not proceed |

---

## Supported Report Types

| Type | Description | Key Metrics |
|------|-------------|-------------|
| `rfq_summary` | RFQ activity overview | total, submitted, pending, converted, conversion_rate |
| `order_performance` | Order volume and value | total, value, avg, by status, by category, repeat rate |
| `supplier_scorecard` | Supplier-level analytics | orders, spend, rating, response rate, on-time rate |
| `full_dashboard` | All three combined | All metrics from all three types |

---

## Example Input

```yaml
trigger: "generate report for the last 30 days"
report_type: "order_performance"
period:
  start: "2026-04-17"
  end: "2026-05-17"
filters:
  category: ["electronic-components", "industrial-supplies"]
  status: ["confirmed", "shipped"]
output_format: "markdown"
include_charts: true
delivery:
  channel: "email"
  destination: "ops-team@artflarex.com"
```

## Example Output

```markdown
# Order Performance Report

**Period:** 2026-04-17 → 2026-05-17  
**Generated:** 2026-05-17T16:00:00Z  
**Filters:** category: electronic-components, industrial-supplies | status: confirmed, shipped

---

## Summary

| Metric | Value |
|--------|-------|
| Total Orders | 247 |
| Total Order Value | $1,842,300 |
| Average Order Value | $7,458 |
| Median Order Value | $4,120 |
| Repeat Orders | 89 (36%) |
| New Customers | 41 |

---

## Orders by Status

| Status | Count | Value |
|--------|-------|-------|
| Confirmed | 112 | $743,500 |
| Shipped | 98 | $821,200 |
| Delivered | 37 | $277,600 |

---

## Top Categories

| Category | Orders | Value |
|----------|--------|-------|
| Electronic Components | 134 | $1,102,400 |
| Industrial Supplies | 113 | $739,900 |

---

## Recommendations

- **Electronic Components** account for 60% of volume — consider expanding supplier base for this category
- **Repeat order rate of 36%** indicates strong customer retention; focus on upselling new customers
- **37 delivered orders** in period — follow up for performance reviews

---
*Report ID: order-perf-2026-05-17-001 | Eurasan OpenClaw v1.0*
```

---

*Last updated: 2026-05-17*