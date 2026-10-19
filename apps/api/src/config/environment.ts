import { z } from 'zod';

const environmentSchema = z
  .object({
    WAITING_ROOM_ADMISSION_SECONDS: z.coerce.number().int().min(30).max(1800).default(600),
    WAITING_ROOM_QUEUE_SECONDS: z.coerce.number().int().min(60).max(7200).default(1800),
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    HOLD_RECONCILE_INTERVAL_MS: z.coerce.number().int().min(0).max(60000).default(5000),
    SOCKET_REDIS_ADAPTER: z
      .enum(['true', 'false'])
      .default('false')
      .transform((v) => v === 'true'),
    PAYMENT_PROVIDER: z.enum(['disabled', 'payos', 'mock']).default('disabled'),
    PAYMENT_RETURN_ORIGIN: z
      .url()
      .default('http://localhost:3000')
      .refine((v) => {
        const url = new URL(v);
        return (
          ['http:', 'https:'].includes(url.protocol) &&
          !url.username &&
          !url.password &&
          url.pathname === '/' &&
          !url.search &&
          !url.hash
        );
      }),
    PAYOS_CLIENT_ID: z.string().optional(),
    PAYOS_API_KEY: z.string().optional(),
    PAYOS_CHECKSUM_KEY: z.string().optional(),
    TICKET_SIGNING_KEY: z.string().min(48).optional(),
    PAYMENT_RECONCILE_INTERVAL_MS: z.coerce.number().int().min(0).max(60000).default(15000),
    API_PORT: z.coerce.number().int().min(1).max(65535).default(4000),
    JWT_SECRET: z
      .string()
      .min(48)
      .refine((value) => value !== 'generate-with-pnpm-env-setup'),
    JWT_ISSUER: z.string().min(1).default('tixflow-local'),
    JWT_AUDIENCE: z.string().min(1).default('tixflow-web'),
    ACCESS_TOKEN_SECONDS: z.coerce.number().int().min(60).max(1800).default(900),
    REFRESH_TOKEN_DAYS: z.coerce.number().int().min(1).max(14).default(7),
    SESSION_MAX_DAYS: z.coerce.number().int().min(1).max(90).default(30),
    DATABASE_URL: z
      .url()
      .refine((value) => /^postgres(ql)?:\/\//.test(value), 'Expected PostgreSQL URL'),
    REDIS_URL: z.url().refine((value) => /^rediss?:\/\//.test(value), 'Expected Redis URL'),
    CORS_ORIGINS: z
      .string()
      .default('http://localhost:3000')
      .transform((value) => value.split(',').map((origin) => origin.trim()))
      .pipe(z.array(z.url()).min(1)),
  })
  .superRefine((value, context) => {
    if (value.PAYMENT_PROVIDER === 'payos') {
      for (const key of ['PAYOS_CLIENT_ID', 'PAYOS_API_KEY', 'PAYOS_CHECKSUM_KEY'] as const)
        if (!value[key])
          context.addIssue({ code: 'custom', path: [key], message: 'Required for PayOS' });
    }
    if (value.NODE_ENV === 'production') {
      if (value.PAYMENT_PROVIDER === 'mock')
        context.addIssue({
          code: 'custom',
          path: ['PAYMENT_PROVIDER'],
          message: 'Mock disabled in production',
        });
      if (!value.TICKET_SIGNING_KEY)
        context.addIssue({
          code: 'custom',
          path: ['TICKET_SIGNING_KEY'],
          message: 'Required in production',
        });
      if (!value.PAYMENT_RETURN_ORIGIN.startsWith('https://'))
        context.addIssue({
          code: 'custom',
          path: ['PAYMENT_RETURN_ORIGIN'],
          message: 'HTTPS required in production',
        });
    }
  });

export type Environment = z.infer<typeof environmentSchema>;

export function parseEnvironment(input: NodeJS.ProcessEnv): Environment {
  const result = environmentSchema.safeParse(input);
  if (!result.success) {
    // Report only field names: URLs may contain credentials.
    const fields = [...new Set(result.error.issues.map((issue) => issue.path.join('.')))];
    throw new Error(`Invalid environment fields: ${fields.join(', ')}. See .env.example.`);
  }
  return result.data;
}
