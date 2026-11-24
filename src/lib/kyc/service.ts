import crypto from "crypto";
import path from "path";
import { mkdir, writeFile } from "fs/promises";
import { v4 as uuidv4 } from "uuid";
import { SystemSettings } from "@/lib/models/SystemSettings";
import { KycSession, IKycSession } from "@/lib/models/KycSession";
import { verifyAccessToken } from "@/lib/auth";
import { KycConfig, KycProvider, KycUserError } from "./types";
import { mockProvider } from "./providers/mock";
import { createSurepassProvider } from "./providers/surepass";
import { nameMatchScore, normalizeDob } from "./nameMatch";

// ---- Limits (each call costs money with a real provider) ----
export const KYC_LIMITS = {
  otpSends: 3,
  otpAttempts: 5,
  panAttempts: 5,
  documentAttempts: 5,
  publicSessionsPerIpPerDay: 10,
  publicSessionTtlDays: 7,
};

// ---------------------------------------------------------------------------
// Config / provider
// ---------------------------------------------------------------------------

export async function getKycConfig(): Promise<KycConfig> {
  const settings: any = await SystemSettings.findOne().select("integrations.kyc").lean();
  const k = settings?.integrations?.kyc || {};
  return {
    enabled: Boolean(k.enabled),
    provider: k.provider === "surepass" ? "surepass" : "mock",
    mode: k.mode === "live" ? "live" : "sandbox",
    apiToken: k.apiToken || "",
    nameMatchThreshold: Math.min(100, Math.max(50, Number(k.nameMatchThreshold) || 80)),
    requireDocumentMatch: k.requireDocumentMatch !== false,
    allowManualReviewFallback: Boolean(k.allowManualReviewFallback),
  };
}

export function getProvider(config: KycConfig): KycProvider {
  if (config.provider === "surepass") return createSurepassProvider(config);
  return mockProvider;
}

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------

// Verhoeff checksum – every genuine Aadhaar number passes this.
const VERHOEFF_D = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], [1, 2, 3, 4, 0, 6, 7, 8, 9, 5], [2, 3, 4, 0, 1, 7, 8, 9, 5, 6],
  [3, 4, 0, 1, 2, 8, 9, 5, 6, 7], [4, 0, 1, 2, 3, 9, 5, 6, 7, 8], [5, 9, 8, 7, 6, 0, 4, 3, 2, 1],
  [6, 5, 9, 8, 7, 1, 0, 4, 3, 2], [7, 6, 5, 9, 8, 2, 1, 0, 4, 3], [8, 7, 6, 5, 9, 3, 2, 1, 0, 4],
  [9, 8, 7, 6, 5, 4, 3, 2, 1, 0],
];
const VERHOEFF_P = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], [1, 5, 7, 6, 2, 8, 3, 0, 9, 4], [5, 8, 0, 3, 7, 9, 6, 1, 4, 2],
  [8, 9, 1, 6, 0, 4, 3, 5, 2, 7], [9, 4, 5, 3, 1, 2, 6, 8, 7, 0], [4, 2, 8, 6, 5, 7, 3, 9, 0, 1],
  [2, 7, 9, 3, 8, 0, 6, 4, 1, 5], [7, 0, 4, 6, 9, 1, 3, 2, 5, 8],
];

export function isValidAadhaar(num: string): boolean {
  if (!/^[2-9]\d{11}$/.test(num)) return false;
  let c = 0;
  const digits = num.split("").reverse().map(Number);
  digits.forEach((d, i) => { c = VERHOEFF_D[c][VERHOEFF_P[i % 8][d]]; });
  return c === 0;
}

export function isValidPan(pan: string): boolean {
  return /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(pan);
}

export function hashAadhaar(num: string): string {
  const secret = process.env.KYC_HASH_SECRET || process.env.JWT_SECRET || "kyc-dev-secret";
  return crypto.createHmac("sha256", secret).update(num).digest("hex");
}

export function maskAadhaar(last4?: string): string {
  return last4 ? `XXXXXXXX${last4}` : "";
}

// ---------------------------------------------------------------------------
// Session handling
// ---------------------------------------------------------------------------

export function getRequestAuth(req: Request): { userId: string; role: string } | null {
  const cookieToken = req.headers.get("cookie")?.match(/accessToken=([^;]+)/)?.[1];
  const authHeader = req.headers.get("authorization");
  const token = cookieToken || (authHeader?.startsWith("Bearer ") ? authHeader.substring(7).trim() : null);
  if (!token) return null;
  try {
    const payload: any = verifyAccessToken(token);
    if (!payload?.userId) return null;
    return { userId: String(payload.userId), role: String(payload.role || "").toUpperCase().replace(/_/g, "") };
  } catch {
    return null;
  }
}

