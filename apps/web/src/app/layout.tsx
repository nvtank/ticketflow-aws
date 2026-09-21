import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: { default: 'TixFlow — Chạm vào khoảnh khắc', template: '%s | TixFlow' },
  description:
    'Nền tảng khám phá và đặt vé sự kiện TixFlow. Được xây dựng cho những khoảnh khắc đáng nhớ.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi">
      <body>
        <a href="#main-content" className="skip-link">
          Đến nội dung chính
        </a>
        {children}
      </body>
    </html>
  );
}
