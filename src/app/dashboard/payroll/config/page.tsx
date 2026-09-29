"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Settings, Percent, Calculator, BookOpen } from "lucide-react";

export default function PayrollConfigPage() {
  const [taxConfig, setTaxConfig] = useState<any>(null);
  const [pfConfig, setPfConfig] = useState<any>(null);
  const [deductions, setDeductions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // States for new PF
  const [pfEmployeePct, setPfEmployeePct] = useState("12");
  const [pfEmployerPct, setPfEmployerPct] = useState("12");
  const [pfCeiling, setPfCeiling] = useState("15000");

  // States for Tax Config Modal
  const [isTaxModalOpen, setIsTaxModalOpen] = useState(false);
  const [taxFormData, setTaxFormData] = useState<any>({
    regimeName: "Default Tax Regime",
    thresholdAmount: 300000,
    effectiveDate: new Date().toISOString().split("T")[0],
    slabs: [{ minAmount: 0, maxAmount: 300000, percentage: 0 }]
  });

  useEffect(() => {
    fetchConfigs();
  }, []);

  const fetchConfigs = async () => {
    try {
      const [taxRes, pfRes, dedRes] = await Promise.all([
        fetch("/api/payroll/config/tax").then(r => r.json()),
        fetch("/api/payroll/config/pf").then(r => r.json()),
        fetch("/api/payroll/config/deduction").then(r => r.json())
      ]);
      if (taxRes.success) {
        setTaxConfig(taxRes.data);
      }
      if (pfRes.success) {
        setPfConfig(pfRes.data);
        if (pfRes.data) {
          setPfEmployeePct(pfRes.data.employeePercentage.toString());
          setPfEmployerPct(pfRes.data.employerPercentage.toString());
          setPfCeiling(pfRes.data.ceilingAmount?.toString() || "");
        }
      }
      if (dedRes.success) setDeductions(dedRes.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const savePfConfig = async () => {
    try {
      const payload = {
        employeePercentage: Number(pfEmployeePct),
        employerPercentage: Number(pfEmployerPct),
        calculationBasis: "Basic",
        isCapped: Number(pfCeiling) > 0,
        ceilingAmount: Number(pfCeiling) || undefined,
        effectiveDate: new Date().toISOString().split("T")[0]
      };
      
      const res = await fetch("/api/payroll/config/pf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        alert("PF Configuration updated successfully!");
        fetchConfigs();
      }
    } catch (e) {
      alert("Error saving PF Config.");
    }
  };

  const openTaxModal = () => {
    if (taxConfig) {
      setTaxFormData({
        regimeName: taxConfig.regimeName || "Default Tax Regime",
        thresholdAmount: taxConfig.thresholdAmount || 0,
        effectiveDate: taxConfig.effectiveDate ? new Date(taxConfig.effectiveDate).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
        slabs: taxConfig.slabs && taxConfig.slabs.length > 0 ? [...taxConfig.slabs] : [{ minAmount: 0, maxAmount: null, percentage: 0 }]
      });
    } else {
      setTaxFormData({
        regimeName: "Default Tax Regime",
        thresholdAmount: 300000,
        effectiveDate: new Date().toISOString().split("T")[0],
        slabs: [{ minAmount: 0, maxAmount: null, percentage: 0 }]
      });
    }
    setIsTaxModalOpen(true);
  };

  const saveTaxConfig = async () => {
    try {
      // Cleanup maxAmount for 'null' strings or empty values
      const payload = {
        ...taxFormData,
        slabs: taxFormData.slabs.map((s: any) => ({
          minAmount: Number(s.minAmount),
          maxAmount: s.maxAmount && s.maxAmount !== "" ? Number(s.maxAmount) : null,
          percentage: Number(s.percentage)
        }))
      };

      const res = await fetch("/api/payroll/config/tax", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        alert("Tax Configuration updated successfully!");
        setIsTaxModalOpen(false);
        fetchConfigs();
      } else {
        const errorData = await res.json();
        alert("Error saving Tax Config: " + (errorData.error || "Unknown error"));
      }
    } catch (e) {
      alert("Error saving Tax Config.");
    }
  };

  return (
    <div className="p-6 w-full space-y-6">
      <div className="flex justify-between items-center bg-gradient-to-r from-emerald-800 to-emerald-950 p-8 rounded-2xl shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <Settings size={120} />
        </div>
        <div className="z-10 text-white">
          <h1 className="text-4xl font-bold mb-2">Payroll Configurations</h1>
          <p className="text-emerald-100">Manage Tax Slabs, PF rules, and Custom Deductions for the Automated Engine.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* PF Config */}
        <Card className="shadow-lg border-zinc-200 dark:border-zinc-800">
          <CardHeader className="bg-zinc-50 dark:bg-zinc-900/50 border-b">
            <CardTitle className="text-xl flex items-center">
              <Percent className="mr-2 text-emerald-600" /> Provident Fund (PF) Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold">Employee Contribution (%)</label>
                <Input type="number" value={pfEmployeePct} onChange={e => setPfEmployeePct(e.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold">Employer Contribution (%)</label>
                <Input type="number" value={pfEmployerPct} onChange={e => setPfEmployerPct(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold">PF Wage Ceiling Amount (₹)</label>
              <Input type="number" value={pfCeiling} onChange={e => setPfCeiling(e.target.value)} placeholder="e.g. 15000" />
              <p className="text-xs text-zinc-500">Contributions will be capped at this Basic salary limit.</p>
            </div>
            <Button onClick={savePfConfig} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold">
              Save PF Configuration
            </Button>
          </CardContent>
        </Card>

        {/* Tax Config */}
        <Card className="shadow-lg border-zinc-200 dark:border-zinc-800 relative">
          <CardHeader className="bg-zinc-50 dark:bg-zinc-900/50 border-b flex flex-row items-center justify-between">
            <CardTitle className="text-xl flex items-center">
              <Calculator className="mr-2 text-blue-600" /> Tax Slabs (TDS)
            </CardTitle>
            <Button variant="outline" size="sm" onClick={openTaxModal}>
              {taxConfig ? "Edit Slabs" : "Add Slabs"}
            </Button>
          </CardHeader>
          <CardContent className="pt-6">
            {taxConfig ? (
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900">
                  <p className="font-semibold text-blue-900 dark:text-blue-100">Active Regime: {taxConfig.regimeName}</p>
                  <p className="text-sm text-blue-700 dark:text-blue-300">Minimum Taxable Income Threshold: ₹{taxConfig.thresholdAmount.toLocaleString()}</p>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Income Range (₹)</TableHead>
                      <TableHead className="text-right">Tax Rate</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {taxConfig.slabs.map((slab: any, idx: number) => (
                      <TableRow key={idx}>
                        <TableCell>{slab.minAmount.toLocaleString()} to {slab.maxAmount ? slab.maxAmount.toLocaleString() : 'Above'}</TableCell>
                        <TableCell className="text-right font-bold">{slab.percentage}%</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <p className="text-zinc-500 text-center py-8">No Tax Slabs configured.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {isTaxModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-950 rounded-lg shadow-xl w-full max-w-2xl overflow-hidden">
            <div className="p-6 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center">
              <h2 className="text-xl font-bold">Configure Tax Slabs (TDS)</h2>
              <button onClick={() => setIsTaxModalOpen(false)} className="text-zinc-500 hover:text-zinc-800">&times;</button>
            </div>
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-semibold">Regime Name</label>
                  <Input value={taxFormData.regimeName} onChange={e => setTaxFormData({...taxFormData, regimeName: e.target.value})} placeholder="e.g. New Regime" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold">Taxable Threshold (₹)</label>
                  <Input type="number" value={taxFormData.thresholdAmount} onChange={e => setTaxFormData({...taxFormData, thresholdAmount: e.target.value})} placeholder="e.g. 300000" />
                </div>
              </div>
              
              <div className="mt-6 border-t pt-4">
                <h3 className="font-semibold mb-2">Income Slabs</h3>
                {taxFormData.slabs.map((slab: any, i: number) => (
                  <div key={i} className="flex gap-2 items-center mb-3 bg-zinc-50 p-2 rounded-md">
                    <div className="flex-1 space-y-1">
                      <label className="text-xs">Min Amount</label>
                      <Input type="number" value={slab.minAmount} onChange={e => {
                        const newSlabs = [...taxFormData.slabs];
                        newSlabs[i].minAmount = e.target.value;
                        setTaxFormData({...taxFormData, slabs: newSlabs});
                      }} />
                    </div>
                    <div className="flex-1 space-y-1">
                      <label className="text-xs">Max Amount (Leave empty for 'Above')</label>
                      <Input type="number" value={slab.maxAmount || ""} placeholder="Above" onChange={e => {
                        const newSlabs = [...taxFormData.slabs];
                        newSlabs[i].maxAmount = e.target.value;
                        setTaxFormData({...taxFormData, slabs: newSlabs});
                      }} />
                    </div>
                    <div className="flex-1 space-y-1">
                      <label className="text-xs">Tax %</label>
                      <Input type="number" value={slab.percentage} onChange={e => {
                        const newSlabs = [...taxFormData.slabs];
                        newSlabs[i].percentage = e.target.value;
                        setTaxFormData({...taxFormData, slabs: newSlabs});
                      }} />
                    </div>
                    <Button variant="destructive" size="sm" className="mt-5" onClick={() => {
                      const newSlabs = taxFormData.slabs.filter((_: any, idx: number) => idx !== i);
                      setTaxFormData({...taxFormData, slabs: newSlabs});
                    }}>Remove</Button>
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={() => {
                  setTaxFormData({
                    ...taxFormData, 
                    slabs: [...taxFormData.slabs, { minAmount: 0, maxAmount: null, percentage: 0 }]
                  });
                }}>+ Add Slab</Button>
              </div>
            </div>
            <div className="p-6 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 flex justify-end gap-3">
              <Button variant="outline" onClick={() => setIsTaxModalOpen(false)}>Cancel</Button>
              <Button onClick={saveTaxConfig} className="bg-blue-600 hover:bg-blue-700 text-white">Save Configuration</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