export function getClientIp(req: Request): string {
  return (req.headers.get("x-forwarded-for")?.split(",")[0] || req.headers.get("x-real-ip") || "unknown").trim();
}

/**
 * Finds the KYC session for this request.
 *  - Logged-in INVESTOR → their own session (created on demand).
 *  - Otherwise → the session identified by `token` (public Debenture Application).
 */
export async function findSession(req: Request, token?: string | null, opts: { create?: boolean } = {}): Promise<IKycSession> {
  const auth = getRequestAuth(req);
  const config = await getKycConfig();

  if (auth?.role === "INVESTOR") {
    let session = await KycSession.findOne({ userId: auth.userId }).sort({ createdAt: -1 });
    if (!session && opts.create) {
      session = await KycSession.create({
        token: crypto.randomBytes(32).toString("hex"),
        userId: auth.userId,
        provider: config.provider,
        ip: getClientIp(req),
      });
    }
    if (!session) throw new KycUserError("Verification session not found. Please start again.", 404);
    return session;
  }

  if (token && /^[a-f0-9]{64}$/.test(token)) {
    const session = await KycSession.findOne({ token });
    if (session) return session;
  }

  if (!opts.create) throw new KycUserError("Verification session expired. Please start verification again.", 404);

  const ip = getClientIp(req);
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const recent = await KycSession.countDocuments({ ip, userId: { $exists: false }, createdAt: { $gte: since } });
  if (recent >= KYC_LIMITS.publicSessionsPerIpPerDay) {
    throw new KycUserError("Too many verification attempts from this network today. Please try again tomorrow.", 429);
  }
  return KycSession.create({
    token: crypto.randomBytes(32).toString("hex"),
    provider: config.provider,
    ip,
    expiresAt: new Date(Date.now() + KYC_LIMITS.publicSessionTtlDays * 24 * 60 * 60 * 1000),
  });
}

/** Plain-object copy of a nested path (e.g. "aadhaar", "documents.pan") – safe to spread. */
export function plainPath(session: IKycSession, pathName: string): any {
  const obj: any = session.toObject();
  return pathName.split(".").reduce((acc, key) => (acc ? acc[key] : undefined), obj) || {};
}

export function addLog(session: IKycSession, action: string, result: string, detail?: string) {
  session.log = [...(session.log || []), { at: new Date(), action, result, detail: detail?.slice(0, 300) }].slice(-50) as any;
}

/** Recomputes the name-match score and overall status. */
export function evaluateSession(session: IKycSession, config: KycConfig) {
  const aadhaarOk = session.aadhaar?.status === "Verified";
  const panOk = session.pan?.status === "Verified";
  if (aadhaarOk && panOk) {
    session.nameMatchScore = nameMatchScore(session.aadhaar.name, session.pan.name);
  }
  const namesOk = (session.nameMatchScore ?? 0) >= config.nameMatchThreshold;
  const docsOk = !config.requireDocumentMatch ||
    (session.documents?.aadhaar?.status === "Matched" && session.documents?.pan?.status === "Matched");

  if (aadhaarOk && panOk && namesOk && docsOk) session.overallStatus = "Verified";
  else if (aadhaarOk && panOk && !namesOk) session.overallStatus = "Failed";
  else session.overallStatus = "In Progress";
}

/** Safe data returned to the browser. Never includes the full Aadhaar number or hashes. */
export function publicView(session: IKycSession, config: KycConfig) {
  const a = session.aadhaar || ({} as any);
  const p = session.pan || ({} as any);
  const d = session.documents || ({} as any);
  return {
    token: session.userId ? undefined : session.token,
    overallStatus: session.overallStatus,
    testMode: config.provider === "mock",
    requireDocumentMatch: config.requireDocumentMatch,
    allowManualReviewFallback: config.allowManualReviewFallback,
    nameMatchThreshold: config.nameMatchThreshold,
    nameMatchScore: session.nameMatchScore ?? null,
    consentGiven: Boolean(session.consentAt),
    aadhaar: {
      status: a.status || "Pending",
      masked: maskAadhaar(a.last4),
      name: a.name || "",
      dob: normalizeDob(a.dob) || a.dob || "",
      gender: a.gender || "",
      address: a.address || "",
      city: a.city || "",
      state: a.state || "",
      pinCode: a.pinCode || "",
      careOf: a.careOf || "",
      error: a.error || "",
      otpSendsLeft: Math.max(0, KYC_LIMITS.otpSends - (a.otpSends || 0)),
      otpAttemptsLeft: Math.max(0, KYC_LIMITS.otpAttempts - (a.otpAttempts || 0)),
    },
    pan: {
      status: p.status || "Pending",
      number: p.number || "",
      name: p.name || "",
      aadhaarLinked: p.aadhaarLinked ?? null,
      error: p.error || "",
      attemptsLeft: Math.max(0, KYC_LIMITS.panAttempts - (p.attempts || 0)),
    },
    documents: {
      aadhaar: { status: d.aadhaar?.status || "Pending", url: d.aadhaar?.url || "", error: d.aadhaar?.error || "", attemptsLeft: Math.max(0, KYC_LIMITS.documentAttempts - (d.aadhaar?.attempts || 0)) },
      pan: { status: d.pan?.status || "Pending", url: d.pan?.url || "", error: d.pan?.error || "", attemptsLeft: Math.max(0, KYC_LIMITS.documentAttempts - (d.pan?.attempts || 0)) },
    },
  };
}

