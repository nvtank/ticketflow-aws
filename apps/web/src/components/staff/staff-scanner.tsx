'use client';
import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { IScannerControls } from '@zxing/browser';
import { apiGet, apiRequest } from '@/lib/api-client';
import { admissionSchema, attendanceSchema } from '@/lib/reporting';
import { dateTime } from '@/lib/events';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { QueryNotice } from '@/components/events/event-detail';
import { MetricGrid, AttendanceChart } from '@/components/analytics/report-widgets';
import { useAttendance } from './use-attendance';
const formSchema = z.object({
  credential: z.string().trim().min(1, 'Nhập mã vé hoặc quét QR.').max(256),
});
export function StaffScanner({ eventId }: { eventId: string }) {
  const cache = useQueryClient(),
    [result, setResult] = useState<z.infer<typeof admissionSchema> | null>(null),
    [verified, setVerified] = useState(''),
    [error, setError] = useState(''),
    [camera, setCamera] = useState(false),
    [cameraError, setCameraError] = useState('');
  const video = useRef<HTMLVideoElement>(null),
    controls = useRef<IScannerControls | null>(null),
    alive = useRef(true),
    scanned = useRef(false);
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { credential: '' },
  });
  const stats = useQuery({
    queryKey: ['staff', 'stats', eventId],
    queryFn: () => apiGet(`/check-in/events/${eventId}/stats`, attendanceSchema),
    refetchInterval: 5000,
    retry: false,
  });
  useAttendance(eventId);
  useEffect(() => {
    if (stats.isError) controls.current?.stop();
  }, [stats.isError]);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      controls.current?.stop();
    };
  }, []);
  const verify = useMutation({
    mutationFn: (credential: string) =>
      apiRequest('POST', '/check-in/verify', admissionSchema, { eventId, credential }),
    onSuccess: (data, credential) => {
      setVerified(credential);
      setResult(data);
      setError('');
    },
    onError: (e) => {
      setResult(null);
      setError(e.message);
    },
  });
  const confirm = useMutation({
    mutationFn: () =>
      apiRequest('POST', '/check-in/confirm', admissionSchema, { eventId, credential: verified }),
    onSuccess: (data) => {
      setResult(data);
      setError('');
      void cache.invalidateQueries({ queryKey: ['staff'] });
    },
    onError: (e) => {
      setError(e.message);
      setResult(null);
      void cache.invalidateQueries({ queryKey: ['staff'] });
    },
  });
  async function startCamera() {
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError('Thiết bị chưa hỗ trợ camera. Hãy nhập mã vé.');
      return;
    }
    setCameraError('');
    setCamera(true);
    scanned.current = false;
    try {
      const { BrowserQRCodeReader } = await import('@zxing/browser');
      const reader = new BrowserQRCodeReader();
      const scanner = await reader.decodeFromConstraints(
        { video: { facingMode: { ideal: 'environment' } } },
        video.current!,
        (value, _err, scanner) => {
          if (value && alive.current && !scanned.current) {
            scanned.current = true;
            scanner.stop();
            setCamera(false);
            const code = value.getText();
            form.setValue('credential', code);
            verify.mutate(code);
          }
        },
      );
      if (!alive.current) scanner.stop();
      else controls.current = scanner;
    } catch {
      if (alive.current) {
        setCamera(false);
        setCameraError('Không mở được camera. Kiểm tra quyền truy cập hoặc nhập mã vé.');
      }
    }
  }
  if (stats.isError || !stats.data)
    return (
      <QueryNotice
        pending={stats.isPending}
        error={stats.error}
        retry={() => void stats.refetch()}
      />
    );
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Quét vé vào cổng</h1>
      <MetricGrid
        items={[
          { label: 'Tổng vé hợp lệ', value: stats.data.totalTickets },
          { label: 'Đã check-in', value: stats.data.checkedIn },
          { label: 'Chưa check-in', value: stats.data.remaining },
        ]}
      />
      <div className="grid items-start gap-6 lg:grid-cols-2">
        <Card className="space-y-5">
          <h2 className="text-xl font-semibold">Xác minh vé</h2>
          <video
            ref={video}
            playsInline
            muted
            className={camera ? 'aspect-video w-full rounded-xl bg-slate-950' : 'hidden'}
            aria-label="Camera quét QR"
          />
          {camera ? (
            <Button
              variant="outline"
              onClick={() => {
                controls.current?.stop();
                setCamera(false);
              }}
            >
              Dừng camera
            </Button>
          ) : (
            <Button onClick={() => void startCamera()}>Bật camera quét QR</Button>
          )}
          {cameraError && (
            <p role="alert" className="text-sm text-amber-700">
              {cameraError}
            </p>
          )}
          <form
            onSubmit={form.handleSubmit((v) => verify.mutate(v.credential))}
            className="space-y-3"
          >
            <label htmlFor="credential" className="text-sm font-medium">
              Mã vé hoặc dữ liệu QR
            </label>
            <Input
              id="credential"
              {...form.register('credential', {
                onChange: () => {
                  setResult(null);
                  setError('');
                },
              })}
            />
            {form.formState.errors.credential && (
              <p role="alert">{form.formState.errors.credential.message}</p>
            )}
            <Button variant="outline" disabled={verify.isPending}>
              {verify.isPending ? 'Đang xác minh…' : 'Kiểm tra vé'}
            </Button>
          </form>
        </Card>
        <Card className="space-y-4">
          <h2 className="text-xl font-semibold">Kết quả xác minh</h2>
          {error ? (
            <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-700">
              {error}
            </p>
          ) : result ? (
            <>
              <p
                role="status"
                className={`rounded-xl p-4 font-semibold ${['VALID', 'CHECKED_IN'].includes(result.outcome) ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-800'}`}
              >
                {result.message}
              </p>
              {result.ticket && (
                <div className="space-y-2">
                  <p className="break-all text-sm">{result.ticket.code}</p>
                  <p className="text-xl font-bold">
                    {result.ticket.section} · Ghế {result.ticket.seatCode}
                  </p>
                  {result.ticket.checkedInAt && (
                    <p className="text-sm">Thời gian vào: {dateTime(result.ticket.checkedInAt)}</p>
                  )}
                </div>
              )}
              {result.outcome === 'VALID' && (
                <Button
                  className="w-full"
                  disabled={confirm.isPending}
                  onClick={() => confirm.mutate()}
                >
                  {confirm.isPending ? 'Đang check-in…' : 'Xác nhận vào cổng'}
                </Button>
              )}
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              Quét QR hoặc nhập mã để kiểm tra. Xác minh chưa sử dụng vé.
            </p>
          )}
        </Card>
      </div>
      <AttendanceChart data={stats.data.hourly} />
    </div>
  );
}
