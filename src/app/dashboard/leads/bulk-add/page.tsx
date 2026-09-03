"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Plus, Trash2, Save, Users } from "lucide-react";
import Link from "next/link";

export default function BulkAddLeadsPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  
  const [rows, setRows] = useState([
    { firstName: "", lastName: "", phone: "", email: "", company: "", source: "Website" }
  ]);

  const addRow = () => {
    setRows([...rows, { firstName: "", lastName: "", phone: "", email: "", company: "", source: "Website" }]);
  };

  const removeRow = (index: number) => {
    setRows(rows.filter((_, i) => i !== index));
  };

  const handleChange = (index: number, field: string, value: string) => {
    const updated = [...rows];
    updated[index] = { ...updated[index], [field]: value };
    setRows(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Filter out completely empty rows
    const validRows = rows.filter(r => r.firstName.trim() !== "");
    
    if (validRows.length === 0) {
      alert("Please enter at least one lead with a First Name.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validRows),
      });

      const data = await res.json();
      if (data.success) {
        alert(data.message || "Leads added successfully!");
        router.push("/dashboard/leads");
      } else {
        alert(data.error || "Failed to add leads");
      }
    } catch (err) {
      alert("Error adding leads");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 w-full pb-24 max-w-[1400px] mx-auto">
      <div className="flex items-center space-x-4">
        <Link href="/dashboard/leads">
          <Button variant="ghost" size="sm" className="text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-50">
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to Leads
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 flex items-center">
            <Users className="w-6 h-6 mr-2 text-indigo-600" />
            Bulk Add Leads
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Manually type multiple leads for rapid data entry.</p>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Lead Data Grid</CardTitle>
          <Button type="button" size="sm" onClick={addRow} className="bg-[#134086] text-white hover:bg-[#134086]/90 border-0">
            <Plus className="w-4 h-4 mr-1" /> Add Row
          </Button>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="overflow-x-auto border border-zinc-200 dark:border-zinc-800 rounded-lg">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-zinc-500 uppercase bg-zinc-50 dark:bg-zinc-900/50">
                  <tr>
                    <th className="px-4 py-3 font-semibold w-12 text-center">#</th>
                    <th className="px-4 py-3 font-semibold min-w-[150px]">First Name *</th>
                    <th className="px-4 py-3 font-semibold min-w-[150px]">Last Name</th>
                    <th className="px-4 py-3 font-semibold min-w-[150px]">Phone</th>
                    <th className="px-4 py-3 font-semibold min-w-[200px]">Email</th>
                    <th className="px-4 py-3 font-semibold min-w-[180px]">Company</th>
                    <th className="px-4 py-3 font-semibold min-w-[150px]">Source</th>
                    <th className="px-4 py-3 font-semibold w-16 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                  {rows.map((row, index) => (
                    <tr key={index} className="bg-white dark:bg-zinc-950 hover:bg-zinc-50 dark:hover:bg-zinc-900/50">
                      <td className="px-4 py-3 text-center text-zinc-500 font-mono">{index + 1}</td>
                      <td className="px-4 py-2">
                        <Input 
                          placeholder="First Name" 
                          required 
                          value={row.firstName} 
                          onChange={(e) => handleChange(index, "firstName", e.target.value)}
                          className="h-9"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <Input 
                          placeholder="Last Name" 
                          value={row.lastName} 
                          onChange={(e) => handleChange(index, "lastName", e.target.value)}
                          className="h-9"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <Input 
                          placeholder="Phone" 
                          value={row.phone} 
                          onChange={(e) => handleChange(index, "phone", e.target.value)}
                          className="h-9"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <Input 
                          type="email"
                          placeholder="Email" 
                          value={row.email} 
                          onChange={(e) => handleChange(index, "email", e.target.value)}
                          className="h-9"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <Input 
                          placeholder="Company" 
                          value={row.company} 
                          onChange={(e) => handleChange(index, "company", e.target.value)}
                          className="h-9"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <select
                          className="flex h-9 w-full rounded-md border border-zinc-200 bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-800 dark:focus-visible:ring-indigo-500"
                          value={row.source}
                          onChange={(e) => handleChange(index, "source", e.target.value)}
                        >
                          <option value="Website">Website</option>
                          <option value="Facebook">Facebook</option>
                          <option value="Google">Google</option>
                          <option value="Referral">Referral</option>
                          <option value="Walk In">Walk In</option>
                          <option value="Employee Reference">Employee Reference</option>
                        </select>
                      </td>
                      <td className="px-4 py-2 text-center">
                        <button 
                          type="button" 
                          onClick={() => removeRow(index)}
                          disabled={rows.length === 1}
                          className="text-rose-500 hover:text-rose-700 disabled:opacity-30 disabled:cursor-not-allowed p-1"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <div className="flex justify-end pt-4">
              <Button type="submit" disabled={submitting} className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-md">
                {submitting ? "Saving Leads..." : (
                  <>
                    <Save className="w-4 h-4 mr-2" /> Save All {rows.filter(r => r.firstName.trim()).length} Leads
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
