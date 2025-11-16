import type express from "express";
import { stripe } from "../stripeClient.js";
import { query } from "../db.js";

// IMPORTANT:
// This handler assumes the route is mounted with express.raw({ type: "application/json" })
// so that req.body is a Buffer containing the raw request body.

export async function stripeWebhookHandler(req: express.Request, res: express.Response) {
  const sig = req.headers["stripe-signature"];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error("[stripe] STRIPE_WEBHOOK_SECRET is not configured");
    return res.status(500).send("Webhook not configured");
  }

  if (!sig) {
    console.warn("[stripe] Missing Stripe-Signature header");
    return res.status(400).send("Missing Stripe-Signature header");
  }

  let event: any;

  try {
    // req.body is a Buffer because we use express.raw for this route
    const rawBody = req.body as Buffer;
    event = stripe.webhooks.constructEvent(rawBody, sig.toString(), webhookSecret);
  } catch (err) {
    console.error("[stripe] Webhook signature verification failed:", err);
    return res.status(400).send(`Webhook Error: ${(err as Error).message}`);
  }

  try {
    switch (event.type) {
      case "payment_method.attached": {
        const paymentMethod = event.data.object as {
          id: string;
          customer: string | null;
          card?: { last4?: string | null } | null;
        };

        if (paymentMethod.customer) {
          const last4 = paymentMethod.card?.last4 ?? null;
          await query(
            `
            UPDATE accounts
            SET
              stripe_default_payment_method_id = $1,
              card_last4 = COALESCE($2, card_last4),
              updated_at = NOW()
            WHERE stripe_customer_id = $3
          `,
            [paymentMethod.id, last4, paymentMethod.customer]
          );
        }
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription = event.data.object as {
          id: string;
          customer: string;
          status: string;
          items?: { data?: Array<{ price?: { id?: string | null } | null }> } | null;
        };

        const priceId =
          subscription.items?.data?.[0]?.price?.id ?? null;

        await query(
          `
          UPDATE accounts
          SET
            stripe_subscription_id = $1,
            subscription_status = $2,
            stripe_price_id = COALESCE($3, stripe_price_id),
            past_due = CASE WHEN $2 = 'past_due' THEN true ELSE past_due END,
            updated_at = NOW()
          WHERE stripe_customer_id = $4
        `,
          [subscription.id, subscription.status, priceId, subscription.customer]
        );
        break;
      }
      case "invoice.payment_succeeded": {
        const invoice = event.data.object as {
          id: string;
          customer: string;
          status: string;
        };

        await query(
          `
          UPDATE accounts
          SET
            stripe_latest_invoice_id = $1,
            stripe_latest_invoice_status = $2,
            past_due = false,
            updated_at = NOW()
          WHERE stripe_customer_id = $3
        `,
          [invoice.id, invoice.status, invoice.customer]
        );
        break;
      }
      case "invoice.payment_failed": {
        const invoice = event.data.object as {
          id: string;
          customer: string;
          status: string;
        };

        await query(
          `
          UPDATE accounts
          SET
            stripe_latest_invoice_id = $1,
            stripe_latest_invoice_status = $2,
            past_due = true,
            updated_at = NOW()
          WHERE stripe_customer_id = $3
        `,
          [invoice.id, invoice.status, invoice.customer]
        );
        break;
      }
      default:
        // For now, just log other events. You can extend this as needed.
        console.log(`[stripe] Unhandled event type: ${event.type}`);
    }

    // Always return 200 to acknowledge receipt
    res.json({ received: true });
  } catch (err) {
    console.error("[stripe] Error processing webhook event:", err);
    // Return 200 so Stripe does not keep retrying forever, but log for investigation
    res.json({ received: true });
  }
}


