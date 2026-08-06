"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Trash2, Plus, Printer, RefreshCw, FileText, Save, List, Loader2 } from "lucide-react";

interface InvoiceItem {
  id: string;
  title: string;
  desc: string;
  sacCode: string;
  qty: number;
  rate: number;
  cgstRate: number;
  sgstRate: number;
  igstRate: number;
}

export default function InvoicePage() {
  // Invoice state
  const [invoiceNo, setInvoiceNo] = useState("NCA/2026-27/001");
  const [invoiceDate, setInvoiceDate] = useState("");
  const [reverseCharge, setReverseCharge] = useState("No");
  const [state, setState] = useState("Delhi");
  const [stateCode, setStateCode] = useState("07");

  // Tab & Saved Invoice states
  const [activeTab, setActiveTab] = useState<"editor" | "list">("editor");
  const [savedInvoices, setSavedInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Bill To state
  const [billToName, setBillToName] = useState("Niventra Investor Partner");
  const [billToAddress, setBillToAddress] = useState("12, Connaught Place, New Delhi");
  const [billToGstin, setBillToGstin] = useState("07AAAAA1234A1Z0");
  const [billToState, setBillToState] = useState("Delhi");
  const [billToStateCode, setBillToStateCode] = useState("07");

  // Bank details
  const [bankName, setBankName] = useState("ICICI Bank Ltd");
  const [accountNo, setAccountNo] = useState("000705001234");
  const [ifscCode, setIfscCode] = useState("ICIC0000007");
  const [branch, setBranch] = useState("Connaught Place Branch, New Delhi");

  // Payment Details from Screenshot
  const [modeOfPayment, setModeOfPayment] = useState("Cash");
  const [paymentModeOther, setPaymentModeOther] = useState("");
  const [bankNameForm, setBankNameForm] = useState("");
  const [transactionUtrNo, setTransactionUtrNo] = useState("");
  const [chequeDdNo, setChequeDdNo] = useState("");
  const [chequeDdDate, setChequeDdDate] = useState("");
  const [drawnOnBank, setDrawnOnBank] = useState("");

  // Sign block
  const [authSignatory, setAuthSignatory] = useState("Authorized Signatory");

  // Items list
  const [items, setItems] = useState<InvoiceItem[]>([
    {
      id: "1",
      title: "Debenture Issue Fee",
      desc: "Financial planning and investment retainer fee for Q2 FY2026-27",
      sacCode: "9971",
      qty: 1,
      rate: 100000,
      cgstRate: 0,
      sgstRate: 0,
      igstRate: 0,
    },
  ]);

  // Load invoice list on mount
  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/invoices");
      const data = await res.json();
      if (data.success) {
        setSavedInvoices(data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const year = new Date().getFullYear();
    const nextYear = (year + 1).toString().slice(-2);
    const rand = Math.floor(1000 + Math.random() * 9000);
    setInvoiceNo(`NCA/${year}-${nextYear}/${rand}`);
    setInvoiceDate(new Date().toISOString().split("T")[0]);
    fetchInvoices();
  }, []);

  const handleSaveInvoice = async () => {
    setSaving(true);
    setErrorMessage("");
    setSuccessMessage("");
    try {
      if (!transactionUtrNo || !transactionUtrNo.trim()) {
        setErrorMessage("Transaction / UTR No. is a required field.");
        setSaving(false);
        return;
      }
      const res = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoiceNo,
          invoiceDate,
          reverseCharge,
          state,
          stateCode,
          billToName,
          billToAddress,
          billToState,
          billToStateCode,
          items,
          modeOfPayment,
          paymentModeOther,
          bankName: bankNameForm,
          transactionUtrNo,
          chequeDdNo,
          chequeDdDate,
          drawnOnBank
        })
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMessage("Invoice saved successfully!");
        fetchInvoices();
        setActiveTab("list");
      } else {
        setErrorMessage(data.error || "Failed to save invoice");
      }
    } catch (err) {
      setErrorMessage("Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  const handleLoadInvoice = (inv: any) => {
    setInvoiceNo(inv.invoiceNo);
    setInvoiceDate(inv.invoiceDate);
    setReverseCharge(inv.reverseCharge || "No");
    setState(inv.state || "Delhi");
    setStateCode(inv.stateCode || "07");
    setBillToName(inv.billToName);
    setBillToAddress(inv.billToAddress);
    setBillToState(inv.billToState || "Delhi");
    setBillToStateCode(inv.billToStateCode || "07");
    setModeOfPayment(inv.modeOfPayment || "NEFT/RTGS");
    setPaymentModeOther(inv.paymentModeOther || "");
    setBankNameForm(inv.bankName || "");
    setTransactionUtrNo(inv.transactionUtrNo || "");
    setChequeDdNo(inv.chequeDdNo || "");
    setChequeDdDate(inv.chequeDdDate || "");
    setDrawnOnBank(inv.drawnOnBank || "");

    // Ensure all items conform to interface
    const formattedItems = inv.items.map((item: any) => ({
      id: item._id || item.id || Date.now().toString(),
      title: item.title,
      desc: item.desc || "",
      sacCode: item.sacCode || "",
      qty: item.qty,
      rate: item.rate,
      cgstRate: item.cgstRate || 0,
      sgstRate: item.sgstRate || 0,
      igstRate: item.igstRate || 0,
    }));
    setItems(formattedItems);
    setActiveTab("editor");
  };

  const handleLoadAndPrint = (inv: any) => {
    handleLoadInvoice(inv);
    setTimeout(() => {
      window.print();
    }, 500);
  };

  const handleResetForm = () => {
    const year = new Date().getFullYear();
    const nextYear = (year + 1).toString().slice(-2);
    const rand = Math.floor(1000 + Math.random() * 9000);
    setInvoiceNo(`NCA/${year}-${nextYear}/${rand}`);
    setInvoiceDate(new Date().toISOString().split("T")[0]);
    setReverseCharge("No");
    setState("Delhi");
    setStateCode("07");
    setBillToName("Niventra Investor Partner");
    setBillToAddress("12, Connaught Place, New Delhi");
    setBillToState("Delhi");
    setBillToStateCode("07");
    setModeOfPayment("NEFT/RTGS");
    setPaymentModeOther("");
    setBankNameForm("");
    setTransactionUtrNo("");
    setChequeDdNo("");
    setChequeDdDate("");
    setDrawnOnBank("");
    setItems([
      {
        id: "1",
        title: "Debenture Issue Fee",
        desc: "Financial planning and investment retainer fee for Q2 FY2026-27",
        sacCode: "9971",
        qty: 1,
        rate: 100000,
        cgstRate: 0,
        sgstRate: 0,
        igstRate: 0,
      },
    ]);
  };

  // Number to Words Converter (Indian Numbering System)
  const numberToWords = (num: number): string => {
    if (num === 0) return "Rupees Zero Only";
    if (isNaN(num) || num < 0) return "";

    const ones = [
      "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
      "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"
    ];
    const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

    const convertLessThanOneThousand = (n: number): string => {
      if (n === 0) return "";
      let temp = "";
      if (n >= 100) {
        temp += ones[Math.floor(n / 100)] + " Hundred ";
        n %= 100;
      }
      if (n >= 20) {
        temp += tens[Math.floor(n / 10)] + " ";
        n %= 10;
      }
      if (n > 0) {
        temp += ones[n] + " ";
      }
      return temp.trim();
    };

    let str = "";
    let n = Math.floor(num);

    if (n >= 10000000) { // Crore
      str += convertLessThanOneThousand(Math.floor(n / 10000000)) + " Crore ";
      n %= 10000000;
    }
    if (n >= 100000) { // Lakh
      str += convertLessThanOneThousand(Math.floor(n / 100000)) + " Lakh ";
      n %= 100000;
    }
    if (n >= 1000) { // Thousand
      str += convertLessThanOneThousand(Math.floor(n / 1000)) + " Thousand ";
      n %= 1000;
    }
    if (n > 0) {
      str += convertLessThanOneThousand(n);
    }

    const paisa = Math.round((num - Math.floor(num)) * 100);
    let paisaStr = "";
    if (paisa > 0) {
      paisaStr = " and " + convertLessThanOneThousand(paisa) + " Paisa";
    }

    return `Rupees ${str.trim()}${paisaStr} Only`;
  };

  // Calculations
  const calculateTotals = () => {
    let totalTaxableValue = 0;
    let totalIgst = 0;

    items.forEach((item) => {
      const taxable = item.qty * item.rate;
      totalTaxableValue += taxable;
      totalIgst += taxable * (item.igstRate / 100);
    });

    const grandTotal = totalTaxableValue + totalIgst;

    return {
      totalTaxableValue,
      totalCgst: 0,
      totalSgst: 0,
      totalIgst,
      grandTotal,
      grandTotalWords: numberToWords(grandTotal),
    };
  };

  const totals = calculateTotals();

  const handleAddItem = () => {
    setItems([
      ...items,
      {
        id: Date.now().toString(),
        title: "Investment Consulting",
        desc: "Consultancy charges",
        sacCode: "9971",
        qty: 1,
        rate: 50000,
        cgstRate: 0,
        sgstRate: 0,
        igstRate: 0,
      },
    ]);
  };

  const handleRemoveItem = (id: string) => {
    if (items.length === 1) return;
    setItems(items.filter((item) => item.id !== id));
  };

  const handleUpdateItem = (id: string, field: keyof InvoiceItem, value: any) => {
    setItems(
      items.map((item) => {
        if (item.id === id) {
          return { ...item, [field]: value };
        }
        return item;
      })
    );
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Tab Switcher - Hidden during print */}
      <div className="flex border-b border-zinc-200 dark:border-zinc-800 print:hidden gap-2">
        <Button
          variant={activeTab === "editor" ? "default" : "ghost"}
          onClick={() => setActiveTab("editor")}
          className={`text-xs font-semibold rounded-t-lg rounded-b-none border-b-2 px-4 py-2 h-9 ${activeTab === "editor"
            ? "border-indigo-650 bg-[#0d2452] text-white hover:bg-[#0d2452] hover:text-white"
            : "border-transparent text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            }`}
        >
          <FileText className="w-4 h-4 mr-1.5" /> Create / Edit Invoice
        </Button>
        <Button
          variant={activeTab === "list" ? "default" : "ghost"}
          onClick={() => {
            fetchInvoices();
            setActiveTab("list");
          }}
          className={`text-xs font-semibold rounded-t-lg rounded-b-none border-b-2 px-4 py-2 h-9 border-indigo-650 bg-[#0d2452] text-white hover:bg-[#0d2452]`}
        >
          <List className="w-4 h-4 mr-1.5" /> Saved Invoices ({savedInvoices.length})
        </Button>
      </div>

      {/* Editor Controls Section - Hidden during print */}
      <Card className="print:hidden border border-zinc-200 dark:border-zinc-800 shadow-xl bg-white dark:bg-zinc-950">
        <CardHeader className="flex flex-col md:flex-row md:items-center justify-between space-y-2 md:space-y-0 pb-4 border-b border-zinc-150 dark:border-zinc-850">
          <div>
            <CardTitle className="text-xl font-bold flex items-center gap-2 text-zinc-900 dark:text-zinc-50">
              <FileText className="w-5 h-5 text-indigo-650" /> Invoice Management
            </CardTitle>
            <CardDescription className="text-xs text-zinc-500 mt-1">
              {activeTab === "list"
                ? "View and print previously saved invoices."
                : "Create new professional tax invoices, save them to the system, and export as PDF."}
            </CardDescription>
          </div>
          {activeTab === "editor" && (
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                onClick={handleResetForm}
                variant="outline"
                className="h-8 text-xs font-semibold flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Reset Form
              </Button>
              <Button
                onClick={handleSaveInvoice}
                disabled={saving}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs h-8 flex items-center gap-1.5 shadow"
              >
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                Save Invoice
              </Button>
              <Button
                onClick={handlePrint}
                className="bg-[#0d2452] hover:bg-[#0a1c3f] text-white font-semibold text-xs h-8 flex items-center gap-1.5 shadow"
              >
                <Printer className="w-3.5 h-3.5" /> Print / Save PDF
              </Button>
            </div>
          )}
        </CardHeader>

        {errorMessage && (
          <div className="mx-6 mt-4 p-3 text-xs bg-red-50 text-red-650 dark:bg-red-950/20 dark:text-red-400 rounded-lg border border-red-200 dark:border-red-900/50">
            {errorMessage}
          </div>
        )}
        {successMessage && (
          <div className="mx-6 mt-4 p-3 text-xs bg-emerald-50 text-emerald-650 dark:bg-emerald-950/20 dark:text-emerald-400 rounded-lg border border-emerald-200 dark:border-emerald-900/50">
            {successMessage}
          </div>
        )}

        <div className="p-6">
          {activeTab === "list" ? (
            <div className="space-y-4">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-12 gap-2 text-zinc-500">
                  <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
                  <span className="text-xs">Loading saved invoices...</span>
                </div>
              ) : savedInvoices.length === 0 ? (
                <div className="text-center py-12 text-zinc-500 text-sm">
                  No saved invoices found. Use the "Create / Edit Invoice" tab to make one.
                </div>
              ) : (
                <div className="overflow-x-auto border rounded-lg dark:border-zinc-800">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-zinc-50 dark:bg-zinc-900 text-zinc-500 font-semibold border-b dark:border-zinc-800">
                      <tr>
                        <th className="px-4 py-3">Invoice No.</th>
                        <th className="px-4 py-3">Date</th>
                        <th className="px-4 py-3">Client Name</th>
                        <th className="px-4 py-3 text-right">Grand Total</th>
                        <th className="px-4 py-3 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                      {savedInvoices.map((inv) => {
                        const total = inv.items.reduce((acc: number, item: any) => {
                          const taxable = item.qty * item.rate;
                          const igst = taxable * ((item.igstRate || 0) / 100);
                          return acc + taxable + igst;
                        }, 0);

                        return (
                          <tr key={inv._id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900">
                            <td className="px-4 py-3 font-semibold font-mono">{inv.invoiceNo}</td>
                            <td className="px-4 py-3">{inv.invoiceDate}</td>
                            <td className="px-4 py-3">{inv.billToName}</td>
                            <td className="px-4 py-3 text-right font-bold text-zinc-900 dark:text-zinc-100">
                              ₹{total.toLocaleString()}
                            </td>
                            <td className="px-4 py-3 text-center flex items-center justify-center gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleLoadInvoice(inv)}
                                className="h-7 text-[10px]"
                              >
                                View & Edit
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => handleLoadAndPrint(inv)}
                                className="h-7 text-[10px] bg-[#0d2452] hover:bg-[#0a1c3f] text-white flex items-center gap-1"
                              >
                                <Printer className="w-3 h-3" /> View & Print
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Meta Section */}
                <div className="space-y-3 p-4 bg-zinc-50 dark:bg-zinc-900 rounded-xl border border-zinc-100 dark:border-zinc-800">
                  <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200 border-b pb-1.5">1. Invoice Meta Info</h3>
                  <div className="space-y-2">
                    <div>
                      <Label className="text-xs text-zinc-500">Invoice No (Auto-Generated)</Label>
                      <Input value={invoiceNo} readOnly className="h-8 text-xs font-semibold bg-zinc-100 dark:bg-zinc-800 cursor-not-allowed" />
                    </div>
                    <div>
                      <Label className="text-xs text-zinc-500">Invoice Date</Label>
                      <Input type="date" value={invoiceDate} readOnly className="h-8 text-xs bg-zinc-100 dark:bg-zinc-800 cursor-not-allowed" />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs text-zinc-500">State</Label>
                        <Input value={state} onChange={(e) => setState(e.target.value)} className="h-8 text-xs" />
                      </div>
                      <div>
                        <Label className="text-xs text-zinc-500">State Code</Label>
                        <Input value={stateCode} onChange={(e) => setStateCode(e.target.value)} className="h-8 text-xs" />
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs text-zinc-500">Reverse Charge Applicable?</Label>
                      <select
                        value={reverseCharge}
                        onChange={(e) => setReverseCharge(e.target.value)}
                        className="flex h-8 w-full rounded-md border border-zinc-200 bg-white px-3 py-1 text-xs shadow-sm focus-visible:outline-none dark:border-zinc-800 dark:bg-zinc-950"
                      >
                        <option value="No">No</option>
                        <option value="Yes">Yes</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Bill To Section */}
                <div className="space-y-3 p-4 bg-zinc-50 dark:bg-zinc-900 rounded-xl border border-zinc-100 dark:border-zinc-800">
                  <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200 border-b pb-1.5">2. Bill To Details</h3>
                  <div className="space-y-2">
                    <div>
                      <Label className="text-xs text-zinc-500">Client Name</Label>
                      <Input value={billToName} onChange={(e) => setBillToName(e.target.value)} className="h-8 text-xs font-semibold" />
                    </div>
                    <div>
                      <Label className="text-xs text-zinc-500">Client Address</Label>
                      <textarea
                        value={billToAddress}
                        onChange={(e) => setBillToAddress(e.target.value)}
                        className="flex min-h-[50px] w-full rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-xs shadow-sm focus-visible:outline-none dark:border-zinc-800 dark:bg-zinc-950"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs text-zinc-500">Client State</Label>
                        <Input value={billToState} onChange={(e) => setBillToState(e.target.value)} className="h-8 text-xs" />
                      </div>
                      <div>
                        <Label className="text-xs text-zinc-500">Client State Code</Label>
                        <Input value={billToStateCode} onChange={(e) => setBillToStateCode(e.target.value)} className="h-8 text-xs" />
                      </div>
                    </div>
                  </div>
                </div>                 {/* Payment & Transaction details */}
                <div className="space-y-3 p-4 bg-zinc-50 dark:bg-zinc-900 rounded-xl border border-zinc-100 dark:border-zinc-800">
                  <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200 border-b pb-1.5">3. Payment Details</h3>
                  <div className="space-y-3">

                    {/* Mode of Payment (Radios) */}
                    <div>
                      <Label className="text-xs text-zinc-500 block mb-1.5 font-bold">Mode of Payment</Label>
                      <div className="flex flex-wrap items-center gap-4 text-xs">
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="radio"
                            name="modeOfPayment"
                            value="Cash"
                            checked={modeOfPayment === "Cash"}
                            onChange={(e) => setModeOfPayment(e.target.value)}
                            className="text-indigo-650"
                          />
                          Cash
                        </label>
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="radio"
                            name="modeOfPayment"
                            value="UPI"
                            checked={modeOfPayment === "UPI"}
                            onChange={(e) => setModeOfPayment(e.target.value)}
                            className="text-indigo-650"
                          />
                          UPI
                        </label>
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="radio"
                            name="modeOfPayment"
                            value="Cheque"
                            checked={modeOfPayment === "Cheque"}
                            onChange={(e) => setModeOfPayment(e.target.value)}
                            className="text-indigo-650"
                          />
                          Cheque
                        </label>
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="radio"
                            name="modeOfPayment"
                            value="Bank Account"
                            checked={modeOfPayment === "Bank Account"}
                            onChange={(e) => setModeOfPayment(e.target.value)}
                            className="text-indigo-650"
                          />
                          Bank Account
                        </label>
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="radio"
                            name="modeOfPayment"
                            value="Other"
                            checked={modeOfPayment === "Other"}
                            onChange={(e) => setModeOfPayment(e.target.value)}
                            className="text-indigo-650"
                          />
                          Other
                        </label>
                        {modeOfPayment === "Other" && (
                          <Input
                            value={paymentModeOther}
                            onChange={(e) => setPaymentModeOther(e.target.value)}
                            placeholder="Specify mode"
                            className="h-7 text-xs w-28 ml-1"
                          />
                        )}
                      </div>
                    </div>

                    {/* Bank Name & Transaction / UTR No. */}
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs text-zinc-500">Bank Name</Label>
                        <Input
                          value={bankNameForm}
                          onChange={(e) => setBankNameForm(e.target.value)}
                          placeholder="e.g. State Bank of India"
                          className="h-8 text-xs"
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-rose-500 font-bold">Transaction / UTR No. *</Label>
                        <Input
                          value={transactionUtrNo}
                          onChange={(e) => setTransactionUtrNo(e.target.value)}
                          placeholder="UTR / Trans No."
                          className="h-8 text-xs font-semibold"
                        />
                      </div>
                    </div>

                    {/* Cheque / DD No, Date, Drawn on Bank */}
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <Label className="text-xs text-zinc-500">Cheque / DD No.</Label>
                        <Input
                          value={chequeDdNo}
                          onChange={(e) => setChequeDdNo(e.target.value)}
                          placeholder="Cheque / DD No."
                          className="h-8 text-xs"
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-zinc-500">Date</Label>
                        <Input
                          type="date"
                          value={chequeDdDate}
                          onChange={(e) => setChequeDdDate(e.target.value)}
                          className="h-8 text-xs"
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-zinc-500">Drawn On Bank</Label>
                        <Input
                          value={drawnOnBank}
                          onChange={(e) => setDrawnOnBank(e.target.value)}
                          placeholder="e.g. ICICI Bank"
                          className="h-8 text-xs"
                        />
                      </div>
                    </div>

                  </div>
                </div>

                {/* Items Editor */}
                <div className="space-y-3 p-4 bg-zinc-50 dark:bg-zinc-900 rounded-xl border border-zinc-100 dark:border-zinc-800">
                  <div className="flex justify-between items-center border-b pb-1.5">
                    <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200">3. Invoice Line Items</h3>
                    <Button size="sm" variant="outline" onClick={handleAddItem} className="h-7 text-xs bg-white text-zinc-900 hover:bg-zinc-50">
                      <Plus className="w-3.5 h-3.5 mr-1" /> Add Line Item
                    </Button>
                  </div>
                  <div className="space-y-3">
                    {items.map((item, index) => (
                      <div key={item.id} className="p-3 bg-white dark:bg-zinc-950 rounded-lg border border-zinc-250 dark:border-zinc-800 grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                        <div className="md:col-span-3">
                          <Label className="text-[10px] text-zinc-500">Service / Product Title</Label>
                          <Input value={item.title} onChange={(e) => handleUpdateItem(item.id, "title", e.target.value)} className="h-8 text-xs font-medium" />
                        </div>
                        <div className="md:col-span-3">
                          <Label className="text-[10px] text-zinc-500">Description</Label>
                          <Input value={item.desc} onChange={(e) => handleUpdateItem(item.id, "desc", e.target.value)} className="h-8 text-xs" />
                        </div>
                        <div className="md:col-span-1">
                          <Label className="text-[10px] text-zinc-500">SAC / HSN</Label>
                          <Input value={item.sacCode} onChange={(e) => handleUpdateItem(item.id, "sacCode", e.target.value)} className="h-8 text-xs text-center" />
                        </div>
                        <div className="md:col-span-1">
                          <Label className="text-[10px] text-zinc-500">Qty</Label>
                          <Input type="number" min="1" value={item.qty} onChange={(e) => handleUpdateItem(item.id, "qty", Number(e.target.value))} className="h-8 text-xs text-center" />
                        </div>
                        <div className="md:col-span-1.5">
                          <Label className="text-[10px] text-zinc-500">Rate (₹)</Label>
                          <Input type="number" min="0" value={item.rate} onChange={(e) => handleUpdateItem(item.id, "rate", Number(e.target.value))} className="h-8 text-xs font-semibold text-right" />
                        </div>
                        <div className="md:col-span-2.5 flex items-center gap-2">
                          <div className="w-full">
                            <Label className="text-[10px] text-zinc-400">IGST %</Label>
                            <Input type="number" value={item.igstRate} onChange={(e) => handleUpdateItem(item.id, "igstRate", Number(e.target.value))} className="h-8 text-xs text-center" />
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveItem(item.id)}
                            disabled={items.length === 1}
                            className="text-zinc-400 hover:text-rose-500 h-8 w-8 ml-auto flex-shrink-0"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Invoice Output Sheet Preview - Clean Printable View */}
      <div className="p-0 md:p-6 print:p-0 flex justify-center">
        {/* Scoped Styling for the Invoice Sheet to match the target HTML */}
        <div className="sheet-container">
          <style dangerouslySetInnerHTML={{
            __html: `
            .sheet-container {
              width: 100%;
              max-width: 820px;
              font-family: 'Poppins', 'Segoe UI', Arial, sans-serif;
            }
            .invoice {
              background: #0d2452;
              box-shadow: 0 10px 35px rgba(13,36,82,0.15);
              border-radius: 10px;
              overflow: hidden;
              color: #ffffff;
              border: 1px solid #1a3668;
            }
            .header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              padding: 24px 32px;
              background: #0a1c3f;
              border-bottom: 4px solid #d9a441;
              gap: 20px;
            }
            .brand {
              display: flex;
              align-items: center;
              gap: 16px;
            }
            .brand img {
              width: 66px;
              height: 66px;
              object-fit: contain;
              flex-shrink: 0;
            }
            .brand-text h1 {
              font-size: 22px;
              font-weight: 800;
              color: #ffffff;
              letter-spacing: 0.5px;
              line-height: 1.15;
            }
            .brand-text .sub {
              font-size: 12px;
              font-weight: 600;
              color: #f0c975;
              letter-spacing: 1.5px;
              margin-top: 2px;
            }
            .brand-text .tagline {
              font-size: 10.5px;
              color: #a5b4fc;
              letter-spacing: 1px;
              margin-top: 4px;
            }
            .contact-block {
              text-align: right;
              font-size: 11.5px;
              color: #ffffff;
              line-height: 1.9;
            }
            .contact-block div {
              display: flex;
              justify-content: flex-end;
              align-items: center;
              gap: 6px;
            }
            .contact-block .icon {
              display: inline-flex;
              align-items: center;
              justify-content: center;
              width: 16px; height: 16px;
              border-radius: 50%;
              background: #d9a441;
              color: #0d2452;
              font-size: 9px;
              flex-shrink: 0;
            }
            .title-bar {
              text-align: center;
              padding: 12px;
              position: relative;
            }
            .title-bar::before {
              content: "";
              position: absolute;
              top: 50%; left: 0; right: 0;
              height: 2px;
              background: #1a3668;
              z-index: 0;
            }
            .title-bar span {
              position: relative;
              z-index: 1;
              background: #d9a441;
              color: #0d2452;
              padding: 8px 34px;
              border-radius: 20px;
              font-weight: 700;
              font-size: 14px;
              letter-spacing: 2px;
            }
            .meta-section {
              display: flex;
              justify-content: space-between;
              gap: 24px;
              padding: 18px 32px 0;
              flex-wrap: wrap;
            }
            .bill-to {
              flex: 1;
              min-width: 260px;
            }
            .section-label {
              display: inline-block;
              background: #d9a441;
              color: #0d2452;
              font-size: 11px;
              font-weight: 700;
              letter-spacing: 1px;
              padding: 5px 14px;
              border-radius: 4px;
              margin-bottom: 10px;
            }
            .field-row {
              display: flex;
              font-size: 12.5px;
              margin-bottom: 9px;
            }
            .field-row .label {
              width: 100px;
              color: #a5b4fc;
              font-weight: 600;
              flex-shrink: 0;
            }
            .field-row .line {
              flex: 1;
              border-bottom: 1px solid #1a3668;
              min-height: 16px;
              font-weight: 700;
              color: #ffffff;
            }
            .invoice-info {
              min-width: 250px;
              border: 1px solid #1a3668;
              border-radius: 8px;
              overflow: hidden;
              height: fit-content;
              background: #0a1c3f;
            }
            .invoice-info .row {
              display: flex;
              justify-content: space-between;
              font-size: 12.5px;
              padding: 8px 14px;
              border-bottom: 1px solid #1a3668;
            }
            .invoice-info .row:last-child { border-bottom: none; }
            .invoice-info .row .k { color: #a5b4fc; font-weight: 600; }
            .invoice-info .row .v { color: #f0c975; font-weight: 700; }
            .barcode-block {
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              border: 1px solid #1a3668;
              border-radius: 8px;
              padding: 10px;
              background: #0a1c3f;
              min-width: 140px;
              height: fit-content;
              gap: 6px;
              text-align: center;
            }
            .barcode-block img {
              background: #ffffff;
              padding: 4px;
              border-radius: 4px;
            }
            .barcode-title {
              font-size: 8px;
              color: #a5b4fc;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              font-weight: bold;
            }
            table.items {
              width: calc(100% - 64px);
              margin: 22px 32px 0;
              border-collapse: collapse;
              font-size: 12.5px;
            }
            table.items thead th {
              background: #d9a441;
              color: #0d2452;
              font-size: 11px;
              letter-spacing: 0.5px;
              text-align: left;
              padding: 10px 12px;
            }
            table.items thead th:nth-child(1) { width: 8%; }
            table.items thead th:nth-child(3) { width: 12%; text-align: center;}
            table.items thead th:nth-child(4) { width: 15%; text-align: right;}
            table.items thead th:nth-child(5) { width: 15%; text-align: right;}
            table.items tbody td {
              padding: 12px;
              border-bottom: 1px solid #1a3668;
              vertical-align: top;
              color: #ffffff;
            }
            table.items tbody td:nth-child(3) { text-align: center; }
            table.items tbody td:nth-child(4) { text-align: right; }
            table.items tbody td:nth-child(5) { text-align: right; font-weight: 600;}
            .item-title { font-weight: 700; color: #ffffff; }
            .item-desc { font-size: 11px; color: #a5b4fc; margin-top: 2px; }
            .bottom-section {
              display: flex;
              justify-content: space-between;
              gap: 20px;
              padding: 20px 32px 0;
              flex-wrap: wrap;
            }
            .left-col {
              flex: 1;
              min-width: 270px;
              display: flex;
              flex-direction: column;
              gap: 14px;
            }
            .box {
              border: 1px solid #1a3668;
              border-radius: 8px;
              padding: 12px 14px;
              background: #0a1c3f;
            }
            .box .box-title {
              font-size: 11px;
              font-weight: 700;
              color: #f0c975;
              letter-spacing: 0.5px;
              margin-bottom: 8px;
            }
            .pay-icons {
              display: flex;
              gap: 22px;
              font-size: 10.5px;
              color: #a5b4fc;
              text-align: center;
            }
            .pay-icons div { display: flex; flex-direction: column; align-items: center; gap: 4px; }
            .pay-icons .circle {
              width: 32px; height: 32px;
              border-radius: 50%;
              background: #0a1c3f;
              border: 1px solid #1a3668;
              display: flex; align-items: center; justify-content: center;
              font-size: 14px;
              color: #ffffff;
              font-weight: bold;
            }
            .bank-details div {
              display: flex;
              justify-content: space-between;
              font-size: 11.5px;
              padding: 3px 0;
            }
            .bank-details .k { color: #a5b4fc; }
            .bank-details .v { font-weight: 600; color: #ffffff; }
            .terms ul {
              list-style: none;
              font-size: 10.5px;
              color: #ffffff;
              line-height: 1.7;
              padding-left: 0;
            }
            .terms ul li::before {
              content: "• ";
              color: #f0c975;
              font-weight: 700;
            }
            .right-col {
              min-width: 280px;
              display: flex;
              flex-direction: column;
              gap: 16px;
            }
            .totals {
              border: 1px solid #1a3668;
              border-radius: 8px;
              overflow: hidden;
            }
            .totals .row {
              display: flex;
              justify-content: space-between;
              padding: 9px 16px;
              font-size: 12.5px;
              border-bottom: 1px solid #1a3668;
              background: #0a1c3f;
            }
            .totals .row .k { color: #a5b4fc; font-weight: 600;}
            .totals .row .v { font-weight: 700; color: #ffffff; }
            .totals .grand {
              background: #d9a441;
              color: #0d2452;
              padding: 12px 16px;
              display: flex;
              justify-content: space-between;
              font-size: 14px;
              font-weight: 800;
            }
            .totals .grand .v { color: #0d2452; }
            .amount-words {
              font-size: 10.5px;
              color: #a5b4fc;
              text-align: right;
              font-style: italic;
              line-height: 1.4;
            }
            .sign-block {
              text-align: center;
              padding-top: 10px;
            }
            .sign-block .for-text {
              font-size: 11px;
              font-weight: 700;
              color: #f0c975;
              margin-bottom: 34px;
            }
            .sign-block .auth {
              font-size: 10.5px;
              font-weight: 700;
              letter-spacing: 0.5px;
              color: #ffffff;
              border-top: 1px solid #1a3668;
              padding-top: 6px;
              margin-top: 2px;
            }
            .footer {
              margin-top: 26px;
              background: #0a1c3f;
              color: #a5b4fc;
              text-align: center;
              padding: 14px 20px;
              font-size: 11px;
              line-height: 1.6;
            }
            .footer strong { color: #f0c975; }

             @media print {
               * {
                 -webkit-print-color-adjust: exact !important;
                 print-color-adjust: exact !important;
               }
               aside,
               header,
               nav,
               .print\:hidden {
                 display: none !important;
               }
               main {
                 padding: 0 !important;
                 margin: 0 !important;
                 background: transparent !important;
                 overflow: visible !important;
                 display: block !important;
               }
               body, html {
                 background: #fff !important;
                 padding: 0 !important;
                 margin: 0 !important;
               }
               .sheet-container {
                 max-width: 100% !important;
                 margin: 0 !important;
                 padding: 0 !important;
                 width: 100% !important;
               }
               .invoice {
                 box-shadow: none !important;
                 border-radius: 0 !important;
                 border: none !important;
                 width: 100% !important;
               }
             }
          ` }} />

          <div className="invoice">
            {/* HEADER */}
            <div className="header">
              <div className="brand">
                <img src="/logo.png" alt="Niventra Logo" />
                <div className="brand-text">
                  <h1>Niventra Capital Advisory</h1>
                  <div className="sub">INDIA PRIVATE LIMITED</div>
                  <div className="tagline">INVEST TODAY, PROSPER TOMORROW</div>
                </div>
              </div>
              <div className="contact-block">
                <div>
                  <span className="icon">📞</span>
                  <span>011 4051 5660</span>
                </div>
                <div>
                  <span className="icon">✉️</span>
                  <span>info@niventracapitaladvisory.com</span>
                </div>
                <div>
                  <span className="icon">🌐</span>
                  <span>www.niventracapitaladvisory.com</span>
                </div>
              </div>
            </div>

            {/* TITLE BAR */}
            <div className="title-bar">
              <span>TAX INVOICE</span>
            </div>

            {/* BILL / META */}
            <div className="meta-section">
              <div className="bill-to">
                <div className="section-label">BILL TO</div>
                <div className="field-row">
                  <span className="label">Name</span>
                  <span className="line">{billToName}</span>
                </div>
                <div className="field-row">
                  <span className="label">Address</span>
                  <span className="line">{billToAddress}</span>
                </div>

                <div className="field-row">
                  <span className="label">State</span>
                  <span className="line">{billToState} &nbsp; (Code: {billToStateCode})</span>
                </div>
              </div>

              <div className="invoice-info">
                <div className="row">
                  <span className="k">Invoice No.</span>
                  <span className="v font-mono">{invoiceNo}</span>
                </div>
                <div className="row">
                  <span className="k">Invoice Date</span>
                  <span className="v">{invoiceDate}</span>
                </div>
                <div className="row">
                  <span className="k">Reverse Charge</span>
                  <span className="v">{reverseCharge}</span>
                </div>
                <div className="row">
                  <span className="k">State</span>
                  <span className="v">{state} &nbsp; ({stateCode})</span>
                </div>
              </div>

              <div className="barcode-block">
                <div className="barcode-title">Scan to Download</div>
                {typeof window !== "undefined" && (
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=${encodeURIComponent(
                      `${window.location.origin}/api/invoices/download?invoiceNo=${encodeURIComponent(invoiceNo)}`
                    )}`}
                    alt="QR Code Scan to Download"
                    width={80}
                    height={80}
                  />
                )}
                <div className="barcode-title">Barcode</div>
                <img
                  src={`https://bwipjs-api.metafloor.com/?bcid=code128&text=${encodeURIComponent(invoiceNo)}&scale=2&rotate=N`}
                  alt="Code 128 Barcode"
                  style={{ width: "120px", height: "30px", objectFit: "contain" }}
                />
              </div>
            </div>

            {/* TABLE */}
            <table className="items">
              <thead>
                <tr>
                  <th>S.No</th>
                  <th>Description of Services</th>
                  <th>SAC Code</th>
                  <th>Qty / Rate</th>
                  <th>Taxable Value</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => (
                  <tr key={item.id}>
                    <td>{index + 1}</td>
                    <td>
                      <div className="item-title">{item.title}</div>
                      <div className="item-desc">{item.desc}</div>
                    </td>
                    <td>{item.sacCode}</td>
                    <td>{item.qty} &times; ₹{item.rate.toLocaleString()}</td>
                    <td>₹{(item.qty * item.rate).toLocaleString()}</td>
                  </tr>
                ))}
                {/* Empty spacer row if items are few */}
                {items.length < 3 && (
                  <tr className="empty-row">
                    <td colSpan={5}></td>
                  </tr>
                )}
              </tbody>
            </table>

            {/* BOTTOM SECTION */}
            <div className="bottom-section">
              <div className="left-col">
                <div className="box">
                  <div className="box-title">Payment Mode & Transaction Details</div>
                  <div className="bank-details">
                    <div>
                      <span className="k">Mode of Payment</span>
                      <span className="v">{modeOfPayment === "Other" ? paymentModeOther : modeOfPayment}</span>
                    </div>
                    {bankNameForm && (
                      <div>
                        <span className="k">Bank Name</span>
                        <span className="v">{bankNameForm}</span>
                      </div>
                    )}
                    <div>
                      <span className="k">Transaction / UTR No.</span>
                      <span className="v font-mono">{transactionUtrNo}</span>
                    </div>
                    {chequeDdNo && (
                      <div>
                        <span className="k">Cheque / DD No.</span>
                        <span className="v font-mono">{chequeDdNo}</span>
                      </div>
                    )}
                    {chequeDdDate && (
                      <div>
                        <span className="k">Payment Date</span>
                        <span className="v">{chequeDdDate}</span>
                      </div>
                    )}
                    {drawnOnBank && (
                      <div>
                        <span className="k">Drawn On Bank</span>
                        <span className="v">{drawnOnBank}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="box">
                  <div className="box-title">Bank Transfer Details</div>
                  <div className="bank-details">
                    <div>
                      <span className="k">Bank Name</span>
                      <span className="v">Kotak Mahindra Bank.</span>
                    </div>
                    <div>
                      <span className="k">A/c Name</span>
                      <span className="v">Niventra Capital Advisory India Pvt Ltd</span>
                    </div>
                    <div>
                      <span className="k">A/C Number</span>
                      <span className="v font-mono">2151206126</span>
                    </div>
                    <div>
                      <span className="k">IFSC Code</span>
                      <span className="v font-mono">KKBK0000287</span>
                    </div>
                    <div>
                      <span className="k">Branch</span>
                      <span className="v">
                        SCO 16, Sector 14,Urban Estate
                        Gurgaon - 122001
                        Haryana Inidia
                      </span>
                    </div>
                  </div>
                </div>

                <div className="box">
                  <div className="box-title">Terms & Conditions</div>
                  <div className="terms">
                    <ul>
                      <li>Payment should be made within 15 days of invoice date.</li>
                      <li>Interest @ 16% p.a. will be charged for delayed payments.</li>
                      <li>All disputes are subject to New Delhi jurisdiction.</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="right-col">
                <div className="totals">
                  <div className="row">
                    <span className="k">Taxable Value</span>
                    <span className="v">₹{totals.totalTaxableValue.toLocaleString()}</span>
                  </div>
                  {totals.totalIgst > 0 && (
                    <div className="row">
                      <span className="k">IGST</span>
                      <span className="v">₹{totals.totalIgst.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="grand">
                    <span className="k">Grand Total</span>
                    <span className="v">₹{totals.grandTotal.toLocaleString()}</span>
                  </div>
                </div>

                <div className="amount-words">
                  Amount Chargeable (in Words): <br />
                  <strong>{totals.grandTotalWords}</strong>
                </div>

                <div className="sign-block">
                  <div className="for-text">For NIVENTRA CAPITAL ADVISORY INDIA PVT LTD</div>
                  <div className="auth">{authSignatory}</div>
                </div>
              </div>
            </div>

            {/* FOOTER */}
            <div className="footer">
              Thank you for your business! For any queries regarding this invoice, write to{" "}
              <strong>info@niventracapitaladvisory.com</strong>. <br />
              Registered Office: A-91, Block A, Gali No. 2, Sewak Park, Near Dwarka Mor Metro Station, Dwarka Mor, New Delhi &ndash; 110059, India.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
