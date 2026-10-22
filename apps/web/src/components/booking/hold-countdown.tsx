'use client';
import { useState, useEffect, useRef } from 'react';
export function HoldCountdown({
  expiresAt,
  serverTime,
  onExpired,
  label = 'Thời gian giữ ghế còn lại',
}: {
  expiresAt: string;
  serverTime: string;
  onExpired?: () => void;
  label?: string;
}) {
  const [started] = useState(() => performance.now()),
    [tick, setTick] = useState(started),
    notified = useRef(false);
  const seconds = Math.max(
    0,
    Math.ceil((Date.parse(expiresAt) - Date.parse(serverTime) - (tick - started)) / 1000),
  );
  useEffect(() => {
    const timer = setInterval(() => setTick(performance.now()), 500);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    if (seconds === 0 && !notified.current) {
      notified.current = true;
      onExpired?.();
    }
  }, [seconds, onExpired]);
  return (
    <p
      className={`font-mono text-2xl font-bold ${seconds < 60 ? 'text-red-600' : 'text-primary'}`}
      role="timer"
      aria-label={label}
    >
      {String(Math.floor(seconds / 60)).padStart(2, '0')}:{String(seconds % 60).padStart(2, '0')}
    </p>
  );
}
