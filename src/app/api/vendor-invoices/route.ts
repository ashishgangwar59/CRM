import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { verifyAccessToken } from "@/lib/auth";
import VendorInvoice from "@/lib/models/VendorInvoice";
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

    const invoices = await VendorInvoice.find().sort({ date: -1, createdAt: -1 }).populate("createdBy", "firstName lastName email").lean();

    return NextResponse.json({ success: true, data: invoices });
  } catch (error: any) {
    console.error("Error fetching vendor invoices:", error);
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

    const { title, invoiceNo, amount, date, paymentMode, approvedBy, description } = await req.json();

    if (!title || !invoiceNo || !amount || !date) {
      return NextResponse.json({ success: false, error: "Title, invoice number, amount, and date are required" }, { status: 400 });
    }

    const newInvoice = new VendorInvoice({
      title,
      invoiceNo,
      amount: Number(amount),
      date,
      paymentMode,
      approvedBy,
      description,
      createdBy: user._id,
    });

    await newInvoice.save();

    return NextResponse.json({ success: true, data: newInvoice });
  } catch (error: any) {
    console.error("Error creating vendor invoice:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
