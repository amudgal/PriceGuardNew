/**
 * PayPal Webhook Handler
 * 
 * Handles PayPal webhook events for subscriptions and payments.
 * IMPORTANT: This handler assumes the route is mounted with express.raw()
 * so that req.body is a Buffer containing the raw request body.
 */

import type express from "express";
import { paypalClient, isPayPalConfigured } from "../paypalClient.js";
import { query } from "../db.js";

// Import PayPal SDK types
// @ts-ignore - PayPal SDK types may not be available
import paypal from "@paypal/checkout-server-sdk";

export async function paypalWebhookHandler(req: express.Request, res: express.Response) {
  const webhookId = process.env.PAYPAL_WEBHOOK_ID;
  const webhookSignature = req.headers["paypal-transmission-sig"] as string;
  const webhookCert = req.headers["paypal-cert-url"] as string;
  const webhookAuthAlgo = req.headers["paypal-auth-algo"] as string;
  const webhookTransmissionId = req.headers["paypal-transmission-id"] as string;
  const webhookTransmissionTime = req.headers["paypal-transmission-time"] as string;

  if (!isPayPalConfigured() || !paypalClient) {
    console.error("[paypal] PayPal is not configured for webhook handling");
    return res.status(500).send("PayPal webhook not configured");
  }

  if (!webhookId) {
    console.error("[paypal] PAYPAL_WEBHOOK_ID is not configured");
    return res.status(500).send("Webhook not configured");
  }

  if (!webhookSignature || !webhookCert || !webhookAuthAlgo || !webhookTransmissionId || !webhookTransmissionTime) {
    console.warn("[paypal] Missing PayPal webhook headers");
    return res.status(400).send("Missing required webhook headers");
  }

  // Verify webhook signature
  let event: any;
  try {
    const request = new paypal.notifications.WebhooksVerifyRequest();
    request.requestBody({
      auth_algo: webhookAuthAlgo,
      cert_url: webhookCert,
      transmission_id: webhookTransmissionId,
      transmission_sig: webhookSignature,
      transmission_time: webhookTransmissionTime,
      webhook_id: webhookId,
      webhook_event: req.body,
    });

    const verification = await paypalClient.execute(request);
    if (verification.result.verification_status !== "SUCCESS") {
      console.error("[paypal] Webhook signature verification failed");
      return res.status(400).send("Webhook verification failed");
    }

    // Parse the event
    event = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
  } catch (err) {
    console.error("[paypal] Webhook verification error:", err);
    return res.status(400).send(`Webhook Error: ${(err as Error).message}`);
  }

  try {
    console.log(`[paypal] Processing webhook event: ${event.event_type}`);

    switch (event.event_type) {
      case "BILLING.SUBSCRIPTION.CREATED":
      case "BILLING.SUBSCRIPTION.UPDATED": {
        const subscription = event.resource as {
          id: string;
          status: string;
          subscriber?: { email_address?: string };
          plan_id?: string;
        };

        if (subscription.subscriber?.email_address) {
          await query(
            `
            UPDATE accounts
            SET
              paypal_subscription_id = $1,
              subscription_status = $2,
              stripe_price_id = COALESCE($3, stripe_price_id),
              updated_at = NOW()
            WHERE email = $4
          `,
            [subscription.id, subscription.status, subscription.plan_id || null, subscription.subscriber.email_address]
          );
        }
        break;
      }

      case "BILLING.SUBSCRIPTION.CANCELLED": {
        const subscription = event.resource as {
          id: string;
          subscriber?: { email_address?: string };
        };

        if (subscription.subscriber?.email_address) {
          await query(
            `
            UPDATE accounts
            SET
              subscription_status = 'cancelled',
              updated_at = NOW()
            WHERE email = $1 AND paypal_subscription_id = $2
          `,
            [subscription.subscriber.email_address, subscription.id]
          );
        }
        break;
      }

      case "BILLING.SUBSCRIPTION.PAYMENT.FAILED": {
        const subscription = event.resource as {
          id: string;
          subscriber?: { email_address?: string };
        };

        if (subscription.subscriber?.email_address) {
          await query(
            `
            UPDATE accounts
            SET
              past_due = true,
              updated_at = NOW()
            WHERE email = $1 AND paypal_subscription_id = $2
          `,
            [subscription.subscriber.email_address, subscription.id]
          );
        }
        break;
      }

      case "PAYMENT.SALE.COMPLETED": {
        const sale = event.resource as {
          id: string;
          payer_email?: string;
          amount?: { total?: string; currency?: string };
        };

        if (sale.payer_email) {
          await query(
            `
            UPDATE accounts
            SET
              past_due = false,
              updated_at = NOW()
            WHERE email = $1
          `,
            [sale.payer_email]
          );
        }
        break;
      }

      case "PAYMENT.SALE.DENIED": {
        const sale = event.resource as {
          id: string;
          payer_email?: string;
        };

        if (sale.payer_email) {
          await query(
            `
            UPDATE accounts
            SET
              past_due = true,
              updated_at = NOW()
            WHERE email = $1
          `,
            [sale.payer_email]
          );
        }
        break;
      }

      default:
        console.log(`[paypal] Unhandled event type: ${event.event_type}`);
    }

    // Always return 200 to acknowledge receipt
    res.json({ received: true });
  } catch (err) {
    console.error("[paypal] Error processing webhook event:", err);
    // Return 200 so PayPal does not keep retrying forever, but log for investigation
    res.json({ received: true });
  }
}

