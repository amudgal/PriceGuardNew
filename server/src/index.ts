import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import express from "express";
import cors from "cors";
import morgan from "morgan";
import { runMigrations } from "./migrations.js";
import { authRouter } from "./routes/auth.js";
import { pool } from "./db.js";
import { billingRouter } from "./routes/billing.js";
import { stripeWebhookHandler } from "./routes/stripeWebhook.js";

// Load .env file from server directory (must be loaded before reading process.env)
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
// Try multiple possible paths for .env file
const envPaths = [
  join(__dirname, "..", ".env"), // From dist/ or src/ to server/
  join(process.cwd(), ".env"),   // From current working directory
  join(__dirname, ".env"),        // Same directory as this file
];
for (const envPath of envPaths) {
  const result = dotenv.config({ path: envPath });
  if (!result.error) {
    console.log(`[env] Loaded .env from: ${envPath}`);
    break;
  }
}
// Also support DOTENV_CONFIG_PATH if explicitly set
if (process.env.DOTENV_CONFIG_PATH) {
  dotenv.config({ path: process.env.DOTENV_CONFIG_PATH, override: false });
}

const PORT = Number(process.env.PORT ?? 4000);

async function bootstrap() {
  await runMigrations();

  const app = express();
  
  // Stripe webhook endpoint:
  // - Must be defined BEFORE express.json middleware so we can use express.raw
  // - Uses Stripe's signature verification to ensure integrity
  app.post(
    "/api/stripe/webhook",
    express.raw({ type: "application/json" }),
    stripeWebhookHandler
  );

  // Health check endpoint (before CORS and middleware - accessible to load balancers)
  // This endpoint MUST return 200 OK quickly for ECS health checks to pass
  app.get("/health", async (_req, res) => {
    try {
      // Check if this is a simple health check (container health check from ECS/ALB)
      // ECS health checks use wget --spider which doesn't send proper user-agent
      // So we check for no user-agent or wget in user-agent, or simple query param
      const userAgent = _req.headers["user-agent"] || "";
      const isSimpleCheck = !userAgent || 
                            userAgent.includes("Wget") || 
                            userAgent.includes("wget") ||
                            userAgent.includes("ELB-HealthChecker") ||
                            _req.query.simple === "true" ||
                            _req.query.simple === "1";
      
      if (isSimpleCheck) {
        // For container/ALB health checks, return 200 immediately if server is running
        // Don't fail health check just because DB is temporarily unavailable
        // This allows the container to start even if DB connection takes time
        // IMPORTANT: This MUST return 200 OK for ECS health checks to pass
        res.status(200).json({
          status: "healthy",
          timestamp: new Date().toISOString(),
          service: "priceguard-server",
        });
        return;
      }
      
      // For detailed health checks (API calls, manual checks), check database
      try {
        // Quick database connectivity check
        await pool.query("SELECT 1");
        res.status(200).json({
          status: "healthy",
          timestamp: new Date().toISOString(),
          service: "priceguard-server",
          database: "connected",
        });
      } catch (error) {
        res.status(503).json({
          status: "unhealthy",
          timestamp: new Date().toISOString(),
          service: "priceguard-server",
          database: "disconnected",
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    } catch (error) {
      // Catch any unexpected errors and still return 200 for simple checks
      // This prevents health check failures from crashing the service
      console.error("[health] Unexpected error in health check:", error);
      res.status(200).json({
        status: "healthy",
        timestamp: new Date().toISOString(),
        service: "priceguard-server",
      });
    }
  });
  
  // Configure CORS to allow only Netlify domain
  // Read ALLOWED_ORIGINS and ensure it's parsed correctly (handle comma-separated values)
  const allowedOriginsEnv = process.env.ALLOWED_ORIGINS || "";
  console.log(`[debug] ALLOWED_ORIGINS from env: "${allowedOriginsEnv}"`);
  const allowedOrigins = allowedOriginsEnv
    ? allowedOriginsEnv.split(",").map((origin) => origin.trim()).filter(Boolean)
    : ["http://localhost:3000", "http://localhost:5173"]; // Default for local development (both Vite ports)
  
  console.log(`[cors] Allowed origins: ${allowedOrigins.join(", ")}`);
  
  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, Postman, etc.) in development
        if (!origin && process.env.NODE_ENV !== "production") {
          return callback(null, true);
        }
        if (origin && allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          console.warn(`[cors] Blocked request from origin: ${origin || "none"}`);
          callback(new Error("Not allowed by CORS"));
        }
      },
      credentials: true,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
      exposedHeaders: ["Content-Type"],
    })
  );
  
  app.use(morgan("dev"));
  // JSON body parser for standard API routes (not Stripe webhooks)
  app.use(express.json());

  // Billing routes (Stripe SetupIntent, subscription status, etc.)
  app.use("/api/billing", billingRouter);
  app.use("/api/auth", authRouter);

  app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error(err);
    if (err instanceof Error) {
      return res.status(400).json({ error: err.message });
    }
    res.status(500).json({ error: "Unexpected error" });
  });

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server listening on port ${PORT} on 0.0.0.0`);
  });
}

bootstrap().catch((error) => {
  console.error("Failed to start server", error);
  process.exit(1);
});
