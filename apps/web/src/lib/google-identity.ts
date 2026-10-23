'use client';
interface CredentialResponse {
  credential: string;
}
export interface GoogleIdentityApi {
  accounts: {
    id: {
      initialize(input: {
        client_id: string;
        nonce: string;
        auto_select: false;
        callback: (result: CredentialResponse) => void;
      }): void;
      renderButton(
        element: HTMLElement,
        input: {
          theme: 'outline';
          size: 'large';
          shape: 'pill';
          text: 'continue_with';
          locale: 'vi';
          width: number;
        },
      ): void;
    };
  };
}
let loading: Promise<GoogleIdentityApi> | undefined;
const scriptId = 'tixflow-google-identity';
export function loadGoogleIdentity(): Promise<GoogleIdentityApi> {
  const current = (window as Window & { google?: GoogleIdentityApi }).google;
  if (current?.accounts?.id) return Promise.resolve(current);
  loading ??= new Promise<GoogleIdentityApi>((resolve, reject) => {
    const old = document.getElementById(scriptId);
    old?.remove();
    const script = document.createElement('script');
    script.id = scriptId;
    script.src = 'https://accounts.google.com/gsi/client?hl=vi';
    script.async = true;
    script.defer = true;
    const timer = setTimeout(() => {
      script.remove();
      reject(new Error('Google chưa tải được. Kiểm tra kết nối rồi thử lại.'));
    }, 15000);
    script.onload = () => {
      clearTimeout(timer);
      const api = (window as Window & { google?: GoogleIdentityApi }).google;
      if (api?.accounts?.id) resolve(api);
      else reject(new Error('Google chưa sẵn sàng.'));
    };
    script.onerror = () => {
      clearTimeout(timer);
      script.remove();
      reject(new Error('Không tải được đăng nhập Google. Hãy thử lại.'));
    };
    document.head.appendChild(script);
  }).catch((error) => {
    loading = undefined;
    throw error;
  });
  return loading;
}
