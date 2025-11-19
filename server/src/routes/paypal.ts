import { Router } from "express";
import { z } from "zod";
import { paypalClient, isPayPalConfigured } from "../paypalClient.js";
import { query, isDatabaseUnavailableError } from "../db.js";

// Import PayPal SDK types
// @ts-ignore - PayPal SDK types may not be available
import paypal from "@paypal/checkout-server-sdk";

export const paypalRouter = Router();

if (!isPayPalConfigured()) {
  console.warn("[paypal] PayPal routes registered but PayPal is not configured");
}

const createOrderSchema = z.object({
  email: z.string().email(),
  amount: z.number().positive(),
  currency: z.string().default("USD"),
  description: z.string().optional(),
});

const createSubscriptionSchema = z.object({
  email: z.string().email(),
  planId: z.string().min(1), // PayPal Plan ID
});

const captureOrderSchema = z.object({
  orderId: z.string().min(1),
  email: z.string().email(),
});

// POST /api/paypal/create-order - Create a one-time payment order (for micropayments)
paypalRouter.post("/create-order", async (req, res, next) => {
  try {
    if (!isPayPalConfigured() || !paypalClient) {
      return res.status(503).json({ error: "PayPal is not configured" });
    }

    const body = createOrderSchema.parse(req.body);

    // Look up account by email
    const accountResult = await query<{ id: string; email: string }>(
      `SELECT id, email FROM accounts WHERE email = $1`,
      [body.email]
    );

    if (accountResult.rows.length === 0) {
      return res.status(404).json({ error: "Account not found" });
    }

    const account = accountResult.rows[0];

    // Create PayPal order request
    const request = new paypal.orders.OrdersCreateRequest();
    request.prefer("return=representation");
    request.requestBody({
      intent: "CAPTURE",
      purchase_units: [
        {
          amount: {
            currency_code: body.currency,
            value: body.amount.toFixed(2),
          },
          description: body.description || "PriceGuard payment",
        },
      ],
      application_context: {
        brand_name: "PriceGuard",
        landing_page: "BILLING",
        user_action: "PAY_NOW",
        return_url: `${process.env.FRONTEND_URL || "http://localhost:3000"}/paypal/return`,
        cancel_url: `${process.env.FRONTEND_URL || "http://localhost:3000"}/paypal/cancel`,
      },
    });

    const order = await paypalClient.execute(request);

    if (!order.result.id) {
      throw new Error("Failed to create PayPal order");
    }

    // Store order ID in database for tracking
    await query(
      `UPDATE accounts SET updated_at = NOW() WHERE id = $1`,
      [account.id]
    );

    res.status(201).json({
      orderId: order.result.id,
      status: order.result.status,
      links: order.result.links,
    });
  } catch (error) {
    console.error("[paypal] Error creating order:", error);
    if (isDatabaseUnavailableError(error)) {
      return res.status(503).json({ error: "Service temporarily unavailable. Please try again later." });
    }
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Invalid input", details: error.errors });
    }
    if (error instanceof Error) {
      return res.status(500).json({ error: `Failed to create order: ${error.message}` });
    }
    next(error);
  }
});

// POST /api/paypal/capture-order - Capture a payment order
paypalRouter.post("/capture-order", async (req, res, next) => {
  try {
    if (!isPayPalConfigured() || !paypalClient) {
      return res.status(503).json({ error: "PayPal is not configured" });
    }

    const body = captureOrderSchema.parse(req.body);

    // Look up account by email
    const accountResult = await query<{ id: string; email: string }>(
      `SELECT id, email FROM accounts WHERE email = $1`,
      [body.email]
    );

    if (accountResult.rows.length === 0) {
      return res.status(404).json({ error: "Account not found" });
    }

    const account = accountResult.rows[0];

    // Capture the order
    const request = new paypal.orders.OrdersCaptureRequest(body.orderId);
    request.requestBody({});

    const capture = await paypalClient.execute(request);

    if (capture.result.status === "COMPLETED") {
      // Update account with PayPal payer ID
      const payerId = capture.result.payer?.payer_id;
      if (payerId) {
        await query(
          `UPDATE accounts SET paypal_payer_id = $1, updated_at = NOW() WHERE id = $2`,
          [payerId, account.id]
        );
      }

      res.status(200).json({
        orderId: capture.result.id,
        status: capture.result.status,
        payerId: payerId,
        amount: capture.result.purchase_units?.[0]?.payments?.captures?.[0]?.amount?.value,
      });
    } else {
      res.status(400).json({
        error: "Order capture failed",
        status: capture.result.status,
      });
    }
  } catch (error) {
    console.error("[paypal] Error capturing order:", error);
    if (isDatabaseUnavailableError(error)) {
      return res.status(503).json({ error: "Service temporarily unavailable. Please try again later." });
    }
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Invalid input", details: error.errors });
    }
    if (error instanceof Error) {
      return res.status(500).json({ error: `Failed to capture order: ${error.message}` });
    }
    next(error);
  }
});

