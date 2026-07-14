import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { Holiday } from "@/lib/models/Holiday";

export async function GET(req: Request) {
  try {
    await connectToDatabase();
    
    // Fetch upcoming holidays
    const holidays = await Holiday.find({ date: { $gte: new Date() } })
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
