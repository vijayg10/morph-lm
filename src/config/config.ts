import { z } from 'zod';

const envSchema = z.object({
  HOST: z.string().default('0.0.0.0'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  API_KEY: z.string().min(1, 'API_KEY is required'),
  ENABLE_GEMINI: z
    .string()
    .default('true')
    .transform((v) => v.toLowerCase() === 'true'),
  ENABLE_CLAUDE: z
    .string()
    .default('true')
    .transform((v) => v.toLowerCase() === 'true'),
  ENABLE_AIDER: z
    .string()
    .default('false')
    .transform((v) => v.toLowerCase() === 'true'),
  WORKSPACES: z
    .string()
    .default('')
    .transform((v) => (v ? v.split(',').map((p) => p.trim()).filter(Boolean) : [])),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  AGENT_TIMEOUT_MS: z.coerce.number().int().min(1000).default(300000),
  AGENT_CONCURRENCY_LIMIT: z.coerce.number().int().min(1).default(5),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().min(1000).default(60000),
  RATE_LIMIT_MAX: z.coerce.number().int().min(1).default(100),
});

export type Config = z.infer<typeof envSchema>;

export function loadConfig(): Config {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    const errors = result.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join('\n');
    throw new Error(`Configuration validation failed:\n${errors}`);
  }
  return result.data;
}
