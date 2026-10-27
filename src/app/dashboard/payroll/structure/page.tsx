"use client";

import { useEffect, useRef, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Download, IndianRupee, Loader2, Upload } from "lucide-react";
import Link from "next/link";

export default function SalaryStructurePage() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [structures, setStructures] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedEmp, setSelectedEmp] = useState<string | null>(null);
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [monthYear, setMonthYear] = useState(new Date().toISOString().slice(0, 7));

  const [formData, setFormData] = useState({
    basic: 0,
    hra: 0,
    travelAllowance: 0,
    incentive: 0,
    teamIncentive: 0,
    fullBranchIncentive: 0,
    pf: 0,
    esi: 0,
    professionalTax: 0,
    incomeTax: 0,
    advanceSalaryDrawn: 0,
    remarks: "",
  });

  const fetchEmployees = async () => {
    try {
      const empRes = await fetch("/api/employees?slim=true&status=Active", { cache: 'no-store' });
      const empData = await empRes.json();
      if (empData.success) setEmployees(empData.data);
    } catch (e) {
      console.error("Failed to load employees:", e);
    }
  };

  const fetchStructures = async () => {
    try {
      const structRes = await fetch(`/api/payroll/structure?monthYear=${monthYear}`, { cache: 'no-store' });
      const structData = await structRes.json();
      if (structData.success) setStructures(structData.data);
    } catch (e) {
      console.error("Failed to load salary structures:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Load the employee directory independently of the selected month. This
    // keeps newly added employees visible when viewing an older month.
    fetchEmployees();
  }, []);

  useEffect(() => {
    fetchStructures();
  }, [monthYear]);

  const handleSelect = (empId: string) => {
    setSelectedEmp(empId);
    const existing = structures.find(s => s.employeeId?._id === empId || s.employeeId === empId);
    if (existing) {
      setFormData({
        basic: existing.basic || 0,
        hra: existing.hra || 0,
        travelAllowance: existing.travelAllowance ?? existing.metroAllowance ?? existing.specialAllowance ?? 0,
        incentive: existing.incentive || 0,
        teamIncentive: existing.teamIncentive || 0,
        fullBranchIncentive: existing.fullBranchIncentive || 0,
        pf: existing.pf || 0,
        esi: existing.esi || 0,
        professionalTax: existing.professionalTax || 0,
        incomeTax: existing.incomeTax || 0,
        advanceSalaryDrawn: existing.advanceSalaryDrawn || 0,
        remarks: existing.remarks || "",
      });
    } else {
      setFormData({ basic: 0, hra: 0, travelAllowance: 0, incentive: 0, teamIncentive: 0, fullBranchIncentive: 0, pf: 0, esi: 0, professionalTax: 0, incomeTax: 0, advanceSalaryDrawn: 0, remarks: "" });
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/payroll/structure", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId: selectedEmp,
          monthYear,
          ...formData,
          metroAllowance: formData.travelAllowance,
          specialAllowance: formData.travelAllowance // sync back for backward compatibility
        })
      });
      const data = await res.json();
      if (data.success) {
        alert("Salary Structure Saved!");
        setSelectedEmp(null);
        fetchStructures();
      } else {
        alert(data.error);
      }
    } catch (e) {
      alert("Error saving structure");
    }
  };

  const handleBulkImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!window.confirm(`Import salary structures for ${monthYear}? This will update every employee row in the Excel file.`)) {
      event.target.value = "";
      return;
    }

    setImporting(true);
    try {
      const formData = new FormData();
      formData.append("monthYear", monthYear);
      formData.append("file", file);
      const response = await fetch("/api/payroll/structure/bulk", {
        method: "POST",
        body: formData,
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        const details = Array.isArray(result.errors) ? `\n${result.errors.join("\n")}` : "";
        const serverDetails = typeof result.details === "string" ? `\nDetails: ${result.details}` : "";
        alert(`${result.error || "Salary structure import failed."}${details}${serverDetails}`);
        return;
      }

      const failures = result.payrollRefreshFailures?.length
        ? `\nPayroll refresh failed for: ${result.payrollRefreshFailures.join(", ")}`
        : "";
      alert(
        `Imported salary structures for ${result.imported} employees. ` +
        `Draft payrolls refreshed: ${result.refreshedPayrolls}.` +
        `${failures}`
      );
      setSelectedEmp(null);
      await fetchStructures();
    } catch (error) {
      console.error("Bulk salary structure import failed:", error);
      alert("Error importing salary structures. Please try again.");
    } finally {
      setImporting(false);
      event.target.value = "";
    }
  };

  if (loading) return <div className="p-8">Loading...</div>;

  const selectedEmployeeObj = employees.find(e => e._id === selectedEmp);
  const isBranchHead = selectedEmployeeObj?.designation?.toLowerCase().includes("branch head");
  const filteredEmployees = employees.filter((employee) =>
    `${employee.firstName || ""} ${employee.lastName || ""} ${employee.employeeCode || ""}`
      .toLowerCase()
      .includes(employeeSearch.trim().toLowerCase())
  );

  return (
    <div className="space-y-6 w-full pb-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <Link href="/dashboard/payroll">
            <Button variant="ghost" className="mb-2 -ml-3 text-zinc-600 hover:text-zinc-900">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to Payroll
            </Button>
          </Link>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Salary Structures</h1>
          <p className="text-zinc-500 dark:text-zinc-400">Configure fixed earnings and deductions for employees per month.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Label className="text-sm text-zinc-500">Month:</Label>
          <Input 
            type="month" 
            className="w-48 bg-white border-zinc-300 font-medium" 
            value={monthYear}
            onChange={(e) => {
              setMonthYear(e.target.value);
              setSelectedEmp(null); // Reset selection when changing month
            }}
          />
          <Button
            type="button"
            variant="outline"
            disabled={importing}
            onClick={() => { window.location.href = `/api/payroll/structure/bulk?monthYear=${monthYear}`; }}
          >
            <Download className="mr-2 h-4 w-4" />
            Export Excel
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={handleBulkImport}
          />
          <Button
            type="button"
            variant="outline"
            disabled={importing}
            onClick={() => fileInputRef.current?.click()}
          >
            {importing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
            {importing ? "Importing..." : "Import Excel"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-1 h-[600px] overflow-y-auto">
          <CardHeader>
            <CardTitle>Employees</CardTitle>
            <Input
              placeholder="Search employee name or code..."
              value={employeeSearch}
              onChange={(e) => setEmployeeSearch(e.target.value)}
              className="mt-2"
            />
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {filteredEmployees.map(emp => {
                const hasStruct = structures.some(s => s.employeeId?._id === emp._id || s.employeeId === emp._id);
                return (
                  <div
                    key={emp._id}
                    className={`p-4 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-900 ${selectedEmp === emp._id ? 'bg-zinc-100 dark:bg-zinc-800' : ''}`}
                    onClick={() => handleSelect(emp._id)}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-medium">{emp.firstName} {emp.lastName}</p>
                        <p className="text-xs text-zinc-500">{emp.employeeCode}</p>
                      </div>
                      <div className={`h-2 w-2 rounded-full ${hasStruct ? 'bg-emerald-500' : 'bg-rose-500'}`} title={hasStruct ? 'Configured' : 'Not Configured'} />
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {selectedEmp ? (
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Configure Salary Structure</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSave} className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-4 text-emerald-700">Earnings</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Basic Salary (₹)</Label>
                      <Input type="number" required value={formData.basic} onChange={e => setFormData({ ...formData, basic: Number(e.target.value) })} />
                    </div>
                    <div className="space-y-2">
                      <Label>HRA (₹)</Label>
                      <Input type="number" required value={formData.hra} onChange={e => setFormData({ ...formData, hra: Number(e.target.value) })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Travel Allowance (₹)</Label>
                      <Input type="number" required value={formData.travelAllowance} onChange={e => setFormData({ ...formData, travelAllowance: Number(e.target.value) })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Personal Performance Incentive (₹)</Label>
                      <Input type="number" required value={formData.incentive} onChange={e => setFormData({ ...formData, incentive: Number(e.target.value) })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Team Performance Incentive (₹)</Label>
                      <Input type="number" required value={formData.teamIncentive} onChange={e => setFormData({ ...formData, teamIncentive: Number(e.target.value) })} />
                    </div>

                    <div className="space-y-2">
                      <Label>Branch Performance (Fixed) (₹)</Label>
                      <Input type="number" required value={formData.fullBranchIncentive} onChange={e => setFormData({ ...formData, fullBranchIncentive: Number(e.target.value) })} />
                    </div>
                  </div>
                  <div className="space-y-2 mt-4">
                    <Label>Remarks (optional)</Label>
                    <Input value={formData.remarks} onChange={e => setFormData({ ...formData, remarks: e.target.value })} placeholder="Add a note for this salary structure" />
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-4 text-rose-700">Fixed Deductions</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>PF Amount (₹)</Label>
                      <Input type="number" value={formData.pf || ""} onChange={e => setFormData({ ...formData, pf: Number(e.target.value) })} />
                    </div>
                    <div className="space-y-2">
                      <Label>ESI Amount (₹)</Label>
                      <Input type="number" required value={formData.esi} onChange={e => setFormData({ ...formData, esi: Number(e.target.value) })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Professional Tax (₹)</Label>
                      <Input type="number" required value={formData.professionalTax} onChange={e => setFormData({ ...formData, professionalTax: Number(e.target.value) })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Income Tax / TDS (₹)</Label>
                      <Input type="number" required value={formData.incomeTax} onChange={e => setFormData({ ...formData, incomeTax: Number(e.target.value) })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Advance Salary Drawn (₹)</Label>
                      <Input type="number" required value={formData.advanceSalaryDrawn} onChange={e => setFormData({ ...formData, advanceSalaryDrawn: Number(e.target.value) })} />
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800">
                  <div className="flex justify-between items-center bg-zinc-50 dark:bg-zinc-900 p-4 rounded-lg">
                    <span className="font-semibold text-lg">Gross Monthly Salary</span>
                    <span className="font-bold text-2xl flex items-center">
                      <IndianRupee className="mr-1 h-6 w-6" />
                      {formData.basic + formData.hra + formData.travelAllowance + formData.incentive + (isBranchHead ? formData.fullBranchIncentive : formData.teamIncentive)}
                    </span>
                  </div>
                </div>

                <div className="flex justify-end space-x-2">
                  <Button variant="outline" type="button" onClick={() => setSelectedEmp(null)}>Cancel</Button>
                  <Button type="submit">Save Structure</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        ) : (
          <div className="md:col-span-2 flex items-center justify-center text-zinc-500 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl">
            Select an employee to configure their salary structure.
          </div>
        )}
      </div>
    </div>
  );
}
