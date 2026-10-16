import { MetadataRoute } from 'next';
import { siteConfig } from '../config/site';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/account',
          '/learn',
          '/my-courses',
          '/checkout',
          '/order',
          '/styleguide',
          '/admin',
        ],
      },
    ],
    sitemap: `${siteConfig.urls.app}/sitemap.xml`,
  };
}
