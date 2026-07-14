import { AuditLog } from "./models/AuditLog";

export async function logAudit(
  req: Request | null, 
  userId: string | null, 
  action: string, 
  module: string, 
  description: string, 
  oldValues: any = null, 
  newValues: any = null
) {
  try {
    let ipAddress = "Unknown IP";
    let browser = "Unknown Browser";

    if (req) {
      // In Next.js App Router, headers are accessible
      const forwardedFor = req.headers.get("x-forwarded-for");
      if (forwardedFor) {
        ipAddress = forwardedFor.split(',')[0].trim();
      } else {
        // Fallback for some local dev setups if available via other headers, usually x-forwarded-for works in prod
        ipAddress = req.headers.get("x-real-ip") || "127.0.0.1";
      }
      
      browser = req.headers.get("user-agent") || "Unknown Browser";
    }

    await AuditLog.create({
      userId: userId || undefined,
      action,
      module,
      description,
      ipAddress,
      browser,
      oldValues,
      newValues
    });
  } catch (error) {
    console.error("Failed to write to AuditLog", error);
  }
}
