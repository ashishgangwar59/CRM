import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { verifyAccessToken } from "@/lib/auth";
import fs from "fs";
import path from "path";
import mongoose from "mongoose";

async function checkAuth(req: Request) {
  const token = req.headers.get("cookie")?.match(/accessToken=([^;]+)/)?.[1];
  if (!token) return null;

  const payload = verifyAccessToken(token);
  if (!payload || !payload.userId) return null;

  const role = (payload.role || "").toUpperCase().replace("_", "");
  if (role !== "KEYADMIN" && role !== "ADMIN") return null;

  return payload;
}

export async function GET(req: Request) {
  try {
    await connectToDatabase();
    const authorized = await checkAuth(req);
    if (!authorized) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get database collection stats
    const db = mongoose.connection.db;
    if (!db) {
      return NextResponse.json({ error: "Database connection not ready" }, { status: 500 });
    }
    const collections = await db.listCollections().toArray();
    const collectionCount = collections.length;

    // Get upload folder stats
    const uploadDir = path.join(process.cwd(), "public/uploads");
    let fileCount = 0;
    let totalSize = 0;

    if (fs.existsSync(uploadDir)) {
      const files = fs.readdirSync(uploadDir);
      for (const file of files) {
        const filePath = path.join(uploadDir, file);
        if (fs.statSync(filePath).isFile()) {
          fileCount++;
          totalSize += fs.statSync(filePath).size;
        }
      }
    }

    const sizeInMb = (totalSize / (1024 * 1024)).toFixed(2);

    return NextResponse.json({
      success: true,
      collections: collectionCount,
      files: fileCount,
      sizeMb: sizeInMb
    });
  } catch (error) {
    console.error("Backup Status Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
