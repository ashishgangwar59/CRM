import { KycConfig, KycProvider, KycUserError } from "../types";

/**
 * Surepass KYC API adapter (https://surepass.io).
 *
 * NOTE: Endpoint paths and response fields below follow Surepass' public API
 * (aadhaar-v2 OTP, pan-comprehensive, OCR). Verify them against the docs/sandbox in
 * your Surepass dashboard before going live – response parsing is defensive and looks
 * up fields by several common names, but providers do change their APIs.
 */

const BASE_URLS = {
  sandbox: "https://sandbox.surepass.io/api/v1",
  live: "https://kyc-api.surepass.io/api/v1",
};

const TIMEOUT_MS = 45_000;

/** Depth-first search for the first non-empty value among `keys` anywhere in `obj`. */
function findValue(obj: any, keys: string[], depth = 0): any {
  if (!obj || typeof obj !== "object" || depth > 6) return undefined;
  for (const key of keys) {
    const v = obj[key];
    if (v !== undefined && v !== null && v !== "") {
      // OCR responses wrap values as { value, confidence }
      if (typeof v === "object" && !Array.isArray(v) && "value" in v) return v.value;
      if (typeof v !== "object") return v;
    }
  }
  for (const v of Object.values(obj)) {
    if (v && typeof v === "object") {
      const found = findValue(v, keys, depth + 1);
      if (found !== undefined) return found;
    }
  }
  return undefined;
}

function formatAddress(addr: any): string {
  if (!addr) return "";
  if (typeof addr === "string") return addr;
  const parts = ["house", "street", "landmark", "loc", "vtc", "subdist", "po", "dist", "state", "country"]
    .map(k => addr[k])
    .filter(Boolean);
  return parts.join(", ");
}

export function createSurepassProvider(config: KycConfig): KycProvider {
  const baseUrl = BASE_URLS[config.mode] || BASE_URLS.sandbox;
  if (!config.apiToken) {
    console.error("[KYC] Surepass is selected but the API token is empty (Settings → Integrations → KYC).");
    throw new KycUserError("KYC service is not configured (API token missing). Please contact support.", 503);
  }

  async function call(path: string, init: { json?: any; form?: FormData }) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const res = await fetch(`${baseUrl}${path}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.apiToken}`,
          ...(init.json ? { "Content-Type": "application/json" } : {}),
        },
        body: init.json ? JSON.stringify(init.json) : init.form,
        signal: controller.signal,
      });
      let body: any = null;
      try { body = await res.json(); } catch { /* non-JSON */ }

      if (res.status === 401 || res.status === 403) {
        console.error(`[KYC] Surepass auth error on ${path}:`, body);
        throw new KycUserError("KYC service authentication failed. Please contact support.", 503);
      }
      if (!res.ok || body?.success === false) {
        const message = body?.message || body?.message_code || `HTTP ${res.status}`;
        console.warn(`[KYC] Surepass ${path} failed:`, message);
        // 4xx = invalid input from the user (wrong OTP, invalid PAN…) → show provider message
        if (res.status >= 400 && res.status < 500) throw new KycUserError(String(message));
        throw new KycUserError("Government verification service is temporarily unavailable. Please try again later.", 503);
      }
      return body?.data ?? body;
    } catch (e: any) {
      if (e instanceof KycUserError) throw e;
      if (e?.name === "AbortError") {
        throw new KycUserError("Verification service timed out. Please try again.", 504);
      }
      console.error(`[KYC] Surepass ${path} network error:`, e);
      throw new KycUserError("Could not reach the verification service. Please try again later.", 503);
    } finally {
      clearTimeout(timer);
    }
  }

  return {
    name: "surepass",

    async generateAadhaarOtp(aadhaarNumber) {
      const data = await call("/aadhaar-v2/generate-otp", { json: { id_number: aadhaarNumber } });
      const providerRef = findValue(data, ["client_id", "clientId", "reference_id"]);
      if (!providerRef) throw new KycUserError("Could not send OTP. Make sure a mobile number is linked to this Aadhaar.");
      return { providerRef: String(providerRef) };
    },

    async verifyAadhaarOtp(providerRef, otp) {
      const data = await call("/aadhaar-v2/submit-otp", { json: { client_id: providerRef, otp } });
      const address = data?.address;
      const aadhaarNo = String(findValue(data, ["aadhaar_number", "masked_aadhaar"]) || "");
      return {
        name: String(findValue(data, ["full_name", "name"]) || ""),
        dob: findValue(data, ["dob", "date_of_birth"]),
        gender: findValue(data, ["gender"]),
        address: formatAddress(address) || findValue(data, ["full_address"]),
        city: address?.dist || address?.vtc || undefined,
        state: address?.state || undefined,
        pinCode: String(findValue(data, ["zip", "pincode", "pin_code"]) || "") || undefined,
        careOf: findValue(data, ["care_of"]),
        last4: aadhaarNo.replace(/\D/g, "").slice(-4) || undefined,
      };
    },

    async verifyPan(panNumber) {
      const data = await call("/pan/pan-comprehensive", { json: { id_number: panNumber } });
      const name = findValue(data, ["full_name", "name", "registered_name"]);
      const linked = findValue(data, ["aadhaar_linked", "is_aadhaar_linked"]);
      return {
        valid: Boolean(name),
        name: name ? String(name) : undefined,
        dob: findValue(data, ["dob", "date_of_birth"]),
        aadhaarLinked: typeof linked === "boolean" ? linked : null,
      };
    },

    async ocrDocument(kind, file) {
      const form = new FormData();
      form.append("file", new Blob([new Uint8Array(file.buffer)], { type: file.mimeType }), file.filename);
      const data = await call(kind === "aadhaar" ? "/ocr/aadhaar" : "/ocr/pan", { form });
      const number = kind === "aadhaar"
        ? findValue(data, ["aadhaar_number", "document_number", "id_number"])
        : findValue(data, ["pan_number", "document_number", "id_number"]);
      return {
        number: number ? String(number) : undefined,
        name: findValue(data, ["full_name", "name"]),
        dob: findValue(data, ["dob", "date_of_birth"]),
      };
    },
  };
}
