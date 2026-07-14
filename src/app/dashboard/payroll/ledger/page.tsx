"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { IndianRupee, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

export default function SalaryLedgerPage() {
  const router = useRouter();
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchHistory = async () => {
    try {
      const res = await fetch("/api/payroll/payment/history");
      const data = await res.json();
      if (data.success) {
        setHistory(data.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  if (loading) return <div className="p-8">Loading salary ledger...</div>;

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-10">
      <div className="flex items-center space-x-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Salary Ledger</h1>
          <p className="text-zinc-500 dark:text-zinc-400">Transaction history of all bulk and single salary payments.</p>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-zinc-50 dark:bg-zinc-900/50">
              <TableRow>
                <TableHead>Date Executed</TableHead>
                <TableHead>Reference Number</TableHead>
                <TableHead>Month</TableHead>
                <TableHead>Employee Count</TableHead>
                <TableHead className="text-right font-bold text-emerald-700">Total Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Executed By</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {history.map((record) => (
                <TableRow key={record._id}>
                  <TableCell className="font-mono text-xs text-zinc-500">
                    {new Date(record.createdAt).toLocaleString()}
                  </TableCell>
                  <TableCell className="font-mono font-medium text-indigo-600 dark:text-indigo-400">
                    {record.paymentReferenceNumber}
                  </TableCell>
                  <TableCell className="font-medium">{record.monthYear}</TableCell>
                  <TableCell>{record.payrolls.length} Salaries</TableCell>
                  <TableCell className="text-right font-bold flex items-center justify-end">
                    <IndianRupee className="h-4 w-4 mr-1" />
                    {record.totalAmount.toLocaleString()}
                  </TableCell>
                  <TableCell>
                    {record.status === "Success" && (
                      <span className="px-2 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700">Success</span>
                    )}
                    {record.status === "Failed" && (
                      <div className="flex flex-col">
                        <span className="px-2 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-700 w-fit">Failed</span>
                        <span className="text-[10px] text-rose-500 mt-1 max-w-[150px] truncate" title={record.failureReason}>{record.failureReason}</span>
                      </div>
                    )}
                    {record.status === "Pending" && (
                      <span className="px-2 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-700">Pending</span>
                    )}
                  </TableCell>
                  <TableCell className="text-xs">
                    {record.createdBy?.firstName} {record.createdBy?.lastName}
                  </TableCell>
                </TableRow>
              ))}
              {history.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-zinc-500 py-8">
                    No payment batches found.
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
