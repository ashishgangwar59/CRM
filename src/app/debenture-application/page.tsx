"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { CheckCircle2, Upload, FileText, UserCheck, ShieldCheck } from "lucide-react";

function DebentureFormContent() {
  const searchParams = useSearchParams();
  const refCodeParam = searchParams.get("ref") || "";

  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    fullName: "",
    fatherSpouseName: "",
    dob: "",
    address: "",
    city: "",
    state: "",
    pinCode: "",
    panNumber: "",
    phone: "",
    email: "",
    occupation: "",
    typeOfDebenture: "Secured",
    faceValue: 1000,
    noOfDebentures: 1,
    totalApplicationAmount: 1000,
    modeOfPayment: "NEFT/RTGS",
    chequeDdNo: "",
    chequeDdDate: "",
    transactionUtrNo: "",
    drawnOnBank: "",
    refEmpCode: refCodeParam,
    passportPhotoUrl: "",
    panDocUrl: "",
    aadharDocUrl: "",
    bankPassbookUrl: "",
  });

  const [unauthorized, setUnauthorized] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.employee) {
          const empCode = data.employee.employeeCode || data.employee.email;
          setForm((prev) => ({ ...prev, refEmpCode: prev.refEmpCode || empCode }));
        } else if (!refCodeParam && !data.success) {
          setUnauthorized(true);
        }
      })
      .catch(() => {
        if (!refCodeParam) setUnauthorized(true);
      });

    if (refCodeParam) {
      setForm((prev) => ({ ...prev, refEmpCode: refCodeParam }));
    }
  }, [refCodeParam]);

  // Recalculate total amount when noOfDebentures or faceValue changes
  const handleDebentureCalc = (qty: number, faceVal: number) => {
    setForm((prev) => ({
      ...prev,
      noOfDebentures: qty,
      faceValue: faceVal,
      totalApplicationAmount: qty * faceVal,
    }));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: string) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch("/api/employees/upload", { method: "POST", body: formData });
      const json = await res.json();
      if (json.success) {
        setForm((prev) => ({ ...prev, [field]: json.url }));
      } else {
        alert(json.error || "File upload failed.");
      }
    } catch (e) {
      alert("Error uploading file.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/debenture-application", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const json = await res.json();
      if (json.success) {
        setSubmitted(json.data);
      } else {
        setError(json.error || "Failed to submit Debenture Application.");
      }
    } catch (e) {
      setError("An error occurred while submitting the form.");
    } finally {
      setLoading(false);
    }
  };

  if (unauthorized) {
    return (
      <div className="min-h-screen bg-[#fafafa] flex items-center justify-center p-4">
        <Card className="max-w-md w-full border-[#eee] bg-white shadow-xl text-center p-8 space-y-4">
          <div className="w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center mx-auto border border-rose-200 text-rose-600 font-bold text-2xl">
            🔒
          </div>
          <h2 className="text-2xl font-black text-zinc-900">Access Denied</h2>
          <p className="text-sm text-zinc-600">
            Direct access to the Debenture Application Form is restricted. Please log in to your employee account or access the form using a valid Employee Referral link.
          </p>
          <div className="pt-4">
            <a href="/login" className="inline-block bg-[#134086] text-white px-6 py-2.5 rounded-md font-bold text-sm hover:bg-[#0f336c]">
              Go to Login
            </a>
          </div>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-[#fafafa] flex items-center justify-center p-4">
        <Card className="max-w-lg w-full border-[#eee] bg-white shadow-xl text-center p-8 space-y-4">
          <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto border border-emerald-200">
            <CheckCircle2 className="w-10 h-10 text-[#00a65a]" />
          </div>
          <h2 className="text-2xl font-black text-zinc-900">Application Submitted!</h2>
          <p className="text-sm text-zinc-600">
            Your Debenture Application has been successfully registered under Application No:
          </p>
          <div className="p-3 bg-zinc-50 border border-[#eee] rounded-lg font-mono font-bold text-lg text-[#134086]">
            {submitted.applicationNo}
          </div>
          <p className="text-xs text-zinc-500">
            Our team will review your application and documents. You can log in using your email address and default password <span className="font-mono font-bold text-zinc-800">Investor@123</span>.
          </p>
          <div className="pt-4">
            <a href="/login" className="inline-block bg-[#134086] text-white px-6 py-2.5 rounded-md font-bold text-sm hover:bg-[#0f336c]">
              Go to Login Portal
            </a>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f4f6f9] py-10 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Printable Official Form Container */}
        <div className="bg-white border border-[#eee] rounded-xl shadow-lg overflow-hidden">
          {/* Header Banner */}
          <div className="bg-[#134086] text-white p-6 text-center border-b border-[#0f336c]">
            <h1 className="text-2xl md:text-3xl font-black tracking-wider uppercase">
              NIVENTRA CAPITAL ADVISORY INDIA PVT LTD
            </h1>
            <p className="text-xs text-zinc-200 mt-1">
              A-91, Block A, Gali No. 2, Sewak Park, Near Dwarka Mor Metro Station, Gate No. 2, New Delhi - 110059
            </p>
            <div className="mt-4 pt-3 border-t border-blue-400/30 flex flex-wrap justify-center gap-4 text-xs font-semibold text-blue-100">
              <span>📞 8920313143</span>
              <span>✉️ info@niventracapitaladvisory.com</span>
              <span>🌐 www.niventracapitaladvisory.com</span>
            </div>
          </div>

          <div className="p-6 md:p-8 space-y-6">
            {/* Title Bar */}
            <div className="text-center space-y-1">
              <h2 className="text-xl md:text-2xl font-black text-zinc-900 uppercase tracking-wide border-b-2 border-zinc-900 pb-1 inline-block">
                DEBENTURE APPLICATION FORM
              </h2>
              <p className="text-xs font-bold text-zinc-500 uppercase">(FOR SECURED DEBENTURES)</p>
            </div>

            {error && (
              <div className="p-4 bg-rose-50 border border-rose-200 text-rose-600 rounded-lg text-sm font-bold">
                ⚠️ {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Employee Referral Code Banner */}
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs font-bold text-[#134086]">
                  <UserCheck className="w-4 h-4 shrink-0" />
                  <span>Submitting via Employee / Agent Referral Code:</span>
                </div>
                <div className="max-w-xs w-full">
                  <Input
                    disabled
                    placeholder="Auto-filled Referral Code"
                    value={form.refEmpCode}
                    onChange={(e) => setForm({ ...form, refEmpCode: e.target.value })}
                    className="bg-zinc-100 border-[#eee] text-xs font-mono uppercase font-bold cursor-not-allowed opacity-80"
                  />
                </div>
              </div>

              {/* 1. INVESTOR DETAILS */}
              <div className="space-y-4">
                <div className="bg-[#134086] text-white px-3 py-1.5 rounded text-sm font-bold uppercase tracking-wider">
                  1. INVESTOR DETAILS
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-xs font-bold">Full Name (Applicant) *</Label>
                    <Input required placeholder="Enter full name" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} className="bg-white border-[#eee]" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-bold">Father's / Spouse Name</Label>
                    <Input placeholder="Enter father or spouse name" value={form.fatherSpouseName} onChange={(e) => setForm({ ...form, fatherSpouseName: e.target.value })} className="bg-white border-[#eee]" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-bold">Date of Birth / Incorporation</Label>
                    <Input type="date" value={form.dob} onChange={(e) => setForm({ ...form, dob: e.target.value })} className="bg-white border-[#eee]" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-bold">PAN No.</Label>
                    <Input placeholder="10-character PAN" maxLength={10} value={form.panNumber} onChange={(e) => setForm({ ...form, panNumber: e.target.value.toUpperCase() })} className="bg-white border-[#eee] font-mono uppercase" />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-bold">Address</Label>
                  <Input placeholder="Full residential/office address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="bg-white border-[#eee]" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <Label className="text-xs font-bold">City</Label>
                    <Input placeholder="City" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className="bg-white border-[#eee]" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-bold">State</Label>
                    <Input placeholder="State" value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} className="bg-white border-[#eee]" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-bold">PIN Code</Label>
                    <Input placeholder="6-digit PIN" maxLength={6} value={form.pinCode} onChange={(e) => setForm({ ...form, pinCode: e.target.value })} className="bg-white border-[#eee] font-mono" />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <Label className="text-xs font-bold">Mobile No. *</Label>
                    <Input required placeholder="10-digit mobile" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="bg-white border-[#eee]" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-bold">Email ID *</Label>
                    <Input type="email" required placeholder="Email address" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="bg-white border-[#eee]" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-bold">Occupation / Business</Label>
                    <Input placeholder="Occupation" value={form.occupation} onChange={(e) => setForm({ ...form, occupation: e.target.value })} className="bg-white border-[#eee]" />
                  </div>
                </div>
              </div>

              {/* 2. INVESTMENT DETAILS */}
              <div className="space-y-4">
                <div className="bg-[#134086] text-white px-3 py-1.5 rounded text-sm font-bold uppercase tracking-wider">
                  2. INVESTMENT DETAILS
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <Label className="text-xs font-bold">Type of Debenture</Label>
                    <select
                      value={form.typeOfDebenture}
                      onChange={(e) => setForm({ ...form, typeOfDebenture: e.target.value })}
                      className="w-full h-10 px-3 border border-[#eee] rounded-md bg-white text-sm"
                    >
                      <option value="Secured">Secured</option>
                      <option value="Non-Convertible">Non-Convertible</option>
                      <option value="Redeemable">Redeemable</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-bold">Face Value (Per Debenture ₹)</Label>
                    <Input
                      type="number"
                      value={form.faceValue}
                      onChange={(e) => handleDebentureCalc(form.noOfDebentures, Number(e.target.value))}
                      className="bg-white border-[#eee]"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-bold">No. of Debentures Applied</Label>
                    <Input
                      type="number"
                      value={form.noOfDebentures}
                      onChange={(e) => handleDebentureCalc(Number(e.target.value), form.faceValue)}
                      className="bg-white border-[#eee]"
                    />
                  </div>
                </div>

                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center justify-between">
                  <span className="text-xs font-bold text-[#00a65a] uppercase">Total Application Amount:</span>
                  <span className="text-2xl font-black text-[#00a65a]">₹{form.totalApplicationAmount.toLocaleString()}</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-xs font-bold">Mode of Payment</Label>
                    <select
                      value={form.modeOfPayment}
                      onChange={(e) => setForm({ ...form, modeOfPayment: e.target.value })}
                      className="w-full h-10 px-3 border border-[#eee] rounded-md bg-white text-sm"
                    >
                      <option value="NEFT/RTGS">NEFT / RTGS</option>
                      <option value="Cheque">Cheque</option>
                      <option value="DD">Demand Draft (DD)</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-bold">Cheque / DD / Ref No.</Label>
                    <Input placeholder="Cheque or Ref No." value={form.chequeDdNo} onChange={(e) => setForm({ ...form, chequeDdNo: e.target.value })} className="bg-white border-[#eee]" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-bold">Transaction UTR No.</Label>
                    <Input placeholder="UTR number" value={form.transactionUtrNo} onChange={(e) => setForm({ ...form, transactionUtrNo: e.target.value })} className="bg-white border-[#eee] font-mono" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-bold">Drawn On Bank</Label>
                    <Input placeholder="Bank Name" value={form.drawnOnBank} onChange={(e) => setForm({ ...form, drawnOnBank: e.target.value })} className="bg-white border-[#eee]" />
                  </div>
                </div>
              </div>

              {/* 3. DOCUMENT ENCLOSURES */}
              <div className="space-y-4">
                <div className="bg-[#134086] text-white px-3 py-1.5 rounded text-sm font-bold uppercase tracking-wider">
                  3. DOCUMENTS TO BE ENCLOSED (PDF / IMAGES)
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 border border-[#eee] rounded-lg space-y-2 bg-white">
                    <Label className="text-xs font-bold">Passport Photo</Label>
                    <Input type="file" accept="image/*" onChange={(e) => handleFileUpload(e, "passportPhotoUrl")} className="text-xs" />
                    {form.passportPhotoUrl && <span className="text-[11px] text-[#00a65a] font-bold">✔ Attached</span>}
                  </div>
                  <div className="p-4 border border-[#eee] rounded-lg space-y-2 bg-white">
                    <Label className="text-xs font-bold">PAN Card PDF / Image</Label>
                    <Input type="file" accept=".pdf,image/*" onChange={(e) => handleFileUpload(e, "panDocUrl")} className="text-xs" />
                    {form.panDocUrl && <span className="text-[11px] text-[#00a65a] font-bold">✔ Attached</span>}
                  </div>
                  <div className="p-4 border border-[#eee] rounded-lg space-y-2 bg-white">
                    <Label className="text-xs font-bold">Aadhar Card PDF / Image</Label>
                    <Input type="file" accept=".pdf,image/*" onChange={(e) => handleFileUpload(e, "aadharDocUrl")} className="text-xs" />
                    {form.aadharDocUrl && <span className="text-[11px] text-[#00a65a] font-bold">✔ Attached</span>}
                  </div>
                </div>
              </div>

              {/* 4. DECLARATION & SIGNATURE */}
              <div className="space-y-4">
                <div className="bg-[#134086] text-white px-3 py-1.5 rounded text-sm font-bold uppercase tracking-wider">
                  4. DECLARATION
                </div>
                <div className="p-4 bg-zinc-50 border border-[#eee] rounded-lg text-xs leading-relaxed text-zinc-700 space-y-2">
                  <p>1. I/We have read and understood the terms and conditions of the Information Memorandum and Debenture Trust Deed.</p>
                  <p>2. The information provided by me/us in this application is true, correct, and complete.</p>
                  <p>3. I/We authorize the Company to verify any or all of the above information as it may deem fit.</p>
                </div>
              </div>

              {/* Submit */}
              <div className="pt-4 flex justify-end">
                <Button type="submit" disabled={loading} className="bg-[#134086] hover:bg-[#0f336c] text-white font-black px-10 py-3 text-base">
                  {loading ? "Submitting Application..." : "Submit Application"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DebentureApplicationPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center">Loading Debenture Application Form...</div>}>
      <DebentureFormContent />
    </Suspense>
  );
}
