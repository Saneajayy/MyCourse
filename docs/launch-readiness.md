# Launch Readiness Checklist

This document details all pre-launch operational, technical, legal, and infrastructure requirements for the Hydraulic Engineering Course platform prior to public production launch.

---

## Pre-Launch Operational Checklist

| Category           | Item                           | Description                                            |       Status        | Verification / Action Required                                      |
| :----------------- | :----------------------------- | :----------------------------------------------------- | :-----------------: | :------------------------------------------------------------------ |
| **Secrets & Keys** | Production JWT Secret          | Rotate `JWT_ACCESS_SECRET` to random 64-char string    | [x] Ready in config | Ensure generated in production `.env`                               |
| **Secrets & Keys** | Production TOTP Key            | Rotate `TOTP_ENCRYPTION_KEY` to random 32-byte key     | [x] Ready in config | Ensure generated in production `.env`                               |
| **Secrets & Keys** | Database Credentials           | Least-privilege PostgreSQL user with strong password   | [ ] OPEN (Phase 11) | Apply least privilege DB user in Phase 11 deployment                |
| **Secrets & Keys** | Redis Authentication           | Redis password configured and enforced (`requirepass`) | [ ] OPEN (Phase 11) | Enforce Redis password in production Compose/systemd                |
| **Payments**       | Razorpay Live Activation       | Complete Razorpay KYC and activate live account        |      [ ] OPEN       | Swap `rzp_test_...` with live `rzp_live_...` credentials            |
| **Payments**       | Razorpay Webhook Secret        | Configure live webhook endpoint with strong secret     |      [ ] OPEN       | Register `https://api.hydrauliccourse.com/api/v1/webhooks/razorpay` |
| **Streaming**      | Bunny Stream Paid Plan         | Upgrade Bunny account to paid tier with storage        |      [ ] OPEN       | Verify billing and credit balance on Bunny dashboard                |
| **Streaming**      | Bunny Stream CDN Hostname      | Custom video pull zone domain configured               |      [x] Ready      | Domain: `video.hydrauliccourse.com` configured in DNS               |
| **Email**          | Resend Paid / Production Tier  | Domain verification completed and send limits lifted   |      [ ] OPEN       | Verify SPF, DKIM, and DMARC DNS records for domain                  |
| **Email**          | Resend Webhook Secret          | Configure `whsec_...` secret in Resend dashboard       |  [x] Ready in code  | Set in production `.env` upon webhook activation                    |
| **DNS & CDN**      | Cloudflare Proxy & SSL         | Strict SSL mode, Edge Certificates, and HSTS enabled   | [ ] OPEN (Phase 11) | Set Full (Strict) SSL in Cloudflare dashboard                       |
| **DNS & CDN**      | Origin Firewall Rules          | Only Cloudflare IP ranges allowed to connect on 80/443 | [ ] OPEN (Phase 11) | Configure UFW / security group rules on VPS host                    |
| **Backups**        | Automated Postgres Backup      | Daily pg_dump with offsite retention (S3 or R2)        | [ ] OPEN (Phase 11) | Schedule cron backup script with encryption                         |
| **Backups**        | Redis Persistence              | Redis RDB snapshotting enabled                         |      [x] Ready      | Handled in Docker volume configuration                              |
| **Monitoring**     | Health Probes                  | `/healthz` (liveness) and `/readyz` (readiness)        |      [x] Done       | Monitored by container restart and uptime monitor                   |
| **Monitoring**     | Error & Uptime Alerts          | Uptime monitoring (BetterStack / UptimeKuma / Sentry)  | [ ] OPEN (Phase 11) | Hook `/readyz` endpoint to external alerting bot                    |
| **Legal**          | Terms of Service Reviewed      | Legal counsel review of student agreement              |      [ ] OPEN       | Review `/terms` before accepting paid transactions                  |
| **Legal**          | Privacy Policy & Data Handling | GDPR / Indian DPDP compliance review                   |      [ ] OPEN       | Review `/privacy` and student data handling                         |
| **Legal**          | Refund Policy Published        | Strict 7-day refund policy matching Razorpay rules     |      [x] Done       | Published at `/refunds` and linked in checkout                      |
| **Content**        | Course Curriculum & Lessons    | Upload full high-res course videos to Bunny Stream     |      [ ] OPEN       | Replace placeholder/demo videos with final content                  |
| **Content**        | Quiz & Resource Attachments    | Upload PDFs and technical reference materials          |      [ ] OPEN       | Review all lesson attachments                                       |
| **Content**        | Marketing Copy & Proofreading  | Review headline copy, instructor bio, FAQs             |      [ ] OPEN       | Perform final proofreading pass                                     |

---

## Phase 11 Production Infrastructure Requirements

The following requirements must be strictly satisfied during the Phase 11 production deployment rollout:

### 1. Redis Password Authentication (`requirepass`)

