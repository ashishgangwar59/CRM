// Runs once when the Next.js server starts. Starting the cron here means the daily
// backup is scheduled right after a deploy/restart, without waiting for the first request.
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    try {
      const { initCronJobs } = await import("./lib/cronService");
      initCronJobs();
    } catch (e) {
      console.error("[Backup] Failed to start cron on server boot:", e);
    }
  }
}
