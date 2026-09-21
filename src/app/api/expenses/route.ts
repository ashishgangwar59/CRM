import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { verifyAccessToken } from "@/lib/auth";
import OtherExpense from "@/lib/models/OtherExpense";
import { User } from "@/lib/models/User";

export async function GET(req: Request) {
  try {
    const token = req.headers.get("cookie")?.match(/accessToken=([^;]+)/)?.[1];
    if (!token) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    const payload = verifyAccessToken(token);

    await connectToDatabase();
    const user = await User.findById(payload.userId).lean();
    if (!user || (user.role !== "ADMIN" && user.role !== "KEY_ADMIN" && user.role !== "Employee")) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 });
    }

    const expenses = await OtherExpense.find().sort({ date: -1, createdAt: -1 }).populate("createdBy", "firstName lastName email").lean();

    return NextResponse.json({ success: true, data: expenses });
  } catch (error: any) {
    console.error("Error fetching other expenses:", error);
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
    if (!user || (user.role !== "ADMIN" && user.role !== "KEY_ADMIN" && user.role !== "Employee")) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 });
    }

    const { title, amount, date, paymentMode, paymentTransferredBy, description } = await req.json();

    if (!title || !amount || !date) {
      return NextResponse.json({ success: false, error: "Title, amount, and date are required" }, { status: 400 });
    }

    const newExpense = new OtherExpense({
      title,
      amount: Number(amount),
      date,
      paymentMode,
      paymentTransferredBy,
      description,
      createdBy: user._id,
    });

    await newExpense.save();

    return NextResponse.json({ success: true, data: newExpense });
  } catch (error: any) {
    console.error("Error creating other expense:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
