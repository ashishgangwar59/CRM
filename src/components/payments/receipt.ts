// Printable Payment Receipt (opens in a new window → Print / Save as PDF).

export type PaymentRecord = {
  _id: string;
  receiptNo: string;
  investorId: string;
  investorCode: string;
  applicationNo: string;
  investorName: string;
  email: string;
  phone: string;
  address: string;
  panNumber: string;
  amount: number;
  method: "online" | "manual";
  status: "Created" | "Paid" | "Failed" | "Pending Verification" | "Rejected";
  razorpayOrderId: string;
  razorpayPaymentId: string;
  gatewayMethod: string;
  gatewayMode: string;
  failureReason: string;
  manual: { utrNo: string; paymentDate: string; mode: string; bankName: string; screenshotUrl: string };
  paidAt: string | null;
  verifiedAt: string | null;
  rejectionReason: string;
  createdAt: string;
};

export type CompanyInfo = { name: string; address?: string; phone?: string; email?: string; website?: string; gstNo?: string };

export const DEFAULT_COMPANY: CompanyInfo = { name: "NIVENTRA CAPITAL ADVISORY INDIA PVT LTD" };

export function formatINR(n: number) {
  return Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function paymentModeLabel(p: PaymentRecord) {
  if (p.method === "online") return `Online – Razorpay${p.gatewayMethod ? ` (${p.gatewayMethod.toUpperCase()})` : ""}`;
  return p.manual?.mode ? `Bank Transfer – ${p.manual.mode}` : "Bank Transfer";
}

export function paymentReference(p: PaymentRecord) {
  return p.method === "online" ? p.razorpayPaymentId : p.manual?.utrNo;
}

const ONES = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
function twoDigits(n: number) { return n < 20 ? ONES[n] : `${TENS[Math.floor(n / 10)]}${n % 10 ? " " + ONES[n % 10] : ""}`; }
function threeDigits(n: number) { return n >= 100 ? `${ONES[Math.floor(n / 100)]} Hundred${n % 100 ? " " + twoDigits(n % 100) : ""}` : twoDigits(n); }

/** Indian numbering: 1,23,45,678 → "One Crore Twenty Three Lakh …" */
export function amountInWords(amount: number) {
  const rupees = Math.floor(amount);
  const paise = Math.round((amount - rupees) * 100);
  if (rupees === 0 && paise === 0) return "Zero Rupees Only";
  const parts: string[] = [];
  const crore = Math.floor(rupees / 1e7), lakh = Math.floor((rupees % 1e7) / 1e5), thousand = Math.floor((rupees % 1e5) / 1e3), rest = rupees % 1e3;
  if (crore) parts.push(`${threeDigits(crore)} Crore`);
  if (lakh) parts.push(`${twoDigits(lakh)} Lakh`);
  if (thousand) parts.push(`${twoDigits(thousand)} Thousand`);
  if (rest) parts.push(threeDigits(rest));
  return `${parts.join(" ")} Rupees${paise ? ` and ${twoDigits(paise)} Paise` : ""} Only`;
}

function esc(v: unknown) {
  return String(v ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));
}

