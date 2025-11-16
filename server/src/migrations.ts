import { initDatabase, query } from "./db.js";

export async function runMigrations(): Promise<boolean> {
  const ready = await initDatabase();

  if (!ready) {
    console.warn("[migrations] Database unavailable. Skipping migrations.");
    return false;
  }

  await query(`CREATE EXTENSION IF NOT EXISTS citext;`);
  await query(`CREATE EXTENSION IF NOT EXISTS pgcrypto;`);

  await query(`
    CREATE TABLE IF NOT EXISTS accounts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email CITEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      credit_card_token TEXT,
      card_last4 CHAR(4),
      billing_zip TEXT,
      expiry_month SMALLINT,
      expiry_year SMALLINT,
      plan TEXT NOT NULL,
      past_due BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  // Stripe integration columns (idempotent ALTER TABLE with IF NOT EXISTS)
  await query(`
    ALTER TABLE accounts
      ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
      ADD COLUMN IF NOT EXISTS stripe_default_payment_method_id TEXT,
      ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
      ADD COLUMN IF NOT EXISTS subscription_status TEXT,
      ADD COLUMN IF NOT EXISTS stripe_price_id TEXT,
      ADD COLUMN IF NOT EXISTS stripe_latest_invoice_id TEXT,
      ADD COLUMN IF NOT EXISTS stripe_latest_invoice_status TEXT;
  `);

  await query(`CREATE INDEX IF NOT EXISTS accounts_email_idx ON accounts (email);`);

  return true;
}
