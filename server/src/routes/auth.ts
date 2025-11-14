import { Router } from "express";
import { z } from "zod";
import { authenticateAccount, createAccount } from "../accountService.js";
import { isDatabaseUnavailableError } from "../db.js";


const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  creditCardToken: z.string().min(1).max(255).optional(),
  cardLast4: z
    .string()
    .length(4)
    .regex(/^[0-9]{4}$/)
    .optional(),
  billingZip: z.string().min(3).max(10).optional(),
  expiryMonth: z.number().int().min(1).max(12).optional(),
  expiryYear: z.number().int().min(new Date().getFullYear()).max(9999).optional(),
  plan: z.string().min(1),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const authRouter = Router();

authRouter.post("/register", async (req, res, next) => {
  try {
    const body = registerSchema.parse(req.body);
    if (!body.cardLast4 && body.creditCardToken) {
      return res.status(400).json({ error: "cardLast4 is required when a creditCardToken is provided" });
    }

    const account = await createAccount({
      email: body.email,
      password: body.password,
      creditCardToken: body.creditCardToken,
      cardLast4: body.cardLast4,
      billingZip: body.billingZip,
      expiryMonth: body.expiryMonth,
      expiryYear: body.expiryYear,
      plan: body.plan,
    });

    res.status(201).json({
      id: account.id,
      email: account.email,
      plan: account.plan,
      pastDue: account.past_due,
      cardLast4: account.card_last4,
    });
  } catch (error) {
    if (isDatabaseUnavailableError(error)) {
      return res.status(503).json({ error: "Service temporarily unavailable. Please try again later." });
    }
    next(error);
  }
});

authRouter.post("/login", async (req, res, next) => {
  try {
    const body = loginSchema.parse(req.body);
    const account = await authenticateAccount(body.email, body.password);

    if (!account) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    res.json({
      id: account.id,
      email: account.email,
      plan: account.plan,
      pastDue: account.past_due,
      cardLast4: account.card_last4,
    });
  } catch (error) {
    if (isDatabaseUnavailableError(error)) {
      return res.status(503).json({ error: "Service temporarily unavailable. Please try again later." });
    }
    next(error);
  }
});
