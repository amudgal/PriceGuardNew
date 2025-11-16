import { runMigrations } from "./migrations.js";

async function main() {
  try {
    console.log("[migrations] Starting database migrations...");
    const success = await runMigrations();
    if (success) {
      console.log("[migrations] ✅ Migrations completed successfully");
      process.exit(0);
    } else {
      console.error("[migrations] ❌ Migrations failed");
      process.exit(1);
    }
  } catch (error) {
    console.error("[migrations] ❌ Error running migrations:", error);
    process.exit(1);
  }
}

main();

