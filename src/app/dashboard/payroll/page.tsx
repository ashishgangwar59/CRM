"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { IndianRupee, Settings, Link as LinkIcon, Download, CheckSquare, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function PayrollDashboardPage() {
  const router = useRouter();
  const [role, setRole] = useState<string | null>(null);
  const [monthYear, setMonthYear] = useState(() => {
    if (typeof window !== "undefined") {
      return sessionStorage.getItem("payrollMonth") ?? new Date().toISOString().slice(0, 7);
    }
    return new Date().toISOString().slice(0, 7);
  });
  const [payrolls, setPayrolls] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [employees, setEmployees] = useState<any[]>([]);
  
  // Bulk Selection State
  const [selectedPayrolls, setSelectedPayrolls] = useState<string[]>([]);
  const [processingBulk, setProcessingBulk] = useState(false);
  const [selectedDaysMap, setSelectedDaysMap] = useState<Record<string, number>>({});
  const [manualIncentivesMap, setManualIncentivesMap] = useState<Record<string, number>>({});
  const [revenueMap, setRevenueMap] = useState<Record<string, number>>({});

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
    const paidDays = selectedDaysMap[employeeId] || 30;
    const manualIncentive = manualIncentivesMap[employeeId] || 0;
    const eligibleRevenue = revenueMap[employeeId] || 0;
    try {
      const res = await fetch("/api/payroll/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeId, monthYear, paidDays, manualIncentive, eligibleRevenue })
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

  const [generatingAll, setGeneratingAll] = useState(false);
  const handleGenerateAll = async () => {
    if (!confirm(`Are you sure you want to recalculate payroll for ALL active employees for ${monthYear}?`)) return;
    setGeneratingAll(true);
    try {
      const res = await fetch("/api/payroll/generate-all", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ monthYear })
      });
      const data = await res.json();
      if (data.success) {
        alert(data.message);
        fetchPayrolls();
      } else {
        alert(data.error);
      }
    } catch (e) {
      alert("Error running bulk payroll.");
    } finally {
      setGeneratingAll(false);
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

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    setCurrentPage(1);
  }, [payrolls, employees, monthYear]);

  if (loading || role === null) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        <p className="text-zinc-500 font-medium">Loading Payroll Data...</p>
      </div>
    );
  }

  const isEmployee = role === "Employee";
  const isEmployeeView = isEmployee || !monthYear;
  const currentDataList = isEmployeeView ? payrolls : employees;
  const totalPages = Math.max(1, Math.ceil(currentDataList.length / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  
  const paginatedPayrolls = isEmployeeView ? payrolls.slice(startIndex, startIndex + itemsPerPage) : payrolls;
  const paginatedEmployees = !isEmployeeView ? employees.slice(startIndex, startIndex + itemsPerPage) : [];

  return (
    <div className="space-y-6 w-full pb-24 relative">
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
              <Button 
                variant="default" 
                onClick={handleGenerateAll} 
                disabled={generatingAll}
                className="bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                {generatingAll ? "Running..." : "Run All Payrolls"}
              </Button>
              <Link href="/dashboard/payroll/structure">
                <Button variant="outline"><Settings className="mr-2 h-4 w-4"/> Structures</Button>
              </Link>
            </>
          )}
          <div className="flex items-center space-x-2">
            <Input 
              type="month" 
              value={monthYear} 
              onChange={(e) => {
                setMonthYear(e.target.value);
                if (typeof window !== "undefined") sessionStorage.setItem("payrollMonth", e.target.value);
              }}
              className="w-48"
            />
            {monthYear && (
              <Button variant="ghost" size="sm" onClick={() => {
                setMonthYear("");
                if (typeof window !== "undefined") sessionStorage.setItem("payrollMonth", "");
              }}>
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
                <TableHead className="text-center">Paid Days</TableHead>
                <TableHead className="text-right">Gross</TableHead>
                <TableHead className="text-right">Deductions</TableHead>
                <TableHead className="text-right font-bold text-emerald-700">Net Salary</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12">
                    <div className="flex items-center justify-center gap-3 text-zinc-500">
                      <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                      Loading Payrolls...
                    </div>
                  </TableCell>
                </TableRow>
              ) : payrolls.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-zinc-500">
                    No payrolls found.
                  </TableCell>
                </TableRow>
              ) : isEmployee || !monthYear ? (
                paginatedPayrolls.map((payroll) => {
                  const monthName = payroll.monthYear ? new Date(`${payroll.monthYear}-01`).toLocaleDateString("en-US", { month: "long", year: "numeric" }) : "";
                  return (
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
                          <div className="font-bold text-zinc-900 dark:text-zinc-50">{monthName || payroll.monthYear}</div>
                        ) : (
                          <div>
                            <p className="font-semibold text-zinc-950 dark:text-zinc-50">{payroll.employeeId?.firstName} {payroll.employeeId?.lastName}</p>
                            <p className="text-xs text-zinc-500">{payroll.employeeId?.employeeCode} • {monthName || payroll.monthYear}</p>
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="inline-block px-2.5 py-0.5 rounded bg-zinc-100 text-zinc-800 text-xs font-semibold">
                          {payroll.paidDays || 30} Days
                        </span>
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
                  );
                })
              ) : (
                paginatedEmployees.map((emp) => {
                  const payroll = payrolls.find(p => p.employeeId?._id === emp._id || p.employeeId === emp._id);
                  const selectedDays = selectedDaysMap[emp._id] ?? 30;
                  
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
                          <TableCell className="text-center">
                            <span className="inline-block px-2.5 py-0.5 rounded bg-zinc-100 text-zinc-800 text-xs font-semibold">
                              {payroll.paidDays || 30} Days
                            </span>
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
                          <TableCell className="flex items-center space-x-2">
                            {payroll.status === "Draft" && !isEmployee && (
                               <div className="flex space-x-1 items-center bg-zinc-50 p-1 rounded border">
                                 <Input 
                                    type="number" 
                                    placeholder="Add Incentive ₹" 
                                    className="w-28 h-7 text-[10px]"
                                    value={manualIncentivesMap[emp._id] || ""}
                                    onChange={(e) => setManualIncentivesMap({ ...manualIncentivesMap, [emp._id]: Number(e.target.value) })}
                                 />
                                 <Button size="sm" variant="secondary" className="h-7 px-2 text-[10px]" onClick={() => handleGenerate(emp._id)} title="Recalculate Salary">
                                    ↺ 
                                 </Button>
                               </div>
                            )}
                            <Button size="sm" variant="outline" onClick={() => router.push(`/dashboard/payroll/${payroll._id}`)}>
                              View Slip
                            </Button>
                          </TableCell>
                        </>
                      ) : (
                        <>
                          <TableCell className="text-center">
                            <select
                              value={selectedDays}
                              onChange={(e) => setSelectedDaysMap({ ...selectedDaysMap, [emp._id]: Number(e.target.value) })}
                              className="text-xs border border-zinc-300 rounded px-2 py-1 bg-white text-zinc-900 font-medium"
                            >
                              <option value={30}>30 Days (1 Month)</option>
                              <option value={15}>15 Days Salary</option>
                              <option value={20}>20 Days Salary</option>
                              <option value={10}>10 Days Salary</option>
                              <option value={5}>5 Days Salary</option>
                            </select>
                          </TableCell>
                          <TableCell colSpan={3} className="text-center">
                            <div className="flex items-center justify-center space-x-2">
                              <Input 
                                type="number" 
                                placeholder="Monthly Sales (₹)" 
                                className="w-32 h-8 text-xs border-zinc-300"
                                value={revenueMap[emp._id] || ""}
                                onChange={(e) => setRevenueMap({ ...revenueMap, [emp._id]: Number(e.target.value) })}
                                title="Sales volume / business revenue achieved this month"
                              />
                              <Input 
                                type="number" 
                                placeholder="Bonus/Ad-hoc (₹)" 
                                className="w-32 h-8 text-xs border-zinc-300"
                                value={manualIncentivesMap[emp._id] || ""}
                                onChange={(e) => setManualIncentivesMap({ ...manualIncentivesMap, [emp._id]: Number(e.target.value) })}
                                title="Additional manual bonus/incentive amount"
                              />
                            </div>
                          </TableCell>
                          <TableCell></TableCell>
                          <TableCell>
                            <Button size="sm" onClick={() => handleGenerate(emp._id)} disabled={generating}>
                              Generate ({selectedDays}d)
                            </Button>
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

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between py-4">
          <div className="text-sm text-zinc-500">
            Showing <span className="font-medium">{startIndex + 1}</span> to <span className="font-medium">{Math.min(startIndex + itemsPerPage, currentDataList.length)}</span> of <span className="font-medium">{currentDataList.length}</span> results
          </div>
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            <div className="flex items-center space-x-1 px-2">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  className={`w-8 h-8 rounded-full text-sm font-medium ${currentPage === pageNum ? 'bg-indigo-600 text-white' : 'text-zinc-600 hover:bg-zinc-100'}`}
                >
                  {pageNum}
                </button>
              ))}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}

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