/** Summary stored on the Investor record. */
export function investorSummary(session: IKycSession, status: "Verified" | "Needs Review") {
  return {
    status,
    sessionId: session._id,
    aadhaarMasked: maskAadhaar(session.aadhaar?.last4),
    aadhaarName: session.aadhaar?.name || "",
    aadhaarDob: normalizeDob(session.aadhaar?.dob) || session.aadhaar?.dob || "",
    panNumber: session.pan?.number || "",
    panName: session.pan?.name || "",
    panAadhaarLinked: session.pan?.aadhaarLinked ?? null,
    nameMatchScore: session.nameMatchScore ?? 0,
    documentsMatched: session.documents?.aadhaar?.status === "Matched" && session.documents?.pan?.status === "Matched",
    provider: session.provider,
    verifiedAt: status === "Verified" ? (session.pan?.verifiedAt || new Date()) : undefined,
  };
}

/**
 * Used by the Debenture Application submit and the investor KYC submit.
 * Returns the verified session (or a "Needs Review" result when fallback is allowed),
 * or throws a KycUserError explaining what is missing.
 */
export async function requireVerifiedKyc(req: Request, opts: { kycToken?: string; applicantName?: string; existingInvestorKyc?: any }) {
  const config = await getKycConfig();
  if (!config.enabled) return { enabled: false as const };

  // An investor already verified earlier (or approved by admin override) can re-apply.
  const existing = opts.existingInvestorKyc;
  if (existing && (existing.status === "Verified" || existing.status === "Manual Override")) {
    return { enabled: true as const, status: existing.status as string, session: null, existing, config };
  }

  let session: IKycSession | null = null;
  try {
    session = await findSession(req, opts.kycToken);
  } catch {
    session = null;
  }

  if (session) evaluateSession(session, config);

  if (session?.overallStatus === "Verified") {
    if (opts.applicantName) {
      const score = nameMatchScore(opts.applicantName, session.aadhaar.name);
      if (score < config.nameMatchThreshold) {
        throw new KycUserError(`Applicant name must match the name on Aadhaar (${session.aadhaar.name}).`);
      }
    }
    return { enabled: true as const, status: "Verified", session, config };
  }

  if (config.allowManualReviewFallback) {
    return { enabled: true as const, status: "Needs Review", session, config };
  }

  throw new KycUserError("Please complete Aadhaar & PAN verification (KYC) before submitting the form.", 403);
}

// ---------------------------------------------------------------------------
// File storage for verified documents
// ---------------------------------------------------------------------------

export const KYC_ALLOWED_MIME: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/jpg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "application/pdf": ".pdf",
};

export async function saveKycFile(buffer: Buffer, mimeType: string): Promise<string> {
  const ext = KYC_ALLOWED_MIME[mimeType] || ".bin";
  const fileName = `${uuidv4()}${ext}`;
  const uploadsDir = path.join(process.cwd(), "public/uploads");
  await mkdir(uploadsDir, { recursive: true });
  await writeFile(path.join(uploadsDir, fileName), buffer);
  return `/api/uploads/${fileName}`;
}

/** Standard JSON error response for KYC routes. */
export function kycErrorResponse(e: any) {
  const status = e instanceof KycUserError ? e.status : 500;
  const message = e instanceof KycUserError ? e.message : "Verification failed due to a server error. Please try again.";
  if (!(e instanceof KycUserError)) console.error("[KYC] Unexpected error:", e);
  return { body: { success: false, error: message }, status };
}
