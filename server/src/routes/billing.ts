import { Router } from "express";
import { z } from "zod";
import Stripe from "stripe";
import { stripe } from "../stripeClient.js";
import { query, isDatabaseUnavailableError } from "../db.js";

// NOTE: This router is intentionally designed so that
// no raw card data (PAN, CVV, expiry) ever passes through the backend.
// The frontend must use Stripe.js / Elements or Checkout so that
// card details are sent directly from the browser to Stripe over HTTPS.

const createSetupIntentSchema = z.object({
  // In a production app this would come from the authenticated user context
  email: z.string().email(),
  plan: z.string().min(1).optional(),
  // Optional Stripe price identifier for subscriptions
  priceId: z.string().min(1).optional(),
});

const getSubscriptionSchema = z.object({
  email: z.string().email(),
});

export const billingRouter = Router();

billingRouter.post("/create-setup-intent", async (req, res, next) => {
  try {
    const body = createSetupIntentSchema.parse(req.body);

    // Look up account by email
    const accountResult = await query<{
      id: string;
      email: string;
      stripe_customer_id: string | null;
      stripe_price_id: string | null;
    }>(
      `
      SELECT id, email, stripe_customer_id, stripe_price_id
      FROM accounts
      WHERE email = $1
    `,
      [body.email]
    );

    if (accountResult.rows.length === 0) {
      return res.status(404).json({ error: "Account not found" });
    }

    const account = accountResult.rows[0];

    // Ensure a Stripe Customer exists for this account
    let customerId = account.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: account.email,
      });

      customerId = customer.id;

      await query(
        `
        UPDATE accounts
        SET stripe_customer_id = $1
        WHERE id = $2
      `,
        [customerId, account.id]
      );
    }

    // Store price/plan metadata if provided
    if (body.priceId) {
      await query(
        `
        UPDATE accounts
        SET stripe_price_id = $1
        WHERE id = $2
      `,
        [body.priceId, account.id]
      );
    }

    // Create a SetupIntent for off-session usage
    const setupIntent = await stripe.setupIntents.create({
      customer: customerId,
      usage: "off_session",
    });

    if (!setupIntent.client_secret) {
      throw new Error("Failed to create SetupIntent client secret");
    }

    // Return only the client_secret to the frontend.
    // The frontend will use Stripe.js / Elements to handle card details.
    res.status(201).json({
      clientSecret: setupIntent.client_secret,
      customerId,
    });
  } catch (error) {
    console.error("[billing] Error creating setup intent:", error);
    if (isDatabaseUnavailableError(error)) {
      return res.status(503).json({ error: "Service temporarily unavailable. Please try again later." });
    }
    // Return more detailed error information
    if (error instanceof Error) {
      return res.status(500).json({ error: `Failed to create setup intent: ${error.message}` });
    }
    next(error);
  }
});

// Save payment method after SetupIntent confirmation
billingRouter.post("/save-payment-method", async (req, res, next) => {
  try {
    const body = z.object({
      email: z.string().email(),
      paymentMethodId: z.string().min(1),
    }).parse(req.body);

    // Look up account by email
    const accountResult = await query<{
      id: string;
      email: string;
      stripe_customer_id: string | null;
    }>(
      `
      SELECT id, email, stripe_customer_id
      FROM accounts
      WHERE email = $1
    `,
      [body.email]
    );

    if (accountResult.rows.length === 0) {
      return res.status(404).json({ error: "Account not found" });
    }

    const account = accountResult.rows[0];

    if (!account.stripe_customer_id) {
      return res.status(400).json({ error: "Customer not found. Please create a setup intent first." });
    }

    // Retrieve the payment method from Stripe
    const paymentMethod = await stripe.paymentMethods.retrieve(body.paymentMethodId);

    // Attach the payment method to the customer if not already attached
    if (!paymentMethod.customer || paymentMethod.customer !== account.stripe_customer_id) {
      await stripe.paymentMethods.attach(body.paymentMethodId, {
        customer: account.stripe_customer_id,
      });
    }

    // Set as default payment method for the customer
    await stripe.customers.update(account.stripe_customer_id, {
      invoice_settings: {
        default_payment_method: body.paymentMethodId,
      },
    });

    // Get card last4 from payment method
    const last4 = paymentMethod.card?.last4 ?? null;

    // Update database with payment method ID
    await query(
      `
      UPDATE accounts
      SET
        stripe_default_payment_method_id = $1,
        card_last4 = COALESCE($2, card_last4),
        updated_at = NOW()
      WHERE id = $3
    `,
      [body.paymentMethodId, last4, account.id]
    );

    console.log(`[billing] Saved payment method ${body.paymentMethodId} for customer ${account.stripe_customer_id}`);

    res.status(200).json({
      success: true,
      paymentMethodId: body.paymentMethodId,
      cardLast4: last4,
    });
  } catch (error) {
    console.error("[billing] Error saving payment method:", error);
    if (isDatabaseUnavailableError(error)) {
      return res.status(503).json({ error: "Service temporarily unavailable. Please try again later." });
    }
    if (error instanceof Error) {
      return res.status(500).json({ error: `Failed to save payment method: ${error.message}` });
    }
    next(error);
  }
});

