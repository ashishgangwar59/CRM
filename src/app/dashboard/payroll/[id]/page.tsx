"use client";

import { useEffect, useState, useRef, type ReactNode } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Download,
  Mail,
  CheckCircle,
  Lock,
  ArrowLeft,
  Printer,
} from "lucide-react";

function numberToWords(num: number): string {
  if (num === 0) return "Zero";
  const a = [
    "",
    "One ",
    "Two ",
    "Three ",
    "Four ",
    "Five ",
    "Six ",
    "Seven ",
    "Eight ",
    "Nine ",
    "Ten ",
    "Eleven ",
    "Twelve ",
    "Thirteen ",
    "Fourteen ",
    "Fifteen ",
    "Sixteen ",
    "Seventeen ",
    "Eighteen ",
    "Nineteen ",
  ];
  const b = [
    "",
    "",
    "Twenty",
    "Thirty",
    "Forty",
    "Fifty",
    "Sixty",
    "Seventy",
    "Eighty",
    "Ninety",
  ];
  const n = ("000000000" + num)
    .substr(-9)
    .match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
  if (!n) return "";
  let str = "";
  str +=
    Number(n[1]) != 0
      ? (a[Number(n[1])] || b[n[1][0] as any] + " " + a[n[1][1] as any]) +
        "Crore "
      : "";
  str +=
    Number(n[2]) != 0
      ? (a[Number(n[2])] || b[n[2][0] as any] + " " + a[n[2][1] as any]) +
        "Lakh "
      : "";
  str +=
    Number(n[3]) != 0
      ? (a[Number(n[3])] || b[n[3][0] as any] + " " + a[n[3][1] as any]) +
        "Thousand "
      : "";
  str +=
    Number(n[4]) != 0
      ? (a[Number(n[4])] || b[n[4][0] as any] + " " + a[n[4][1] as any]) +
        "Hundred "
      : "";
  str +=
    Number(n[5]) != 0
      ? (str != "" ? "and " : "") +
        (a[Number(n[5])] || b[n[5][0] as any] + " " + a[n[5][1] as any])
      : "";
  return str.trim() + " Only";
}

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <p className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-[#134086]">
      {children}
    </p>
  );
}

