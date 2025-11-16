import { Pool, PoolClient, QueryResultRow } from "pg";
import dotenv from "dotenv";
import fs from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

// Load .env file from server directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, "..", ".env") });
// Also support DOTENV_CONFIG_PATH if explicitly set
if (process.env.DOTENV_CONFIG_PATH) {
  dotenv.config({ path: process.env.DOTENV_CONFIG_PATH, override: false });
}

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
  
  // When rejectUnauthorized is false (require/prefer/allow modes), 
  // don't provide CA certificate to avoid certificate chain validation issues
  // Only include CA when we're doing strict verification (verify-full/verify-ca)
  if (rejectUnauthorized && ca) {
    // Strict verification: include CA for proper certificate chain validation
    ssl = {
      rejectUnauthorized: true,
      ca,
    };
    console.log(`[db] SSL mode: ${process.env.PGSSLMODE}, rejectUnauthorized: true, CA certificate loaded for verification`);
  } else if (!rejectUnauthorized) {
    // Non-strict modes: don't validate certificate chain
    // Don't include CA to avoid certificate chain issues
    ssl = {
      rejectUnauthorized: false,
    };
    console.log(`[db] SSL mode: ${process.env.PGSSLMODE}, rejectUnauthorized: false, skipping certificate validation`);
  } else {
    // Strict mode but no CA available - should not happen but handle gracefully
    ssl = {
      rejectUnauthorized: true,
    };
    console.warn(`[db] SSL mode: ${process.env.PGSSLMODE} requires CA certificate but none provided`);
  }
}

// Parse and fix DATABASE_URL to handle special characters in password (e.g., #, @, :)
// The pg-connection-string library uses new URL() which breaks if password contains #
let connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL environment variable is required");
}

// Fix DATABASE_URL if it contains unencoded special characters in password
// Extract components and reconstruct with proper encoding
try {
  // Try to parse as URL first
  const urlMatch = connectionString.match(/^postgres:\/\/([^:]+):([^@]+)@([^\/]+)\/(.+)$/);
  if (urlMatch) {
    const [, username, password, host, database] = urlMatch;
    // Reconstruct with URL-encoded password to handle special characters like #
    const encodedPassword = encodeURIComponent(password);
    connectionString = `postgres://${username}:${encodedPassword}@${host}/${database}`;
    console.log(`[db] Fixed DATABASE_URL to handle special characters in password`);
  }
} catch (error) {
  // If parsing fails, use as-is
  console.warn(`[db] Could not parse DATABASE_URL format, using as-is: ${error instanceof Error ? error.message : String(error)}`);
}

export const pool = new Pool({
  connectionString,
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
