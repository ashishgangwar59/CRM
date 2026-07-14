"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Download, Mail, CheckCircle, Lock, ArrowLeft, Building2, User } from "lucide-react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { QRCodeSVG } from "qrcode.react";

export default function SalarySlipPage() {
  const params = useParams();
  const router = useRouter();
  const [payroll, setPayroll] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const slipRef = useRef<HTMLDivElement>(null);

  const fetchPayroll = async () => {
    try {
      const res = await fetch(`/api/payroll/${params.id}`);
      const data = await res.json();
      if (data.success) {
        setPayroll(data.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayroll();
  }, [params.id]);

  const handleAction = async (action: string) => {
    try {
      const res = await fetch(`/api/payroll/${params.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action })
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

  const handleEmail = async () => {
    try {
      const res = await fetch(`/api/payroll/${params.id}/email`, { method: "POST" });
      const data = await res.json();
      if (data.success) {
        alert(data.message);
      } else {
        alert(data.error);
      }
    } catch (e) {
      alert("Error sending email");
    }
  };

  const handleDownloadPDF = async () => {
    if (!slipRef.current) return;
    
    // Temporarily hide the action buttons inside the slip area if any exist (though we moved them out)
    try {
      const canvas = await html2canvas(slipRef.current, { scale: 3, useCORS: true }); // High resolution
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "pt",
        format: "a4"
      });
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      pdf.save(`SalarySlip_${payroll.monthYear}_${payroll.employeeId.employeeCode}.pdf`);
    } catch (error) {
      console.error("PDF generation failed", error);
      alert("Failed to generate PDF");
    }
  };

  if (loading) return <div className="p-8">Loading salary slip...</div>;
  if (!payroll) return <div className="p-8 text-rose-500">Payroll not found!</div>;

  const emp = payroll.employeeId;
  
  // Verification URL for QR code (In real app, points to public verification page)
  const verificationUrl = `https://crm.company.com/verify-slip/${payroll._id}`;

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-24">
      {/* Top Action Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Salary Slip</h1>
            <p className="text-zinc-500 dark:text-zinc-400">{emp.firstName} {emp.lastName} • {payroll.monthYear}</p>
          </div>
        </div>
        
        <div className="flex space-x-2">
          {payroll.status === "Draft" && (
            <Button variant="outline" className="text-amber-600 border-amber-200 hover:bg-amber-50" onClick={() => handleAction("Lock")}>
              <Lock className="mr-2 h-4 w-4" /> Lock
            </Button>
          )}
          {payroll.status === "Locked" && (
            <Button variant="outline" className="text-blue-600 border-blue-200 hover:bg-blue-50" onClick={() => handleAction("Approve")}>
              <CheckCircle className="mr-2 h-4 w-4" /> Approve
            </Button>
          )}
          {payroll.status === "Approved" && (
            <Button variant="outline" className="text-emerald-600 border-emerald-200 hover:bg-emerald-50" onClick={() => handleAction("Paid")}>
              Mark as Paid (Wallet)
            </Button>
          )}
          
          <Button variant="secondary" onClick={handleDownloadPDF}>
            <Download className="mr-2 h-4 w-4" /> Download PDF
          </Button>
          <Button onClick={handleEmail}>
            <Mail className="mr-2 h-4 w-4" /> Email PDF
          </Button>
        </div>
      </div>

      {/* The Printable Slip Area */}
      <div className="bg-white text-black rounded-sm shadow-xl border border-zinc-200" style={{ width: '800px', minHeight: '1131px', margin: '0 auto', padding: '0' }}>
        <div ref={slipRef} className="p-12 w-full h-full bg-white relative">
          
          {/* Header Area */}
          <div className="flex justify-between items-start border-b-2 border-indigo-900 pb-8 mb-8">
            <div className="flex items-center space-x-4">
              <div className="h-16 w-16 bg-indigo-900 rounded-lg flex items-center justify-center text-white">
                <Building2 className="h-8 w-8" />
              </div>
              <div>
                <h2 className="text-3xl font-black text-indigo-950 tracking-tight">ACME CORP LTD.</h2>
                <p className="text-sm text-zinc-500">123 Tech Park, Innovation Hub, Bangalore 560001</p>
                <p className="text-sm text-zinc-500">contact@acmecorp.com | +91 98765 43210</p>
              </div>
            </div>
            <div className="text-right">
              <h3 className="text-2xl font-black text-indigo-900 tracking-wider">PAYSLIP</h3>
              <p className="text-lg font-semibold text-zinc-700">{payroll.monthYear}</p>
            </div>
          </div>

          {/* Employee Details Area */}
          <div className="flex items-start justify-between bg-zinc-50 p-6 rounded-lg mb-8 border border-zinc-100">
            <div className="flex space-x-6">
              {/* Employee Photo */}
              <div className="h-24 w-24 bg-zinc-200 rounded-full border-4 border-white shadow-sm flex flex-shrink-0 items-center justify-center overflow-hidden">
                {emp.profilePhoto ? (
                  <img src={emp.profilePhoto} alt="Profile" className="h-full w-full object-cover" />
                ) : (
                  <User className="h-10 w-10 text-zinc-400" />
                )}
              </div>
              <div className="grid grid-cols-2 gap-x-12 gap-y-2">
                <div>
                  <p className="text-xs text-zinc-500 uppercase tracking-wider font-semibold">Employee Name</p>
                  <p className="font-bold text-lg text-zinc-900">{emp.firstName} {emp.lastName}</p>
                </div>
                <div>
                  <p className="text-xs text-zinc-500 uppercase tracking-wider font-semibold">Employee Code</p>
                  <p className="font-bold text-lg text-zinc-900">{emp.employeeCode}</p>
                </div>
                <div>
                  <p className="text-xs text-zinc-500 uppercase tracking-wider font-semibold">Designation</p>
                  <p className="font-medium text-zinc-800">{emp.designation}</p>
                </div>
                <div>
                  <p className="text-xs text-zinc-500 uppercase tracking-wider font-semibold">Department</p>
                  <p className="font-medium text-zinc-800">{emp.department}</p>
                </div>
              </div>
            </div>
            
            {/* Status & Wallet Info */}
            <div className="text-right flex flex-col items-end justify-center h-full space-y-3">
              <div>
                <span className={`px-4 py-1.5 rounded-full text-sm font-bold border ${
                  payroll.status === "Paid" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                  payroll.status === "Approved" ? "bg-blue-50 text-blue-700 border-blue-200" :
                  "bg-amber-50 text-amber-700 border-amber-200"
                }`}>
                  {payroll.status.toUpperCase()}
                </span>
              </div>
              {payroll.paymentDetails && (
                <div className="text-right">
                  <p className="text-[10px] text-zinc-400 uppercase tracking-wider font-bold">Transaction ID</p>
                  <p className="text-xs font-mono font-medium text-indigo-700 bg-indigo-50 px-2 py-1 rounded inline-block mt-1">{payroll.paymentDetails.transactionId}</p>
                  
                  <p className="text-[10px] text-zinc-400 uppercase tracking-wider font-bold mt-2">Paid On</p>
                  <p className="text-xs font-medium text-zinc-800">{new Date(payroll.paymentDetails.paymentDate).toLocaleDateString()}</p>
                </div>
              )}
            </div>
          </div>

          {/* Salary Structure Table */}
          <div className="grid grid-cols-2 gap-8 mb-8">
            {/* Earnings */}
            <div>
              <h4 className="font-black border-b-2 border-emerald-600 pb-2 mb-4 text-emerald-800 uppercase tracking-wider text-sm">Earnings</h4>
              <div className="space-y-4">
                <div className="flex justify-between text-sm"><span className="text-zinc-700">Basic Salary</span><span className="font-bold">₹{payroll.earnings.basic.toLocaleString(undefined, {minimumFractionDigits: 2})}</span></div>
                <div className="flex justify-between text-sm"><span className="text-zinc-700">House Rent Allowance</span><span className="font-bold">₹{payroll.earnings.hra.toLocaleString(undefined, {minimumFractionDigits: 2})}</span></div>
                <div className="flex justify-between text-sm"><span className="text-zinc-700">Special Allowance</span><span className="font-bold">₹{payroll.earnings.specialAllowance.toLocaleString(undefined, {minimumFractionDigits: 2})}</span></div>
                {payroll.earnings.overtimeAmount > 0 && <div className="flex justify-between text-sm"><span className="text-zinc-700">Overtime Pay</span><span className="font-bold">₹{payroll.earnings.overtimeAmount.toLocaleString(undefined, {minimumFractionDigits: 2})}</span></div>}
                {payroll.earnings.bonus > 0 && <div className="flex justify-between text-sm"><span className="text-zinc-700">Performance Bonus</span><span className="font-bold">₹{payroll.earnings.bonus.toLocaleString(undefined, {minimumFractionDigits: 2})}</span></div>}
              </div>
            </div>

            {/* Deductions */}
            <div>
              <h4 className="font-black border-b-2 border-rose-600 pb-2 mb-4 text-rose-800 uppercase tracking-wider text-sm">Deductions</h4>
              <div className="space-y-4">
                <div className="flex justify-between text-sm"><span className="text-zinc-700">Provident Fund (PF)</span><span className="font-bold text-rose-700">₹{payroll.deductions.pf.toLocaleString(undefined, {minimumFractionDigits: 2})}</span></div>
                <div className="flex justify-between text-sm"><span className="text-zinc-700">ESI Contribution</span><span className="font-bold text-rose-700">₹{payroll.deductions.esi.toLocaleString(undefined, {minimumFractionDigits: 2})}</span></div>
                <div className="flex justify-between text-sm"><span className="text-zinc-700">Professional Tax</span><span className="font-bold text-rose-700">₹{payroll.deductions.professionalTax.toLocaleString(undefined, {minimumFractionDigits: 2})}</span></div>
                <div className="flex justify-between text-sm"><span className="text-zinc-700">Income Tax (TDS)</span><span className="font-bold text-rose-700">₹{payroll.deductions.incomeTax.toLocaleString(undefined, {minimumFractionDigits: 2})}</span></div>
                {payroll.deductions.unpaidLeaveDeduction > 0 && <div className="flex justify-between text-sm"><span className="text-zinc-700">LOP Deduction (Leaves)</span><span className="font-bold text-rose-700">₹{payroll.deductions.unpaidLeaveDeduction.toLocaleString(undefined, {minimumFractionDigits: 2})}</span></div>}
              </div>
            </div>
          </div>

          {/* Totals Section */}
          <div className="grid grid-cols-2 gap-8 mb-8 border-t border-zinc-200 pt-4">
            <div className="flex justify-between items-center text-sm">
              <span className="font-bold text-zinc-500 uppercase">Gross Earnings</span>
              <span className="font-black text-lg">₹{payroll.grossSalary.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="font-bold text-zinc-500 uppercase">Total Deductions</span>
              <span className="font-black text-lg text-rose-700">₹{payroll.totalDeductions.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
            </div>
          </div>

          {/* Net Pay Banner */}
          <div className="bg-indigo-950 text-white rounded-xl p-8 flex justify-between items-center shadow-lg relative overflow-hidden">
            <div className="absolute right-0 top-0 opacity-10 h-full w-1/2 bg-gradient-to-l from-white to-transparent pointer-events-none"></div>
            <div>
              <p className="text-indigo-200 font-bold uppercase tracking-widest text-sm mb-1">Net Salary Payable</p>
              <p className="text-xs text-indigo-300">Amount transferred to employee bank account</p>
            </div>
            <div className="text-5xl font-black tracking-tighter">
              <span className="text-indigo-400 mr-2 font-normal">₹</span>
              {payroll.netSalary.toLocaleString(undefined, {minimumFractionDigits: 2})}
            </div>
          </div>

          {/* Footer Area: Signature & QR */}
          <div className="mt-16 flex justify-between items-end">
            <div className="flex items-center space-x-4">
              <div className="p-2 bg-white border-2 border-zinc-200 rounded-lg shadow-sm">
                <QRCodeSVG value={verificationUrl} size={80} level="M" />
              </div>
              <div className="text-xs text-zinc-500">
                <p className="font-bold text-zinc-800 uppercase tracking-wider mb-1">Scan to Verify</p>
                <p>Scan this QR code to verify the</p>
                <p>authenticity of this document online.</p>
                <p className="font-mono mt-1 text-[10px]">{payroll._id}</p>
              </div>
            </div>
            
            <div className="text-center">
              {/* Digital Signature graphic placeholder */}
              <div className="h-16 flex items-center justify-center mb-2">
                <span className="font-[cursive] text-4xl text-indigo-950 opacity-80" style={{ fontFamily: 'Brush Script MT, cursive' }}>John Doe</span>
              </div>
              <div className="border-t-2 border-zinc-300 w-48 pt-2">
                <p className="font-bold text-zinc-800 text-sm">Authorized Signatory</p>
                <p className="text-xs text-zinc-500">Director of Human Resources</p>
              </div>
            </div>
          </div>

          {/* Watermark / Footer note */}
          <div className="absolute bottom-8 left-0 w-full text-center text-[10px] text-zinc-400">
            <p>This is a system generated document and is valid without a physical signature. Generated on {new Date().toLocaleDateString()}</p>
          </div>

        </div>
      </div>
    </div>
  );
}
