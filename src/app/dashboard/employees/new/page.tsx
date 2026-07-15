"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Save, Upload } from "lucide-react";
import Link from "next/link";

export default function NewEmployeePage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("personal");
  const [loading, setLoading] = useState(false);
  const [departments, setDepartments] = useState<string[]>([]);
  const [designations, setDesignations] = useState<string[]>([]);
  
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    status: "Active",
    employeeType: "Full-Time",
    department: "",
    designation: "",
    kyc: { aadharNumber: "", panNumber: "" },
    bankDetails: { bankName: "", accountNumber: "", ifscCode: "", branchName: "" },
    profilePhotoUrl: "",
    accessibleModules: ["Overview", "Attendance", "Leads", "Reports", "Profile"]
  });

  const handleChange = (field: string, value: string) => {
    if (field.includes(".")) {
      const [parent, child] = field.split(".");
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...(prev as any)[parent],
          [child]: value
        }
      }));
    } else if (field === "accessibleModules") {
      setFormData(prev => ({ ...prev, accessibleModules: value as unknown as string[] }));
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }
  };

  useEffect(() => {
    fetch("/api/settings")
      .then(res => res.json())
      .then(data => {
        if (data.success && data.data) {
          setDepartments(data.data.departments || []);
          setDesignations(data.data.designations || []);
          if (data.data.departments && data.data.departments.length > 0) {
            handleChange("department", data.data.departments[0]);
          }
          if (data.data.designations && data.data.designations.length > 0) {
            handleChange("designation", data.data.designations[0]);
          }
        }
      });
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: string) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    const data = new FormData();
    data.append("file", file);
    try {
      const res = await fetch("/api/employees/upload", { method: "POST", body: data });
      const json = await res.json();
      if (json.success) {
        handleChange(field, json.url);
      } else {
        alert("Upload failed");
      }
    } catch (err) {
      alert("Upload error");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (data.success) {
        router.push("/dashboard/employees");
      } else {
        alert(data.error);
      }
    } catch (err) {
      alert("Failed to save employee");
    }
    setLoading(false);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-10">
      <div className="flex items-center space-x-4">
        <Link href="/dashboard/employees">
          <Button variant="outline" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Add New Employee</h1>
          <p className="text-zinc-500 dark:text-zinc-400">Fill in the details to create a new employee profile.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="personal">Personal</TabsTrigger>
            <TabsTrigger value="official">Official</TabsTrigger>
            <TabsTrigger value="kyc">KYC & Docs</TabsTrigger>
            <TabsTrigger value="bank">Bank Details</TabsTrigger>
            <TabsTrigger value="permissions">Permissions</TabsTrigger>
          </TabsList>

          <TabsContent value="personal">
            <Card>
              <CardHeader>
                <CardTitle>Personal Details</CardTitle>
                <CardDescription>Basic contact and personal information.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name *</Label>
                    <Input id="firstName" required value={formData.firstName} onChange={(e) => handleChange("firstName", e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name *</Label>
                    <Input id="lastName" required value={formData.lastName} onChange={(e) => handleChange("lastName", e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email *</Label>
                    <Input id="email" type="email" required value={formData.email} onChange={(e) => handleChange("email", e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone *</Label>
                    <Input id="phone" required value={formData.phone} onChange={(e) => handleChange("phone", e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="department">Department</Label>
                    <select
                      id="department"
                      className="flex h-10 w-full rounded-md border border-zinc-300 bg-transparent px-3 py-2 text-sm placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-50 dark:focus:ring-zinc-300"
                      value={formData.department}
                      onChange={(e) => handleChange("department", e.target.value)}
                    >
                      {departments.map(d => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                      {departments.length === 0 && <option value="">No departments configured</option>}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="designation">Designation</Label>
                    <select
                      id="designation"
                      className="flex h-10 w-full rounded-md border border-zinc-300 bg-transparent px-3 py-2 text-sm placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-50 dark:focus:ring-zinc-300"
                      value={formData.designation}
                      onChange={(e) => handleChange("designation", e.target.value)}
                    >
                      {designations.map(d => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                      {designations.length === 0 && <option value="">No designations configured</option>}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label>Profile Photo</Label>
                    <div className="flex items-center space-x-2">
                      <Input type="file" accept="image/*" onChange={(e) => handleFileUpload(e, "profilePhotoUrl")} />
                      {formData.profilePhotoUrl && <span className="text-sm text-emerald-600 font-medium">Uploaded!</span>}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="official">
            <Card>
              <CardHeader>
                <CardTitle>Official Details</CardTitle>
                <CardDescription>Employment status, department, and roles.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="official-department">Department</Label>
                    <select
                      id="official-department"
                      className="flex h-10 w-full rounded-md border border-zinc-300 bg-transparent px-3 py-2 text-sm placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-50 dark:focus:ring-zinc-300"
                      value={formData.department}
                      onChange={(e) => handleChange("department", e.target.value)}
                    >
                      {departments.map(d => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                      {departments.length === 0 && <option value="">No departments configured</option>}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="official-designation">Designation</Label>
                    <select
                      id="official-designation"
                      className="flex h-10 w-full rounded-md border border-zinc-300 bg-transparent px-3 py-2 text-sm placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-50 dark:focus:ring-zinc-300"
                      value={formData.designation}
                      onChange={(e) => handleChange("designation", e.target.value)}
                    >
                      {designations.map(d => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                      {designations.length === 0 && <option value="">No designations configured</option>}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="status">Status</Label>
                    <select 
                      id="status"
                      className="flex h-10 w-full rounded-md border border-zinc-300 bg-transparent px-3 py-2 text-sm placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-50 dark:focus:ring-zinc-300"
                      value={formData.status}
                      onChange={(e) => handleChange("status", e.target.value)}
                    >
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                      <option value="Notice Period">Notice Period</option>
                      <option value="Resigned">Resigned</option>
                      <option value="Absconding">Absconding</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="employeeType">Employee Type</Label>
                    <select 
                      id="employeeType"
                      className="flex h-10 w-full rounded-md border border-zinc-300 bg-transparent px-3 py-2 text-sm placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-50 dark:focus:ring-zinc-300"
                      value={formData.employeeType}
                      onChange={(e) => handleChange("employeeType", e.target.value)}
                    >
                      <option value="Full-Time">Full-Time</option>
                      <option value="Part-Time">Part-Time</option>
                      <option value="Contract">Contract</option>
                      <option value="Intern">Intern</option>
                    </select>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="kyc">
            <Card>
              <CardHeader>
                <CardTitle>KYC & Documents</CardTitle>
                <CardDescription>Government IDs and verification.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="aadharNumber">Aadhar Number</Label>
                    <Input id="aadharNumber" value={formData.kyc.aadharNumber} onChange={(e) => handleChange("kyc.aadharNumber", e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="panNumber">PAN Number</Label>
                    <Input id="panNumber" value={formData.kyc.panNumber} onChange={(e) => handleChange("kyc.panNumber", e.target.value)} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="bank">
            <Card>
              <CardHeader>
                <CardTitle>Bank Details</CardTitle>
                <CardDescription>Salary account information.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="bankName">Bank Name</Label>
                    <Input id="bankName" value={formData.bankDetails.bankName} onChange={(e) => handleChange("bankDetails.bankName", e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="accountNumber">Account Number</Label>
                    <Input id="accountNumber" value={formData.bankDetails.accountNumber} onChange={(e) => handleChange("bankDetails.accountNumber", e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ifscCode">IFSC Code</Label>
                    <Input id="ifscCode" value={formData.bankDetails.ifscCode} onChange={(e) => handleChange("bankDetails.ifscCode", e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="branchName">Branch Name</Label>
                    <Input id="branchName" value={formData.bankDetails.branchName} onChange={(e) => handleChange("bankDetails.branchName", e.target.value)} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="permissions">
            <Card>
              <CardHeader>
                <CardTitle>Module Access</CardTitle>
                <CardDescription>Select which sidebar modules this employee can access.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {[
                    "Overview", "Attendance", "Leads", "Reports", "Profile",
                    "Executive AI", "Wallet", "Payroll", "Leave", "Holidays", "Employees", "Notifications", "Settings"
                  ].map(module => (
                    <div key={module} className="flex items-center space-x-2">
                      <input 
                        type="checkbox" 
                        id={`module-${module}`}
                        checked={formData.accessibleModules.includes(module)}
                        onChange={(e) => {
                          const newModules = e.target.checked
                            ? [...formData.accessibleModules, module]
                            : formData.accessibleModules.filter(m => m !== module);
                          handleChange("accessibleModules", newModules as unknown as string);
                        }}
                        className="h-4 w-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:ring-offset-zinc-950"
                      />
                      <label htmlFor={`module-${module}`} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                        {module}
                      </label>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="mt-8 flex justify-end">
          <Button type="submit" disabled={loading}>
            {loading ? "Saving..." : <><Save className="mr-2 h-4 w-4" /> Save Employee</>}
          </Button>
        </div>
      </form>
    </div>
  );
}
