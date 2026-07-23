"use client";

import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { KeyRound, ShieldCheck, User, UploadCloud } from "lucide-react";

export default function ProfilePage() {
  const [loading, setLoading] = useState(false);
  const [employee, setEmployee] = useState<any>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    oldPassword: "",
    newPassword: "",
    confirmPassword: ""
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");
    setError("");

    if (formData.newPassword !== formData.confirmPassword) {
      setError("New passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/me/password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          oldPassword: formData.oldPassword,
          newPassword: formData.newPassword
        }),
      });
      const data = await res.json();
      
      if (data.success) {
        setMessage("Password updated successfully!");
        setFormData({ oldPassword: "", newPassword: "", confirmPassword: "" });
      } else {
        setError(data.error || "Failed to update password.");
      }
    } catch (err) {
      setError("Network error occurred.");
    }
    setLoading(false);
  };

  const [investor, setInvestor] = useState<any>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          if (data.employee) setEmployee(data.employee);
          if (data.investor) setInvestor(data.investor);
        }
      });
  }, []);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    setUploadingPhoto(true);
    const file = e.target.files[0];
    const data = new FormData();
    data.append("file", file);
    try {
      const res = await fetch("/api/employees/upload", { method: "POST", body: data });
      const json = await res.json();
      if (json.success) {
        // Save to DB
        const updateRes = await fetch("/api/auth/me", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ profilePhotoUrl: json.url })
        });
        const updateJson = await updateRes.json();
        if (updateJson.success) {
          setEmployee((prev: any) => ({ ...prev, profilePhotoUrl: json.url }));
          alert("Profile photo updated successfully!");
        } else {
          alert("Failed to save profile photo.");
        }
      } else {
        alert("Upload failed");
      }
    } catch (err) {
      alert("Upload error");
    }
    setUploadingPhoto(false);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-20">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 flex items-center">
          <ShieldCheck className="mr-3 h-8 w-8 text-blue-600" />
          My Profile
        </h1>
        <p className="text-zinc-500 dark:text-zinc-400">Manage your profile details and account security.</p>
      </div>

      {/* Investor Profile Details Card */}
      {investor && (
        <Card className="border-indigo-200 dark:border-indigo-900 shadow-md">
          <CardHeader className="bg-indigo-50/50 dark:bg-indigo-950/30 border-b dark:border-indigo-900/50">
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="flex items-center text-xl font-black text-indigo-950 dark:text-indigo-200">
                  <User className="mr-2 h-6 w-6 text-indigo-600" /> {investor.fullName}
                </CardTitle>
                <CardDescription className="text-indigo-600 dark:text-indigo-400 font-mono font-bold text-xs mt-1">
                  Code: {investor.investorCode || "INV-0000"}
                </CardDescription>
              </div>
              <span className={`px-3.5 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                investor.status === "Verified" ? "bg-emerald-950 text-emerald-400 border border-emerald-800" :
                investor.status === "Rejected" ? "bg-rose-950 text-rose-400 border border-rose-800" :
                "bg-amber-950 text-amber-400 border border-amber-800"
              }`}>
                {investor.status}
              </span>
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-3 bg-zinc-50 dark:bg-zinc-900 rounded-lg border dark:border-zinc-800">
                <Label className="text-xs text-zinc-500 uppercase font-bold">Email Address</Label>
                <p className="font-semibold text-zinc-900 dark:text-zinc-100">{investor.email}</p>
              </div>
              <div className="p-3 bg-zinc-50 dark:bg-zinc-900 rounded-lg border dark:border-zinc-800">
                <Label className="text-xs text-zinc-500 uppercase font-bold">Phone Number</Label>
                <p className="font-semibold text-zinc-900 dark:text-zinc-100">{investor.phone}</p>
              </div>
              <div className="p-3 bg-zinc-50 dark:bg-zinc-900 rounded-lg border dark:border-zinc-800">
                <Label className="text-xs text-zinc-500 uppercase font-bold">Invested RS Amount</Label>
                <p className="font-black text-lg text-emerald-500">₹{(investor.investmentAmount || 0).toLocaleString()}</p>
              </div>
              <div className="p-3 bg-zinc-50 dark:bg-zinc-900 rounded-lg border dark:border-zinc-800">
                <Label className="text-xs text-zinc-500 uppercase font-bold">Monthly Growth (%)</Label>
                <p className="font-black text-lg text-indigo-400">{investor.monthlyGrowthPercentage || 2.5}% / mo</p>
              </div>
            </div>

            {/* Document Verifications Breakdown */}
            <div className="space-y-3 border-t pt-4 dark:border-zinc-800">
              <h4 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">KYC Document Verification Statuses</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                {["aadhar", "pan", "marksheet10th", "marksheet12th", "graduation", "postGraduation", "bankPassbook"].map((docKey) => {
                  const status = investor.docVerifications?.[docKey] || "Pending";
                  return (
                    <div key={docKey} className="p-2.5 bg-zinc-50 dark:bg-zinc-950 border rounded-lg dark:border-zinc-800">
                      <p className="font-bold capitalize text-zinc-600 dark:text-zinc-400">{docKey}</p>
                      <span className={`font-black text-[11px] ${
                        status === "Approved" ? "text-emerald-500" :
                        status === "Rejected" ? "text-rose-500" :
                        "text-amber-500"
                      }`}>
                        {status}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Bank Details */}
            {investor.kycDocs?.accountNumber && (
              <div className="space-y-2 border-t pt-4 dark:border-zinc-800">
                <h4 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">Bank Account Details</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                  <div>
                    <span className="text-zinc-500">Bank Name:</span>
                    <p className="font-bold">{investor.kycDocs.bankName || "N/A"}</p>
                  </div>
                  <div>
                    <span className="text-zinc-500">Account No:</span>
                    <p className="font-bold font-mono">{investor.kycDocs.accountNumber || "N/A"}</p>
                  </div>
                  <div>
                    <span className="text-zinc-500">IFSC Code:</span>
                    <p className="font-bold font-mono">{investor.kycDocs.ifscCode || "N/A"}</p>
                  </div>
                  <div>
                    <span className="text-zinc-500">Branch:</span>
                    <p className="font-bold">{investor.kycDocs.branchName || "N/A"}</p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Employee Profile Details Card */}
      {employee && (
        <Card className="border-[#eee] bg-white shadow-sm">
          <CardHeader className="border-b border-[#eee]">
            <CardTitle className="flex items-center text-[#134086] text-xl font-bold">
              <User className="mr-2 h-6 w-6 text-[#134086]" /> Personal & Official Employee Information
            </CardTitle>
            <CardDescription>Your complete personal, official, bank, and KYC records.</CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            {/* Profile Photo Header */}
            <div className="flex items-center space-x-6 pb-4 border-b border-[#eee]">
              <div className="h-24 w-24 rounded-full bg-zinc-100 border border-[#eee] overflow-hidden flex items-center justify-center shrink-0 shadow-inner">
                {employee.profilePhotoUrl ? (
                  <img src={employee.profilePhotoUrl} alt="Profile" className="h-full w-full object-cover" />
                ) : (
                  <User className="h-12 w-12 text-zinc-400" />
                )}
              </div>
              <div className="space-y-2 flex-1">
                <Label htmlFor="photoUpload" className="text-sm font-bold cursor-pointer flex items-center text-[#134086] hover:underline">
                  <UploadCloud className="w-4 h-4 mr-2" />
                  {uploadingPhoto ? "Uploading..." : "Change Profile Photo"}
                </Label>
                <Input 
                  id="photoUpload" 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  onChange={handlePhotoUpload} 
                  disabled={uploadingPhoto}
                />
                <p className="text-xs text-zinc-500">Supported formats: JPG, PNG (Max 5MB)</p>
              </div>
            </div>

            {/* 1. Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-3 bg-zinc-50 border border-[#eee] rounded-lg">
                <Label className="text-xs text-zinc-500 font-bold uppercase">Employee Code</Label>
                <p className="font-mono font-bold text-sm text-[#134086]">{employee.employeeCode || "N/A"}</p>
              </div>
              <div className="p-3 bg-zinc-50 border border-[#eee] rounded-lg">
                <Label className="text-xs text-zinc-500 font-bold uppercase">Full Name</Label>
                <p className="font-bold text-sm text-zinc-900">{employee.firstName} {employee.lastName}</p>
              </div>
              <div className="p-3 bg-zinc-50 border border-[#eee] rounded-lg">
                <Label className="text-xs text-zinc-500 font-bold uppercase">Status / Type</Label>
                <p className="font-bold text-sm text-[#00a65a]">{employee.status || "Active"} ({employee.employeeType || "Full-Time"})</p>
              </div>
            </div>

            {/* 2. Contact & Personal */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-3 bg-zinc-50 border border-[#eee] rounded-lg">
                <Label className="text-xs text-zinc-500 font-bold uppercase">Personal Email</Label>
                <p className="font-semibold text-sm text-zinc-900">{employee.email}</p>
              </div>
              <div className="p-3 bg-zinc-50 border border-[#eee] rounded-lg">
                <Label className="text-xs text-zinc-500 font-bold uppercase">Office Email</Label>
                <p className="font-semibold text-sm text-zinc-900">{employee.officeEmail || employee.email}</p>
              </div>
              <div className="p-3 bg-zinc-50 border border-[#eee] rounded-lg">
                <Label className="text-xs text-zinc-500 font-bold uppercase">Phone Number</Label>
                <p className="font-semibold text-sm text-zinc-900">{employee.phone}</p>
              </div>
              <div className="p-3 bg-zinc-50 border border-[#eee] rounded-lg">
                <Label className="text-xs text-zinc-500 font-bold uppercase">Date of Birth</Label>
                <p className="font-semibold text-sm text-zinc-900">
                  {employee.dateOfBirth ? new Date(employee.dateOfBirth).toLocaleDateString() : "N/A"}
                </p>
              </div>
              <div className="p-3 bg-zinc-50 border border-[#eee] rounded-lg">
                <Label className="text-xs text-zinc-500 font-bold uppercase">Gender / Blood Group</Label>
                <p className="font-semibold text-sm text-zinc-900">{employee.gender || "N/A"} / {employee.bloodGroup || "N/A"}</p>
              </div>
              <div className="p-3 bg-zinc-50 border border-[#eee] rounded-lg">
                <Label className="text-xs text-zinc-500 font-bold uppercase">Marital Status</Label>
                <p className="font-semibold text-sm text-zinc-900">{employee.maritalStatus || "N/A"}</p>
              </div>
            </div>

            {/* 3. Official Work Details */}
            <div className="space-y-2 border-t border-[#eee] pt-4">
              <h4 className="font-bold text-sm text-[#134086] uppercase tracking-wider">Department & Work Location</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-3 bg-zinc-50 border border-[#eee] rounded-lg">
                  <Label className="text-xs text-zinc-500 font-bold uppercase">Department</Label>
                  <p className="font-bold text-sm text-zinc-900">{employee.department || "N/A"}</p>
                </div>
                <div className="p-3 bg-zinc-50 border border-[#eee] rounded-lg">
                  <Label className="text-xs text-zinc-500 font-bold uppercase">Designation</Label>
                  <p className="font-bold text-sm text-zinc-900">{employee.designation || "N/A"}</p>
                </div>
                <div className="p-3 bg-zinc-50 border border-[#eee] rounded-lg">
                  <Label className="text-xs text-zinc-500 font-bold uppercase">Work Location / Joining</Label>
                  <p className="font-bold text-sm text-zinc-900">
                    {employee.workLocation || "Headquarters"} ({employee.dateOfJoining ? new Date(employee.dateOfJoining).toLocaleDateString() : "N/A"})
                  </p>
                </div>
              </div>
            </div>

            {/* 4. Bank & KYC Details */}
            <div className="space-y-2 border-t border-[#eee] pt-4">
              <h4 className="font-bold text-sm text-[#134086] uppercase tracking-wider">Bank & Identity Details</h4>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
                <div className="p-3 bg-zinc-50 border border-[#eee] rounded-lg">
                  <span className="text-zinc-500 font-bold">Aadhar No:</span>
                  <p className="font-mono font-bold text-sm text-zinc-900">{employee.kyc?.aadharNumber || "N/A"}</p>
                </div>
                <div className="p-3 bg-zinc-50 border border-[#eee] rounded-lg">
                  <span className="text-zinc-500 font-bold">PAN No:</span>
                  <p className="font-mono font-bold text-sm text-zinc-900">{employee.kyc?.panNumber || "N/A"}</p>
                </div>
                <div className="p-3 bg-zinc-50 border border-[#eee] rounded-lg">
                  <span className="text-zinc-500 font-bold">Bank Name:</span>
                  <p className="font-bold text-sm text-zinc-900">{employee.bankDetails?.bankName || "N/A"}</p>
                </div>
                <div className="p-3 bg-zinc-50 border border-[#eee] rounded-lg">
                  <span className="text-zinc-500 font-bold">Account No:</span>
                  <p className="font-mono font-bold text-sm text-zinc-900">{employee.bankDetails?.accountNumber || "N/A"}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-lg">
            <KeyRound className="mr-2 h-5 w-5 text-zinc-500" /> Change Password
          </CardTitle>
          <CardDescription>Secure your account by updating your password regularly.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && <div className="p-3 bg-rose-50 text-rose-600 text-sm rounded-md border border-rose-200">{error}</div>}
            {message && <div className="p-3 bg-emerald-50 text-emerald-600 text-sm rounded-md border border-emerald-200">{message}</div>}

            <div className="space-y-2">
              <Label htmlFor="oldPassword">Current Password</Label>
              <Input 
                id="oldPassword" 
                type="password" 
                required 
                value={formData.oldPassword}
                onChange={e => setFormData(prev => ({ ...prev, oldPassword: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password</Label>
              <Input 
                id="newPassword" 
                type="password" 
                required 
                value={formData.newPassword}
                onChange={e => setFormData(prev => ({ ...prev, newPassword: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <Input 
                id="confirmPassword" 
                type="password" 
                required 
                value={formData.confirmPassword}
                onChange={e => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
              />
            </div>

            <Button type="submit" className="w-full mt-4" disabled={loading}>
              {loading ? "Updating..." : "Update Password"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
