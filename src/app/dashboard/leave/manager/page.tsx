"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Check, X } from "lucide-react";

export default function LeaveManagerPage() {
  const [leaves, setLeaves] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLeaves = async () => {
    try {
      const res = await fetch("/api/leave/manager");
      const data = await res.json();
      if (data.success) {
        setLeaves(data.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaves();
  }, []);

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
        fetchLeaves(); // Refresh list
      } else {
        alert(data.error);
      }
    } catch (e) {
      alert(`Error ${action.toLowerCase()}ing leave.`);
    }
  };

  if (loading) return <div className="p-8">Loading pending leaves...</div>;

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-10">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Leave Approvals</h1>
        <p className="text-zinc-500 dark:text-zinc-400">Review and manage pending leave requests from your team.</p>
      </div>

      <Card>
        <CardContent className="p-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Dates</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leaves.map((leave) => (
                <TableRow key={leave._id}>
                  <TableCell>
                    <p className="font-medium">{leave.employeeId?.firstName} {leave.employeeId?.lastName}</p>
                    <p className="text-xs text-zinc-500">{leave.employeeId?.employeeCode}</p>
                  </TableCell>
                  <TableCell className="font-medium">{leave.leaveType}</TableCell>
                  <TableCell>
                    {new Date(leave.startDate).toLocaleDateString()} - {new Date(leave.endDate).toLocaleDateString()}
                  </TableCell>
                  <TableCell>{leave.isHalfDay ? "Half Day" : "Full Day(s)"}</TableCell>
                  <TableCell className="max-w-[200px] truncate" title={leave.reason}>{leave.reason}</TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => handleAction(leave._id, "Approve")}>
                        <Check className="mr-1 h-4 w-4" /> Approve
                      </Button>
                      <Button size="sm" variant="outline" className="text-rose-600 hover:text-rose-700 hover:bg-rose-50" onClick={() => handleAction(leave._id, "Reject")}>
                        <X className="mr-1 h-4 w-4" /> Reject
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {leaves.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-zinc-500 py-8">
                    No pending leave requests!
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
