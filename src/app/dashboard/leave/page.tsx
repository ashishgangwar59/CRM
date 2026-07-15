"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plane, Plus, XCircle } from "lucide-react";
import Link from "next/link";

export default function LeaveDashboardPage() {
  const [role, setRole] = useState<string | null>(null);
  const [balances, setBalances] = useState<any>(null);
  const [leaves, setLeaves] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [showApply, setShowApply] = useState(false);
  const [formData, setFormData] = useState({
    leaveType: "Paid",
    startDate: "",
    endDate: "",
    isHalfDay: false,
    reason: ""
  });

  const fetchData = async () => {
    try {
      const [balRes, leavesRes] = await Promise.all([
        fetch("/api/leave/balances"),
        fetch("/api/leave")
      ]);
      const balData = await balRes.json();
      const leavesData = await leavesRes.json();
      
      if (balData.success) setBalances(balData.data.balances);
      if (leavesData.success) setLeaves(leavesData.data);
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
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchData();
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
    <div className="space-y-6 max-w-6xl mx-auto pb-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Leave Management</h1>
          <p className="text-zinc-500 dark:text-zinc-400">View your balances and apply for time off.</p>
        </div>
        <div className="flex space-x-2">
          {role && role !== "Employee" && (
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
        <CardHeader>
          <CardTitle>My Leave History</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Dates</TableHead>
                <TableHead>Duration</TableHead>
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
                    <TableCell className="font-medium">{leave.leaveType}</TableCell>
                    <TableCell>
                      {new Date(leave.startDate).toLocaleDateString()} - {new Date(leave.endDate).toLocaleDateString()}
                    </TableCell>
                    <TableCell>{leave.isHalfDay ? "Half Day" : "Full Day(s)"}</TableCell>
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
                      {isPending && !isPast && (
                        <Button variant="ghost" size="sm" onClick={() => handleCancel(leave._id)} className="text-rose-600 hover:text-rose-700 hover:bg-rose-50">
                          <XCircle className="mr-2 h-4 w-4" /> Cancel
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
              {leaves.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-zinc-500 py-8">No leaves requested yet.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
