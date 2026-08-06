"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User, Mail, Phone, Lock, CheckCircle, AlertCircle, ArrowRight, Key } from "lucide-react";

export default function InvestorRegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });

  // OTP states
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [debugOtp, setDebugOtp] = useState("");

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const handleSendOtp = async () => {
    if (!formData.phone || !formData.email) {
      setErrorMsg("Please fill in Email Address and Phone Number first.");
      return;
    }
    setLoading(true);
    setErrorMsg("");
    setSuccessMsg("");
    setDebugOtp("");
    try {
      const res = await fetch("/api/auth/otp/send-registration", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: formData.phone,
          email: formData.email,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || "Failed to send verification OTP");
        return;
      }

      setOtpSent(true);
      setSuccessMsg("Verification OTP sent to your phone number.");
      if (data.debugOtp) {
        setDebugOtp(data.debugOtp);
      }
    } catch (err) {
      setErrorMsg("Error sending OTP. Please check server logs.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (!otpSent) {
      setErrorMsg("Please request and verify OTP code first.");
      return;
    }

    if (!otp) {
      setErrorMsg("Please enter the verification OTP.");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setErrorMsg("Passwords do not match!");
      return;
    }

    if (formData.password.length < 6) {
      setErrorMsg("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/investors/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: formData.fullName,
          email: formData.email,
          phone: formData.phone,
          password: formData.password,
          otp: otp,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSuccessMsg(data.message || "Registration successful! Redirecting to login...");
        setTimeout(() => {
          router.push("/login");
        }, 2000);
      } else {
        setErrorMsg(data.error || "Registration failed.");
      }
    } catch (err) {
      setErrorMsg("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 text-white">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center mb-6">
        <h1 className="text-3xl font-black text-indigo-400 tracking-wider">INVESTOR PORTAL</h1>
        <p className="text-sm text-zinc-400 mt-1">Register your Investor Account to submit KYC & Bond Agreement</p>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <Card className="bg-zinc-900 border-zinc-800 text-white shadow-2xl">
          <CardHeader>
            <CardTitle className="text-xl font-bold">Create Investor Account</CardTitle>
            <CardDescription className="text-zinc-400">Fill details to start your investment onboard</CardDescription>
          </CardHeader>
          <CardContent>
            {errorMsg && (
              <div className="p-3 mb-4 rounded-md bg-rose-950/60 border border-rose-800 text-rose-300 text-sm flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="p-3 mb-4 rounded-md bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-sm flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* {debugOtp && (
              <div className="p-3 mb-4 rounded-md bg-blue-950/60 border border-blue-800 text-blue-300 text-sm font-mono text-center">
                DEBUG OTP: <span className="font-bold text-base">{debugOtp}</span>
              </div>
            )} */}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="fullName">Full Name *</Label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3 top-3 text-zinc-500" />
                  <Input
                    id="fullName"
                    required
                    placeholder="John Doe"
                    className="pl-9 bg-zinc-950 border-zinc-800 focus:border-indigo-500"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="email">Email Address *</Label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-3 text-zinc-500" />
                  <Input
                    id="email"
                    type="email"
                    required
                    placeholder="investor@example.com"
                    className="pl-9 bg-zinc-950 border-zinc-800 focus:border-indigo-500"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="phone">Phone Number *</Label>
                <div className="flex space-x-2">
                  <div className="relative flex-1">
                    <Phone className="w-4 h-4 absolute left-3 top-3 text-zinc-500" />
                    <Input
                      id="phone"
                      required
                      placeholder="+91 9876543210"
                      className="pl-9 bg-zinc-950 border-zinc-800 focus:border-indigo-500"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    className="bg-zinc-850 hover:bg-zinc-800 border-zinc-700 text-white"
                    onClick={handleSendOtp}
                    disabled={loading || !formData.phone || !formData.email}
                  >
                    {otpSent ? "Resend" : "Send OTP"}
                  </Button>
                </div>
              </div>

              {otpSent && (
                <div className="space-y-1.5 animate-in fade-in duration-200">
                  <Label htmlFor="otp">Verification OTP Code *</Label>
                  <div className="relative">
                    <Key className="w-4 h-4 absolute left-3 top-3 text-zinc-500" />
                    <Input
                      id="otp"
                      required
                      maxLength={6}
                      placeholder="123456"
                      className="pl-9 bg-zinc-950 border-zinc-800 focus:border-indigo-500"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                    />
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="password">Password *</Label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-3 text-zinc-500" />
                  <Input
                    id="password"
                    type="password"
                    required
                    placeholder="••••••••"
                    className="pl-9 bg-zinc-950 border-zinc-800 focus:border-indigo-500"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="confirmPassword">Confirm Password *</Label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-3 text-zinc-500" />
                  <Input
                    id="confirmPassword"
                    type="password"
                    required
                    placeholder="••••••••"
                    className="pl-9 bg-zinc-950 border-zinc-800 focus:border-indigo-500"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  />
                </div>
              </div>

              <Button type="submit" disabled={loading || !otpSent} className="w-full bg-indigo-600 hover:bg-indigo-500 font-bold py-2 mt-2">
                {loading ? "Creating Account..." : <span className="flex items-center justify-center">Register Investor <ArrowRight className="w-4 h-4 ml-2" /></span>}
              </Button>
            </form>

            <div className="mt-6 text-center text-xs text-zinc-400 border-t border-zinc-800 pt-4">
              Already have an account?{" "}
              <Link href="/login" className="text-indigo-400 hover:underline font-semibold">
                Login to Portal
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
