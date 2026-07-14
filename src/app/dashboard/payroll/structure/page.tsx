"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { IndianRupee } from "lucide-react";

export default function SalaryStructurePage() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [structures, setStructures] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEmp, setSelectedEmp] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    basic: 0,
    hra: 0,
    specialAllowance: 0,
    pf: 0,
    esi: 0,
    professionalTax: 0,
    incomeTax: 0,
  });

  const fetchData = async () => {
    try {
      const [empRes, structRes] = await Promise.all([
        fetch("/api/employees"),
        fetch("/api/payroll/structure")
      ]);
      const empData = await empRes.json();
      const structData = await structRes.json();
      
      if (empData.success) setEmployees(empData.data);
      if (structData.success) setStructures(structData.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSelect = (empId: string) => {
    setSelectedEmp(empId);
    const existing = structures.find(s => s.employeeId._id === empId);
    if (existing) {
      setFormData({
        basic: existing.basic,
        hra: existing.hra,
        specialAllowance: existing.specialAllowance,
        pf: existing.pf,
        esi: existing.esi,
        professionalTax: existing.professionalTax,
        incomeTax: existing.incomeTax,
      });
    } else {
      setFormData({ basic: 0, hra: 0, specialAllowance: 0, pf: 0, esi: 0, professionalTax: 0, incomeTax: 0 });
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/payroll/structure", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeId: selectedEmp, ...formData })
      });
      const data = await res.json();
      if (data.success) {
        alert("Salary Structure Saved!");
        setSelectedEmp(null);
        fetchData();
      } else {
        alert(data.error);
      }
    } catch (e) {
      alert("Error saving structure");
    }
  };

  if (loading) return <div className="p-8">Loading...</div>;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Salary Structures</h1>
        <p className="text-zinc-500 dark:text-zinc-400">Configure fixed earnings and deductions for employees.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-1 h-[600px] overflow-y-auto">
          <CardHeader>
            <CardTitle>Employees</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {employees.map(emp => {
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
                      <Input type="number" required value={formData.basic} onChange={e => setFormData({...formData, basic: Number(e.target.value)})} />
                    </div>
                    <div className="space-y-2">
                      <Label>HRA (₹)</Label>
                      <Input type="number" required value={formData.hra} onChange={e => setFormData({...formData, hra: Number(e.target.value)})} />
                    </div>
                    <div className="space-y-2">
                      <Label>Special Allowance (₹)</Label>
                      <Input type="number" required value={formData.specialAllowance} onChange={e => setFormData({...formData, specialAllowance: Number(e.target.value)})} />
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-4 text-rose-700">Fixed Deductions</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>PF Amount (₹)</Label>
                      <Input type="number" required value={formData.pf} onChange={e => setFormData({...formData, pf: Number(e.target.value)})} />
                    </div>
                    <div className="space-y-2">
                      <Label>ESI Amount (₹)</Label>
                      <Input type="number" required value={formData.esi} onChange={e => setFormData({...formData, esi: Number(e.target.value)})} />
                    </div>
                    <div className="space-y-2">
                      <Label>Professional Tax (₹)</Label>
                      <Input type="number" required value={formData.professionalTax} onChange={e => setFormData({...formData, professionalTax: Number(e.target.value)})} />
                    </div>
                    <div className="space-y-2">
                      <Label>Income Tax / TDS (₹)</Label>
                      <Input type="number" required value={formData.incomeTax} onChange={e => setFormData({...formData, incomeTax: Number(e.target.value)})} />
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800">
                  <div className="flex justify-between items-center bg-zinc-50 dark:bg-zinc-900 p-4 rounded-lg">
                    <span className="font-semibold text-lg">Gross Monthly Salary</span>
                    <span className="font-bold text-2xl flex items-center">
                      <IndianRupee className="mr-1 h-6 w-6" />
                      {formData.basic + formData.hra + formData.specialAllowance}
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
