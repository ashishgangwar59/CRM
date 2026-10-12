"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plane, Plus, XCircle, Check, X } from "lucide-react";
import Link from "next/link";

export default function LeaveDashboardPage() {
  const [role, setRole] = useState<string | null>(null);
  const [modules, setModules] = useState<string[]>([]);
  const [balances, setBalances] = useState<any>(null);
  const [leaves, setLeaves] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [viewMode, setViewMode] = useState<"my" | "all">("my");
  
  const [showApply, setShowApply] = useState(false);
  const [formData, setFormData] = useState({
    leaveType: "Paid",
    startDate: "",
    endDate: "",
    isHalfDay: false,
    reason: ""
  });

  const isAdminOrKeyAdmin = role === "ADMIN" || role === "KEY_ADMIN";

  const fetchData = async (currentMode?: "my" | "all") => {
    try {
      const mode = currentMode || viewMode;
      const [balRes, leavesRes] = await Promise.all([
        fetch("/api/leave/balances"),
        fetch(`/api/leave${mode === "all" ? "?all=true" : ""}`)
      ]);
      const balData = await balRes.json();
      const leavesData = await leavesRes.json();
      
      if (balData.success) setBalances(balData.data?.balances || null);
      if (leavesData.success) setLeaves(leavesData.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchRole = async () => {
    try {
      const res = await fetch("/api/auth/me");
      const data = await res.json();
      if (data.success) {
        setRole(data.role);
        setModules(data.accessibleModules || []);
        if (data.role === "ADMIN" || data.role === "KEY_ADMIN") {
          setViewMode("all");
          fetchData("all");
          return;
        }
      }
    } catch (e) {
      console.error(e);
    }
    fetchData("my");
  };

  useEffect(() => {
    fetchRole();
  }, []);

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/leave", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (data.success) {
        alert("Leave applied successfully!");
        setShowApply(false);
        fetchData();
      } else {
        alert(data.error);
      }
    } catch (e) {
      alert("Error applying for leave.");
    }
  };

  const handleAction = async (leaveId: string, action: "Approve" | "Reject") => {
    const notes = prompt(`Enter optional notes for ${action}ing this leave:`);
    if (notes === null) return; // User cancelled prompt

    try {
      const res = await fetch("/api/leave/manager", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leaveId, action, managerNotes: notes })
      });
      const data = await res.json();
      if (data.success) {
        fetchData();
      } else {
        alert(data.error);
      }
    } catch (e) {
      alert(`Error ${action.toLowerCase()}ing leave.`);
    }
  };

  const handleCancel = async (leaveId: string) => {
    if (!confirm("Are you sure you want to cancel this leave?")) return;
    try {
      const res = await fetch("/api/leave/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leaveId })
      });
      const data = await res.json();
      if (data.success) {
        fetchData();
      } else {
        alert(data.error);
      }
    } catch (e) {
      alert("Error cancelling leave");
    }
  };

  if (loading) return <div className="p-8">Loading leave data...</div>;

  return (
    <div className="space-y-6 w-full pb-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Leave Management</h1>
          <p className="text-zinc-500 dark:text-zinc-400">View your balances and apply for time off.</p>
        </div>
        <div className="flex space-x-2">
          {role && (role === "ADMIN" || role === "KEY_ADMIN" || modules.includes("Leave Approvals")) && (
            <Link href="/dashboard/leave/manager">
              <Button variant="outline">Team Approvals</Button>
            </Link>
          )}
          <Button onClick={() => setShowApply(!showApply)}>
            <Plus className="mr-2 h-4 w-4" /> Apply Leave
          </Button>
        </div>
      </div>

      {showApply && (
        <Card className="border-emerald-200 dark:border-emerald-900 bg-emerald-50/50 dark:bg-emerald-900/10">
          <CardHeader>
            <CardTitle>Request Time Off</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleApply} className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>Leave Type</Label>
                  <select 
                    className="flex h-10 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:focus:ring-zinc-300"
                    value={formData.leaveType}
                    onChange={(e) => setFormData({...formData, leaveType: e.target.value})}
                  >
                    {Object.keys(balances || {}).map(type => (
                      <option key={type} value={type}>{type} ({balances[type]} left)</option>
                    ))}
                    <option value="Loss of Pay">Loss of Pay</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Start Date</Label>
                  <Input type="date" required value={formData.startDate} onChange={(e) => setFormData({...formData, startDate: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>End Date</Label>
                  <Input type="date" required value={formData.endDate} onChange={(e) => setFormData({...formData, endDate: e.target.value})} />
                </div>
                <div className="space-y-2 flex flex-col justify-end">
                  <label className="flex items-center space-x-2 h-10">
                    <input type="checkbox" checked={formData.isHalfDay} onChange={(e) => setFormData({...formData, isHalfDay: e.target.checked})} className="rounded border-zinc-300" />
                    <span className="text-sm font-medium">Half Day</span>
                  </label>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Reason</Label>
                <Input required value={formData.reason} onChange={(e) => setFormData({...formData, reason: e.target.value})} placeholder="Reason for leave..." />
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" type="button" onClick={() => setShowApply(false)}>Cancel</Button>
                <Button type="submit">Submit Request</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Leave Balances */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        {Object.entries(balances || {}).map(([type, count]) => (
          <Card key={type}>
            <CardContent className="p-4 flex flex-col items-center justify-center text-center">
              <p className="text-sm text-zinc-500 font-medium mb-1">{type}</p>
              <p className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">{count as number}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <CardTitle>
            {viewMode === "all" ? "All Employees' Leave Records" : "My Leave History"}
          </CardTitle>
          {isAdminOrKeyAdmin && (
            <div className="flex bg-zinc-100 dark:bg-zinc-800 p-1 rounded-lg">
              <button
                type="button"
                onClick={() => {
                  setViewMode("all");
                  fetchData("all");
                }}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                  viewMode === "all"
                    ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-900 dark:text-zinc-100"
                    : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                }`}
              >
                All Employee Leaves
              </button>
              <button
                type="button"
                onClick={() => {
                  setViewMode("my");
                  fetchData("my");
                }}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                  viewMode === "my"
                    ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-900 dark:text-zinc-100"
                    : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                }`}
              >
                My Leaves
              </button>
            </div>
          )}
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                {viewMode === "all" && <TableHead>Employee</TableHead>}
                <TableHead>Type</TableHead>
                <TableHead>Dates</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
               {leaves.map((leave) => {
                const isPending = leave.status === "Pending";
                const isPast = new Date(leave.startDate) < new Date();
                
                return (
                  <TableRow key={leave._id}>
                    {viewMode === "all" && (
                      <TableCell>
                        <p className="font-semibold text-zinc-900 dark:text-zinc-100">
                          {leave.employeeId?.firstName || "Unknown"} {leave.employeeId?.lastName || ""}
                        </p>
                        <p className="text-xs text-zinc-500">
                          {leave.employeeId?.employeeCode || "N/A"} {leave.employeeId?.department ? `• ${leave.employeeId.department}` : ""}
                        </p>
                      </TableCell>
                    )}
                    <TableCell className="font-medium">{leave.leaveType}</TableCell>
                    <TableCell>
                      {new Date(leave.startDate).toLocaleDateString()} - {new Date(leave.endDate).toLocaleDateString()}
                    </TableCell>
                    <TableCell>{leave.isHalfDay ? "Half Day" : "Full Day(s)"}</TableCell>
                    <TableCell className="max-w-[200px] truncate" title={leave.reason}>
                      {leave.reason || "-"}
                    </TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        leave.status === "Approved" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" :
                        leave.status === "Rejected" ? "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400" :
                        leave.status === "Cancelled" ? "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400" :
                        "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                      }`}>
                        {leave.status}
                      </span>
                    </TableCell>
                    <TableCell>
                      {isAdminOrKeyAdmin && isPending ? (
                        <div className="flex items-center space-x-2">
                          <Button
                            size="sm"
                            className="bg-emerald-600 hover:bg-emerald-700 text-white h-8 px-2.5"
                            onClick={() => handleAction(leave._id, "Approve")}
                          >
                            <Check className="mr-1 h-3.5 w-3.5" /> Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 h-8 px-2.5"
                            onClick={() => handleAction(leave._id, "Reject")}
                          >
                            <X className="mr-1 h-3.5 w-3.5" /> Reject
                          </Button>
                        </div>
                      ) : isPending && !isPast ? (
                        <Button variant="ghost" size="sm" onClick={() => handleCancel(leave._id)} className="text-rose-600 hover:text-rose-700 hover:bg-rose-50">
                          <XCircle className="mr-2 h-4 w-4" /> Cancel
                        </Button>
                      ) : (
                        <span className="text-xs text-zinc-400 italic">No action</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
              {leaves.length === 0 && (
                <TableRow>
                  <TableCell colSpan={viewMode === "all" ? 7 : 6} className="text-center text-zinc-500 py-8">
                    No leaves requested yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
