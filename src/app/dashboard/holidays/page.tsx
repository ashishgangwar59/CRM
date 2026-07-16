"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Calendar, Plus } from "lucide-react";

export default function HolidaysPage() {
  const [role, setRole] = useState<string | null>(null);
  const [holidays, setHolidays] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  
  const [formData, setFormData] = useState({
    name: "",
    date: "",
    type: "Public",
    description: ""
  });

  const fetchHolidays = async () => {
    try {
      const res = await fetch("/api/holidays");
      const data = await res.json();
      if (data.success) {
        setHolidays(data.data);
      }
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
    fetchHolidays();
    fetchRole();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/holidays", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (data.success) {
        alert("Holiday added successfully!");
        setShowAdd(false);
        fetchHolidays();
      } else {
        alert(data.error);
      }
    } catch (e) {
      alert("Error adding holiday");
    }
  };

  if (loading) return <div className="p-8">Loading holiday calendar...</div>;

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Holiday Calendar</h1>
          <p className="text-zinc-500 dark:text-zinc-400">View upcoming company and public holidays.</p>
        </div>
        {(role === "ADMIN" || role === "KEY_ADMIN") && (
          <Button onClick={() => setShowAdd(!showAdd)}>
            <Plus className="mr-2 h-4 w-4" /> Add Holiday
          </Button>
        )}
      </div>

      {showAdd && (
        <Card className="border-indigo-200 dark:border-indigo-900 bg-indigo-50/50 dark:bg-indigo-900/10">
          <CardHeader>
            <CardTitle>Add New Holiday</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAdd} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Holiday Name</Label>
                  <Input required value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} placeholder="e.g. Christmas" />
                </div>
                <div className="space-y-2">
                  <Label>Date</Label>
                  <Input type="date" required value={formData.date} onChange={(e) => setFormData({...formData, date: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>Type</Label>
                  <select 
                    className="flex h-10 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:focus:ring-zinc-300"
                    value={formData.type}
                    onChange={(e) => setFormData({...formData, type: e.target.value})}
                  >
                    <option value="Public">Public Holiday</option>
                    <option value="Company">Company Holiday</option>
                    <option value="Optional">Optional Holiday</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Input value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} placeholder="Optional description..." />
                </div>
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" type="button" onClick={() => setShowAdd(false)}>Cancel</Button>
                <Button type="submit">Save Holiday</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {holidays.map(holiday => (
          <Card key={holiday._id} className="hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors">
            <CardContent className="p-6 flex items-start space-x-4">
              <div className="h-12 w-12 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center flex-shrink-0 text-indigo-600 dark:text-indigo-400">
                <Calendar className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-semibold text-lg text-zinc-900 dark:text-zinc-50">{holiday.name}</h3>
                <p className="text-zinc-500 dark:text-zinc-400 font-medium">{new Date(holiday.date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                <div className="mt-2 inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-zinc-950 focus:ring-offset-2 dark:focus:ring-zinc-300 border-transparent bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50">
                  {holiday.type}
                </div>
                {holiday.description && <p className="text-sm mt-2 text-zinc-600 dark:text-zinc-400">{holiday.description}</p>}
              </div>
            </CardContent>
          </Card>
        ))}
        {holidays.length === 0 && (
          <div className="md:col-span-3 text-center py-12 text-zinc-500">
            No upcoming holidays found.
          </div>
        )}
      </div>
    </div>
  );
}
