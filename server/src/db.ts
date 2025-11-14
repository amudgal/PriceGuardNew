import { Pool, PoolClient } from "pg";
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


export async function withClient<T>(fn: (client: PoolClient) => Promise<T>) {
  const client = await pool.connect();
  try {
    return await fn(client);
  } finally {
    client.release();
  }
}