export function receiptHtml(p: PaymentRecord, company: CompanyInfo = DEFAULT_COMPANY) {
  const date = p.paidAt ? new Date(p.paidAt).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", day: "2-digit", month: "short", year: "numeric" }) : "-";
  const rows: [string, string][] = [
    ["Received from", `${p.investorName}${p.investorCode ? ` (${p.investorCode})` : ""}`],
    ["Address", p.address || "-"],
    ["PAN", p.panNumber || "-"],
    ["Application No.", p.applicationNo || "-"],
    ["Towards", "Investment in Debentures"],
    ["Payment Mode", paymentModeLabel(p)],
    [p.method === "online" ? "Razorpay Payment ID" : "Transaction / UTR No.", paymentReference(p) || "-"],
    ...(p.method === "manual" && p.manual?.bankName ? [["Bank", p.manual.bankName] as [string, string]] : []),
    ["Payment Date", date],
  ];
  return `<!doctype html><html><head><meta charset="utf-8"><title>Payment Receipt ${esc(p.receiptNo)}</title>
<style>
  *{box-sizing:border-box} body{font-family:Arial,Helvetica,sans-serif;color:#1a1a1a;margin:0;padding:24px;background:#f4f4f5}
  .r{max-width:720px;margin:0 auto;background:#fff;border:2px solid #1a3668;padding:28px}
  .h{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #1a3668;padding-bottom:12px;margin-bottom:16px}
  .co{font-size:18px;font-weight:800;color:#1a3668} .sm{font-size:11px;color:#555;margin-top:2px}
  .t{font-size:20px;font-weight:800;color:#1a3668;text-align:right} .no{font-size:12px;margin-top:4px;text-align:right}
  table{width:100%;border-collapse:collapse;font-size:13px} td{border:1px solid #ddd;padding:8px 10px;vertical-align:top}
  td.k{background:#f7f7fa;width:38%;font-weight:700}
  .amt{margin:16px 0;padding:14px;border:1px dashed #1a3668;background:#f5f8ff;display:flex;justify-content:space-between;align-items:center}
  .amt b{font-size:22px;color:#1a3668} .w{font-size:12px;color:#333;margin-top:4px}
  .f{display:flex;justify-content:space-between;margin-top:36px;font-size:11px;color:#555} .sig{text-align:right}
  .sig div{border-top:1px solid #333;margin-top:40px;padding-top:4px;font-weight:700;color:#1a1a1a}
  @media print{body{background:#fff;padding:0}.r{border:2px solid #1a3668}}
</style></head><body><div class="r">
  <div class="h"><div><div class="co">${esc(company.name)}</div>
    ${company.address ? `<div class="sm">${esc(company.address)}</div>` : ""}
    <div class="sm">${[company.phone, company.email, company.website].filter(Boolean).map(esc).join(" · ")}</div>
    ${company.gstNo ? `<div class="sm">GSTIN: ${esc(company.gstNo)}</div>` : ""}</div>
    <div><div class="t">PAYMENT RECEIPT</div><div class="no"><b>Receipt No:</b> ${esc(p.receiptNo || "-")}</div><div class="no"><b>Date:</b> ${esc(date)}</div></div></div>
  <table>${rows.map(([k, v]) => `<tr><td class="k">${esc(k)}</td><td>${esc(v)}</td></tr>`).join("")}</table>
  <div class="amt"><div><div style="font-size:12px;font-weight:700;color:#555">AMOUNT RECEIVED</div><div class="w">${esc(amountInWords(p.amount))}</div></div><b>₹ ${esc(formatINR(p.amount))}</b></div>
  <div class="f"><div>This is a computer-generated receipt${p.method === "online" ? " for a payment received through Razorpay" : " issued after verification of the bank transaction"}.</div>
    <div class="sig"><div>Authorised Signatory</div></div></div>
</div><script>window.onload=function(){setTimeout(function(){window.print()},300)}</script></body></html>`;
}

/** Opens the receipt in a new tab and shows the print dialog (user can "Save as PDF"). */
export function printReceipt(p: PaymentRecord, company?: CompanyInfo) {
  const w = window.open("", "_blank");
  if (!w) {
    alert("Please allow pop-ups to view / download the receipt.");
    return;
  }
  w.document.open();
  w.document.write(receiptHtml(p, company || DEFAULT_COMPANY));
  w.document.close();
}

/** Company details from Settings → Company Profile (falls back to the default name). */
export async function loadCompanyInfo(): Promise<CompanyInfo> {
  try {
    const res = await fetch("/api/settings");
    const json = await res.json();
    const c = json?.data?.companyProfile;
    if (c?.name) return { name: c.name, address: c.address, phone: c.phone, email: c.email, website: c.website, gstNo: c.gstNo };
  } catch { /* not logged in */ }
  return DEFAULT_COMPANY;
}
