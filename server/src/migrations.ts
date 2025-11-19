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

  // PayPal integration columns (idempotent ALTER TABLE with IF NOT EXISTS)
  await query(`
    ALTER TABLE accounts
      ADD COLUMN IF NOT EXISTS paypal_payer_id TEXT,
      ADD COLUMN IF NOT EXISTS paypal_subscription_id TEXT,
      ADD COLUMN IF NOT EXISTS paypal_payment_method_token TEXT,
      ADD COLUMN IF NOT EXISTS paypal_billing_agreement_id TEXT;
  `);

  await query(`CREATE INDEX IF NOT EXISTS accounts_email_idx ON accounts (email);`);

  // Create monitored_products table for tracking products users want to monitor
  await query(`
    CREATE TABLE IF NOT EXISTS monitored_products (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
      product_name TEXT NOT NULL,
      product_id TEXT NOT NULL,
      purchase_price DECIMAL(10, 2),
      purchase_date DATE,
      category TEXT,
      receipt_url TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT unique_user_product UNIQUE(user_id, product_id)
    );
  `);

  // Create indexes for efficient queries
  await query(`CREATE INDEX IF NOT EXISTS monitored_products_user_id_idx ON monitored_products (user_id);`);
  await query(`CREATE INDEX IF NOT EXISTS monitored_products_product_id_idx ON monitored_products (product_id);`);
  await query(`CREATE INDEX IF NOT EXISTS monitored_products_created_at_idx ON monitored_products (created_at DESC);`);

  return true;
}
