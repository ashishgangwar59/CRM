"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Award, Plus, Trash2, Edit, Badge } from "lucide-react";

export default function IncentiveManagementPage() {
  const [incentives, setIncentives] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState<any[]>([]);

  // Form State
  const [targetType, setTargetType] = useState("Employee");
  const [targetId, setTargetId] = useState("");
  const [designationName, setDesignationName] = useState("");
  const [incentiveType, setIncentiveType] = useState("Percentage");
  const [value, setValue] = useState("");
  const [effectiveDate, setEffectiveDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchIncentives();
    fetchEmployees();
  }, []);

  const fetchIncentives = async () => {
    try {
      const res = await fetch(`/api/incentives`);
      const data = await res.json();
      setIncentives(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const res = await fetch("/api/employees?limit=100000");
      const data = await res.json();
      if (data.success) {
        setEmployees(data.data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const payload = {
        targetType,
        targetId: targetType === "Employee" || targetType === "TeamOwner" ? targetId : undefined,
        designationName: targetType === "Designation" ? designationName : undefined,
        incentiveType,
        value: Number(value),
        effectiveDate
      };

      const res = await fetch("/api/incentives", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setIsDialogOpen(false);
        fetchIncentives();
      } else {
        const err = await res.json();
        alert("Error: " + err.error);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to remove this incentive rule?")) return;
    setIsSubmitting(true);
    try {
      await fetch(`/api/incentives/${id}`, { method: "DELETE" });
      fetchIncentives();
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-6 w-full space-y-6">
      {isSubmitting && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-white font-medium">Processing...</p>
        </div>
      )}
      <div className="flex justify-between items-center bg-gradient-to-r from-[#061d31] to-[#092b49] p-8 rounded-2xl shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <Award size={120} />
        </div>
        <div className="z-10 text-white">
          <h1 className="text-4xl font-bold mb-2">Incentive Management</h1>
          <p className="text-zinc-300">Configure hierarchical rules for personal and team incentives.</p>
        </div>

        <Button size="lg" onClick={() => setIsDialogOpen(true)} className="z-10 bg-[#bd922d] hover:bg-[#e2bd59] text-white font-bold shadow-xl shadow-[#bd922d]/20 transition-all hover:scale-105">
          <Plus className="mr-2 h-5 w-5" /> Add Incentive Rule
        </Button>
      </div>

      {isDialogOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex justify-center items-center backdrop-blur-sm">
          <div className="bg-white dark:bg-zinc-950 p-6 rounded-2xl shadow-2xl w-full max-w-lg relative border border-zinc-200 dark:border-zinc-800">
            <button onClick={() => setIsDialogOpen(false)} className="absolute top-4 right-4 text-zinc-500 hover:text-black dark:hover:text-white">✕</button>
            <h2 className="text-xl font-bold mb-4 dark:text-white">Configure New Incentive Rule</h2>

            <form onSubmit={handleSubmit} className="space-y-4 pt-2">
              <div className="space-y-2">
                <label className="text-sm font-semibold">Target Level</label>
                <select
                  className="w-full p-2.5 border rounded-lg dark:bg-zinc-900 dark:border-zinc-700 outline-none focus:ring-2 focus:ring-[#bd922d]"
                  value={targetType}
                  onChange={(e) => setTargetType(e.target.value)}
                >
                  <option value="Employee">Specific Employee</option>
                  <option value="TeamOwner">Team Owner</option>
                  <option value="Designation">By Designation</option>
                  <option value="Default">System Default</option>
                </select>
              </div>

              {(targetType === "Employee" || targetType === "TeamOwner") && (
                <div className="space-y-2">
                  <label className="text-sm font-semibold">Select Employee {targetType === "TeamOwner" && "(Optional - Leave empty for ALL Team Owners)"}</label>
                  <select
                    className="w-full p-2.5 border rounded-lg dark:bg-zinc-900 dark:border-zinc-700 outline-none focus:ring-2 focus:ring-[#bd922d]"
                    value={targetId}
                    onChange={(e) => setTargetId(e.target.value)}
                  >
                    <option value="">Select an Employee...</option>
                    {employees.map(emp => (
                      <option key={emp._id} value={emp._id}>{emp.firstName} {emp.lastName} ({emp.employeeCode})</option>
                    ))}
                  </select>
                </div>
              )}

              {targetType === "Designation" && (
                <div className="space-y-2">
                  <label className="text-sm font-semibold">Designation Title</label>
                  <Input
                    placeholder="e.g., Senior Executive"
                    value={designationName}
                    onChange={e => setDesignationName(e.target.value)}
                    required
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-semibold">Incentive Type</label>
                  <select
                    className="w-full p-2.5 border rounded-lg dark:bg-zinc-900 dark:border-zinc-700 outline-none focus:ring-2 focus:ring-[#bd922d]"
                    value={incentiveType}
                    onChange={(e) => setIncentiveType(e.target.value)}
                  >
                    <option value="Percentage">Percentage (%)</option>
                    <option value="Fixed">Fixed Amount (₹)</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold">Value</label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder={incentiveType === "Percentage" ? "1.5" : "5000"}
                    value={value}
                    onChange={e => setValue(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold">Effective Date</label>
                <Input
                  type="date"
                  value={effectiveDate}
                  onChange={e => setEffectiveDate(e.target.value)}
                  required
                />
              </div>

              <div className="pt-4 flex justify-end">
                <Button type="submit" className="bg-[#bd922d] hover:bg-[#e2bd59] text-white font-bold w-full">
                  Save Rule
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      <Card className="shadow-lg border-zinc-200 dark:border-zinc-800">
        <CardHeader>
          <CardTitle className="text-xl text-[#092b49] dark:text-zinc-100 flex items-center">
            Active Incentive Configuration Hierarchy
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-xl border dark:border-zinc-800 overflow-hidden">
            <Table>
              <TableHeader className="bg-zinc-50 dark:bg-zinc-900/50">
                <TableRow>
                  <TableHead className="font-bold">Target Level</TableHead>
                  <TableHead className="font-bold">Specific Entity</TableHead>
                  <TableHead className="font-bold">Incentive Applied</TableHead>
                  <TableHead className="font-bold">Effective Date</TableHead>
                  <TableHead className="font-bold">Status</TableHead>
                  <TableHead className="font-bold text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12">
                      <div className="flex items-center justify-center gap-3 text-zinc-500">
                        <div className="w-6 h-6 border-2 border-[#092b49] border-t-transparent rounded-full animate-spin"></div>
                        Loading Incentives...
                      </div>
                    </TableCell>
                  </TableRow>
                ) : incentives.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-10 text-zinc-500">No incentive rules configured yet.</TableCell></TableRow>
                ) : (
                  incentives.map((rule) => (
                    <TableRow key={rule._id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50">
                      <TableCell className="dark:text-zinc-100">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${rule.targetType === 'Employee' ? 'bg-[#092b49] text-white' : rule.targetType === 'TeamOwner' ? 'bg-[#bd922d] text-white' : 'bg-gray-200 text-gray-800 dark:bg-zinc-800 dark:text-zinc-200'}`}>
                          {rule.targetType}
                        </span>
                      </TableCell>
                      <TableCell className="font-medium dark:text-zinc-100">
                        {rule.targetType === "Employee" && rule.targetId
                          ? `${rule.targetId.firstName} ${rule.targetId.lastName} (${rule.targetId.employeeCode})`
                          : rule.targetType === "TeamOwner" && rule.targetId
                            ? `${rule.targetId.firstName} ${rule.targetId.lastName} (Owner Override)`
                            : rule.targetType === "Designation"
                              ? rule.designationName
                              : "All / Global Default"}
                      </TableCell>
                      <TableCell className="dark:text-zinc-100">
                        <div className="text-lg font-bold text-[#bd922d]">
                          {rule.incentiveType === "Percentage" ? `${rule.value}%` : `₹${rule.value.toLocaleString()}`}
                        </div>
                      </TableCell>
                      <TableCell className="dark:text-zinc-100">{new Date(rule.effectiveDate).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full border ${rule.isActive ? "border-green-500 text-green-500 bg-green-50 dark:bg-green-950/30" : "border-red-500 text-red-500 bg-red-50 dark:bg-red-950/30"}`}>
                          {rule.isActive ? "Active" : "Inactive"}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(rule._id)} className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
