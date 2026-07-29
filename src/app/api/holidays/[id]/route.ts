import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { Holiday } from "@/lib/models/Holiday";
import { verifyAccessToken } from "@/lib/auth";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectToDatabase();
    
    const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
    const cookieToken = req.headers.get("cookie")?.match(/accessToken=([^;]+)/)?.[1];
    const token = cookieToken || (authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : authHeader);

    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    
    const payload = verifyAccessToken(token);
    if (!payload || payload.role === "Employee") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const { name, date, type, description } = await req.json();

    const holiday = await Holiday.findByIdAndUpdate(
      id,
      {
        name,
        date: new Date(date),
        type,
        description
      },
      { new: true }
    );

    if (!holiday) {
      return NextResponse.json({ error: "Holiday not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: holiday });
  } catch (error: any) {
    console.error("Update Holiday Error:", error);
    if (error.code === 11000) {
      return NextResponse.json({ error: "Holiday already exists on this date" }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectToDatabase();
    
    const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
    const cookieToken = req.headers.get("cookie")?.match(/accessToken=([^;]+)/)?.[1];
    const token = cookieToken || (authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : authHeader);

    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    
    const payload = verifyAccessToken(token);
    if (!payload || payload.role === "Employee") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const holiday = await Holiday.findByIdAndDelete(id);

    if (!holiday) {
      return NextResponse.json({ error: "Holiday not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Holiday deleted successfully" });
  } catch (error: any) {
    console.error("Delete Holiday Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
