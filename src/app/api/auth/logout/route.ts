import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { Session } from "@/lib/models/Session";
import { logAudit } from "@/lib/audit";
/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Logout a user
 *     tags: [Auth]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Logout successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *       500:
 *         description: Internal server error
 */
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
