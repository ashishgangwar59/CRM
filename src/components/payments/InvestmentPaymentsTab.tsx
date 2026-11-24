"use client";

import { useCallback, useEffect, useState } from "react";
import * as XLSX from "xlsx";
import { CheckCircle2, ChevronLeft, ChevronRight, Clock, Download, Eye, Loader2, Receipt, Search, XCircle } from "lucide-react";
import { CompanyInfo, PaymentRecord, formatINR, loadCompanyInfo, paymentModeLabel, paymentReference, printReceipt } from "./receipt";

const STATUSES = ["all", "Paid", "Pending Verification", "Rejected", "Failed"] as const;
const STATUS_STYLE: Record<string, string> = {
  "Paid": "bg-emerald-100 text-emerald-700",
  "Pending Verification": "bg-amber-100 text-amber-700",
  "Rejected": "bg-rose-100 text-rose-700",
  "Failed": "bg-zinc-200 text-zinc-600",
};

/** Invoice → "Investment Payments": receipts for online + verified UTR payments, and the UTR approval queue. */
export default function InvestmentPaymentsTab() {
  const [rows, setRows] = useState<PaymentRecord[]>([]);
  const [counts, setCounts] = useState<Record<string, { count: number; amount: number }>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [method, setMethod] = useState("");
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [company, setCompany] = useState<CompanyInfo | undefined>();
  const [review, setReview] = useState<PaymentRecord | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => { loadCompanyInfo().then(setCompany); }, []);
  useEffect(() => { const t = setTimeout(() => setDebounced(search.trim()), 400); return () => clearTimeout(t); }, [search]);
  useEffect(() => { setPage(1); }, [status, method, debounced, from, to, limit]);

  const buildQuery = useCallback((p: number, l: number) => {
    const q = new URLSearchParams({ status, page: String(p), limit: String(l) });
    if (method) q.set("method", method);
    if (debounced) q.set("search", debounced);
    if (from) q.set("from", from);
    if (to) q.set("to", to);
    return q.toString();
  }, [status, method, debounced, from, to]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/payments?${buildQuery(page, limit)}`, { cache: "no-store" });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      setRows(json.data);
      setCounts(json.counts || {});
      setPages(json.pagination.totalPages);
      setTotal(json.pagination.total);
    } catch (e: any) {
      setError(e.message || "Could not load payments.");
    } finally {
      setLoading(false);
    }
  }, [buildQuery, page, limit]);

  useEffect(() => { load(); }, [load]);

  const act = async (action: "approve" | "reject") => {
    if (!review) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/payments/${review._id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, reason: rejectReason }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      setNotice(json.message);
      setReview(null);
      setRejectReason("");
      await load();
    } catch (e: any) {
      alert(e.message || "Action failed");
    } finally {
      setBusy(false);
    }
  };

  const exportExcel = async () => {
    const res = await fetch(`/api/payments?${buildQuery(1, 100000)}`);
    const json = await res.json();
    if (!json.success) return alert(json.error || "Export failed");
    const data = (json.data as PaymentRecord[]).map(p => ({
      "Receipt No": p.receiptNo,
      "Status": p.status,
      "Investor Code": p.investorCode,
      "Investor Name": p.investorName,
      "Application No": p.applicationNo,
      "Phone": p.phone,
      "Email": p.email,
      "Amount (Rs)": p.amount,
      "Payment Mode": paymentModeLabel(p),
      "Reference (Razorpay ID / UTR)": paymentReference(p),
      "Bank": p.manual?.bankName || "",
      "Paid / Payment Date": p.paidAt ? new Date(p.paidAt).toLocaleDateString("en-IN") : (p.manual?.paymentDate || ""),
      "Submitted On": new Date(p.createdAt).toLocaleString("en-IN"),
      "Rejection Reason": p.rejectionReason,
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Investment Payments");
    XLSX.writeFile(wb, `Investment_Payments_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const input = "h-9 rounded-md border border-zinc-300 bg-white px-3 text-xs text-zinc-900 focus:outline-none focus:ring-2 focus:ring-indigo-500";

  return (
    <div className="space-y-4">
      {/* Summary cards (click to filter) */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {(["Paid", "Pending Verification", "Rejected", "Failed"] as const).map(s => (
          <button key={s} type="button" onClick={() => setStatus(status === s ? "all" : s)}
            className={`rounded-lg border p-3 text-left transition ${status === s ? "border-indigo-500 ring-2 ring-indigo-200" : "border-zinc-200 hover:border-zinc-300"} bg-white`}>
            <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">{s}</p>
            <p className="mt-1 text-lg font-extrabold text-zinc-900">{counts[s]?.count || 0}</p>
            <p className="text-xs text-zinc-500">₹ {formatINR(counts[s]?.amount || 0)}</p>
          </button>
        ))}
      </div>

      {notice && <div className="rounded-md bg-emerald-50 p-3 text-sm font-semibold text-emerald-700">{notice}</div>}

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-2 rounded-lg border border-zinc-200 bg-white p-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" />
          <input className={`${input} w-full pl-8`} placeholder="Search name, code, receipt, UTR, Razorpay ID…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className={input} value={status} onChange={e => setStatus(e.target.value)}>
          {STATUSES.map(s => <option key={s} value={s}>{s === "all" ? "All statuses" : s}</option>)}
        </select>
        <select className={input} value={method} onChange={e => setMethod(e.target.value)}>
          <option value="">All modes</option>
          <option value="online">Online (Razorpay)</option>
          <option value="manual">Bank transfer (UTR)</option>
        </select>
        <input type="date" className={input} value={from} onChange={e => setFrom(e.target.value)} title="From" />
        <input type="date" className={input} value={to} onChange={e => setTo(e.target.value)} title="To" />
        <button type="button" onClick={exportExcel} className="inline-flex h-9 items-center gap-1 rounded-md border border-emerald-300 px-3 text-xs font-semibold text-emerald-700 hover:bg-emerald-50">
          <Download className="h-3.5 w-3.5" /> Excel
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white">
        <table className="w-full text-left text-xs">
          <thead className="bg-zinc-50 text-zinc-600">
            <tr>
              {["Receipt No", "Investor", "Amount", "Mode / Reference", "Date", "Status", "Actions"].map(h => (
                <th key={h} className="whitespace-nowrap px-3 py-2 font-bold">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {loading ? (
              <tr><td colSpan={7} className="py-10 text-center text-zinc-500"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></td></tr>
            ) : error ? (
              <tr><td colSpan={7} className="py-10 text-center font-semibold text-rose-600">{error}</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={7} className="py-10 text-center text-zinc-500">No investment payments found.</td></tr>
            ) : rows.map(p => (
              <tr key={p._id} className="hover:bg-zinc-50">
                <td className="whitespace-nowrap px-3 py-2 font-mono font-semibold">{p.receiptNo || "—"}</td>
                <td className="px-3 py-2">
                  <div className="font-semibold">{p.investorName}</div>
                  <div className="text-zinc-500">{p.investorCode}{p.applicationNo ? ` · ${p.applicationNo}` : ""}</div>
                </td>
                <td className="whitespace-nowrap px-3 py-2 font-bold">₹ {formatINR(p.amount)}</td>
                <td className="px-3 py-2">
                  <div>{paymentModeLabel(p)}</div>
                  <div className="font-mono text-zinc-500">{paymentReference(p) || "—"}</div>
                </td>
                <td className="whitespace-nowrap px-3 py-2">{new Date(p.paidAt || p.createdAt).toLocaleDateString("en-IN")}</td>
                <td className="px-3 py-2">
                  <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-bold ${STATUS_STYLE[p.status] || ""}`}>
                    {p.status === "Paid" ? <CheckCircle2 className="h-3 w-3" /> : p.status === "Pending Verification" ? <Clock className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                    {p.status}
                  </span>
                </td>
                <td className="whitespace-nowrap px-3 py-2">
                  <div className="flex gap-1">
                    {p.status === "Paid" && (
                      <button type="button" onClick={() => printReceipt(p, company)} className="inline-flex items-center gap-1 rounded border border-indigo-200 bg-indigo-50 px-2 py-1 font-semibold text-indigo-700 hover:bg-indigo-100">
                        <Receipt className="h-3 w-3" /> Receipt
                      </button>
                    )}
                    {p.method === "manual" && (
                      <button type="button" onClick={() => { setReview(p); setRejectReason(""); setNotice(""); }} className={`inline-flex items-center gap-1 rounded border px-2 py-1 font-semibold ${p.status === "Pending Verification" ? "border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100" : "border-zinc-200 text-zinc-600 hover:bg-zinc-50"}`}>
                        <Eye className="h-3 w-3" /> {p.status === "Pending Verification" ? "Verify" : "Details"}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex flex-col gap-2 text-xs text-zinc-600 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          Rows:
          <select className={input} value={limit} onChange={e => setLimit(Number(e.target.value))}>
            {[10, 25, 50, 100].map(n => <option key={n}>{n}</option>)}
          </select>
          <span>{total} record(s)</span>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" disabled={page <= 1} onClick={() => setPage(page - 1)} className="rounded border border-zinc-300 p-1.5 disabled:opacity-40"><ChevronLeft className="h-4 w-4" /></button>
          <span>Page {page} of {pages}</span>
          <button type="button" disabled={page >= pages} onClick={() => setPage(page + 1)} className="rounded border border-zinc-300 p-1.5 disabled:opacity-40"><ChevronRight className="h-4 w-4" /></button>
        </div>
      </div>

      {/* Verify / details popup for UTR payments */}
      {review && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 p-4" onMouseDown={e => { if (e.target === e.currentTarget && !busy) setReview(null); }}>
          <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-5 text-zinc-900 shadow-2xl">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-base font-bold">Bank transfer payment – {review.status}</h3>
              <button type="button" onClick={() => setReview(null)} className="rounded p-1 text-zinc-500 hover:bg-zinc-100"><XCircle className="h-5 w-5" /></button>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-1.5 text-sm">
                <div><span className="text-zinc-500">Investor:</span> <b>{review.investorName}</b> ({review.investorCode})</div>
                <div><span className="text-zinc-500">Application:</span> {review.applicationNo || "—"}</div>
                <div><span className="text-zinc-500">Amount:</span> <b>₹ {formatINR(review.amount)}</b></div>
                <div><span className="text-zinc-500">UTR No.:</span> <b className="font-mono">{review.manual.utrNo}</b></div>
                <div><span className="text-zinc-500">Mode:</span> {review.manual.mode}</div>
                <div><span className="text-zinc-500">Payment date:</span> {review.manual.paymentDate}</div>
                <div><span className="text-zinc-500">Bank:</span> {review.manual.bankName || "—"}</div>
                <div><span className="text-zinc-500">Submitted:</span> {new Date(review.createdAt).toLocaleString("en-IN")}</div>
                {review.rejectionReason && <div className="text-rose-600"><b>Rejected:</b> {review.rejectionReason}</div>}
                <p className="pt-2 text-xs text-amber-700">Check this UTR and amount in the company bank statement before approving.</p>
              </div>
              <div>
                <p className="mb-1 text-xs font-semibold text-zinc-500">Transaction screenshot</p>
                {review.manual.screenshotUrl ? (
                  /\.pdf$/i.test(review.manual.screenshotUrl)
                    ? <a href={review.manual.screenshotUrl} target="_blank" rel="noreferrer" className="text-sm font-semibold text-indigo-600 underline">Open PDF</a>
                    : <a href={review.manual.screenshotUrl} target="_blank" rel="noreferrer"><img src={review.manual.screenshotUrl} alt="Transaction screenshot" className="max-h-80 w-full rounded border object-contain" /></a>
                ) : <p className="text-sm text-zinc-400">No screenshot</p>}
              </div>
            </div>
            {review.status === "Pending Verification" && (
              <div className="mt-4 space-y-2 border-t border-zinc-100 pt-4">
                <input className={`${input} w-full`} placeholder="Rejection reason (required only to reject)" value={rejectReason} onChange={e => setRejectReason(e.target.value)} />
                <div className="flex justify-end gap-2">
                  <button type="button" disabled={busy || rejectReason.trim().length < 5} onClick={() => act("reject")} className="inline-flex h-9 items-center rounded-md border border-rose-300 px-4 text-sm font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-40">Reject</button>
                  <button type="button" disabled={busy} onClick={() => act("approve")} className="inline-flex h-9 items-center gap-1 rounded-md bg-emerald-600 px-4 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50">
                    {busy && <Loader2 className="h-4 w-4 animate-spin" />} Approve &amp; generate receipt
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
