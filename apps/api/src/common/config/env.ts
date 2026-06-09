import { config } from 'dotenv';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  FIO_WEB_ORIGIN: z.string().url().default('http://localhost:5173'),
  KEYCLOAK_ISSUER: z.string().url().default('http://localhost:8080/realms/fio'),
  KEYCLOAK_AUDIENCE: z.string().default('fio-api'),
  PORT: z.coerce.number().int().positive().default(3000),
});

let localEnvLoaded = false;

export type AppEnv = z.infer<typeof envSchema>;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): AppEnv {
  loadLocalEnvFiles();

  return envSchema.parse(source);
}

function loadLocalEnvFiles(): void {
  if (localEnvLoaded) {
    return;
  }

  localEnvLoaded = true;

  for (const envFilePath of getLocalEnvFilePaths()) {
    if (existsSync(envFilePath)) {
      config({ path: envFilePath });
    }
  }
}

function getLocalEnvFilePaths(): string[] {
  return [resolve(process.cwd(), '.env'), resolve(process.cwd(), '../../.env')];
}
