"use client";

import { useCallback, useEffect, useState } from "react";
import { CreditCard, Landmark, Loader2, CheckCircle2, Clock, XCircle, Receipt, Upload, AlertTriangle } from "lucide-react";
import { CompanyInfo, PaymentRecord, formatINR, loadCompanyInfo, paymentModeLabel, paymentReference, printReceipt } from "./receipt";

type Summary = {
  enabled: boolean;
  onlineAvailable: boolean;
  manualAvailable: boolean;
  mode: "test" | "live";
  investor: { _id: string; investorCode: string; fullName: string; applicationNo: string };
  amountDue: number;
  amountPaid: number;
  pendingVerificationAmount: number;
  balance: number;
  payments: PaymentRecord[];
};

declare global {
  interface Window { Razorpay?: any }
}

function loadCheckoutScript(): Promise<boolean> {
  if (typeof window === "undefined") return Promise.resolve(false);
  if (window.Razorpay) return Promise.resolve(true);
  return new Promise(resolve => {
    const existing = document.querySelector<HTMLScriptElement>('script[src="https://checkout.razorpay.com/v1/checkout.js"]');
    const script = existing || document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    if (!existing) document.body.appendChild(script);
  });
}

const STATUS_STYLE: Record<string, string> = {
  "Paid": "bg-emerald-100 text-emerald-700",
  "Pending Verification": "bg-amber-100 text-amber-700",
  "Rejected": "bg-rose-100 text-rose-700",
  "Failed": "bg-zinc-200 text-zinc-600",
};

