import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { Session } from "@/lib/models/Session";
import { verifyRefreshToken, signAccessToken, signRefreshToken } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    await connectToDatabase();
    
    const refreshTokenCookie = req.headers.get("cookie")?.match(/refreshToken=([^;]+)/)?.[1];

    if (!refreshTokenCookie) {
      return NextResponse.json({ error: "No refresh token found" }, { status: 401 });
    }

    let payload;
    try {
      payload = verifyRefreshToken(refreshTokenCookie);
    } catch (e) {
      return NextResponse.json({ error: "Invalid refresh token" }, { status: 401 });
    }

    const session = await Session.findOne({ refreshToken: refreshTokenCookie });

    if (!session) {
      return NextResponse.json({ error: "Session expired or invalid" }, { status: 401 });
    }

    if (new Date() > session.expiresAt) {
      await Session.deleteOne({ _id: session._id });
      return NextResponse.json({ error: "Session expired" }, { status: 401 });
    }

    const newAccessToken = signAccessToken({ userId: payload.userId, role: payload.role });
    const newRefreshToken = signRefreshToken({ userId: payload.userId, role: payload.role });

    session.refreshToken = newRefreshToken;
    await session.save();

    const response = NextResponse.json({ success: true });

    response.cookies.set("accessToken", newAccessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 15 * 60,
      path: "/",
    });

    response.cookies.set("refreshToken", newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60,
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Refresh Token Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
