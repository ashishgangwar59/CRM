"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DollarSign, Loader2, Plus, Trash2, Download, ShieldAlert, Pencil, X } from "lucide-react";

export default function VendorInvoicesPage() {
  const [invoices, setinvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [role, setRole] = useState<string | null>(null);
  const [roleLoading, setRoleLoading] = useState(true);
  const [editId, setEditId] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [form, setForm] = useState({
    title: "",
    invoiceNo: "",
    amount: "",
    date: new Date().toISOString().split("T")[0],
    paymentMode: "Cash",
    approvedBy: "",
    description: "",
  });

  useEffect(() => {
    fetch("/api/auth/me")
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setRole(data.role);
        }
      })
      .finally(() => setRoleLoading(false));
  }, []);

  const fetchinvoices = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/vendor-invoices");
      const json = await res.json();
      if (json.success) {
        setinvoices(json.data);
      }
    } catch (error) {
      console.error("Failed to fetch invoices:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (role === "ADMIN" || role === "KEY_ADMIN" || role === "Employee") {
      fetchinvoices();
    }
  }, [role]);

  const handleAddinvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setMsg(null);
    try {
      const res = await fetch("/api/vendor-invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (json.success) {
        setMsg({ type: "success", text: "invoice added successfully!" });
        setForm({
          title: "",
          invoiceNo: "",
          amount: "",
          date: new Date().toISOString().split("T")[0],
          paymentMode: "Cash",
          approvedBy: "",
          description: "",
        });
        fetchinvoices();
      } else {
        setMsg({ type: "error", text: json.error || "Failed to add invoice." });
      }
    } catch (err) {
      setMsg({ type: "error", text: "An error occurred." });
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditinvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editId) return;
    setSubmitting(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/vendor-invoices/${editId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (json.success) {
        setMsg({ type: "success", text: "invoice updated successfully!" });
        setEditId(null);
        setForm({
          title: "",
          invoiceNo: "",
          amount: "",
          date: new Date().toISOString().split("T")[0],
          paymentMode: "Cash",
          approvedBy: "",
          description: "",
        });
        fetchinvoices();
      } else {
        setMsg({ type: "error", text: json.error || "Failed to update invoice." });
      }
    } catch (err) {
      setMsg({ type: "error", text: "An error occurred." });
    } finally {
      setSubmitting(false);
    }
  };

  const startEdit = (exp: any) => {
    setEditId(exp._id);
    setForm({
      title: exp.title || "",
      invoiceNo: exp.invoiceNo || "",
      amount: String(exp.amount || ""),
      date: exp.date || new Date().toISOString().split("T")[0],
      paymentMode: exp.paymentMode || "Cash",
      approvedBy: exp.approvedBy || "",
      description: exp.description || "",
    });
    setMsg(null);
  };

  const cancelEdit = () => {
    setEditId(null);
    setForm({
      title: "",
      invoiceNo: "",
      amount: "",
      date: new Date().toISOString().split("T")[0],
      paymentMode: "Cash",
      approvedBy: "",
      description: "",
    });
    setMsg(null);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this invoice?")) return;
    try {
      const res = await fetch(`/api/vendor-invoices/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (json.success) {
        fetchinvoices();
      } else {
        alert(json.error || "Failed to delete invoice");
      }
    } catch (error) {
      console.error("Error deleting invoice:", error);
      alert("Error deleting invoice");
    }
  };

  const totalinvoices = invoices.reduce((sum, exp) => sum + (exp.amount || 0), 0);

  const exportToExcel = () => {
    if (invoices.length === 0) {
      alert("No data to export");
      return;
    }
    const headers = ["Date,Invoice No,Title,Payment Mode,Approved By,Description,Added By,Amount (RS)"];
    const rows = invoices.map(exp => {
      const dateStr = new Date(exp.date).toLocaleDateString("en-GB");
      const invoiceNo = `"${(exp.invoiceNo || "").replace(/"/g, '""')}"`;
      const title = `"${(exp.title || "").replace(/"/g, '""')}"`;
      const mode = `"${(exp.paymentMode || "").replace(/"/g, '""')}"`;
      const transferredBy = `"${(exp.approvedBy || "").replace(/"/g, '""')}"`;
      const desc = `"${(exp.description || "").replace(/"/g, '""')}"`;
      const addedBy = `"${exp.createdBy ? `${exp.createdBy.firstName} ${exp.createdBy.lastName}`.trim() : "Admin"}"`;
      const amount = exp.amount || 0;
      return `${dateStr},${invoiceNo},${title},${mode},${transferredBy},${desc},${addedBy},${amount}`;
    });

    const csvContent = headers.concat(rows).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Vendor_Invoices_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (roleLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-[#134086]" />
      </div>
    );
  }

  if (role !== "ADMIN" && role !== "KEY_ADMIN" && role !== "Employee") {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center gap-4">
        <ShieldAlert className="w-16 h-16 text-rose-500" />
        <h2 className="text-2xl font-bold text-zinc-800">Access Denied</h2>
        <p className="text-zinc-500">You do not have permission to access Vendor Invoice. Only Admin and Key Admin can view this page.</p>
      </div>
    );
  }

  return (
    <div className="pb-4 md:pb-8 pt-0 space-y-6 w-full h-full flex flex-col">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-zinc-900 flex items-center gap-2 dark:text-zinc-100">
            <DollarSign className="w-6 h-6 text-[#134086]" /> Vendor Invoice
          </h1>
          <p className="text-sm text-zinc-500 mt-1">Manage and track company miscellaneous cash invoices.</p>
        </div>
        <Button onClick={exportToExcel} className="bg-[#00a65a] hover:bg-[#008f4d] text-white shadow-md">
          <Download className="w-4 h-4 mr-2" /> Export to Excel
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1 space-y-6">
          <Card className="border-emerald-200 bg-emerald-50 shadow-sm overflow-hidden dark:bg-emerald-950/20 dark:border-emerald-900/30">
            <CardContent className="p-6">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-400">Total invoices (₹)</p>
                  <p className="text-3xl font-black text-emerald-950 mt-1 dark:text-emerald-300">
                    ₹{totalinvoices.toLocaleString()}
                  </p>
                </div>
                <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-400">
                  <DollarSign className="w-6 h-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="bg-zinc-50/50 border-b border-zinc-100 flex flex-row items-center justify-between">
              <CardTitle className="text-lg">{editId ? "Edit Vendor Invoice" : "Add New Vendor Invoice"}</CardTitle>
              {editId && (
                <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-500 hover:text-zinc-700" onClick={cancelEdit}>
                  <X className="w-4 h-4" />
                </Button>
              )}
            </CardHeader>
            <CardContent className="p-6">
              {msg && (
                <div className={`p-3 rounded text-sm font-medium mb-4 ${msg.type === "success" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
                  {msg.text}
                </div>
              )}
              <form onSubmit={editId ? handleEditinvoice : handleAddinvoice} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Title / Memo Name *</Label>
                    <Input required placeholder="e.g. Office Supplies" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Invoice No *</Label>
                    <Input required placeholder="e.g. INV-1024" value={form.invoiceNo} onChange={(e) => setForm({ ...form, invoiceNo: e.target.value })} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Amount (₹) *</Label>
                    <Input type="number" required min="0" placeholder="0" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Date *</Label>
                    <Input type="date" required value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Payment Mode</Label>
                    <select
                      className="flex h-10 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      value={form.paymentMode}
                      onChange={(e) => setForm({ ...form, paymentMode: e.target.value })}
                    >
                      <option value="Cash">Cash</option>
                      <option value="Online">Online</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label>Approved By</Label>
                    <Input placeholder="e.g. John Doe" value={form.approvedBy} onChange={(e) => setForm({ ...form, approvedBy: e.target.value })} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <textarea
                    className="flex w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-[80px]"
                    placeholder="Optional details..."
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                  />
                </div>
                <Button type="submit" className="w-full bg-[#134086] hover:bg-blue-800 text-white font-bold" disabled={submitting}>
                  {submitting ? "Saving..." : editId ? <>✏️ Update invoice</> : <><Plus className="w-4 h-4 mr-2" /> Save invoice</>}
                </Button>
                {editId && (
                  <Button type="button" variant="outline" className="w-full" onClick={cancelEdit}>
                    Cancel Edit
                  </Button>
                )}
              </form>
            </CardContent>
          </Card>
        </div>


        <div className="md:col-span-2">
          <Card>
            <CardHeader className="bg-zinc-50/50 border-b border-zinc-100">
              <CardTitle className="text-lg">Vendor Invoice List</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Invoice No</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Payment Info</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Added By</TableHead>
                    <TableHead className="text-right">Amount (₹)</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-10 text-zinc-500">
                        <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-600" />
                        Loading invoices...
                      </TableCell>
                    </TableRow>
                  ) : invoices.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-10 text-zinc-500">
                        No invoices recorded yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    invoices.map((exp) => (
                      <TableRow key={exp._id}>
                        <TableCell className="font-medium whitespace-nowrap">
                          {new Date(exp.date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                        </TableCell>
                        <TableCell className="font-mono text-xs text-zinc-600">{exp.invoiceNo}</TableCell>
                        <TableCell className="font-semibold text-zinc-900">{exp.title}</TableCell>
                        <TableCell>
                          <div className="text-xs font-semibold text-indigo-700 bg-indigo-50 px-2 py-1 rounded inline-block mb-1">{exp.paymentMode || "Cash"}</div>
                          {exp.approvedBy && <div className="text-xs text-zinc-500 flex items-center"><span className="text-zinc-400 mr-1">By:</span> {exp.approvedBy}</div>}
                        </TableCell>
                        <TableCell className="text-sm text-zinc-500 max-w-[200px] truncate" title={exp.description}>
                          {exp.description || "—"}
                        </TableCell>
                        <TableCell className="text-xs text-zinc-500">
                          {exp.createdBy ? `${exp.createdBy.firstName} ${exp.createdBy.lastName}`.trim() : "Admin"}
                        </TableCell>
                        <TableCell className="text-right font-bold text-rose-600">
                          ₹{exp.amount?.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            {(role === "ADMIN" || role === "KEY_ADMIN") && (
                              <Button variant="ghost" size="icon" className="cursor-pointer text-blue-500 hover:text-blue-700 hover:bg-blue-50 h-8 w-8" onClick={() => startEdit(exp)}>
                                <Pencil className="w-4 h-4" />
                              </Button>
                            )}
                            {(role === "ADMIN" || role === "KEY_ADMIN") && (
                              <Button variant="ghost" size="icon" className="cursor-pointer text-rose-500 hover:text-rose-700 hover:bg-rose-50 w-8 h-8 " onClick={() => handleDelete(exp._id)}>
                                <Trash2 className=" text-rose-500" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

