import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { Investor } from "@/lib/models/Investor";
import fs from "fs/promises";
import path from "path";
import { v4 as uuidv4 } from "uuid";

async function extractBase64(base64String: string, uploadsDir: string) {
  const matches = base64String.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
  if (!matches || matches.length !== 3) return null;

  const mimeType = matches[1];
  let ext = ".jpg";
  if (mimeType.includes("png")) ext = ".png";
  else if (mimeType.includes("webp")) ext = ".webp";
  else if (mimeType.includes("pdf")) ext = ".pdf";

  const buffer = Buffer.from(matches[2], "base64");
  const fileName = `${uuidv4()}${ext}`;
  const filePath = path.join(uploadsDir, fileName);

  await fs.mkdir(uploadsDir, { recursive: true });
  await fs.writeFile(filePath, buffer);

  return `/uploads/${fileName}`;
}

export async function GET() {
  try {
    await connectToDatabase();
    const uploadsDir = path.join(process.cwd(), "public/uploads");
    const investors = await Investor.find({});
    
    let modifiedCount = 0;

    for (const inv of investors) {
      const doc = inv.toObject();
      let updated = false;

      // KYC Docs
      if (doc.kycDocs) {
        const keys = ["aadharDocUrl", "panDocUrl", "marksheet10thUrl", "marksheet12thUrl", "graduationUrl", "postGraduationUrl", "bankPassbookUrl"];
        for (const key of keys) {
          if (doc.kycDocs[key] && doc.kycDocs[key].startsWith("data:")) {
            const url = await extractBase64(doc.kycDocs[key], uploadsDir);
            if (url) { doc.kycDocs[key] = url; updated = true; }
          }
        }
      }

      // Debenture Form Docs
      if (doc.debentureForm) {
        const keys = ["passportPhotoUrl", "nomineeDocUrl"];
        for (const key of keys) {
          if (doc.debentureForm[key] && doc.debentureForm[key].startsWith("data:")) {
            const url = await extractBase64(doc.debentureForm[key], uploadsDir);
            if (url) { doc.debentureForm[key] = url; updated = true; }
          }
        }
      }

      // Root level Nominee Doc
      if (doc.nomineeDocUrl && doc.nomineeDocUrl.startsWith("data:")) {
        const url = await extractBase64(doc.nomineeDocUrl, uploadsDir);
        if (url) { doc.nomineeDocUrl = url; updated = true; }
      }

      // Bond Agreement Signature
      if (doc.bondAgreement && doc.bondAgreement.signatureUrl && doc.bondAgreement.signatureUrl.startsWith("data:")) {
        const url = await extractBase64(doc.bondAgreement.signatureUrl, uploadsDir);
        if (url) { doc.bondAgreement.signatureUrl = url; updated = true; }
      }

      if (updated) {
        await Investor.updateOne({ _id: doc._id }, { $set: doc });
        modifiedCount++;
      }
    }

    return NextResponse.json({ success: true, message: `Migrated ${modifiedCount} old investors.` });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
