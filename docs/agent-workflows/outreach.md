# Outreach Workflow

**Agent Role:** Email  
**Objective:** Compose and send personalized outreach messages to qualified leads from the lead-sourcing workflow  
**Execution Mode:** Browser + Email API via OpenClaw  

---

## Workflow Summary

The outreach workflow takes a qualified lead list and orchestrates personalized first-contact messages to each supplier or buyer. It handles message composition, platform messaging dispatch or email integration, follow-up scheduling, and response tracking.

---

## Trigger Conditions

This workflow runs when:
- A lead-sourcing campaign completes and returns qualified leads
- A human operator sends `run outreach for [campaign_id]`
- A scheduled follow-up trigger fires for pending follow-up messages

**Required trigger parameters:**
```yaml
campaign_id: string           # ID of the lead campaign to outreach
leads: Lead[]                 # Array of lead objects (from lead-sourcing output)
outreach_channel: string      # "platform_message" | "email" | "both"
template_id: string           # ID of the message template to use
personalization_fields:       # Map of template variable names to lead fields
  first_name: company_name    # e.g., use company_name when first_name unavailable
  product_interest: category
follow_up_enabled: boolean    # Whether to schedule follow-up messages
follow_up_delay_days: number  # Days to wait before follow-up (default: 3)
max_outreach_per_run: number  # Cap on messages per run to avoid rate limits (default: 20)
```

---

## Prerequisites

1. Agent must be authenticated on the Eurasan platform
2. Platform messaging must be enabled for the automation account
3. Email integration must be configured if `outreach_channel` is `email` or `both`
4. Message templates must be defined in the agent's template store
5. Each lead must have a `contact_url` or `email` field populated

---

## Step-by-Step Instructions

### Phase 1 — Prepare Outreach Queue

1. **Load lead list** for the given `campaign_id`.

2. **Filter leads** that already have an outreach attempt recorded (skip re-outreach):
   ```
   FOR each lead IN leads:
       IF lead.outreach_attempted == true:
           SKIP
       ELSE:
           ADD to outreach_queue
   ```

3. **Cap the queue** to `max_outreach_per_run` to respect rate limits:
   ```
   outreach_queue = outreach_queue[:max_outreach_per_run]
   ```

4. **Load message template** by `template_id`:
   ```
   template = loadTemplate(template_id)
   ```

### Phase 2 — Personalize and Compose

For each lead in the outreach queue:

5. **Build personalization context** from the lead object:
   ```javascript
   context = {
     company_name: lead.company_name,
     location: lead.location,
     rating: lead.rating,
     tier: lead.tier,
     category: lead.category,       // from sourcing campaign
     product_interest: lead.category,
     verification_status: lead.verified ? "Verified Supplier" : "Supplier",
     response_rate: lead.response_rate || "high",
     first_contact_date: current_date
   }
   ```

6. **Render template** by substituting all `{{variable}}` placeholders with context values:
   - If a variable is missing in context, use a fallback (e.g., `"there"` for `first_name`)
   - Subject line and body both support template variables

7. **Review composed message** for completeness:
   - No `{{unresolved}}` placeholders remaining
   - Subject line is non-empty
   - Body is at least 50 characters

8. **Add tracking parameters** to any links in the message body (UTM or platform tracking ID).

### Phase 3 — Send Message

9. **Dispatch via selected channel:**

   **Platform messaging (default):**
   ```
   browser.navigate → lead.contact_url
   browser.wait_for_selector → ".contact-form, #send-message"
   browser.click → "#compose-message"
   browser.fill → "#message-subject", rendered_subject
   browser.fill → "#message-body", rendered_body
   browser.click → "#send-message"
   browser.wait_for_selector → ".message-sent, .success-toast"
   ```

   **Email (via configured email integration):**
   ```
   email.send → {
     to: lead.email,
     subject: rendered_subject,
     body: rendered_body,
     campaign_id: campaign_id,
     lead_id: lead.company_name
   }
   ```

10. **Record the send event:**
    ```json
    {
      "lead_id": "string",
      "company_name": "string",
      "channel": "platform_message | email",
      "sent_at": "ISO8601 timestamp",
      "template_id": "string",
      "subject_preview": "string (first 80 chars)",
      "message_id": "string (from platform or email provider)"
    }
    ```

11. **Schedule follow-up** if `follow_up_enabled == true`:
    ```
    schedule_event → {
      type: "follow_up",
      lead_id: lead.company_name,
      send_at: current_date + follow_up_delay_days * 86400,
      template_id: follow_up_template_id,
      original_message_id: message_id
    }
    ```

### Phase 4 — Report

12. **After processing the queue**, output a summary:
    ```json
    {
      "campaign_id": "string",
      "outreach_id": "string",
      "sent_at": "ISO8601 timestamp",
      "total_attempted": "number",
      "platform_messages": "number",
      "emails": "number",
      "failed": "number",
      "follow_ups_scheduled": "number",
      "failed_leads": [
        {
          "company_name": "string",
          "reason": "string"
        }
      ]
    }
    ```

---

## Tools Used

| Tool | Purpose |
|------|---------|
| `browser.navigate` | Navigate to contact form on platform |
| `browser.wait_for_selector` | Wait for form elements to appear |
| `browser.click` | Trigger message compose, send |
| `browser.fill` | Fill subject and body fields |
| `browser.evaluate` | Read confirmation element after send |
| `email.send` | Dispatch email via configured provider |
| `schedule_event` | Create a delayed follow-up task |

