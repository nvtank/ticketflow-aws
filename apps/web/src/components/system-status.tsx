'use client';

import { useQuery } from '@tanstack/react-query';
import { Activity, Database, Radio, RefreshCw, Server } from 'lucide-react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { toast } from 'sonner';
import { apiGet, healthSchema } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export function SystemStatus() {
  const health = useQuery({
    queryKey: ['health'],
    queryFn: ({ signal }) => apiGet('/health', healthSchema, { signal, acceptDegraded: true }),
    refetchInterval: 30_000,
    retry: false,
  });
  const components = [
    {
      label: 'REST API',
      icon: Server,
      status: health.data ? 'up' : health.isPending ? 'checking' : 'down',
    },
    {
      label: 'PostgreSQL',
      icon: Database,
      status: health.data?.dependencies.postgres ?? (health.isPending ? 'checking' : 'unknown'),
    },
    {
      label: 'Redis',
      icon: Radio,
      status: health.data?.dependencies.redis ?? (health.isPending ? 'checking' : 'unknown'),
    },
  ];
  return (
    <section aria-label="Trạng thái kết nối thực tế">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Activity className="size-4 text-primary" />
          Kiểm tra kết nối local
        </div>
        <Button
          variant="outline"
          size="sm"
          disabled={health.isFetching}
          onClick={async () => {
            const result = await health.refetch();
            if (result.isError) toast.error('Không kết nối được API.');
            else if (result.data?.status === 'ok')
              toast.success('API, PostgreSQL và Redis đang kết nối.');
            else toast.warning('API hoạt động; một số dịch vụ chưa kết nối.');
          }}
        >
          <RefreshCw className={health.isFetching ? 'animate-spin' : ''} />
          Kiểm tra lại
        </Button>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {components.map(({ label, icon: Icon, status }) => (
          <Card key={label}>
            <Icon className="mb-5 size-5 text-primary" />
            <p className="font-semibold">{label}</p>
            {health.isPending ? (
              <Skeleton className="mt-3 h-5 w-24" />
            ) : (
              <p className="mt-3 flex items-center gap-2 text-sm">
                <span
                  className={`size-2 rounded-full ${status === 'up' ? 'bg-emerald-500' : status === 'unknown' ? 'bg-slate-400' : 'bg-amber-500'}`}
                />
                {status === 'up'
                  ? 'Đã kết nối'
                  : status === 'unknown'
                    ? 'Chưa xác định'
                    : 'Chưa kết nối'}
              </p>
            )}
          </Card>
        ))}
      </div>
      <div aria-live="polite" className="mt-5 text-sm leading-6 text-muted-foreground">
        {health.isError ? (
          <p>{health.error.message}</p>
        ) : health.data ? (
          <p>
            Đo lúc {format(new Date(health.data.timestamp), 'HH:mm:ss', { locale: vi })} · Uptime
            API: {health.data.uptimeSeconds}s. PostgreSQL được kiểm tra bằng truy vấn; Redis bằng
            PING.
          </p>
        ) : (
          <p>Đang kiểm tra kết nối…</p>
        )}
      </div>
    </section>
  );
}
