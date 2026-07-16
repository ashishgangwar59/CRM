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

  useEffect(() => {
    fetch("/api/auth/me")
      .then(res => res.json())
      .then(data => {
        if (data.success && data.employee) {
          setEmployee(data.employee);
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
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 flex items-center">
          <ShieldCheck className="mr-3 h-8 w-8 text-blue-600" />
          My Profile
        </h1>
        <p className="text-zinc-500 dark:text-zinc-400">Manage your account security and preferences.</p>
      </div>

      {employee && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-lg">
              <User className="mr-2 h-5 w-5 text-zinc-500" /> Personal Information
            </CardTitle>
            <CardDescription>Your personal and official details (Read-Only).</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center space-x-6">
              <div className="h-24 w-24 rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden flex items-center justify-center shrink-0">
                {employee.profilePhotoUrl ? (
                  <img src={employee.profilePhotoUrl} alt="Profile" className="h-full w-full object-cover" />
                ) : (
                  <User className="h-12 w-12 text-zinc-400" />
                )}
              </div>
              <div className="space-y-2 flex-1">
                <Label htmlFor="photoUpload" className="text-sm font-medium cursor-pointer flex items-center text-blue-600 hover:text-blue-700">
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
                <p className="text-xs text-zinc-500">Only JPG, PNG files are allowed.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-zinc-500 uppercase tracking-wider">Full Name</Label>
                <p className="font-medium text-zinc-900 dark:text-zinc-100">{employee.firstName} {employee.lastName}</p>
              </div>
              <div>
                <Label className="text-xs text-zinc-500 uppercase tracking-wider">Email Address</Label>
                <p className="font-medium text-zinc-900 dark:text-zinc-100">{employee.email}</p>
              </div>
              <div>
                <Label className="text-xs text-zinc-500 uppercase tracking-wider">Phone Number</Label>
                <p className="font-medium text-zinc-900 dark:text-zinc-100">{employee.phone}</p>
              </div>
              <div>
                <Label className="text-xs text-zinc-500 uppercase tracking-wider">Date of Birth</Label>
                <p className="font-medium text-zinc-900 dark:text-zinc-100">
                  {employee.dateOfBirth ? new Date(employee.dateOfBirth).toLocaleDateString() : "Not Provided"}
                </p>
              </div>
              <div>
                <Label className="text-xs text-zinc-500 uppercase tracking-wider">Department</Label>
                <p className="font-medium text-zinc-900 dark:text-zinc-100">{employee.department || "N/A"}</p>
              </div>
              <div>
                <Label className="text-xs text-zinc-500 uppercase tracking-wider">Designation</Label>
                <p className="font-medium text-zinc-900 dark:text-zinc-100">{employee.designation || "N/A"}</p>
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
