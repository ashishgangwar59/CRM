"use client";

import { useEffect, useState, useRef } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Plus, Filter, Calendar, Users, CheckSquare, Square, RefreshCw, CalendarDays, Check, Upload, Download, Lock, Unlock, CheckCircle, FileSpreadsheet } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function LeadsDashboardPage() {
  const router = useRouter();
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Auth and Employee States
  const [role, setRole] = useState<string | null>(null);
  const [employees, setEmployees] = useState<any[]>([]);

  // Navigation Tabs
  const [activeTab, setActiveTab] = useState<"pipeline" | "planner">("pipeline");

  // Filters
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [stage, setStage] = useState("");
  const [priority, setPriority] = useState("");
  const [employeeIdFilter, setEmployeeIdFilter] = useState("");
  const [dateFilter, setDateFilter] = useState(""); // today, yesterday, this_week, custom
  const [customDate, setCustomDate] = useState("");

  // Distribution State
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([]);
  const [scheduledDate, setScheduledDate] = useState("");
  const [distributing, setDistributing] = useState(false);

  // CSV Import State & Ref
  const csvInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);

  // Day-wise selection state
  const [selectedDayAndEmployee, setSelectedDayAndEmployee] = useState<{ employeeId: string; date: Date } | null>(null);

  // CSV Sample Export
  const downloadSampleCSV = () => {
    if (!isUserAdmin) {
      alert("Permission denied. Only Admin can download sample CSV template.");
      return;
    }
    const headers = ["FIRST_NAME", "SECOND_NAME", "MOBILE", "COMPANY", "ADDRESS1", "ADDRESS2", "ADDRESS3", "CITY", "STATE", "PINCODE", "REMARK"];
    const rows = [
      ["Rajesh", "Sharma", "9876543210", "Apex Solutions", "Plot 42", "Phase 2", "", "Delhi", "Delhi", "110059", "Interested in CRM software"],
      ["Anita", "Verma", "9123456789", "Niventra Capital", "Block B", "Suite 101", "", "Mumbai", "Maharashtra", "400001", "Requested call back"]
    ];
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.map(val => `"${val}"`).join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "lead_import_sample.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export current filtered leads to CSV
  const exportLeadsCSV = () => {
    if (!isUserAdmin) {
      alert("Permission denied. Only Admin can export leads to CSV.");
      return;
    }
    if (leads.length === 0) {
      alert("No leads available to export.");
      return;
    }
    const headers = ["First Name", "Last Name", "Email", "Phone", "Company", "Source", "Stage", "Status", "Priority", "Deal Value", "Owner", "Locked", "Created At"];
    const rows = leads.map(l => [
      l.firstName || "",
      l.lastName || "",
      l.email || "",
      l.phone || "",
      l.company || "",
      l.source || "",
      l.stage || "",
      l.status || "",
      l.priority || "",
      l.dealValue || 0,
      l.ownerId ? `${l.ownerId.firstName} ${l.ownerId.lastName}` : "Unassigned",
      l.isLocked ? "Locked" : "Unlocked",
      l.createdAt ? new Date(l.createdAt).toLocaleDateString() : ""
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.map(val => `"${val}"`).join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `leads_export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Admin Mark as Done
  const handleMarkDone = async (e: React.MouseEvent, leadId: string) => {
    e.stopPropagation();
    try {
      const res = await fetch(`/api/leads/${leadId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "markDone" })
      });
      const data = await res.json();
      if (data.success) {
        fetchLeads();
      } else {
        alert(data.error || "Failed to mark lead as done.");
      }
    } catch (e) {
      alert("Error marking lead as done.");
    }
  };

  // Admin Lock / Unlock Toggle
  const handleToggleLock = async (e: React.MouseEvent, leadId: string, currentLockState: boolean) => {
    e.stopPropagation();
    try {
      const res = await fetch(`/api/leads/${leadId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "toggleLock", isLocked: !currentLockState })
      });
      const data = await res.json();
      if (data.success) {
        fetchLeads();
      } else {
        alert(data.error || "Failed to toggle lock status.");
      }
    } catch (e) {
      alert("Error toggling lock status.");
    }
  };

  const handleImportCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    const formData = new FormData();
    formData.append("file", file);

    setImporting(true);
    try {
      const res = await fetch("/api/leads/import", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        if (data.errors && data.errors.length > 0) {
          alert(`Import complete!\nSuccessfully imported: ${data.imported} leads.\n\nErrors encountered:\n` + data.errors.slice(0, 5).join("\n"));
        } else {
          alert(`Successfully imported all ${data.imported} leads!`);
        }
        fetchLeads();
      } else {
        alert("Import failed: " + (data.error || "Unknown error"));
      }
    } catch (e) {
      alert("Error importing file.");
    } finally {
      setImporting(false);
      if (csvInputRef.current) csvInputRef.current.value = "";
    }
  };

  const fetchInitialData = async () => {
    try {
      const meRes = await fetch("/api/auth/me");
      const meData = await meRes.json();
      if (meData.success) {
        setRole(meData.role);
        if (meData.role === "ADMIN" || meData.role === "KEY_ADMIN") {
          const empRes = await fetch("/api/employees");
          const empData = await empRes.json();
          if (empData.success) {
            setEmployees(empData.data);
          }
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchLeads = async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams();
      if (search) query.append("search", search);
      if (status) query.append("status", status);
      if (stage) query.append("stage", stage);
      if (priority) query.append("priority", priority);
      if (employeeIdFilter) query.append("employeeId", employeeIdFilter);

      const effectiveDateFilter = dateFilter === "custom" ? customDate : dateFilter;
      if (effectiveDateFilter) query.append("dateFilter", effectiveDateFilter);

      const res = await fetch(`/api/leads?${query.toString()}`);
      const data = await res.json();
      if (data.success) {
        setLeads(data.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    fetchLeads();
  }, [status, stage, priority, employeeIdFilter, dateFilter, customDate]); // Search requires explicit submission

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchLeads();
  };

  const toggleLeadSelection = (leadId: string) => {
    setSelectedLeadIds(prev => 
      prev.includes(leadId) ? prev.filter(id => id !== leadId) : [...prev, leadId]
    );
  };

  const toggleAllLeads = () => {
    if (selectedLeadIds.length === leads.length) {
      setSelectedLeadIds([]);
    } else {
      setSelectedLeadIds(leads.map(lead => lead._id));
    }
  };

  const handleBulkDistribute = async () => {
    if (selectedLeadIds.length === 0) {
      alert("Please select at least one lead.");
      return;
    }
    if (selectedEmployeeIds.length === 0) {
      alert("Please select at least one employee to distribute to.");
      return;
    }

    setDistributing(true);
    try {
      const res = await fetch("/api/leads/distribute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadIds: selectedLeadIds,
          employeeIds: selectedEmployeeIds,
          scheduledDate: scheduledDate || undefined
        })
      });
      const data = await res.json();
      if (data.success) {
        alert(data.message);
        setSelectedLeadIds([]);
        setSelectedEmployeeIds([]);
        setScheduledDate("");
        fetchLeads();
      } else {
        alert(data.error || "Failed to distribute leads");
      }
    } catch (e) {
      alert("Error distributing leads");
    } finally {
      setDistributing(false);
    }
  };

  // Helper to generate next 7 days for the schedule workload grid
  const getNext7Days = () => {
    const days = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date();
      date.setDate(date.getDate() + i);
      days.push(date);
    }
    return days;
  };
  const next7Days = getNext7Days();

  // Helper to count leads for an employee on a specific date string
  const getWorkloadCount = (employeeId: string, date: Date) => {
    const dateStr = date.toDateString();
    return leads.filter(lead => {
      const leadOwnerId = lead.ownerId?._id || lead.ownerId;
      if (leadOwnerId !== employeeId) return false;
      if (!lead.nextFollowUp) return false;
      return new Date(lead.nextFollowUp).toDateString() === dateStr;
    }).length;
  };

  const isUserAdmin = role === "ADMIN" || role === "KEY_ADMIN";

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-24">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Lead Management</h1>
          <p className="text-zinc-500 dark:text-zinc-400">Track pipeline stages, assign leads, and monitor workloads.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {isUserAdmin && (
            <div className="flex border border-zinc-200 dark:border-zinc-800 rounded-lg p-0.5 bg-zinc-50 dark:bg-zinc-950">
              <button 
                onClick={() => setActiveTab("pipeline")}
                className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all ${activeTab === "pipeline" ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50 shadow-sm" : "text-zinc-500 hover:text-zinc-900"}`}
              >
                Lead Pipeline
              </button>
              <button 
                onClick={() => setActiveTab("planner")}
                className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all ${activeTab === "planner" ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50 shadow-sm" : "text-zinc-500 hover:text-zinc-900"}`}
              >
                Distribution Planner
              </button>
            </div>
          )}

          {isUserAdmin && (
            <>
              {/* Sample CSV Download Button */}
              <Button variant="outline" size="sm" onClick={downloadSampleCSV} title="Download Sample CSV Template">
                <Download className="mr-1.5 h-3.5 w-3.5 text-emerald-600" />
                Sample CSV
              </Button>

              {/* Export CSV Button */}
              <Button variant="outline" size="sm" onClick={exportLeadsCSV} title="Export Current Filtered Leads to CSV">
                <FileSpreadsheet className="mr-1.5 h-3.5 w-3.5 text-indigo-600" />
                Export CSV
              </Button>

              <input 
                type="file" 
                ref={csvInputRef} 
                accept=".csv,.xlsx,.xls" 
                className="hidden" 
                onChange={handleImportCSV} 
              />
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => csvInputRef.current?.click()} 
                disabled={importing}
              >
                <Upload className="mr-1.5 h-3.5 w-3.5" /> 
                {importing ? "Importing..." : "Import CSV"}
              </Button>
            </>
          )}
          <Link href="/dashboard/leads/new">
            <Button size="sm"><Plus className="mr-1.5 h-3.5 w-3.5" /> Add Lead</Button>
          </Link>
        </div>
      </div>

      {activeTab === "pipeline" ? (
        <>
          {/* Quick Summary KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm">
              <p className="text-xs font-semibold text-zinc-500 uppercase">Total Leads</p>
              <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 mt-1">{leads.length}</p>
            </div>
            <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm">
              <p className="text-xs font-semibold text-zinc-500 uppercase">🔒 Distributed & Locked</p>
              <p className="text-2xl font-bold text-amber-600 mt-1">{leads.filter(l => l.isLocked).length}</p>
            </div>
            <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm">
              <p className="text-xs font-semibold text-zinc-500 uppercase">✔️ Marked Done</p>
              <p className="text-2xl font-bold text-emerald-600 mt-1">{leads.filter(l => l.status === "Done" || l.status === "Closed Won").length}</p>
            </div>
            <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm">
              <p className="text-xs font-semibold text-zinc-500 uppercase">📅 Today / Scheduled</p>
              <p className="text-2xl font-bold text-indigo-600 mt-1">
                {leads.filter(l => {
                  const todayStr = new Date().toDateString();
                  return (l.createdAt && new Date(l.createdAt).toDateString() === todayStr) ||
                         (l.nextFollowUp && new Date(l.nextFollowUp).toDateString() === todayStr);
                }).length}
              </p>
            </div>
          </div>

          <Card>
            <CardContent className="p-4">
              <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
                <div className="md:col-span-2 space-y-1">
                  <label className="text-xs font-semibold text-zinc-500 uppercase">Search</label>
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-500" />
                    <Input 
                      placeholder="Search by name, company, email, phone..." 
                      className="pl-9"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </div>
                </div>

                {/* Day-Wise Date Filter */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-zinc-500 uppercase">Date Filter</label>
                  <select 
                    className="flex h-10 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900" 
                    value={dateFilter} 
                    onChange={e => setDateFilter(e.target.value)}
                  >
                    <option value="">All Dates</option>
                    <option value="today">Today</option>
                    <option value="yesterday">Yesterday</option>
                    <option value="this_week">This Week</option>
                    <option value="custom">Custom Date...</option>
                  </select>
                </div>

                {dateFilter === "custom" && (
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-zinc-500 uppercase">Select Date</label>
                    <Input 
                      type="date" 
                      value={customDate} 
                      onChange={e => setCustomDate(e.target.value)} 
                    />
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-zinc-500 uppercase">Stage</label>
                  <select className="flex h-10 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900" value={stage} onChange={e => setStage(e.target.value)}>
                    <option value="">All Stages</option>
                    <option value="New">New</option>
                    <option value="Contacted">Contacted</option>
                    <option value="Qualified">Qualified</option>
                    <option value="Proposal">Proposal</option>
                    <option value="Negotiation">Negotiation</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-zinc-500 uppercase">Status</label>
                  <select className="flex h-10 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900" value={status} onChange={e => setStatus(e.target.value)}>
                    <option value="">All Statuses</option>
                    <option value="Open">Open</option>
                    <option value="Done">Done ✔️</option>
                    <option value="Closed Won">Closed Won</option>
                    <option value="Closed Lost">Closed Lost</option>
                  </select>
                </div>
                {isUserAdmin && (
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-zinc-500 uppercase">Employee-Wise View</label>
                    <select 
                      className="flex h-10 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900" 
                      value={employeeIdFilter} 
                      onChange={e => setEmployeeIdFilter(e.target.value)}
                    >
                      <option value="">All Employees</option>
                      {employees.map(emp => (
                        <option key={emp._id} value={emp._id}>{emp.firstName} {emp.lastName}</option>
                      ))}
                    </select>
                  </div>
                )}
                <div className="md:col-span-6 flex justify-end">
                  <Button type="submit" variant="secondary">Filter Pipeline</Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-zinc-50 dark:bg-zinc-900/50">
                  <TableRow>
                    {isUserAdmin && (
                      <TableHead className="w-12 text-center">
                        <button onClick={toggleAllLeads} className="text-zinc-500 hover:text-zinc-800">
                          {selectedLeadIds.length === leads.length && leads.length > 0 ? (
                            <CheckSquare className="w-4 h-4 text-indigo-600" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>
                      </TableHead>
                    )}
                    <TableHead>Lock</TableHead>
                    <TableHead>Lead Name</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Stage / Status</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead>Next Follow-Up</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow><TableCell colSpan={isUserAdmin ? 9 : 8} className="text-center py-8">Loading...</TableCell></TableRow>
                  ) : leads.length === 0 ? (
                    <TableRow><TableCell colSpan={isUserAdmin ? 9 : 8} className="text-center py-8 text-zinc-500">No leads found matching your criteria.</TableCell></TableRow>
                  ) : (
                    leads.map((lead) => {
                      const isSelected = selectedLeadIds.includes(lead._id);
                      const isDone = lead.status === "Done" || lead.status === "Closed Won";
                      return (
                        <TableRow key={lead._id} className={`hover:bg-zinc-50/50 cursor-pointer ${isSelected ? "bg-indigo-50/30 dark:bg-indigo-950/10" : ""}`} onClick={() => router.push(`/dashboard/leads/${lead._id}`)}>
                          {isUserAdmin && (
                            <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                              <button onClick={() => toggleLeadSelection(lead._id)} className="text-zinc-500 hover:text-zinc-800">
                                {isSelected ? (
                                  <CheckSquare className="w-4 h-4 text-indigo-600" />
                                ) : (
                                  <Square className="w-4 h-4" />
                                )}
                              </button>
                            </TableCell>
                          )}
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            {isUserAdmin ? (
                              <button 
                                onClick={(e) => handleToggleLock(e, lead._id, !!lead.isLocked)} 
                                title={lead.isLocked ? "Click to Unlock Lead" : "Click to Lock Lead"}
                                className="p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors"
                              >
                                {lead.isLocked ? (
                                  <Lock className="w-4 h-4 text-rose-500" />
                                ) : (
                                  <Unlock className="w-4 h-4 text-zinc-400 hover:text-zinc-600" />
                                )}
                              </button>
                            ) : (
                              lead.isLocked ? <span title="Distributed & Locked by Admin"><Lock className="w-4 h-4 text-rose-500" /></span> : <Unlock className="w-4 h-4 text-zinc-300" />
                            )}
                          </TableCell>
                          <TableCell>
                            <p className="font-bold text-zinc-900 dark:text-zinc-50">{lead.firstName} {lead.lastName}</p>
                            <p className="text-xs text-zinc-500">{lead.email || lead.phone}</p>
                          </TableCell>
                          <TableCell className="font-medium text-zinc-700 dark:text-zinc-300">{lead.company || "-"}</TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1 items-start">
                              <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                                lead.stage === "New" ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" :
                                lead.stage === "Qualified" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" :
                                "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                              }`}>
                                {lead.stage}
                              </span>
                              {isDone ? (
                                <span className="inline-flex items-center text-[11px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                                  <CheckCircle className="w-3 h-3 mr-1" /> Done
                                </span>
                              ) : (
                                <span className="text-[10px] text-zinc-400 uppercase font-semibold">{lead.status}</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className={`text-xs font-bold ${
                              lead.priority === "High" ? "text-rose-600" : 
                              lead.priority === "Medium" ? "text-amber-600" : "text-zinc-500"
                            }`}>
                              {lead.priority}
                            </span>
                          </TableCell>
                          <TableCell className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                            {lead.ownerId ? (
                              <span className="flex items-center">
                                {lead.ownerId.firstName} {lead.ownerId.lastName}
                                {lead.isLocked && <span title="Distributed & Locked"><Lock className="w-3 h-3 text-rose-500 ml-1 inline" /></span>}
                              </span>
                            ) : (
                              <span className="text-zinc-400 font-normal">Unassigned</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {lead.nextFollowUp ? (
                              <span className="flex items-center text-xs font-medium text-zinc-600 dark:text-zinc-400">
                                <Calendar className="w-3 h-3 mr-1" />
                                {new Date(lead.nextFollowUp).toLocaleDateString()}
                              </span>
                            ) : (
                              <span className="text-xs text-zinc-400">Not set</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right space-x-1" onClick={(e) => e.stopPropagation()}>
                            {isUserAdmin && !isDone && (
                              <Button size="sm" variant="outline" className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200" onClick={(e) => handleMarkDone(e, lead._id)}>
                                <CheckCircle className="w-3.5 h-3.5 mr-1" /> Mark Done
                              </Button>
                            )}
                            <Button size="sm" variant="ghost" onClick={() => router.push(`/dashboard/leads/${lead._id}`)}>
                              View
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      ) : (
        /* Planner Tab */
        <div className="space-y-8">
          {/* Workload Calendar/Grid */}
          <Card>
            <CardHeader className="pb-4 border-b border-zinc-100 dark:border-zinc-800">
              <CardTitle className="text-lg flex items-center"><CalendarDays className="mr-2 h-5 w-5 text-indigo-500" /> Day-Wise Workload Tracker</CardTitle>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader className="bg-zinc-50 dark:bg-zinc-900/50">
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    {next7Days.map((day, idx) => (
                      <TableHead key={idx} className="text-center font-bold text-xs uppercase">
                        <div>{day.toLocaleDateString("en-US", { weekday: "short" })}</div>
                        <div className="text-[10px] text-zinc-400">{day.toLocaleDateString("en-US", { month: "short", day: "numeric" })}</div>
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employees.map(emp => (
                    <TableRow key={emp._id}>
                      <TableCell className="font-semibold text-sm text-zinc-900 dark:text-zinc-50">
                        {emp.firstName} {emp.lastName}
                      </TableCell>
                      {next7Days.map((day, idx) => {
                        const count = getWorkloadCount(emp._id, day);
                        const isSelected = selectedDayAndEmployee?.employeeId === emp._id && selectedDayAndEmployee?.date.toDateString() === day.toDateString();
                        return (
                          <TableCell 
                            key={idx} 
                            className={`text-center cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors ${isSelected ? "bg-indigo-50 dark:bg-indigo-950/20 ring-2 ring-indigo-500 ring-inset" : ""}`}
                            onClick={() => setSelectedDayAndEmployee({ employeeId: emp._id, date: day })}
                          >
                            <span className={`inline-flex items-center justify-center h-7 w-7 rounded-full text-xs font-bold ${
                              count > 5 ? "bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400" :
                              count > 2 ? "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400" :
                              count > 0 ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400" :
                              "bg-zinc-50 text-zinc-400 dark:bg-zinc-900/40"
                            }`}>
                              {count}
                            </span>
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Day-Wise Lead Detail Viewer */}
          {selectedDayAndEmployee && (
            <Card className="border-indigo-100 dark:border-indigo-900 bg-white dark:bg-zinc-950">
              <CardHeader className="pb-4 border-b border-zinc-100 dark:border-zinc-800 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
                    Leads Scheduled for {employees.find(e => e._id === selectedDayAndEmployee.employeeId)?.firstName || "Employee"} on {selectedDayAndEmployee.date.toLocaleDateString("en-US", { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                  </CardTitle>
                  <p className="text-xs text-zinc-500 mt-1">Detailed list of leads and follow-ups for this day.</p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setSelectedDayAndEmployee(null)}>Close List</Button>
              </CardHeader>
              <CardContent className="p-0 overflow-x-auto">
                <Table>
                  <TableHeader className="bg-zinc-50 dark:bg-zinc-900/50">
                    <TableRow>
                      <TableHead>Lead Name</TableHead>
                      <TableHead>Company</TableHead>
                      <TableHead>Phone / Email</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Remark</TableHead>
                      <TableHead>Stage / Priority</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {leads.filter(lead => {
                      const leadOwnerId = lead.ownerId?._id || lead.ownerId;
                      return leadOwnerId === selectedDayAndEmployee.employeeId && 
                             lead.nextFollowUp && 
                             new Date(lead.nextFollowUp).toDateString() === selectedDayAndEmployee.date.toDateString();
                    }).length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-zinc-500">
                          No leads scheduled for this day.
                        </TableCell>
                      </TableRow>
                    ) : (
                      leads.filter(lead => {
                        const leadOwnerId = lead.ownerId?._id || lead.ownerId;
                        return leadOwnerId === selectedDayAndEmployee.employeeId && 
                               lead.nextFollowUp && 
                               new Date(lead.nextFollowUp).toDateString() === selectedDayAndEmployee.date.toDateString();
                      }).map(lead => (
                        <TableRow key={lead._id} className="hover:bg-zinc-50/50 cursor-pointer" onClick={() => router.push(`/dashboard/leads/${lead._id}`)}>
                          <TableCell className="font-bold text-zinc-900 dark:text-zinc-50">
                            {lead.firstName} {lead.lastName}
                          </TableCell>
                          <TableCell className="text-sm text-zinc-700 dark:text-zinc-300">{lead.company || "-"}</TableCell>
                          <TableCell className="text-xs text-zinc-600 dark:text-zinc-400">
                            <div>{lead.phone || "-"}</div>
                            <div>{lead.email || ""}</div>
                          </TableCell>
                          <TableCell className="text-xs text-zinc-600 dark:text-zinc-400">
                            {lead.city || lead.state ? `${lead.city || ""}, ${lead.state || ""}` : "-"}
                          </TableCell>
                          <TableCell className="text-xs text-zinc-500 max-w-[200px] truncate" title={lead.remark}>
                            {lead.remark || "-"}
                          </TableCell>
                          <TableCell>
                            <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700 mr-2">
                              {lead.stage}
                            </span>
                            <span className={`text-xs font-bold ${lead.priority === "High" ? "text-rose-600" : "text-zinc-500"}`}>
                              {lead.priority}
                            </span>
                          </TableCell>
                          <TableCell className="text-right" onClick={e => e.stopPropagation()}>
                            <Button size="sm" variant="outline" onClick={() => router.push(`/dashboard/leads/${lead._id}`)}>
                              Manage
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* Planner Bulk Distribute Panel */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: Leads Selector */}
            <div className="lg:col-span-2 space-y-4">
              <Card>
                <CardHeader className="pb-4 border-b border-zinc-100 dark:border-zinc-800">
                  <CardTitle className="text-lg flex items-center"><CheckSquare className="mr-2 h-5 w-5 text-emerald-500" /> Select Leads to Distribute</CardTitle>
                </CardHeader>
                <CardContent className="p-0 max-h-[400px] overflow-y-auto">
                  <Table>
                    <TableHeader className="sticky top-0 bg-zinc-50 dark:bg-zinc-900 z-10">
                      <TableRow>
                        <TableHead className="w-12 text-center">
                          <button onClick={toggleAllLeads} className="text-zinc-500 hover:text-zinc-800">
                            {selectedLeadIds.length === leads.length && leads.length > 0 ? (
                              <CheckSquare className="w-4 h-4 text-indigo-600" />
                            ) : (
                              <Square className="w-4 h-4" />
                            )}
                          </button>
                        </TableHead>
                        <TableHead>Lead</TableHead>
                        <TableHead>Status / Stage</TableHead>
                        <TableHead>Current Owner</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {leads.length === 0 ? (
                        <TableRow><TableCell colSpan={4} className="text-center py-8 text-zinc-500">No leads found.</TableCell></TableRow>
                      ) : (
                        leads.map(lead => {
                          const isSelected = selectedLeadIds.includes(lead._id);
                          return (
                            <TableRow key={lead._id} className="hover:bg-zinc-50/50 cursor-pointer" onClick={() => toggleLeadSelection(lead._id)}>
                              <TableCell className="text-center" onClick={e => e.stopPropagation()}>
                                <button onClick={() => toggleLeadSelection(lead._id)} className="text-zinc-500 hover:text-zinc-800">
                                  {isSelected ? (
                                    <CheckSquare className="w-4 h-4 text-indigo-600" />
                                  ) : (
                                    <Square className="w-4 h-4" />
                                  )}
                                </button>
                              </TableCell>
                              <TableCell>
                                <p className="font-semibold text-sm text-zinc-900 dark:text-zinc-50">{lead.firstName} {lead.lastName}</p>
                                <p className="text-xs text-zinc-500">{lead.company || "-"}</p>
                              </TableCell>
                              <TableCell className="text-xs font-bold">
                                {lead.stage} ({lead.status})
                              </TableCell>
                              <TableCell className="text-xs text-zinc-600">
                                {lead.ownerId ? `${lead.ownerId.firstName} ${lead.ownerId.lastName}` : "Unassigned"}
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>

            {/* Right: Destination Planner Config */}
            <div className="lg:col-span-1 space-y-4">
              <Card>
                <CardHeader className="pb-4 border-b border-zinc-100 dark:border-zinc-800">
                  <CardTitle className="text-lg flex items-center"><Users className="mr-2 h-5 w-5 text-indigo-500" /> Target Employees & Schedule</CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                  {/* Select Employees */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-500 uppercase flex justify-between items-center">
                      <span>Employees</span>
                      <button 
                        onClick={() => {
                          if (selectedEmployeeIds.length === employees.length) {
                            setSelectedEmployeeIds([]);
                          } else {
                            setSelectedEmployeeIds(employees.map(e => e._id));
                          }
                        }}
                        className="text-xs font-bold text-indigo-600 hover:underline hover:bg-transparent lowercase"
                      >
                        {selectedEmployeeIds.length === employees.length ? "deselect all" : "select all"}
                      </button>
                    </label>
                    <div className="max-h-[160px] overflow-y-auto border border-zinc-200 dark:border-zinc-800 rounded-lg p-2 divide-y divide-zinc-100 dark:divide-zinc-800 space-y-1">
                      {employees.map(emp => {
                        const isChecked = selectedEmployeeIds.includes(emp._id);
                        return (
                          <div 
                            key={emp._id} 
                            onClick={() => {
                              setSelectedEmployeeIds(prev => 
                                prev.includes(emp._id) ? prev.filter(id => id !== emp._id) : [...prev, emp._id]
                              );
                            }}
                            className="flex items-center space-x-2 py-1.5 cursor-pointer hover:bg-zinc-50 px-2 rounded"
                          >
                            <div className="h-4 w-4 flex items-center justify-center rounded border border-zinc-300 bg-white">
                              {isChecked && <Check className="h-3 w-3 text-indigo-600 font-bold" />}
                            </div>
                            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{emp.firstName} {emp.lastName}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Scheduled Target Day */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-500 uppercase">Target Day / Follow-Up Date</label>
                    <Input 
                      type="date" 
                      value={scheduledDate} 
                      onChange={e => setScheduledDate(e.target.value)} 
                    />
                    <p className="text-[10px] text-zinc-400">Optionally assign follow-up tasks to these distributed leads on a specific day.</p>
                  </div>

                  {/* Distribute Button */}
                  <Button 
                    className="w-full flex items-center justify-center" 
                    onClick={handleBulkDistribute} 
                    disabled={distributing}
                  >
                    {distributing ? (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                        Distributing...
                      </>
                    ) : (
                      `Distribute ${selectedLeadIds.length} Leads`
                    )}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )}

      {/* Floating Action Bar for Quick distribution from Pipeline list */}
      {isUserAdmin && activeTab === "pipeline" && selectedLeadIds.length > 0 && (
        <div className="fixed bottom-6 left-6 right-6 lg:left-72 bg-zinc-950 text-white rounded-xl shadow-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 z-50 animate-in fade-in slide-in-from-bottom-5 duration-300">
          <div className="flex items-center space-x-3">
            <span className="inline-flex items-center justify-center bg-indigo-600 text-white h-7 w-7 rounded-full text-xs font-bold shadow-md">
              {selectedLeadIds.length}
            </span>
            <span className="text-sm font-semibold text-zinc-200">leads selected for bulk distribution</span>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            {/* Quick Employee Select */}
            <div className="min-w-[180px]">
              <select 
                className="flex h-9 w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 py-1 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                value={selectedEmployeeIds.length === 1 ? selectedEmployeeIds[0] : ""}
                onChange={(e) => {
                  const val = e.target.value;
                  setSelectedEmployeeIds(val ? [val] : []);
                }}
              >
                <option value="">Select Employee...</option>
                {employees.map(emp => (
                  <option key={emp._id} value={emp._id}>{emp.firstName} {emp.lastName}</option>
                ))}
              </select>
            </div>

            {/* Quick Date Select */}
            <input 
              type="date" 
              className="flex h-9 rounded-md border border-zinc-800 bg-zinc-900 px-3 py-1 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
              value={scheduledDate}
              onChange={(e) => setScheduledDate(e.target.value)}
            />

            <Button 
              size="sm" 
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold"
              disabled={distributing}
              onClick={handleBulkDistribute}
            >
              {distributing ? "Assigning..." : "Assign"}
            </Button>
            <Button 
              size="sm" 
              variant="ghost" 
              className="text-zinc-400 hover:text-white"
              onClick={() => {
                setSelectedLeadIds([]);
                setSelectedEmployeeIds([]);
                setScheduledDate("");
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

