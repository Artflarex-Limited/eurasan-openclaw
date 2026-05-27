# Eurasan OpenClaw Integration

OpenClaw-compatible browser automation for the [Eurasan B2B Marketplace](https://www.eurasan.com).

This repository provides OpenClaw skill files, example agent workflows, and test suites for automating buyer-side operations on the Eurasan platform — authentication, RFQ creation, and order tracking — with built-in error recovery, state management, and retry logic.

> **Eurasan source code remains proprietary.** This repository contains only the OpenClaw wrapper layer, documentation, and example agents.

---

## Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Quick Start](#quick-start)
- [Repository Structure](#repository-structure)
- [Workflows](#workflows)
  - [Login](#login)
  - [RFQ Creation](#rfq-creation)
  - [Order Tracking](#order-tracking)
- [Agent Workflows](#agent-workflows)
- [Error Handling](#error-handling)
- [Available Scripts](#available-scripts)
- [Testing](#testing)
- [Security Considerations](#security-considerations)
- [License](#license)

---

## Overview

Eurasan is a B2B marketplace for industrial products and services. This OpenClaw integration allows AI agents to:

- **Login** to the Eurasan platform and manage authenticated sessions
- **Create RFQs** (Requests for Quotation) with product line items, specifications, and deadlines
- **Track orders** by confirmation number, retrieving status, timeline, items, and supplier info

All workflows include automatic retry with exponential backoff, session recovery, and form validation handling.

---

## Prerequisites

- **OpenClaw agent runtime** (v1.0+) — [openclaw.io](https://openclaw.io)
- **Node.js** ≥ 18.0.0
- **Chromium-based browser** (Playwright manages this)
- A valid **Eurasan account** with buyer access

---

## Installation

```bash
git clone https://github.com/artflarex/eurasan-openclaw.git
cd eurasan-openclaw
npm install
```

The `setup.sh` script can be run to scaffold the environment:

```bash
bash scripts/setup.sh
```

---

## Configuration

Copy the example environment file and fill in your credentials:

```bash
cp .env.example .env
```

Then edit `.env` with your values:

| Variable | Description | Required |
|---|---|---|
| `EURASAN_USERNAME` | Your Eurasan account username | ✅ |
| `EURASAN_PASSWORD` | Your account password | ✅ |
| `EURASAN_API_URL` | Eurasan API base URL | ✅ |
| `EURASAN_WEB_URL` | Eurasan web app base URL | ✅ |
| `EURASAN_MFA_SECRET` | MFA secret (if MFA enabled) | Optional |
| `EURASAN_SESSION_TIMEOUT` | Session lifetime in seconds (default: `3600`) | Optional |
| `OPENCLAW_RUNTIME_URL` | OpenClaw runtime address (default: `http://localhost:8080`) | Optional |
| `OPENCLAW_BROWSER_HEADLESS` | Run browser headless (default: `true`) | Optional |
| `LOG_LEVEL` | Logging level: `debug`, `info`, `warn`, `error` | Optional |
| `LOG_FILE` | Log file path (default: `./logs/eurasan.log`) | Optional |

---

## Quick Start

### Authenticate and get a session token

```bash
openclaw run examples/login.sf --env .env \
  --param username=your_user \
  --param password=your_pass
```

### Create an RFQ

```bash
openclaw run examples/rfq-creation.sf --env .env \
  --param products='[{"name":"Steel Pipes","quantity":500,"unit":"tons"},{"name":"Valves","quantity":200,"unit":"pcs"}]' \
  --param specifications='API 5L Grade B, seamless' \
  --param deadline='2026-08-01'
```

### Track an order

```bash
openclaw run examples/order-tracking.sf --env .env \
  --param confirmation_number=RFQ-2025-12345
```

---

## Repository Structure

```
eurasan-openclaw/
├── OPENCLAW.md              # Project overview & quick start
├── SKILL.md                 # OpenClaw skill definition (agent instructions)
├── README.md                # This file
├── LICENSE                  # MIT License
├── package.json             # Node.js dependencies & scripts
├── .env.example             # Environment variable template
├── docs/                    # Comprehensive documentation
│   ├── agent-workflows/     # Agent workflow guides
│   │   ├── lead-sourcing.md
│   │   ├── order.md
│   │   ├── outreach.md
│   │   ├── qualification.md
│   │   └── reporting.md
│   ├── login.md             # Login workflow documentation
│   ├── rfq-creation.md       # RFQ creation documentation
│   └── order-tracking.md     # Order tracking documentation
├── examples/                # OpenClaw skill files
│   ├── login.sf             # Login workflow
│   ├── rfq-creation.sf       # RFQ creation workflow
│   └── order-tracking.sf     # Order tracking workflow
├── scripts/
│   └── setup.sh             # Environment setup helper
└── tests/
    ├── auth.test.js         # Login workflow tests
    ├── rfq.test.js          # RFQ workflow tests
    └── order.test.js        # Order tracking tests
```

---

## Workflows

### Login

Authenticates with the Eurasan platform and establishes a session.

**Parameters:**

| Parameter | Type | Required | Description |
|---|---|---|---|
| `username` | `string` | ✅ | Eurasan account username |
| `password` | `string` | ✅ | Account password |
| `mfa_code` | `string` | ❌ | 2FA code (if MFA is enabled on the account) |

**Steps:**
1. Navigate to `/login`
2. Fill `#username` and `#password`
3. Click `button[type=submit]`
4. If MFA is enabled, enter the 2FA code (`#mfa-code`)
5. Wait for navigation to `/dashboard/**`
6. Extract `auth_token` from `sessionStorage`
7. Return token and session expiry

**Error codes:** `AuthError`, `MFAError`, `NetworkError`

**Documentation:** [docs/login.md](docs/login.md)

---

### RFQ Creation

Creates a Request for Quotation on the Eurasan B2B Marketplace.

**Parameters:**

| Parameter | Type | Required | Description |
|---|---|---|---|
| `products` | `array` | ✅ | Array of `{name, quantity, unit}` objects |
| `specifications` | `string` | ❌ | Detailed product specs |
| `deadline` | `string` | ❌ | Delivery deadline (`YYYY-MM-DD`) |
| `notes` | `string` | ❌ | Additional notes for suppliers |

**Steps:**
1. Navigate to `/rfq/create`
2. Wait for `#rfq-form`
3. For each product: click `#add-product-btn`, fill `#product-name`, `#product-quantity`, `#product-unit`
4. Fill `#specifications` if provided
5. Fill `#deadline` if provided
6. Fill `#notes` if provided
7. Click `#submit-rfq`
8. Wait for `.confirmation-number`
9. Extract and return the confirmation number

**Error codes:** `RFQError`, `SessionError`, `NetworkError`

**Documentation:** [docs/rfq-creation.md](docs/rfq-creation.md)

---

### Order Tracking

Retrieves order status by RFQ or order confirmation number.

**Parameters:**

| Parameter | Type | Required | Description |
|---|---|---|---|
| `confirmation_number` | `string` | ✅ | RFQ or order confirmation number |

**Steps:**
1. Navigate to `/orders`
2. Fill `#order-search` with the confirmation number
3. Click `#search-btn`
4. Wait for `.order-result`
5. Extract `status`, `timeline`, `items`, and `supplier` from the DOM
6. Return the status object

**Error codes:** `OrderNotFoundError`, `NetworkError`

**Documentation:** [docs/order-tracking.md](docs/order-tracking.md)

---

## Agent Workflows

For comprehensive agent workflow guides, see the full documentation in `docs/agent-workflows/`:

| Workflow | Description |
|---|---|
| [lead-sourcing.md](docs/agent-workflows/lead-sourcing.md) | Identify and gather potential customers |
| [order.md](docs/agent-workflows/order.md) | Full order lifecycle management |
| [outreach.md](docs/agent-workflows/outreach.md) | Personalized outreach messaging |
| [qualification.md](docs/agent-workflows/qualification.md) | Score and qualify leads |
| [reporting.md](docs/agent-workflows/reporting.md) | Aggregate metrics and reports |

---

## Error Handling

All workflows include automatic error recovery:

| Error | Recovery |
|---|---|
| Network failure | Automatic retry, exponential backoff (max 3 attempts) |
| Session timeout | Re-authenticate and resume from last checkpoint |
| Form validation error | Re-fetch form, repopulate fields, retry |
| Rate limiting | Wait with backoff, then retry |
| Order not found | Retry twice with exponential backoff, then raise `OrderNotFoundError` |
| Auth failure | Retry up to 3 times, then raise `AuthError` |
| MFA failure | Raise `MFAError` immediately (no retry) |

State is persisted between steps so workflows can resume after recoverable failures.

---

## Available Scripts

```bash
# Install dependencies
npm install

# Run all tests
npm test

# Run tests in watch mode (re-runs on file changes)
npm run test:watch

# Run tests with a visible browser window
npm run test:headed

# Run a specific test suite
npm test -- --grep "RFQ"

# Scaffold the environment (.env + logs directory)
bash scripts/setup.sh
```

---

## Testing

Tests are powered by [zunit](https://zunit.io). By default they run headless.

```bash
# All tests
npm test

# Run auth tests only
npm test -- --grep "auth"

# Run with visible browser (for debugging)
npm run test:headed
```

Tests are located in `tests/`:
- `auth.test.js` — Login and session management
- `rfq.test.js` — RFQ creation flow
- `order.test.js` — Order tracking flow

---

## Security Considerations

- **Never commit `.env`** files containing real credentials
- Use environment variables for all secrets — never hardcode them
- Rotate credentials regularly
- Use least-privilege access for automation accounts (buyer role only)
- Store `auth_token` securely; do not log it
- Review `LOG_FILE` permissions to prevent unauthorized access

---

## License

MIT License. See [LICENSE](LICENSE) for details.

Copyright (c) 2025 Artflarex Solutions.