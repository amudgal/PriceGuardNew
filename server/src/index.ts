import express from "express";
import cors from "cors";
import morgan from "morgan";
import { runMigrations } from "./migrations.js";
import { authRouter } from "./routes/auth.js";
import { pool } from "./db.js";

const PORT = Number(process.env.PORT ?? 4000);

async function bootstrap() {
  await runMigrations();

  const app = express();
  
  // Health check endpoint (before CORS and middleware - accessible to load balancers)
  app.get("/health", async (_req, res) => {
    // Check if this is a simple health check (container health check)
    // vs a detailed health check (load balancer/API health check)
    const isSimpleCheck = _req.headers["user-agent"]?.includes("Wget") || 
                          _req.query.simple === "true";
    
    if (isSimpleCheck) {
      // For container health checks, return 200 if server is running
      // Don't fail health check just because DB is temporarily unavailable
      res.status(200).json({
        status: "healthy",
        timestamp: new Date().toISOString(),
        service: "priceguard-server",
      });
      return;
    }
    
    // For detailed health checks (ALB, API calls), check database
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
  });
  
  // Configure CORS to allow only Netlify domain
  const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(",").map((origin) => origin.trim())
    : ["http://localhost:3000"]; // Default for local development
  
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
          callback(new Error("Not allowed by CORS"));
        }
      },
      credentials: true,
    })
  );
  
  app.use(morgan("dev"));
  app.use(express.json());

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