// POST /api/paypal/create-subscription - Create a PayPal subscription
paypalRouter.post("/create-subscription", async (req, res, next) => {
  try {
    if (!isPayPalConfigured() || !paypalClient) {
      return res.status(503).json({ error: "PayPal is not configured" });
    }

    const body = createSubscriptionSchema.parse(req.body);

    // Look up account by email
    const accountResult = await query<{ id: string; email: string; paypal_payer_id: string | null }>(
      `SELECT id, email, paypal_payer_id FROM accounts WHERE email = $1`,
      [body.email]
    );

    if (accountResult.rows.length === 0) {
      return res.status(404).json({ error: "Account not found" });
    }

    const account = accountResult.rows[0];

    // Create subscription request
    const request = new paypal.subscriptions.SubscriptionsCreateRequest();
    request.requestBody({
      plan_id: body.planId,
      subscriber: {
        email_address: account.email,
      },
      application_context: {
        brand_name: "PriceGuard",
        locale: "en-US",
        shipping_preference: "NO_SHIPPING",
        user_action: "SUBSCRIBE_NOW",
        payment_method: {
          payer_selected: "PAYPAL",
          payee_preferred: "IMMEDIATE_PAYMENT_REQUIRED",
        },
        return_url: `${process.env.FRONTEND_URL || "http://localhost:3000"}/paypal/subscription/return`,
        cancel_url: `${process.env.FRONTEND_URL || "http://localhost:3000"}/paypal/subscription/cancel`,
      },
    });

    const subscription = await paypalClient.execute(request);

    if (!subscription.result.id) {
      throw new Error("Failed to create PayPal subscription");
    }

    // Update account with subscription ID
    await query(
      `UPDATE accounts SET paypal_subscription_id = $1, updated_at = NOW() WHERE id = $2`,
      [subscription.result.id, account.id]
    );

    res.status(201).json({
      subscriptionId: subscription.result.id,
      status: subscription.result.status,
      links: subscription.result.links,
    });
  } catch (error) {
    console.error("[paypal] Error creating subscription:", error);
    if (isDatabaseUnavailableError(error)) {
      return res.status(503).json({ error: "Service temporarily unavailable. Please try again later." });
    }
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Invalid input", details: error.errors });
    }
    if (error instanceof Error) {
      return res.status(500).json({ error: `Failed to create subscription: ${error.message}` });
    }
    next(error);
  }
});

// GET /api/paypal/subscription/:id - Get subscription details
paypalRouter.get("/subscription/:id", async (req, res, next) => {
  try {
    if (!isPayPalConfigured() || !paypalClient) {
      return res.status(503).json({ error: "PayPal is not configured" });
    }

    const subscriptionId = req.params.id;

    const request = new paypal.subscriptions.SubscriptionsGetRequest(subscriptionId);
    const subscription = await paypalClient.execute(request);

    res.json({
      id: subscription.result.id,
      status: subscription.result.status,
      planId: subscription.result.plan_id,
      startTime: subscription.result.start_time,
      nextBillingTime: subscription.result.billing_info?.next_billing_time,
    });
  } catch (error) {
    console.error("[paypal] Error getting subscription:", error);
    if (error instanceof Error) {
      return res.status(500).json({ error: `Failed to get subscription: ${error.message}` });
    }
    next(error);
  }
});

// POST /api/paypal/cancel-subscription - Cancel a subscription
paypalRouter.post("/cancel-subscription", async (req, res, next) => {
  try {
    if (!isPayPalConfigured() || !paypalClient) {
      return res.status(503).json({ error: "PayPal is not configured" });
    }

    const body = z.object({
      email: z.string().email(),
      reason: z.string().optional(),
    }).parse(req.body);

    // Look up account by email
    const accountResult = await query<{ id: string; paypal_subscription_id: string | null }>(
      `SELECT id, paypal_subscription_id FROM accounts WHERE email = $1`,
      [body.email]
    );

    if (accountResult.rows.length === 0) {
      return res.status(404).json({ error: "Account not found" });
    }

    const account = accountResult.rows[0];

    if (!account.paypal_subscription_id) {
      return res.status(400).json({ error: "No active PayPal subscription found" });
    }

    // Cancel subscription
    const request = new paypal.subscriptions.SubscriptionsCancelRequest(account.paypal_subscription_id);
    request.requestBody({
      reason: body.reason || "User requested cancellation",
    });

    await paypalClient.execute(request);

    // Update account
    await query(
      `UPDATE accounts SET paypal_subscription_id = NULL, subscription_status = 'cancelled', updated_at = NOW() WHERE id = $1`,
      [account.id]
    );

    res.status(200).json({ success: true });
  } catch (error) {
    console.error("[paypal] Error canceling subscription:", error);
    if (isDatabaseUnavailableError(error)) {
      return res.status(503).json({ error: "Service temporarily unavailable. Please try again later." });
    }
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Invalid input", details: error.errors });
    }
    if (error instanceof Error) {
      return res.status(500).json({ error: `Failed to cancel subscription: ${error.message}` });
    }
    next(error);
  }
});

