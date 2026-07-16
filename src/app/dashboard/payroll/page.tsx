"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { IndianRupee, Settings, Link as LinkIcon, Download, CheckSquare } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function PayrollDashboardPage() {
  const router = useRouter();
  const [role, setRole] = useState<string | null>(null);
  const [monthYear, setMonthYear] = useState(new Date().toISOString().slice(0, 7));
  const [payrolls, setPayrolls] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [employees, setEmployees] = useState<any[]>([]);
  
  // Bulk Selection State
  const [selectedPayrolls, setSelectedPayrolls] = useState<string[]>([]);
  const [processingBulk, setProcessingBulk] = useState(false);

  const fetchPayrolls = async () => {
    try {
      const res = await fetch(`/api/payroll?monthYear=${monthYear}`);
      const data = await res.json();
      if (data.success) {
        setPayrolls(data.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const res = await fetch("/api/employees");
      const data = await res.json();
      if (data.success) {
        setEmployees(data.data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchRoleAndData = async () => {
    try {
      const res = await fetch("/api/auth/me");
      const data = await res.json();
      if (data.success) {
        setRole(data.role);
        if (data.role !== "Employee") {
          fetchEmployees();
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchRoleAndData();
  }, []);

  useEffect(() => {
    if (role) {
      fetchPayrolls();
      setSelectedPayrolls([]); // Reset selection on month change
    }
  }, [monthYear, role]);

  const handleGenerate = async (employeeId: string) => {
    setGenerating(true);
    try {
      const res = await fetch("/api/payroll/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeId, monthYear })
      });
      const data = await res.json();
      if (data.success) {
        fetchPayrolls();
      } else {
        alert(data.error);
      }
    } catch (e) {
      alert("Error generating payroll.");
    } finally {
      setGenerating(false);
    }
  };

  const toggleSelection = (payrollId: string) => {
    if (selectedPayrolls.includes(payrollId)) {
      setSelectedPayrolls(selectedPayrolls.filter(id => id !== payrollId));
    } else {
      setSelectedPayrolls([...selectedPayrolls, payrollId]);
    }
  };

  const toggleAll = () => {
    const eligiblePayrolls = payrolls.filter(p => p.status === "Approved");
    if (selectedPayrolls.length === eligiblePayrolls.length) {
      setSelectedPayrolls([]);
    } else {
      setSelectedPayrolls(eligiblePayrolls.map(p => p._id));
    }
  };

  const handleBulkPayment = async () => {
    if (selectedPayrolls.length === 0) return;
    if (!confirm(`Are you sure you want to process ${selectedPayrolls.length} salaries? This will deduct funds from the Company Wallet.`)) return;
    
    setProcessingBulk(true);
    try {
      const res = await fetch("/api/payroll/payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payrollIds: selectedPayrolls, monthYear })
      });
      const data = await res.json();
      
      if (data.success) {
        alert(data.message);
        setSelectedPayrolls([]);
        fetchPayrolls();
      } else {
        alert(`Payment Failed: ${data.error}`);
      }
    } catch (e) {
      alert("Error processing bulk payment.");
    } finally {
      setProcessingBulk(false);
    }
  };

  const calculateSelectedTotal = () => {
    return payrolls
      .filter(p => selectedPayrolls.includes(p._id))
      .reduce((sum, p) => sum + p.netSalary, 0);
  };

  if (loading || role === null) return <div className="p-8">Loading...</div>;

  const isEmployee = role === "Employee";

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-24 relative">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            {isEmployee ? "My Payslips" : "Payroll Dashboard"}
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400">
            {isEmployee ? "View and download your monthly salary slips." : "Manage, generate, and bulk pay employee salaries."}
          </p>
        </div>
        <div className="flex space-x-3">
          {!isEmployee && (
            <>
              <Link href="/dashboard/payroll/ledger">
                <Button variant="outline">Salary Ledger</Button>
              </Link>
              <Link href="/dashboard/payroll/structure">
                <Button variant="outline"><Settings className="mr-2 h-4 w-4"/> Structures</Button>
              </Link>
            </>
          )}
          <div className="flex items-center space-x-2">
            <Input 
              type="month" 
              value={monthYear} 
              onChange={(e) => setMonthYear(e.target.value)}
              className="w-48"
            />
            {monthYear && (
              <Button variant="ghost" size="sm" onClick={() => setMonthYear("")}>
                All Slips
              </Button>
            )}
          </div>
        </div>
      </div>

      {!isEmployee && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800">
            <CardContent className="p-6">
              <h3 className="text-sm font-medium text-emerald-800 dark:text-emerald-400">Total Net Salary Generated</h3>
              <p className="text-3xl font-bold text-emerald-950 dark:text-emerald-50 mt-2 flex items-center">
                <IndianRupee className="h-6 w-6 mr-1" />
                {payrolls.reduce((sum, p) => sum + p.netSalary, 0).toLocaleString()}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-zinc-50 dark:bg-zinc-900/50">
              <TableRow>
                {!isEmployee && (
                  <TableHead className="w-12 text-center">
                    <input type="checkbox" onChange={toggleAll} checked={selectedPayrolls.length > 0 && selectedPayrolls.length === payrolls.filter(p => p.status === "Approved").length} className="rounded border-zinc-300" />
                  </TableHead>
                )}
                <TableHead>{isEmployee ? "Month" : "Employee"}</TableHead>
                <TableHead className="text-right">Gross</TableHead>
                <TableHead className="text-right">Deductions</TableHead>
                <TableHead className="text-right font-bold text-emerald-700">Net Salary</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isEmployee || !monthYear ? (
                payrolls.map((payroll) => (
                  <TableRow key={payroll._id}>
                    {!isEmployee && (
                      <TableCell className="text-center">
                        {payroll.status === "Approved" ? (
                          <input 
                            type="checkbox" 
                            checked={selectedPayrolls.includes(payroll._id)}
                            onChange={() => toggleSelection(payroll._id)}
                            className="rounded border-zinc-300 cursor-pointer"
                          />
                        ) : (
                          <input type="checkbox" disabled className="rounded border-zinc-200 cursor-not-allowed opacity-50" />
                        )}
                      </TableCell>
                    )}
                    <TableCell className="font-medium">
                      {isEmployee ? (
                        payroll.monthYear
                      ) : (
                        <div>
                          <p className="font-semibold text-zinc-950 dark:text-zinc-50">{payroll.employeeId?.firstName} {payroll.employeeId?.lastName}</p>
                          <p className="text-xs text-zinc-500">{payroll.employeeId?.employeeCode} • {payroll.monthYear}</p>
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-right">₹{payroll.grossSalary.toLocaleString()}</TableCell>
                    <TableCell className="text-right text-rose-600">-₹{payroll.totalDeductions.toLocaleString()}</TableCell>
                    <TableCell className="text-right font-bold text-emerald-600">₹{payroll.netSalary.toLocaleString()}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        payroll.status === "Paid" ? "bg-emerald-100 text-emerald-700" :
                        payroll.status === "Approved" ? "bg-blue-100 text-blue-700" :
                        payroll.status === "Locked" ? "bg-amber-100 text-amber-700" :
                        "bg-zinc-100 text-zinc-700"
                      }`}>
                        {payroll.status}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Button size="sm" variant="outline" onClick={() => router.push(`/dashboard/payroll/${payroll._id}`)}>
                        View Slip
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                employees.map((emp) => {
                  const payroll = payrolls.find(p => p.employeeId?._id === emp._id || p.employeeId === emp._id);
                  
                  return (
                    <TableRow key={emp._id}>
                      <TableCell className="text-center">
                        {payroll && payroll.status === "Approved" ? (
                          <input 
                            type="checkbox" 
                            checked={selectedPayrolls.includes(payroll._id)}
                            onChange={() => toggleSelection(payroll._id)}
                            className="rounded border-zinc-300 cursor-pointer"
                          />
                        ) : (
                          <input type="checkbox" disabled className="rounded border-zinc-200 cursor-not-allowed opacity-50" title={payroll?.status === "Paid" ? "Already Paid" : "Must be Approved to pay"} />
                        )}
                      </TableCell>
                      <TableCell>
                        <p className="font-medium">{emp.firstName} {emp.lastName}</p>
                        <p className="text-xs text-zinc-500">{emp.employeeCode}</p>
                      </TableCell>
                      {payroll ? (
                        <>
                          <TableCell className="text-right">₹{payroll.grossSalary.toLocaleString()}</TableCell>
                          <TableCell className="text-right text-rose-600">-₹{payroll.totalDeductions.toLocaleString()}</TableCell>
                          <TableCell className="text-right font-bold text-emerald-600">₹{payroll.netSalary.toLocaleString()}</TableCell>
                          <TableCell>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              payroll.status === "Paid" ? "bg-emerald-100 text-emerald-700" :
                              payroll.status === "Approved" ? "bg-blue-100 text-blue-700" :
                              payroll.status === "Locked" ? "bg-amber-100 text-amber-700" :
                              "bg-zinc-100 text-zinc-700"
                            }`}>
                              {payroll.status}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Button size="sm" variant="outline" onClick={() => router.push(`/dashboard/payroll/${payroll._id}`)}>
                              View Slip
                            </Button>
                          </TableCell>
                        </>
                      ) : (
                        <>
                          <TableCell colSpan={3} className="text-center text-zinc-500">Not Generated</TableCell>
                          <TableCell></TableCell>
                          <TableCell>
                            <Button size="sm" onClick={() => handleGenerate(emp._id)} disabled={generating}>Generate</Button>
                          </TableCell>
                        </>
                      )}
                    </TableRow>
                  );
                })
              )}
              {(isEmployee || !monthYear) && payrolls.length === 0 && (
                <TableRow>
                  <TableCell colSpan={isEmployee ? 6 : 7} className="text-center text-zinc-500 py-8">
                    No salary slips found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Floating Bulk Action Bar */}
      {!isEmployee && selectedPayrolls.length > 0 && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-zinc-900 text-white px-6 py-4 rounded-full shadow-2xl flex items-center space-x-6 z-50">
          <div>
            <p className="text-xs text-zinc-400 font-medium uppercase tracking-wider">Selected ({selectedPayrolls.length})</p>
            <p className="font-bold text-xl flex items-center">
              <IndianRupee className="h-5 w-5 mr-1" />
              {calculateSelectedTotal().toLocaleString()}
            </p>
          </div>
          <Button 
            className="bg-brand hover:opacity-90 text-white rounded-full px-8" 
            onClick={handleBulkPayment}
            disabled={processingBulk}
          >
            {processingBulk ? "Processing..." : "Process Bank Transfer"}
          </Button>
        </div>
      )}
    </div>
  );
}
