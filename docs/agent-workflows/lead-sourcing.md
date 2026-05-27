# Lead-Sourcing Agent Workflow

## Overview

The lead-sourcing agent is responsible for identifying, gathering, qualifying, and prioritizing potential customers (leads) for Artflarex Solutions. It operates as part of the Artflarex OpenClaw agent fleet and feeds its output into downstream agents such as `sales`, `email`, `cmo`, and `ads`.

---

## Triggering

The lead-sourcing agent is triggered in three ways:

### 1. Scheduled / Recurring
- Configured via cron on a defined cadence (e.g., daily at 08:00 Istanbul time, or weekly on Monday mornings)
- The orchestrator spawns this agent automatically on schedule

### 2. On-Demand Request from Orchestrator
- The parent orchestrator receives a request from Mustafa or another agent and spawns the lead-sourcing agent directly via `sessions_spawn`
- Task is passed as a structured prompt describing the target market, geography, industry, or lead criteria

### 3. Campaign-Driven
- Triggered when a new marketing or sales campaign is launched by `cmo`, `ads`, or `growth`
- The triggering agent provides campaign context: target audience, geo, product focus, budget tier

---

## Data Sources

The agent searches and scrapes the following types of sources:

### Public Directories & Databases
- **LinkedIn** — company pages, employee counts, industry tags, job postings
- **Google Maps / Google Business** — businesses by category and location
- **Yellow Pages / local directories** — SMB listings by region
- **Trade registries / company registries** — business registration data where publicly accessible
- **Industry associations directories** — curated B2B contact lists

### Web Search
- Keyword-driven searches targeting decision-makers (e.g., "ERP manager at [company]", "CFO [industry] Turkey")
- Search for recent news about target companies (funding, expansion, leadership changes) to surface buying intent signals
- Competitor comparisons pages to find companies currently using competing products

### CRM & Existing Data (if accessible)
- Internal CRM or database of past leads/opportunities (if Artflarex has an existing CRM instance)
- Customer referral lists
- Event attendance lists from trade shows or webinars

### Job Portals
- Sites like Indeed, LinkedIn Jobs, Glassdoor — companies actively hiring in relevant tech areas signal digital transformation intent
- Keywords: "ERP", "SAP", "Microsoft Dynamics", "AI implementation", "digital transformation"

### Social Media
- Twitter/X, Instagram, Facebook business pages — engagement patterns and follower counts
- Reddit communities (r/msp, r/SaaS, r/ERP) — posts asking for recommendations

---

## Qualification & Prioritization Framework

Not every contact is a lead worth pursuing. The agent applies a **tiered qualification model** inspired by BANT + modern intent signals:

### 1. Fit Score (1–5)
- **Industry fit**: Does the company operate in a target vertical (manufacturing, retail, logistics, finance)?
- **Size fit**: Employee count and revenue align with Artflarex's ideal customer profile
- **Tech fit**: Does the company already use relevant tech (ERP, CRM, cloud infrastructure)?
- **Geography**: Based in Turkey, MENA, or EU (relevant to Artflarex's delivery capability)?

### 2. Intent Score (1–5)
- Recent job postings for relevant tech roles
- News about expansion, digitization initiatives, or funding
- Online discussions about problems Artflarex solves
- Downloaded related content or visited pricing pages

### 3. Contact Quality (1–5)
- Named decision-maker or influencer identified (CEO, CTO, CFO, Operations Manager)
- Functional email address found (not generic info@)
- LinkedIn profile exists with accurate current info

### Priority Score = Fit × Intent × Contact

Leads are bucketed:
- **P0 (Hot)** — Score ≥ 4.0 → immediate outreach via email + social
- **P1 (Warm)** — Score 2.5–3.9 → nurture sequence, retargeting ads
- **P2 (Cold)** — Score < 2.5 → catalog for future campaigns, SEO content targeting

---

## Output Format

The agent produces a structured output file (JSON or Markdown) saved to a shared workspace location, typically:

```
/root/eurasan-openclaw/output/leads/YYYY-MM-DD-leads.md
```

### Output Schema

```markdown
## Lead Report — [Date] — [Campaign/Source]

### Summary
- Total leads identified: N
- P0 (Hot): N | P1 (Warm): N | P2 (Cold): N
- Top industries: ...
- Top geographies: ...

### P0 Leads (immediate action)

| Company | Industry | Size | Key Contact | Title | Email | Intent Signals | Score |
|---------|----------|------|-------------|-------|-------|---------------|-------|
| ...     | ...      | ...  | ...         | ...   | ...   | ...           | ...   |

### P1 Leads (nurture)

[Same table structure]

### P2 Leads (future)

[Same table structure]

### Raw Data / Notes
- Source links for each lead
- Search queries used
- Filtering criteria applied
- Any data quality issues noted
```

---

## Integration with Other Agents

```
                    ┌──────────────┐
                    │ Orchestrator │
                    └──────┬───────┘
                           │ spawn
           ┌───────────────┴────────────────┐
           ▼                                ▼
  ┌────────────────┐              ┌─────────────────┐
  │ Lead-Sourcing  │              │   (other agent) │
  │    Agent       │              └─────────────────┘
  └───────┬────────┘
          │ output file
          ▼
  ┌────────────────┐
  │  Email Agent   │ ← receives P0 leads, initiates cold outreach
  └───────┬────────┘
          │ open opportunities
          ▼
  ┌────────────────┐
  │   CRM/Sales    │ ← logs leads, tracks pipeline
  └────────────────┘

  Parallel / async:
  ┌────────────────┐
  │   Ads Agent    │ ← receives P1 leads → targeted ad campaigns
  └────────────────┘

  ┌────────────────┐
  │  Social Agent  │ ← receives P0 leads → LinkedIn outreach
  └────────────────┘

  ┌────────────────┐
  │  CMO / Growth  │ ← receives summary → strategic campaign input
  └────────────────┘
```

### Handoff Protocol
1. Lead-sourcing agent completes its run and writes output to `/root/eurasan-openclaw/output/leads/`
2. Agent notifies orchestrator with a brief summary (lead count, tier distribution)
3. Orchestrator spawns downstream agents as needed:
   - `email` agent → P0 leads for immediate outreach
   - `ads` agent → P1 leads for retargeting
   - `social` agent → P0 leads for LinkedIn warm outreach
   - `cmo` / `growth` → full report for campaign planning
4. Each downstream agent acknowledges receipt and begins its workflow

---

## Configuration & Tuning

The agent respects the following configurable parameters (passed at spawn time):

| Parameter | Description | Default |
|-----------|-------------|---------|
| `target_industry` | Comma-separated industry list | Manufacturing, Retail, Logistics, Finance |
| `target_geo` | Geographic focus | Turkey, MENA, EU |
| `min_company_size` | Minimum employee count | 50 |
| `lead_volume_cap` | Max leads per run | 200 |
| `campaign_context` | Any specific campaign theme or product focus | General |
| `output_format` | `markdown` or `json` | markdown |

---

## Quality & Safety Rules

- **No spam**: Only collect publicly available business contact information; no scraping of private systems
- **GDPR / KVKK compliance**: Do not store or process personal data beyond what is publicly listed; do not pass private residential contact info downstream
- **Rate limiting**: Respectful crawling behavior — no aggressive scraping; use search APIs where available
- **No fabrication**: All contact details must be found through legitimate sources; do not invent names, emails, or titles
- **Data retention**: Raw lead data is transient — passed to downstream agents and not stored long-term in this agent's session

---

## Version History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-05-17 | Lead-Sourcing Agent (subagent) | Initial draft |

---

_Last updated: 2026-05-17_