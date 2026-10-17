import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isProd = process.env.NODE_ENV === 'production';
const apiOrigin = process.env.NEXT_PUBLIC_API_URL || process.env.API_URL || 'http://localhost:4000';
const appOrigin = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || 'http://localhost:3000';
const cdnHostname = process.env.NEXT_PUBLIC_BUNNY_CDN_HOSTNAME || process.env.BUNNY_STREAM_CDN_HOSTNAME || 'video.hydrauliccourse.com';

function buildContentSecurityPolicy() {
  const defaultSrc = ["'self'"];
  const scriptSrc = ["'self'", "'unsafe-inline'", 'https://checkout.razorpay.com', 'https://*.razorpay.com'];
  
  // In development, eval is used for React Fast Refresh and source maps; in production, 'unsafe-eval' is strictly omitted
  if (!isProd) {
    scriptSrc.push("'unsafe-eval'");
  }

  const styleSrc = ["'self'", "'unsafe-inline'"];

  // img-src restricted to specific origins instead of wildcard https:
  const imgSrc = [
    "'self'",
    'data:',
    'blob:',
    'https://*.razorpay.com',
    'https://checkout.razorpay.com',
    'https://*.b-cdn.net',
    'https://*.bunnycdn.com',
    'https://*.mediadelivery.net',
    'https://images.unsplash.com',
  ];

  const fontSrc = ["'self'", 'data:'];

  const connectSrc = [
    "'self'",
    apiOrigin,
    'https://api.razorpay.com',
    'https://*.razorpay.com',
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

  const cleanList = (arr) => Array.from(new Set(arr.filter(Boolean))).join(' ');
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
        hostname: '**',
      },
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
