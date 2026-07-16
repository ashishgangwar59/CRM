import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { SalaryStructure } from "@/lib/models/SalaryStructure";
import { verifyAccessToken } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    await connectToDatabase();
    
    // Auth
    const token = req.headers.get("cookie")?.match(/accessToken=([^;]+)/)?.[1];
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    // let payload = verifyAccessToken(token); // Manager role check could go here

    const { searchParams } = new URL(req.url);
    const employeeId = searchParams.get("employeeId");

    let query = {};
    if (employeeId) query = { employeeId };

    const structures = await SalaryStructure.find(query).populate("employeeId", "firstName lastName employeeCode department").lean();

    return NextResponse.json({ success: true, data: structures });
  } catch (error) {
    console.error("Fetch Salary Structure Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await connectToDatabase();
    
    const token = req.headers.get("cookie")?.match(/accessToken=([^;]+)/)?.[1];
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const data = await req.json();

    const structure = await SalaryStructure.findOneAndUpdate(
      { employeeId: data.employeeId },
      { ...data },
      { new: true, upsert: true } // Create if doesn't exist, update if it does
    );

    // Invalidate/delete any existing "Draft" payroll slips for this employee 
    // so they are forced to be regenerated with the new salary structure.
    try {
      const { Payroll } = await import("@/lib/models/Payroll");
      await Payroll.deleteMany({ employeeId: data.employeeId, status: "Draft" });
    } catch (e) {
      console.error("Failed to delete draft payrolls on structure update", e);
    }

    return NextResponse.json({ success: true, data: structure });
  } catch (error) {
    console.error("Save Salary Structure Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
