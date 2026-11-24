"use client";

import { useState } from "react";
import { ShieldCheck, ShieldAlert, ShieldQuestion, Loader2 } from "lucide-react";

type KycVerification = {
  status?: "Not Started" | "Verified" | "Needs Review" | "Manual Override";
  aadhaarMasked?: string;
  aadhaarName?: string;
  aadhaarDob?: string;
  panNumber?: string;
  panName?: string;
  panAadhaarLinked?: boolean | null;
  nameMatchScore?: number;
  documentsMatched?: boolean;
  provider?: string;
  verifiedAt?: string;
  overrideReason?: string;
  overriddenAt?: string;
};

/** Small badge for the investor list. */
export function KycStatusBadge({ kyc }: { kyc?: KycVerification }) {
  const status = kyc?.status || "Not Started";
  const styles: Record<string, string> = {
    "Verified": "bg-emerald-100 text-emerald-700",
    "Manual Override": "bg-indigo-100 text-indigo-700",
    "Needs Review": "bg-amber-100 text-amber-700",
    "Not Started": "bg-zinc-100 text-zinc-500",
  };
  const Icon = status === "Verified" || status === "Manual Override" ? ShieldCheck : status === "Needs Review" ? ShieldAlert : ShieldQuestion;
  const label = status === "Verified" ? (kyc?.provider === "mock" ? "Gov KYC (TEST)" : "Gov KYC ✓") : status === "Manual Override" ? "KYC Override" : status === "Needs Review" ? "KYC Review" : "KYC Pending";
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${styles[status] || styles["Not Started"]}`}>
      <Icon className="h-3 w-3" /> {label}
    </span>
  );
}

/** Details card + manual override for the investor detail view (Admin / Key Admin). */
export function KycDetailsCard({
  investorId, kyc, canOverride, onUpdated,
}: { investorId: string; kyc?: KycVerification; canOverride: boolean; onUpdated?: (investor: any) => void }) {
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const status = kyc?.status || "Not Started";
  const approved = status === "Verified" || status === "Manual Override";

  const override = async () => {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/kyc/override", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ investorId, reason }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Override failed");
      setReason("");
      onUpdated?.(json.data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3 rounded-xl border border-zinc-200 p-4 text-sm">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-500">Government KYC (Aadhaar & PAN)</h3>
        <KycStatusBadge kyc={kyc} />
      </div>

      {status === "Not Started" ? (
        <p className="text-xs text-zinc-500">This investor has not completed Aadhaar & PAN verification yet.</p>
      ) : (
        <div className="grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
          <div><span className="text-zinc-500">Aadhaar:</span> <b>{kyc?.aadhaarMasked || "—"}</b></div>
          <div><span className="text-zinc-500">Name on Aadhaar:</span> <b>{kyc?.aadhaarName || "—"}</b></div>
          <div><span className="text-zinc-500">DOB (Aadhaar):</span> <b>{kyc?.aadhaarDob || "—"}</b></div>
          <div><span className="text-zinc-500">PAN:</span> <b>{kyc?.panNumber || "—"}</b></div>
          <div><span className="text-zinc-500">Name on PAN:</span> <b>{kyc?.panName || "—"}</b></div>
          <div><span className="text-zinc-500">Name match:</span> <b>{kyc?.nameMatchScore != null ? `${kyc.nameMatchScore}%` : "—"}</b></div>
          <div><span className="text-zinc-500">PAN–Aadhaar linked:</span> <b>{kyc?.panAadhaarLinked == null ? "Unknown" : kyc.panAadhaarLinked ? "Yes" : "No"}</b></div>
          <div><span className="text-zinc-500">Uploaded cards matched:</span> <b>{kyc?.documentsMatched ? "Yes" : "No"}</b></div>
          {kyc?.verifiedAt && <div><span className="text-zinc-500">Verified on:</span> <b>{new Date(kyc.verifiedAt).toLocaleString()}</b></div>}
          {kyc?.provider && <div><span className="text-zinc-500">Provider:</span> <b>{kyc.provider === "mock" ? "TEST MODE (not real)" : kyc.provider}</b></div>}
          {status === "Manual Override" && (
            <div className="sm:col-span-2 rounded-md bg-indigo-50 p-2 text-indigo-800">
              <b>Manually approved</b>{kyc?.overriddenAt ? ` on ${new Date(kyc.overriddenAt).toLocaleString()}` : ""}: {kyc?.overrideReason}
            </div>
          )}
        </div>
      )}

      {canOverride && !approved && (
        <div className="space-y-2 border-t border-zinc-100 pt-3">
          <p className="text-xs text-zinc-500">
            Manual override – use only when online verification isn&apos;t possible and you have checked the original documents. This is recorded in the audit log.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              className="h-9 flex-1 rounded-md border border-zinc-300 px-3 text-xs"
              placeholder="Reason (e.g. Originals verified in office on 22-11-2026)"
              value={reason}
              onChange={e => setReason(e.target.value)}
            />
            <button
              type="button"
              onClick={override}
              disabled={busy || reason.trim().length < 5}
              className="inline-flex h-9 items-center gap-1 rounded-md bg-indigo-600 px-3 text-xs font-semibold text-white disabled:opacity-50"
            >
              {busy && <Loader2 className="h-3 w-3 animate-spin" />} Approve KYC manually
            </button>
          </div>
          {error && <p className="text-xs font-semibold text-rose-600">{error}</p>}
        </div>
      )}
    </div>
  );
}