// Create a subscription after card is saved
billingRouter.post("/create-subscription", async (req, res, next) => {
  try {
    const body = z.object({
      email: z.string().email(),
      priceId: z.string().min(1),
    }).parse(req.body);

    // Look up account by email
    const accountResult = await query<{
      id: string;
      email: string;
      stripe_customer_id: string | null;
      stripe_default_payment_method_id: string | null;
    }>(
      `
      SELECT id, email, stripe_customer_id, stripe_default_payment_method_id
      FROM accounts
      WHERE email = $1
    `,
      [body.email]
    );

    if (accountResult.rows.length === 0) {
      return res.status(404).json({ error: "Account not found" });
    }

    const account = accountResult.rows[0];

    if (!account.stripe_customer_id) {
      return res.status(400).json({ error: "Customer not found. Please save a payment method first." });
    }

    if (!account.stripe_default_payment_method_id) {
      return res.status(400).json({ error: "No payment method found. Please save a card first." });
    }

    // Create subscription with immediate payment
    // This will create a payment immediately in Stripe Dashboard
    const subscription = await stripe.subscriptions.create({
      customer: account.stripe_customer_id,
      items: [{ price: body.priceId }],
      default_payment_method: account.stripe_default_payment_method_id,
      payment_behavior: "default_incomplete",
      payment_settings: { save_default_payment_method: "on_subscription" },
      expand: ["latest_invoice.payment_intent"],
    });

    console.log(`[billing] Created subscription ${subscription.id} for customer ${account.stripe_customer_id}`);

    // If there's a payment intent, confirm it immediately to charge the card
    const invoice = subscription.latest_invoice as any;
    if (invoice?.payment_intent) {
      const paymentIntent = invoice.payment_intent;
      if (paymentIntent.status === "requires_confirmation") {
        await stripe.paymentIntents.confirm(paymentIntent.id);
        console.log(`[billing] Confirmed payment intent ${paymentIntent.id} for subscription ${subscription.id}`);
      }
    }

    // Update database with subscription info
    await query(
      `
      UPDATE accounts
      SET
        stripe_subscription_id = $1,
        subscription_status = $2,
        stripe_price_id = $3,
        updated_at = NOW()
      WHERE id = $4
    `,
      [subscription.id, subscription.status, body.priceId, account.id]
    );

    res.status(201).json({
      subscriptionId: subscription.id,
      status: subscription.status,
      clientSecret: (subscription.latest_invoice as any)?.payment_intent?.client_secret,
    });
  } catch (error) {
    if (isDatabaseUnavailableError(error)) {
      return res.status(503).json({ error: "Service temporarily unavailable. Please try again later." });
    }
    next(error);
  }
});

