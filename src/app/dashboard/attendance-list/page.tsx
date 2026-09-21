"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

export default function AttendanceListPage() {
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [status, setStatus] = useState("");

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/attendance/list?date=${date}&status=${status}&page=${page}&limit=${limit}`);
      const data = await res.json();
      if (data.success) {
        setRecords(data.data);
        if (data.pagination) {
          setTotalPages(data.pagination.totalPages || 1);
          setTotalItems(data.pagination.total || 0);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setPage(1);
  }, [date, status, limit]);

  useEffect(() => {
    fetchRecords();
  }, [date, status, page, limit]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Attendance List</h1>
          <p className="text-zinc-500 dark:text-zinc-400">View attendance records across the organization.</p>
        </div>
      </div>

      <Card>
        <CardHeader className="bg-zinc-50/50 dark:bg-zinc-900/50 border-b border-zinc-200 dark:border-zinc-800 flex flex-row items-center justify-between py-4">
          <CardTitle className="text-lg font-medium text-zinc-800 dark:text-zinc-200">Records</CardTitle>
          <div className="flex space-x-3">
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="border border-zinc-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="border border-zinc-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            >
              <option value="">All Statuses</option>
              <option value="Present">Present</option>
              <option value="Absent">Absent</option>
              <option value="Half-Day">Half-Day</option>
              <option value="Leave">Leave</option>
            </select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex flex-col items-center justify-center p-12">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-600 mb-4" />
              <p className="text-zinc-500 font-medium">Loading records...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-zinc-50/50 dark:bg-zinc-900/50 hover:bg-transparent">
                    <TableHead>Employee</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Punch In</TableHead>
                    <TableHead>Punch Out</TableHead>
                    <TableHead>Total Hours</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records.length > 0 ? (
                    records.map((record) => (
                      <TableRow key={record._id}>
                        <TableCell>
                          <div className="font-medium text-zinc-900 dark:text-zinc-100">
                            {record.employeeId?.firstName} {record.employeeId?.lastName}
                          </div>
                          <div className="text-xs text-zinc-500">
                            {record.employeeId?.employeeCode} • {record.employeeId?.department}
                          </div>
                        </TableCell>
                        <TableCell>{record.date}</TableCell>
                        <TableCell>
                          {record.punchIn ? (
                            <div>
                              <div>{new Date(record.punchIn.time).toLocaleTimeString()}</div>
                              <div className="text-xs text-zinc-500">IP: {record.punchIn.ipAddress}</div>
                            </div>
                          ) : (
                            <span className="text-zinc-400">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {record.punchOut ? (
                            <div>
                              <div>{new Date(record.punchOut.time).toLocaleTimeString()}</div>
                              <div className="text-xs text-zinc-500">IP: {record.punchOut.ipAddress}</div>
                            </div>
                          ) : (
                            <span className="text-zinc-400">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {record.metrics?.workingHours ? `${record.metrics.workingHours.toFixed(2)} hrs` : "-"}
                        </TableCell>
                        <TableCell>
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${record.status === "Present" ? "border border-emerald-200 bg-emerald-50 text-emerald-700" :
                              record.status === "Absent" ? "border border-rose-200 bg-rose-50 text-rose-700" :
                                record.status === "Half-Day" ? "border border-amber-200 bg-amber-50 text-amber-700" :
                                  "border border-blue-200 bg-blue-50 text-blue-700"
                            }`}>
                            {record.status}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-zinc-500">
                        No attendance records found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Pagination */}
          <div className="flex items-center justify-between p-4 border-t border-zinc-200 dark:border-zinc-800 text-sm text-zinc-500">
            <div className="flex items-center space-x-2">
              <span>Show</span>
              <select
                value={limit}
                onChange={(e) => setLimit(Number(e.target.value))}
                className="rounded-md border border-zinc-300 bg-transparent px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:border-zinc-700 dark:text-zinc-50"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              <span>entries (Total: {totalItems})</span>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              >
                Previous
              </Button>
              <span className="font-medium text-zinc-900 dark:text-zinc-100">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
              >
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
