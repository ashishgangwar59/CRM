import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { v4 as uuidv4 } from "uuid";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file received." }, { status: 400 });
    }

    // PDF validation: check file type & extension
    const ext = path.extname(file.name).toLowerCase();
    if (file.type !== "application/pdf" && ext !== ".pdf") {
      return NextResponse.json({ error: "Only PDF documents are allowed." }, { status: 400 });
    }

    // 15MB size validation (15 * 1024 * 1024 bytes)
    const MAX_SIZE = 15 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "File size exceeds maximum limit of 15MB." }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    
    // Ensure uploads directory exists
    const uploadsDir = path.join(process.cwd(), "public/uploads");
    try {
      await mkdir(uploadsDir, { recursive: true });
    } catch (e) {
      // Ignore if directory already exists
    }

    // Generate unique filename to prevent collisions
    const fileName = `${uuidv4()}${ext}`;
    const filePath = path.join(uploadsDir, fileName);

    await writeFile(filePath, buffer);
    
    const fileUrl = `/uploads/${fileName}`;

    return NextResponse.json({ success: true, url: fileUrl, name: file.name });
  } catch (error) {
    console.error("Upload Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
