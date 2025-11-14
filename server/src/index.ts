import express from "express";
import cors from "cors";
import morgan from "morgan";
import { runMigrations } from "./migrations";
import { authRouter } from "./routes/auth";
import { isDatabaseUnavailableError } from "./db";

const PORT = Number(process.env.PORT ?? 4000);

async function bootstrap() {
  const migrationsRan = await runMigrations();
  if (!migrationsRan) {
    console.warn("[server] Continuing without database connectivity. API endpoints will return 503 until the database becomes available.");
  }

  const app = express();
  app.use(cors());
  app.use(morgan("dev"));
  app.use(express.json());

  app.use("/api/auth", authRouter);

  app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error(err);
    if (isDatabaseUnavailableError(err)) {
      return res.status(503).json({ error: "Service temporarily unavailable. Please try again later." });
    }
    if (err instanceof Error) {
      return res.status(400).json({ error: err.message });
    }
    res.status(500).json({ error: "Unexpected error" });
  });

  app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
  });
}

bootstrap().catch((error) => {
  console.error("Failed to start server", error);
  process.exit(1);
});
