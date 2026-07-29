"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Calendar, Plus, Edit, Trash2 } from "lucide-react";

export default function HolidaysPage() {
  const [role, setRole] = useState<string | null>(null);
  const [holidays, setHolidays] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editingHolidayId, setEditingHolidayId] = useState<string | null>(null);
  
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
        setFormData({ name: "", date: "", type: "Public", description: "" });
        fetchHolidays();
      } else {
        alert(data.error);
      }
    } catch (e) {
      alert("Error adding holiday");
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingHolidayId) {
      try {
        const res = await fetch(`/api/holidays/${editingHolidayId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData)
        });
        const data = await res.json();
        if (data.success) {
          alert("Holiday updated successfully!");
          setShowAdd(false);
          setEditingHolidayId(null);
          setFormData({ name: "", date: "", type: "Public", description: "" });
          fetchHolidays();
        } else {
          alert(data.error);
        }
      } catch (e) {
        alert("Error updating holiday");
      }
    } else {
      handleAdd(e);
    }
  };

  const startEdit = (holiday: any) => {
    // Format ISO date to YYYY-MM-DD
    const dateObj = new Date(holiday.date);
    const formattedDate = dateObj.toISOString().split("T")[0];
    setFormData({
      name: holiday.name,
      date: formattedDate,
      type: holiday.type,
      description: holiday.description || ""
    });
    setEditingHolidayId(holiday._id);
    setShowAdd(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this holiday?")) return;
    try {
      const res = await fetch(`/api/holidays/${id}`, {
        method: "DELETE"
      });
      const data = await res.json();
      if (data.success) {
        alert("Holiday deleted successfully!");
        fetchHolidays();
      } else {
        alert(data.error);
      }
    } catch (e) {
      alert("Error deleting holiday");
    }
  };

  const cancelAdd = () => {
    setShowAdd(false);
    setEditingHolidayId(null);
    setFormData({ name: "", date: "", type: "Public", description: "" });
  };

  const isUserAdmin = role === "ADMIN" || role === "KEY_ADMIN";

  if (loading) return <div className="p-8">Loading holiday calendar...</div>;

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Holiday Calendar</h1>
          <p className="text-zinc-500 dark:text-zinc-400">View upcoming company and public holidays.</p>
        </div>
        {isUserAdmin && (
          <Button onClick={() => { setEditingHolidayId(null); setShowAdd(!showAdd); }}>
            <Plus className="mr-2 h-4 w-4" /> Add Holiday
          </Button>
        )}
      </div>

      {showAdd && (
        <Card className="border-indigo-200 dark:border-indigo-900 bg-indigo-50/50 dark:bg-indigo-900/10">
          <CardHeader>
            <CardTitle>{editingHolidayId ? "Edit Holiday" : "Add New Holiday"}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSave} className="space-y-4">
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
                <Button variant="outline" type="button" onClick={cancelAdd}>Cancel</Button>
                <Button type="submit">{editingHolidayId ? "Update Holiday" : "Save Holiday"}</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {holidays.map(holiday => (
          <Card key={holiday._id} className="hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors relative group">
            <CardContent className="p-6 flex items-start space-x-4">
              <div className="h-12 w-12 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center flex-shrink-0 text-indigo-600 dark:text-indigo-400">
                <Calendar className="h-6 w-6" />
              </div>
              <div className="flex-1 pr-6">
                <h3 className="font-semibold text-lg text-zinc-900 dark:text-zinc-50">{holiday.name}</h3>
                <p className="text-zinc-500 dark:text-zinc-400 font-medium">{new Date(holiday.date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                <div className="mt-2 inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-zinc-950 focus:ring-offset-2 dark:focus:ring-zinc-300 border-transparent bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50">
                  {holiday.type}
                </div>
                {holiday.description && <p className="text-sm mt-2 text-zinc-600 dark:text-zinc-400">{holiday.description}</p>}
              </div>
              
              {isUserAdmin && (
                <div className="absolute right-4 top-4 flex items-center space-x-1.5">
                  <Button 
                    size="icon" 
                    variant="ghost" 
                    className="h-8 w-8 text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 border border-indigo-200 dark:border-indigo-800/80 shadow-xs" 
                    title="Edit Holiday"
                    onClick={() => startEdit(holiday)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button 
                    size="icon" 
                    variant="ghost" 
                    className="h-8 w-8 text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 border border-rose-200 dark:border-rose-800/80 shadow-xs" 
                    title="Delete Holiday"
                    onClick={() => handleDelete(holiday._id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              )}
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
