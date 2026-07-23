"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Save, ChevronRight, ChevronLeft } from "lucide-react";
import Link from "next/link";

export default function NewEmployeePage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const steps = ["Personal", "Official", "KYC & Docs", "Bank", "Permissions"];
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [departments, setDepartments] = useState<string[]>([]);
  const [designations, setDesignations] = useState<string[]>([]);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    officeEmail: "",
    phone: "",
    dateOfBirth: "",
    gender: "",
    bloodGroup: "",
    maritalStatus: "",
    dateOfJoining: "",
    workLocation: "",
    status: "Active",
    employeeType: "Full-Time",
    systemRole: "Employee",
    department: "",
    designation: "",
    kyc: { aadharNumber: "", panNumber: "", passportNumber: "" },
    bankDetails: { bankName: "", accountNumber: "", ifscCode: "", branchName: "" },
    emergencyContact: { name: "", relation: "", phone: "" },
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
      
    fetch("/api/auth/me")
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setCurrentUserRole(data.role);
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

  const checkEmail = async (email: string) => {
    if (!email) return;
    try {
      const res = await fetch(`/api/employees/check-email?email=${encodeURIComponent(email)}`);
      const data = await res.json();
      if (data.exists) {
        setEmailError("This email is already registered in the system.");
      } else {
        setEmailError("");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError("");
    
    if (emailError) {
      setSubmitError("Please fix the errors before saving.");
      return;
    }

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
        setSubmitError(data.error || "Failed to save employee");
      }
    } catch (err) {
      setSubmitError("Failed to save employee");
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

      <form onSubmit={(e) => e.preventDefault()}>
        {/* Stepper Header */}
        <div className="mb-8 overflow-x-auto pb-4">
          <div className="flex items-center min-w-max">
            {steps.map((s, i) => (
              <div key={s} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${step >= i ? 'bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900' : 'bg-zinc-200 text-zinc-500 dark:bg-zinc-800'}`}>
                  {i + 1}
                </div>
                <span className={`ml-2 text-sm font-medium ${step >= i ? 'text-zinc-900 dark:text-zinc-50' : 'text-zinc-500'}`}>{s}</span>
                {i < steps.length - 1 && <div className={`w-12 h-1 mx-4 rounded-full ${step > i ? 'bg-zinc-900 dark:bg-zinc-50' : 'bg-zinc-200 dark:bg-zinc-800'}`} />}
              </div>
            ))}
          </div>
        </div>

        {step === 0 && (
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
                    <Input 
                      id="email" 
                      type="email" 
                      required 
                      value={formData.email} 
                      onChange={(e) => {
                        handleChange("email", e.target.value);
                        if (emailError) setEmailError("");
                      }} 
                      onBlur={(e) => checkEmail(e.target.value)}
                      className={emailError ? "border-rose-500 focus-visible:ring-rose-500" : ""}
                    />
                    {emailError && <p className="text-xs text-rose-500 mt-1">{emailError}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone *</Label>
                    <Input id="phone" required value={formData.phone} onChange={(e) => handleChange("phone", e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dateOfBirth">Date of Birth</Label>
                    <Input id="dateOfBirth" type="date" value={formData.dateOfBirth} onChange={(e) => handleChange("dateOfBirth", e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="officeEmail">Office Email</Label>
                    <Input id="officeEmail" type="email" value={formData.officeEmail} onChange={(e) => handleChange("officeEmail", e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="gender">Gender</Label>
                    <select
                      id="gender"
                      className="flex h-10 w-full rounded-md border border-zinc-300 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:border-zinc-700 dark:text-zinc-50"
                      value={formData.gender}
                      onChange={(e) => handleChange("gender", e.target.value)}
                    >
                      <option value="">Select Gender</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bloodGroup">Blood Group</Label>
                    <Input id="bloodGroup" placeholder="e.g. O+, A+, B+" value={formData.bloodGroup} onChange={(e) => handleChange("bloodGroup", e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="maritalStatus">Marital Status</Label>
                    <select
                      id="maritalStatus"
                      className="flex h-10 w-full rounded-md border border-zinc-300 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:border-zinc-700 dark:text-zinc-50"
                      value={formData.maritalStatus}
                      onChange={(e) => handleChange("maritalStatus", e.target.value)}
                    >
                      <option value="">Select Marital Status</option>
                      <option value="Single">Single</option>
                      <option value="Married">Married</option>
                      <option value="Divorced">Divorced</option>
                      <option value="Widowed">Widowed</option>
                    </select>
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
                  {currentUserRole === "KEY_ADMIN" && (
                    <div className="space-y-2 md:col-span-2">
                      <div className="p-4 border border-rose-200 bg-rose-50 rounded-lg dark:bg-rose-900/10 dark:border-rose-900">
                        <Label htmlFor="systemRole" className="text-rose-700 font-bold dark:text-rose-400">System Role (Key Admin Only)</Label>
                        <select
                          id="systemRole"
                          className="mt-2 flex h-10 w-full rounded-md border border-rose-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 dark:bg-zinc-950 dark:border-rose-800"
                          value={formData.systemRole}
                          onChange={(e) => handleChange("systemRole", e.target.value)}
                        >
                          <option value="Employee">Employee (Default)</option>
                          <option value="ADMIN">Administrator</option>
                        </select>
                        <p className="text-xs mt-2 text-rose-600 dark:text-rose-400">
                          Administrators have elevated access and use the default password <b>Admin@123</b>. Employees use <b>Employee@123</b>.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
        )}

        {step === 1 && (
            <Card>
              <CardHeader>
                <CardTitle>Official Details</CardTitle>
                <CardDescription>Employment status, department, joined date and work location.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="dateOfJoining">Joined Date</Label>
                    <Input id="dateOfJoining" type="date" value={formData.dateOfJoining} onChange={(e) => handleChange("dateOfJoining", e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="workLocation">Work Location</Label>
                    <Input id="workLocation" placeholder="e.g. Noida, Delhi" value={formData.workLocation} onChange={(e) => handleChange("workLocation", e.target.value)} />
                  </div>
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
        )}

        {step === 2 && (
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
                  <div className="space-y-2">
                    <Label htmlFor="passportNumber">Passport Number</Label>
                    <Input id="passportNumber" value={formData.kyc.passportNumber} onChange={(e) => handleChange("kyc.passportNumber", e.target.value)} />
                  </div>
                </div>
              </CardContent>
            </Card>
        )}

        {step === 3 && (
            <Card>
              <CardHeader>
                <CardTitle>Bank & Emergency Details</CardTitle>
                <CardDescription>Salary account information and emergency contact.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h4 className="text-sm font-semibold mb-3">Bank Details</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="bankName">Bank Name / Bank Account</Label>
                      <Input id="bankName" value={formData.bankDetails.bankName} onChange={(e) => handleChange("bankDetails.bankName", e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="accountNumber">Account Number (Ac Num)</Label>
                      <Input id="accountNumber" value={formData.bankDetails.accountNumber} onChange={(e) => handleChange("bankDetails.accountNumber", e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="ifscCode">IFSC Code</Label>
                      <Input id="ifscCode" value={formData.bankDetails.ifscCode} onChange={(e) => handleChange("bankDetails.ifscCode", e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="branchName">Bank Branch</Label>
                      <Input id="branchName" value={formData.bankDetails.branchName} onChange={(e) => handleChange("bankDetails.branchName", e.target.value)} />
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h4 className="text-sm font-semibold mb-3">Emergency Contact Details</h4>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="emergencyName">Emergency Contact Name</Label>
                      <Input id="emergencyName" value={formData.emergencyContact.name} onChange={(e) => handleChange("emergencyContact.name", e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="emergencyRelation">Emergency Contact Relation</Label>
                      <Input id="emergencyRelation" value={formData.emergencyContact.relation} onChange={(e) => handleChange("emergencyContact.relation", e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="emergencyPhone">Emergency Contact Number</Label>
                      <Input id="emergencyPhone" value={formData.emergencyContact.phone} onChange={(e) => handleChange("emergencyContact.phone", e.target.value)} />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
        )}

        {step === 4 && (
            <Card>
              <CardHeader>
                <CardTitle>Module Permissions</CardTitle>
                <CardDescription>Select which modules this employee can access.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {submitError && (
                  <div className="p-4 bg-rose-50 border border-rose-200 text-rose-600 rounded-md mb-4 dark:bg-rose-900/20 dark:border-rose-900">
                    {submitError}
                  </div>
                )}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {[
                    "Overview", "Attendance", "Leads", "Reports", "Profile",
                    "Executive AI", "Wallet", "Payroll", "Leave", "Holidays", "Employees", "Notifications", "Settings", "Debenture Form"
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
        )}

        <div className="mt-8 flex justify-between items-center border-t border-zinc-200 dark:border-zinc-800 pt-6">
          <Button type="button" variant="outline" onClick={() => setStep(step - 1)} disabled={step === 0 || loading}>
            <ChevronLeft className="mr-2 h-4 w-4" /> Previous
          </Button>
          
          {step < steps.length - 1 ? (
            <Button type="button" onClick={() => setStep(step + 1)}>
              Next <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button type="button" onClick={handleSubmit} disabled={loading}>
              {loading ? "Saving..." : <><Save className="mr-2 h-4 w-4" /> Save Employee</>}
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}
