'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { toast } from 'sonner';
import { apiGet, apiRequest } from '@/lib/api-client';
import { authResponseSchema, roleHome, safeReturnTo } from '@/lib/auth-session';
import { useAuthState } from '@/stores/auth';
import { loadGoogleIdentity } from '@/lib/google-identity';
import { Button } from '@/components/ui/button';
const challengeSchema = z.object({
  clientId: z.string(),
  nonce: z.string(),
  expiresIn: z.number(),
});
const challengeFlights = new Map<string, Promise<z.infer<typeof challengeSchema>>>();
function prepareGoogleChallenge(intent: 'login' | 'link') {
  const key = intent + ':' + (useAuthState.getState().user?.id ?? 'anonymous');
  let flight = challengeFlights.get(key);
  if (!flight) {
    flight = apiRequest(
      'POST',
      intent === 'link' ? '/auth/google/link/challenge' : '/auth/google/challenge',
      challengeSchema,
      undefined,
      { anonymous: intent === 'login' },
    ).finally(() => challengeFlights.delete(key));
    challengeFlights.set(key, flight);
  }
  return flight;
}
export function GoogleAuthButton({ intent = 'login' }: { intent?: 'login' | 'link' }) {
  const authStatus = useAuthState((state) => state.status);
  const config = useQuery({
    queryKey: ['auth', 'google-config'],
    enabled: authStatus !== 'loading',
    queryFn: () =>
      apiGet('/auth/google/config', z.object({ enabled: z.boolean() }), { anonymous: true }),
    retry: false,
    staleTime: 60000,
  });
  return authStatus !== 'loading' && config.data?.enabled ? (
    <ConfiguredGoogleButton intent={intent} />
  ) : null;
}
function ConfiguredGoogleButton({ intent }: { intent: 'login' | 'link' }) {
  const container = useRef<HTMLDivElement>(null),
    router = useRouter(),
    cache = useQueryClient();
  const [attempt, setAttempt] = useState(0),
    [state, setState] = useState<'loading' | 'ready' | 'processing' | 'error'>('loading'),
    [error, setError] = useState('');
  useEffect(() => {
    let disposed = false,
      submitting = false;
    let expiry: ReturnType<typeof setTimeout> | undefined;
    const element = container.current;
    async function prepare() {
      try {
        const started = performance.now();
        const challenge = await prepareGoogleChallenge(intent);
        const google = await loadGoogleIdentity();
        if (disposed || !element) return;
        google.accounts.id.initialize({
          client_id: challenge.clientId,
          nonce: challenge.nonce,
          auto_select: false,
          callback: (result) => {
            if (disposed || submitting) return;
            submitting = true;
            setState('processing');
            void (async () => {
              try {
                if (intent === 'login') {
                  const login = await apiRequest(
                    'POST',
                    '/auth/google/login',
                    authResponseSchema,
                    { credential: result.credential },
                    { anonymous: true },
                  );
                  if (disposed) return;
                  useAuthState.getState().accept(login);
                  toast.success('Đăng nhập Google thành công.');
                  router.replace(
                    safeReturnTo(
                      new URLSearchParams(location.search).get('next'),
                      roleHome(login.user.role),
                    ),
                  );
                  router.refresh();
                } else {
                  await apiRequest('POST', '/auth/google/link', z.object({ linked: z.boolean() }), {
                    credential: result.credential,
                  });
                  if (disposed) return;
                  toast.success('Đã liên kết Google.');
                  await cache.invalidateQueries({ queryKey: ['auth', 'methods'] });
                }
              } catch (e) {
                if (!disposed) {
                  const message =
                    e instanceof Error ? e.message : 'Không đăng nhập được bằng Google.';
                  setError(message);
                  setState('error');
                  element.replaceChildren();
                  toast.error(message);
                }
              }
            })();
          },
        });
        element.replaceChildren();
        google.accounts.id.renderButton(element, {
          theme: 'outline',
          size: 'large',
          shape: 'pill',
          text: 'continue_with',
          locale: 'vi',
          width: Math.min(360, Math.max(200, Math.floor(element.clientWidth || 300))),
        });
        setState('ready');
        expiry = setTimeout(
          () => {
            if (!disposed && !submitting) {
              element.replaceChildren();
              setError('Phiên Google đã hết hạn. Hãy bắt đầu lại.');
              setState('error');
            }
          },
          Math.max(0, challenge.expiresIn * 1000 - (performance.now() - started)),
        );
      } catch (e) {
        if (!disposed) {
          setError(e instanceof Error ? e.message : 'Chưa kết nối được Google.');
          setState('error');
        }
      }
    }
    void prepare();
    return () => {
      disposed = true;
      if (expiry) clearTimeout(expiry);
      element?.replaceChildren();
    };
  }, [intent, attempt, router, cache]);
  return (
    <div className="space-y-3 border-t pt-5">
      <p className="text-center text-sm text-muted-foreground">
        {intent === 'link' ? 'Liên kết tài khoản Google cùng email' : 'Hoặc tiếp tục bằng Google'}
      </p>
      <div
        ref={container}
        className={
          state === 'processing'
            ? 'pointer-events-none flex justify-center opacity-60'
            : 'flex min-h-11 justify-center'
        }
        aria-busy={state === 'loading' || state === 'processing'}
      />
      {state === 'loading' && (
        <p role="status" className="text-center text-xs text-muted-foreground">
          Đang chuẩn bị Google…
        </p>
      )}
      {state === 'processing' && (
        <p role="status" className="text-center text-xs text-muted-foreground">
          Đang xác minh với máy chủ…
        </p>
      )}
      {state === 'error' && (
        <>
          <p role="alert" className="text-sm text-red-600">
            {error}
          </p>
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => {
              setState('loading');
              setError('');
              setAttempt((a) => a + 1);
            }}
          >
            Thử lại Google
          </Button>
        </>
      )}
    </div>
  );
}
