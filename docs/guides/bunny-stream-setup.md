# Bunny Stream Setup Guide: Development & Production Separation

This guide documents the configuration of Bunny Stream for the Hydraulic Engineering Course platform.

---

## 1. Core Security Architecture: Library Separation

> [!CAUTION]
> **NEVER add `localhost` or `127.0.0.1` to a Production Video Library's Allowed Referrers list.**
> Adding `localhost` to a production video library allows any unauthorized local web application or client-side scraper running on any machine to embed, extract, or hotlink your production course videos.

The system enforces strict architectural separation between **Development** and **Production** environments using two dedicated Bunny Stream Video Libraries:

| Environment               | Video Library Name       | Allowed Referrers                                                                                | Purpose                                                                      |
| ------------------------- | ------------------------ | ------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------- |
| **Development / Testing** | `hydraulic-academy-dev`  | `http://localhost:3000`, `http://localhost:4000`, and authorized development tunnel hostnames    | Local engineer testing, video upload integration, and automated CI pipelines |
| **Production**            | `hydraulic-academy-prod` | `https://learn.hydrauliccourse.com`, `https://hydrauliccourse.com` (strictly production domains) | Live paid student video playback with signed tokens and watermarking         |

---

## 2. Setting Up the Development Library

1. **Log in to bunny.net**:
   Navigate to the [bunny.net dashboard](https://dash.bunny.net/) and click on **Stream** in the left sidebar.
2. **Create New Video Library**:
   - Click **Add Video Library**.
   - Name: `hydraulic-academy-dev`.
   - Primary Storage Zone: Choose the region closest to your target audience (e.g., Singapore `SG` or Frankfurt `DE`).
   - Replicate To: Optional for dev (leave unselected to minimize cost).
3. **Configure Allowed Referrers for Development**:
   - In the library settings, navigate to **Security** -> **Allowed Referrers**.
   - Add:
     - `http://localhost:3000`
     - `http://localhost:4000`
     - `*.trycloudflare.com` or `*.ngrok-free.app` (if using dev tunnels for webhook testing).
   - Block Direct URL Access: Enabled.
4. **Enable Token Authentication**:
   - Under **Security** -> **Token Authentication**, toggle **Enable Token Authentication** to **ON**.
   - Copy the generated **Token Authentication Key** (used for `BUNNY_STREAM_TOKEN_AUTH_KEY`).
5. **Retrieve API Keys**:
   - In the library details, click **API**:
     - **Library ID**: Numeric ID shown at the top (e.g., `780987`).
     - **API Key** (Full Access): Used by the API server strictly for management tasks (e.g., creating video GUIDs, querying transcode status). Set as `BUNNY_STREAM_API_KEY`.
     - **Read-Only API Key**: Used strictly for cryptographically verifying incoming `X-BunnyStream-Signature` webhook callbacks. Set as `BUNNY_STREAM_READ_ONLY_API_KEY`.
     - **CDN Hostname**: The Pull Zone hostname linked to this library (e.g., `vz-2f983eda-800.b-cdn.net`). Set as `BUNNY_STREAM_CDN_HOSTNAME`.
6. **Configure Webhook Endpoint**:
   - In **API & Webhook Integration**, set the **Webhook URL** to your tunnel URL:
     `https://<your-tunnel-subdomain>.trycloudflare.com/api/v1/webhooks/bunny`

---

## 3. Setting Up the Production Library

Follow the same steps above with these strict production constraints:

1. **Name**: `hydraulic-academy-prod`.
2. **Replication**: Enable global edge replication for key student traffic hubs.
3. **Allowed Referrers**:
   - Add ONLY your verified production domains (e.g., `https://learn.hydrauliccourse.com`, `https://hydrauliccourse.com`).
   - If a custom domain has not yet been purchased or connected, leave the Allowed Referrers empty during initial provisioning. **Do NOT add localhost to bridge the gap.** Use the development library for all local testing.
4. **Environment Variables**:
   Store the production keys in your production secrets manager (e.g., AWS Secrets Manager, Infisical, or Doppler).

---

## 4. Local Environment File Configuration (`.env`)

For local development, populate your local `.env` with your **Development Library** credentials:

```dotenv
# Video Streaming Provider (Bunny Stream Development Library)
VIDEO_PROVIDER=bunny
BUNNY_STREAM_LIBRARY_ID=780987
BUNNY_STREAM_API_KEY=d8274225-b6d2-4fbc-bac32a6d21dc-07ee-49ce
BUNNY_STREAM_TOKEN_AUTH_KEY=24de117e-48c2-439a-8717-7ecf3d515088
BUNNY_STREAM_CDN_HOSTNAME=vz-2f983eda-800.b-cdn.net
BUNNY_STREAM_READ_ONLY_API_KEY=your-dev-library-read-only-api-key
```

> [!TIP]
> Keep `.env` gitignored at all times. Never commit real credentials to source control.
