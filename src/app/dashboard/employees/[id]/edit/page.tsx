"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Save } from "lucide-react";
import Link from "next/link";

export default function EditEmployeePage() {
  const { id } = useParams();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("personal");
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [departments, setDepartments] = useState<string[]>([]);
  const [designations, setDesignations] = useState<string[]>([]);

  const [formData, setFormData] = useState({
    employeeCode: "",
    firstName: "",
    lastName: "",
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
    kyc: { aadharNumber: "", panNumber: "", passportNumber: "" },
    bankDetails: { bankName: "", accountNumber: "", ifscCode: "", branchName: "" },
    emergencyContact: { name: "", relation: "", phone: "" },
    profilePhotoUrl: "",
    accessibleModules: ["Overview", "Attendance", "Leads", "Reports", "Profile"]
  });

  useEffect(() => {
    // Fetch departments and designations from settings
    fetch("/api/settings")
      .then(res => res.json())
      .then(data => {
        if (data.success && data.data) {
          setDepartments(data.data.departments || []);
          setDesignations(data.data.designations || []);
        }
      });

    fetch(`/api/employees/${id}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          const emp = data.data;
          setFormData({
            employeeCode: emp.employeeCode || "",
            firstName: emp.firstName || "",
            lastName: emp.lastName || "",
            email: emp.email || "",
            officeEmail: emp.officeEmail || "",
            phone: emp.phone || "",
            companyPhone: emp.companyPhone || "",
            permanentAddress: emp.permanentAddress || "",
            correspondenceAddress: emp.correspondenceAddress || "",
            dateOfBirth: emp.dateOfBirth ? new Date(emp.dateOfBirth).toISOString().split('T')[0] : "",
            gender: emp.gender || "",
            bloodGroup: emp.bloodGroup || "",
            maritalStatus: emp.maritalStatus || "",
            dateOfJoining: emp.dateOfJoining ? new Date(emp.dateOfJoining).toISOString().split('T')[0] : "",
            workLocation: emp.workLocation || "",
            status: emp.status || "Active",
            employeeType: emp.employeeType || "Full-Time",
            systemRole: emp.role || emp.systemRole || "Employee",
            department: emp.department || "",
            designation: emp.designation || "",
            kyc: {
              aadharNumber: emp.kyc?.aadharNumber || "",
              panNumber: emp.kyc?.panNumber || "",
              passportNumber: emp.kyc?.passportNumber || ""
            },
            bankDetails: {
              bankName: emp.bankDetails?.bankName || "",
              accountNumber: emp.bankDetails?.accountNumber || "",
              ifscCode: emp.bankDetails?.ifscCode || "",
              branchName: emp.bankDetails?.branchName || ""
            },
            emergencyContact: {
              name: emp.emergencyContact?.name || "",
              relation: emp.emergencyContact?.relation || "",
              phone: emp.emergencyContact?.phone || ""
            },
            profilePhotoUrl: emp.profilePhotoUrl || "",
            accessibleModules: emp.accessibleModules || ["Overview", "Attendance", "Leads", "Reports", "Profile"]
          });
        }
        setPageLoading(false);
      });
  }, [id]);

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
      const res = await fetch(`/api/employees/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (data.success) {
        alert("Employee details updated successfully!");
        router.push(`/dashboard/employees/${id}`);
      } else {
        alert(data.error || "Failed to update employee");
      }
    } catch (err) {
      alert("Failed to save employee");
    }
    setLoading(false);
  };

  if (pageLoading) return <div className="p-8">Loading employee data...</div>;

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-10">
      <div className="flex items-center space-x-4">
        <Link href={`/dashboard/employees/${id}`}>
          <Button variant="outline" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Edit Employee</h1>
          <p className="text-zinc-500 dark:text-zinc-400">Update complete employee profile and system details.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="personal">Personal</TabsTrigger>
            <TabsTrigger value="official">Official & Work</TabsTrigger>
            <TabsTrigger value="kyc">KYC & Emergency</TabsTrigger>
            <TabsTrigger value="bank">Bank Details</TabsTrigger>
            <TabsTrigger value="permissions">Permissions & Access</TabsTrigger>
          </TabsList>

          <TabsContent value="personal">
            <Card>
              <CardHeader>
                <CardTitle>Personal Details</CardTitle>
                <CardDescription>Manage personal identification, contact, and demographic info.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="employeeCode">Employee Code / ID *</Label>
                    <Input id="employeeCode" required value={formData.employeeCode} onChange={(e) => handleChange("employeeCode", e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name *</Label>
                    <Input id="firstName" required value={formData.firstName} onChange={(e) => handleChange("firstName", e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name *</Label>
                    <Input id="lastName" required value={formData.lastName} onChange={(e) => handleChange("lastName", e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Personal Email *</Label>
                    <Input id="email" type="email" required value={formData.email} onChange={(e) => handleChange("email", e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="officeEmail">Work / Office Email</Label>
                    <Input id="officeEmail" type="email" value={formData.officeEmail} onChange={(e) => handleChange("officeEmail", e.target.value)} placeholder="work@company.com" />
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
                    <Label htmlFor="gender">Gender</Label>
                    <select
                      id="gender"
                      className="flex h-10 w-full rounded-md border border-zinc-300 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:border-zinc-700 dark:text-zinc-50 dark:focus:ring-zinc-300"
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
                    <select
                      id="bloodGroup"
                      className="flex h-10 w-full rounded-md border border-zinc-300 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:border-zinc-700 dark:text-zinc-50 dark:focus:ring-zinc-300"
                      value={formData.bloodGroup}
                      onChange={(e) => handleChange("bloodGroup", e.target.value)}
                    >
                      <option value="">Select Blood Group</option>
                      <option value="A+">A+</option>
                      <option value="A-">A-</option>
                      <option value="B+">B+</option>
                      <option value="B-">B-</option>
                      <option value="O+">O+</option>
                      <option value="O-">O-</option>
                      <option value="AB+">AB+</option>
                      <option value="AB-">AB-</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="maritalStatus">Marital Status</Label>
                    <select
                      id="maritalStatus"
                      className="flex h-10 w-full rounded-md border border-zinc-300 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:border-zinc-700 dark:text-zinc-50 dark:focus:ring-zinc-300"
                      value={formData.maritalStatus}
                      onChange={(e) => handleChange("maritalStatus", e.target.value)}
                    >
                      <option value="">Select Status</option>
                      <option value="Single">Single</option>
                      <option value="Married">Married</option>
                      <option value="Divorced">Divorced</option>
                      <option value="Widowed">Widowed</option>
                    </select>
                  </div>
                  <div className="space-y-2 col-span-2">
                    <Label>Profile Photo</Label>
                    <div className="flex items-center space-x-4">
                      {formData.profilePhotoUrl && (
                        <img src={formData.profilePhotoUrl} alt="Photo" className="h-12 w-12 rounded-full object-cover border" />
                      )}
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
                <CardTitle>Official & Work Details</CardTitle>
                <CardDescription>Manage employment role, department, status, and joining information.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="systemRole">System Access Role</Label>
                    <select
                      id="systemRole"
                      className="flex h-10 w-full rounded-md border border-zinc-300 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:border-zinc-700 dark:text-zinc-50 dark:focus:ring-zinc-300"
                      value={formData.systemRole}
                      onChange={(e) => handleChange("systemRole", e.target.value)}
                    >
                      <option value="Employee">Employee</option>
                      <option value="Manager">Manager</option>
                      <option value="ADMIN">Admin</option>
                      <option value="KEY_ADMIN">Key Admin</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="official-department">Department</Label>
                    <select
                      id="official-department"
                      className="flex h-10 w-full rounded-md border border-zinc-300 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:border-zinc-700 dark:text-zinc-50 dark:focus:ring-zinc-300"
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
                      className="flex h-10 w-full rounded-md border border-zinc-300 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:border-zinc-700 dark:text-zinc-50 dark:focus:ring-zinc-300"
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
                    <Label htmlFor="status">Employment Status</Label>
                    <select
                      id="status"
                      className="flex h-10 w-full rounded-md border border-zinc-300 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:border-zinc-700 dark:text-zinc-50 dark:focus:ring-zinc-300"
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
                      className="flex h-10 w-full rounded-md border border-zinc-300 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:border-zinc-700 dark:text-zinc-50 dark:focus:ring-zinc-300"
                      value={formData.employeeType}
                      onChange={(e) => handleChange("employeeType", e.target.value)}
                    >
                      <option value="Full-Time">Full-Time</option>
                      <option value="Part-Time">Part-Time</option>
                      <option value="Contract">Contract</option>
                      <option value="Intern">Intern</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dateOfJoining">Date of Joining</Label>
                    <Input id="dateOfJoining" type="date" value={formData.dateOfJoining} onChange={(e) => handleChange("dateOfJoining", e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="workLocation">Work Location / Branch</Label>
                    <Input id="workLocation" value={formData.workLocation} onChange={(e) => handleChange("workLocation", e.target.value)} placeholder="e.g. Delhi Head Office" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="kyc">
            <Card>
              <CardHeader>
                <CardTitle>KYC & Emergency Contacts</CardTitle>
                <CardDescription>Government identity numbers and emergency contact person details.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <h4 className="font-semibold text-sm text-zinc-700 dark:text-zinc-300 border-b pb-2">Government IDs</h4>
                  <div className="grid grid-cols-3 gap-4">
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
                </div>

                <div className="space-y-4 pt-2">
                  <h4 className="font-semibold text-sm text-zinc-700 dark:text-zinc-300 border-b pb-2">Emergency Contact Person</h4>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="emergencyName">Contact Name</Label>
                      <Input id="emergencyName" value={formData.emergencyContact.name} onChange={(e) => handleChange("emergencyContact.name", e.target.value)} placeholder="Full Name" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="emergencyRelation">Relation</Label>
                      <Input id="emergencyRelation" value={formData.emergencyContact.relation} onChange={(e) => handleChange("emergencyContact.relation", e.target.value)} placeholder="e.g. Spouse / Father" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="emergencyPhone">Phone Number</Label>
                      <Input id="emergencyPhone" value={formData.emergencyContact.phone} onChange={(e) => handleChange("emergencyContact.phone", e.target.value)} placeholder="10-digit mobile" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="bank">
            <Card>
              <CardHeader>
                <CardTitle>Bank Account Details</CardTitle>
                <CardDescription>Direct deposit salary account information.</CardDescription>
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
                <CardTitle>Module Access & Permissions</CardTitle>
                <CardDescription>Configure sidebar navigation access for this employee's account.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {[
                    "Overview", "Attendance", "Leads", "Reports", "Profile",
                    "Executive AI", "Wallet", "Payroll", "Leave", "Holidays", "Employees", "Notifications", "Settings"
                  ].map(module => (
                    <div key={module} className="flex items-center space-x-2 p-2 rounded-md hover:bg-zinc-50 dark:hover:bg-zinc-900 border">
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
                      <label htmlFor={`module-${module}`} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer">
                        {module}
                      </label>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="mt-8 flex justify-end space-x-3">
          <Link href={`/dashboard/employees/${id}`}>
            <Button variant="outline" type="button">Cancel</Button>
          </Link>
          <Button type="submit" disabled={loading}>
            {loading ? "Saving..." : <><Save className="mr-2 h-4 w-4" /> Save Changes</>}
          </Button>
        </div>
      </form>
    </div>
  );
}
