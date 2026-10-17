import { Router } from 'express';
import { env } from '../../config/env.js';
import { prisma } from '../../common/db/prisma.js';
import { uuidv7 } from 'uuidv7';

export const devRouter = Router();

// Top-level guard: strictly refuse access in production or when dev routes are disabled
devRouter.use((_req, res, next) => {
  if (env.NODE_ENV === 'production' || !env.ENABLE_DEV_ROUTES) {
    res.status(404).send('Not Found');
    return;
  }
  next();
});

// Only accessible in non-production environments
devRouter.get('/checkout', (_req, res) => {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Razorpay Test Mode Checkout - Dev Verification</title>
  <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0f172a; color: #f8fafc; padding: 2rem; max-width: 700px; margin: 0 auto; line-height: 1.5; }
    h1 { color: #38bdf8; font-size: 1.5rem; margin-bottom: 0.5rem; }
    .badge { display: inline-block; background: #f59e0b; color: #000; font-weight: bold; font-size: 0.75rem; padding: 2px 8px; border-radius: 4px; margin-bottom: 1rem; }
    .card { background: #1e293b; border: 1px solid #334155; border-radius: 8px; padding: 1.5rem; margin-bottom: 1.5rem; }
    label { display: block; font-size: 0.85rem; color: #94a3b8; margin-bottom: 0.25rem; }
    input, select, button { width: 100%; box-sizing: border-box; padding: 0.75rem; border-radius: 6px; border: 1px solid #475569; background: #0f172a; color: #fff; margin-bottom: 1rem; font-size: 0.95rem; }
    button { background: #0284c7; font-weight: bold; cursor: pointer; border: none; margin-top: 0.5rem; }
    button:hover { background: #0369a1; }
    pre { background: #090d16; border: 1px solid #1e293b; padding: 1rem; border-radius: 6px; overflow-x: auto; font-size: 0.8rem; color: #38bdf8; max-height: 250px; }
    .instructions { background: #1e293b; border-left: 4px solid #38bdf8; padding: 1rem; font-size: 0.85rem; color: #cbd5e1; margin-bottom: 1.5rem; }
  </style>
</head>
<body>
  <h1>Razorpay Checkout Test Page</h1>
  <div class="badge">DEVELOPMENT ONLY &bull; TEST MODE</div>

  <div class="instructions">
    <strong>Razorpay Test Payment Instruments (INR Domestic):</strong><br>
    &bull; <strong>RuPay Domestic Card (Recommended):</strong> <code>6527 6589 0000 1005</code>, Exp: <code>12/28</code>, CVV: <code>123</code>, OTP: <code>123456</code><br>
    &bull; <strong>Visa Domestic Debit:</strong> <code>4100 2800 0000 1007</code>, Exp: <code>12/28</code>, CVV: <code>123</code>, OTP: <code>123456</code><br>
    &bull; <strong>Mastercard Domestic:</strong> <code>5555 5100 0008 1006</code>, Exp: <code>12/28</code>, CVV: <code>123</code>, OTP: <code>123456</code><br>
    &bull; <strong>Wallet:</strong> Select <strong>Wallet</strong> (e.g. Mobikwik or Freecharge) and click <strong>Success</strong> on the test screen.<br>
    &bull; <em>Note: If testing Netbanking, ensure your browser does not block popups from localhost.</em>
  </div>

  <div class="card">
    <h3>1. Authenticate Student</h3>
    <label>Student Email</label>
    <input type="email" id="email" value="curl_student_2026@test.com">
    <label>Password</label>
    <input type="password" id="password" value="StrongStudent#2026!">
    <button type="button" onclick="loginStudent()">Log In to Get Token</button>
    <div id="authStatus" style="font-size:0.85rem; color:#10b981; margin-top:-0.5rem;"></div>
  </div>

  <div class="card">
    <h3>2. Order Details</h3>
    <label>Select Course</label>
    <select id="courseSelect">
      <option value="">Loading courses...</option>
    </select>
    <label>Coupon Code (Optional)</label>
    <input type="text" id="couponCode" placeholder="e.g. FREE100 or leave blank">
    <button type="button" id="payBtn" onclick="initiateCheckout()" disabled>Pay with Razorpay Test Mode</button>
  </div>

  <div class="card">
    <h3>Live Console Logs</h3>
    <pre id="logs">Waiting for user interaction...</pre>
  </div>

  <script>
    let token = '';
    let courses = [];

    function log(msg) {
      const el = document.getElementById('logs');
      const time = new Date().toISOString().substring(11, 19);
      el.textContent = '[' + time + '] ' + (typeof msg === 'object' ? JSON.stringify(msg, null, 2) : msg) + '\\n\\n' + el.textContent;
    }

    async function loadCourses() {
      try {
        const res = await fetch('/api/v1/courses');
        const data = await res.json();
        courses = data.data || [];
        const select = document.getElementById('courseSelect');
        select.innerHTML = courses.map(c => '<option value="' + c.id + '">' + c.title + ' (₹' + (c.pricePaise/100) + ')</option>').join('');
        log('Loaded ' + courses.length + ' published courses.');
      } catch (err) {
        log('Error loading courses: ' + err.message);
      }
    }

    async function loginStudent() {
      const email = document.getElementById('email').value;
      const password = document.getElementById('password').value;
      log('Logging in as ' + email + '...');
      try {
        const res = await fetch('/api/v1/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        if (data.success && data.data?.accessToken) {
          token = data.data.accessToken;
          document.getElementById('authStatus').textContent = '✓ Logged in as ' + email + ' (' + data.data.user.role + ')';
          document.getElementById('payBtn').disabled = false;
          log({ message: 'Login successful', tokenVersion: data.data.user.tokenVersion });
        } else {
          log('Login failed: ' + (data.error?.message || 'Check credentials'));
        }
      } catch (err) {
        log('Login request failed: ' + err.message);
      }
    }

    async function initiateCheckout() {
      if (!token) {
        alert('Please log in first.');
        return;
      }
      const productId = document.getElementById('courseSelect').value;
      const couponCode = document.getElementById('couponCode').value.trim();
      const idemKey = 'checkout-dev-' + Date.now();

      log('Creating order with Idempotency-Key: ' + idemKey + '...');
      const payload = { productId };
      if (couponCode) payload.couponCode = couponCode;

      try {
        const res = await fetch('/api/v1/orders', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + token,
            'Idempotency-Key': idemKey
          },
          body: JSON.stringify(payload)
        });
        const orderData = await res.json();
        if (!orderData.success) {
          log({ error: 'Order creation failed', details: orderData.error });
          return;
        }

        log({ orderCreated: orderData.data.order });

        // If 100% coupon, completed without gateway
        if (orderData.data.order.totalPaise === 0) {
          log('✓ 100% Free coupon: Access granted immediately without gateway!');
          return;
        }

        const rzpOrderId = orderData.data.razorpayOrderId;
        const keyId = orderData.data.razorpayKeyId;
        const amountPaise = orderData.data.order.totalPaise;

        log('Opening Razorpay Checkout Modal (Key: ' + keyId + ', Order: ' + rzpOrderId + ')...');

        const options = {
          key: keyId,
          amount: amountPaise,
          currency: 'INR',
          name: 'Hydraulic Engineering Academy',
          description: orderData.data.order.product.title,
          order_id: rzpOrderId,
          prefill: {
            email: document.getElementById('email').value,
            name: 'Dev Tester',
            contact: '9876543210'
          },
          theme: { color: '#0284c7' },
          handler: async function (response) {
            log({ checkoutSuccessResponse: response });
            log('Sending browser verify to /api/v1/payments/verify...');
            const verifyRes = await fetch('/api/v1/payments/verify', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token
              },
              body: JSON.stringify({
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature
              })
            });
            const verifyData = await verifyRes.json();
            log({ verifyResult: verifyData });
            if (verifyData.success) {
              log('✓ PAYMENT FULLY VERIFIED! Access Entitlement: ' + verifyData.data.entitlement?.status + ', Invoice: ' + verifyData.data.invoice?.invoiceNumber);
            }
          },
          modal: {
            ondismiss: function () {
              log('Razorpay modal dismissed by user. Order remains open for retry.');
            }
          }
        };

        const rzp = new Razorpay(options);
        rzp.on('payment.failed', function (response) {
          log({ paymentFailedError: response.error });
        });
        rzp.open();
      } catch (err) {
        log('Checkout error: ' + err.message);
      }
    }

    loadCourses();
  </script>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html');
  res.send(html);
});

// Dev Video Player Test Page with HLS.js, moving dynamic watermark, heartbeat, and resume position
devRouter.get('/player', (_req, res) => {
  if (env.NODE_ENV === 'production') {
    res.status(404).send('Not Found');
    return;
  }

  // Ensure browser sends Referer header (http://localhost:4000) so Bunny Stream CDN allows video playback
  res.setHeader('Referrer-Policy', 'no-referrer-when-downgrade');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="referrer" content="no-referrer-when-downgrade">
  <title>Secure Player Test - Hydraulic Engineering Academy</title>
  <script src="https://cdn.jsdelivr.net/npm/hls.js@1.5.8/dist/hls.min.js"></script>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0b1120; color: #f8fafc; padding: 1.5rem; max-width: 900px; margin: 0 auto; line-height: 1.5; }
    h1 { color: #38bdf8; font-size: 1.5rem; margin-bottom: 0.25rem; }
    .badge { display: inline-block; background: #0284c7; color: #fff; font-weight: bold; font-size: 0.75rem; padding: 2px 8px; border-radius: 4px; margin-bottom: 1rem; }
    .card { background: #1e293b; border: 1px solid #334155; border-radius: 8px; padding: 1.25rem; margin-bottom: 1.25rem; }
    label { display: block; font-size: 0.85rem; color: #94a3b8; margin-bottom: 0.25rem; }
    input, select, button { width: 100%; box-sizing: border-box; padding: 0.65rem; border-radius: 6px; border: 1px solid #475569; background: #0f172a; color: #fff; margin-bottom: 0.75rem; font-size: 0.95rem; }
    button { background: #0284c7; font-weight: bold; cursor: pointer; border: none; }
    button:hover { background: #0369a1; }
    button:disabled { background: #334155; color: #64748b; cursor: not-allowed; }
    
    /* Player Container with Relative Position for Watermark Overlay */
    .player-wrapper {
      position: relative;
      width: 100%;
      background: #000;
      border-radius: 8px;
      overflow: hidden;
      aspect-ratio: 16 / 9;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5);
    }
    video, iframe {
      width: 100%;
      height: 100%;
      display: block;
      border: none;
    }
    
    /* Anti-Piracy Floating Dynamic Watermark */
    #watermarkOverlay {
      position: absolute;
      top: 20px;
      left: 20px;
      pointer-events: none;
      z-index: 50;
      color: rgba(255, 255, 255, 0.32);
      font-size: 0.85rem;
      font-weight: bold;
      text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8);
      user-select: none;
      transition: all 1.2s cubic-bezier(0.4, 0, 0.2, 1);
      display: none;
    }

    .telemetry-row { display: flex; gap: 1rem; margin-top: 0.5rem; flex-wrap: wrap; }
    .telemetry-box { flex: 1; min-width: 150px; background: #0f172a; padding: 0.75rem; border-radius: 6px; border: 1px solid #334155; }
    .telemetry-label { font-size: 0.75rem; color: #94a3b8; text-transform: uppercase; }
    .telemetry-value { font-size: 1.1rem; font-weight: bold; color: #38bdf8; }
    
    pre { background: #090d16; border: 1px solid #1e293b; padding: 1rem; border-radius: 6px; overflow-x: auto; font-size: 0.8rem; color: #38bdf8; max-height: 200px; }
  </style>
</head>
<body>
  <h1>Secure Video Playback & Telemetry</h1>
  <div class="badge">PHASE 5 VERIFICATION &bull; DIRECT HLS & BUNNY EMBED</div>

  <div class="card">
    <h3>1. Authenticate Student</h3>
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
      <div>
        <label>Email</label>
        <input type="email" id="email" value="student_rzp_test@test.com">
      </div>
      <div>
        <label>Password</label>
        <input type="password" id="password" value="TestRazorpay#2026!">
      </div>
    </div>
    <button type="button" onclick="login()">Log In & Fetch Access</button>
    <div id="authStatus" style="font-size:0.85rem; color:#10b981; margin-top:0.25rem;"></div>
  </div>

  <div class="card">
    <h3>2. Select Lesson & Start Stream</h3>
    <label>Select Ready Lesson</label>
    <select id="lessonSelect">
      <option value="01a143de-d144-7425-99af-9c71fa8bc72f">Live Bunny Test Lesson (Real Bunny Video - 61s)</option>
    </select>
    
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
      <button type="button" id="playBtn" onclick="requestPlayback('hls')" disabled>Play with Direct HLS (Recommended)</button>
      <button type="button" id="embedBtn" onclick="requestPlayback('embed')" style="background:#475569;" disabled>Play with Bunny Embed iframe</button>
    </div>
  </div>

  <div class="card" id="playerCard" style="display:none;">
    <h3>3. Active Secure Player</h3>
    <div class="player-wrapper" id="playerWrapper">
      <div id="watermarkOverlay">
        <span id="watermarkText">student@example.com</span><br>
        <span style="font-size:0.7rem; opacity:0.8;">Hydraulic Engineering Academy</span>
      </div>
      <video id="videoPlayer" playsinline controls style="display:none;"></video>
      <iframe id="embedFrame" allow="autoplay; fullscreen" style="display:none;"></iframe>
    </div>

    <div class="telemetry-row">
      <div class="telemetry-box">
        <div class="telemetry-label">Session ID</div>
        <div class="telemetry-value" id="displaySessionId" style="font-size:0.85rem;">--</div>
      </div>
      <div class="telemetry-box">
        <div class="telemetry-label">Current Position</div>
        <div class="telemetry-value" id="displayPosition">0s</div>
      </div>
      <div class="telemetry-box">
        <div class="telemetry-label">Watched Time</div>
        <div class="telemetry-value" id="displayWatched">0s</div>
      </div>
      <div class="telemetry-box">
        <div class="telemetry-label">Completion Status</div>
        <div class="telemetry-value" id="displayCompletion" style="color:#f59e0b;">In Progress</div>
      </div>
    </div>
  </div>

  <div class="card">
    <h3>Live Console Logs</h3>
    <pre id="logs">Ready. Log in to start.</pre>
  </div>

  <script>
    let token = '';
    let currentSessionId = '';
    let currentLessonId = '';
    let heartbeatTimer = null;
    let watermarkTimer = null;
    let watchedSecondsCounter = 0;
    let hls = null;

    function log(msg) {
      const el = document.getElementById('logs');
      const time = new Date().toISOString().substring(11, 19);
      el.textContent = '[' + time + '] ' + (typeof msg === 'object' ? JSON.stringify(msg, null, 2) : msg) + '\\n\\n' + el.textContent;
    }

    async function login() {
      const email = document.getElementById('email').value;
      const password = document.getElementById('password').value;
      log('Logging in as ' + email + '...');
      try {
        const res = await fetch('/api/v1/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        if (data.success && data.data?.accessToken) {
          token = data.data.accessToken;
          document.getElementById('authStatus').textContent = '✓ Authenticated as ' + email + ' (' + data.data.user.role + ')';
          document.getElementById('playBtn').disabled = false;
          document.getElementById('embedBtn').disabled = false;
          log('Login successful. Ready to request playback.');
        } else {
          log('Login failed: ' + (data.error?.message || 'Check credentials'));
        }
      } catch (err) {
        log('Login request failed: ' + err.message);
      }
    }

    async function requestPlayback(mode) {
      if (!token) {
        alert('Please log in first.');
        return;
      }

      currentLessonId = document.getElementById('lessonSelect').value;
      log('Requesting secure playback credentials for lesson ' + currentLessonId + '...');

      try {
        const res = await fetch('/api/v1/lessons/' + currentLessonId + '/playback', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + token
          }
        });

        const data = await res.json();
        if (!data.success) {
          log({ error: 'Playback request denied', details: data.error });
          alert('Playback denied: ' + (data.error?.message || 'Unauthorized'));
          return;
        }

        const info = data.data;
        currentSessionId = info.sessionId;
        watchedSecondsCounter = info.progress.watchedSeconds || 0;

        document.getElementById('playerCard').style.display = 'block';
        document.getElementById('displaySessionId').textContent = currentSessionId.slice(0, 13) + '...';
        log({ message: 'Playback credentials issued', sessionId: currentSessionId, tokenTtlSeconds: info.tokenValiditySeconds });

        // Setup moving anti-piracy watermark
        setupWatermark(info.watermark.text);

        // Setup Player based on mode
        const videoEl = document.getElementById('videoPlayer');
        const embedFrame = document.getElementById('embedFrame');

        if (mode === 'hls') {
          embedFrame.style.display = 'none';
          videoEl.style.display = 'block';

          // Extract token query parameters from master playlist URL
          const sourceUrl = new URL(info.playbackUrl);
          const tokenSearch = sourceUrl.search;

          if (Hls.isSupported()) {
            if (hls) hls.destroy();
            hls = new Hls({
              debug: false,
              enableWorker: true,
              lowLatencyMode: true,
              xhrSetup: function (xhr, url) {
                // Ensure auth token and expiration are propagated to variant playlists and segment chunks
                if (tokenSearch && !url.includes('token=')) {
                  const sep = url.includes('?') ? '&' : '?';
                  xhr.open('GET', url + sep + tokenSearch.substring(1), true);
                }
              }
            });

            hls.on(Hls.Events.ERROR, function (event, data) {
              log({
                hlsError: data.type,
                details: data.details,
                fatal: data.fatal,
                response: data.response ? { code: data.response.code, status: data.response.text } : null
              });
              if (data.fatal) {
                switch (data.type) {
                  case Hls.ErrorTypes.NETWORK_ERROR:
                    log('Network error loading stream, retrying...');
                    hls.startLoad();
                    break;
                  case Hls.ErrorTypes.MEDIA_ERROR:
                    log('Media decode error, attempting recovery...');
                    hls.recoverMediaError();
                    break;
                  default:
                    hls.destroy();
                    break;
                }
              }
            });

            hls.on(Hls.Events.MANIFEST_PARSED, function () {
              log('HLS manifest parsed. Resuming from ' + info.progress.lastPositionSeconds + 's...');
              if (info.progress.lastPositionSeconds > 0) {
                videoEl.currentTime = info.progress.lastPositionSeconds;
              }
              videoEl.play().catch(e => {
                log('Autoplay notice: ' + e.message + ' (Click Play on the video controls to start)');
              });
            });

            hls.loadSource(info.playbackUrl);
            hls.attachMedia(videoEl);
          } else if (videoEl.canPlayType('application/vnd.apple.mpegurl')) {
            // Native HLS for Safari / iOS
            videoEl.src = info.playbackUrl;
            if (info.progress.lastPositionSeconds > 0) {
              videoEl.currentTime = info.progress.lastPositionSeconds;
            }
            videoEl.play().catch(e => log('Autoplay note: ' + e.message));
          }

          videoEl.onplay = () => log('Video playback started.');
          videoEl.onplaying = () => log('Video playing active stream.');
          videoEl.onwaiting = () => log('Video buffering...');
          videoEl.onerror = () => log({ videoTagError: videoEl.error ? { code: videoEl.error.code, message: videoEl.error.message } : 'Unknown video error' });

        } else {
          // Bunny embed iframe fallback
          videoEl.style.display = 'none';
          embedFrame.style.display = 'block';
          embedFrame.src = info.embedUrl;
          log('Loaded signed Bunny embed iframe: ' + info.embedUrl);
        }

        // Start 15s Heartbeat
        startHeartbeat();

      } catch (err) {
        log('Playback exception: ' + err.message);
      }
    }

    function setupWatermark(userEmail) {
      const wm = document.getElementById('watermarkOverlay');
      document.getElementById('watermarkText').textContent = userEmail;
      wm.style.display = 'block';

      if (watermarkTimer) clearInterval(watermarkTimer);

      // Move watermark to random position every 8 seconds
      watermarkTimer = setInterval(() => {
        const wrapper = document.getElementById('playerWrapper');
        const maxX = wrapper.clientWidth - 220;
        const maxY = wrapper.clientHeight - 60;
        const randomX = Math.max(15, Math.floor(Math.random() * maxX));
        const randomY = Math.max(15, Math.floor(Math.random() * maxY));
        wm.style.left = randomX + 'px';
        wm.style.top = randomY + 'px';
      }, 8000);
    }

    function startHeartbeat() {
      if (heartbeatTimer) clearInterval(heartbeatTimer);

      const videoEl = document.getElementById('videoPlayer');

      // Update UI position on timeupdate
      videoEl.ontimeupdate = function() {
        const pos = Math.floor(videoEl.currentTime);
        document.getElementById('displayPosition').textContent = pos + 's';
      };

      // Heartbeat every 15 seconds
      heartbeatTimer = setInterval(async () => {
        const pos = Math.floor(videoEl.currentTime);

        // Only increment watched time when the video is actively playing
        if (!videoEl.paused && !videoEl.ended && pos > 0) {
          watchedSecondsCounter += 15;
        }
        document.getElementById('displayWatched').textContent = watchedSecondsCounter + 's';

        log('Sending heartbeat: pos=' + pos + 's, watched=' + watchedSecondsCounter + 's...');

        try {
          const res = await fetch('/api/v1/lessons/' + currentLessonId + '/heartbeat', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer ' + token
            },
            body: JSON.stringify({
              sessionId: currentSessionId,
              positionSeconds: pos,
              watchedSeconds: watchedSecondsCounter
            })
          });

          const data = await res.json();
          if (data.success) {
            log({ heartbeatAck: data.data });
            if (data.data.isCompleted) {
              const compEl = document.getElementById('displayCompletion');
              compEl.textContent = '✓ Completed (90% Threshold Met)';
              compEl.style.color = '#10b981';
            }
          } else {
            log({ heartbeatRejected: data.error });
            if (data.error?.code === 'STREAM_SESSION_TERMINATED') {
              alert('Stream session terminated: playback started on another device or access expired.');
              videoEl.pause();
              clearInterval(heartbeatTimer);
            }
          }
        } catch (err) {
          log('Heartbeat error: ' + err.message);
        }
      }, 15000);
    }
  </script>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html');
  res.send(html);
});

devRouter.post('/verify-student', async (req, res) => {
  if (env.NODE_ENV === 'production') {
    res.status(404).send('Not Found');
    return;
  }
  const { email } = req.body;
  if (!email) {
    res.status(400).json({ success: false, error: 'Email required' });
    return;
  }
  await prisma.user.update({
    where: { email },
    data: { emailVerifiedAt: new Date() },
  });
  res.json({ success: true, message: 'Student email verified for test' });
});

devRouter.post('/ensure-test-coupon', async (_req, res) => {
  if (env.NODE_ENV === 'production') {
    res.status(404).send('Not Found');
    return;
  }
  const existing = await prisma.coupon.findUnique({ where: { code: 'FREE100' } });
  if (!existing) {
    await prisma.coupon.create({
      data: {
        id: uuidv7(),
        code: 'FREE100',
        type: 'PERCENT',
        value: 100,
        maxRedemptions: 1000,
        perUserLimit: 10,
        isActive: true,
      },
    });
  }
  res.json({ success: true, message: 'Coupon FREE100 ready' });
});
