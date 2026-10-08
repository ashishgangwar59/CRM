"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Download, ShieldAlert } from "lucide-react";
import { useDebounce } from "@/hooks/useDebounce";

export default function LoginHistoryPage() {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState("");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 500);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [dateFilter, setDateFilter] = useState("");

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetch("/api/auth/me")
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setRole(data.role.toUpperCase());
        }
      });
  }, []);

  const fetchHistory = async (exporting = false) => {
    setLoading(!exporting);
    try {
      const qPage = exporting ? 1 : page;
      const qLimit = exporting ? 100000 : limit;

      const query = `?page=${qPage}&limit=${qLimit}&search=${encodeURIComponent(debouncedSearch)}&status=${statusFilter === "ALL" ? "" : statusFilter}&date=${dateFilter}`;
      const res = await fetch(`/api/login-history${query}`);
      const json = await res.json();

      if (json.success) {
        if (exporting) return json.data;
        setHistory(json.data);
        setTotalPages(json.pagination.totalPages || 1);
      }
    } catch (e) {
      console.error(e);
    } finally {
      if (!exporting) setLoading(false);
    }
  };

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, statusFilter, dateFilter, limit]);

  useEffect(() => {
    if (role === "ADMIN" || role === "KEY_ADMIN" || role === "KEYADMIN" || role === "SUPERADMIN") {
      fetchHistory();
    } else if (role) {
      setLoading(false);
    }
  }, [debouncedSearch, statusFilter, dateFilter, page, limit, role]);

  const handleExport = async () => {
    const dataToExport = await fetchHistory(true);
    if (!dataToExport || dataToExport.length === 0) {
      alert("No data available to export.");
      return;
    }

    const headers = ["User Name", "Email", "User Type", "Status", "IP Address", "User Agent", "Timestamp"];
    const csvContent = [
      headers.join(","),
      ...dataToExport.map((row: any) => {
        return [
          `"${row.userName || ""}"`,
          `"${row.userId?.email || ""}"`,
          `"${row.userType || ""}"`,
          `"${row.status || ""}"`,
          `"${row.ipAddress || ""}"`,
          `"${row.userAgent || ""}"`,
          `"${new Date(row.createdAt).toLocaleString()}"`
        ].join(",");
      })
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `login_history_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!role) return <div className="p-8 text-center">Loading...</div>;

  if (role !== "ADMIN" && role !== "KEY_ADMIN" && role !== "KEYADMIN" && role !== "SUPERADMIN") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-zinc-500">
        <ShieldAlert className="w-16 h-16 mb-4 text-zinc-300" />
        <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
        <p>You do not have permission to view this page.</p>
      </div>
    );
  }

  return (
    <div className="p-2 md:p-1 space-y-6 w-full">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Login History</h1>
          <p className="text-zinc-500 dark:text-zinc-400 mt-1">Monitor all employee and investor login/logout activity.</p>
        </div>
        <Button onClick={handleExport} className="bg-emerald-600 hover:bg-emerald-700 text-white">
          <Download className="w-4 h-4 mr-2" /> Export to CSV
        </Button>
      </div>

      <Card>
        <CardHeader className="bg-zinc-50/50 dark:bg-zinc-900/50 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="relative w-full md:w-96">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
              <Input
                placeholder="Search by email..."
                className="pl-10 dark:text-zinc-100"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex gap-4 w-full md:w-auto">
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="border border-zinc-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-zinc-950 dark:border-zinc-800 dark:text-zinc-100"
              />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="border border-zinc-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-zinc-950 dark:border-zinc-800 dark:text-zinc-100"
              >
                <option value="ALL">All Status</option>
                <option value="SUCCESS">Success</option>
                <option value="FAILURE">Failure</option>
                <option value="LOGOUT">Logout</option>
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-zinc-50/50 dark:bg-zinc-900/50">
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>IP Address</TableHead>
                  <TableHead>Date & Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8">Loading history...</TableCell>
                  </TableRow>
                ) : history.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-zinc-500">No login history found matching the filters.</TableCell>
                  </TableRow>
                ) : (
                  history.map((record, idx) => (
                    <TableRow key={record._id || idx}>
                      <TableCell>
                        <div className="font-medium text-zinc-900 dark:text-zinc-100">{record.userName}</div>
                        <div className="text-sm text-zinc-500">{record.userId?.email || "-"}</div>
                      </TableCell>
                      <TableCell className="dark:text-zinc-100">{record.userType}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${record.status === "SUCCESS" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" :
                          record.status === "FAILURE" ? "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400" :
                            "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                          }`}>
                          {record.status}
                        </span>
                      </TableCell>
                      <TableCell className="dark:text-zinc-100">{record.ipAddress || "-"}</TableCell>
                      <TableCell className="dark:text-zinc-100">{new Date(record.createdAt).toLocaleString()}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {!loading && totalPages >= 1 && (
            <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 flex justify-between items-center bg-zinc-50 dark:bg-zinc-900/50">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Previous
              </Button>
              <div className="flex items-center gap-4">
                <span className="text-sm text-zinc-500">
                  Page {page} of {totalPages}
                </span>
                <select
                  value={limit}
                  onChange={(e) => {
                    setLimit(Number(e.target.value));
                    setPage(1);
                  }}
                  className="border border-zinc-300 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:bg-zinc-950 dark:border-zinc-800 dark:text-zinc-100"
                >
                  <option value={10}>10 / page</option>
                  <option value={20}>20 / page</option>
                  <option value={100}>100 / page</option>
                </select>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                Next
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
