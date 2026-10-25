'use client';

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="vi">
      <body
        style={{
          margin: 0,
          padding: 'clamp(24px, 6vw, 80px)',
          minHeight: '100dvh',
          boxSizing: 'border-box',
          display: 'grid',
          placeItems: 'center',
          fontFamily: 'system-ui, sans-serif',
          background: '#090b13',
          color: '#f8f9fb',
        }}
      >
        <main style={{ maxWidth: 560, lineHeight: 1.7 }}>
          <p style={{ color: '#c8ff5f', letterSpacing: '0.15em', fontSize: 12 }}>
            TIKFLOW / LIVE EXPERIENCES
          </p>
          <h1>TikFlow tạm thời gián đoạn</h1>
          <p>Không thể tải ứng dụng. Vui lòng thử lại.</p>
          <button
            onClick={reset}
            style={{
              padding: '12px 20px',
              borderRadius: 40,
              background: '#c8ff5f',
              color: '#090b13',
              fontWeight: 600,
              border: 0,
              cursor: 'pointer',
            }}
          >
            Thử lại
          </button>
        </main>
      </body>
    </html>
  );
}
