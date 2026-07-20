import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { verifyAccessToken } from "@/lib/auth";
import { User } from "@/lib/models/User";

export async function GET(req: Request) {
  try {
    await connectToDatabase();
    const token = req.headers.get("cookie")?.match(/accessToken=([^;]+)/)?.[1];
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const payload = verifyAccessToken(token);
    if (payload.role !== "KEY_ADMIN" && payload.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const users = await User.find().select("-password").sort({ createdAt: -1 }).lean();
    return NextResponse.json({ success: true, data: users });
  } catch (error) {
    console.error("Users GET Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    await connectToDatabase();
    const token = req.headers.get("cookie")?.match(/accessToken=([^;]+)/)?.[1];
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const payload = verifyAccessToken(token);
    // Only KEY_ADMIN can assign ADMIN roles
    if (payload.role !== "KEY_ADMIN") {
      return NextResponse.json({ error: "Forbidden: Only Key Admin can update roles" }, { status: 403 });
    }

    const { email, role } = await req.json();
    if (!email || !role) {
      return NextResponse.json({ error: "Email and role required" }, { status: 400 });
    }

    const updatedUser = await User.findOneAndUpdate(
      { email },
      { role },
      { new: true }
    ).select("-password").lean();

    if (!updatedUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "User role updated", data: updatedUser });
  } catch (error) {
    console.error("Users PUT Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
