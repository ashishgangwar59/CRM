import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { User } from "@/lib/models/User";
import { Session } from "@/lib/models/Session";
import { LoginHistory } from "@/lib/models/LoginHistory";
import { comparePassword, signAccessToken, signRefreshToken } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Authenticate a user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *               rememberMe:
 *                 type: boolean
 *               deviceInfo:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 role:
 *                   type: string
 *       400:
 *         description: Missing credentials
 *       401:
 *         description: Invalid credentials
 *       403:
 *         description: Password change required
 */
export async function POST(req: Request) {
  try {
    await connectToDatabase();
    
    const body = await req.json();
    const { email, password, rememberMe, deviceInfo } = body;

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const isPasswordValid = await comparePassword(password, user.password || "");

    if (!isPasswordValid) {
      await LoginHistory.create({
        userId: user._id,
        status: "FAILURE",
        ipAddress: req.headers.get("x-forwarded-for") || "unknown",
        userAgent: req.headers.get("user-agent") || "unknown",
      });
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    if (user.requirePasswordChange) {
      return NextResponse.json({ error: "Password change required", requirePasswordChange: true }, { status: 403 });
    }

    const accessToken = signAccessToken({ userId: user._id.toString(), role: user.role });
    const refreshToken = signRefreshToken({ userId: user._id.toString(), role: user.role });

    const expiresInDays = rememberMe ? 7 : 1;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);

    await Session.create({
      userId: user._id,
      refreshToken,
      deviceInfo: deviceInfo || "Unknown Device",
      ipAddress: req.headers.get("x-forwarded-for") || "unknown",
      userAgent: req.headers.get("user-agent") || "unknown",
      expiresAt,
    });

    await LoginHistory.create({
      userId: user._id,
      status: "SUCCESS",
      ipAddress: req.headers.get("x-forwarded-for") || "unknown",
      userAgent: req.headers.get("user-agent") || "unknown",
    });

    await logAudit(req, user._id.toString(), "Login", "Auth", "User logged in successfully");

    const response = NextResponse.json({ success: true, role: user.role });

    response.cookies.set("accessToken", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 15 * 60,
      path: "/",
    });

    response.cookies.set("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: expiresInDays * 24 * 60 * 60,
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Login Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
