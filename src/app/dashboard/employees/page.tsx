"use client";

import { useEffect, useState, useRef } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Download, Upload, Plus, User, Layers, List } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchEmployees = async () => {
    try {
      const res = await fetch(`/api/employees?search=${search}&status=${status}`);
      const data = await res.json();
      if (data.success) {
        setEmployees(data.data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, [search, status]);

  const handleExport = () => {
    window.location.href = `/api/employees/export?search=${search}&status=${status}`;
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

  // Group employees by department for hierarchy view
  const departments: { [key: string]: any[] } = {};
  employees.forEach((emp: any) => {
    const dept = emp.department || "Unassigned";
    if (!departments[dept]) {
      departments[dept] = [];
    }
    departments[dept].push(emp);
  });

  const buildTree = (deptEmployees: any[]) => {
    const map = new Map();
    deptEmployees.forEach(emp => {
      map.set(emp._id, { ...emp, children: [] });
    });

    const roots: any[] = [];
    map.forEach(node => {
      if (node.reportingManager) {
        const parentId = typeof node.reportingManager === 'object' ? node.reportingManager._id || node.reportingManager : node.reportingManager;
        const parent = map.get(parentId.toString());
        if (parent) {
          parent.children.push(node);
        } else {
          roots.push(node);
        }
      } else {
        roots.push(node);
      }
    });

    return roots;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Employees</h1>
          <p className="text-zinc-500 dark:text-zinc-400">Manage your workforce, departments, and records.</p>
        </div>
        <div className="flex space-x-2">
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
          <Link href="/dashboard/employees/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" /> Add Employee
            </Button>
          </Link>
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
        <button
          onClick={() => setActiveTab("hierarchy")}
          className={`flex items-center space-x-2 py-3 px-4 text-sm font-semibold border-b-2 transition-all ${
            activeTab === "hierarchy" 
              ? "border-indigo-600 text-indigo-600" 
              : "border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
          }`}
        >
          <Layers className="h-4 w-4" />
          <span>Department Hierarchy</span>
        </button>
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
                  <TableHead>Employee</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Designation</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Debenture Form Link</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employees.map((emp: any) => (
                  <TableRow 
                    key={emp._id} 
                    className="cursor-pointer"
                    onClick={() => router.push(`/dashboard/employees/${emp._id}`)}
                  >
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <div className="h-10 w-10 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center overflow-hidden border border-zinc-200 dark:border-zinc-700">
                          {emp.profilePhotoUrl ? (
                            <img src={emp.profilePhotoUrl} alt="Profile" className="h-full w-full object-cover" />
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
                    <TableCell className="font-medium">{emp.employeeCode}</TableCell>
                    <TableCell>{emp.department || "-"}</TableCell>
                    <TableCell>{emp.designation || "-"}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        emp.status === "Active" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" :
                        emp.status === "Notice Period" ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" :
                        "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400"
                      }`}>
                        {emp.status}
                      </span>
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          const refLink = `${window.location.origin}/debenture-application?ref=${emp.employeeCode || emp.email}`;
                          navigator.clipboard.writeText(refLink);
                          alert(`Copied Debenture Referral link for ${emp.firstName} (${emp.employeeCode}):\n${refLink}`);
                        }}
                        className="bg-[#eee] text-[#134086] border-[#eee] hover:bg-blue-100 font-bold text-xs"
                      >
                        Copy Form Link 📋
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {employees.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center text-zinc-500">
                      No employees found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {Object.entries(departments).map(([deptName, deptEmployees]) => {
            const roots = buildTree(deptEmployees);
            
            return (
              <Card key={deptName} className="border-l-4 border-l-indigo-600">
                <CardHeader className="bg-zinc-50/50 dark:bg-zinc-900/50 py-4 border-b border-zinc-100 dark:border-zinc-800">
                  <CardTitle className="text-lg font-bold text-zinc-800 dark:text-zinc-200">
                    {deptName} <span className="text-sm font-normal text-zinc-500 ml-2">({deptEmployees.length} members)</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  {roots.length === 0 ? (
                    <p className="text-sm text-zinc-400 italic">No structure defined.</p>
                  ) : (
                    <div className="space-y-4">
                      {roots.map(root => (
                        <TreeNode key={root._id} node={root} router={router} />
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
