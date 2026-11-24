"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, Loader2, ShieldCheck, XCircle, Upload, RotateCcw, AlertTriangle, FileCheck2, X } from "lucide-react";

export type KycView = {
  token?: string;
  overallStatus: "In Progress" | "Verified" | "Failed";
  testMode: boolean;
  requireDocumentMatch: boolean;
  allowManualReviewFallback: boolean;
  nameMatchThreshold: number;
  nameMatchScore: number | null;
  consentGiven: boolean;
  aadhaar: {
    status: "Pending" | "OtpSent" | "Verified" | "Failed";
    masked: string; name: string; dob: string; gender: string;
    address: string; city: string; state: string; pinCode: string; careOf: string;
    error: string; otpSendsLeft: number; otpAttemptsLeft: number;
  };
  pan: { status: "Pending" | "Verified" | "Failed"; number: string; name: string; aadhaarLinked: boolean | null; error: string; attemptsLeft: number };
  documents: {
    aadhaar: { status: "Pending" | "Matched" | "Failed"; url: string; error: string; attemptsLeft: number };
    pan: { status: "Pending" | "Matched" | "Failed"; url: string; error: string; attemptsLeft: number };
  };
};

type Msg = { type: "success" | "error"; text: string } | null;
const TOKEN_KEY = "debentureKycToken";

function readToken(): string | undefined {
  try { return sessionStorage.getItem(TOKEN_KEY) || undefined; } catch { return undefined; }
}
function writeToken(token?: string) {
  try { if (token) sessionStorage.setItem(TOKEN_KEY, token); } catch { /* ignore */ }
}

// ---------------------------------------------------------------------------
// Hook: KYC session state + API calls
// ---------------------------------------------------------------------------

/**
 * mode "public"   = Debenture Application page (session token kept in sessionStorage)
 * mode "investor" = logged-in investor (session tied to the login on the server)
 */
export function useKyc(mode: "public" | "investor") {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [view, setView] = useState<KycView | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<Msg>(null);

  const token = mode === "public" ? (view?.token || readToken()) : undefined;

  const apply = useCallback((json: any) => {
    if (json?.data) {
      setView(json.data);
      if (mode === "public") writeToken(json.data.token);
    }
  }, [mode]);

  const start = useCallback(async (reset = false) => {
    setBusy(reset ? "reset" : "load");
    setMessage(null);
    try {
      const res = await fetch("/api/kyc/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: mode === "public" ? readToken() : undefined, reset }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Could not start verification.");
      setEnabled(Boolean(json.enabled));
      if (json.enabled) apply(json);
    } catch (e: any) {
      setEnabled(true);
      setMessage({ type: "error", text: e.message || "Could not start verification." });
    } finally {
      setBusy(null);
    }
  }, [mode, apply]);

  useEffect(() => { start(false); }, [start]);

  const post = async (key: string, url: string, body: any): Promise<boolean> => {
    setBusy(key);
    setMessage(null);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...body, token }),
      });
      const json = await res.json();
      apply(json);
      setMessage(json.success
        ? { type: "success", text: json.message || "Done." }
        : { type: "error", text: json.error || "Something went wrong." });
      return Boolean(json.success);
    } catch {
      setMessage({ type: "error", text: "Network error. Please try again." });
      return false;
    } finally {
      setBusy(null);
    }
  };

  const uploadDoc = async (kind: "aadhaar" | "pan", file?: File | null) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setMessage({ type: "error", text: "File must be 5 MB or smaller." });
      return;
    }
    setBusy(`doc-${kind}`);
    setMessage(null);
    try {
      const fd = new FormData();
      fd.append("kind", kind);
      fd.append("file", file);
      if (token) fd.append("token", token);
      const res = await fetch("/api/kyc/document", { method: "POST", body: fd });
      const json = await res.json();
      apply(json);
      setMessage(json.success
        ? { type: "success", text: json.message || "Document matched." }
        : { type: "error", text: json.error || "Document did not match." });
    } catch {
      setMessage({ type: "error", text: "Upload failed. Please try again." });
    } finally {
      setBusy(null);
    }
  };

  const v = view;
  const aadhaarVerified = v?.aadhaar.status === "Verified";
  const aadhaarDocOk = !v?.requireDocumentMatch || v?.documents.aadhaar.status === "Matched";
  const panVerified = v?.pan.status === "Verified" && v?.overallStatus !== "Failed";
  const panDocOk = !v?.requireDocumentMatch || v?.documents.pan.status === "Matched";

  return {
    enabled: Boolean(enabled),
    loaded: enabled !== null,
    view,
    busy,
    message,
    setMessage,
    start,
    post,
    uploadDoc,
    verified: Boolean(enabled) && v?.overallStatus === "Verified",
    aadhaarComplete: Boolean(aadhaarVerified && aadhaarDocOk),
    panComplete: Boolean(panVerified && panDocOk),
  };
}

