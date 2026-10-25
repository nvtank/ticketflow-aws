import type { Metadata } from 'next';
import { Providers } from '@/components/providers';
import './globals.css';
import './world.css';
import './(public)/flow-home.css';
import './site-ui.css';

export const metadata: Metadata = {
  title: { default: 'TikFlow — Chạm vào khoảnh khắc', template: '%s | TikFlow' },
  description:
    'Nền tảng khám phá và đặt vé sự kiện TikFlow. Được xây dựng cho những khoảnh khắc đáng nhớ.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi" data-scroll-behavior="smooth">
      <head>
        <link
          rel="preload"
          href="/assets/fonts/be-vietnam-pro-regular.ttf"
          as="font"
          type="font/ttf"
          crossOrigin="anonymous"
        />
        <link
          rel="preload"
          href="/assets/fonts/space-grotesk-vietnamese-wght-normal.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
      </head>
      <body>
        <a href="#main-content" className="skip-link" lang="en">
          Skip to main content
        </a>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
