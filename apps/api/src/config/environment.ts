import { z } from 'zod';

const environmentSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
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
