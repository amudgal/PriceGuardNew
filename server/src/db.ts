import { Pool, PoolClient, QueryResultRow } from "pg";
import dotenv from "dotenv";
import fs from "fs";

dotenv.config({ path: process.env.DOTENV_CONFIG_PATH });

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is required");
}

// Configure SSL based on PGSSLMODE
let ssl: false | { rejectUnauthorized: boolean; ca?: string } = false;

if (process.env.PGSSLMODE !== "disable") {
  let ca: string | undefined;
  
  // Try to read CA certificate if path is provided
  if (process.env.PGSSLROOTCERT) {
    try {
      if (fs.existsSync(process.env.PGSSLROOTCERT)) {
        ca = fs.readFileSync(process.env.PGSSLROOTCERT, "utf8");
        console.log(`[db] Loaded SSL CA certificate from ${process.env.PGSSLROOTCERT}`);
      } else {
        console.warn(`[db] SSL CA certificate file not found: ${process.env.PGSSLROOTCERT}`);
        console.warn(`[db] Continuing without CA certificate (less secure)`);
      }
    } catch (error) {
      console.error(`[db] Error reading SSL CA certificate: ${error}`);
      console.warn(`[db] Continuing without CA certificate (less secure)`);
    }
  }
  
  // Determine rejectUnauthorized based on SSL mode
  // verify-full, verify-ca: reject unauthorized (require valid cert)
  // require, prefer: don't reject (use SSL but don't verify cert)
  // allow: don't reject (prefer non-SSL but allow SSL)
  const rejectUnauthorized = 
    process.env.PGSSLMODE === "verify-full" || 
    process.env.PGSSLMODE === "verify-ca";
  
  ssl = {
    rejectUnauthorized,
    ...(ca && { ca }),
  };
  
  console.log(`[db] SSL mode: ${process.env.PGSSLMODE}, rejectUnauthorized: ${rejectUnauthorized}`);
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl,
});

// Database availability check
let databaseAvailable = true;

pool.on("error", (err) => {
  console.error("[db] Unexpected error on idle client", err);
  databaseAvailable = false;
});

export async function initDatabase(): Promise<boolean> {
  try {
    await pool.query("SELECT 1");
    databaseAvailable = true;
    return true;
  } catch (error) {
    console.error("[db] Failed to connect to PostgreSQL:", error);
    databaseAvailable = false;
    return false;
  }
}

// Check if error is a database unavailable error
export function isDatabaseUnavailableError(error: unknown): boolean {
  if (!databaseAvailable) {
    return true;
  }
  
  if (error instanceof Error) {
    // Check for common database connection errors
    const errorMessage = error.message.toLowerCase();
    return (
      errorMessage.includes("connection") ||
      errorMessage.includes("database") ||
      errorMessage.includes("timeout") ||
      errorMessage.includes("econnrefused") ||
      errorMessage.includes("enotfound") ||
      errorMessage.includes("ssl") ||
      errorMessage.includes("certificate") ||
      errorMessage.includes("self-signed")
    );
  }
  
  return false;
}

// Query helper function
export async function query<T extends QueryResultRow = any>(
  text: string,
  params?: any[]
): Promise<{ rows: T[]; rowCount: number }> {
  const client = await pool.connect();
  try {
    const result = await client.query<T>(text, params);
    return { rows: result.rows, rowCount: result.rowCount || 0 };
  } finally {
    client.release();
  }
}

export async function withClient<T>(fn: (client: PoolClient) => Promise<T>) {
  const client = await pool.connect();
  try {
    return await fn(client);
  } finally {
    client.release();
  }
}
