"use client";

import { useEffect, useState, useRef } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Download, Upload, Plus, User } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function EmployeesPage() {
  const router = useRouter();
  const [employees, setEmployees] = useState([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
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
    
    // Reset file input
    if (fileInputRef.current) fileInputRef.current.value = "";
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
    </div>
  );
}
