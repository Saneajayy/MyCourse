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

## Phase Status Summary

- **Architecture, Auth, Payments, Security Hardening, Invoicing, Load Testing:** **COMPLETE (Phases 1 - 9)**
- **Pending Phase 10 & 11 Deliverables:**
  - Video and Course Content Final Fill (Phase 10)
  - VPS Production Deployment, Cloudflare WAF, Origin Firewall, Offsite Backups (Phase 11)
