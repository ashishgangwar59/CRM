import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { verifyAccessToken } from "@/lib/auth";
import VendorInvoice from "@/lib/models/VendorInvoice";
import { User } from "@/lib/models/User";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const token = req.headers.get("cookie")?.match(/accessToken=([^;]+)/)?.[1];
    if (!token) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    const payload = verifyAccessToken(token);

    await connectToDatabase();
    const user = await User.findById(payload.userId).lean();
    if (!user || (user.role !== "ADMIN" && user.role !== "KEY_ADMIN" && user.role !== "Employee")) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 });
    }

    const { id } = await params;
    const { title, invoiceNo, amount, date, paymentMode, approvedBy, description } = await req.json();

    const updated = await VendorInvoice.findByIdAndUpdate(
      id,
      { title, invoiceNo, amount: Number(amount), date, paymentMode, approvedBy, description },
      { new: true }
    );

    if (!updated) {
      return NextResponse.json({ success: false, error: "Invoice not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    console.error("Error updating vendor invoice:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const token = req.headers.get("cookie")?.match(/accessToken=([^;]+)/)?.[1];
    if (!token) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    const payload = verifyAccessToken(token);

    await connectToDatabase();
    const user = await User.findById(payload.userId).lean();
    if (!user || (user.role !== "ADMIN" && user.role !== "KEY_ADMIN")) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 });
    }

    const { id } = await params;

    const invoice = await VendorInvoice.findByIdAndDelete(id);
    if (!invoice) {
      return NextResponse.json({ success: false, error: "Invoice not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Invoice deleted successfully" });
  } catch (error: any) {
    console.error("Error deleting vendor invoice:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

