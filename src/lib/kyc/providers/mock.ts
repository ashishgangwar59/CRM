import { KycProvider, KycUserError } from "../types";

/**
 * TEST MODE provider – no real government check happens.
 *  - Aadhaar OTP is always 123456
 *  - Any well-formed PAN is "valid"; PANs starting with "ZZZZZ" are reported invalid
 *  - Names/numbers are echoed back from what the applicant entered
 * Never use in production.
 */
export const mockProvider: KycProvider = {
  name: "mock",

  async generateAadhaarOtp(aadhaarNumber) {
    return { providerRef: `mock-${aadhaarNumber.slice(-4)}-${Date.now()}` };
  },

  async verifyAadhaarOtp(providerRef, otp, hints) {
    if (otp !== "123456") throw new KycUserError("Invalid OTP. (Test mode: use 123456)");
    const last4 = providerRef.split("-")[1] || "0000";
    return {
      name: (hints?.expectedName || "TEST APPLICANT").toUpperCase(),
      dob: "1990-01-01",
      gender: "M",
      address: "Test Address, Test City",
      city: "Test City",
      state: "Delhi",
      pinCode: "110001",
      last4,
    };
  },

  async verifyPan(panNumber, hints) {
    if (panNumber.startsWith("ZZZZZ")) return { valid: false };
    return { valid: true, name: (hints?.expectedName || "TEST APPLICANT").toUpperCase(), aadhaarLinked: true };
  },

  async ocrDocument(_kind, _file, hints) {
    return { number: hints?.expectedNumber, name: hints?.expectedName?.toUpperCase() };
  },
};
