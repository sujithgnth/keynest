const DEFAULT_WEB_ORIGIN = 'http://localhost:3000';

export interface RuntimeConfig {
  allowedOrigins: string[];
  port: number;
  trustProxy: boolean;
}

export function loadRuntimeConfig(): RuntimeConfig {
  const isProduction = process.env.NODE_ENV === 'production';
  const configuredOrigins = process.env.WEB_ORIGINS;
  if (isProduction && !configuredOrigins) {
    throw new Error('WEB_ORIGINS is required in production');
  }

  const allowedOrigins = (configuredOrigins ?? DEFAULT_WEB_ORIGIN)
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
    .map((origin) => new URL(origin).origin);
  const port = Number(process.env.PORT ?? 3333);
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error('PORT must be an integer between 1 and 65535');
  }

  return {
    allowedOrigins,
    port,
    trustProxy: process.env.TRUST_PROXY === 'true',
  };
}
