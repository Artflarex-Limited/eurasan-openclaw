# Eurasan Login Workflow

Authenticate with the Eurasan B2B Marketplace platform and establish an authenticated session.

## Workflow File

`examples/login.sf`

## Description

The Login workflow handles browser-based authentication with the Eurasan platform. It supports standard username/password login and optional 2FA (MFA) code entry when multi-factor authentication is enabled on the account.

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `username` | string | Yes | Eurasan account username |
| `password` | string | Yes | Account password |
| `mfa_code` | string | No | 2FA code if MFA is enabled on the account |

## Steps

### 1. navigate_to_login
Navigates the browser to the Eurasan login page.

```yaml
- name: navigate_to_login
  action: browser.navigate
  args:
    url: ${{ EURASAN_WEB_URL }}/login
```

### 2. enter_username
Fills the username field on the login form.

```yaml
- name: enter_username
  action: browser.fill
  args:
    selector: "#username"
    value: ${{ parameters.username }}
```

### 3. enter_password
Fills the password field on the login form.

```yaml
- name: enter_password
  action: browser.fill
  args:
    selector: "#password"
    value: ${{ parameters.password }}
```

### 4. submit_login
Clicks the submit button to attempt authentication.

```yaml
- name: submit_login
  action: browser.click
  args:
    selector: "button[type=submit]"
```

### 5. handle_mfa (conditional)
If an `mfa_code` parameter was provided, enters the 2FA code and submits.

```yaml
- name: handle_mfa
  if: ${{ parameters.mfa_code }}
  steps:
    - name: enter_mfa
      action: browser.fill
      args:
        selector: "#mfa-code"
        value: ${{ parameters.mfa_code }}

    - name: submit_mfa
      action: browser.click
      args:
        selector: "button[type=submit]"
```

### 6. verify_login
Waits for the browser URL to match the dashboard pattern, confirming successful login.

```yaml
- name: verify_login
  action: browser.wait_for_url
  args:
    url_pattern: "**/dashboard/**"
```

### 7. extract_token
Extracts the authentication token from browser sessionStorage.

```yaml
- name: extract_token
  action: browser.evaluate
  args:
    expression: |
      () => {
        const token = sessionStorage.getItem('auth_token');
        return token;
      }
```

## Output

| Field | Description |
|-------|-------------|
| `token` | Authentication token from sessionStorage |
| `session_expiry` | Timestamp when login was verified |

## Error Handling

| Error | Max Retries | Backoff | Action |
|-------|-------------|---------|--------|
| `AuthError` | 3 | Exponential | Raise error after all retries exhausted |

### on_auth_error
Raised when credentials are invalid. The workflow retries up to 3 times with exponential backoff before raising `AuthError` with message "Invalid username or password".

### on_mfa_error
Raised when the 2FA code is invalid. Raises `MFAError` with message "Invalid 2FA code".

### on_network_error
On network timeout, retries up to 3 times with exponential backoff.

## State Management

- **Auth token**: Stored in `$EURASAN_TOKEN`
- **Session expiry**: Stored in `$EURASAN_SESSION_EXPIRY`
- Session should be refreshed before expiry

## Usage Example

### Basic Login
```bash
openclaw run examples/login.sf --env .env \
  --param username=jdoe@example.com \
  --param password=secretpassword
```

### Login with MFA
```bash
openclaw run examples/login.sf --env .env \
  --param username=jdoe@example.com \
  --param password=secretpassword \
  --param mfa_code=123456
```

## Browser Configuration

The workflow uses the following browser settings:

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

## Sequence Diagram

```
┌─────────┐     ┌──────────────┐     ┌───────────┐     ┌────────────┐
│  Agent  │────▶│ navigate_to  │────▶│ enter_    │────▶│  enter_    │
│         │     │ login        │     │ username  │     │  password  │
└─────────┘     └──────────────┘     └───────────┘     └─────┬──────┘
                                                             │
                                                       ┌─────▼──────┐
                                                       │  submit_   │
                                                       │  login     │
                                                       └─────┬──────┘
                                                             │
                                        ┌────────────────────┼────────────────────┐
                                        │                    │                    │
                                  ┌─────▼──────┐    ┌──────▼───────┐    ┌───────▼────────┐
                                  │ no MFA     │    │ MFA provided │    │ verify_login   │
                                  │ provided   │    │              │    │ (wait for      │
                                  │            │    │ ┌──────────┐ │    │  dashboard URL)│
                                  │            │    │ │handle_mfa│ │    │                │
                                  │            │    │ └──────────┘ │    └──────┬─────────┘
                                  └────────────┘    └──────────────┘           │
                                                                            ┌──▼──────────┐
                                                                            │ extract_token│
                                                                            │ from session │
                                                                            └─────────────┘
```

## Notes

- The workflow uses `sessionStorage` to retrieve the auth token. The actual key name may vary based on Eurasan platform implementation.
- If the account has MFA enabled and no `mfa_code` is provided, the workflow will fail after the submit step.
- The `verify_login` step uses a glob pattern match on the URL to detect successful navigation to the dashboard.