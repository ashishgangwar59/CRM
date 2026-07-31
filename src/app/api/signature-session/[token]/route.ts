import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { SignatureSession } from "@/lib/models/SignatureSession";

export async function GET(req: Request, { params }: { params: Promise<{ token: string }> }) {
  try {
    await connectToDatabase();
    const { token } = await params;

    const session = await SignatureSession.findOne({ sessionToken: token }).lean();
    if (!session) {
      return NextResponse.json({ error: "Signature session expired or not found." }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      status: session.status,
      signatureUrl: session.signatureUrl || null
    });
  } catch (error: any) {
    console.error("Get Signature Session Error:", error);
    return NextResponse.json({ error: "Failed to fetch signature session." }, { status: 500 });
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  try {
    await connectToDatabase();
    const { token } = await params;
    const { signatureUrl } = await req.json();

    if (!signatureUrl) {
      return NextResponse.json({ error: "No signature image provided." }, { status: 400 });
    }

    const session = await SignatureSession.findOne({ sessionToken: token });
    if (!session) {
      return NextResponse.json({ error: "Signature session expired or not found." }, { status: 404 });
    }

    session.signatureUrl = signatureUrl;
    session.status = "COMPLETED";
    await session.save();

    return NextResponse.json({
      success: true,
      message: "Signature submitted successfully!"
    });
  } catch (error: any) {
    console.error("Submit Signature Session Error:", error);
    return NextResponse.json({ error: "Failed to submit signature." }, { status: 500 });
  }
}
