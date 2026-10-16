import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '../context/auth-context';
import { ToastProvider } from '../components/ui';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import { siteConfig } from '../config/site';

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
    <html lang="en">
      <body className="min-h-screen flex flex-col bg-course-white text-course-darkBlue font-sans antialiased">
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
