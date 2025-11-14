import { Pool, PoolClient, QueryResultRow } from "pg";
import dotenv from "dotenv";
import fs from "fs";

dotenv.config({ path: process.env.DOTENV_CONFIG_PATH });

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is required");
}
const ssl =
  process.env.PGSSLMODE === "disable"
    ? false
    : {
        rejectUnauthorized: process.env.PGSSLMODE !== "allow",
        ca: process.env.PGSSLROOTCERT ? fs.readFileSync(process.env.PGSSLROOTCERT).toString() : undefined,
      };

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
      errorMessage.includes("enotfound")
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