export default function InvestmentPayPanel({ investorId, payToken, className = "" }: {
  investorId: string;
  /** From the Debenture Application submit – lets a not-logged-in applicant pay. */
  payToken?: string;
  className?: string;
}) {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [tab, setTab] = useState<"online" | "manual">("online");
  const [company, setCompany] = useState<CompanyInfo | undefined>();

  const [amount, setAmount] = useState("");
  const [manual, setManual] = useState({ amount: "", utrNo: "", paymentDate: "", mode: "NEFT", bankName: "" });
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [fileKey, setFileKey] = useState(0);

  const query = `investorId=${encodeURIComponent(investorId)}${payToken ? `&payToken=${encodeURIComponent(payToken)}` : ""}`;

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/payments/summary?${query}`, { cache: "no-store" });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      setSummary(json.data);
      const bal = String(json.data.balance || "");
      setAmount(bal);
      setManual(m => ({ ...m, amount: bal }));
      if (!json.data.onlineAvailable && json.data.manualAvailable) setTab("manual");
    } catch (e: any) {
      setMsg({ type: "error", text: e.message || "Could not load payment details." });
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => { load(); loadCompanyInfo().then(setCompany); }, [load]);

  const payOnline = async () => {
    setMsg(null);
    const amt = Number(amount);
    if (!amt || amt < 1) return setMsg({ type: "error", text: "Enter a valid amount." });
    setBusy("online");
    try {
      const ok = await loadCheckoutScript();
      if (!ok) throw new Error("Could not load the payment window. Check your internet connection.");

      const res = await fetch("/api/payments/razorpay/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ investorId, amount: amt, payToken }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      const o = json.data;

      await new Promise<void>((resolve) => {
        const rzp = new window.Razorpay({
          key: o.keyId,
          order_id: o.orderId,
          amount: o.amountPaise,
          currency: o.currency,
          name: company?.name || "Investment Payment",
          description: o.description,
          prefill: o.prefill,
          notes: { paymentId: o.paymentId },
          theme: { color: "#1a3668" },
          handler: async (resp: any) => {
            try {
              const vr = await fetch("/api/payments/razorpay/verify", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(resp),
              });
              const vj = await vr.json();
              setMsg(vj.success
                ? { type: "success", text: `Payment successful! Receipt ${vj.data?.receiptNo || ""} generated.` }
                : { type: "error", text: vj.error || "Payment verification failed." });
            } catch {
              setMsg({ type: "error", text: "Payment done but confirmation failed. It will be confirmed automatically shortly." });
            }
            resolve();
          },
          // Keep a more specific "payment failed" message if one was already shown.
          modal: { ondismiss: () => { setMsg(prev => prev ?? { type: "error", text: "Payment cancelled." }); resolve(); } },
        });
        rzp.on("payment.failed", (r: any) => {
          setMsg({ type: "error", text: r?.error?.description || "Payment failed. Please try again." });
        });
        rzp.open();
      });
      await load();
    } catch (e: any) {
      setMsg({ type: "error", text: e.message || "Payment could not be started." });
    } finally {
      setBusy(null);
    }
  };

  const submitManual = async () => {
    setMsg(null);
    if (!screenshot) return setMsg({ type: "error", text: "Please upload the transaction screenshot." });
    setBusy("manual");
    try {
      const fd = new FormData();
      fd.append("investorId", investorId);
      if (payToken) fd.append("payToken", payToken);
      fd.append("amount", manual.amount);
      fd.append("utrNo", manual.utrNo);
      fd.append("paymentDate", manual.paymentDate);
      fd.append("mode", manual.mode);
      fd.append("bankName", manual.bankName);
      fd.append("screenshot", screenshot);
      const res = await fetch("/api/payments/manual", { method: "POST", body: fd });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      setMsg({ type: "success", text: json.message });
      setManual({ amount: "", utrNo: "", paymentDate: "", mode: "NEFT", bankName: "" });
      setScreenshot(null);
      setFileKey(k => k + 1);
      await load();
    } catch (e: any) {
      setMsg({ type: "error", text: e.message || "Could not submit payment details." });
    } finally {
      setBusy(null);
    }
  };

  if (loading) {
    return <div className={`flex items-center gap-2 rounded-xl border bg-white p-4 text-sm text-zinc-500 ${className}`}><Loader2 className="h-4 w-4 animate-spin" /> Loading payment details…</div>;
  }
  if (!summary) {
    return msg ? <div className={`rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 ${className}`}>{msg.text}</div> : null;
  }
  if (!summary.enabled) return null;

  const input = "h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-indigo-500";
  const btn = "inline-flex h-10 items-center justify-center gap-2 rounded-md bg-indigo-600 px-5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50";
  const fullyCovered = summary.balance <= 0;

  return (
    <div className={`rounded-xl border border-zinc-200 bg-white text-left text-zinc-900 shadow-sm ${className}`}>
      <div className="border-b border-zinc-200 px-5 py-4">
        <h3 className="flex items-center gap-2 text-lg font-bold"><CreditCard className="h-5 w-5 text-indigo-600" /> Pay Investment</h3>
        <p className="text-xs text-zinc-500">
          {summary.investor.investorCode}{summary.investor.applicationNo ? ` · Application ${summary.investor.applicationNo}` : ""}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 px-5 py-4 sm:grid-cols-4">
        {[
          ["Investment", summary.amountDue, "text-zinc-900"],
          ["Paid", summary.amountPaid, "text-emerald-600"],
          ["Awaiting verification", summary.pendingVerificationAmount, "text-amber-600"],
          ["Balance due", summary.balance, "text-indigo-700"],
        ].map(([label, value, color]) => (
          <div key={label as string} className="rounded-lg border border-zinc-100 bg-zinc-50 p-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">{label}</p>
            <p className={`mt-1 text-base font-extrabold ${color}`}>₹ {formatINR(value as number)}</p>
          </div>
        ))}
      </div>

      {!fullyCovered && (
        <div className="px-5 pb-4">
          {summary.mode === "test" && summary.onlineAvailable && (
            <div className="mb-3 flex items-center gap-2 rounded-md border border-amber-300 bg-amber-50 p-2 text-xs text-amber-800">
              <AlertTriangle className="h-4 w-4" /> Razorpay TEST mode – no real money is charged.
            </div>
          )}
          <div className="mb-3 flex gap-2">
            {summary.onlineAvailable && (
              <button type="button" onClick={() => setTab("online")} className={`flex-1 rounded-md border px-3 py-2 text-sm font-semibold ${tab === "online" ? "border-indigo-600 bg-indigo-50 text-indigo-700" : "border-zinc-200 text-zinc-600"}`}>
                <CreditCard className="mr-1 inline h-4 w-4" /> Pay Online
              </button>
            )}
            {summary.manualAvailable && (
              <button type="button" onClick={() => setTab("manual")} className={`flex-1 rounded-md border px-3 py-2 text-sm font-semibold ${tab === "manual" ? "border-indigo-600 bg-indigo-50 text-indigo-700" : "border-zinc-200 text-zinc-600"}`}>
                <Landmark className="mr-1 inline h-4 w-4" /> Already Paid (UTR)
              </button>
            )}
          </div>

          {tab === "online" && summary.onlineAvailable && (
            <div className="space-y-2">
              <label className="text-xs font-semibold text-zinc-600">Amount to pay (₹)</label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <input className={input} type="number" min={1} max={summary.balance} step="0.01" value={amount} onChange={e => setAmount(e.target.value)} />
                <button type="button" className={btn} disabled={!!busy} onClick={payOnline}>
                  {busy === "online" ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />} Pay ₹ {formatINR(Number(amount) || 0)}
                </button>
              </div>
              <p className="text-[11px] text-zinc-500">UPI, cards and net-banking via Razorpay. Large amounts: use net-banking or bank transfer (UPI has per-transaction limits).</p>
            </div>
          )}

          {tab === "manual" && summary.manualAvailable && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-600">Amount paid (₹) *</label>
                <input className={input} type="number" min={1} max={summary.balance} step="0.01" value={manual.amount} onChange={e => setManual({ ...manual, amount: e.target.value })} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-600">Transaction / UTR No. *</label>
                <input className={`${input} uppercase`} maxLength={40} placeholder="e.g. HDFCR52026112212345" value={manual.utrNo} onChange={e => setManual({ ...manual, utrNo: e.target.value.toUpperCase() })} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-600">Payment date *</label>
                <input className={input} type="date" max={new Date().toISOString().slice(0, 10)} value={manual.paymentDate} onChange={e => setManual({ ...manual, paymentDate: e.target.value })} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-600">Payment mode *</label>
                <select className={input} value={manual.mode} onChange={e => setManual({ ...manual, mode: e.target.value })}>
                  {["NEFT", "RTGS", "IMPS", "UPI", "Cheque", "Cash Deposit", "Other"].map(m => <option key={m}>{m}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-600">Paid from bank</label>
                <input className={input} maxLength={100} placeholder="e.g. HDFC Bank" value={manual.bankName} onChange={e => setManual({ ...manual, bankName: e.target.value })} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-600">Transaction screenshot * (JPG/PNG/PDF, max 5 MB)</label>
                <label className="flex h-10 cursor-pointer items-center gap-2 rounded-md border-2 border-dashed border-indigo-300 px-3 text-xs font-semibold text-indigo-700 hover:bg-indigo-50">
                  <Upload className="h-4 w-4 shrink-0" />
                  <span className="truncate">{screenshot ? screenshot.name : "Choose file"}</span>
                  <input key={fileKey} type="file" className="hidden" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={e => setScreenshot(e.target.files?.[0] || null)} />
                </label>
              </div>
              <div className="sm:col-span-2">
                <button type="button" className={btn} disabled={!!busy} onClick={submitManual}>
                  {busy === "manual" && <Loader2 className="h-4 w-4 animate-spin" />} Submit payment details
                </button>
                <p className="mt-1 text-[11px] text-zinc-500">Your receipt is generated after our team verifies the transaction with the bank.</p>
              </div>
            </div>
          )}
        </div>
      )}

      {fullyCovered && (
        <div className="mx-5 mb-4 flex items-center gap-2 rounded-md bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">
          <CheckCircle2 className="h-5 w-5" />
          {summary.pendingVerificationAmount > 0 ? "Full amount submitted – awaiting verification." : "Investment fully paid. Thank you!"}
        </div>
      )}

      {msg && (
        <div className={`mx-5 mb-4 rounded-md p-3 text-sm font-semibold ${msg.type === "success" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>{msg.text}</div>
      )}

      {summary.payments.length > 0 && (
        <div className="border-t border-zinc-200 px-5 py-4">
          <h4 className="mb-2 text-sm font-bold">Payment history</h4>
          <div className="space-y-2">
            {summary.payments.map(p => (
              <div key={p._id} className="flex flex-col gap-1 rounded-lg border border-zinc-100 p-3 text-xs sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="font-bold">₹ {formatINR(p.amount)} <span className="font-normal text-zinc-500">· {paymentModeLabel(p)}</span></div>
                  <div className="text-zinc-500">
                    {paymentReference(p) ? `Ref: ${paymentReference(p)} · ` : ""}{new Date(p.paidAt || p.createdAt).toLocaleDateString("en-IN")}
                    {p.status === "Rejected" && p.rejectionReason ? <span className="text-rose-600"> · {p.rejectionReason}</span> : null}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${STATUS_STYLE[p.status] || ""}`}>
                    {p.status === "Paid" ? <CheckCircle2 className="h-3 w-3" /> : p.status === "Pending Verification" ? <Clock className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                    {p.status}
                  </span>
                  {p.status === "Paid" && (
                    <button type="button" onClick={() => printReceipt(p, company)} className="inline-flex items-center gap-1 rounded border border-indigo-200 bg-indigo-50 px-2 py-1 font-semibold text-indigo-700 hover:bg-indigo-100">
                      <Receipt className="h-3 w-3" /> Receipt {p.receiptNo}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
