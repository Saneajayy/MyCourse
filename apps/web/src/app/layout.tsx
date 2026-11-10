import type { Metadata } from 'next';
import localFont from 'next/font/local';
import './globals.css';
import { AuthProvider } from '../context/auth-context';
import { ToastProvider } from '../components/ui';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import { siteConfig } from '../config/site';

const redditSans = localFont({
  src: [
    {
      path: '../../public/fonts/RedditSans-Variable.woff2',
      weight: '200',
      style: 'normal',
    },
    {
      path: '../../public/fonts/RedditSans-Variable.woff2',
      weight: '300',
      style: 'normal',
    },
    {
      path: '../../public/fonts/RedditSans-Regular.ttf',
      weight: '400',
      style: 'normal',
    },
    {
      path: '../../public/fonts/RedditSans-Medium.ttf',
      weight: '500',
      style: 'normal',
    },
    {
      path: '../../public/fonts/RedditSans-SemiBold.ttf',
      weight: '600',
      style: 'normal',
    },
    {
      path: '../../public/fonts/RedditSans-Bold.ttf',
      weight: '700',
      style: 'normal',
    },
    {
      path: '../../public/fonts/RedditSans-ExtraBold.ttf',
      weight: '800',
      style: 'normal',
    },
    {
      path: '../../public/fonts/RedditSans-Black.ttf',
      weight: '900',
      style: 'normal',
    },
  ],
  variable: '--font-reddit',
  display: 'swap',
});

const shalimar = localFont({
  src: '../../public/fonts/Shalimar-Regular.ttf',
  variable: '--font-shalimar',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.urls.app),
  title: `${siteConfig.brandName} | ${siteConfig.tagline}`,
  description: siteConfig.description,
  openGraph: {
    title: `${siteConfig.brandName} | ${siteConfig.tagline}`,
    description: siteConfig.description,
    url: siteConfig.urls.app,
    siteName: siteConfig.brandName,
    type: 'website',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="bg-[#000000]" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Elms+Sans:ital,wght@0,100..900;1,100..900&family=Poppins:ital,wght@0,100;0,200;0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,100;1,200;1,300;1,400;1,500;1,600;1,700;1,800;1,900&family=Questrial&family=Reddit+Sans:ital,wght@0,200..900;1,200..900&family=Shalimar&family=Snippet&display=swap"
          rel="stylesheet"
        />
      </head>
      <body
        suppressHydrationWarning
        className={`${redditSans.className} ${redditSans.variable} ${shalimar.variable} min-h-screen flex flex-col bg-[#000000] text-white font-sans antialiased`}
      >
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>
        <AuthProvider>
          <ToastProvider>
            <Header />
            <main id="main-content" className="flex-1">
              {children}
            </main>
            <Footer />
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
