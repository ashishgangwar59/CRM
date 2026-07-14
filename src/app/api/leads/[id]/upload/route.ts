import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { verifyAccessToken } from "@/lib/auth";
import { LeadAttachment } from "@/lib/models/LeadAttachment";
import { LeadActivity } from "@/lib/models/LeadActivity";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { v4 as uuidv4 } from "uuid";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectToDatabase();
    const { id } = await params;
    
    const token = req.headers.get("cookie")?.match(/accessToken=([^;]+)/)?.[1];
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    let payload;
    try { payload = verifyAccessToken(token); } 
    catch { return NextResponse.json({ error: "Invalid token" }, { status: 401 }); }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    
    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const uploadDir = path.join(process.cwd(), "public/uploads");
    await mkdir(uploadDir, { recursive: true });

    const uniqueFilename = `${uuidv4()}-${file.name}`;
    const filePath = path.join(uploadDir, uniqueFilename);
    await writeFile(filePath, buffer);

    const fileUrl = `/uploads/${uniqueFilename}`;

    const attachment = await LeadAttachment.create({
      leadId: id,
      fileName: file.name,
      fileUrl: fileUrl,
      uploadedBy: payload.userId
    });

    // Auto-log activity
    await LeadActivity.create({
      leadId: id,
      type: "Note",
      content: `Uploaded attachment: ${file.name}`,
      createdBy: payload.userId
    });

    return NextResponse.json({ success: true, message: "File uploaded successfully", data: attachment });
  } catch (error) {
    console.error("Upload Lead Attachment Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
