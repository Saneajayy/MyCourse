/**
 * Central Brand and Site Configuration
 * All brand inputs are stored here in one place so they can be easily customized or updated later.
 */
export const siteConfig = {
  brandName: process.env.NEXT_PUBLIC_BRAND_NAME || 'Hydraulic Engineering Academy',
  tagline:
    process.env.NEXT_PUBLIC_TAGLINE ||
    'Practical Industrial Hydraulic Engineering, Circuit Design & Plant Troubleshooting',
  description:
    'Master industrial hydraulic systems, proportional valves, schematic reading, and live troubleshooting directly from a veteran engineer with 20+ years of plant experience.',

  instructor: {
    name: process.env.NEXT_PUBLIC_INSTRUCTOR_NAME || 'Er. S. K. Sharma',
    credentials: 'Lead Hydraulic Specialist & Industrial Consultant (20+ Years Field Experience)',
    subscribers: '70,000+ Subscribers on YouTube',
    bio: 'Veteran hydraulic engineer with over 20 years of hands-on plant experience across industrial manufacturing, heavy hydraulic presses, proportional systems, and plant-floor commissioning. Dedicated to teaching practical, blueprint-accurate engineering without fluff.',
    youtubeUrl:
      process.env.NEXT_PUBLIC_YOUTUBE_URL || 'https://www.youtube.com/@HydraulicEngineeringAcademy',
  },

  supportEmail: process.env.NEXT_PUBLIC_SUPPORT_EMAIL || 'support@hydrauliccourse.com',

  // Logo configuration: Text wordmark for now, easy to swap for an image later
  logo: {
    type: 'text' as 'text' | 'image',
    text: 'Hydraulic Engineering Academy',
    shortWordmark: 'HEA',
    imageSrc: '/logo.png',
  },

  contact: {
    address: '123 Industrial Area, Phase 2, New Delhi, India',
    hours: 'Monday – Friday, 9:00 AM – 6:00 PM IST',
    phone: '+91 98765 43210',
  },

  urls: {
    app: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    api: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000',
  },

  razorpayKeyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || 'rzp_test_ToZGDbt27ZdYCc',
};

export type SiteConfig = typeof siteConfig;
