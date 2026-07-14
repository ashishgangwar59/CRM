"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Bell, Mail, Smartphone, RadioTower, CheckCircle, XCircle } from "lucide-react";

export default function NotificationLogsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const res = await fetch("/api/reports/notifications");
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

  if (loading) return <div className="p-8">Loading notification logs...</div>;

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-24">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 flex items-center">
          <RadioTower className="mr-3 h-8 w-8 text-indigo-600" />
          Notification Engine Logs
        </h1>
        <p className="text-zinc-500 dark:text-zinc-400">Live audit trail of all outgoing system communications (Email, SMS, Push).</p>
      </div>

      <Card>
        <CardHeader className="bg-zinc-50/50">
          <CardTitle className="text-sm font-semibold uppercase tracking-wider text-zinc-500">Recent Dispatches</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Channel</TableHead>
                <TableHead>Trigger Event</TableHead>
                <TableHead>Recipient</TableHead>
                <TableHead>Message Payload</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Timestamp</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map(log => (
                <TableRow key={log._id}>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      {log.channel === "Email" && <Mail className="h-4 w-4 text-blue-500" />}
                      {log.channel === "SMS" && <Smartphone className="h-4 w-4 text-emerald-500" />}
                      {log.channel === "Push" && <Bell className="h-4 w-4 text-purple-500" />}
                      <span className="font-medium text-sm">{log.channel}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="px-2 py-1 bg-zinc-100 text-zinc-700 text-xs font-bold rounded">
                      {log.triggerEvent}
                    </span>
                  </TableCell>
                  <TableCell>
                    <p className="font-medium text-sm text-zinc-900">{log.recipientId?.firstName} {log.recipientId?.lastName}</p>
                    <p className="text-xs text-zinc-500">
                      {log.channel === "Email" ? log.recipientId?.email : log.channel === "SMS" ? log.recipientId?.phone : "App User"}
                    </p>
                  </TableCell>
                  <TableCell>
                    <p className="text-xs text-zinc-600 max-w-xs truncate" title={log.message}>
                      {log.message}
                    </p>
                  </TableCell>
                  <TableCell>
                    {log.status === "Sent" ? (
                      <span className="flex items-center text-xs font-bold text-emerald-600">
                        <CheckCircle className="mr-1 h-3 w-3" /> Sent
                      </span>
                    ) : (
                      <span className="flex items-center text-xs font-bold text-rose-600">
                        <XCircle className="mr-1 h-3 w-3" /> Failed
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-zinc-500 font-mono">
                    {new Date(log.createdAt).toLocaleString()}
                  </TableCell>
                </TableRow>
              ))}
              {logs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-zinc-500 italic">
                    The notification engine has not dispatched any messages yet. Generate a payroll to trigger an event!
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
