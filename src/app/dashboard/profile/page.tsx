"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { KeyRound, ShieldCheck } from "lucide-react";

export default function ProfilePage() {
  const [loading, setLoading] = useState(false);
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

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 flex items-center">
          <ShieldCheck className="mr-3 h-8 w-8 text-blue-600" />
          My Profile
        </h1>
        <p className="text-zinc-500 dark:text-zinc-400">Manage your account security and preferences.</p>
      </div>

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
