# Lead Qualification Workflow

**Agent Role:** Analytics  
**Objective:** Score and qualify leads from the lead-sourcing workflow based on company profile data, transaction history, and behavioral signals  
**Execution Mode:** Data aggregation + decision logic via OpenClaw  

---

## Workflow Summary

The qualification workflow processes a list of profiled leads and assigns each a qualification score with a tier classification. It aggregates signals from company profile data, transaction history on the Eurasan platform, response patterns, and configurable criteria to produce a ranked, prioritized lead list ready for outreach or CRM ingestion.

---

## Trigger Conditions

This workflow runs when:
- A lead-sourcing campaign completes and returns a lead list
- A human operator sends `qualify leads for [campaign_id]`
- A scheduled re-qualification fires for existing leads (e.g., after 30 days)

**Required trigger parameters:**
```yaml
campaign_id: string           # ID of the lead sourcing campaign to qualify
leads: Lead[]                 # Array of lead objects from sourcing
criteria:
  min_score_threshold: number # Minimum score to be "qualified" (default: 60)
  scoring_weights:            # Optional custom weights for scoring algorithm
    rating: number            # Weight for supplier rating (default: 0.25)
    activity: number          # Weight for recency of activity (default: 0.20)
    verification: number      # Weight for verified status (default: 0.15)
    response_rate: number     # Weight for response rate (default: 0.20)
    tenure: number            # Weight for years active (default: 0.10)
    location_match: number     # Weight for location criteria (default: 0.10)
target_tier_distribution:     # Optional target distribution for output tiering
  hot: number                 # Target % of leads in hot tier (default: 20)
  warm: number                # Target % of leads in warm tier (default: 35)
  cool: number                # Target % of leads in cool tier (default: 30)
  drop: number                # Target % of leads to drop (default: 15)
```

---

## Prerequisites

1. Leads must have been extracted from the lead-sourcing workflow with at minimum these fields: `company_name`, `rating`, `verified`, `years_active`, `location`
2. Agent must have access to the Eurasan platform to fetch transaction history and response rate data for each lead
3. Scoring criteria thresholds must be defined before the run

---

## Step-by-Step Instructions

### Phase 1 — Data Enrichment

1. **Load the lead list** for the specified `campaign_id`.

2. **For each lead**, fetch additional data from the Eurasan platform:

   a. **Navigate to lead profile page:**
   ```
   browser.navigate → ${{ EURASAN_WEB_URL }}/supplier/[lead.slug]
   ```

   b. **Extract transaction history signals:**
   ```
   browser.evaluate → expression: extractTransactionSignals()
   ```
   Capture:
   - `total_orders` — number of completed orders
   - `order_volume_usd` — approximate total order value
   - `last_order_date` — ISO8601 date of most recent order
   - `repeat_customer_rate` — percentage of orders from repeat buyers
   - `avg_response_time_hours` — supplier's average response time

   c. **Extract behavioral signals:**
   - `last_active` — timestamp of last platform activity (from profile)
   - `inquiry_count` — total RFQs received in last 90 days
   - `response_rate` — percentage of RFQs responded to

   d. **Close the profile page** and repeat for next lead.

3. **Merge enrichment data** back into each lead object.

### Phase 2 — Scoring Algorithm

4. **For each enriched lead**, compute component scores:

   | Component | Calculation | Max Points |
   |-----------|-------------|------------|
   | `rating_score` | `(rating / 5) * 100` | 100 × `rating` weight |
   | `activity_score` | Recency-based: 100 if active ≤7d, 75 if ≤30d, 50 if ≤90d, 25 if >90d | 100 × `activity` weight |
   | `verification_score` | 100 if verified, 0 if not | 100 × `verification` weight |
   | `response_rate_score` | `response_rate` percentage | 100 × `response_rate` weight |
   | `tenure_score` | `min(years_active / 10, 1.0) * 100` | 100 × `tenure` weight |
   | `location_score` | 100 if in target regions, 50 if adjacent, 0 if outside | 100 × `location_match` weight |

5. **Compute weighted total score:**
   ```
   total_score = Σ(component_score * weight)
   ```

6. **Apply optional bonus/penalty modifiers:**
   - **Repeat customer bonus:** `+10` if `repeat_customer_rate >= 50%`
   - **High-volume bonus:** `+10` if `order_volume_usd >= $100,000`
   - **Slow response penalty:** `-15` if `avg_response_time_hours >= 72`
   - **Dormant penalty:** `-20` if `last_active > 180` days ago

7. **Cap score** at 100 (no score exceeds 100).

### Phase 3 — Tier Classification

8. **Assign tier based on final score:**
   | Score Range | Tier | Action |
   |-------------|------|--------|
   | `80–100` | **Hot** | Immediate outreach priority |
   | `60–79` | **Warm** | Standard outreach queue |
   | `40–59` | **Cool** | Nurture sequence |
   | `0–39` | **Drop** | Archive or re-evaluate later |

9. **If `target_tier_distribution` is specified**, apply relative ranking to distribute leads across tiers:
   - Sort leads by `total_score` descending
   - Assign tiers by percentile thresholds matching the target distribution
   - This ensures consistent output distribution across campaigns

### Phase 4 — Recommended Actions

10. **For each lead**, determine the recommended next action:

    ```
    IF tier == "hot":
        action = "immediate_outreach"
        priority = 1
    ELSE IF tier == "warm":
        action = "standard_outreach"
        priority = 2
    ELSE IF tier == "cool":
        action = "nurture_sequence"
        priority = 3
    ELSE:
        action = "archive"
        priority = 4
    ```

