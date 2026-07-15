"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";

export default function ManagerAttendancePage() {
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/attendance/manager?date=${date}`);
      const data = await res.json();
      if (data.success) {
        setRecords(data.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, [date]);

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Team Attendance</h1>
          <p className="text-zinc-500 dark:text-zinc-400">Review team punches, late comings, and leaves.</p>
        </div>
        <div>
          <Input 
            type="date" 
            value={date} 
            onChange={(e) => setDate(e.target.value)}
            className="w-48"
          />
        </div>
      </div>

      <Card>
        <CardContent className="p-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Punch In</TableHead>
                <TableHead>Punch Out</TableHead>
                <TableHead>Hours</TableHead>
                <TableHead>IP Address</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-zinc-500">Loading...</TableCell>
                </TableRow>
              ) : records.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-zinc-500">No attendance records found for this date.</TableCell>
                </TableRow>
              ) : (
                records.map((record) => (
                  <TableRow key={record._id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{record.employeeId?.firstName} {record.employeeId?.lastName}</p>
                        <p className="text-xs text-zinc-500">{record.employeeId?.employeeCode}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <select 
                        value={record.status} 
                        onChange={async (e) => {
                          const newStatus = e.target.value;
                          try {
                            const res = await fetch("/api/attendance/manager", {
                              method: "PUT",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ attendanceId: record._id, status: newStatus })
                            });
                            const data = await res.json();
                            if (data.success) {
                              alert(`Status updated to ${newStatus}`);
                              fetchRecords();
                            } else {
                              alert(data.error || "Failed to update status");
                            }
                          } catch (err) {
                            alert("Error updating status");
                          }
                        }}
                        className={`rounded-md border border-zinc-200 px-2 py-1 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:border-zinc-800 dark:bg-zinc-900 ${
                          record.status === "Present" ? "text-emerald-700 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950/30" :
                          record.status === "Half-Day" ? "text-amber-700 bg-amber-50 dark:text-amber-400 dark:bg-amber-950/30" :
                          "text-rose-700 bg-rose-50 dark:text-rose-400 dark:bg-rose-950/30"
                        }`}
                      >
                        <option value="Present">Present</option>
                        <option value="Half-Day">Half-Day</option>
                        <option value="Absent">Absent</option>
                        <option value="Leave">Leave</option>
                        <option value="Holiday">Holiday</option>
                      </select>
                      {record.metrics.isLate && <span className="ml-2 text-xs text-amber-600 font-medium">Late</span>}
                      {record.metrics.isEarlyLeave && <span className="ml-2 text-xs text-amber-600 font-medium">Early Leave</span>}
                    </TableCell>
                    <TableCell>
                      {record.punchIn ? new Date(record.punchIn.time).toLocaleTimeString() : "-"}
                    </TableCell>
                    <TableCell>
                      {record.punchOut ? new Date(record.punchOut.time).toLocaleTimeString() : "-"}
                    </TableCell>
                    <TableCell>
                      {record.metrics.workingHours > 0 ? `${record.metrics.workingHours}h` : "-"}
                    </TableCell>
                    <TableCell className="text-xs font-mono text-zinc-500">
                      {record.punchIn?.ipAddress || "-"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
