"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Printer, Save, X, ExternalLink, Eye, Download, FileText } from "lucide-react";

interface DebentureFormModalProps {
  investor: any;
  onClose: () => void;
  onUpdate: () => void;
}

export default function DebentureFormModal({ investor, onClose, onUpdate }: DebentureFormModalProps) {
  const form = investor.debentureForm || {};
  const kyc = investor.kycDocs || {};

  // Comprehensive URL resolution for photo, signature, and KYC documents
  const passportPhotoUrl = form.passportPhotoUrl || kyc.passportPhotoUrl || investor.passportPhotoUrl || investor.photoUrl || kyc.photoUrl || "";
  const signatureUrl = form.signatureUrl || kyc.signatureUrl || investor.signatureUrl || "";
  const panDocUrl = kyc.panDocUrl || form.panDocUrl || investor.panDocUrl || "";
  const aadharDocUrl = kyc.aadharDocUrl || form.aadharDocUrl || investor.aadharDocUrl || "";
  const bankPassbookUrl = kyc.bankPassbookUrl || form.bankPassbookUrl || investor.bankPassbookUrl || "";

  const [saving, setSaving] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<{ title: string; url: string } | null>(null);

  const isPdf = (url: string) => {
    if (!url) return false;
    return url.startsWith("data:application/pdf") || url.toLowerCase().includes(".pdf");
  };

  const openInNewWindow = (url: string) => {
    if (!url) return;
    if (url.startsWith("data:")) {
      try {
        const arr = url.split(",");
        const mimeMatch = arr[0].match(/:(.*?);/);
        const mime = mimeMatch ? mimeMatch[1] : "application/octet-stream";
        const bstr = atob(arr[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
          u8arr[n] = bstr.charCodeAt(n);
        }
        const blob = new Blob([u8arr], { type: mime });
        const blobUrl = URL.createObjectURL(blob);
        const win = window.open(blobUrl, "_blank");
        if (!win) {
          alert("Popup blocked! Please allow popups for this site.");
        }
      } catch (e) {
        console.error(e);
        window.open(url, "_blank");
      }
    } else {
      window.open(url, "_blank");
    }
  };
  const [officeData, setOfficeData] = useState({
    officeReceivedOn: form.officeReceivedOn || new Date().toISOString().split("T")[0],
    officeReceivedBy: form.officeReceivedBy || "Admin",
    officeAmountReceived: form.officeAmountReceived || investor.investmentAmount || 0,
    officePaymentMode: form.officePaymentMode || form.modeOfPayment || "NEFT/RTGS",
    officeRemark: form.officeRemark || "Verified & Processed",
    officeStatus: form.officeStatus || (investor.status === "Verified" ? "Accepted" : "Accepted"),
    officeAllottedNo: form.officeAllottedNo || `DEB-${investor.investorCode?.replace("INV-", "") || "0001"}`,
    totalApplicationAmount: form.totalApplicationAmount || investor.investmentAmount || 1000,
    totalApplicationAmountWords: form.totalApplicationAmountWords || "",
    verifiedName: form.verifiedName || "Admin Verifier",
    verifiedDesignation: form.verifiedDesignation || "Senior Manager - Operations",
    verifiedSignDate: form.verifiedSignDate || new Date().toISOString().split("T")[0],
    approvedName: form.approvedName || "Ram Mohan Sharma",
    approvedDesignation: form.approvedDesignation || "Authorized Signatory",
    approvedSignDate: form.approvedSignDate || new Date().toISOString().split("T")[0],
  });

  const handleSaveOfficeUse = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/investors/me", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          investorId: investor._id,
          debentureForm: {
            ...form,
            ...officeData,
          },
        }),
      });
      const json = await res.json();
      if (json.success) {
        alert("Office Use details saved successfully!");
        onUpdate();
      } else {
        alert(json.error || "Failed to save details");
      }
    } catch (e) {
      alert("Error saving details");
    } finally {
      setSaving(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-[#e7e7e7] border border-zinc-300 rounded-lg w-full max-w-4xl max-h-[96vh] overflow-y-auto relative shadow-2xl">

        {/* Top Control Header Bar (Hidden during print) */}
        <div className="sticky top-0 z-20 bg-[#0c1c3d] text-white px-6 py-3.5 flex justify-between items-center border-b border-[#c9972f] print:hidden">
          <div className="flex items-center space-x-3">
            <span className="font-extrabold text-sm text-[#e8b84b] uppercase tracking-wider">
              📄 Debenture Application Form — {investor.fullName}
            </span>
            <span className="text-xs bg-[#c9972f] text-zinc-950 font-bold px-2.5 py-0.5 rounded">
              {form.applicationNo || investor.investorCode}
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <Button
              size="sm"
              onClick={handleSaveOfficeUse}
              disabled={saving}
              className="bg-[#c9972f] hover:bg-[#e8b84b] text-zinc-950 font-bold text-xs"
            >
              <Save className="w-3.5 h-3.5 mr-1.5" />
              {saving ? "Saving..." : "Save Office Use"}
            </Button>
            <Button
              size="sm"
              onClick={handlePrint}
              className="bg-white hover:bg-zinc-100 text-[#0c1c3d] font-bold text-xs"
            >
              <Printer className="w-3.5 h-3.5 mr-1.5" />
              Print / Save PDF
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={onClose}
              className="text-white hover:bg-zinc-800"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Printable Form Sheet */}
        <div className="p-4 sm:p-6 print:p-0">
          <style jsx global>{`
            :root {
              --navy: #0c1c3d;
              --gold: #c9972f;
              --gold-light: #e8b84b;
              --cream: #fffdf8;
              --text: #1c1c1c;
            }
            .sheet-view {
              max-width: 850px;
              margin: 0 auto;
              background: var(--cream);
              border: 2px solid var(--navy);
              position: relative;
              color: var(--text);
              font-family: 'Segoe UI', Arial, sans-serif;
              padding-bottom: 20px;
            }

            .sheet-view input[type="text"],
            .sheet-view input[type="email"],
            .sheet-view input[type="tel"],
            .sheet-view input[type="number"],
            .sheet-view input[type="date"],
            .sheet-view textarea,
            .sheet-view select {
              font-family: inherit;
              font-size: 12px;
              color: #0c1c3d;
              background: #fbf6e8;
              border: none;
              border-bottom: 1px solid #999;
              padding: 2px 4px;
              outline: none;
              width: 100%;
            }
            .sheet-view .header {
              background: linear-gradient(180deg, #0c1c3d, #132a5c);
              color: #fff;
              padding: 16px 24px 12px;
              text-align: center;
              border-bottom: 4px solid var(--gold);
              position: relative;
            }
            .sheet-view .company-name {
              font-size: 24px;
              font-weight: 800;
              letter-spacing: 1px;
              color: var(--gold-light);
              margin: 4px 0 6px;
              text-shadow: 0 1px 2px rgba(0, 0, 0, 0.4);
            }
            .sheet-view .addr {
              font-size: 11.5px;
              line-height: 1.4;
              margin: 0 0 6px;
            }
            .sheet-view .contact-row {
              display: flex;
              justify-content: center;
              gap: 20px;
              font-size: 11px;
              margin-top: 4px;
              flex-wrap: wrap;
            }
            .sheet-view .logo-badge {
              position: absolute;
              left: 16px;
              top: 12px;
              width: 64px;
              height: 64px;
              border-radius: 50%;
              background: radial-gradient(circle, #12224e 60%, #0c1c3d 100%);
              border: 3px solid var(--gold);
              display: flex;
              align-items: center;
              justify-content: center;
              font-weight: 800;
              color: var(--gold-light);
              font-size: 18px;
            }
            .sheet-view .crest {
              position: absolute;
              right: 16px;
              top: 10px;
              text-align: center;
              color: var(--gold-light);
              font-size: 9.5px;
              font-weight: 700;
              letter-spacing: 0.5px;
              line-height: 1.2;
            }

            .sheet-view .divider {
              text-align: center;
              padding: 4px 0;
              color: var(--gold);
              font-size: 13px;
              letter-spacing: 4px;
            }
            .sheet-view .title-block {
              text-align: center;
              padding: 4px 20px;
            }
            .sheet-view .title-block h1 {
              color: var(--navy);
              font-size: 22px;
              font-weight: 800;
              letter-spacing: 1.5px;
              margin: 0;
            }
            .sheet-view .title-block h2 {
              color: #c05a1e;
              font-size: 13px;
              font-weight: 700;
              margin: 2px 0 6px;
            }
            .sheet-view .notice {
              background: var(--navy);
              color: #fff;
              display: inline-block;
              padding: 4px 18px;
              border-radius: 12px;
              font-size: 10.5px;
              margin-bottom: 8px;
            }

            .sheet-view .section-header {
              background: var(--navy);
              color: #fff;
              font-size: 12px;
              font-weight: 700;
              padding: 4px 14px;
              margin: 14px 20px 0;
              clip-path: polygon(0 0, 100% 0, 97% 100%, 0% 100%);
              display: inline-block;
              min-width: 240px;
            }

            .sheet-view .box {
              border: 1px solid var(--gold);
              margin: 0 20px 12px;
              padding: 8px 14px;
              background: #fffef9;
            }

            .sheet-view .field-row {
              display: flex;
              align-items: center;
              gap: 8px;
              font-size: 12px;
              padding: 5px 0;
              border-bottom: 1px dotted #e3c98a;
            }
            .sheet-view .field-row:last-child {
              border-bottom: none;
            }
            .sheet-view .field-label {
              width: 180px;
              flex-shrink: 0;
              color: #333;
              font-weight: 600;
            }
            .sheet-view .field-colon {
              width: 10px;
              flex-shrink: 0;
            }
            .sheet-view .field-fill {
              flex: 1;
              font-weight: 700;
              color: #0c1c3d;
            }

            .sheet-view .photo-box {
              width: 110px;
              height: 120px;
              border: 1.5px dashed var(--gold);
              display: flex;
              align-items: center;
              justify-content: center;
              text-align: center;
              font-size: 10.5px;
              color: #8a6d1f;
              flex-shrink: 0;
              overflow: hidden;
              background: #fffef9;
            }
            .sheet-view .photo-box img {
              width: 100%;
              height: 100%;
              object-fit: cover;
            }

            .sheet-view .office-wrap {
              display: flex;
              margin: 14px 20px;
              border: 1px solid var(--gold);
            }
            .sheet-view .office-col {
              flex: 1;
              padding: 8px 12px;
              font-size: 11px;
            }
            .sheet-view .office-col + .office-col {
              border-left: 1px solid var(--gold);
            }
            .sheet-view .office-title {
              background: var(--navy);
              color: #fff;
              text-align: center;
              font-size: 10.5px;
              font-weight: 700;
              padding: 3px;
              margin: -8px -12px 6px;
            }
            .sheet-view .office-col div.row {
              margin-bottom: 6px;
              display: flex;
              gap: 4px;
              align-items: center;
            }
            .sheet-view .office-col .lbl {
              width: 110px;
              flex-shrink: 0;
            }

            .sheet-view .stamp {
              width: 60px;
              height: 60px;
              border: 2px solid var(--navy);
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              text-align: center;
              font-size: 7.5px;
              color: var(--navy);
              font-weight: 700;
              margin-top: 6px;
              line-height: 1.1;
            }
            .sheet-view .sign-name {
              font-family: 'Brush Script MT', cursive;
              font-size: 18px;
              color: #1a2c56;
              margin: 4px 0 0;
            }

            @media print {
              body {
                background: #fff !important;
                padding: 0 !important;
              }
              .print\\:hidden {
                display: none !important;
              }
              .sheet-view {
                border: none !important;
                width: 100% !important;
                max-width: 100% !important;
              }
            }
          `}</style>

          <div className="sheet-view">
            {/* HEADER */}
            <div className="header">
              <div className="logo-badge">
                <img
                  src="/logo.png"
                  alt="Company Logo"
                  style={{ width: "100%", height: "100%", objectFit: "contain", padding: "3px", borderRadius: "50%", background: "#fff" }}
                  onError={(e) => { (e.target as HTMLElement).style.display = "none"; }}
                />
              </div>
              <div className="crest">
                <span style={{ fontSize: "16px", display: "block" }}>&#9819;</span>
                INVEST TODAY<br />PROSPER<br />TOMORROW
              </div>
              <div className="company-name">NIVENTRA CAPITAL ADVISORY INDIA PVT LTD</div>
              <div className="addr">
                A-91, Block A, Gali No. 2, Sewak Park, Near Dwarka Mor Metro Station, Gate No. 2,<br />
                Dwarka Mor, New Delhi &ndash; 110059, India
              </div>
              <div className="contact-row">
                <span>&#128222; 011 4051 5660</span>
                <span>&#9993; info@niventracapitaladvisory.com</span>
                <span>&#127760; www.niventracapitaladvisory.com</span>
              </div>
            </div>

            <div className="divider">&#10022; &mdash;&mdash;&mdash;&mdash;&mdash; &#10022; &mdash;&mdash;&mdash;&mdash;&mdash; &#10022;</div>

            {/* TITLE */}
            <div className="title-block">
              <h1>DEBENTURE APPLICATION FORM</h1>
              <h2>(FOR SECURED DEBENTURES)</h2>
              <div className="notice">OFFICIAL FILLED APPLICATION DOCUMENT</div>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", margin: "10px 20px", fontSize: "12px", borderBottom: "1px solid #c9972f", paddingBottom: "6px" }}>
              <div>
                <b>Application No:</b> <span className="font-mono text-[#0c1c3d] font-bold">{form.applicationNo || investor.investorCode}</span>
              </div>
              <div>
                <b>Application Date:</b> {form.applicationDate || investor.createdAt?.split("T")[0]}
              </div>
            </div>

            <div style={{ padding: "0 20px", fontSize: "12px", lineHeight: "1.5" }}>
              <p>
                To,<br />
                The Board of Directors,<br />
                <b>NIVENTRA CAPITAL ADVISORY INDIA PVT LTD</b>
              </p>
            </div>

            {/* SECTION 1 */}
            <div className="section-header">1. INVESTOR DETAILS</div>
            <div className="box">
              <div className="field-row">
                <div className="field-label">Full Name (Applicant)</div>
                <div className="field-colon">:</div>
                <div className="field-fill">{investor.fullName}</div>
              </div>
              <div className="field-row">
                <div className="field-label">Father's / Spouse Name</div>
                <div className="field-colon">:</div>
                <div className="field-fill">{form.fatherSpouseName || "—"}</div>
              </div>
              <div className="field-row">
                <div className="field-label">Date of Birth / Incorporation</div>
                <div className="field-colon">:</div>
                <div className="field-fill" style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>{form.dob || "—"}</span>
                  <span><b>PAN No:</b> <span className="font-mono">{kyc.panNumber || "—"}</span></span>
                </div>
              </div>
              <div className="field-row">
                <div className="field-label">Address</div>
                <div className="field-colon">:</div>
                <div className="field-fill">{form.address || "—"}</div>
              </div>
              <div className="field-row">
                <div className="field-label">City / State / PIN</div>
                <div className="field-colon">:</div>
                <div className="field-fill">
                  {form.city || "—"}, {form.state || "—"} &ndash; {form.pinCode || "—"}
                </div>
              </div>
              <div className="field-row">
                <div className="field-label">Mobile & Email</div>
                <div className="field-colon">:</div>
                <div className="field-fill" style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>📞 {investor.phone}</span>
                  <span>✉️ {investor.email}</span>
                </div>
              </div>
              <div className="field-row">
                <div className="field-label">Occupation</div>
                <div className="field-colon">:</div>
                <div className="field-fill">{form.occupation || "—"}</div>
              </div>
            </div>

            {/* SECTION 2 */}
            <div className="section-header">2. INVESTMENT DETAILS</div>
            <div className="box">
              <div className="field-row">
                <div className="field-label">Type of Debenture</div>
                <div className="field-colon">:</div>
                <div className="field-fill">{form.typeOfDebenture || "Secured"}</div>
              </div>
              <div className="field-row">
                <div className="field-label">Face Value (Per Debenture)</div>
                <div className="field-colon">:</div>
                <div className="field-fill">₹{(form.faceValue || 1000).toLocaleString()}</div>
              </div>
              <div className="field-row">
                <div className="field-label">No. of Debentures Applied</div>
                <div className="field-colon">:</div>
                <div className="field-fill">
                  {form.noOfDebentures || 1} <span style={{ fontWeight: "normal", fontSize: "11px", color: "#666" }}>({form.numDebenturesWords || "Units"})</span>
                </div>
              </div>
              <div className="field-row">
                <div className="field-label">Total Application Amount</div>
                <div className="field-colon">:</div>
                <div className="field-fill" style={{ fontSize: "14px", color: "#00a65a", display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                  <span>₹{(investor.investmentAmount || form.totalApplicationAmount || 0).toLocaleString()}</span>
                  {form.totalApplicationAmountWords && (
                    <span className="text-xs text-zinc-500 font-normal">
                      ({form.totalApplicationAmountWords})
                    </span>
                  )}
                </div>
              </div>
              <div className="field-row">
                <div className="field-label">Mode of Payment</div>
                <div className="field-colon">:</div>
                <div className="field-fill">{form.modeOfPayment || "NEFT/RTGS"}</div>
              </div>
              <div className="field-row">
                <div className="field-label">Transaction / UTR / Ref No</div>
                <div className="field-colon">:</div>
                <div className="field-fill font-mono">{form.transactionUtrNo || form.chequeDdNo || "—"}</div>
              </div>
              <div className="field-row">
                <div className="field-label">Bank Name</div>
                <div className="field-colon">:</div>
                <div className="field-fill">{form.drawnOnBank || form.bankName || kyc.bankName || "—"}</div>
              </div>
            </div>

            {/* SECTION 3 */}
            <div className="section-header">3. DECLARATION & PHOTOGRAPH</div>
            <div className="box">
              <div style={{ display: "flex", justifyContent: "space-between", gap: "16px" }}>
                <div style={{ flex: 1, fontSize: "11px", lineHeight: "1.6" }}>
                  I/We hereby declare and confirm that:
                  <ol style={{ margin: "4px 0 0 16px" }}>
                    <li>I/We have read and understood the terms and conditions of the Information Memorandum and Debenture Trust Deed.</li>
                    <li>The information provided by me/us in this application is true, correct and complete.</li>
                    <li>I/We agree to be bound by the terms and conditions governing the issue of Secured Debentures.</li>
                  </ol>
                  <div style={{ marginTop: "12px" }}>
                    <b>Place:</b> {form.place || "Delhi"} &nbsp;|&nbsp; <b>Date:</b> {form.applicationDate || investor.createdAt?.split("T")[0]}
                  </div>
                </div>

                <div className="photo-box flex flex-col items-center justify-center overflow-hidden border-2 border-[#0c1c3d] bg-white">
                  {passportPhotoUrl ? (
                    <img src={passportPhotoUrl} alt="Passport Photo" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-[10px] text-zinc-500 font-bold text-center leading-tight">
                      No Photo<br />Attached
                    </span>
                  )}
                </div>
              </div>

              <div style={{ marginTop: "14px", borderTop: "1px solid #e3c98a", paddingTop: "8px", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "11px" }}>
                <div>
                  Digital Signature: <span className="font-mono font-bold text-[#0c1c3d]">{investor.fullName} ✔</span>
                  {signatureUrl && (
                    <div className="mt-1 flex items-center gap-2">
                      <img src={signatureUrl} alt="Applicant Signature" className="h-8 max-w-[140px] object-contain border bg-white rounded p-0.5" />
                      <button
                        type="button"
                        onClick={() => setPreviewDoc({ title: "Applicant Signature", url: signatureUrl })}
                        className="text-[10px] font-bold text-indigo-700 hover:underline print:hidden flex items-center gap-0.5"
                      >
                        <Eye className="w-3 h-3" /> View
                      </button>
                    </div>
                  )}
                </div>
                <div>
                  Referred By: <span className="font-bold text-[#134086]">{investor.referralEmployeeName || "Direct"}</span>
                </div>
              </div>
            </div>

            {/* SECTION 4 DOCUMENTS */}
            <div className="section-header">4. ATTACHED KYC DOCUMENTS</div>
            <div className="box">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs print:hidden">
                <div className="p-2.5 border rounded-lg bg-white flex items-center justify-between shadow-sm">
                  <span className="font-bold text-zinc-800">1. PAN Card</span>
                  {panDocUrl ? (
                    <button
                      type="button"
                      onClick={() => setPreviewDoc({ title: "PAN Card Document", url: panDocUrl })}
                      className="text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1 bg-indigo-50 px-2 py-1 rounded border border-indigo-200"
                    >
                      <Eye className="w-3.5 h-3.5" /> View
                    </button>
                  ) : <span className="text-rose-500 font-semibold text-[11px]">Missing</span>}
                </div>

                <div className="p-2.5 border rounded-lg bg-white flex items-center justify-between shadow-sm">
                  <span className="font-bold text-zinc-800">2. Aadhaar Card</span>
                  {aadharDocUrl ? (
                    <button
                      type="button"
                      onClick={() => setPreviewDoc({ title: "Aadhaar Card Document", url: aadharDocUrl })}
                      className="text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1 bg-indigo-50 px-2 py-1 rounded border border-indigo-200"
                    >
                      <Eye className="w-3.5 h-3.5" /> View
                    </button>
                  ) : <span className="text-rose-500 font-semibold text-[11px]">Missing</span>}
                </div>

                <div className="p-2.5 border rounded-lg bg-white flex items-center justify-between shadow-sm">
                  <span className="font-bold text-zinc-800">3. Bank Proof</span>
                  {bankPassbookUrl ? (
                    <button
                      type="button"
                      onClick={() => setPreviewDoc({ title: "Bank Passbook / Cheque", url: bankPassbookUrl })}
                      className="text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1 bg-indigo-50 px-2 py-1 rounded border border-indigo-200"
                    >
                      <Eye className="w-3.5 h-3.5" /> View
                    </button>
                  ) : <span className="text-rose-500 font-semibold text-[11px]">Missing</span>}
                </div>

                <div className="p-2.5 border rounded-lg bg-white flex items-center justify-between shadow-sm">
                  <span className="font-bold text-zinc-800">4. Photo</span>
                  {passportPhotoUrl ? (
                    <button
                      type="button"
                      onClick={() => setPreviewDoc({ title: "Applicant Passport Photo", url: passportPhotoUrl })}
                      className="text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1 bg-indigo-50 px-2 py-1 rounded border border-indigo-200"
                    >
                      <Eye className="w-3.5 h-3.5" /> View
                    </button>
                  ) : <span className="text-rose-500 font-semibold text-[11px]">Missing</span>}
                </div>
              </div>
            </div>

            {/* OFFICE USE ONLY (EDITABLE BY ADMIN) */}
            <div className="office-wrap">
              <div className="office-col">
                <div className="office-title">FOR OFFICE USE ONLY</div>
                <div className="row">
                  <span className="lbl">Received On:</span>
                  <input
                    type="date"
                    value={officeData.officeReceivedOn}
                    onChange={(e) => setOfficeData({ ...officeData, officeReceivedOn: e.target.value })}
                  />
                </div>
                <div className="row">
                  <span className="lbl">Received By:</span>
                  <input
                    type="text"
                    value={officeData.officeReceivedBy}
                    onChange={(e) => setOfficeData({ ...officeData, officeReceivedBy: e.target.value })}
                  />
                </div>
                <div className="row">
                  <span className="lbl">Amount Received:</span>
                  ₹<input
                    type="number"
                    value={officeData.officeAmountReceived}
                    onChange={(e) => setOfficeData({ ...officeData, officeAmountReceived: Number(e.target.value) })}
                  />
                </div>
                <div className="row">
                  <span className="lbl">Total App Amount (Figures):</span>
                  ₹<input
                    type="number"
                    value={officeData.totalApplicationAmount}
                    onChange={(e) => setOfficeData({ ...officeData, totalApplicationAmount: Number(e.target.value) })}
                  />
                </div>
                <div className="row">
                  <span className="lbl">Total App Amount (Words):</span>
                  <input
                    type="text"
                    value={officeData.totalApplicationAmountWords}
                    onChange={(e) => setOfficeData({ ...officeData, totalApplicationAmountWords: e.target.value })}
                  />
                </div>
                <div className="row">
                  <span className="lbl">Payment Mode:</span>
                  <input
                    type="text"
                    value={officeData.officePaymentMode}
                    onChange={(e) => setOfficeData({ ...officeData, officePaymentMode: e.target.value })}
                  />
                </div>
                <div className="row">
                  <span className="lbl">Remark:</span>
                  <input
                    type="text"
                    value={officeData.officeRemark}
                    onChange={(e) => setOfficeData({ ...officeData, officeRemark: e.target.value })}
                  />
                </div>
                <div className="row">
                  <span className="lbl">Application Status:</span>
                  <select
                    value={officeData.officeStatus}
                    onChange={(e) => setOfficeData({ ...officeData, officeStatus: e.target.value })}
                    className="text-xs bg-[#fbf6e8]"
                  >
                    <option value="Accepted">Accepted</option>
                    <option value="Rejected">Rejected</option>
                    <option value="Pending">Pending</option>
                  </select>
                </div>
                <div className="row">
                  <span className="lbl">Allotted Debenture No:</span>
                  <input
                    type="text"
                    value={officeData.officeAllottedNo}
                    onChange={(e) => setOfficeData({ ...officeData, officeAllottedNo: e.target.value })}
                  />
                </div>
              </div>

              <div className="office-col">
                <div className="office-title">VERIFIED BY</div>
                <div className="row">
                  <span className="lbl">Name:</span>
                  <input
                    type="text"
                    value={officeData.verifiedName}
                    onChange={(e) => setOfficeData({ ...officeData, verifiedName: e.target.value })}
                  />
                </div>
                <div className="row">
                  <span className="lbl">Designation:</span>
                  <input
                    type="text"
                    value={officeData.verifiedDesignation}
                    onChange={(e) => setOfficeData({ ...officeData, verifiedDesignation: e.target.value })}
                  />
                </div>
                <div className="row">
                  <span className="lbl">Sign &amp; Date:</span>
                  <input
                    type="text"
                    value={officeData.verifiedSignDate}
                    onChange={(e) => setOfficeData({ ...officeData, verifiedSignDate: e.target.value })}
                  />
                </div>
              </div>

              <div className="office-col">
                <div className="office-title">APPROVED BY</div>
                <div className="row">
                  <span className="lbl">Name:</span>
                  <input
                    type="text"
                    value={officeData.approvedName}
                    onChange={(e) => setOfficeData({ ...officeData, approvedName: e.target.value })}
                  />
                </div>
                <div className="row">
                  <span className="lbl">Designation:</span>
                  <input
                    type="text"
                    value={officeData.approvedDesignation}
                    onChange={(e) => setOfficeData({ ...officeData, approvedDesignation: e.target.value })}
                  />
                </div>
                <div className="row">
                  <span className="lbl">Sign &amp; Date:</span>
                  <input
                    type="text"
                    value={officeData.approvedSignDate}
                    onChange={(e) => setOfficeData({ ...officeData, approvedSignDate: e.target.value })}
                  />
                </div>
                <div style={{ marginTop: "4px", fontWeight: 700, fontSize: "10px" }}>For NIVENTRA CAPITAL ADVISORY INDIA PVT LTD</div>
                <div className="sign-name">{officeData.approvedName}</div>
                <div style={{ fontSize: "9.5px" }}>
                  {officeData.approvedName}<br />{officeData.approvedDesignation}
                </div>
                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <div className="stamp">
                    NEW DELHI<br />110059<br />INDIA
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* In-App Document Viewer Modal for Admin & KeyAdmin */}
      {previewDoc && (
        <div className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 print:hidden animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[92vh] overflow-hidden flex flex-col shadow-2xl border border-zinc-300">
            {/* Header */}
            <div className="bg-[#0c1c3d] text-white px-5 py-3 flex justify-between items-center border-b border-[#c9972f]">
              <span className="font-extrabold text-sm text-[#e8b84b] flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#c9972f]" /> {previewDoc.title}
              </span>
              <div className="flex items-center space-x-2">
                <Button
                  size="sm"
                  onClick={() => openInNewWindow(previewDoc.url)}
                  className="bg-[#c9972f] hover:bg-[#e8b84b] text-zinc-950 font-bold text-xs"
                >
                  <Download className="w-3.5 h-3.5 mr-1" /> Open / Download
                </Button>
                <button
                  type="button"
                  onClick={() => setPreviewDoc(null)}
                  className="text-zinc-400 hover:text-white font-bold text-xl px-2 leading-none"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Body Viewer */}
            <div className="p-4 overflow-y-auto flex-1 flex items-center justify-center bg-zinc-900/90 min-h-[400px]">
              {isPdf(previewDoc.url) ? (
                <iframe
                  src={previewDoc.url}
                  className="w-full h-[76vh] rounded-lg border border-zinc-700 bg-white shadow-xl"
                  title={previewDoc.title}
                />
              ) : (
                <img
                  src={previewDoc.url}
                  alt={previewDoc.title}
                  className="max-h-[76vh] max-w-full object-contain rounded-lg shadow-2xl border border-zinc-700 bg-white p-2"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
