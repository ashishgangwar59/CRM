import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { v4 as uuidv4 } from "uuid";

export async function POST(req: Request) {
  try {
    const contentType = req.headers.get("content-type") || "";

    // Handle base64 JSON payload (for mobile/tablet live photo captures)
    if (contentType.includes("application/json")) {
      const { base64, fileName: requestedName } = await req.json();
      if (!base64) {
        return NextResponse.json({ error: "No base64 image data received." }, { status: 400 });
      }

      const matches = base64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      let buffer: Buffer;
      let ext = ".jpg";

      if (matches && matches.length === 3) {
        const mimeType = matches[1];
        if (mimeType.includes("png")) ext = ".png";
        else if (mimeType.includes("webp")) ext = ".webp";
        else if (mimeType.includes("pdf")) ext = ".pdf";
        buffer = Buffer.from(matches[2], "base64");
      } else {
        buffer = Buffer.from(base64, "base64");
      }

      const uploadsDir = path.join(process.cwd(), "public/uploads");
      try {
        await mkdir(uploadsDir, { recursive: true });
      } catch (e) {
        // Ignore if directory exists
      }

      const fileName = `${uuidv4()}${ext}`;
      const filePath = path.join(uploadsDir, fileName);
      await writeFile(filePath, buffer);

      return NextResponse.json({ success: true, url: `/uploads/${fileName}`, name: requestedName || fileName });
    }

    // Handle standard FormData upload
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file received." }, { status: 400 });
    }

    // Allowed extensions and MIME types for documents & photos
    const allowedExts = [".pdf", ".jpg", ".jpeg", ".png", ".webp", ".gif"];
    const allowedMimeTypes = [
      "application/pdf",
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif",
      "image/jpg"
    ];

    let ext = path.extname(file.name || "").toLowerCase();
    if (!ext) {
      if (file.type === "image/png") ext = ".png";
      else if (file.type === "image/jpeg" || file.type === "image/jpg") ext = ".jpg";
      else if (file.type === "image/webp") ext = ".webp";
      else if (file.type === "application/pdf") ext = ".pdf";
      else ext = ".jpg";
    }

    const isTypeValid = allowedMimeTypes.includes(file.type) || allowedExts.includes(ext);
    if (!isTypeValid) {
      return NextResponse.json({ error: "Only PDF documents and image files (JPG, PNG, WEBP) are allowed." }, { status: 400 });
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
