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
  const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(",").map((origin) => origin.trim())
    : ["http://localhost:3000"]; // Default for local development
  
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
