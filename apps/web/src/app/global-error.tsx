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
          padding: 40,
          fontFamily: 'system-ui, sans-serif',
          background: '#f8fafc',
          color: '#10152b',
        }}
      >
        <main>
          <h1>TixFlow tạm thời gián đoạn</h1>
          <p>Không thể tải ứng dụng. Vui lòng thử lại.</p>
          <button
            onClick={reset}
            style={{
              padding: '12px 20px',
              borderRadius: 12,
              background: '#4f46e5',
              color: 'white',
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
