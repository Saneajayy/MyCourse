/**
 * Central Brand and Site Configuration
 * All brand inputs and instructor details are stored here in one place so they can be easily customized or updated later.
 */
export const siteConfig = {
  brandName: process.env.NEXT_PUBLIC_BRAND_NAME || 'Hydro Basics',
  tagline:
    process.env.NEXT_PUBLIC_TAGLINE ||
    'Practical Industrial Hydraulic Engineering, Circuit Design & Plant Troubleshooting',
  description:
    'Master industrial hydraulic systems, proportional valves, schematic reading, and live troubleshooting directly from a veteran engineer with 20+ years of field experience.',

  instructor: {
    name: process.env.NEXT_PUBLIC_INSTRUCTOR_NAME || 'Mr. Hira Lal',
    credentials:
      process.env.NEXT_PUBLIC_INSTRUCTOR_CREDENTIALS ||
      'Hydraulic Engineer (20+ Years Field Experience)',
    subscribers: '70,000+ Subscribers on YouTube',
    bio:
      process.env.NEXT_PUBLIC_INSTRUCTOR_BIO ||
      'Hydraulic engineer with over 20 years of field experience in industrial plants, hydraulic systems, and circuit design. Teaches practical engineering and troubleshooting on YouTube (70k subscribers).',
    youtubeUrl:
      process.env.NEXT_PUBLIC_YOUTUBE_URL || 'https://www.youtube.com/@HYDRAULICSYSTEMbasics',
    linkedinUrl:
      process.env.NEXT_PUBLIC_LINKEDIN_URL || 'https://www.linkedin.com',
  },

  // Official support email
  supportEmail: process.env.NEXT_PUBLIC_SUPPORT_EMAIL || 'support@hydrobasics.com',

  // Logo configuration: Text wordmark for now, easy to swap for an image later
  logo: {
    type: 'text' as 'text' | 'image',
    text: 'Hydro Basics',
    shortWordmark: 'HB',
    imageSrc: '/logo.png',
  },

  contact: {
    address:
      process.env.NEXT_PUBLIC_BUSINESS_ADDRESS || 'Rudrapur, Uttarakhand, India',
    hours: 'Monday – Friday, 9:00 AM – 6:00 PM IST',
    phone: process.env.NEXT_PUBLIC_SUPPORT_PHONE || '+91 97582 62351',
    jurisdiction:
      process.env.NEXT_PUBLIC_LEGAL_JURISDICTION || 'Rudrapur, Uttarakhand, India',
  },

  urls: {
    app:
      process.env.NEXT_PUBLIC_APP_URL ||
      (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'),
    api:
      process.env.NEXT_PUBLIC_API_URL ||
      (typeof window !== 'undefined' ? '' : process.env.INTERNAL_API_URL || 'http://localhost:4000'),
  },

  razorpayKeyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || 'rzp_test_ToZGDbt27ZdYCc',
};

export type SiteConfig = typeof siteConfig;
