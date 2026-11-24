export interface KycConfig {
  enabled: boolean;
  provider: "mock" | "surepass";
  mode: "sandbox" | "live";
  apiToken: string;
  nameMatchThreshold: number; // 0-100
  requireDocumentMatch: boolean;
  allowManualReviewFallback: boolean;
}

export interface AadhaarOtpResult {
  providerRef: string; // id needed to submit the OTP (e.g. Surepass client_id)
}

export interface AadhaarDetails {
  name: string;
  dob?: string;
  gender?: string;
  address?: string;
  city?: string;
  state?: string;
  pinCode?: string;
  careOf?: string;
  last4?: string;
}

export interface PanDetails {
  valid: boolean;
  name?: string;
  dob?: string;
  aadhaarLinked?: boolean | null;
}

export interface OcrResult {
  number?: string; // Aadhaar (often masked "XXXX XXXX 1234") or PAN as printed on the card
  name?: string;
  dob?: string;
}

/** Hints are ONLY used by the mock provider to simulate realistic responses in test mode. */
export interface MockHints {
  expectedName?: string;
  expectedNumber?: string;
}

export interface KycProvider {
  name: string;
  generateAadhaarOtp(aadhaarNumber: string): Promise<AadhaarOtpResult>;
  verifyAadhaarOtp(providerRef: string, otp: string, hints?: MockHints): Promise<AadhaarDetails>;
  verifyPan(panNumber: string, hints?: MockHints): Promise<PanDetails>;
  ocrDocument(kind: "aadhaar" | "pan", file: { buffer: Buffer; filename: string; mimeType: string }, hints?: MockHints): Promise<OcrResult>;
}

/** Error with a message that is safe to show to the applicant. */
export class KycUserError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}
