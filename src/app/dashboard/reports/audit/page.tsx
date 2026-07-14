"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ShieldAlert, Eye, Search, Filter, X } from "lucide-react";

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const res = await fetch("/api/reports/audit");
        const data = await res.json();
        if (data.success) {
          setLogs(data.data);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, []);

  const filteredLogs = logs.filter(log => 
    log.action.toLowerCase().includes(searchTerm.toLowerCase()) || 
    log.module.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (log.userId && `${log.userId.firstName} ${log.userId.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (loading) return <div className="p-8">Loading audit ledger...</div>;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-24">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 flex items-center">
          <ShieldAlert className="mr-3 h-8 w-8 text-rose-600" />
          Audit Logs
        </h1>
        <p className="text-zinc-500 dark:text-zinc-400">Secure immutable ledger of all critical system actions.</p>
      </div>

      <Card>
        <CardHeader className="bg-zinc-50/50 flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0 pb-4 border-b border-zinc-100">
          <CardTitle className="text-sm font-semibold uppercase tracking-wider text-zinc-500">System Activity</CardTitle>
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-400 h-4 w-4" />
            <input 
              type="text" 
              placeholder="Search user or action..." 
              className="pl-9 pr-4 py-2 w-full text-sm border border-zinc-300 rounded-md focus:ring-2 focus:ring-rose-500 focus:outline-none"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className="p-0 max-h-[700px] overflow-auto">
          <Table>
            <TableHeader className="bg-zinc-50 sticky top-0 z-10 shadow-sm">
              <TableRow>
                <TableHead>Timestamp</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Module</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>IP / Browser</TableHead>
                <TableHead className="text-right">Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLogs.map(log => (
                <TableRow key={log._id}>
                  <TableCell className="text-xs text-zinc-500 font-mono whitespace-nowrap">
                    {new Date(log.createdAt).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    {log.userId ? (
                      <div>
                        <p className="font-medium text-sm text-zinc-900">{log.userId.firstName} {log.userId.lastName}</p>
                        <p className="text-xs text-zinc-500">{log.userId.email}</p>
                      </div>
                    ) : (
                      <span className="text-sm font-bold text-rose-600">SYSTEM</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="px-2 py-1 bg-zinc-100 text-zinc-700 text-xs font-bold rounded">
                      {log.module}
                    </span>
                  </TableCell>
                  <TableCell>
                    <p className="font-medium text-sm">{log.action}</p>
                    <p className="text-xs text-zinc-500 max-w-[200px] truncate">{log.description}</p>
                  </TableCell>
                  <TableCell>
                    <p className="text-xs font-mono font-bold text-zinc-700">{log.ipAddress}</p>
                    <p className="text-[10px] text-zinc-400 max-w-[150px] truncate" title={log.browser}>{log.browser}</p>
                  </TableCell>
                  <TableCell className="text-right">
                    {(log.oldValues || log.newValues) && (
                      <Button variant="ghost" size="sm" onClick={() => setSelectedLog(log)}>
                        <Eye className="h-4 w-4 text-indigo-600" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {filteredLogs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-zinc-500 italic">
                    No matching audit records found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* JSON Diff Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-zinc-950 w-full max-w-2xl rounded-xl shadow-2xl overflow-hidden border border-zinc-800 flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/50">
              <h2 className="text-lg font-semibold flex items-center text-zinc-100">
                <ShieldAlert className="mr-2 h-5 w-5 text-rose-500" /> State Change Details
              </h2>
              <button onClick={() => setSelectedLog(null)} className="text-zinc-400 hover:text-zinc-100">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-rose-500">Old Value (Before)</h4>
                  <pre className="p-4 bg-zinc-900 border border-zinc-800 rounded-lg text-xs font-mono overflow-auto max-h-[300px] text-zinc-300">
                    {JSON.stringify(selectedLog.oldValues, null, 2)}
                  </pre>
                </div>
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-500">New Value (After)</h4>
                  <pre className="p-4 bg-zinc-900 border border-zinc-800 rounded-lg text-xs font-mono overflow-auto max-h-[300px] text-emerald-400">
                    {JSON.stringify(selectedLog.newValues, null, 2)}
                  </pre>
                </div>
              </div>
              <div className="pt-4 border-t border-zinc-800">
                <p className="text-xs text-zinc-500 text-center">Action performed by {selectedLog.userId ? `${selectedLog.userId.firstName} ${selectedLog.userId.lastName}` : "SYSTEM"} from IP {selectedLog.ipAddress}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
