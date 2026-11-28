export interface MySqlConfig {
  enabled: boolean;
  host: string;
  port: number;
  user: string;
  passwordConfigured: boolean;
  database: string;
  connectionLimit: number;
  sslEnabled: boolean;
}

export function getMySqlConfig(): MySqlConfig {
  const host = (process.env.MYSQL_HOST || '').trim();
  const port = Number(process.env.MYSQL_PORT || 3306);
  const user = (process.env.MYSQL_USER || '').trim();
  const password = process.env.MYSQL_PASSWORD || '';
  const database = (process.env.MYSQL_DATABASE || 'satark_setu').trim();
  const sslEnabled = process.env.MYSQL_SSL === 'true';

  return {
    enabled: Boolean(host && user && database),
    host: host || '127.0.0.1',
    port: Number.isFinite(port) && port > 0 ? port : 3306,
    user: user || 'satark_app',
    passwordConfigured: password.length > 0,
    database,
    connectionLimit: Number(process.env.MYSQL_POOL_LIMIT || 10),
    sslEnabled,
  };
}

export function getMySqlPublicSummary() {
  const cfg = getMySqlConfig();
  return {
    engine: 'mysql',
    configured: cfg.enabled,
    host: cfg.enabled ? cfg.host : 'not-configured',
    port: cfg.port,
    database: cfg.database,
    sslEnabled: cfg.sslEnabled,
  };
}
