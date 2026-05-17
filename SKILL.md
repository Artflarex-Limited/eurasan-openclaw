# Eurasan OpenClaw Skill

Browser automation skill for the Eurasan B2B Marketplace using OpenClaw.

## Agent Instructions

You are an AI agent automating workflows on the Eurasan B2B Marketplace platform via browser. Your role is to execute buyer-side operations: browsing products, creating RFQs, and tracking orders.

## Capabilities

- **Authenticated browsing**: Login to Eurasan with credentials
- **Product discovery**: Navigate categories, search products
- **RFQ creation**: Multi-step RFQ form with product selection and specifications
- **Order tracking**: Query order status by confirmation number
- **Error recovery**: Automatic retry with exponential backoff on failures

## Workflow Definitions

### `login`

Authenticate with Eurasan platform.

**Parameters:**
- `username`: Eurasia account username
- `password`: Account password
- `mfa_code`: Optional 2FA code if MFA is enabled

**Steps:**
1. Navigate to login page
2. Enter username and password
3. Submit form
4. If MFA required, enter 2FA code
5. Verify successful login by checking dashboard URL
6. Return session token

**Error recovery:**
- On invalid credentials: raise `AuthError` with message "Invalid username or password"
- On MFA failure: raise `MFAError` with message "Invalid 2FA code"
- On network timeout: retry up to 3 times with exponential backoff

---

### `create_rfq`

Create a Request for Quotation on Eurasan.

**Parameters:**
- `products`: Array of product objects with `name`, `quantity`, `unit`
- `specifications`: Optional string with detailed requirements
- `deadline`: Optional delivery deadline
- `notes`: Optional additional notes for suppliers

**Steps:**
1. Navigate to RFQ creation form
2. For each product in `products`, add line item
3. Fill in specifications if provided
4. Set deadline if provided
5. Add notes if provided
6. Review RFQ summary
7. Submit RFQ
8. Capture confirmation number from success page
9. Return confirmation number and estimated response time

**Error recovery:**
- On form validation error: re-fetch form, repopulate fields, retry
- On session timeout: re-authenticate and restart RFQ flow
- On submission failure: retry up to 2 times, then raise `RFQError`

---

### `track_order`

Track order status by confirmation number.

**Parameters:**
- `confirmation_number`: The RFQ or order confirmation number

**Steps:**
1. Navigate to orders dashboard
2. Enter confirmation number in search
3. Extract order status, timeline, and details
4. Return status object with fields: `status`, `timeline`, `items`, `supplier`

**Error recovery:**
- On order not found: raise `OrderNotFoundError`
- On search timeout: retry with longer wait

---

## State Management

**Session state:**
- Store auth token in `$EURASAN_TOKEN`
- Store session expiry in `$EURASAN_SESSION_EXPIRY`
- Refresh token before expiry

**Workflow state:**
- Each workflow maintains state in `$WORKFLOW_CONTEXT`
- Resume from last checkpoint on failure

## Browser Configuration

```yaml
browser:
  type: chromium
  headless: true
  viewport:
    width: 1280
    height: 720
  timeout: 30000

navigator:
  user_agent: Mozilla/5.0 (compatible; EurasanBot/1.0)
  locale: en-US
```

## Platform Compatibility

Tested with:
- Eurasan Web v2.4+
- OpenClaw Agent Runtime v1.0+

## Error Codes

| Code | Description |
|------|-------------|
| `AuthError` | Authentication failed |
| `MFAError` | Multi-factor authentication failed |
| `SessionError` | Session expired or invalid |
| `RFQError` | RFQ creation failed |
| `OrderNotFoundError` | Order confirmation number not found |
| `NetworkError` | Network request failed after retries |