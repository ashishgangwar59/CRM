import { NextResponse } from "next/server";
import { verifyAccessToken } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { User } from "@/lib/models/User";

export async function GET(req: Request) {
  try {
    await connectToDatabase();
    const token = req.headers.get("cookie")?.match(/accessToken=([^;]+)/)?.[1];
    if (!token) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const payload = verifyAccessToken(token);
    
    // Fetch latest user data for permissions
    const user = await User.findById(payload.userId).lean();
    const accessibleModules = user?.accessibleModules || ["Overview", "Attendance", "Leads", "Reports", "Profile"];

    return NextResponse.json({ success: true, role: payload.role, accessibleModules });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Invalid token" }, { status: 401 });
  }
}
