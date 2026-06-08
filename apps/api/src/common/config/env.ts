import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  FIO_WEB_ORIGIN: z.string().url().default('http://localhost:5173'),
  KEYCLOAK_ISSUER: z.string().url().default('http://localhost:8080/realms/fio'),
  KEYCLOAK_AUDIENCE: z.string().default('fio-api'),
  PORT: z.coerce.number().int().positive().default(3000),
});

export type AppEnv = z.infer<typeof envSchema>;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): AppEnv {
  return envSchema.parse(source);
}
