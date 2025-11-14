import { Pool, PoolClient, QueryResult, QueryResultRow } from "pg";
import { readFileSync } from "fs";
import path from "path";
import dotenv from "dotenv";

dotenv.config({ path: process.env.DOTENV_CONFIG_PATH });

const DATABASE_UNAVAILABLE_CODE = "DATABASE_UNAVAILABLE";

let pool: Pool | null = null;
let lastError: Error | null = null;

function createUnavailableError(message?: string) {
  const error = new Error(message ?? lastError?.message ?? "Database connection not available");
  (error as Error & { code: string }).code = DATABASE_UNAVAILABLE_CODE;
  return error as Error & { code: string };
}

export function isDatabaseUnavailableError(error: unknown): error is Error & { code: string } {
  return Boolean(
    error &&
      typeof error === "object" &&
      "code" in error &&
      (error as { code: string }).code === DATABASE_UNAVAILABLE_CODE
  );
}

export async function initDatabase(): Promise<boolean> {
  if (!process.env.DATABASE_URL) {
    lastError = new Error("DATABASE_URL environment variable is required");
    console.warn(`[db] ${lastError.message}`);
    pool = null;
    return false;
  }

  const sslMode = process.env.PGSSLMODE ?? "require";
  const caFilePath = process.env.PGSSLROOTCERT
    ? path.resolve(process.cwd(), process.env.PGSSLROOTCERT)
    : undefined;

  const sslConfig =
    sslMode === "disable"
      ? false
      : {
          rejectUnauthorized: sslMode !== "allow",
          ca: caFilePath ? readFileSync(caFilePath, "utf8") : undefined,
        };

  const candidatePool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: sslConfig,
  });

  try {
    await candidatePool.query("SELECT 1");
    pool = candidatePool;
    lastError = null;
    console.info("[db] Connected to PostgreSQL");
    return true;
  } catch (error) {
    lastError = error as Error;
    console.warn(`[db] Failed to connect to PostgreSQL: ${lastError.message}`);
    await candidatePool.end().catch(() => void 0);
    pool = null;
    return false;
  }
}

async function withClient<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  if (!pool) {
    throw createUnavailableError();
  }

  let client: PoolClient | null = null;
  try {
    client = await pool.connect();
  } catch (error) {
    lastError = error as Error;
    throw createUnavailableError();
  }

  try {
    const result = await fn(client);
    return result;
  } catch (error) {
    lastError = error as Error;
    throw error;
  } finally {
    client.release();
  }
}

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<QueryResult<T>> {
  try {
    return await withClient((client) => client.query<T>(text, params));
  } catch (error) {
    if (isDatabaseUnavailableError(error)) {
      throw error;
    }
    throw error;
  }
}

export function getDatabaseStatus() {
  return {
    connected: pool !== null && lastError === null,
    lastError,
  };
}

export async function closeDatabase() {
  if (pool) {
    await pool.end().catch(() => void 0);
    pool = null;
  }
}
