import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import {
  KYC_ALLOWED_MIME, KYC_LIMITS, addLog, evaluateSession, findSession, getKycConfig, getProvider,
  kycErrorResponse, publicView, saveKycFile,
} from "@/lib/kyc/service";
import { nameMatchScore } from "@/lib/kyc/nameMatch";
import { KycUserError } from "@/lib/kyc/types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_FILE_BYTES = 5 * 1024 * 1024;

/**
 * multipart/form-data: { token?, kind: "aadhaar" | "pan", file }
 * Reads the uploaded card (OCR) and checks that the number and name printed on it
 * match the government-verified Aadhaar / PAN. Saves the file and returns its URL.
 */
export async function POST(req: Request) {
  try {
    await connectToDatabase();
    const config = await getKycConfig();
    if (!config.enabled) throw new KycUserError("KYC verification is not enabled.", 400);

    const form = await req.formData();
    const kind = String(form.get("kind") || "");
    const token = form.get("token") ? String(form.get("token")) : undefined;
    const file = form.get("file");

    if (kind !== "aadhaar" && kind !== "pan") throw new KycUserError("Invalid document type.");
    if (!file || typeof file === "string") throw new KycUserError("Please choose a file to upload.");
    const mimeType = (file as File).type || "";
    if (!KYC_ALLOWED_MIME[mimeType]) throw new KycUserError("Only JPG, PNG, WEBP or PDF files are allowed.");
    if ((file as File).size > MAX_FILE_BYTES) throw new KycUserError("File must be 5 MB or smaller.");

    const session = await findSession(req, token);
    const docState: any = (session.documents as any)?.[kind] || { status: "Pending", attempts: 0 };

    if (kind === "aadhaar" && session.aadhaar?.status !== "Verified") throw new KycUserError("Verify your Aadhaar number with OTP first.");
    if (kind === "pan" && session.pan?.status !== "Verified") throw new KycUserError("Verify your PAN number first.");
    if ((docState.attempts || 0) >= KYC_LIMITS.documentAttempts) {
      throw new KycUserError("Upload limit reached for this document. Please contact support.", 429);
    }

    const buffer = Buffer.from(await (file as File).arrayBuffer());
    const url = await saveKycFile(buffer, mimeType);

    const verifiedName = kind === "aadhaar" ? session.aadhaar.name : session.pan.name;
    const expectedNumber = kind === "aadhaar" ? `XXXX XXXX ${session.aadhaar.last4}` : session.pan.number;
    const attempts = (docState.attempts || 0) + 1;
    const label = kind === "aadhaar" ? "Aadhaar" : "PAN";

    let status: "Matched" | "Failed" = "Failed";
    let error = "";
    let extractedNumber = "";
    let extractedName = "";

    try {
      const provider = getProvider(config);
      const ocr = await provider.ocrDocument(
        kind,
        { buffer, filename: (file as File).name || `${kind}${KYC_ALLOWED_MIME[mimeType]}`, mimeType },
        { expectedName: verifiedName, expectedNumber }
      );
      extractedNumber = String(ocr.number || "").toUpperCase();
      extractedName = String(ocr.name || "");

      if (!extractedNumber) {
        error = `Could not read the ${label} number from the uploaded file. Please upload a clear, uncropped photo or scan of the card.`;
      } else if (kind === "aadhaar" && extractedNumber.replace(/\D/g, "").slice(-4) !== session.aadhaar.last4) {
        error = "The Aadhaar number on the uploaded card does not match the verified Aadhaar number.";
      } else if (kind === "pan" && extractedNumber.replace(/[^A-Z0-9]/g, "") !== session.pan.number) {
        error = "The PAN number on the uploaded card does not match the verified PAN number.";
      } else if (extractedName && nameMatchScore(extractedName, verifiedName) < config.nameMatchThreshold) {
        error = `The name on the uploaded ${label} card (${extractedName}) does not match the verified name (${verifiedName}).`;
      } else {
        status = "Matched";
      }
    } catch (e: any) {
      error = e instanceof KycUserError ? e.message : "Could not read the document. Please try again.";
      if (!(e instanceof KycUserError)) console.error("[KYC] OCR error:", e);
    }

    (session.documents as any)[kind] = {
      status,
      url,
      extractedNumber: kind === "aadhaar" ? (extractedNumber ? `XXXX${extractedNumber.replace(/\D/g, "").slice(-4)}` : "") : extractedNumber,
      extractedName,
      attempts,
      error,
    };
    addLog(session, `document.${kind}`, status, error || undefined);
    evaluateSession(session, config);
    session.markModified("documents");
    await session.save();

    if (status !== "Matched") {
      return NextResponse.json({ success: false, error, data: publicView(session, config) }, { status: 400 });
    }
    return NextResponse.json({ success: true, message: `${label} card matched successfully.`, data: publicView(session, config) });
  } catch (e) {
    const { body, status } = kycErrorResponse(e);
    return NextResponse.json(body, { status });
  }
}
