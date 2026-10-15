# ADR 007: Brute-Force Lockout Strategy and Denial-of-Service (DoS) Tradeoff

## Status

Accepted

## Context

When designing brute-force defense for authentication endpoints, there is an inherent architectural tension between preventing credential-guessing attacks and preventing Denial-of-Service (Lockout DoS):

- **Email-Only Lockout**: Locking an account after $N$ failed attempts across all requests allows an attacker to intentionally lock out legitimate users by submitting $N$ failed attempts for their known email address from anywhere in the world.
- **IP-Only Lockout**: Locking an IP address allows distributed botnets (utilizing residential proxy pools) to perform vertical credential stuffing against a single target email without any single IP reaching the threshold.

## Decision

We implement a **Composite Defense-in-Depth Lockout Architecture**:

1. **Composite Key (`lockout:target:${email}:${ip}`)**:
   - Tracks failed attempts for a specific email from a specific IP.
   - Threshold: **5 failed attempts within 15 minutes**.
   - Result: Locks out _only that specific IP_ from attempting _that specific email_.
   - **Tradeoff Resolution**: An attacker attempting to brute-force a victim's account will only lock out their own IP address; the legitimate user logging in from their home or office IP remains completely unaffected.
2. **Global IP Threshold (`lockout:ip:${ip}`)**:
   - Tracks failed attempts from an IP address across _all_ accounts.
   - Threshold: **20 failed attempts within 15 minutes**.
   - Result: Blocks the IP address from making any authentication requests for 15 minutes.
   - **Tradeoff Resolution**: Prevents an attacker from rotating through thousands of usernames from a single machine or proxy.
3. **Argon2id Concurrency Semaphore**:
   - Argon2id consumes 64 MiB RAM and intensive CPU per verification.
   - An in-process concurrency cap limits simultaneous hashing operations to **4 concurrent workers** (with a waiting queue capped at 32).
   - If the queue exceeds capacity, the system returns `503 Service Unavailable`, protecting server memory and worker event loops from starvation.

## Consequences

- **Positive**: Eliminates targeted Lockout DoS attacks against legitimate platform users.
- **Positive**: Protects server memory and CPU against resource-exhaustion DDoS attacks.
- **Negative**: Distributed botnets with millions of unique IPs could still attempt 1-2 guesses per IP over long periods; this is mitigated by Argon2id's computational cost and Cloudflare Turnstile bot detection at the edge.