11. **Flag leads with notable signals:**
    - `is_verified_high_volume` → verified AND order_volume_usd >= $50,000
    - `is_responsive` → response_rate >= 80%
    - `is_new_inquiry_creator` → inquiry_count >= 10 in last 90 days

### Phase 5 — Output

12. **Return a structured qualification report:**
    ```json
    {
      "campaign_id": "string",
      "qualified_at": "ISO8601 timestamp",
      "total_leads": "number",
      "qualified_count": "number",
      "tier_summary": {
        "hot": "number",
        "warm": "number",
        "cool": "number",
        "drop": "number"
      },
      "scoring_criteria": {
        "min_score_threshold": "number",
        "weights": { ... }
      },
      "leads": [
        {
          "company_name": "string",
          "profile_url": "string",
          "total_score": "number",
          "tier": "hot|warm|cool|drop",
          "priority": "number",
          "recommended_action": "string",
          "flags": ["string"],
          "enriched_data": {
            "total_orders": "number",
            "order_volume_usd": "number",
            "last_order_date": "string",
            "repeat_customer_rate": "number",
            "avg_response_time_hours": "number",
            "inquiry_count_90d": "number",
            "response_rate": "number",
            "last_active": "string"
          },
          "score_breakdown": {
            "rating_score": "number",
            "activity_score": "number",
            "verification_score": "number",
            "response_rate_score": "number",
            "tenure_score": "number",
            "location_score": "number",
            "bonuses": "number",
            "penalties": "number"
          }
        }
      ]
    }
    ```

---

## Tools Used

| Tool | Purpose |
|------|---------|
| `browser.navigate` | Navigate to each lead's profile page |
| `browser.wait_for_selector` | Wait for profile elements to render |
| `browser.evaluate` | Extract transaction and behavioral signals from DOM |
| `browser.click` | Navigate to sub-sections if needed |

---

## Decision Logic

```
FOR each lead IN leads:
    FETCH profile page data
    COMPUTE component scores
    APPLY bonuses/penalties
    COMPUTE total_score
    ASSIGN tier
    DETERMINE recommended_action
    APPEND to output list

SORT output list by total_score DESC

IF target_tier_distribution is set:
    REASSIGN tiers by percentile-based thresholds

FOR each lead:
    IF score < min_score_threshold:
        MARK as disqualified
        SET recommended_action to "review_threshold"
```

---

## Error Handling

| Error | Recovery |
|-------|----------|
| Lead profile page not found (404) | Use only sourcing-stage data; set `enrichment_status: "partial"`; log warning |
| Transaction history section not rendered | Use `null` for transaction fields; do not fail lead; continue |
| Page loads slowly | Retry with 10s additional wait; after 3 retries, skip enrichment for that lead |
| Scoring weight misconfiguration | Fall back to default weights; log warning |
| Empty lead list | Return empty qualification report with `total_leads: 0` |

---

## Example Input

```yaml
trigger: "qualify leads for lead-sourcing-2026-05-17-001"
campaign_id: "lead-sourcing-2026-05-17-001"
leads:
  - company_name: "Shenzhen TechNova Electronics"
    profile_url: "https://eurasan.example.com/supplier/shenzhen-technova"
    rating: 4.8
    verified: true
    years_active: 7
    location: "CN"
  - company_name: "Korea Components Ltd"
    profile_url: "https://eurasan.example.com/supplier/korea-components"
    rating: 4.2
    verified: true
    years_active: 4
    location: "KR"
criteria:
  min_score_threshold: 60
  scoring_weights:
    rating: 0.25
    activity: 0.20
    verification: 0.15
    response_rate: 0.20
    tenure: 0.10
    location_match: 0.10
```

## Example Output

```json
{
  "campaign_id": "lead-sourcing-2026-05-17-001",
  "qualified_at": "2026-05-17T15:00:00Z",
  "total_leads": 2,
  "qualified_count": 2,
  "tier_summary": {
    "hot": 1,
    "warm": 1,
    "cool": 0,
    "drop": 0
  },
  "scoring_criteria": {
    "min_score_threshold": 60,
    "weights": {
      "rating": 0.25,
      "activity": 0.20,
      "verification": 0.15,
      "response_rate": 0.20,
      "tenure": 0.10,
      "location_match": 0.10
    }
  },
  "leads": [
    {
      "company_name": "Shenzhen TechNova Electronics",
      "profile_url": "https://eurasan.example.com/supplier/shenzhen-technova",
      "total_score": 91,
      "tier": "hot",
      "priority": 1,
      "recommended_action": "immediate_outreach",
      "flags": ["is_verified_high_volume", "is_responsive"],
      "enriched_data": {
        "total_orders": 143,
        "order_volume_usd": 890000,
        "last_order_date": "2026-05-10",
        "repeat_customer_rate": 67,
        "avg_response_time_hours": 18,
        "inquiry_count_90d": 34,
        "response_rate": 92,
        "last_active": "2026-05-15"
      },
      "score_breakdown": {
        "rating_score": 24,
        "activity_score": 20,
        "verification_score": 15,
        "response_rate_score": 18.4,
        "tenure_score": 10,
        "location_score": 3.6,
        "bonuses": 10,
        "penalties": 0
      }
    }
  ]
}
```

---

*Last updated: 2026-05-17*