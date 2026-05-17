# Eurasan OpenClaw Integration

OpenClaw-compatible browser automation workflows for the Eurasan B2B Marketplace.

## Overview

This repository provides OpenClaw skill files, example agent scripts, and test suites for automating interactions with the Eurasan platform via browser.

**Eurasan source code remains proprietary.** This repository contains only the OpenClaw wrapper layer, documentation, and example agents.

## What is OpenClaw?

OpenClaw is an open standard for AI agent browser automation. Agents use OpenClaw skills to execute multi-step workflows in a browser environment with built-in error recovery, state management, and retry logic.

## Quick Start

### Prerequisites

- OpenClaw-compatible agent runtime
- Chromium-based browser
- Valid Eurasan account credentials

### Installation

```bash
git clone https://github.com/artflarex/eurasan-openclaw.git
cd eurasan-openclaw
```

### Configuration

Copy `.env.example` to `.env` and configure your credentials:

```bash
cp .env.example .env
```

### Run an Example Workflow

```bash
openclaw run examples/rfq-creation.sf --env .env
```

## Repository Structure

```
eurasan-openclaw/
├── OPENCLAW.md           # This file
├── SKILL.md              # OpenClaw skill definition for Eurasan
├── LICENSE               # MIT License
├── .env.example          # Environment variable template
├── examples/
│   ├── rfq-creation.sf   # RFQ creation workflow example
│   ├── order-tracking.sf  # Order tracking workflow example
│   └── login.sf           # Authentication workflow example
├── tests/
│   ├── rfq.test.js         # RFQ workflow tests
│   ├── order.test.js       # Order workflow tests
│   └── auth.test.js        # Auth tests
└── scripts/
    └── setup.sh            # Environment setup script
```

## Workflows

### Login Flow

1. Navigate to Eurasan login page
2. Enter credentials
3. Handle 2FA if enabled
4. Verify session state
5. Store auth token

### RFQ Creation Flow

1. Navigate to RFQ form
2. Fill in product requirements
3. Attach specifications (optional)
4. Submit RFQ
5. Capture confirmation number

### Order Tracking Flow

1. Navigate to orders dashboard
2. Search by order ID or confirmation number
3. Extract current status
4. Return status with timeline

## Error Handling

Each workflow includes retry logic and error recovery:

- **Network failures**: Automatic retry with exponential backoff (max 3 attempts)
- **Session timeout**: Re-authenticate and resume
- **Form validation errors**: Re-fetch form state and retry submission
- **Rate limiting**: Wait and retry with backoff

## Testing

```bash
# Run all tests
npm test

# Run specific test suite
npm test -- --grep "RFQ"

# Run with browser visible
npm test -- --headed
```

## Security Considerations

- Never commit `.env` files with real credentials
- Use environment variables for all secrets
- Rotate credentials regularly
- Implement least-privilege access for automation accounts

## License

MIT License. See [LICENSE](LICENSE) for details.

## Support

For issues related to this OpenClaw integration, open a GitHub issue.
For Eurasan platform issues, contact Eurasan support directly.