- **Requirement:** Redis must never run unauthenticated in staging or production.
- **Specification:** Configure `requirepass <STRONG_64_CHAR_RANDOM_PASSWORD>` in `/etc/redis/redis.conf` or Docker environment.
- **Connection String:** Connect using `REDIS_URL=redis://:<REDIS_PASSWORD>@127.0.0.1:6379/0` (with TLS enabled if cross-host).
- **Verification:** `redis-cli ping` must fail with `(error) NOAUTH Authentication required.` until `AUTH <password>` is supplied.

### 2. Network Isolation (Postgres & Redis Not Reachable from Internet)

- **Requirement:** PostgreSQL (port 5432) and Redis (port 6379) must bind strictly to the loopback interface (`127.0.0.1`) or a private Docker/VPC bridge network.
- **Specification:**
  - PostgreSQL `listen_addresses = '127.0.0.1'` or internal Docker network subnet.
  - Redis `bind 127.0.0.1` and `protected-mode yes`.
  - Host firewall (`ufw` / security groups) must drop any incoming packets on ports 5432 and 6379 from public interfaces (`eth0` / `0.0.0.0/0`).
- **Verification:** An external port scan (e.g. `nmap -p 5432,6379 <PUBLIC_SERVER_IP>`) must report ports as `FILTERED` or `CLOSED`.

### 3. Least-Privilege Database User for Application Runtime

- **Requirement:** The web/API application must never connect using the `postgres` superuser or migration owner.
- **Specification:**
  - Create two separate database roles:
    1. **Migration Owner Role (`course_migration`):** Has `SUPERUSER` or `CREATEROLE` + `CREATE` on schema `public` for running `prisma migrate deploy`.
    2. **Runtime Application Role (`course_app`):** Only granted `SELECT, INSERT, UPDATE, DELETE` on existing tables and `USAGE, SELECT` on sequences. Explicitly revoked from `DROP`, `ALTER`, `TRUNCATE`, and schema modifications.
- **Grant Statements:**
  ```sql
  CREATE USER course_app WITH PASSWORD '<STRONG_RUNTIME_PASSWORD>';
  GRANT CONNECT ON DATABASE mycourse TO course_app;
  GRANT USAGE ON SCHEMA public TO course_app;
  GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO course_app;
  ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO course_app;
  GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO course_app;
  ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO course_app;
  ```

### 4. Strict Environment Secret Isolation

- **Requirement:** Zero credential reuse across development, test, staging, and production.
- **Specification:**
  - Separate secrets for `JWT_ACCESS_SECRET` (min 64 chars high-entropy random), `TOTP_ENCRYPTION_KEY` (32 bytes cryptographically secure), Razorpay live keys vs test keys, and Bunny Stream API keys.
  - Local `.env` and `.env.test` secrets must never be used on production servers.
  - Secret management: Store production secrets in a dedicated secret store (e.g., Doppler, AWS Secrets Manager, or HashiCorp Vault) or inject via secure systemd service files with `chmod 600`.

### 5. Trust Proxy & Authoritative Client IP Resolution

- **Requirement:** The Express API and Next.js applications must accurately resolve client IPs behind Cloudflare and reverse proxies without permitting IP spoofing via attacker-supplied headers.
- **Specification:**
  - Configure `app.set('trust proxy', ['loopback', 'linklocal', 'uniquelocal', ...CLOUDFLARE_IPS])` or set count `2` (Cloudflare -> Nginx -> Node.js).
  - Use `CF-Connecting-IP` as the authoritative client IP at the edge, falling back to Express's sanitized `req.ip`.

### 6. Origin Firewall for Cloudflare (WAF Ingress Lock)

- **Requirement:** Prevent direct-to-origin IP bypass. Attackers discovering the origin server's IP address must not be able to bypass Cloudflare WAF, rate limits, or DDoS mitigation.
- **Specification:**
  - Allow incoming TCP connections on ports 80 and 443 strictly from official Cloudflare IP prefixes:
    - IPv4: `https://www.cloudflare.com/ips-v4`
    - IPv6: `https://www.cloudflare.com/ips-v6`
  - Drop all other incoming traffic on ports 80/443 using host firewall:
    ```bash
    for ip in $(curl -s https://www.cloudflare.com/ips-v4); do ufw allow from $ip to any port 443 proto tcp; done
    ufw default deny incoming
    ufw reload
    ```
  - Alternatively, use Cloudflare Authenticated Origin Pulls (AOP) with client SSL certificates.

---

## Phase Status Summary

- **Architecture, Auth, Payments, Security Hardening, Invoicing, Load Testing:** **COMPLETE (Phases 1 - 9)**
- **Pending Phase 10 & 11 Deliverables:**
  - Video and Course Content Final Fill (Phase 10)
  - VPS Production Deployment, Cloudflare WAF, Origin Firewall, Offsite Backups (Phase 11)