---

## Decision Logic

```
FOR each lead IN outreach_queue:
    IF lead.contact_url is empty AND lead.email is empty:
        SKIP and record as "no contact method available"

    IF outreach_channel == "both":
        TRY platform_message first
        IF platform fails, FALL BACK to email

    IF send fails after 2 retries:
        RECORD as failed with reason
        CONTINUE to next lead

    IF rate_limit_approaching (detected via 429 response):
        PAUSE for 60 seconds
        RESUME
```

---

## Error Handling

| Error | Recovery |
|-------|----------|
| Send button not found (platform change) | Retry with longer wait (10s); if still failing, switch to email fallback |
| Email delivery failure | Log error, mark lead as failed; do not block remaining queue |
| Rate limit (429 or captcha) | Pause 60s, retry; after 3 rate limits in a run, pause remaining queue |
| Session expired mid-campaign | Re-run `login`, resume from next un-sent lead |
| Template variable unresolved | Use fallback value; log warning; do not abort send |
| Invalid email address | Skip lead, record as failed, continue queue |

---

## Example Input

```yaml
trigger: "run outreach for lead-sourcing-2026-05-17-001"
campaign_id: "lead-sourcing-2026-05-17-001"
leads:
  - company_name: "Shenzhen TechNova Electronics"
    contact_url: "https://eurasan.example.com/supplier/shenzhen-technova/contact"
    email: null
    tier: "hot"
    category: "electronic-components"
    rating: 4.8
    verified: true
  - company_name: "Korea Components Ltd"
    contact_url: "https://eurasan.example.com/supplier/korea-components/contact"
    email: "procurement@koreacomponents.kr"
    tier: "warm"
    category: "electronic-components"
    rating: 4.2
    verified: true
outreach_channel: "platform_message"
template_id: "first-contact-hot-lead"
follow_up_enabled: true
follow_up_delay_days: 3
max_outreach_per_run: 20
```

## Example Output

```json
{
  "campaign_id": "lead-sourcing-2026-05-17-001",
  "outreach_id": "outreach-2026-05-17-001",
  "sent_at": "2026-05-17T14:30:00Z",
  "total_attempted": 2,
  "platform_messages": 2,
  "emails": 0,
  "failed": 0,
  "follow_ups_scheduled": 2,
  "failed_leads": []
}
```

---

## Social Media Outreach

**Agent Role:** Social

The social outreach extension complements platform messaging by extending the outreach campaign to social media channels where the supplier or buyer has a public presence.

### Step-by-Step Instructions

1. **For each lead in the outreach queue**, check if a social media handle is available:
   - Look for `social_handles.linkedin`, `social_handles.twitter` in the lead object
   - If not present, attempt to scrape from the supplier's profile page:
     ```
     browser.navigate → lead.profile_url
     browser.wait_for_selector → ".social-links, [data-social]"
     browser.evaluate → extract social handle URLs
     ```

2. **LinkedIn outreach** (if handle present):
   ```
   browser.navigate → "https://linkedin.com/company/[company-id]"
   browser.wait_for_selector → ".org-page, [data-test-id]"
   browser.click → "#follow-company"
   browser.click → "#message-company"
   browser.fill → "#compose-message", social_template.render(lead)
   browser.click → "#send"
   ```
   Record follow action and message send in the same format as platform outreach.

3. **Twitter/X outreach** (if handle present):
   ```
   browser.navigate → "https://twitter.com/[handle]"
   browser.click → "#message-dm"
   browser.fill → "#dm-input", social_template.render_dm(lead)
   browser.click → "#send-dm"
   ```

4. **Record all social outreach attempts** in the send log:
   ```json
   {
     "platform": "linkedin|twitter",
     "handle": "string",
     "sent_at": "ISO8601",
     "message_id": "string",
     "campaign_id": "string",
     "lead_id": "string"
   }
   ```

5. **Aggregate social results** into the final outreach report:
   - Add `social_messages_sent` count
   - Add `social_failed` count
   - Include failed social attempts in `failed_leads` list

### Social Template Variables

| Variable | Source | Fallback |
|----------|--------|----------|
| `{{company_name}}` | lead.company_name | "the team" |
| `{{product_category}}` | lead.category | "your product category" |
| `{{platform_name}}` | static "Eurasan" | — |
| `{{custom_opening}}` | lead.tier → hot="We've been impressed by", warm="We noticed", cool="We're exploring" | "We wanted to reach out" |

### Decision Logic (Social)

```
FOR each lead IN outreach_queue:
    IF social_handles not available:
        SKIP (do not block platform/email outreach)

    IF platform == "linkedin":
        IF account cannot send company messages:
            SKIP, log as "linkedin_no_permission"

    IF platform == "twitter":
        IF account DMs are restricted:
            SKIP, log as "twitter_dms_restricted"

    IF rate limit on social platform:
        PAUSE for 5 minutes
        RETRY once; if still failing, SKIP and log
```

### Error Handling (Social)

| Error | Recovery |
|-------|----------|
| Social link not found on profile | Skip that platform; continue with other channels |
| LinkedIn company page not found | Log as `linkedin_404`; skip |
| DM rate limit | Pause 5 minutes, retry once; skip if still failing |
| Cannot send company message (LinkedIn permissions) | Log and skip; do not block outreach |
| Social handle scraped as personal instead of company | Attempt to validate; if personal, skip to avoid violation |

---

*Last updated: 2026-05-17*