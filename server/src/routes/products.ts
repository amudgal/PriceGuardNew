import { Router } from "express";
import { z } from "zod";
import { query, isDatabaseUnavailableError } from "../db.js";

export const productsRouter = Router();

// Schema for creating a product
const createProductSchema = z.object({
  email: z.string().email(),
  productName: z.string().min(1, "Product name is required"),
  productId: z.string().min(1, "Product ID is required"),
  purchasePrice: z.number().positive().optional().nullable(),
  purchaseDate: z.string().optional().nullable(), // ISO date string
  category: z.string().optional().nullable(),
  receiptUrl: z.string().url().optional().nullable(),
});

// Schema for updating a product
const updateProductSchema = createProductSchema.partial().extend({
  id: z.string().uuid(),
  email: z.string().email(),
});

// GET /api/products - Get all products for a user
productsRouter.get("/", async (req, res, next) => {
  try {
    const email = req.query.email as string;
    if (!email) {
      return res.status(400).json({ error: "Email parameter is required" });
    }

    // Get user ID from email
    const userResult = await query<{ id: string }>(
      `SELECT id FROM accounts WHERE email = $1`,
      [email]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    const userId = userResult.rows[0].id;

    // Get all products for this user with latest price from agents_products
    // Join with agents_products to get the latest price based on observed_at timestamp
    const productsResult = await query<{
      id: string;
      product_name: string;
      product_id: string;
      purchase_price: number | null;
      purchase_date: string | null;
      category: string | null;
      receipt_url: string | null;
      created_at: string;
      updated_at: string;
      current_price: number | null;
      observed_at: string | null;
      last_run_time: string | null;
    }>(
      `
      SELECT 
        mp.id,
        mp.product_name,
        mp.product_id,
        mp.purchase_price,
        mp.purchase_date,
        mp.category,
        mp.receipt_url,
        mp.created_at,
        mp.updated_at,
        ap."Price" AS current_price,
        ap.observed_at,
        ap.last_run_time
      FROM monitored_products mp
      LEFT JOIN LATERAL (
        SELECT 
          "Price",
          observed_at,
          last_run_time
        FROM agents_products
        WHERE "Product_locator" = mp.product_id
        ORDER BY observed_at DESC NULLS LAST
        LIMIT 1
      ) ap ON true
      WHERE mp.user_id = $1
      ORDER BY mp.created_at DESC
    `,
      [userId]
    );

    // Transform to camelCase and calculate derived fields
    const now = new Date();
    const products = productsResult.rows.map((row) => {
      const purchasePrice = row.purchase_price ? parseFloat(row.purchase_price.toString()) : null;
      const currentPrice = row.current_price ? parseFloat(row.current_price.toString()) : null;
      const purchaseDate = row.purchase_date ? new Date(row.purchase_date) : null;
      
      // Calculate days left: purchase_date + 30 days - current date
      let daysLeft: number | null = null;
      if (purchaseDate) {
        const expiryDate = new Date(purchaseDate);
        expiryDate.setDate(expiryDate.getDate() + 30);
        const diffTime = expiryDate.getTime() - now.getTime();
        daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        daysLeft = Math.max(0, daysLeft); // Don't show negative days
      }
      
      // Check if price dropped
      const hasPriceDrop = purchasePrice !== null && currentPrice !== null && currentPrice < purchasePrice;
      const priceDifference = hasPriceDrop ? purchasePrice - currentPrice : null;
      
      // Calculate last checked: current time - last_run_time in hours
      let lastCheckedHours: number | null = null;
      if (row.last_run_time) {
        const lastRunTime = new Date(row.last_run_time);
        const diffTime = now.getTime() - lastRunTime.getTime();
        lastCheckedHours = Math.round((diffTime / (1000 * 60 * 60)) * 10) / 10; // Round to 1 decimal
      } else if (row.observed_at) {
        // Fallback to observed_at if last_run_time is not available
        const observedAt = new Date(row.observed_at);
        const diffTime = now.getTime() - observedAt.getTime();
        lastCheckedHours = Math.round((diffTime / (1000 * 60 * 60)) * 10) / 10;
      }
      
      return {
        id: row.id,
        productName: row.product_name,
        productId: row.product_id,
        purchasePrice,
        purchaseDate: row.purchase_date,
        category: row.category,
        receiptUrl: row.receipt_url,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        currentPrice,
        observedAt: row.observed_at,
        daysLeft,
        hasPriceDrop,
        priceDifference,
        lastCheckedHours,
      };
    });

    res.json({ products });
  } catch (error) {
    console.error("[products] Error getting products:", error);
    if (isDatabaseUnavailableError(error)) {
      return res.status(503).json({ error: "Service temporarily unavailable. Please try again later." });
    }
    if (error instanceof Error) {
      return res.status(500).json({ error: `Failed to get products: ${error.message}` });
    }
    next(error);
  }
});

// POST /api/products - Create a new product
productsRouter.post("/", async (req, res, next) => {
  try {
    const body = createProductSchema.parse(req.body);

    // Get user ID from email
    const userResult = await query<{ id: string }>(
      `SELECT id FROM accounts WHERE email = $1`,
      [body.email]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    const userId = userResult.rows[0].id;

    // Check if product already exists for this user
    const existingResult = await query<{ id: string }>(
      `SELECT id FROM monitored_products WHERE user_id = $1 AND product_id = $2`,
      [userId, body.productId]
    );

    if (existingResult.rows.length > 0) {
      return res.status(409).json({ error: "Product is already being monitored" });
    }

    // Insert new product
    const insertResult = await query<{
      id: string;
      product_name: string;
      product_id: string;
      purchase_price: number | null;
      purchase_date: string | null;
      category: string | null;
      receipt_url: string | null;
      created_at: string;
    }>(
      `
      INSERT INTO monitored_products (
        user_id,
        product_name,
        product_id,
        purchase_price,
        purchase_date,
        category,
        receipt_url
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING 
        id,
        product_name,
        product_id,
        purchase_price,
        purchase_date,
        category,
        receipt_url,
        created_at
    `,
      [
        userId,
        body.productName,
        body.productId,
        body.purchasePrice ?? null,
        body.purchaseDate ?? null,
        body.category ?? null,
        body.receiptUrl ?? null,
      ]
    );

    const product = insertResult.rows[0];

    // Transform to camelCase
    res.status(201).json({
      id: product.id,
      productName: product.product_name,
      productId: product.product_id,
      purchasePrice: product.purchase_price ? parseFloat(product.purchase_price.toString()) : null,
      purchaseDate: product.purchase_date,
      category: product.category,
      receiptUrl: product.receipt_url,
      createdAt: product.created_at,
    });
  } catch (error) {
    console.error("[products] Error creating product:", error);
    if (isDatabaseUnavailableError(error)) {
      return res.status(503).json({ error: "Service temporarily unavailable. Please try again later." });
    }
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Invalid input", details: error.errors });
    }
    if (error instanceof Error) {
      return res.status(500).json({ error: `Failed to create product: ${error.message}` });
    }
    next(error);
  }
});

// PUT /api/products/:id - Update a product
productsRouter.put("/:id", async (req, res, next) => {
  try {
    const productId = req.params.id;
    const body = updateProductSchema.parse({ ...req.body, id: productId });

    // Get user ID from email
    const userResult = await query<{ id: string }>(
      `SELECT id FROM accounts WHERE email = $1`,
      [body.email]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    const userId = userResult.rows[0].id;

    // Build update query dynamically based on provided fields
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (body.productName !== undefined) {
      updates.push(`product_name = $${paramIndex++}`);
      values.push(body.productName);
    }
    if (body.productId !== undefined) {
      updates.push(`product_id = $${paramIndex++}`);
      values.push(body.productId);
    }
    if (body.purchasePrice !== undefined) {
      updates.push(`purchase_price = $${paramIndex++}`);
      values.push(body.purchasePrice);
    }
    if (body.purchaseDate !== undefined) {
      updates.push(`purchase_date = $${paramIndex++}`);
      values.push(body.purchaseDate);
    }
    if (body.category !== undefined) {
      updates.push(`category = $${paramIndex++}`);
      values.push(body.category);
    }
    if (body.receiptUrl !== undefined) {
      updates.push(`receipt_url = $${paramIndex++}`);
      values.push(body.receiptUrl);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: "No fields to update" });
    }

    updates.push(`updated_at = NOW()`);
    values.push(productId, userId);

    const updateResult = await query<{
      id: string;
      product_name: string;
      product_id: string;
      purchase_price: number | null;
      purchase_date: string | null;
      category: string | null;
      receipt_url: string | null;
      updated_at: string;
    }>(
      `
      UPDATE monitored_products
      SET ${updates.join(", ")}
      WHERE id = $${paramIndex++} AND user_id = $${paramIndex++}
      RETURNING 
        id,
        product_name,
        product_id,
        purchase_price,
        purchase_date,
        category,
        receipt_url,
        updated_at
    `,
      values
    );

    if (updateResult.rows.length === 0) {
      return res.status(404).json({ error: "Product not found or you don't have permission to update it" });
    }

    const product = updateResult.rows[0];

    res.json({
      id: product.id,
      productName: product.product_name,
      productId: product.product_id,
      purchasePrice: product.purchase_price ? parseFloat(product.purchase_price.toString()) : null,
      purchaseDate: product.purchase_date,
      category: product.category,
      receiptUrl: product.receipt_url,
      updatedAt: product.updated_at,
    });
  } catch (error) {
    console.error("[products] Error updating product:", error);
    if (isDatabaseUnavailableError(error)) {
      return res.status(503).json({ error: "Service temporarily unavailable. Please try again later." });
    }
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Invalid input", details: error.errors });
    }
    if (error instanceof Error) {
      return res.status(500).json({ error: `Failed to update product: ${error.message}` });
    }
    next(error);
  }
});

// DELETE /api/products/:id - Delete a product
productsRouter.delete("/:id", async (req, res, next) => {
  try {
    const productId = req.params.id;
    const email = req.query.email as string;

    if (!email) {
      return res.status(400).json({ error: "Email parameter is required" });
    }

    // Get user ID from email
    const userResult = await query<{ id: string }>(
      `SELECT id FROM accounts WHERE email = $1`,
      [email]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    const userId = userResult.rows[0].id;

    // Delete product
    const deleteResult = await query(
      `DELETE FROM monitored_products WHERE id = $1 AND user_id = $2 RETURNING id`,
      [productId, userId]
    );

    if (deleteResult.rows.length === 0) {
      return res.status(404).json({ error: "Product not found or you don't have permission to delete it" });
    }

    res.status(204).send();
  } catch (error) {
    console.error("[products] Error deleting product:", error);
    if (isDatabaseUnavailableError(error)) {
      return res.status(503).json({ error: "Service temporarily unavailable. Please try again later." });
    }
    if (error instanceof Error) {
      return res.status(500).json({ error: `Failed to delete product: ${error.message}` });
    }
    next(error);
  }
});

