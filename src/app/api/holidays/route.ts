import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { Holiday } from "@/lib/models/Holiday";

export async function GET(req: Request) {
  try {
    await connectToDatabase();
    
    // Fetch all holidays sorted by date
    const holidays = await Holiday.find({})
      .sort({ date: 1 })
      .lean();

    return NextResponse.json({ success: true, data: holidays });
  } catch (error) {
    console.error("Fetch Holidays Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await connectToDatabase();
    
    const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
    const cookieToken = req.headers.get("cookie")?.match(/accessToken=([^;]+)/)?.[1];
    const token = cookieToken || (authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : authHeader);

    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { verifyAccessToken } = require("@/lib/auth");
    const payload = verifyAccessToken(token);
    if (!payload || payload.role === "Employee") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { name, date, type, description } = await req.json();

    const holiday = await Holiday.create({
      name,
      date: new Date(date),
      type,
      description
    });

    return NextResponse.json({ success: true, data: holiday });
  } catch (error: any) {
    console.error("Create Holiday Error:", error);
    if (error.code === 11000) {
       return NextResponse.json({ error: "Holiday already exists on this date" }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