// Cancel a subscription
billingRouter.post("/cancel-subscription", async (req, res, next) => {
  try {
    const body = z.object({
      email: z.string().email(),
      cancelImmediately: z.boolean().optional().default(false),
    }).parse(req.body);

    // Look up account by email
    const accountResult = await query<{
      id: string;
      email: string;
      stripe_customer_id: string | null;
      stripe_subscription_id: string | null;
    }>(
      `
      SELECT id, email, stripe_customer_id, stripe_subscription_id
      FROM accounts
      WHERE email = $1
    `,
      [body.email]
    );

    if (accountResult.rows.length === 0) {
      return res.status(404).json({ error: "Account not found" });
    }

    const account = accountResult.rows[0];

    if (!account.stripe_subscription_id) {
      return res.status(400).json({ error: "No active subscription found." });
    }

    // Cancel the subscription in Stripe
    let canceledSubscription: Stripe.Subscription;
    if (body.cancelImmediately) {
      // Cancel immediately - access ends right away
      canceledSubscription = await stripe.subscriptions.cancel(account.stripe_subscription_id);
    } else {
      // Cancel at period end - user keeps access until the end of the billing period
      canceledSubscription = await stripe.subscriptions.update(account.stripe_subscription_id, {
        cancel_at_period_end: true,
      });
    }

    // Update database with subscription status
    await query(
      `
      UPDATE accounts
      SET
        subscription_status = $1,
        updated_at = NOW()
      WHERE id = $2
    `,
      [canceledSubscription.status, account.id]
    );

    console.log(`[billing] Cancelled subscription ${account.stripe_subscription_id} for customer ${account.stripe_customer_id} (immediately: ${body.cancelImmediately})`);

    res.status(200).json({
      success: true,
      subscriptionId: canceledSubscription.id,
      status: canceledSubscription.status,
      cancelAtPeriodEnd: canceledSubscription.cancel_at_period_end,
      canceledAt: canceledSubscription.canceled_at,
      currentPeriodEnd: (canceledSubscription as any).current_period_end,
    });
  } catch (error) {
    console.error("[billing] Error cancelling subscription:", error);
    if (isDatabaseUnavailableError(error)) {
      return res.status(503).json({ error: "Service temporarily unavailable. Please try again later." });
    }
    if (error instanceof Error) {
      return res.status(500).json({ error: `Failed to cancel subscription: ${error.message}` });
    }
    next(error);
  }
});

