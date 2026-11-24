import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { SystemSettings } from "@/lib/models/SystemSettings";
import { resolveAppHomeContent } from "@/lib/appHomeContent";

// Public (no login) content for the mobile app's home page.
// Returns ONLY display-safe fields — never integrations, templates or other secrets from SystemSettings.
export async function GET() {
  try {
    await connectToDatabase();
    const settings: any = await SystemSettings.findOne({}, { companyProfile: 1, appHomeContent: 1 }).lean();
    const cp = settings?.companyProfile || {};

    return NextResponse.json(
      {
        success: true,
        data: {
          company: {
            name: cp.name || "",
            logoUrl: cp.logoUrl || "",
            address: cp.address || "",
            phone: cp.phone || "",
            email: cp.email || "",
            website: cp.website || "",
          },
          content: resolveAppHomeContent(settings?.appHomeContent),
          updatedAt: settings?.updatedAt || null,
        },
      },
      { headers: { "Cache-Control": "public, max-age=60" } }
    );
  } catch (error) {
    console.error("Public app-content GET error:", error);
    return NextResponse.json({ success: false, error: "Failed to load app content" }, { status: 500 });
  }
}
