// Stripe is an optional dependency at runtime; the type-only import prevents
// TypeScript from failing to compile if the module types are not available.
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import Stripe from "stripe";
import dotenv from "dotenv";
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

const secretKey = process.env.STRIPE_SECRET_KEY;

if (!secretKey) {
  throw new Error("STRIPE_SECRET_KEY environment variable is required for Stripe integration");
}

export const stripe = new Stripe(secretKey, {
  apiVersion: "2025-10-29.clover",
});


