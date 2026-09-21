"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileText, Loader2, Plus, Trash2, Download, ShieldAlert, Pencil, X, Mail } from "lucide-react";

export default function LetterRegisterPage() {
  const [letters, setLetters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [role, setRole] = useState<string | null>(null);
  const [roleLoading, setRoleLoading] = useState(true);
  
  const [activeTab, setActiveTab] = useState<"INWARD" | "OUTWARD">("INWARD");
  const [editId, setEditId] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const initialForm = {
    serialNo: "",
    date: new Date().toISOString().split("T")[0],
    letterNo: "",
    letterDate: "",
    partyName: "",
    subject: "",
    mode: "Hand",
    handledBy: "",
    time: "",
    remarks: "",
  };

  const [form, setForm] = useState(initialForm);

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

  const fetchLetters = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/letters?type=${activeTab}`);
      const json = await res.json();
      if (json.success) {
        setLetters(json.data);
      }
    } catch (error) {
      console.error("Failed to fetch letters:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (role === "ADMIN" || role === "KEY_ADMIN" || role === "Employee") {
      fetchLetters();
      setEditId(null);
      setForm(initialForm);
      setMsg(null);
    }
  }, [role, activeTab]);

  const handleAddLetter = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setMsg(null);
    try {
      const res = await fetch("/api/letters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, type: activeTab }),
      });
      const json = await res.json();
      if (json.success) {
        setMsg({ type: "success", text: "Letter entry added successfully!" });
        setForm(initialForm);
        fetchLetters();
      } else {
        setMsg({ type: "error", text: json.error || "Failed to add entry." });
      }
    } catch (err) {
      setMsg({ type: "error", text: "An error occurred." });
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditLetter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editId) return;
    setSubmitting(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/letters/${editId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (json.success) {
        setMsg({ type: "success", text: "Letter entry updated successfully!" });
        setEditId(null);
        setForm(initialForm);
        fetchLetters();
      } else {
        setMsg({ type: "error", text: json.error || "Failed to update entry." });
      }
    } catch (err) {
      setMsg({ type: "error", text: "An error occurred." });
    } finally {
      setSubmitting(false);
    }
  };

  const startEdit = (letter: any) => {
    setEditId(letter._id);
    setForm({
      serialNo: letter.serialNo || "",
      date: letter.date ? new Date(letter.date).toISOString().split("T")[0] : "",
      letterNo: letter.letterNo || "",
      letterDate: letter.letterDate ? new Date(letter.letterDate).toISOString().split("T")[0] : "",
      partyName: letter.partyName || "",
      subject: letter.subject || "",
      mode: letter.mode || "Hand",
      handledBy: letter.handledBy || "",
      time: letter.time || "",
      remarks: letter.remarks || "",
    });
    setMsg(null);
  };

  const cancelEdit = () => {
    setEditId(null);
    setForm(initialForm);
    setMsg(null);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this entry?")) return;
    try {
      const res = await fetch(`/api/letters/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (json.success) {
        fetchLetters();
      } else {
        alert(json.error || "Failed to delete entry");
      }
    } catch (error) {
      console.error("Error deleting entry:", error);
      alert("Error deleting entry");
    }
  };

  const exportToExcel = () => {
    if (letters.length === 0) {
      alert("No data to export");
      return;
    }
    const headers = activeTab === "INWARD"
      ? ["Serial No,Received Date,Letter No,Letter Date,Received From,Subject,Mode,Received By,Time,Remarks"]
      : ["Serial No,Dispatch Date,Letter No,Letter Date,Sent To,Subject,Dispatch Mode,Sent By,Time,Remarks"];

    const rows = letters.map(item => {
      const sNo = `"${(item.serialNo || "").replace(/"/g, '""')}"`;
      const dt = item.date ? new Date(item.date).toLocaleDateString("en-GB") : "";
      const lNo = `"${(item.letterNo || "").replace(/"/g, '""')}"`;
      const lDt = item.letterDate ? new Date(item.letterDate).toLocaleDateString("en-GB") : "";
      const party = `"${(item.partyName || "").replace(/"/g, '""')}"`;
      const subj = `"${(item.subject || "").replace(/"/g, '""')}"`;
      const mode = `"${(item.mode || "").replace(/"/g, '""')}"`;
      const handled = `"${(item.handledBy || "").replace(/"/g, '""')}"`;
      const time = `"${(item.time || "").replace(/"/g, '""')}"`;
      const rem = `"${(item.remarks || "").replace(/"/g, '""')}"`;
      return `${sNo},${dt},${lNo},${lDt},${party},${subj},${mode},${handled},${time},${rem}`;
    });

    const csvContent = headers.concat(rows).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Letter_Register_${activeTab}_${new Date().toISOString().split("T")[0]}.csv`);
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
        <p className="text-zinc-500">You do not have permission to access Letter Register.</p>
      </div>
    );
  }

  return (
    <div className="pb-4 md:pb-8 pt-0 space-y-6 w-full h-full flex flex-col">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-zinc-900 flex items-center gap-2 dark:text-zinc-100">
            <Mail className="w-6 h-6 text-[#134086]" /> Letter Register
          </h1>
          <p className="text-sm text-zinc-500 mt-1">Manage Inward and Outward Letters</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-zinc-100 p-1 rounded-md border border-zinc-200">
            <button
              className={`px-4 py-1.5 text-sm font-semibold rounded-md transition-colors ${activeTab === "INWARD" ? "bg-white text-indigo-700 shadow-sm" : "text-zinc-500 hover:text-zinc-700"}`}
              onClick={() => setActiveTab("INWARD")}
            >
              INWARD
            </button>
            <button
              className={`px-4 py-1.5 text-sm font-semibold rounded-md transition-colors ${activeTab === "OUTWARD" ? "bg-white text-indigo-700 shadow-sm" : "text-zinc-500 hover:text-zinc-700"}`}
              onClick={() => setActiveTab("OUTWARD")}
            >
              OUTWARD
            </button>
          </div>
          <Button onClick={exportToExcel} className="bg-[#00a65a] hover:bg-[#008f4d] text-white shadow-md">
            <Download className="w-4 h-4 mr-2" /> Export to Excel
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <CardHeader className="bg-zinc-50/50 border-b border-zinc-100 flex flex-row items-center justify-between">
              <CardTitle className="text-lg">{editId ? `Edit ${activeTab} Letter` : `Add ${activeTab} Letter`}</CardTitle>
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
              <form onSubmit={editId ? handleEditLetter : handleAddLetter} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Serial No. *</Label>
                    <Input required placeholder="e.g. 001" value={form.serialNo} onChange={(e) => setForm({ ...form, serialNo: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>{activeTab === "INWARD" ? "Received Date" : "Dispatch Date"} *</Label>
                    <Input type="date" required value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Letter No.</Label>
                    <Input placeholder="Letter No" value={form.letterNo} onChange={(e) => setForm({ ...form, letterNo: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Letter Date</Label>
                    <Input type="date" value={form.letterDate} onChange={(e) => setForm({ ...form, letterDate: e.target.value })} />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>{activeTab === "INWARD" ? "Received From" : "Sent To"} *</Label>
                  <Input required placeholder={activeTab === "INWARD" ? "Sender Name" : "Recipient Name"} value={form.partyName} onChange={(e) => setForm({ ...form, partyName: e.target.value })} />
                </div>

                <div className="space-y-2">
                  <Label>Subject / Purpose *</Label>
                  <Input required placeholder="Subject..." value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Mode</Label>
                    <select
                      className="flex h-10 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      value={form.mode}
                      onChange={(e) => setForm({ ...form, mode: e.target.value })}
                    >
                      <option value="Hand">Hand</option>
                      <option value="Courier">Courier</option>
                      <option value="Post">Post</option>
                      <option value="Email">Email</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label>{activeTab === "INWARD" ? "Received By" : "Sent By"} *</Label>
                    <Input required placeholder="Name" value={form.handledBy} onChange={(e) => setForm({ ...form, handledBy: e.target.value })} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Time</Label>
                    <Input type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Remarks</Label>
                  <Input placeholder="Optional remarks..." value={form.remarks} onChange={(e) => setForm({ ...form, remarks: e.target.value })} />
                </div>
                
                <Button type="submit" className="w-full bg-[#134086] hover:bg-blue-800 text-white font-bold" disabled={submitting}>
                  {submitting ? "Saving..." : editId ? <>✏️ Update Entry</> : <><Plus className="w-4 h-4 mr-2" /> Save Entry</>}
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

        <div className="lg:col-span-3">
            <Card>
              <CardHeader className="bg-zinc-50/50 border-b border-zinc-100">
                <CardTitle className="text-lg">{activeTab} Register</CardTitle>
              </CardHeader>
              <CardContent className="p-0 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>S.No</TableHead>
                      <TableHead>{activeTab === "INWARD" ? "Received Date" : "Dispatch Date"}</TableHead>
                      <TableHead>Letter No/Date</TableHead>
                      <TableHead>{activeTab === "INWARD" ? "Received From" : "Sent To"}</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead>Mode</TableHead>
                      <TableHead>{activeTab === "INWARD" ? "Received By" : "Sent By"}</TableHead>
                      <TableHead>Time</TableHead>
                      <TableHead>Remarks</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={10} className="text-center py-10 text-zinc-500">
                          <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-600" />
                          Loading...
                        </TableCell>
                      </TableRow>
                    ) : letters.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={10} className="text-center py-10 text-zinc-500">
                          No letters recorded yet.
                        </TableCell>
                      </TableRow>
                    ) : (
                      letters.map((item) => (
                        <TableRow key={item._id}>
                          <TableCell className="font-semibold">{item.serialNo}</TableCell>
                          <TableCell className="whitespace-nowrap">
                            {new Date(item.date).toLocaleDateString("en-GB")}
                          </TableCell>
                          <TableCell>
                            <div className="text-sm font-medium">{item.letterNo || "—"}</div>
                            {item.letterDate && <div className="text-xs text-zinc-500">{new Date(item.letterDate).toLocaleDateString("en-GB")}</div>}
                          </TableCell>
                          <TableCell className="font-medium text-zinc-900 max-w-[150px] truncate" title={item.partyName}>{item.partyName}</TableCell>
                          <TableCell className="text-sm text-zinc-600 max-w-[150px] truncate" title={item.subject}>{item.subject}</TableCell>
                          <TableCell><span className="text-xs font-semibold bg-zinc-100 px-2 py-1 rounded">{item.mode || "Hand"}</span></TableCell>
                          <TableCell className="text-sm">{item.handledBy}</TableCell>
                          <TableCell className="text-sm text-zinc-500">{item.time || "—"}</TableCell>
                          <TableCell className="text-sm text-zinc-500 max-w-[120px] truncate" title={item.remarks}>{item.remarks || "—"}</TableCell>
                          
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button variant="ghost" size="icon" className="text-blue-500 hover:text-blue-700 hover:bg-blue-50 h-8 w-8" onClick={() => startEdit(item)}>
                                <Pencil className="w-4 h-4" />
                              </Button>
                              {(role === "ADMIN" || role === "KEY_ADMIN") && (
                                <Button variant="ghost" size="icon" className="text-rose-500 hover:text-rose-700 hover:bg-rose-50 h-8 w-8" onClick={() => handleDelete(item._id)}>
                                  <Trash2 className="w-4 h-4" />
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
