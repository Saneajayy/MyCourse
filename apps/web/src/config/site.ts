/**
 * Central Brand and Site Configuration
 * All brand inputs are stored here in one place so they can be easily customized or updated later.
 * Entries marked with [TODO_REPLACE] must be filled in with real owner details prior to live launch.
 */
export const siteConfig = {
  brandName: process.env.NEXT_PUBLIC_BRAND_NAME || 'Hydraulic Engineering Academy',
  tagline:
    process.env.NEXT_PUBLIC_TAGLINE ||
    'Practical Industrial Hydraulic Engineering, Circuit Design & Plant Troubleshooting',
  description:
    'Master industrial hydraulic systems, proportional valves, schematic reading, and live troubleshooting directly from a veteran engineer with 20+ years of field experience.',

  instructor: {
    // [TODO_REPLACE: Replace with father's actual name]
    name: process.env.NEXT_PUBLIC_INSTRUCTOR_NAME || '[TODO_REPLACE: INSTRUCTOR NAME]',
    credentials:
      process.env.NEXT_PUBLIC_INSTRUCTOR_CREDENTIALS ||
      'Hydraulic Engineer (20+ Years Field Experience)',
    subscribers: '70,000+ Subscribers on YouTube',
    // [TODO_REPLACE: Provide instructor bio and background details]
    bio:
      process.env.NEXT_PUBLIC_INSTRUCTOR_BIO ||
      'Hydraulic engineer with over 20 years of field experience in industrial plants, hydraulic systems, and circuit design. Teaches practical engineering and troubleshooting on YouTube (70k subscribers).',
    // [TODO_REPLACE: Replace with real YouTube channel URL]
    youtubeUrl:
      process.env.NEXT_PUBLIC_YOUTUBE_URL || 'https://www.youtube.com/[TODO_REPLACE_CHANNEL]',
  },

  // [TODO_REPLACE: Replace with official support email]
  supportEmail: process.env.NEXT_PUBLIC_SUPPORT_EMAIL || 'support@[TODO_REPLACE_DOMAIN].com',

  // Logo configuration: Text wordmark for now, easy to swap for an image later
  logo: {
    type: 'text' as 'text' | 'image',
    text: 'Hydraulic Engineering Academy',
    shortWordmark: 'HEA',
    imageSrc: '/logo.png',
  },

  contact: {
    // [TODO_REPLACE: Physical registered business address for GST compliance]
    address:
      process.env.NEXT_PUBLIC_BUSINESS_ADDRESS || '[TODO_REPLACE: REGISTERED BUSINESS ADDRESS]',
    hours: 'Monday – Friday, 9:00 AM – 6:00 PM IST',
    // [TODO_REPLACE: Official support telephone or WhatsApp business line]
    phone: process.env.NEXT_PUBLIC_SUPPORT_PHONE || '[TODO_REPLACE: SUPPORT PHONE NUMBER]',
    // [TODO_REPLACE: Legal jurisdiction city/state for Terms & Conditions]
    jurisdiction:
      process.env.NEXT_PUBLIC_LEGAL_JURISDICTION || '[TODO_REPLACE: LEGAL JURISDICTION CITY]',
  },

  urls: {
    app: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    api: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000',
  },

  razorpayKeyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || 'rzp_test_ToZGDbt27ZdYCc',
};

export type SiteConfig = typeof siteConfig;
