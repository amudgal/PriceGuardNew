import argon2 from "argon2";
import { query, isDatabaseUnavailableError } from "./db.js";

export interface CreateAccountInput {
  email: string;
  password: string;
  creditCardToken?: string | null;
  cardLast4?: string | null;
  billingZip?: string | null;
  expiryMonth?: number | null;
  expiryYear?: number | null;
  plan: string;
}

export interface AccountRecord {
  id: string;
  email: string;
  plan: string;
  past_due: boolean;
  card_last4: string | null;
}

export async function createAccount(input: CreateAccountInput) {
  const passwordHash = await argon2.hash(input.password, {
    type: argon2.argon2id,
    memoryCost: 64 * 1024,
    parallelism: 1,
    timeCost: 3,
  });

  try {
    const result = await query<AccountRecord>(
      `INSERT INTO accounts (
        email,
        password_hash,
        credit_card_token,
        card_last4,
        billing_zip,
        expiry_month,
        expiry_year,
        plan
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (email) DO NOTHING
      RETURNING id, email, plan, past_due, card_last4`,
      [
        input.email,
        passwordHash,
        input.creditCardToken ?? null,
        input.cardLast4 ?? null,
        input.billingZip ?? null,
        input.expiryMonth ?? null,
        input.expiryYear ?? null,
        input.plan,
      ]
    );

    if (result.rows.length === 0) {
      throw new Error("An account with this email already exists.");
    }

    return result.rows[0];
  } catch (error) {
    if (isDatabaseUnavailableError(error)) {
      throw error;
    }
    throw error;
  }
}

export async function authenticateAccount(email: string, password: string) {
  try {
    const result = await query(
      `SELECT id, email, password_hash, card_last4, plan, past_due
       FROM accounts
       WHERE email = $1`,
      [email]
    );

    const account = result.rows[0] as (AccountRecord & { password_hash: string }) | undefined;

    if (!account) {
      return null;
    }

    const isValid = await argon2.verify(account.password_hash, password);

    if (!isValid) {
      return null;
    }

    const { password_hash: _passwordHash, ...rest } = account;
    return rest;
  } catch (error) {
    if (isDatabaseUnavailableError(error)) {
      throw error;
    }
    throw error;
  }
}