export type KycState = ReturnType<typeof useKyc>;

// ---------------------------------------------------------------------------
// Inline "Verify" button shown on the right of the Aadhaar / PAN field
// ---------------------------------------------------------------------------

export function KycVerifyButton({ kyc, step, onClick, className = "" }: {
  kyc: KycState; step: "aadhaar" | "pan"; onClick: () => void; className?: string;
}) {
  if (!kyc.enabled) return null;
  const complete = step === "aadhaar" ? kyc.aadhaarComplete : kyc.panComplete;
  const partial = step === "aadhaar"
    ? kyc.view?.aadhaar.status === "Verified"
    : kyc.view?.pan.status === "Verified";
  const failed = step === "pan" && kyc.view?.overallStatus === "Failed";

  return (
    <button
      type="button"
      onClick={onClick}
      title={complete ? "Verified with government records" : "Verify with government records"}
      className={`inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-md px-2.5 py-1 text-xs font-bold shadow-sm transition print:hidden ${
        complete
          ? "border border-emerald-500 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
          : failed
            ? "border border-rose-400 bg-rose-50 text-rose-700 hover:bg-rose-100"
            : partial
              ? "border border-amber-400 bg-amber-50 text-amber-700 hover:bg-amber-100"
              : "bg-indigo-600 text-white hover:bg-indigo-700"
      } ${className}`}
    >
      {complete ? <CheckCircle2 className="h-3.5 w-3.5" /> : failed ? <XCircle className="h-3.5 w-3.5" /> : <ShieldCheck className="h-3.5 w-3.5" />}
      {complete ? "Verified" : failed ? "Mismatch" : partial ? "Upload card" : "Verify"}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Popup with the Aadhaar (OTP) or PAN verification step
// ---------------------------------------------------------------------------

function Pill({ ok, fail, label }: { ok: boolean; fail?: boolean; label: string }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${
      ok ? "bg-emerald-100 text-emerald-700" : fail ? "bg-rose-100 text-rose-700" : "bg-zinc-100 text-zinc-600"
    }`}>
      {ok ? <CheckCircle2 className="h-3 w-3" /> : fail ? <XCircle className="h-3 w-3" /> : null}
      {label}
    </span>
  );
}

export function KycVerifyDialog({
  kyc, step, open, onClose, onSwitchStep, initialAadhaar = "", initialPan = "", applicantName,
}: {
  kyc: KycState;
  step: "aadhaar" | "pan";
  open: boolean;
  onClose: () => void;
  onSwitchStep?: (step: "aadhaar" | "pan") => void;
  initialAadhaar?: string;
  initialPan?: string;
  /** Only used by TEST MODE to simulate the government name. */
  applicantName?: string;
}) {
  const [consent, setConsent] = useState(false);
  const [aadhaarInput, setAadhaarInput] = useState("");
  const [otp, setOtp] = useState("");
  const [panInput, setPanInput] = useState("");

  // Prefill from the form field each time the popup opens.
  useEffect(() => {
    if (!open) return;
    kyc.setMessage(null);
    const digits = (initialAadhaar || "").replace(/\D/g, "");
    if (digits.length === 12) setAadhaarInput(digits);
    const pan = (initialPan || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (pan.length === 10) setPanInput(pan);
    setOtp("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, step]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape" && !kyc.busy) onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, kyc.busy, onClose]);

  if (!open || !kyc.enabled) return null;

  const v = kyc.view;
  const busy = kyc.busy;
  const inputCls = "h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm tracking-wider text-zinc-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-zinc-100";
  const btnCls = "inline-flex h-10 items-center justify-center gap-2 whitespace-nowrap rounded-md bg-indigo-600 px-4 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50";

  const DocUpload = ({ kind }: { kind: "aadhaar" | "pan" }) => {
    if (!v?.requireDocumentMatch) return null;
    const doc = v.documents[kind];
    const matched = doc.status === "Matched";
    const canUpload = !busy && doc.attemptsLeft > 0;
    return (
      <div className="space-y-1.5 rounded-lg border border-zinc-200 p-3">
        <div className="flex items-center justify-between text-sm font-semibold">
          <span>Upload {kind === "aadhaar" ? "Aadhaar" : "PAN"} card</span>
          <Pill ok={matched} fail={doc.status === "Failed"} label={matched ? "Matched" : doc.status === "Failed" ? "Not matched" : "Required"} />
        </div>
        <label className={`flex items-center justify-center gap-2 rounded-md border-2 border-dashed px-3 py-3 text-xs font-semibold ${
          canUpload ? "cursor-pointer border-indigo-300 text-indigo-700 hover:bg-indigo-50" : "cursor-not-allowed border-zinc-200 text-zinc-400"
        }`}>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,application/pdf"
            className="hidden"
            disabled={!canUpload}
            onChange={e => { kyc.uploadDoc(kind, e.target.files?.[0]); e.target.value = ""; }}
          />
          {busy === `doc-${kind}` ? <Loader2 className="h-4 w-4 animate-spin" /> : matched ? <FileCheck2 className="h-4 w-4 text-emerald-600" /> : <Upload className="h-4 w-4" />}
          {matched ? "Re-upload" : "Clear photo / scan of the card (JPG, PNG or PDF, max 5 MB)"}
        </label>
        {doc.url && <a href={doc.url} target="_blank" rel="noreferrer" className="text-[11px] font-semibold text-indigo-600 underline">View uploaded file</a>}
        {doc.error && <p className="text-[11px] font-semibold text-rose-600">{doc.error}</p>}
      </div>
    );
  };

  const a = v?.aadhaar;
  const p = v?.pan;
  const aadhaarDone = a?.status === "Verified";
  const panDone = p?.status === "Verified";
  const failed = v?.overallStatus === "Failed";
  const stepComplete = step === "aadhaar" ? kyc.aadhaarComplete : kyc.panComplete;

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 p-4 print:hidden"
      onMouseDown={e => { if (e.target === e.currentTarget && !busy) onClose(); }}
      role="dialog"
      aria-modal="true"
    >
      <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white text-zinc-900 shadow-2xl" style={{ fontFamily: "inherit" }}>
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-3">
          <h3 className="flex items-center gap-2 text-base font-bold">
            <ShieldCheck className="h-5 w-5 text-indigo-600" />
            {step === "aadhaar" ? "Verify Aadhaar" : "Verify PAN"}
          </h3>
          <button type="button" onClick={onClose} disabled={!!busy} className="rounded p-1 text-zinc-500 hover:bg-zinc-100" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 px-5 py-4">
          {v?.testMode && (
            <div className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 p-2.5 text-xs text-amber-800">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span><b>TEST MODE</b> – no real government check. OTP is <b>123456</b>.</span>
            </div>
          )}

          {!v && (
            <div className="flex items-center gap-2 text-sm text-zinc-500"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
          )}

          {/* ---------------- AADHAAR ---------------- */}
          {v && a && step === "aadhaar" && (
            <>
              {aadhaarDone ? (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
                  <div className="mb-1 flex items-center gap-1 font-bold"><CheckCircle2 className="h-4 w-4" /> Aadhaar verified</div>
                  <div><b>Aadhaar:</b> {a.masked}</div>
                  <div><b>Name:</b> {a.name}</div>
                  {a.dob && <div><b>DOB:</b> {a.dob}</div>}
                </div>
              ) : (
                <>
                  {!v.consentGiven && (
                    <label className="flex cursor-pointer items-start gap-2 rounded-md bg-zinc-50 p-3 text-xs text-zinc-700">
                      <input type="checkbox" className="mt-0.5" checked={consent} onChange={e => setConsent(e.target.checked)} />
                      <span>
                        I consent to verify my identity using my Aadhaar (OTP sent to my Aadhaar-linked mobile) with UIDAI records for this
                        debenture application. My full Aadhaar number will not be stored.
                      </span>
                    </label>
                  )}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-zinc-600">Aadhaar number</label>
                    <div className="flex gap-2">
                      <input
                        className={inputCls}
                        inputMode="numeric"
                        maxLength={12}
                        placeholder="12-digit Aadhaar number"
                        value={aadhaarInput}
                        onChange={e => setAadhaarInput(e.target.value.replace(/\D/g, ""))}
                        disabled={!!busy}
                        autoComplete="off"
                        autoFocus
                      />
                      <button
                        type="button"
                        className={btnCls}
                        disabled={!!busy || aadhaarInput.length !== 12 || (!consent && !v.consentGiven) || a.otpSendsLeft <= 0}
                        onClick={() => kyc.post("send-otp", "/api/kyc/aadhaar/send-otp", { aadhaarNumber: aadhaarInput, consent: consent || v.consentGiven })}
                      >
                        {busy === "send-otp" && <Loader2 className="h-4 w-4 animate-spin" />}
                        {a.status === "OtpSent" ? "Resend OTP" : "Send OTP"}
                      </button>
                    </div>
                  </div>
                  {a.status === "OtpSent" && (
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-zinc-600">OTP sent to your Aadhaar-linked mobile</label>
                      <div className="flex gap-2">
                        <input
                          className={inputCls}
                          inputMode="numeric"
                          maxLength={6}
                          placeholder="6-digit OTP"
                          value={otp}
                          onChange={e => setOtp(e.target.value.replace(/\D/g, ""))}
                          disabled={!!busy}
                          autoComplete="one-time-code"
                        />
                        <button
                          type="button"
                          className={btnCls}
                          disabled={!!busy || otp.length !== 6}
                          onClick={async () => { if (await kyc.post("verify-otp", "/api/kyc/aadhaar/verify-otp", { otp, applicantName })) setOtp(""); }}
                        >
                          {busy === "verify-otp" && <Loader2 className="h-4 w-4 animate-spin" />}
                          Verify OTP
                        </button>
                      </div>
                    </div>
                  )}
                  <p className="text-[11px] text-zinc-500">{a.otpSendsLeft} OTP request(s) left.</p>
                </>
              )}
              {aadhaarDone && <DocUpload kind="aadhaar" />}
            </>
          )}

          {/* ---------------- PAN ---------------- */}
          {v && p && step === "pan" && (
            <>
              {!aadhaarDone ? (
                <div className="space-y-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                  <p>Please verify your <b>Aadhaar</b> first. The name on your PAN is matched with your Aadhaar.</p>
                  {onSwitchStep && (
                    <button type="button" className={btnCls} onClick={() => onSwitchStep("aadhaar")}>Verify Aadhaar now</button>
                  )}
                </div>
              ) : panDone && !failed ? (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
                  <div className="mb-1 flex items-center gap-1 font-bold"><CheckCircle2 className="h-4 w-4" /> PAN verified</div>
                  <div><b>PAN:</b> {p.number}</div>
                  <div><b>Name:</b> {p.name}</div>
                  {v.nameMatchScore != null && <div><b>Name match with Aadhaar:</b> {v.nameMatchScore}%</div>}
                  {p.aadhaarLinked === false && <div className="font-semibold text-amber-700">⚠ PAN is not linked with Aadhaar.</div>}
                </div>
              ) : (
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-zinc-600">PAN number</label>
                  <div className="flex gap-2">
                    <input
                      className={`${inputCls} uppercase`}
                      maxLength={10}
                      placeholder="e.g. ABCDE1234F"
                      value={panInput}
                      onChange={e => setPanInput(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
                      disabled={!!busy || failed}
                      autoComplete="off"
                      autoFocus
                    />
                    <button
                      type="button"
                      className={btnCls}
                      disabled={!!busy || panInput.length !== 10 || p.attemptsLeft <= 0 || failed}
                      onClick={() => kyc.post("pan", "/api/kyc/pan/verify", { panNumber: panInput })}
                    >
                      {busy === "pan" && <Loader2 className="h-4 w-4 animate-spin" />}
                      Verify PAN
                    </button>
                  </div>
                  {(p.error || failed) && (
                    <p className="text-[11px] font-semibold text-rose-600">{p.error || "Name on PAN does not match Aadhaar."}</p>
                  )}
                </div>
              )}
              {aadhaarDone && panDone && !failed && <DocUpload kind="pan" />}
            </>
          )}

          {kyc.message && (
            <div className={`rounded-md p-2.5 text-xs font-semibold ${kyc.message.type === "success" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
              {kyc.message.text}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-2 border-t border-zinc-200 px-5 py-3">
          {v && (a?.status !== "Pending" || p?.status !== "Pending") ? (
            <button
              type="button"
              onClick={() => { if (confirm("Start Aadhaar & PAN verification again? Current progress will be cleared.")) kyc.start(true); }}
              disabled={!!busy}
              className="inline-flex items-center gap-1 text-xs font-semibold text-zinc-500 hover:text-zinc-800"
            >
              <RotateCcw className="h-3 w-3" /> Start over
            </button>
          ) : <span />}
          <div className="flex gap-2">
            {step === "aadhaar" && kyc.aadhaarComplete && !kyc.panComplete && onSwitchStep && (
              <button type="button" className={btnCls} onClick={() => onSwitchStep("pan")}>Next: Verify PAN</button>
            )}
            <button
              type="button"
              onClick={onClose}
              disabled={!!busy}
              className={stepComplete ? btnCls : "inline-flex h-10 items-center rounded-md border border-zinc-300 px-4 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"}
            >
              {stepComplete ? "Done" : "Close"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
