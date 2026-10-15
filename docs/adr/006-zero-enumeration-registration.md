# ADR 006: Zero-Enumeration User Registration Policy

## Status

Accepted

## Context

Standard registration endpoints commonly return `409 Conflict: An account with this email address already exists` when a duplicate email is provided. This allows malicious actors to systematically enumerate whether high-profile targets or specific individuals are registered students on the platform, violating user privacy.

## Decision

We enforce a strict **Zero-Enumeration Registration Architecture**:

1. When `POST /api/v1/auth/register` receives an email that already exists in the database:
   - The API **does not** return an error or reveal the collision.
   - It **does not** create a duplicate account or overwrite the existing account.
   - It returns the identical success message returned for a new account:
     `{"success": true, "data": {"message": "If this email is not already registered, a verification link has been sent. Please check your inbox."}}`
   - It asynchronously dispatches an `Account Registration Attempt` notification email to the verified owner of the account via the transactional queue, warning them that someone attempted to register with their email address, providing direct links to log in or reset their password.
   - An internal security audit log (`USER_REGISTER`) records the attempt.
2. New account registrations return the exact same generic message, ensuring identical response payloads, status codes (`201 Created` or `200 OK`), and timing characteristics.

## Consequences

- **Positive**: Complete defense against email enumeration and credential harvesting via registration.
- **Positive**: Existing users are alerted in real time if an attacker attempts to register their identity.
- **Negative**: Legitimate users who forgot they already had an account will need to check their inbox to discover that an account already exists and should log in rather than register.