// Get billing history (invoices, payment intents, and charges from last 1 year)
billingRouter.get("/billing-history", async (req, res, next) => {
  try {
    const parsed = getSubscriptionSchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid query parameters" });
    }

    const { email } = parsed.data;

    // Look up account by email
    const accountResult = await query<{
      id: string;
      email: string;
      stripe_customer_id: string | null;
    }>(
      `
      SELECT id, email, stripe_customer_id
      FROM accounts
      WHERE email = $1
    `,
      [email]
    );

    if (accountResult.rows.length === 0) {
      return res.status(404).json({ error: "Account not found" });
    }

    const account = accountResult.rows[0];

    if (!account.stripe_customer_id) {
      return res.status(400).json({ error: "No Stripe customer found." });
    }

    // Get data from the last 1 year
    const oneYearAgo = Math.floor(Date.now() / 1000) - 365 * 24 * 60 * 60; // Unix timestamp for 1 year ago

    // Fetch invoices (processed and processing)
    const invoices = await stripe.invoices.list({
      customer: account.stripe_customer_id,
      limit: 100,
      created: { gte: oneYearAgo },
    });

    // Fetch payment intents (processing transactions)
    const paymentIntents = await stripe.paymentIntents.list({
      customer: account.stripe_customer_id,
      limit: 100,
      created: { gte: oneYearAgo },
    });

    // Fetch charges (processed transactions)
    const charges = await stripe.charges.list({
      customer: account.stripe_customer_id,
      limit: 100,
      created: { gte: oneYearAgo },
    });

    // Format invoice data
    const invoiceTransactions = invoices.data.map((invoice) => ({
      id: invoice.id,
      type: 'invoice' as const,
      transactionNumber: invoice.number,
      amount: invoice.amount_paid / 100, // Convert from cents to dollars
      currency: invoice.currency.toUpperCase(),
      status: invoice.status, // paid, open, draft, void, uncollectible
      date: new Date(invoice.created * 1000).toISOString(),
      periodStart: invoice.period_start ? new Date(invoice.period_start * 1000).toISOString() : null,
      periodEnd: invoice.period_end ? new Date(invoice.period_end * 1000).toISOString() : null,
      hostedInvoiceUrl: invoice.hosted_invoice_url,
      invoicePdf: invoice.invoice_pdf,
      description: invoice.description || invoice.lines?.data[0]?.description || "Subscription payment",
      isProcessed: invoice.status === 'paid',
      isProcessing: invoice.status === 'open' || invoice.status === 'draft',
    }));

    // Format payment intent data (processing transactions)
    const paymentIntentTransactions = paymentIntents.data
      .filter((pi) => {
        // Include payment intents that aren't already covered by invoices
        // Or include important statuses like processing, requires_action, etc.
        const invoicePaymentIntent = invoices.data.find(inv => {
          const invPaymentIntent = (inv as any).payment_intent;
          return typeof invPaymentIntent === 'string' 
            ? invPaymentIntent === pi.id 
            : invPaymentIntent?.id === pi.id;
        });
        return pi.status !== 'succeeded' || !invoicePaymentIntent;
      })
      .map((pi) => ({
        id: pi.id,
        type: 'payment_intent' as const,
        transactionNumber: pi.id.slice(-12).toUpperCase(),
        amount: pi.amount / 100,
        currency: pi.currency.toUpperCase(),
        status: pi.status, // succeeded, processing, requires_payment_method, requires_action, canceled
        date: new Date(pi.created * 1000).toISOString(),
        periodStart: null,
        periodEnd: null,
        hostedInvoiceUrl: null,
        invoicePdf: null,
        description: pi.description || "Payment processing",
        isProcessed: pi.status === 'succeeded',
        isProcessing: pi.status === 'processing' || pi.status === 'requires_action' || pi.status === 'requires_payment_method',
      }));

    // Format charge data (processed transactions)
    const chargeTransactions = charges.data
      .filter((charge) => {
        // Include charges that aren't already covered by invoices or payment intents
        const invoiceCharge = invoices.data.find(inv => {
          const invCharge = (inv as any).charge;
          return typeof invCharge === 'string'
            ? invCharge === charge.id
            : invCharge?.id === charge.id;
        });
        const paymentIntentCharge = paymentIntents.data.find(pi => {
          const chargePaymentIntent = (charge as any).payment_intent;
          return typeof chargePaymentIntent === 'string'
            ? chargePaymentIntent === pi.id
            : chargePaymentIntent?.id === pi.id;
        });
        return !invoiceCharge && !paymentIntentCharge;
      })
      .map((charge) => ({
        id: charge.id,
        type: 'charge' as const,
        transactionNumber: charge.receipt_number || charge.id.slice(-12).toUpperCase(),
        amount: charge.amount / 100,
        currency: charge.currency.toUpperCase(),
        status: charge.status, // succeeded, pending, failed, refunded
        date: new Date(charge.created * 1000).toISOString(),
        periodStart: null,
        periodEnd: null,
        hostedInvoiceUrl: charge.receipt_url || null,
        invoicePdf: charge.receipt_url || null,
        description: charge.description || charge.metadata?.description || "Payment",
        isProcessed: charge.status === 'succeeded',
        isProcessing: charge.status === 'pending',
      }));

    // Combine all transactions
    const allTransactions = [
      ...invoiceTransactions,
      ...paymentIntentTransactions,
      ...chargeTransactions,
    ];

    // Sort by date (most recent first)
    allTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Calculate totals
    const processedTransactions = allTransactions.filter(t => t.isProcessed);
    const processingTransactions = allTransactions.filter(t => t.isProcessing);
    const totalAmount = processedTransactions.reduce((sum, t) => sum + t.amount, 0);

    res.json({
      transactions: allTransactions,
      invoices: invoiceTransactions,
      paymentIntents: paymentIntentTransactions,
      charges: chargeTransactions,
      totalAmount,
      count: allTransactions.length,
      processedCount: processedTransactions.length,
      processingCount: processingTransactions.length,
    });
  } catch (error) {
    console.error("[billing] Error fetching billing history:", error);
    if (isDatabaseUnavailableError(error)) {
      return res.status(503).json({ error: "Service temporarily unavailable. Please try again later." });
    }
    if (error instanceof Error) {
      return res.status(500).json({ error: `Failed to fetch billing history: ${error.message}` });
    }
    next(error);
  }
});

billingRouter.get("/subscription", async (req, res, next) => {
  try {
    const parsed = getSubscriptionSchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid query parameters" });
    }

    const { email } = parsed.data;

    const result = await query<{
      plan: string;
      past_due: boolean;
      card_last4: string | null;
      stripe_subscription_id: string | null;
      subscription_status: string | null;
      stripe_price_id: string | null;
    }>(
      `
      SELECT
        plan,
        past_due,
        card_last4,
        stripe_subscription_id,
        subscription_status,
        stripe_price_id
      FROM accounts
      WHERE email = $1
    `,
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Account not found" });
    }

    const row = result.rows[0];

    res.json({
      plan: row.plan,
      pastDue: row.past_due,
      cardLast4: row.card_last4,
      stripeSubscriptionId: row.stripe_subscription_id,
      subscriptionStatus: row.subscription_status,
      stripePriceId: row.stripe_price_id,
    });
  } catch (error) {
    if (isDatabaseUnavailableError(error)) {
      return res.status(503).json({ error: "Service temporarily unavailable. Please try again later." });
    }
    next(error);
  }
});


