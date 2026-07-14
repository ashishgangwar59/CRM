import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { SalaryPayment } from "@/lib/models/SalaryPayment";
import { verifyAccessToken } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    await connectToDatabase();
    
    // Auth
    const token = req.headers.get("cookie")?.match(/accessToken=([^;]+)/)?.[1];
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    
    const history = await SalaryPayment.find()
      .populate("createdBy", "firstName lastName")
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({ success: true, data: history });
  } catch (error) {
    console.error("Fetch Salary Payment History Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
