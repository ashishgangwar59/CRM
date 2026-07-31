import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { SignatureSession } from "@/lib/models/SignatureSession";
import { v4 as uuidv4 } from "uuid";

export async function POST(req: Request) {
  try {
    await connectToDatabase();
    const sessionToken = `sig_${uuidv4().replace(/-/g, "").slice(0, 12)}`;

    const session = await SignatureSession.create({
      sessionToken,
      status: "PENDING"
    });

    return NextResponse.json({
      success: true,
      sessionToken: session.sessionToken
    });
  } catch (error: any) {
    console.error("Create Signature Session Error:", error);
    return NextResponse.json({ error: "Failed to create signature session." }, { status: 500 });
  }
}
