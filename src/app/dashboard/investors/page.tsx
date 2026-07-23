"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Plus, CheckCircle, XCircle, Clock, ExternalLink, ShieldCheck, Eye, Edit3, UserCheck, TrendingUp, AlertCircle, Trash2 } from "lucide-react";

export default function AdminInvestorsPage() {
  const [investors, setInvestors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  
  // Modal / Detail state
  const [selectedInvestor, setSelectedInvestor] = useState<any>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [rejectReasonInput, setRejectReasonInput] = useState("");
  const [showRejectBox, setShowRejectBox] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  // New investor form
  const [addForm, setAddForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    investmentAmount: 0,
    monthlyGrowthPercentage: 2.5,
  });

  // Edit investor form
  const [editForm, setEditForm] = useState({
    investorId: "",
    fullName: "",
    email: "",
    phone: "",
    investmentAmount: 0,
    monthlyGrowthPercentage: 2.5,
  });

  const fetchInvestors = async () => {
    setLoading(true);
    try {
      const query = `?search=${encodeURIComponent(search)}${statusFilter ? `&status=${statusFilter}` : ""}`;
      const res = await fetch(`/api/investors/me${query}`);
      const json = await res.json();
      if (json.success) {
        setInvestors(json.data || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvestors();
  }, [search, statusFilter]);

  const handleAddInvestor = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setMsg(null);
    try {
      const res = await fetch("/api/investors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(addForm),
      });
      const json = await res.json();
      if (json.success) {
        setShowAddModal(false);
        setAddForm({ fullName: "", email: "", phone: "", investmentAmount: 0, monthlyGrowthPercentage: 2.5 });
        fetchInvestors();
      } else {
        setMsg(json.error || "Failed to create investor.");
      }
    } catch (err) {
      setMsg("Failed to create investor.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStatus = async (investorId: string, status: "Verified" | "Rejected", rejectionReason?: string) => {
    setSubmitting(true);
    try {
      const res = await fetch("/api/investors/me", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ investorId, status, rejectionReason }),
      });
      const json = await res.json();
      if (json.success) {
        setSelectedInvestor(json.data);
        setShowRejectBox(false);
        setRejectReasonInput("");
        fetchInvestors();
      } else {
        alert(json.error || "Action failed");
      }
    } catch (err) {
      alert("Error updating status");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/investors/me", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      const json = await res.json();
      if (json.success) {
        setShowEditModal(false);
        fetchInvestors();
      } else {
        alert(json.error || "Failed to update investor");
      }
    } catch (e) {
      alert("Error updating investor");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteInvestor = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to permanently delete investor "${name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/investors/me?id=${id}`, { method: "DELETE" });
      const json = await res.json();
      if (json.success) {
        setInvestors((prev) => prev.filter((inv) => inv._id !== id));
        if (selectedInvestor?._id === id) setSelectedInvestor(null);
      } else {
        alert(json.error || "Failed to delete investor.");
      }
    } catch (e) {
      console.error(e);
      alert("Error deleting investor.");
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-24">
      {/* Title bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Investor Management</h1>
          <p className="text-zinc-500 dark:text-zinc-400">Review investor KYC docs, verify bond agreements, and set monthly growth rates.</p>
        </div>

        <Button onClick={() => setShowAddModal(true)} className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold">
          <Plus className="w-4 h-4 mr-2" /> Add Investor
        </Button>
      </div>

      {/* Search & Filter Controls */}
      <div className="flex flex-col md:flex-row items-center gap-4 bg-white dark:bg-zinc-900 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3 top-3 text-zinc-400" />
          <Input
            placeholder="Search Investor Name, Email, Phone, Code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <Button
            variant={statusFilter === "" ? "default" : "outline"}
            onClick={() => setStatusFilter("")}
            size="sm"
          >
            All Status
          </Button>
          <Button
            variant={statusFilter === "Pending" ? "default" : "outline"}
            onClick={() => setStatusFilter("Pending")}
            size="sm"
            className="text-amber-600"
          >
            Pending
          </Button>
          <Button
            variant={statusFilter === "Verified" ? "default" : "outline"}
            onClick={() => setStatusFilter("Verified")}
            size="sm"
            className="text-emerald-600"
          >
            Verified
          </Button>
          <Button
            variant={statusFilter === "Rejected" ? "default" : "outline"}
            onClick={() => setStatusFilter("Rejected")}
            size="sm"
            className="text-rose-600"
          >
            Rejected
          </Button>
        </div>
      </div>

      {/* Main Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Investor Code & Name</TableHead>
                <TableHead>Contact Email / Phone</TableHead>
                <TableHead>Referred By</TableHead>
                <TableHead>Invest RS Amount</TableHead>
                <TableHead>Monthly Growth %</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Bond Agreement</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-10 text-zinc-500">Loading Investors...</TableCell>
                </TableRow>
              ) : investors.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-10 text-zinc-500">No investors found.</TableCell>
                </TableRow>
              ) : (
                investors.map((inv) => (
                  <TableRow key={inv._id}>
                    <TableCell>
                      <div>
                        <p className="font-bold text-zinc-900 dark:text-zinc-100">{inv.fullName}</p>
                        <span className="text-xs font-mono text-indigo-600 dark:text-indigo-400 font-semibold">{inv.investorCode}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{inv.email}</p>
                      <p className="text-xs text-zinc-500">{inv.phone}</p>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs font-bold text-[#134086] bg-blue-50 px-2 py-1 rounded border border-blue-200">
                        {inv.referralEmployeeName || "Direct / Self"}
                      </span>
                    </TableCell>
                    <TableCell className="font-bold text-zinc-900 dark:text-zinc-100">
                      ₹{(inv.investmentAmount || 0).toLocaleString()}
                    </TableCell>
                    <TableCell className="font-bold text-emerald-600 dark:text-emerald-400">
                      {inv.monthlyGrowthPercentage || 2.5}% / mo
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold shadow-sm ${
                          inv.status === "Verified" ? "bg-[#00a65a] text-white" :
                          inv.status === "Rejected" ? "bg-rose-600 text-white" :
                          "bg-orange-500 text-white"
                        }`}>
                          {inv.status}
                        </span>
                        {inv.docVerifications && (
                          <p className="text-[11px] text-zinc-500 font-medium">
                            Docs: <span className="font-bold text-emerald-600 dark:text-emerald-400">
                              {["aadhar", "pan", "marksheet10th", "marksheet12th", "bankPassbook"].filter(k => inv.docVerifications?.[k as keyof typeof inv.docVerifications] === "Approved").length} / 5
                            </span> Approved
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {inv.bondAgreement?.accepted ? (
                        <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                          <CheckCircle className="w-3.5 h-3.5" /> Accepted ({inv.bondAgreement.signatureText})
                        </span>
                      ) : (
                        <span className="text-xs text-zinc-400 font-medium">Not Accepted</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedInvestor(inv)}
                        >
                          <Eye className="w-3.5 h-3.5 mr-1" /> View & Verify
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => {
                            setEditForm({
                              investorId: inv._id,
                              fullName: inv.fullName,
                              email: inv.email,
                              phone: inv.phone,
                              investmentAmount: inv.investmentAmount || 0,
                              monthlyGrowthPercentage: inv.monthlyGrowthPercentage || 2.5,
                            });
                            setShowEditModal(true);
                          }}
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDeleteInvestor(inv._id, inv.fullName)}
                          className="text-rose-600 border-rose-200 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* --- View & Verify KYC Modal --- */}
      {selectedInvestor && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-6 text-zinc-900 dark:text-zinc-100 shadow-2xl">
            <div className="flex justify-between items-start border-b pb-4 dark:border-zinc-800">
              <div>
                <h2 className="text-2xl font-bold">{selectedInvestor.fullName}</h2>
                <p className="text-xs text-zinc-500 font-mono">{selectedInvestor.investorCode} • {selectedInvestor.email} • {selectedInvestor.phone}</p>
              </div>
              <Button variant="ghost" onClick={() => setSelectedInvestor(null)}>✕</Button>
            </div>

            {/* Financial & Referral Details */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-zinc-50 dark:bg-zinc-950 p-4 rounded-lg border border-zinc-200 dark:border-zinc-800">
              <div>
                <p className="text-xs text-zinc-500 font-semibold uppercase">Invested RS Amount</p>
                <p className="text-xl font-black text-[#00a65a]">₹{(selectedInvestor.investmentAmount || 0).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs text-zinc-500 font-semibold uppercase">Monthly Growth Rate</p>
                <p className="text-xl font-black text-[#134086]">{selectedInvestor.monthlyGrowthPercentage || 2.5}% / mo</p>
              </div>
              <div>
                <p className="text-xs text-zinc-500 font-semibold uppercase">Referred By Employee</p>
                <p className="text-sm font-extrabold text-[#134086]">
                  {selectedInvestor.referralEmployeeName || "Self Signup / Direct"}
                </p>
              </div>
              <div>
                <p className="text-xs text-zinc-500 font-semibold uppercase">Status</p>
                <span className={`px-2.5 py-1 rounded-full text-xs font-bold text-white ${
                  selectedInvestor.status === "Verified" ? "bg-[#00a65a]" :
                  selectedInvestor.status === "Rejected" ? "bg-rose-600" :
                  "bg-orange-500"
                }`}>
                  {selectedInvestor.status}
                </span>
              </div>
            </div>

            {/* Debenture Form Details (If submitted via Debenture Form) */}
            {selectedInvestor.debentureForm && (
              <div className="p-4 border border-[#eee] bg-white rounded-lg space-y-3 shadow-sm">
                <div className="flex justify-between items-center border-b pb-2">
                  <h4 className="font-bold text-sm text-[#134086]">Debenture Application Form Details</h4>
                  <span className="text-xs font-mono font-bold bg-blue-50 text-[#134086] px-2 py-0.5 rounded border border-blue-200">
                    App No: {selectedInvestor.debentureForm.applicationNo || "N/A"}
                  </span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                  <div>
                    <span className="text-zinc-500">Father/Spouse:</span>
                    <p className="font-bold">{selectedInvestor.debentureForm.fatherSpouseName || "N/A"}</p>
                  </div>
                  <div>
                    <span className="text-zinc-500">DOB:</span>
                    <p className="font-bold">{selectedInvestor.debentureForm.dob || "N/A"}</p>
                  </div>
                  <div>
                    <span className="text-zinc-500">Address:</span>
                    <p className="font-bold">{selectedInvestor.debentureForm.address || "N/A"}, {selectedInvestor.debentureForm.city} ({selectedInvestor.debentureForm.pinCode})</p>
                  </div>
                  <div>
                    <span className="text-zinc-500">Occupation:</span>
                    <p className="font-bold">{selectedInvestor.debentureForm.occupation || "N/A"}</p>
                  </div>
                  <div>
                    <span className="text-zinc-500">Debenture Type:</span>
                    <p className="font-bold text-[#134086]">{selectedInvestor.debentureForm.typeOfDebenture || "Secured"}</p>
                  </div>
                  <div>
                    <span className="text-zinc-500">Applied Count:</span>
                    <p className="font-bold">{selectedInvestor.debentureForm.noOfDebentures} @ ₹{selectedInvestor.debentureForm.faceValue}</p>
                  </div>
                  <div>
                    <span className="text-zinc-500">Payment Mode:</span>
                    <p className="font-bold">{selectedInvestor.debentureForm.modeOfPayment} (UTR: {selectedInvestor.debentureForm.transactionUtrNo || "N/A"})</p>
                  </div>
                  <div>
                    <span className="text-zinc-500">Bank:</span>
                    <p className="font-bold">{selectedInvestor.debentureForm.drawnOnBank || "N/A"}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Uploaded Documents Check List with One-by-One Verification */}
            <div className="space-y-3">
              <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-500">Uploaded KYC Documents & One-by-One Verification</h3>
              
              <div className="grid grid-cols-1 gap-3 text-sm">
                {[
                  { key: "aadhar", title: "Aadhar Card", sub: selectedInvestor.kycDocs?.aadharNumber, url: selectedInvestor.kycDocs?.aadharDocUrl, req: true },
                  { key: "pan", title: "PAN Card", sub: selectedInvestor.kycDocs?.panNumber, url: selectedInvestor.kycDocs?.panDocUrl, req: true },
                  { key: "marksheet10th", title: "10th Marksheet", sub: "Mandatory Doc", url: selectedInvestor.kycDocs?.marksheet10thUrl, req: true },
                  { key: "marksheet12th", title: "12th Marksheet", sub: "Mandatory Doc", url: selectedInvestor.kycDocs?.marksheet12thUrl, req: true },
                  { key: "graduation", title: "Graduation Marksheet", sub: "Optional", url: selectedInvestor.kycDocs?.graduationUrl, req: false },
                  { key: "postGraduation", title: "Post Graduation Marksheet", sub: "Optional", url: selectedInvestor.kycDocs?.postGraduationUrl, req: false },
                  { key: "bankPassbook", title: "Bank Passbook / Cheque", sub: `Bank: ${selectedInvestor.kycDocs?.bankName || "N/A"} | Ac: ${selectedInvestor.kycDocs?.accountNumber || "N/A"} | IFSC: ${selectedInvestor.kycDocs?.ifscCode || "N/A"}`, url: selectedInvestor.kycDocs?.bankPassbookUrl, req: true },
                ].map((docItem) => {
                  const currentStatus = selectedInvestor.docVerifications?.[docItem.key as keyof typeof selectedInvestor.docVerifications] || "Pending";

                  const handleDocVerify = async (key: string, docStatus: "Approved" | "Rejected") => {
                    setSubmitting(true);
                    try {
                      const res = await fetch("/api/investors/me", {
                        method: "PUT",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          investorId: selectedInvestor._id,
                          docVerifications: { [key]: docStatus },
                        }),
                      });
                      const json = await res.json();
                      if (json.success) {
                        setSelectedInvestor(json.data);
                        fetchInvestors();
                      }
                    } catch (e) {
                      console.error(e);
                    } finally {
                      setSubmitting(false);
                    }
                  };

                  return (
                    <div key={docItem.key} className="p-3.5 border rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-3 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/40">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-bold">{docItem.title}</p>
                          {docItem.sub && <span className="text-xs text-zinc-500 font-mono">({docItem.sub})</span>}
                          {docItem.req && <span className="text-[10px] bg-indigo-950 text-indigo-300 font-bold px-1.5 py-0.5 rounded">MANDATORY</span>}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`text-xs font-bold px-2.5 py-1 rounded-md flex items-center gap-1 ${
                            currentStatus === "Approved" ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30" :
                            currentStatus === "Rejected" ? "bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30" :
                            "bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30"
                          }`}>
                            {currentStatus === "Approved" && <CheckCircle className="w-3.5 h-3.5" />}
                            {currentStatus === "Rejected" && <XCircle className="w-3.5 h-3.5" />}
                            Status: {currentStatus}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        {docItem.url ? (
                          <a href={docItem.url} target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 bg-indigo-50 dark:bg-indigo-950/60 px-3 py-1.5 rounded-lg border border-indigo-200 dark:border-indigo-800">
                            <ExternalLink className="w-3.5 h-3.5" /> View File
                          </a>
                        ) : (
                          <span className="text-xs text-rose-500 font-semibold bg-rose-950/40 px-2.5 py-1 rounded border border-rose-800">
                            Missing / Not Uploaded
                          </span>
                        )}

                        <div className="flex items-center gap-1.5">
                          <Button
                            size="sm"
                            disabled={submitting || !docItem.url}
                            onClick={() => handleDocVerify(docItem.key, "Approved")}
                            className={`font-bold h-8 px-3 text-xs ${
                              !docItem.url
                                ? "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                                : currentStatus === "Approved"
                                ? "bg-emerald-600 text-white ring-2 ring-emerald-400 shadow-sm"
                                : "bg-emerald-700/80 hover:bg-emerald-600 text-white opacity-90"
                            }`}
                          >
                            <CheckCircle className="w-3.5 h-3.5 mr-1" /> {currentStatus === "Approved" ? "Approved ✔" : "Approve"}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={submitting || !docItem.url}
                            onClick={() => handleDocVerify(docItem.key, "Rejected")}
                            className={`h-8 px-3 text-xs font-bold ${
                              !docItem.url
                                ? "bg-[#eee] text-zinc-400 cursor-not-allowed border-[#eee]"
                                : currentStatus === "Rejected"
                                ? "bg-rose-600 text-white border-rose-600 ring-2 ring-rose-400"
                                : "bg-[#eee] text-rose-600 border-[#eee] hover:bg-rose-100"
                            }`}
                          >
                            <XCircle className="w-3.5 h-3.5 mr-1" /> {currentStatus === "Rejected" ? "Rejected ❌" : "Reject"}
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Bond Agreement Status */}
            <div className="p-4 border rounded-lg bg-zinc-50 dark:bg-zinc-950 dark:border-zinc-800 space-y-1">
              <h4 className="font-bold text-sm">Bond Agreement Verification</h4>
              <p className="text-xs text-zinc-600 dark:text-zinc-400">
                Bond Checkbox Accepted: <span className="font-bold">{selectedInvestor.bondAgreement?.accepted ? "YES ✔" : "NO ❌"}</span>
              </p>
              <p className="text-xs text-zinc-600 dark:text-zinc-400">
                Digital Signature: <span className="font-bold font-mono">{selectedInvestor.bondAgreement?.signatureText || "N/A"}</span>
              </p>
            </div>

            {/* Reject reason box */}
            {showRejectBox && (
              <div className="space-y-2 p-4 border border-rose-300 bg-rose-50 dark:bg-rose-950/20 rounded-lg">
                <Label className="text-rose-700 font-bold">Reason for Rejection *</Label>
                <Input
                  placeholder="Enter rejection reason (e.g. Aadhar doc unreadable)"
                  value={rejectReasonInput}
                  onChange={(e) => setRejectReasonInput(e.target.value)}
                />
                <Button
                  size="sm"
                  className="bg-rose-600 hover:bg-rose-500 text-white font-bold"
                  onClick={() => handleUpdateStatus(selectedInvestor._id, "Rejected", rejectReasonInput)}
                  disabled={submitting || !rejectReasonInput.trim()}
                >
                  Confirm Rejection
                </Button>
              </div>
            )}

            {/* Admin verification actions */}
            {(() => {
              const hasUploadedDocs = !!(
                selectedInvestor.kycDocs?.aadharDocUrl ||
                selectedInvestor.kycDocs?.panDocUrl ||
                selectedInvestor.kycDocs?.marksheet10thUrl ||
                selectedInvestor.kycDocs?.marksheet12thUrl ||
                selectedInvestor.kycDocs?.bankPassbookUrl
              );
              const hasAllMandatoryUploaded = !!(
                selectedInvestor.kycDocs?.aadharDocUrl &&
                selectedInvestor.kycDocs?.panDocUrl &&
                selectedInvestor.kycDocs?.marksheet10thUrl &&
                selectedInvestor.kycDocs?.marksheet12thUrl &&
                selectedInvestor.kycDocs?.bankPassbookUrl
              );

              return (
                <div className="space-y-2 border-t pt-4 dark:border-zinc-800">
                  {!hasUploadedDocs && (
                    <p className="text-xs text-rose-500 font-semibold text-right">
                      ⚠️ Investor has not uploaded any documents yet. Verification controls disabled.
                    </p>
                  )}
                  {hasUploadedDocs && !hasAllMandatoryUploaded && (
                    <p className="text-xs text-amber-500 font-semibold text-right">
                      ⚠️ Some mandatory documents are still missing from the investor.
                    </p>
                  )}

                  <div className="flex justify-end gap-3">
                    <Button
                      variant="outline"
                      className={`bg-[#eee] text-rose-600 border-[#eee] hover:bg-rose-100 font-bold ${
                        !hasUploadedDocs ? "opacity-50 cursor-not-allowed" : ""
                      }`}
                      onClick={() => setShowRejectBox(!showRejectBox)}
                      disabled={submitting || !hasUploadedDocs}
                    >
                      Reject Investor Docs
                    </Button>
                    <Button
                      className={`bg-emerald-600 hover:bg-emerald-500 text-white font-bold ${
                        !hasAllMandatoryUploaded ? "opacity-50 cursor-not-allowed" : ""
                      }`}
                      onClick={() => handleUpdateStatus(selectedInvestor._id, "Verified")}
                      disabled={submitting || !hasAllMandatoryUploaded}
                    >
                      <CheckCircle className="w-4 h-4 mr-2" /> Verify All Docs & Approve
                    </Button>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* --- Add Investor Modal --- */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b pb-3 dark:border-zinc-800">
              <h2 className="text-xl font-bold">Add New Investor</h2>
              <Button variant="ghost" onClick={() => setShowAddModal(false)}>✕</Button>
            </div>

            {msg && <p className="text-xs text-rose-500">{msg}</p>}

            <form onSubmit={handleAddInvestor} className="space-y-3">
              <div className="space-y-1">
                <Label>Full Name *</Label>
                <Input required value={addForm.fullName} onChange={(e) => setAddForm({ ...addForm, fullName: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Email *</Label>
                <Input type="email" required value={addForm.email} onChange={(e) => setAddForm({ ...addForm, email: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Phone *</Label>
                <Input required value={addForm.phone} onChange={(e) => setAddForm({ ...addForm, phone: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Invest RS Amount (₹)</Label>
                <Input type="number" value={addForm.investmentAmount} onChange={(e) => setAddForm({ ...addForm, investmentAmount: Number(e.target.value) })} />
              </div>
              <div className="space-y-1">
                <Label>Monthly Growth (%)</Label>
                <Input type="number" step="0.1" value={addForm.monthlyGrowthPercentage} onChange={(e) => setAddForm({ ...addForm, monthlyGrowthPercentage: Number(e.target.value) })} />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <Button type="button" variant="outline" onClick={() => setShowAddModal(false)}>Cancel</Button>
                <Button type="submit" disabled={submitting} className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold">
                  {submitting ? "Saving..." : "Create Investor"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- Edit Investor Modal --- */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b pb-3 dark:border-zinc-800">
              <h2 className="text-xl font-bold">Edit Investor Profile</h2>
              <Button variant="ghost" onClick={() => setShowEditModal(false)}>✕</Button>
            </div>

            <form onSubmit={handleEditSave} className="space-y-3">
              <div className="space-y-1">
                <Label>Full Name</Label>
                <Input value={editForm.fullName} onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Email</Label>
                <Input type="email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Phone</Label>
                <Input value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Invest RS Amount (₹)</Label>
                <Input type="number" value={editForm.investmentAmount} onChange={(e) => setEditForm({ ...editForm, investmentAmount: Number(e.target.value) })} />
              </div>
              <div className="space-y-1">
                <Label>Monthly Growth (%)</Label>
                <Input type="number" step="0.1" value={editForm.monthlyGrowthPercentage} onChange={(e) => setEditForm({ ...editForm, monthlyGrowthPercentage: Number(e.target.value) })} />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <Button type="button" variant="outline" onClick={() => setShowEditModal(false)}>Cancel</Button>
                <Button type="submit" disabled={submitting} className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold">
                  {submitting ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