export default function SalarySlipPage() {
  const params: any = useParams();
  const router = useRouter();
  const [payroll, setPayroll] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
  const [salaryPeriodStart, setSalaryPeriodStart] = useState("");
  const [salaryPeriodEnd, setSalaryPeriodEnd] = useState("");
  const [designation, setDesignation] = useState("");
  const [remarks, setRemarks] = useState("");
  const slipRef = useRef<HTMLDivElement>(null);
  const [companyProfile, setCompanyProfile] = useState<any>({
    name: "Niventra Capital Advisory India Capital Pvt. Ltd.",
    address:
      "The Nukleus Center, Mezzanine Level (Adjacent to Visa Consultation Office)Shivaji Stadium Metro Station • Airport Express Line Connaught Place, New Delhi 110001",
    email: "info@niventracapitaladvisory.com",
    website: "www.niventracapitaladvisory.com",
    phone: "1800 8900 818",
    gstNo: "07AAICN4810R1Z2",
  });

  const fetchPayroll = async () => {
    try {
      const res = await fetch(`/api/payroll/${params.id}`);
      const data = await res.json();
      if (data.success) {
        setPayroll(data.data);
        setSalaryPeriodStart(
          data.data.salaryPeriodStart
            ? new Date(data.data.salaryPeriodStart).toISOString().slice(0, 10)
            : "",
        );
        setSalaryPeriodEnd(
          data.data.salaryPeriodEnd
            ? new Date(data.data.salaryPeriodEnd).toISOString().slice(0, 10)
            : "",
        );
        // Month-wise: the designation saved on this slip wins; fall back to
        // the employee profile only when the slip has none.
        setDesignation(data.data.designation || data.data.employeeId?.designation || "");
        setRemarks(data.data.remarks || "");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSalaryDates = async () => {
    const res = await fetch(`/api/payroll/${params.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "UpdateDates",
        salaryPeriodStart,
        salaryPeriodEnd,
      }),
    });
    const data = await res.json();
    if (data.success) fetchPayroll();
    else alert(data.error || "Unable to update salary period.");
  };

  const [savingDetails, setSavingDetails] = useState(false);
  const handleSaveSlipDetails = async () => {
    setSavingDetails(true);
    try {
      const res = await fetch(`/api/payroll/${params.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "UpdateDetails", designation, remarks }) });
      const data = await res.json();
      if (data.success) {
        await fetchPayroll();
        alert("Salary slip details saved for this month.");
      } else alert(data.error || "Unable to save salary-slip details.");
    } catch (e) {
      alert("Unable to save salary-slip details.");
    } finally {
      setSavingDetails(false);
    }
  };

  const handlePayModeChange = async (payMode: string) => {
    const previous = payroll?.payMode === "Cash" ? "Cash" : "Account";
    setPayroll((p: any) => (p ? { ...p, payMode } : p)); // update instantly
    const res = await fetch(`/api/payroll/${params.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "UpdatePayMode", payMode }),
    });
    const data = await res.json();
    if (!data.success) {
      setPayroll((p: any) => (p ? { ...p, payMode: previous } : p));
      alert(data.error || "Unable to update pay mode.");
    }
  };

  useEffect(() => {
    fetchPayroll();

    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setCurrentUserRole(data.role);
        }
      })
      .catch((e) => console.error("Error loading user info:", e));

    fetch("/api/settings")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.data && data.data.companyProfile) {
          const cp = data.data.companyProfile;
          setCompanyProfile({
            name:
              cp.name || "Niventra Capital Advisory India Capital Pvt. Ltd.",
            address:
              cp.address ||
              "The Nukleus Center, Mezzanine Level (Adjacent to Visa Consultation Office)Shivaji Stadium Metro Station • Airport Express Line Connaught Place, New Delhi 110001",
            email: cp.email || "info@niventracapitaladvisory.com",
            website: cp.website || "www.niventracapitaladvisory.com",
            phone: cp.phone || "18008900818",
            gstNo: cp.gstNo || "07AAICN4810R1Z2",
          });
        }
      })
      .catch((e) => console.error("Error loading settings:", e));
  }, [params.id]);

  const handleAction = async (action: string) => {
    try {
      const res = await fetch(`/api/payroll/${params.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (data.success) {
        fetchPayroll();
      } else {
        alert(data.error);
      }
    } catch (e) {
      alert("Error updating status");
    }
  };

  const generateSinglePagePDF = async () => {
    if (!slipRef.current) return null;
    const html2canvas = (await import("html2canvas")).default;
    const { jsPDF } = await import("jspdf");

    const element = slipRef.current;
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      allowTaint: false,
      backgroundColor: "#ffffff",
      logging: false,
      onclone: (clonedDocument) => {
        // html2canvas cannot parse modern CSS lab()/oklab() colors used by
        // Tailwind's generated theme styles. Replace them only in the cloned
        // document used for PDF rendering; the live page remains unchanged.
        clonedDocument.querySelectorAll("style").forEach((style) => {
          style.textContent = style.textContent
            ?.replace(/(?:ok)?(?:lab|lch)\([^;{}]*\)/gi, "#000000") || "";
        });
      },
    });

    const imgData = canvas.toDataURL("image/jpeg", 0.98);
    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    // Preserve the slip's aspect ratio and fit it inside the A4 printable area.
    const maxWidth = 190;
    const maxHeight = 277;
    const imageRatio = canvas.width / canvas.height;
    let imageWidth = maxWidth;
    let imageHeight = imageWidth / imageRatio;
    if (imageHeight > maxHeight) {
      imageHeight = maxHeight;
      imageWidth = imageHeight * imageRatio;
    }
    pdf.addImage(imgData, "JPEG", (210 - imageWidth) / 2, (297 - imageHeight) / 2, imageWidth, imageHeight, undefined, "FAST");
    return pdf;
  };

  const handleDownloadPDF = async () => {
    try {
      const pdf = await generateSinglePagePDF();
      if (pdf) {
        pdf.save(
          `SalarySlip_${payroll.monthYear}_${payroll.employeeId?.employeeCode || "Slip"}.pdf`,
        );
      }
    } catch (error) {
      console.error("PDF generation failed", error);
      window.print();
    }
  };

  const handleEmail = async () => {
    try {
      let pdfBase64: string | undefined = undefined;
      try {
        const pdf = await generateSinglePagePDF();
        if (pdf) {
          pdfBase64 = pdf.output("datauristring");
        }
      } catch (err) {
        console.error(
          "Failed to generate PDF string for email attachment",
          err,
        );
      }

      const res = await fetch(`/api/payroll/${params.id}/email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pdfBase64 }),
      });
      const data = await res.json();
      if (data.success) {
        alert(data.message);
      } else {
        alert(data.error || "Failed to send email");
      }
    } catch (e) {
      alert("Error sending email");
    }
  };

  if (loading) return <div className="p-8">Loading salary slip...</div>;
  if (!payroll)
    return <div className="p-8 text-rose-500">Payroll not found!</div>;

  const emp = payroll.employeeId;

  // Format month name month-wise (e.g., "JULY 2026")
  const monthNameStr = payroll.monthYear
    ? new Date(`${payroll.monthYear}-01`)
        .toLocaleDateString("en-US", { month: "long", year: "numeric" })
        .toUpperCase()
    : payroll.monthYear;
  const formatSlipDate = (value?: string) =>
    value
      ? new Date(value).toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })
      : "—";

  const monthLabel = payroll.monthYear
    ? new Date(`${payroll.monthYear}-01`).toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      })
    : "";

  const money = (n?: number) =>
    (Number(n) || 0).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  const slipDesignation: string = payroll.designation || emp.designation || "";
  const earn = payroll.earnings || {};
  const ded = payroll.deductions || {};
  const advanceAmount = ded.advanceSalaryDrawn || ded.advance || 0;

  // Core rows always shown; optional rows only when non-zero.
  const earningRows: { label: string; amount: number }[] = [
    { label: "Basic Salary", amount: earn.basic || 0 },
    { label: "House Rent Allowance", amount: earn.hra || 0 },
    {
      label: "Travel Allowance",
      amount: earn.travelAllowance || earn.metroAllowance || earn.specialAllowance || 0,
    },
    { label: "Individual Incentive", amount: earn.personalIncentive || 0 },
    {
      label: slipDesignation?.toLowerCase().includes("branch head")
        ? "Full Branch Incentive"
        : "Team Performance Incentive",
      amount: earn.teamBusinessIncentive || 0,
    },
    ...(earn.bonus > 0 ? [{ label: "Performance Bonus", amount: earn.bonus }] : []),
    ...(earn.overtimeAmount > 0 ? [{ label: "Overtime", amount: earn.overtimeAmount }] : []),
    ...(earn.otherEarnings > 0 ? [{ label: "Other Earnings", amount: earn.otherEarnings }] : []),
  ];

  const deductionRows: { label: string; amount: number }[] = [
    { label: "Provident Fund (PF)", amount: ded.pf || 0 },
    { label: "ESI Contribution", amount: ded.esi || 0 },
    { label: "Professional Tax", amount: ded.professionalTax || 0 },
    { label: "Income Tax (TDS)", amount: ded.incomeTax || 0 },
    ...(advanceAmount > 0 ? [{ label: "Advance Salary Recovery", amount: advanceAmount }] : []),
    ...(ded.loan > 0 ? [{ label: "Loan Recovery", amount: ded.loan }] : []),
    ...(ded.unpaidLeaveDeduction > 0
      ? [{ label: "Loss of Pay (LOP)", amount: ded.unpaidLeaveDeduction }]
      : []),
    ...(ded.otherDeductions > 0 ? [{ label: "Other Deductions", amount: ded.otherDeductions }] : []),
  ];
  const salaryRowCount = Math.max(earningRows.length, deductionRows.length);

  const totalDays = payroll.totalDays || 30;
  const paidDays = payroll.paidDays ?? totalDays;
  const attendance: [string, string | number][] = [
    ["Total Days", totalDays],
    ["Paid Days", paidDays],
    ["LOP Days", Math.max(totalDays - paidDays, 0)],
    ["Pay Mode", payroll.payMode === "Cash" ? "Cash" : "Account"],
    ["Status", payroll.status || "—"],
  ];
  const canEditPayMode = ["ADMIN", "KEY_ADMIN", "KEYADMIN"].includes(currentUserRole || "");

  const employeeDetails: [string, string][] = [
    ["Employee Name", `${emp.firstName || ""} ${emp.lastName || ""}`.trim()],
    ["Employee Code", emp.employeeCode],
    ["Designation", slipDesignation],
    ["Department", emp.department],
    ["Date of Joining", emp.dateOfJoining ? formatSlipDate(emp.dateOfJoining) : ""],
    ["PAN", emp.kyc?.panNumber],
    ["Bank Name", emp.bankDetails?.bankName],
    ["Bank A/C No.", emp.bankDetails?.accountNumber],
  ];

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-24">
      <style jsx global>{`
        @media print {
          html, body {
            width: 210mm !important;
            height: 297mm !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: hidden !important;
          }
          body * {
            visibility: hidden !important;
          }
          .printable-salary-slip-container,
          .printable-salary-slip-container * {
            visibility: visible !important;
          }
          .printable-salary-slip-container {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 210mm !important;
            height: 297mm !important;
             max-height: 297mm !important;
             min-height: 0 !important;
             overflow: hidden !important;
            margin: 0 !important;
            padding: 0 !important;
            border: none !important;
            box-shadow: none !important;
             page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          .printable-salary-slip-container > div {
            width: 100% !important;
            min-height: 297mm !important;
            padding: 8mm !important;
            transform: none !important;
            transform-origin: top left !important;
          }
          @page {
            size: A4 portrait;
            margin: 0mm;
          }
          .print\\:hidden {
            display: none !important;
          }
        }
      `}</style>

      {/* Top Action Bar */}
        <div className="flex items-center space-x-4 min-w-0 flex-1 ">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="min-w-0 flex align-middle flex-col">
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
              Salary Slip
            </h1>
            <p className="text-zinc-500 dark:text-zinc-400">
              {emp.firstName} {emp.lastName} • {monthNameStr} (
              {payroll.paidDays || 30} Days Salary)
            </p>
            {(payroll.salaryPeriodStart || payroll.salaryPeriodEnd) && (
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Salary period:{" "}
                {payroll.salaryPeriodStart
                  ? new Date(payroll.salaryPeriodStart).toLocaleDateString()
                  : "—"}{" "}
                to{" "}
                {payroll.salaryPeriodEnd
                  ? new Date(payroll.salaryPeriodEnd).toLocaleDateString()
                  : "—"}
              </p>
            )}
          </div>
        </div>
      <div className="flex flex-wrap items-start gap-4 print:hidden">        

        <div className="flex flex-wrap justify-end gap-1 w-full xl:w-auto">
          {currentUserRole !== "Employee" && currentUserRole !== "INVESTOR" && (
            <div className="flex flex-wrap items-end gap-2 mr-2 flex-2">
              <div><label className="block text-[10px] font-semibold text-zinc-500">Designation</label><Input className="h-9 w-40" value={designation} onChange={(e) => setDesignation(e.target.value)} /></div>
              <div><label className="block text-[10px] font-semibold text-zinc-500">Remarks</label><Input className="h-9 w-48" value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Optional remark" /></div>
              <Button variant="outline" className="h-9" onClick={handleSaveSlipDetails} disabled={savingDetails}>{savingDetails ? "Saving..." : "Save Details"}</Button>
              {canEditPayMode && (
                <div>
                  <label className="block text-[10px] font-semibold text-zinc-500">Pay Mode</label>
                  <select
                    className="h-9 w-28 rounded-md border border-input bg-background px-2 text-sm"
                    value={payroll.payMode === "Cash" ? "Cash" : "Account"}
                    onChange={(e) => handlePayModeChange(e.target.value)}
                  >
                    <option value="Account">Account</option>
                    <option value="Cash">Cash</option>
                  </select>
                </div>
              )}
            </div>
          )}
          {currentUserRole !== "Employee" && currentUserRole !== "INVESTOR" && (
            <>
              {payroll.status === "Draft" && (
                <Button
                  variant="outline"
                  className="text-amber-600 border-amber-200 hover:bg-amber-50"
                  onClick={() => handleAction("Lock")}
                >
                  <Lock className="mr-2 h-4 w-4" /> Lock
                </Button>
              )}
              {payroll.status === "Locked" && (
                <Button
                  variant="outline"
                  className="text-blue-600 border-blue-200 hover:bg-blue-50"
                  onClick={() => handleAction("Approve")}
                >
                  <CheckCircle className="mr-2 h-4 w-4" /> Approve
                </Button>
              )}
              {payroll.status === "Approved" && (
                <Button
                  variant="outline"
                  className="text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                  onClick={() => handleAction("Paid")}
                >
                  Mark as Paid (Wallet)
                </Button>
              )}
            </>
          )}

          <Button variant="secondary" onClick={handleDownloadPDF}>
            <Download className="mr-2 h-4 w-4" /> Download PDF
          </Button>
          <Button variant="outline" onClick={() => window.print()}>
            <Printer className="mr-2 h-4 w-4" /> Print / Save PDF
          </Button>

          {/* {currentUserRole !== "Employee" && currentUserRole !== "INVESTOR" && (
            <Button onClick={handleEmail}>
              <Mail className="mr-2 h-4 w-4" /> Email PDF
            </Button>
          )} */}
        </div>
      </div>

      {/* The Printable Slip Area — hex colours only (html2canvas can't parse oklch) */}
      <div className="printable-salary-slip-container w-full max-w-[820px] mx-auto my-4 bg-white shadow-xl ring-1 ring-black/5 print:my-0 print:shadow-none print:ring-0">
        <div
          ref={slipRef}
          className="relative flex min-h-[1157px] w-full flex-col bg-white px-10 py-9 text-[#1f2937]"
          style={{ fontFamily: "Inter, 'Segoe UI', Arial, sans-serif" }}
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-6 pb-5">
            <div className="flex items-start gap-4 min-w-0">
              <img
                src="/logo.png"
                alt="Company Logo"
                className="h-16 w-16 shrink-0 object-contain"
              />
              <div className="min-w-0">
                <h2 className="text-[19px] font-extrabold leading-tight text-[#134086]">
                  {companyProfile.name}
                </h2>
                <p className="mt-1 max-w-[430px] text-[10.5px] leading-snug text-[#6b7280]">
                  {companyProfile.address}
                </p>
                <p className="mt-1 text-[10.5px] text-[#6b7280]">
                  {[
                    companyProfile.phone && `Ph: ${companyProfile.phone}`,
                    companyProfile.email,
                    companyProfile.website,
                  ]
                    .filter(Boolean)
                    .join("  |  ")}
                </p>
               
              </div>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-[22px] font-extrabold tracking-[0.18em] text-[#134086]">
                PAYSLIP
              </p>
              <p className="mt-0.5 text-[12px] font-semibold text-[#374151]">
                {monthLabel}
              </p>
             
            </div>
          </div>
          <div className="h-[3px] w-full bg-[#134086]" />
          <div className="mb-5 flex items-center justify-between bg-[#eef3fb] px-4 py-2 text-[11.5px] text-center">
            <span className="font-semibold text-[#134086] [margin:0_auto]">
              Salary Slip for the month of {monthLabel}
            </span>
          
          </div>

          {/* Employee Details */}
          <SectionTitle>Employee Details</SectionTitle>
          <div className="mb-5 grid grid-cols-2 border border-[#d1d5db] text-[12px]">
            {employeeDetails.map(([label, value], i) => (
              <div
                key={label}
                className={`flex border-[#e5e7eb] ${i % 2 === 0 ? "border-r" : ""} ${
                  i < employeeDetails.length - 2 ? "border-b" : ""
                }`}
              >
                <span className="w-[42%] shrink-0 bg-[#f9fafb] px-3 py-2 font-medium text-[#6b7280]">
                  {label}
                </span>
                <span className="px-3 py-2 font-semibold text-[#111827] break-all">
                  {value || "—"}
                </span>
              </div>
            ))}
          </div>

          {/* Attendance Summary */}
          <div className="mb-5 grid grid-cols-5 border border-[#d1d5db] text-center">
            {attendance.map(([label, value], i) => (
              <div
                key={label}
                className={`px-2 py-2.5 ${i < attendance.length - 1 ? "border-r border-[#e5e7eb]" : ""}`}
              >
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[#6b7280]">
                  {label}
                </p>
                <p className="mt-0.5 text-[15px] font-bold text-[#111827]">{value}</p>
              </div>
            ))}
          </div>

          {/* Earnings & Deductions */}
          <SectionTitle>Salary Details</SectionTitle>
          <table className="mb-5 w-full border-collapse border border-[#d1d5db] text-[12px]">
            <thead>
              <tr className="bg-[#134086] text-left text-[11px] uppercase tracking-wider text-white">
                <th className="w-[32%] px-3 py-2 font-semibold">Earnings</th>
                <th className="w-[18%] border-r border-[#3a5d9a] px-3 py-2 text-right font-semibold">
                  Amount (₹)
                </th>
                <th className="w-[32%] px-3 py-2 font-semibold">Deductions</th>
                <th className="w-[18%] px-3 py-2 text-right font-semibold">Amount (₹)</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: salaryRowCount }).map((_, i) => {
                const er = earningRows[i];
                const dr = deductionRows[i];
                return (
                  <tr key={i} className={i % 2 ? "bg-[#fafbfc]" : "bg-white"}>
                    <td className="border-b border-[#eef0f3] px-3 py-2 text-[#374151]">
                      {er?.label ?? " "}
                    </td>
                    <td className="border-b border-r border-[#eef0f3] border-r-[#d1d5db] px-3 py-2 text-right font-semibold tabular-nums">
                      {er ? money(er.amount) : ""}
                    </td>
                    <td className="border-b border-[#eef0f3] px-3 py-2 text-[#374151]">
                      {dr?.label ?? " "}
                    </td>
                    <td className="border-b border-[#eef0f3] px-3 py-2 text-right font-semibold tabular-nums">
                      {dr ? money(dr.amount) : ""}
                    </td>
                  </tr>
                );
              })}
              <tr className="bg-[#eef3fb] text-[12.5px] font-bold text-[#111827]">
                <td className="border-t border-[#d1d5db] px-3 py-2.5">Gross Earnings</td>
                <td className="border-r border-t border-[#d1d5db] px-3 py-2.5 text-right tabular-nums">
                  {money(payroll.grossSalary)}
                </td>
                <td className="border-t border-[#d1d5db] px-3 py-2.5">Total Deductions</td>
                <td className="border-t border-[#d1d5db] px-3 py-2.5 text-right tabular-nums text-[#b42318]">
                  {money(payroll.totalDeductions)}
                </td>
              </tr>
            </tbody>
          </table>

          {/* Net Pay */}
          <div className="mb-5 flex items-stretch border border-[#134086]">
            <div className="flex flex-1 flex-col justify-center px-4 py-3">
              <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-[#134086]">
                Net Salary Payable
              </p>
              <p className="mt-1 text-[11.5px] text-[#374151]">
                <span className="text-[#6b7280]">In words: </span>
                <span className="font-semibold">
                   {numberToWords(Math.round(payroll.netSalary || 0))}
                </span>
              </p>
              <p className="mt-1 text-[10px] text-[#6b7280]">
                Gross Earnings {money(payroll.grossSalary)} − Total Deductions{" "}
                {money(payroll.totalDeductions)}
              </p>
            </div>
            <div className="flex min-w-[210px] items-center justify-center bg-[#134086] px-5 py-3 text-white">
              <span className="text-[26px] font-extrabold tabular-nums tracking-tight">
                {money(payroll.netSalary)}
              </span>
            </div>
          </div>

         

          {/* Remarks */}
          {payroll.remarks && (
            <div className="mb-5 border-l-[3px] border-[#d97706] bg-[#fffbeb] px-4 py-2.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#b45309]">
                Remarks
              </p>
              <p className="mt-0.5 whitespace-pre-wrap text-[12px] text-[#78350f]">
                {payroll.remarks}
              </p>
            </div>
          )}

          {/* Footer */}
          <div className="mt-auto border-t border-[#d1d5db] pt-3 text-center text-[10px] leading-relaxed text-[#6b7280]">
            <p className="font-semibold text-[#374151]">
              This is a computer-generated payslip and does not require a signature.
            </p>
            <p>
              For any discrepancy, please contact HR{companyProfile.email ? ` at ${companyProfile.email}` : ""}.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
