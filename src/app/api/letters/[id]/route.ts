import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { verifyAccessToken } from "@/lib/auth";
import { LetterRegister } from "@/lib/models/LetterRegister";
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
    const data = await req.json();

    const updated = await LetterRegister.findByIdAndUpdate(
      id,
      { ...data },
      { new: true }
    );

    if (!updated) {
      return NextResponse.json({ success: false, error: "Letter entry not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    console.error("Update Letter Error:", error);
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
    // Restrict DELETE to ADMIN and KEY_ADMIN only
    if (!user || (user.role !== "ADMIN" && user.role !== "KEY_ADMIN")) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 });
    }

    const { id } = await params;
    
    const letter = await LetterRegister.findByIdAndDelete(id);
    if (!letter) {
      return NextResponse.json({ success: false, error: "Letter entry not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Letter entry deleted successfully" });
  } catch (error: any) {
    console.error("Delete Letter Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
