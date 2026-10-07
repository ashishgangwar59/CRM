"use client";

import { useEffect, useState, useRef } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Plus, User, Upload, Download, Loader2, List, Layers, Trash2, Link2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useDebounce } from "@/hooks/useDebounce";

function TreeNode({ node, router }: { node: any; router: any }) {
  return (
    <div className="pl-6 border-l-2 border-zinc-200 dark:border-zinc-800 ml-4 mt-3 relative">
      <div className="absolute left-0 top-[22px] w-4 border-t-2 border-zinc-200 dark:border-zinc-800" />
      
      <div 
        className="flex items-center space-x-3 bg-white dark:bg-zinc-900 p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm max-w-sm hover:border-indigo-500 hover:shadow transition-all cursor-pointer"
        onClick={() => router.push(`/dashboard/employees/${node._id}`)}
      >
        <div className="h-9 w-9 rounded-full bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-700 dark:text-indigo-400 text-sm font-bold border border-indigo-100 dark:border-indigo-900">
          {node.firstName[0]}{node.lastName[0]}
        </div>
        <div>
          <p className="font-semibold text-sm text-zinc-900 dark:text-zinc-50">{node.firstName} {node.lastName}</p>
          <p className="text-xs text-zinc-500">{node.designation || "Staff"} • {node.employeeCode}</p>
        </div>
      </div>
      {node.children && node.children.length > 0 && (
        <div className="space-y-1">
          {node.children.map((child: any) => (
            <TreeNode key={child._id} node={child} router={router} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function EmployeesPage() {
  const router = useRouter();
  const [employees, setEmployees] = useState([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [activeTab, setActiveTab] = useState<"list" | "hierarchy" >("list");
  const [allEmployees, setAllEmployees] = useState([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [loadingHierarchy, setLoadingHierarchy] = useState(false);
  const [role, setRole] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const debouncedSearch = useDebounce(search, 500);

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(true);

  // Bulk Permissions State
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkModules, setBulkModules] = useState<string[]>([]);
  const [bulkAction, setBulkAction] = useState<"add" | "remove">("add");
  const [savingBulk, setSavingBulk] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/employees?search=${encodeURIComponent(debouncedSearch)}&status=${status}&page=${page}&limit=${limit}`);
      const data = await res.json();
      if (data.success) {
        setEmployees(data.data);
        if (data.pagination) {
          setTotalPages(data.pagination.totalPages || 1);
          setTotalItems(data.pagination.total || 0);
        } else {
          setTotalPages(1);
          setTotalItems(data.data.length || 0);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllEmployeesForHierarchy = async () => {
    setLoadingHierarchy(true);
    try {
      const res = await fetch(`/api/employees?limit=100000`);
      const data = await res.json();
      if (data.success) {
        setAllEmployees(data.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingHierarchy(false);
    }
  };

  const fetchTeamsForHierarchy = async () => {
    try {
      const res = await fetch(`/api/teams`, { cache: 'no-store' });
      const data = await res.json();
      if (data.success) {
        setTeams(data.data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, status, limit]);

  const fetchAuth = async () => {
    try {
      const res = await fetch("/api/auth/me");
      const data = await res.json();
      if (data.success) {
        setRole(data.role || "");
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchAuth();
  }, []);

  useEffect(() => {
    fetchEmployees();
  }, [debouncedSearch, status, page, limit]);

  useEffect(() => {
    if (activeTab === "hierarchy") {
      if (allEmployees.length === 0) fetchAllEmployeesForHierarchy();
      if (teams.length === 0) fetchTeamsForHierarchy();
    }
  }, [activeTab]);

  const handleExport = () => {
    window.location.href = `/api/employees/export?search=${encodeURIComponent(debouncedSearch)}&status=${status}`;
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    const file = e.target.files[0];
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/employees/import", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        alert(`Successfully imported ${data.imported} employees.`);
        fetchEmployees();
      } else {
        alert("Import failed: " + JSON.stringify(data.errors));
      }
    } catch (e) {
      console.error(e);
      alert("Error importing file.");
    }
    
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete ${name}? This action cannot be undone.`)) {
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/employees/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        fetchEmployees();
      } else {
        alert(data.error || "Failed to delete employee");
      }
    } catch (e) {
      console.error(e);
      alert("Error deleting employee");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Build Team Hierarchy
  const teamRoots = teams.map((team: any) => {
    const ownerEmail = team.owner?.email;
    const ownerEmp = ownerEmail ? allEmployees.find((e: any) => e.email === ownerEmail) : null;
    
    const memberEmails = (team.members || []).map((m: any) => m.email);
    const memberEmps = allEmployees.filter((e: any) => memberEmails.includes(e.email)).map((emp: any) => ({...emp, children: []}));
    
    if (ownerEmp) {
      return {
        ...ownerEmp,
        teamName: team.name,
        teamDepartment: team.department,
        children: memberEmps
      };
    } else {
      return {
        _id: `team-${team._id}`,
        firstName: team.name,
        lastName: "(Team - No Owner)",
        designation: team.department || "Unassigned",
        employeeCode: "-",
        children: memberEmps,
        isMock: true,
        teamName: team.name,
        teamDepartment: team.department
      };
    }
  });

  return (
    <div className="space-y-6">
      {isSubmitting && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-white font-medium">Processing...</p>
        </div>
      )}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Employees</h1>
          <p className="text-zinc-500 dark:text-zinc-400">Manage your workforce, departments, and records.</p>
        </div>
        <div className="flex space-x-2">
          {(role === "ADMIN" || role === "KEY_ADMIN") && (
            <>
              <input 
                type="file" 
                accept=".xlsx, .xls" 
                className="hidden" 
                ref={fileInputRef} 
                onChange={handleImport}
              />
              <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                <Upload className="mr-2 h-4 w-4" /> Import Excel
              </Button>
              <Button variant="outline" onClick={handleExport}>
                <Download className="mr-2 h-4 w-4" /> Export Excel
              </Button>
              {selectedEmployees.length > 0 && (
                <Button variant="secondary" onClick={() => setShowBulkModal(true)} className="bg-indigo-100 text-indigo-700 hover:bg-indigo-200 border border-indigo-200">
                  Bulk Permissions ({selectedEmployees.length})
                </Button>
              )}
              <Link href="/dashboard/employees/new">
                <Button>
                  <Plus className="mr-2 h-4 w-4" /> Add Employee
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>

      {/* View Selector Tabs */}
      <div className="flex border-b border-zinc-200 dark:border-zinc-800 space-x-4">
        <button
          onClick={() => setActiveTab("list")}
          className={`flex items-center space-x-2 py-3 px-4 text-sm font-semibold border-b-2 transition-all ${
            activeTab === "list" 
              ? "border-indigo-600 text-indigo-600" 
              : "border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
          }`}
        >
          <List className="h-4 w-4" />
          <span>Directory List</span>
        </button>
        {(role === "ADMIN" || role === "KEY_ADMIN") && (
          <button
            onClick={() => setActiveTab("hierarchy")}
            className={`flex items-center space-x-2 py-3 px-4 text-sm font-semibold border-b-2 transition-all ${
              activeTab === "hierarchy" 
                ? "border-indigo-600 text-indigo-600" 
                : "border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
            }`}
          >
            <Layers className="h-4 w-4" />
            <span>Team Hierarchy</span>
          </button>
        )}
      </div>

      {activeTab === "list" ? (
        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center space-x-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                <Input 
                  placeholder="Search employees by name, email, or code..." 
                  className="pl-10"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <select 
                className="flex h-10 w-48 rounded-md border border-zinc-300 bg-transparent px-3 py-2 text-sm placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-50 dark:focus:ring-zinc-300"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="">All Statuses</option>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
                <option value="Notice Period">Notice Period</option>
                <option value="Resigned">Resigned</option>
                <option value="Absconding">Absconding</option>
              </select>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  {(role === "ADMIN" || role === "KEY_ADMIN") && (
                    <TableHead className="w-12">
                      <input 
                        type="checkbox" 
                        className="rounded border-zinc-300"
                        checked={employees.length > 0 && selectedEmployees.length === employees.length}
                        onChange={(e) => {
                          if (e.target.checked) setSelectedEmployees(employees.map((emp: any) => emp._id));
                          else setSelectedEmployees([]);
                        }}
                      />
                    </TableHead>
                  )}
                  <TableHead>Employee</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Designation</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-center">Form Link</TableHead>
                  {(role === "ADMIN" || role === "KEY_ADMIN") && <TableHead className="text-center">Action</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      <div className="flex flex-col items-center justify-center text-zinc-500">
                        <Loader2 className="w-6 h-6 animate-spin text-indigo-600 mb-2" />
                        <span>Loading employees...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : employees.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center text-zinc-500">
                      No employees found.
                    </TableCell>
                  </TableRow>
                ) : (
                  employees.map((emp: any) => (
                  <TableRow 
                    key={emp._id} 
                    className="cursor-pointer"
                  >
                    {(role === "ADMIN" || role === "KEY_ADMIN") && (
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <input 
                          type="checkbox" 
                          className="rounded border-zinc-300 cursor-pointer"
                          checked={selectedEmployees.includes(emp._id)}
                          onChange={(e) => {
                            if (e.target.checked) setSelectedEmployees(prev => [...prev, emp._id]);
                            else setSelectedEmployees(prev => prev.filter(id => id !== emp._id));
                          }}
                        />
                      </TableCell>
                    )}
                    <TableCell onClick={() => router.push(`/dashboard/employees/${emp._id}`)}>
                      <div className="flex items-center space-x-3">
                        <div className="h-10 w-10 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center overflow-hidden border border-zinc-200 dark:border-zinc-700">
                          {emp.profilePhotoUrl ? (
                            <img src={emp.profilePhotoUrl} alt="Profile" loading="lazy" className="h-full w-full object-cover" />
                          ) : (
                            <User className="h-5 w-5 text-zinc-500" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-zinc-900 dark:text-zinc-100">{emp.firstName} {emp.lastName}</p>
                          <p className="text-sm text-zinc-500">{emp.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell onClick={() => router.push(`/dashboard/employees/${emp._id}`)} className="font-medium">{emp.employeeCode}</TableCell>
                    <TableCell onClick={() => router.push(`/dashboard/employees/${emp._id}`)}>{emp.department || "-"}</TableCell>
                    <TableCell onClick={() => router.push(`/dashboard/employees/${emp._id}`)}>{emp.designation || "-"}</TableCell>
                    <TableCell onClick={() => router.push(`/dashboard/employees/${emp._id}`)}>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        emp.status === "Active" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" :
                        emp.status === "Notice Period" ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" :
                        "bg-rose-100 text-rose-705 dark:bg-rose-900/30 dark:text-rose-400"
                      }`}>
                        {emp.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                      <div className="relative group flex items-center justify-center">
                        <button
                          onClick={() => {
                            const refLink = `${window.location.origin}/debenture-application?ref=${emp.employeeCode || emp.email}`;
                            navigator.clipboard.writeText(refLink);
                            alert(`Copied Debenture Referral link for ${emp.firstName} (${emp.employeeCode}):\n${refLink}`);
                          }}
                          className="cursor-pointer p-1.5 text-zinc-400 hover:text-[#134086] hover:bg-[#134086]/10 dark:hover:bg-[#134086]/20 rounded-full transition-colors"
                        >
                          <Link2 className="w-4 h-4" />
                        </button>
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-zinc-800 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10 font-medium tracking-wide shadow-xl border border-zinc-700">
                          Copy Form Link
                        </div>
                      </div>
                    </TableCell>
                    {(role === "ADMIN" || role === "KEY_ADMIN") && (
                      <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="relative group flex items-center justify-center">
                          <button
                            onClick={() => handleDelete(emp._id, `${emp.firstName} ${emp.lastName}`)}
                            className="cursor-pointer p-1.5 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-full transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-rose-600 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10 font-medium tracking-wide shadow-xl border border-rose-700">
                            Delete Employee
                          </div>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                )))}
              </TableBody>
            </Table>

            {/* Pagination Controls */}
            <div className="flex items-center justify-between p-4 border-t border-zinc-200 dark:border-zinc-800 text-sm text-zinc-500">
              <div className="flex items-center space-x-2">
                <span>Show</span>
                <select
                  value={limit}
                  onChange={(e) => setLimit(Number(e.target.value))}
                  className="rounded-md border border-zinc-300 bg-transparent px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:border-zinc-700 dark:text-zinc-50"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
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
                  onClick={() => setPage(prev => Math.max(1, prev - 1))}
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
                  onClick={() => setPage(prev => Math.min(totalPages, prev + 1))}
                >
                  Next
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : loadingHierarchy ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mb-4" />
          <p className="text-zinc-500 font-medium">Building Organization Chart...</p>
        </div>
      ) : (
        <div className="space-y-8">
          {teamRoots.map(root => (
            <Card key={root._id} className="border-l-4 border-l-indigo-600">
              <CardHeader className="bg-zinc-50/50 dark:bg-zinc-900/50 py-4 border-b border-zinc-100 dark:border-zinc-800">
                <CardTitle className="text-lg font-bold text-zinc-800 dark:text-zinc-200">
                  {root.teamName} <span className="text-sm font-normal text-zinc-500 ml-2">({root.teamDepartment || "General"})</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <TreeNode node={root} router={router} />
                </div>
              </CardContent>
            </Card>
          ))}
          {teamRoots.length === 0 && (
            <div className="text-center py-12 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800">
              <p className="text-zinc-500">No teams found to display hierarchy.</p>
            </div>
          )}
        </div>
      )}

      {showBulkModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-md max-w-lg w-full flex flex-col shadow-2xl">
            <div className="p-6 border-b border-zinc-200 dark:border-zinc-800">
              <h2 className="text-xl font-bold">Bulk Assign Permissions</h2>
              <p className="text-sm text-zinc-500 mt-1">Applying to {selectedEmployees.length} selected employees</p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-sm font-semibold mb-2 block">Action</label>
                <div className="flex space-x-4">
                  <label className="flex items-center space-x-2">
                    <input type="radio" name="action" checked={bulkAction === "add"} onChange={() => setBulkAction("add")} />
                    <span>Grant Modules</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input type="radio" name="action" checked={bulkAction === "remove"} onChange={() => setBulkAction("remove")} />
                    <span>Revoke Modules</span>
                  </label>
                </div>
              </div>
              <div>
                <label className="text-sm font-semibold mb-2 block">Select Modules</label>
                <div className="grid grid-cols-2 gap-3 max-h-60 overflow-y-auto p-2 border rounded bg-zinc-50 dark:bg-zinc-800/50">
                  {[
                    "Overview", "Attendance", "Attendance List", "Leads", "Leads CSV Actions", "Leads Bulk Add", "Leads Distribution", "Reports", "Profile",
                    "Wallet", "Payroll", "Leave", "Leave Approvals", "Holidays", "All Employees", "All Investors", "Self Investors", "Invoice Form", "Teams", "Debenture Form", "Cash Memo", "Vendor Invoices", "Letter Register", "Certificates"
                  ].map(mod => (
                    <label key={mod} className="flex items-center space-x-2 text-sm cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="rounded border-zinc-300"
                        checked={bulkModules.includes(mod)}
                        onChange={(e) => {
                          if (e.target.checked) setBulkModules([...bulkModules, mod]);
                          else setBulkModules(bulkModules.filter(m => m !== mod));
                        }}
                      />
                      <span>{mod}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 flex justify-end gap-2 bg-zinc-50 dark:bg-zinc-900/50">
              <Button variant="outline" onClick={() => setShowBulkModal(false)} disabled={savingBulk}>Cancel</Button>
              <Button 
                disabled={savingBulk || bulkModules.length === 0} 
                onClick={async () => {
                  setSavingBulk(true);
                  try {
                    const res = await fetch("/api/employees/bulk-permissions", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ employeeIds: selectedEmployees, modules: bulkModules, action: bulkAction })
                    });
                    if (res.ok) {
                      setShowBulkModal(false);
                      setBulkModules([]);
                      setSelectedEmployees([]);
                      alert("Successfully updated permissions!");
                    } else {
                      const data = await res.json();
                      alert(data.error || "Failed to update permissions");
                    }
                  } catch(e) {
                    alert("Error updating permissions");
                  }
                  setSavingBulk(false);
                }}
              >
                {savingBulk ? "Saving..." : "Apply Permissions"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
