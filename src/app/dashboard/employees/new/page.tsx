"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Save, ChevronRight, ChevronLeft, User, Briefcase, IndianRupee, FileCheck, Landmark, Shield } from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";

export default function NewEmployeePage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [departments, setDepartments] = useState<string[]>([]);
  const [designations, setDesignations] = useState<string[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
  const [showOtherDepartment, setShowOtherDepartment] = useState(false);
  const [showOtherDesignation, setShowOtherDesignation] = useState(false);

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    fatherOrMotherName: "",
    email: "",
    officeEmail: "",
    phone: "",
    companyPhone: "",
    permanentAddress: "",
    correspondenceAddress: "",
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
    reportingManager: "",
    kyc: { aadharNumber: "", panNumber: "", passportNumber: "" },
    bankDetails: { bankName: "", accountNumber: "", ifscCode: "", branchName: "" },
    emergencyContact: { name: "", relation: "", phone: "" },
    salaryStructure: {
      ctcPerAnnum: "", basic: "", hra: "", conveyance: "", medicalAllowance: "",
      specialAllowance: "", incentive: "", pf: "", esi: "", insurance: "", leaves: "",
      lta: "", professionalTax: "", tds: ""
    },
    profilePhotoUrl: "",
    accessibleModules: ["Overview", "Attendance", "Leads", "Profile", "Leave", "Holidays"]
  });

  const steps = [
    { name: "Personal", icon: User, desc: "Basic Info" },
    { name: "Official", icon: Briefcase, desc: "Work Details" },
    { name: "Salary", icon: IndianRupee, desc: "CTC & Breakdown" },
    { name: "KYC & Docs", icon: FileCheck, desc: "Verification" },
    { name: "Bank", icon: Landmark, desc: "Account Info" },
    { name: "Permissions", icon: Shield, desc: "App Access" }
  ];

  // Helper to get true index in original structure if needed
  const renderStep = () => {
    const currentStepName = steps[step].name;
    switch (currentStepName) {
      case "Personal": return 0;
      case "Official": return 1;
      case "Salary": return 2;
      case "KYC & Docs": return 3;
      case "Bank": return 4;
      case "Permissions": return 5;
      default: return 0;
    }
  };

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
    } else if (field === "systemRole") {
      if (value === "ADMIN") {
        setFormData(prev => ({
          ...prev,
          systemRole: value,
          accessibleModules: [
            "Overview", "Attendance", "Leads", "Leads CSV Actions", "Leads Bulk Add", "Leads Distribution", "Reports", "Profile",
            "Wallet", "Payroll", "Leave", "Leave Approvals", "Holidays", "Employees", "All Investors", "Self Investors", "Invoice Form", "Notifications", "Settings", "Debenture Form"
          ]
        }));
      } else {
        setFormData(prev => ({ ...prev, systemRole: value }));
      }
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

    fetch("/api/employees")
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setEmployees(data.data);
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
        toast.success("Employee added successfully!");
        router.push("/dashboard/employees");
      } else {
        toast.error(data.error || "Failed to save employee");
        setSubmitError(data.error || "Failed to save employee");
      }
    } catch (err) {
      toast.error("Failed to save employee");
      setSubmitError("Failed to save employee");
    }
    setLoading(false);
  };

  return (
    <div className="space-y-6 w-full pb-10 relative">
      {loading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/60 dark:bg-zinc-950/60 backdrop-blur-sm">
          <div className="flex flex-col items-center space-y-4">
            <div className="w-12 h-12 border-4 border-[#134086] border-t-transparent rounded-full animate-spin"></div>
            <p className="text-zinc-900 dark:text-zinc-100 font-semibold text-lg animate-pulse">Processing...</p>
          </div>
        </div>
      )}
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

      <form onSubmit={(e) => e.preventDefault()} className="flex flex-col md:flex-row gap-8">
        
        {/* Left Sidebar Stepper */}
        <div className="w-full md:w-64 flex-shrink-0">
          <nav className="flex flex-col space-y-2 sticky top-6">
            {steps.map((s, i) => (
              <button
                key={s.name}
                type="button"
                onClick={() => setStep(i)}
                className={`flex items-center text-left px-4 py-3 rounded-xl transition-all border ${
                  step === i 
                    ? 'bg-[#134086] text-white border-[#134086] shadow-md ring-4 ring-[#134086]/20' 
                    : 'bg-white text-zinc-500 border-zinc-200 hover:bg-zinc-50 hover:border-zinc-300 hover:text-zinc-900 dark:bg-zinc-900 dark:border-zinc-800 dark:hover:bg-zinc-800 dark:hover:border-zinc-700 dark:hover:text-zinc-100'
                }`}
              >
                <div className={`mr-3 p-2.5 rounded-lg ${step === i ? 'bg-white/20 text-white' : 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800'}`}>
                   <s.icon className="w-4 h-4" />
                </div>
                <div>
                  <p className={`text-sm font-bold ${step === i ? 'text-white' : 'text-zinc-700 dark:text-zinc-300'}`}>{s.name}</p>
                  <p className={`text-xs mt-0.5 ${step === i ? 'text-blue-100/80' : 'text-zinc-400'}`}>{s.desc}</p>
                </div>
              </button>
            ))}
          </nav>
        </div>

        {/* Form Content Area */}
        <div className="flex-1 space-y-6">
          {renderStep() === 0 && (
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
                  <Label htmlFor="fatherOrMotherName">Father/Mother Name</Label>
                  <Input id="fatherOrMotherName" value={formData.fatherOrMotherName || ""} onChange={(e) => handleChange("fatherOrMotherName", e.target.value)} />
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
                  <Label htmlFor="phone">Personal Phone *</Label>
                  <Input id="phone" required value={formData.phone} onChange={(e) => handleChange("phone", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="companyPhone">Company Phone No</Label>
                  <Input id="companyPhone" placeholder="Work / Official Phone No" value={formData.companyPhone} onChange={(e) => handleChange("companyPhone", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dateOfBirth">Date of Birth</Label>
                  <Input id="dateOfBirth" type="date" value={formData.dateOfBirth} onChange={(e) => handleChange("dateOfBirth", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="officeEmail">Office Email</Label>
                  <Input id="officeEmail" type="email" value={formData.officeEmail} onChange={(e) => handleChange("officeEmail", e.target.value)} />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label htmlFor="permanentAddress">Permanent Address</Label>
                  <Input id="permanentAddress" placeholder="Full Permanent Residential Address" value={formData.permanentAddress} onChange={(e) => handleChange("permanentAddress", e.target.value)} />
                </div>
                <div className="space-y-2 col-span-2">
                  <div className="flex justify-between items-center">
                    <Label htmlFor="correspondenceAddress">Correspondence / Current Address</Label>
                    <button
                      type="button"
                      onClick={() => handleChange("correspondenceAddress", formData.permanentAddress)}
                      className="text-xs text-zinc-500 hover:text-zinc-900 underline"
                    >
                      Same as Permanent
                    </button>
                  </div>
                  <Input id="correspondenceAddress" placeholder="Full Current / Present Address" value={formData.correspondenceAddress} onChange={(e) => handleChange("correspondenceAddress", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reportingManager">Reporting Manager</Label>
                  <Input id="reportingManager" placeholder="e.g. John Doe" value={formData.reportingManager} onChange={(e) => handleChange("reportingManager", e.target.value)} />
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
                        <option value="Manager">Manager</option>
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

        {renderStep() === 1 && (
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
                  <div className="space-y-2">
                    <select
                      id="official-department"
                      className="flex h-10 w-full rounded-md border border-zinc-300 bg-transparent px-3 py-2 text-sm placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-50 dark:focus:ring-zinc-300"
                      value={showOtherDepartment ? "Other" : formData.department}
                      onChange={(e) => {
                        if (e.target.value === "Other") {
                          setShowOtherDepartment(true);
                          handleChange("department", "");
                        } else {
                          setShowOtherDepartment(false);
                          handleChange("department", e.target.value);
                        }
                      }}
                    >
                      {departments.map(d => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                      {departments.length === 0 && <option value="" disabled>No departments configured</option>}
                      <option value="Other">Other (Enter manually)</option>
                    </select>
                    {showOtherDepartment && (
                      <Input
                        placeholder="Enter custom department name"
                        value={formData.department}
                        onChange={(e) => handleChange("department", e.target.value)}
                        autoFocus
                      />
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="official-designation">Designation</Label>
                  <div className="space-y-2">
                    <select
                      id="official-designation"
                      className="flex h-10 w-full rounded-md border border-zinc-300 bg-transparent px-3 py-2 text-sm placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-50 dark:focus:ring-zinc-300"
                      value={showOtherDesignation ? "Other" : formData.designation}
                      onChange={(e) => {
                        if (e.target.value === "Other") {
                          setShowOtherDesignation(true);
                          handleChange("designation", "");
                        } else {
                          setShowOtherDesignation(false);
                          handleChange("designation", e.target.value);
                        }
                      }}
                    >
                      {designations.map(d => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                      {designations.length === 0 && <option value="" disabled>No designations configured</option>}
                      <option value="Other">Other (Enter manually)</option>
                    </select>
                    {showOtherDesignation && (
                      <Input
                        placeholder="Enter custom designation name"
                        value={formData.designation}
                        onChange={(e) => handleChange("designation", e.target.value)}
                        autoFocus
                      />
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reportingManager">Reporting Manager</Label>
                  <Input id="reportingManager" placeholder="e.g. John Doe" value={formData.reportingManager} onChange={(e) => handleChange("reportingManager", e.target.value)} />
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

        {renderStep() === 2 && (
          <Card>
            <CardHeader>
              <CardTitle>Salary Structure</CardTitle>
              <CardDescription>Configure the monthly breakdown and CTC.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2 mb-4 max-w-sm">
                <Label htmlFor="ctcPerAnnum">CTC per Annum</Label>
                <Input id="ctcPerAnnum" value={formData.salaryStructure.ctcPerAnnum} onChange={(e) => handleChange("salaryStructure.ctcPerAnnum", e.target.value)} placeholder="e.g. ₹ 6,00,000" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="sal_basic">Basic</Label>
                  <Input id="sal_basic" value={formData.salaryStructure.basic} onChange={(e) => handleChange("salaryStructure.basic", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sal_hra">HRA</Label>
                  <Input id="sal_hra" value={formData.salaryStructure.hra} onChange={(e) => handleChange("salaryStructure.hra", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sal_conveyance">Conveyance</Label>
                  <Input id="sal_conveyance" value={formData.salaryStructure.conveyance} onChange={(e) => handleChange("salaryStructure.conveyance", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sal_medical">Medical Allowance</Label>
                  <Input id="sal_medical" value={formData.salaryStructure.medicalAllowance} onChange={(e) => handleChange("salaryStructure.medicalAllowance", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sal_special">Special Allowance</Label>
                  <Input id="sal_special" value={formData.salaryStructure.specialAllowance} onChange={(e) => handleChange("salaryStructure.specialAllowance", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sal_incentive">Incentive</Label>
                  <Input id="sal_incentive" value={formData.salaryStructure?.incentive || ""} onChange={(e) => handleChange("salaryStructure.incentive", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sal_pf">P.F. Deduction</Label>
                  <Input id="sal_pf" value={formData.salaryStructure.pf} onChange={(e) => handleChange("salaryStructure.pf", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sal_esi">E.S.I. Deduction</Label>
                  <Input id="sal_esi" value={formData.salaryStructure.esi} onChange={(e) => handleChange("salaryStructure.esi", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sal_insurance">Insurance</Label>
                  <Input id="sal_insurance" value={formData.salaryStructure.insurance} onChange={(e) => handleChange("salaryStructure.insurance", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sal_leaves">Leaves (Liability)</Label>
                  <Input id="sal_leaves" value={formData.salaryStructure.leaves} onChange={(e) => handleChange("salaryStructure.leaves", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sal_lta">L.T.A. (Liability)</Label>
                  <Input id="sal_lta" value={formData.salaryStructure.lta} onChange={(e) => handleChange("salaryStructure.lta", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sal_pt">Professional Tax</Label>
                  <Input id="sal_pt" value={formData.salaryStructure.professionalTax} onChange={(e) => handleChange("salaryStructure.professionalTax", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sal_tds">*Income Tax (TDS)</Label>
                  <Input id="sal_tds" value={formData.salaryStructure.tds} onChange={(e) => handleChange("salaryStructure.tds", e.target.value)} />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {renderStep() === 3 && (
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

        {renderStep() === 4 && (
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

        {renderStep() === 5 && (
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
                  "Overview", "Attendance", "Attendance List", "Leads", "Leads CSV Actions", "Leads Bulk Add", "Leads Distribution", "Reports", "Profile",
                  "Wallet", "Payroll", "Leave", "Leave Approvals", "Holidays", "Employees", "All Investors", "Self Investors", "Invoice Form", "Teams", "Debenture Form", "Cash Memo", "Vendor Invoices", "Letter Register", "Certificates"
                ].map(module => (
                  <label 
                    key={module} 
                    htmlFor={`module-${module}`} 
                    className={`flex items-center space-x-3 p-3 rounded-xl border cursor-pointer transition-all ${formData.accessibleModules.includes(module) ? 'bg-blue-50/50 border-[#134086]/30 shadow-sm dark:bg-[#134086]/10 dark:border-[#134086]/50' : 'bg-white border-zinc-200 hover:bg-zinc-50 dark:bg-zinc-950 dark:border-zinc-800 dark:hover:bg-zinc-900'}`}
                  >
                    <div className="relative flex items-center justify-center">
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
                        className="peer sr-only"
                      />
                      <div className={`w-5 h-5 rounded flex items-center justify-center transition-all ${formData.accessibleModules.includes(module) ? 'bg-[#134086] border-[#134086]' : 'border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 peer-hover:border-zinc-400'}`}>
                        {formData.accessibleModules.includes(module) && <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                      </div>
                    </div>
                    <span className={`text-sm font-bold ${formData.accessibleModules.includes(module) ? 'text-[#134086] dark:text-blue-400' : 'text-zinc-700 dark:text-zinc-300'}`}>
                      {module}
                    </span>
                  </label>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

          <div className="mt-8 flex justify-between items-center bg-zinc-50 dark:bg-zinc-900/50 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800">
            <Button type="button" variant="outline" onClick={() => setStep(step - 1)} disabled={step === 0 || loading} className="bg-white dark:bg-zinc-950">
              <ChevronLeft className="mr-2 h-4 w-4" /> Previous
            </Button>

            {step < steps.length - 1 ? (
              <Button type="button" onClick={() => setStep(step + 1)}>
                Next Step <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button type="button" onClick={handleSubmit} disabled={loading} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                {loading ? "Saving..." : <><Save className="mr-2 h-4 w-4" /> Save Employee</>}
              </Button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}
