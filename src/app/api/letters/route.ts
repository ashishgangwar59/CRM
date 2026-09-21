import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { verifyAccessToken } from "@/lib/auth";
import { LetterRegister } from "@/lib/models/LetterRegister";
import { User } from "@/lib/models/User";

export async function GET(req: Request) {
  try {
    const token = req.headers.get("cookie")?.match(/accessToken=([^;]+)/)?.[1];
    if (!token) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    const payload = verifyAccessToken(token);

    await connectToDatabase();
    const user = await User.findById(payload.userId).lean();
    if (!user) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 401 });
    }

    // Role check - admins, key admins, and employees with module access
    if (user.role !== "ADMIN" && user.role !== "KEY_ADMIN" && user.role !== "Employee") {
      return NextResponse.json({ success: false, error: "Unauthorized access" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");

    let query: any = {};
    if (type) {
      query.type = type;
    }

    const letters = await LetterRegister.find(query).sort({ date: -1, createdAt: -1 }).populate("createdBy", "firstName lastName");

    return NextResponse.json({ success: true, data: letters });
  } catch (error: any) {
    console.error("Fetch Letters Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const token = req.headers.get("cookie")?.match(/accessToken=([^;]+)/)?.[1];
    if (!token) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    const payload = verifyAccessToken(token);

    await connectToDatabase();
    const user = await User.findById(payload.userId).lean();
    if (!user) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 401 });
    }

    if (user.role !== "ADMIN" && user.role !== "KEY_ADMIN" && user.role !== "Employee") {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 });
    }

    const data = await req.json();

    const newLetter = await LetterRegister.create({
      ...data,
      createdBy: user._id,
    });

    return NextResponse.json({ success: true, data: newLetter });
  } catch (error: any) {
    console.error("Create Letter Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
