import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET(
  req: Request,
  { params }: { params: { file: string[] } }
) {
  try {
    const filename = params.file.join("/");

    // Safety check to prevent directory traversal
    if (filename.includes("..") || filename.includes("\0")) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    // Check if the file exists in public/uploads
    const filePath = path.join(process.cwd(), "public", "uploads", filename);

    if (!fs.existsSync(filePath)) {
      return new NextResponse("File not found", { status: 404 });
    }

    const fileBuffer = fs.readFileSync(filePath);

    // Determine content type
    const ext = path.extname(filename).toLowerCase();
    let contentType = "application/octet-stream";
    if (ext === ".jpg" || ext === ".jpeg") contentType = "image/jpeg";
    else if (ext === ".png") contentType = "image/png";
    else if (ext === ".webp") contentType = "image/webp";
    else if (ext === ".gif") contentType = "image/gif";
    else if (ext === ".pdf") contentType = "application/pdf";

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400, must-revalidate",
      },
    });
  } catch (error) {
    console.error("File serve error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
