import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isProd = process.env.NODE_ENV === 'production';
const rawApiOrigin = process.env.NEXT_PUBLIC_API_URL || process.env.API_URL || '';
const rawAppOrigin = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || '';

// In production, strictly reject or omit localhost/loopback fallbacks
const apiOrigin = isProd
  ? rawApiOrigin && !rawApiOrigin.includes('localhost') && !rawApiOrigin.includes('127.0.0.1')
    ? rawApiOrigin
    : ''
  : rawApiOrigin || 'http://localhost:4000';

const appOrigin = isProd
  ? rawAppOrigin && !rawAppOrigin.includes('localhost') && !rawAppOrigin.includes('127.0.0.1')
    ? rawAppOrigin
    : ''
  : rawAppOrigin || 'http://localhost:3000';

const cdnHostname =
  process.env.NEXT_PUBLIC_BUNNY_CDN_HOSTNAME ||
  process.env.BUNNY_STREAM_CDN_HOSTNAME ||
  'video.hydrauliccourse.com';

function buildContentSecurityPolicy() {
  const defaultSrc = ["'self'"];
  const scriptSrc = ["'self'", "'unsafe-inline'", 'https://checkout.razorpay.com', 'https://*.razorpay.com'];
  
  // In development, eval is used for React Fast Refresh and source maps; in production, 'unsafe-eval' is strictly omitted
  if (!isProd) {
    scriptSrc.push("'unsafe-eval'");
  }

  const styleSrc = ["'self'", "'unsafe-inline'"];

  // img-src restricted strictly to app, api, Bunny CDN, and Razorpay (no Unsplash, no wildcards)
  const imgSrc = [
    "'self'",
    'data:',
    'blob:',
    appOrigin,
    apiOrigin,
    `https://${cdnHostname}`,
    'https://*.razorpay.com',
    'https://checkout.razorpay.com',
    'https://*.b-cdn.net',
    'https://*.bunnycdn.com',
    'https://*.mediadelivery.net',
  ];

  const fontSrc = ["'self'", 'data:'];

  const connectSrc = [
    "'self'",
    apiOrigin,
    'https://api.razorpay.com',
    'https://*.razorpay.com',
    'https://lumberjack.razorpay.com',
    'https://*.b-cdn.net',
    'https://*.bunnycdn.com',
    'https://video.bunnycdn.com',
    'https://*.mediadelivery.net',
    `https://${cdnHostname}`,
  ];

  const mediaSrc = [
    "'self'",
    'blob:',
    'https://*.b-cdn.net',
    'https://*.bunnycdn.com',
    'https://video.bunnycdn.com',
    'https://*.mediadelivery.net',
    `https://${cdnHostname}`,
  ];

  const frameSrc = [
    "'self'",
    'https://api.razorpay.com',
    'https://*.razorpay.com',
    'https://player.mediadelivery.net',
    'https://*.mediadelivery.net',
    'https://iframe.mediadelivery.net',
  ];

  // In non-production only, allow localhost and loopback interfaces
  if (!isProd) {
    defaultSrc.push('http://localhost:*', 'http://127.0.0.1:*');
    connectSrc.push('http://localhost:*', 'http://127.0.0.1:*', 'ws://localhost:*', 'ws://127.0.0.1:*');
    imgSrc.push('http://localhost:*', 'http://127.0.0.1:*');
  }

  const cleanList = (arr) =>
    Array.from(new Set(arr.filter(Boolean)))
      .filter(
        (entry) =>
          !isProd ||
          (!entry.includes('localhost') &&
            !entry.includes('127.0.0.1') &&
            !entry.includes('TODO_REPLACE') &&
            !entry.includes('unsplash.com')),
      )
      .join(' ');
  const workerSrc = ["'self'", 'blob:'];

  return [
    `default-src ${cleanList(defaultSrc)}`,
    `script-src ${cleanList(scriptSrc)}`,
    `style-src ${cleanList(styleSrc)}`,
    `img-src ${cleanList(imgSrc)}`,
    `font-src ${cleanList(fontSrc)}`,
    `connect-src ${cleanList(connectSrc)}`,
    `media-src ${cleanList(mediaSrc)}`,
    `frame-src ${cleanList(frameSrc)}`,
    `worker-src ${cleanList(workerSrc)}`,
    "frame-ancestors 'none'",
  ].join('; ');
}

const securityHeaders = [
  {
    key: 'X-DNS-Prefetch-Control',
    value: 'on',
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    key: 'X-Frame-Options',
    value: 'DENY',
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=31536000; includeSubDomains',
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=()',
  },
  {
    key: 'Content-Security-Policy',
    value: buildContentSecurityPolicy(),
  },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  outputFileTracingRoot: path.resolve(__dirname, '../../'),
  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: cdnHostname,
      },
      {
        protocol: 'https',
        hostname: '*.b-cdn.net',
      },
      {
        protocol: 'https',
        hostname: '*.bunnycdn.com',
      },
      {
        protocol: 'https',
        hostname: '*.mediadelivery.net',
      },
      {
        protocol: 'https',
        hostname: 'checkout.razorpay.com',
      },
      ...(!isProd
        ? [
            { protocol: 'http', hostname: 'localhost' },
            { protocol: 'http', hostname: '127.0.0.1' },
          ]
        : []),
    ],
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
