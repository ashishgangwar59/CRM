"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Wallet, ArrowUpRight, ArrowDownRight, Download, Plus } from "lucide-react";

export default function WalletDashboardPage() {
  const [wallet, setWallet] = useState<{ balance: number; transactions: any[] } | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    type: "Credit",
    amount: "",
    description: "",
    upiRef: ""
  });

  const fetchWallet = async () => {
    try {
      const res = await fetch("/api/wallet");
      const data = await res.json();
      if (data.success) {
        setWallet(data.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWallet();
  }, []);

  const handleTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/wallet/transaction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: formData.type === "UPI Top-up" ? "Credit" : formData.type,
          amount: Number(formData.amount),
          description: formData.type === "UPI Top-up" ? `${formData.description} (UPI Ref: ${formData.upiRef})` : formData.description
        })
      });
      const data = await res.json();
      if (data.success) {
        alert(data.message);
        setShowForm(false);
        setFormData({ type: "Credit", amount: "", description: "", upiRef: "" });
        fetchWallet();
      } else {
        alert(data.error);
      }
    } catch (e) {
      alert("Transaction failed");
    }
  };

  const exportStatement = () => {
    alert("Export feature will generate an Excel statement of the ledger.");
  };

  if (loading) return <div className="p-8">Loading wallet...</div>;

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Company Wallet</h1>
          <p className="text-zinc-500 dark:text-zinc-400">Manage central funds and view the financial ledger.</p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={exportStatement}>
            <Download className="mr-2 h-4 w-4" /> Export Statement
          </Button>
          <Button onClick={() => setShowForm(!showForm)}>
            <Plus className="mr-2 h-4 w-4" /> New Transaction
          </Button>
        </div>
      </div>

      <Card className="bg-zinc-950 border-zinc-900 text-white dark:bg-zinc-900 overflow-hidden relative">
        <div className="absolute top-0 right-0 p-12 opacity-10 pointer-events-none">
          <Wallet className="w-64 h-64" />
        </div>
        <CardContent className="p-10 relative z-10">
          <p className="text-zinc-400 font-medium uppercase tracking-wider text-sm mb-2">Available Balance</p>
          <h2 className="text-6xl font-black tracking-tighter">
            ₹{(wallet?.balance || 0).toLocaleString()}
          </h2>
        </CardContent>
      </Card>

      {showForm && (
        <Card className="border-indigo-200 dark:border-indigo-900 bg-indigo-50/50 dark:bg-indigo-900/10">
          <CardHeader>
            <CardTitle>Manual Transaction</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleTransaction} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Transaction Type</Label>
                  <select 
                    className="flex h-10 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:focus:ring-zinc-300"
                    value={formData.type}
                    onChange={(e) => setFormData({...formData, type: e.target.value})}
                  >
                    <option value="Credit">Credit (Add Funds)</option>
                    <option value="Debit">Debit (Withdraw Funds)</option>
                    <option value="UPI Top-up">UPI Top-up</option>
                  </select>
                </div>
                {formData.type === "UPI Top-up" && (
                  <div className="space-y-2">
                    <Label>UPI Reference No.</Label>
                    <Input required value={formData.upiRef} onChange={(e) => setFormData({...formData, upiRef: e.target.value})} placeholder="e.g. 123456789012" />
                  </div>
                )}
                <div className="space-y-2">
                  <Label>Amount (₹)</Label>
                  <Input type="number" required min="1" value={formData.amount} onChange={(e) => setFormData({...formData, amount: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Input required value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} placeholder="e.g. Bank Transfer" />
                </div>
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" type="button" onClick={() => setShowForm(false)}>Cancel</Button>
                <Button type="submit">Execute Transaction</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Ledger (Audit Log)</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Balance After</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {wallet?.transactions.map(tx => (
                <TableRow key={tx._id}>
                  <TableCell className="text-xs text-zinc-500 font-mono">
                    {new Date(tx.createdAt).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <p className="font-medium">{tx.description}</p>
                    <p className="text-xs text-zinc-500">By {tx.createdBy?.firstName} {tx.createdBy?.lastName}</p>
                  </TableCell>
                  <TableCell>
                    {tx.type === "Credit" ? (
                      <span className="flex items-center text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full w-fit text-xs font-bold">
                        <ArrowUpRight className="h-3 w-3 mr-1" /> Credit
                      </span>
                    ) : (
                      <span className="flex items-center text-rose-600 bg-rose-50 px-2 py-1 rounded-full w-fit text-xs font-bold">
                        <ArrowDownRight className="h-3 w-3 mr-1" /> Debit
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {tx.type === "Credit" ? "+" : "-"}₹{tx.amount.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right font-bold text-zinc-900 dark:text-zinc-50">
                    ₹{tx.balanceAfter.toLocaleString()}
                  </TableCell>
                </TableRow>
              ))}
              {wallet?.transactions.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-zinc-500 py-8">
                    No transactions found in ledger.
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
