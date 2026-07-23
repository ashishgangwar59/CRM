"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DollarSign, Upload, CheckCircle2, Clock, XCircle, FileText, TrendingUp, ShieldCheck, CheckSquare } from "lucide-react";

export function InvestorDashboard() {
  const [investor, setInvestor] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Form states
  const [investmentAmount, setInvestmentAmount] = useState<number>(0);
  const [kycDocs, setKycDocs] = useState({
    aadharNumber: "",
    aadharDocUrl: "",
    panNumber: "",
    panDocUrl: "",
    marksheet10thUrl: "",
    marksheet12thUrl: "",
    graduationUrl: "",
    postGraduationUrl: "",
    bankPassbookUrl: "",
    bankName: "",
    accountNumber: "",
    ifscCode: "",
    branchName: "",
  });

  const [bondAccepted, setBondAccepted] = useState(false);
  const [signatureText, setSignatureText] = useState("");

  const [bondTemplate, setBondTemplate] = useState<string>("");

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/investors/me");
      const json = await res.json();
      if (json.success && json.data) {
        const data = json.data;
        setInvestor(data);
        setInvestmentAmount(data.investmentAmount || 0);
        setKycDocs({
          aadharNumber: data.kycDocs?.aadharNumber || "",
          aadharDocUrl: data.kycDocs?.aadharDocUrl || "",
          panNumber: data.kycDocs?.panNumber || "",
          panDocUrl: data.kycDocs?.panDocUrl || "",
          marksheet10thUrl: data.kycDocs?.marksheet10thUrl || "",
          marksheet12thUrl: data.kycDocs?.marksheet12thUrl || "",
          graduationUrl: data.kycDocs?.graduationUrl || "",
          postGraduationUrl: data.kycDocs?.postGraduationUrl || "",
          bankPassbookUrl: data.kycDocs?.bankPassbookUrl || "",
          bankName: data.kycDocs?.bankName || "",
          accountNumber: data.kycDocs?.accountNumber || "",
          ifscCode: data.kycDocs?.ifscCode || "",
          branchName: data.kycDocs?.branchName || "",
        });
        setBondAccepted(!!data.bondAgreement?.accepted);
        setSignatureText(data.bondAgreement?.signatureText || data.fullName || "");
      }

      // Fetch SystemSettings for dynamic legal bond agreement text
      const settingsRes = await fetch("/api/settings");
      const settingsJson = await settingsRes.json();
      if (settingsJson.success && settingsJson.data?.investorLegalBondTemplate) {
        setBondTemplate(settingsJson.data.investorLegalBondTemplate);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: string) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];

    // Client-side PDF check
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      setMsg({ type: "error", text: "Invalid file type. Only PDF documents are allowed." });
      return;
    }

    // Client-side 15MB limit check (15 * 1024 * 1024 bytes)
    const MAX_SIZE = 15 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      setMsg({ type: "error", text: `File "${file.name}" exceeds the maximum allowed size of 15MB.` });
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/employees/upload", { method: "POST", body: formData });
      const json = await res.json();
      if (json.success) {
        setKycDocs((prev) => ({ ...prev, [field]: json.url }));
        setMsg({ type: "success", text: `PDF uploaded successfully for ${field}!` });
      } else {
        setMsg({ type: "error", text: json.error || "Upload failed." });
      }
    } catch (err) {
      setMsg({ type: "error", text: "Error uploading document." });
    }
  };

  const handleSubmitAll = async () => {
    setSaving(true);
    setMsg(null);

    if (!kycDocs.aadharDocUrl || !kycDocs.panDocUrl || !kycDocs.marksheet10thUrl || !kycDocs.marksheet12thUrl || !kycDocs.bankPassbookUrl) {
      setMsg({ type: "error", text: "Please upload mandatory docs: Aadhar, PAN, 10th Marksheet, 12th Marksheet & Bank Passbook." });
      setSaving(false);
      return;
    }

    if (!bondAccepted || !signatureText.trim()) {
      setMsg({ type: "error", text: "You must accept the Bond Agreement and enter your signature name." });
      setSaving(false);
      return;
    }

    try {
      const res = await fetch("/api/investors/me", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          investmentAmount,
          kycDocs,
          bondAgreement: {
            accepted: bondAccepted,
            signatureText,
          },
        }),
      });

      const json = await res.json();
      if (json.success) {
        setMsg({ type: "success", text: "Your investor details, KYC documents, and Bond Agreement were successfully submitted to Admin for verification!" });
        setInvestor(json.data);
      } else {
        setMsg({ type: "error", text: json.error || "Failed to submit details. Please try again." });
      }
    } catch (e) {
      setMsg({ type: "error", text: "An error occurred while submitting details. Please try again." });
    } finally {
      setSaving(false);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  useEffect(() => {
    if (msg) {
      const timer = setTimeout(() => setMsg(null), 6000);
      return () => clearTimeout(timer);
    }
  }, [msg]);
  if (!investor) return <div className="p-8">Investor profile not found. Please log in again.</div>;

  const monthlyReturnAmount = investor.status === "Verified" ? Math.round((investor.investmentAmount * (investor.monthlyGrowthPercentage || 2.5)) / 100) : 0;

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-24">
      {/* Header banner */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-6 bg-white border border-[#eee] rounded-xl text-zinc-900 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-zinc-900">{investor.fullName}</h1>
            <span className="text-xs bg-emerald-50 text-[#00a65a] font-mono px-2 py-0.5 rounded border border-emerald-200 font-bold">
              {investor.investorCode}
            </span>
          </div>
          <p className="text-sm text-zinc-500 mt-1">Email: {investor.email} • Phone: {investor.phone}</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-xs text-zinc-400 uppercase font-semibold">Verification Status</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              {investor.status === "Verified" ? (
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#00a65a] text-white flex items-center gap-1 shadow-sm">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Verified
                </span>
              ) : investor.status === "Rejected" ? (
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-rose-600 text-white flex items-center gap-1 shadow-sm">
                  <XCircle className="w-3.5 h-3.5" /> Rejected
                </span>
              ) : (
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-orange-500 text-white flex items-center gap-1 shadow-sm">
                  <Clock className="w-3.5 h-3.5" /> Pending Admin Review
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Toast Popup Notification */}
      {msg && (
        <div
          id="investor-toast-notification"
          className={`fixed top-6 right-6 z-50 p-4 rounded-xl border font-bold text-sm flex items-center gap-3 shadow-2xl backdrop-blur-md max-w-md animate-in slide-in-from-top-5 duration-300 ${
            msg.type === "success"
              ? "bg-emerald-950/95 border-emerald-500 text-emerald-100 ring-2 ring-emerald-500/40"
              : "bg-rose-950/95 border-rose-500 text-rose-100 ring-2 ring-rose-500/40"
          }`}
        >
          {msg.type === "success" ? (
            <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
          ) : (
            <XCircle className="w-6 h-6 text-rose-400 shrink-0" />
          )}

          <div className="flex-1">
            <p className="text-sm font-black tracking-wide uppercase">
              {msg.type === "success" ? "🎉 SUBMISSION SUCCESSFUL" : "⚠️ SUBMISSION FAILED"}
            </p>
            <p className="text-xs font-normal mt-0.5 opacity-90">{msg.text}</p>
          </div>

          <Button
            size="sm"
            variant="ghost"
            onClick={() => setMsg(null)}
            className="text-xs text-zinc-300 hover:text-white hover:bg-white/10 h-7 w-7 p-0 rounded-full"
          >
            ✕
          </Button>
        </div>
      )}

      {/* Verified Status Performance Card */}
      {investor.status === "Verified" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-white text-zinc-900 border border-[#eee] shadow-sm">
            <CardContent className="p-6">
              <p className="text-xs font-bold uppercase text-zinc-500">Investment Cost (RS)</p>
              <h3 className="text-3xl font-black mt-2 text-zinc-900">₹{investor.investmentAmount.toLocaleString()}</h3>
            </CardContent>
          </Card>

          <Card className="bg-white text-zinc-900 border border-[#eee] shadow-sm">
            <CardContent className="p-6">
              <p className="text-xs font-bold uppercase text-[#00a65a]">Monthly Growth Rate</p>
              <h3 className="text-3xl font-black mt-2 flex items-center gap-1 text-[#00a65a]">
                <TrendingUp className="w-6 h-6 text-[#00a65a]" />
                {investor.monthlyGrowthPercentage || 2.5}%
              </h3>
            </CardContent>
          </Card>

          <Card className="bg-white text-zinc-900 border border-[#eee] shadow-sm">
            <CardContent className="p-6">
              <p className="text-xs font-bold uppercase text-zinc-500">Est. Monthly Return Payout</p>
              <h3 className="text-3xl font-black text-[#00a65a] mt-2">₹{monthlyReturnAmount.toLocaleString()} / mo</h3>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Step 1: Investment Amount */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-indigo-500" /> 1. Investment Amount (RS)
          </CardTitle>
          <CardDescription>Enter the total amount in RS you intend to invest.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="max-w-md space-y-2">
            <Label htmlFor="investmentAmount">Invest RS Amount (₹)</Label>
            <Input
              id="investmentAmount"
              type="number"
              placeholder="e.g. 100000"
              value={investmentAmount}
              onChange={(e) => setInvestmentAmount(Number(e.target.value))}
              disabled
            />
          </div>
        </CardContent>
      </Card>

      {/* Step 2: Mandatory & Optional KYC Documents */}
      <Card className="border-zinc-200 dark:border-zinc-800 shadow-md overflow-hidden">
        <CardHeader className="bg-zinc-50 dark:bg-zinc-950/60 border-b border-zinc-200 dark:border-zinc-800">
          <CardTitle className="text-xl font-bold flex items-center gap-2 text-zinc-900 dark:text-zinc-50">
            <FileText className="w-5 h-5 text-indigo-500" /> 2. KYC PDF Document Uploads
          </CardTitle>
          <CardDescription className="text-zinc-500 dark:text-zinc-400">
            Only <span className="font-semibold text-indigo-600 dark:text-indigo-400">PDF documents up to 15MB</span> are accepted. Mandatory: Aadhar, PAN, 10th & 12th Marksheets, and Bank Passbook.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

            {/* Reusable Upload Zone Renderer */}
            {[
              { field: "aadharDocUrl", label: "Aadhar Card Document", req: true, numField: "aadharNumber", numPlaceholder: "Enter 12-digit Aadhar Number", numVal: kycDocs.aadharNumber, numKey: "aadharNumber", statusKey: "aadhar" },
              { field: "panDocUrl", label: "PAN Card Document", req: true, numField: "panNumber", numPlaceholder: "Enter 10-digit PAN Number", numVal: kycDocs.panNumber, numKey: "panNumber", statusKey: "pan" },
              { field: "marksheet10thUrl", label: "10th Marksheet PDF", req: true, statusKey: "marksheet10th" },
              { field: "marksheet12thUrl", label: "12th Marksheet PDF", req: true, statusKey: "marksheet12th" },
              { field: "graduationUrl", label: "Graduation Marksheet (Optional)", req: false, statusKey: "graduation" },
              { field: "postGraduationUrl", label: "Post Graduation Marksheet (Optional)", req: false, statusKey: "postGraduation" },
            ].map((item) => {
              const fileUrl = (kycDocs as any)[item.field];
              const docStatus = investor.docVerifications?.[item.statusKey as keyof typeof investor.docVerifications];

              return (
                <div key={item.field} className="p-4 border rounded-xl bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 hover:border-indigo-400 dark:hover:border-indigo-600 transition-all space-y-3 shadow-sm">
                  <div className="flex justify-between items-center">
                    <Label className="font-bold text-sm text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                      {item.label}
                      {item.req ? (
                        <span className="text-[10px] bg-rose-950 text-rose-300 font-bold px-1.5 py-0.5 rounded border border-rose-800">REQUIRED</span>
                      ) : (
                        <span className="text-[10px] bg-zinc-800 text-zinc-400 font-medium px-1.5 py-0.5 rounded">OPTIONAL</span>
                      )}
                    </Label>

                    {docStatus && (
                      <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                        docStatus === "Approved" ? "bg-emerald-950 text-emerald-400 border border-emerald-800" :
                        docStatus === "Rejected" ? "bg-rose-950 text-rose-400 border border-rose-800" :
                        "bg-amber-950 text-amber-400 border border-amber-800"
                      }`}>
                        {docStatus}
                      </span>
                    )}
                  </div>

                  {item.numField && (
                    <Input
                      placeholder={item.numPlaceholder}
                      value={item.numVal}
                      onChange={(e) => setKycDocs({ ...kycDocs, [item.numKey]: e.target.value })}
                      disabled={investor.status === "Verified" || docStatus === "Approved"}
                      className="bg-zinc-50 dark:bg-zinc-950 text-sm disabled:opacity-75"
                    />
                  )}

                  {/* Attractive Drag/Drop Zone */}
                  <label className={`group border-2 border-dashed rounded-xl p-4 flex flex-col items-center justify-center transition-all ${
                    docStatus === "Approved"
                      ? "bg-white border-[#00a65a] cursor-not-allowed opacity-90"
                      : docStatus === "Rejected"
                      ? "bg-[#fafafa] border-[#eee] hover:border-rose-400 cursor-pointer"
                      : fileUrl
                      ? "bg-emerald-50/50 border-[#00a65a] cursor-pointer"
                      : "bg-white border-[#eee] hover:border-[#00a65a] hover:bg-emerald-50/20 cursor-pointer"
                  }`}>
                    <input
                      type="file"
                      accept=".pdf,application/pdf"
                      className="hidden"
                      onChange={(e) => handleFileUpload(e, item.field)}
                      disabled={investor.status === "Verified" || docStatus === "Approved"}
                    />
                    
                    {docStatus === "Approved" ? (
                      <div className="flex items-center gap-2 text-[#00a65a] font-extrabold text-xs">
                        <CheckCircle2 className="w-5 h-5 shrink-0 text-[#00a65a]" />
                        <span>VERIFIED & APPROVED BY ADMIN</span>
                      </div>
                    ) : docStatus === "Rejected" ? (
                      <div className="flex flex-col items-center text-center space-y-1 text-rose-600">
                        <Upload className="w-6 h-6 text-rose-600 group-hover:scale-110 transition-transform" />
                        <p className="text-xs font-bold">
                          Document Rejected by Admin. <span className="underline">Click to Re-upload PDF</span>
                        </p>
                        <p className="text-[11px] text-rose-500">PDF files only (Max 15MB limit)</p>
                      </div>
                    ) : fileUrl ? (
                      <div className="flex items-center gap-2 text-[#00a65a] font-bold text-xs">
                        <CheckCircle2 className="w-5 h-5 shrink-0" />
                        <span>PDF Document Attached (Max 15MB)</span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center text-center space-y-1">
                        <Upload className="w-6 h-6 text-[#00a65a] group-hover:scale-110 transition-transform" />
                        <p className="text-xs font-semibold text-zinc-700">
                          Click to upload <span className="text-[#00a65a] font-bold">PDF</span>
                        </p>
                        <p className="text-[11px] text-zinc-400">PDF files only (Max 15MB limit)</p>
                      </div>
                    )}
                  </label>
                </div>
              );
            })}

            {/* Bank Passbook & Account Details (Full Width Card) */}
            <div className="p-5 border rounded-xl bg-white border-[#eee] md:col-span-2 space-y-4 shadow-sm">
              <div className="flex justify-between items-center border-b border-[#eee] pb-2">
                <Label className="font-bold text-base text-zinc-900 flex items-center gap-2">
                  Bank Details & Passbook PDF *
                  <span className="text-[10px] bg-rose-50 text-rose-600 font-bold px-1.5 py-0.5 rounded border border-[#eee]">REQUIRED</span>
                </Label>
                {investor.docVerifications?.bankPassbook && (
                  <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                    investor.docVerifications.bankPassbook === "Approved" ? "bg-emerald-50 text-[#00a65a] border border-[#eee]" :
                    investor.docVerifications.bankPassbook === "Rejected" ? "bg-rose-50 text-rose-600 border border-[#eee]" :
                    "bg-amber-50 text-amber-600 border border-[#eee]"
                  }`}>
                    {investor.docVerifications.bankPassbook}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Input placeholder="Bank Name" value={kycDocs.bankName} onChange={(e) => setKycDocs({ ...kycDocs, bankName: e.target.value })} disabled={investor.status === "Verified" || investor.docVerifications?.bankPassbook === "Approved"} className="bg-white border-[#eee] disabled:opacity-75" />
                <Input placeholder="Account Number" value={kycDocs.accountNumber} onChange={(e) => setKycDocs({ ...kycDocs, accountNumber: e.target.value })} disabled={investor.status === "Verified" || investor.docVerifications?.bankPassbook === "Approved"} className="bg-white border-[#eee] disabled:opacity-75" />
                <Input placeholder="IFSC Code" value={kycDocs.ifscCode} onChange={(e) => setKycDocs({ ...kycDocs, ifscCode: e.target.value })} disabled={investor.status === "Verified" || investor.docVerifications?.bankPassbook === "Approved"} className="bg-white border-[#eee] disabled:opacity-75" />
                <Input placeholder="Branch Name" value={kycDocs.branchName} onChange={(e) => setKycDocs({ ...kycDocs, branchName: e.target.value })} disabled={investor.status === "Verified" || investor.docVerifications?.bankPassbook === "Approved"} className="bg-white border-[#eee] disabled:opacity-75" />
              </div>

              <label className={`group border-2 border-dashed rounded-xl p-4 flex flex-col items-center justify-center transition-all ${
                investor.docVerifications?.bankPassbook === "Approved"
                  ? "bg-white border-[#00a65a] cursor-not-allowed opacity-90"
                  : investor.docVerifications?.bankPassbook === "Rejected"
                  ? "bg-[#fafafa] border-[#eee] hover:border-rose-400 cursor-pointer"
                  : kycDocs.bankPassbookUrl
                  ? "bg-emerald-50/50 border-[#00a65a] cursor-pointer"
                  : "bg-white border-[#eee] hover:border-[#00a65a] hover:bg-emerald-50/20 cursor-pointer"
              }`}>
                <input
                  type="file"
                  accept=".pdf,application/pdf"
                  className="hidden"
                  onChange={(e) => handleFileUpload(e, "bankPassbookUrl")}
                  disabled={investor.status === "Verified" || investor.docVerifications?.bankPassbook === "Approved"}
                />

                {investor.docVerifications?.bankPassbook === "Approved" ? (
                  <div className="flex items-center gap-2 text-[#00a65a] font-extrabold text-xs">
                    <CheckCircle2 className="w-5 h-5 shrink-0 text-[#00a65a]" />
                    <span>BANK PASSBOOK VERIFIED & APPROVED BY ADMIN</span>
                  </div>
                ) : investor.docVerifications?.bankPassbook === "Rejected" ? (
                  <div className="flex flex-col items-center text-center space-y-1 text-rose-400">
                    <Upload className="w-6 h-6 text-rose-400 group-hover:scale-110 transition-transform" />
                    <p className="text-xs font-bold">
                      Bank Passbook Rejected by Admin. <span className="underline">Click to Re-upload PDF</span>
                    </p>
                    <p className="text-[11px] text-rose-300">PDF files only (Max 15MB limit)</p>
                  </div>
                ) : kycDocs.bankPassbookUrl ? (
                  <div className="flex items-center gap-2 text-emerald-500 font-bold text-xs">
                    <CheckCircle2 className="w-5 h-5 shrink-0" />
                    <span>Bank Passbook PDF Attached (Max 15MB)</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center text-center space-y-1">
                    <Upload className="w-6 h-6 text-indigo-500 group-hover:scale-110 transition-transform" />
                    <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                      Click to upload <span className="text-indigo-600 dark:text-indigo-400 font-bold">Bank Passbook / Cheque PDF</span>
                    </p>
                    <p className="text-[11px] text-zinc-400">Only PDF files up to 15MB accepted</p>
                  </div>
                )}
              </label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Step 3: Bound / Bond Form Agreement */}
      <Card className="border-[#eee] bg-white shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-bold flex items-center gap-2 text-[#00a65a]">
            <ShieldCheck className="w-5 h-5" /> 3. Investor Legal Bond Agreement
          </CardTitle>
          <CardDescription>Review terms and check box with your signature to accept the investor bond.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-white border border-[#eee] rounded-lg text-xs leading-relaxed max-h-56 overflow-y-auto font-mono text-zinc-700 whitespace-pre-wrap">
            {bondTemplate ? (
              bondTemplate
            ) : (
              <>
                <p className="font-bold text-sm mb-2 text-zinc-900">INVESTOR CAPITAL BOND AGREEMENT TERMS</p>
                <p>1. The Investor agrees to invest the specified amount (RS) into the capital fund.</p>
                <p>2. Monthly returns will be computed at the agreed rate ({investor.monthlyGrowthPercentage || 2.5}% per month) subject to verification.</p>
                <p>3. All uploaded KYC documents (Aadhar, PAN, Marksheets & Bank Details) are verified by Key Admin before activation.</p>
                <p>4. By checking the box below, the investor digitally signs and confirms all submitted information is accurate.</p>
              </>
            )}
          </div>

          <div className="space-y-3 pt-2">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="bondCheck"
                checked={bondAccepted}
                onChange={(e) => setBondAccepted(e.target.checked)}
                disabled={investor.status === "Verified"}
                className="w-4 h-4 text-[#00a65a] rounded"
              />
              <label htmlFor="bondCheck" className="text-sm font-semibold cursor-pointer">
                I have read, understood, and accept all terms of the Investor Bond Agreement *
              </label>
            </div>

            <div className="max-w-md space-y-1.5">
              <Label htmlFor="sigText">Digital Signature (Enter Full Name) *</Label>
              <Input
                id="sigText"
                placeholder="Type your full name as signature"
                value={signatureText}
                onChange={(e) => setSignatureText(e.target.value)}
                disabled={investor.status === "Verified"}
                className="bg-white border-[#eee]"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Submit Button */}
      {investor.status !== "Verified" && (
        <div className="flex justify-end">
          <Button onClick={handleSubmitAll} disabled={saving} className="bg-[#134086] hover:bg-[#0f336c] text-white font-bold px-8 py-3 text-base">
            {saving ? "Submitting..." : "Submit All Details for Admin Verification"}
          </Button>
        </div>
      )}
    </div>
  );
}
