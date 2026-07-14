import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { Session } from "@/lib/models/Session";
import { logAudit } from "@/lib/audit";

export async function POST(req: Request) {
  try {
    await connectToDatabase();
    
    const refreshTokenCookie = req.headers.get("cookie")?.match(/refreshToken=([^;]+)/)?.[1];

    if (refreshTokenCookie) {
      const session = await Session.findOne({ refreshToken: refreshTokenCookie });
      if (session) {
        await logAudit(req, session.userId.toString(), "Logout", "Auth", "User logged out");
        await Session.deleteMany({ refreshToken: refreshTokenCookie });
      }
    }

    const response = NextResponse.json({ success: true });
    response.cookies.delete("accessToken");
    response.cookies.delete("refreshToken");

    return response;
  } catch (error) {
    console.error("Logout Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
