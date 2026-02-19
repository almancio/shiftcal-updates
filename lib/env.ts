import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  APP_BASE_URL: z.string().url().optional(),
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
  ADMIN_TOKEN: z.string().min(12).optional(),
  ANALYTICS_SALT: z.string().min(1).default('shiftcal-analytics-salt'),
  STORAGE_DIR: z.string().min(1).default('./storage'),
  EXPO_PRIVATE_KEY_PEM: z.string().optional(),
  EXPO_CODE_SIGN_KEY_ID: z.string().min(1).default('main'),
  EXPO_CODE_SIGN_ALG: z.string().min(1).default('rsa-v1_5-sha256')
});

export type AppEnv = z.infer<typeof envSchema>;

let cachedEnv: AppEnv | null = null;

export function getEnv(): AppEnv {
  if (cachedEnv) {
    return cachedEnv;
  }

  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const formatted = parsed.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join(' | ');
    throw new Error(`Invalid environment variables: ${formatted}`);
  }

  cachedEnv = parsed.data;
  return cachedEnv;
}

export function requireEnv<Key extends keyof AppEnv>(name: Key): NonNullable<AppEnv[Key]> {
  const value = getEnv()[name];
  if (value === undefined || value === null || value === '') {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value as NonNullable<AppEnv[Key]>;
}
