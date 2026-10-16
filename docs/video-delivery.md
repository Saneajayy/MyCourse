# Video Delivery & Streaming Architecture: Phase 5 Decisions

This document outlines the security architecture, player decision matrix, session management, and access revocation strategies for video delivery in the Hydraulic Engineering Academy platform.

---

## 1. Player Decision: Bunny Embed iframe vs. Direct HLS (`hls.js`)

### Architectural Comparison Matrix

| Evaluation Criterion                 | Bunny Embed iframe (`player.mediadelivery.net`)                                                                                                                                            | Direct HLS (`hls.js` / Native `<video>`)                                                                                                                                                                                                                                                          | Decision Winner                         |
| :----------------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | :-------------------------------------- |
| **Progress Tracking & Heartbeat**    | Requires cross-origin `postMessage` using `playerjs.min.js`. Sensitive to iframe sandboxing, third-party cookie restrictions, and asynchronous window communication.                       | Direct DOM event hooks (`timeupdate`, `ended`, `seeking`, `progress`) on the native `<video>` element. 100% deterministic local state tracking for 15s heartbeats and 90% completion triggers.                                                                                                    | **Direct HLS**                          |
| **Watermark in Fullscreen (iPhone)** | Built-in Bunny player controls. However, on iOS Mobile Safari, tapping fullscreen still transfers video decoding to the native iOS `AVPlayer` compositor unless `playsinline` is enforced. | Full DOM control. On desktop and Android, container fullscreen (`element.requestFullscreen()`) keeps floating HTML/Canvas watermark overlays visible at all times. On iPhone, native fullscreen hides DOM overlays, requiring CSS container-fullscreen (`playsinline`) to preserve the watermark. | **Direct HLS (with pseudo-fullscreen)** |
| **Token Exposure**                   | Token and expiration are passed as query parameters in the iframe URL (`/embed/{lib}/{id}?token=...&expires=...`). Accessible via browser DevTools.                                        | Token and expiration are passed in playlist and chunk requests (`playlist.m3u8?token=...&token_path=...`). Accessible via browser DevTools.                                                                                                                                                       | **Tie (Both expose tokens)**            |
| **Maintenance & Flexibility**        | Zero player bundle maintenance, but zero ability to customize controls, keyboard shortcuts, multi-speed playback, or custom floating watermark animations.                                 | Requires `hls.js` library integration (~40KB gzip), but grants 100% control over design system aesthetics, floating moving watermarks, custom shortcuts, and telemetry.                                                                                                                           | **Direct HLS**                          |

---

### The Reality of Token Exposure & Real Protections

> [!IMPORTANT]
> **Security Reality:** Any authenticated student capable of viewing a video can open browser Developer Tools (Network Tab) and copy the signed playback token before it expires. Any attempt to "hide" or encrypt the URL in JavaScript is security through obscurity.
>
> Therefore, true stream protection does **not** rely on client-side secrecy. It relies on 5 server-side defenses:
>
> 1. **Short Token TTL:** Playback tokens expire in **1 hour** (or earlier if the user's entitlement expires sooner). Stolen tokens become useless quickly.
> 2. **Request-Time Entitlement Validation:** The backend validates active entitlement against the database clock on **every** playback token request.
> 3. **Referrer Restrictions:** Bunny Stream Pull Zones strictly enforce allowed HTTP referrers (`http://localhost:3000`, `http://localhost:4000`, `https://hydrauliccourse.com`). Hotlinking or playback outside authorized domains fails with HTTP 403 Forbidden.
> 4. **Concurrent Stream Limits in Redis:** Users are limited to **2 active streams**. Starting an unauthorized stream drops the oldest session or alerts the user.
> 5. **Instant Revocation:** Refunds, chargebacks, or administrative bans immediately clear Redis session keys and reject subsequent heartbeat and playback requests.

---

### Implemented Architecture: Hybrid Support with Direct HLS Primary

Our backend generates and returns **both** formats in the `/api/v1/lessons/:id/playback` payload:

1. `playbackUrl`: Signed HLS master playlist URL (`https://{cdnHostname}/{videoId}/playlist.m3u8?token=...&expires=...&token_path=...`).
2. `embedUrl`: Signed Bunny iframe URL (`https://player.mediadelivery.net/embed/{libraryId}/{videoId}?token=...&expires=...`).

**Recommended Client Implementation:**

- **Web App / Desktop / Android:** Direct HLS with `hls.js` and an animated, drifting watermark overlay containing the user's email, IP address, and timestamp.
- **iPhone (iOS Safari):** Direct HLS using native HLS playback (`<video playsinline>`) accompanied by container-based fullscreen so the watermark remains rendered on screen.

---

## 2. Dynamic Moving Watermark Behavior

To deter screen recording and account sharing:

1. A canvas/HTML overlay displays the student's email, masked IP, and current date.
2. The overlay floats at 20-35% opacity across the screen, smoothly shifting to a random coordinate every **8 seconds**.
3. **iPhone Fullscreen Defense:** On iOS Safari, calling `video.webkitEnterFullscreen()` triggers native iOS player controls which renders on a separate layer, hiding DOM watermarks. To prevent this, the web app uses container-based pseudo-fullscreen (CSS fixed overlay covering `100vw` / `100vh` with `playsinline`), ensuring the watermark is never stripped.

---

## 3. Stream Concurrency & Redis Fail-Closed Strategy

- **Default Limit:** 2 concurrent playback sessions per user (configurable in `AppSetting.max_concurrent_streams`).
- **Session Tracking:** Stored in Redis under `stream:sessions:{userId}` as a hash of active `sessionId`s with timestamps.
- **Conflict Resolution (Drop Oldest):** When a 3rd playback stream begins, the system drops the oldest session (Spotify/Netflix pattern). The displaced device receives a `STREAM_SESSION_TERMINATED` code on its next 15-second heartbeat.
- **Fail-Closed Rule:** If Redis is down or unreachable, stream verification **fails closed** with **HTTP 503 Service Unavailable**. It never fails open to prevent unauthorized concurrent streaming during infrastructure degradation.

---

## 4. Heartbeat & Progress Rules

- **Heartbeat Interval:** Sent by the player every 15–30 seconds to `POST /api/v1/lessons/:id/heartbeat`.
- **Session Refresh:** Extends the Redis session TTL.
- **Anomaly Detection:**
  - If `positionSeconds > lesson.durationSeconds + 5`, it is clamped to `durationSeconds`.
  - If watched time advances faster than `2x` real elapsed time since the last heartbeat, the jump is rejected.
- **90% Completion Rule:** When `watchedSeconds >= floor(lesson.durationSeconds * 0.90)`, the lesson is marked `completedAt = now` in `LessonProgress`.
