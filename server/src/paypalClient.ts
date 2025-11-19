/**
 * PayPal Client Configuration
 * 
 * Initializes the PayPal SDK with credentials from environment variables.
 * Supports both Sandbox (testing) and Live (production) modes.
 */

import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
// PayPal SDK - types may not be available, so we use @ts-ignore
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import paypal from "@paypal/checkout-server-sdk";

// Load .env file from server directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, "..", ".env") });
// Also support DOTENV_CONFIG_PATH if explicitly set
if (process.env.DOTENV_CONFIG_PATH) {
  dotenv.config({ path: process.env.DOTENV_CONFIG_PATH, override: false });
}

const clientId = process.env.PAYPAL_CLIENT_ID;
const clientSecret = process.env.PAYPAL_SECRET;
const mode = process.env.PAYPAL_MODE || "sandbox"; // "sandbox" or "live"

if (!clientId || !clientSecret) {
  console.warn(
    "[paypal] PAYPAL_CLIENT_ID or PAYPAL_SECRET is not set. PayPal integration will be disabled."
  );
}

/**
 * PayPal Environment Configuration
 */
function environment(): any {
  if (mode === "live") {
    return new paypal.core.LiveEnvironment(clientId!, clientSecret!);
  }
  return new paypal.core.SandboxEnvironment(clientId!, clientSecret!);
}

/**
 * PayPal Client Instance
 * 
 * Use this to make PayPal API calls:
 * 
 * ```typescript
 * const request = new paypal.orders.OrdersCreateRequest();
 * request.requestBody({ ... });
 * const response = await paypalClient.execute(request);
 * ```
 */
export const paypalClient: any = clientId && clientSecret
  ? new paypal.core.PayPalHttpClient(environment())
  : null;

/**
 * Check if PayPal is configured
 */
export function isPayPalConfigured(): boolean {
  return !!(clientId && clientSecret && paypalClient);
}

/**
 * Get PayPal Client ID (for frontend)
 */
export function getPayPalClientId(): string | undefined {
  return clientId;
}

/**
 * Get PayPal Mode (sandbox/live)
 */
export function getPayPalMode(): string {
  return mode;
}

console.log(
  `[paypal] PayPal integration ${isPayPalConfigured() ? "enabled" : "disabled"} (mode: ${mode})`
);

