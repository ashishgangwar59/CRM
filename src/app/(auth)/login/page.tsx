"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

import Image from "next/image";

export default function LoginPage() {
  const router = useRouter();
  const [loginMethod, setLoginMethod] = useState<"password" | "otp">("password");
  
  // Password Login States
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // OTP Login States
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [debugOtp, setDebugOtp] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSendOtp = async () => {
    if (!phone) {
      setError("Please enter your mobile number");
      return;
    }
    setLoading(true);
    setError("");
    setSuccessMsg("");
    setDebugOtp("");
    try {
      const res = await fetch("/api/auth/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to send OTP");
        return;
      }

      setOtpSent(true);
      setSuccessMsg("OTP sent successfully to your mobile number.");
      if (data.debugOtp) {
        setDebugOtp(data.debugOtp);
      }
    } catch (err) {
      setError("Failed to send OTP. Please check backend logs.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccessMsg("");

    try {
      const deviceInfo = navigator.userAgent; // Basic device info

      if (loginMethod === "otp") {
        if (!phone || !otp) {
          setError("Mobile number and OTP are required");
          setLoading(false);
          return;
        }

        const res = await fetch("/api/auth/login-otp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone, otp, rememberMe, deviceInfo }),
        });

        const data = await res.json();

        if (!res.ok) {
          setError(data.error || "Login failed");
          setLoading(false);
          return;
        }

        router.push("/dashboard");
      } else {
        // Password login
        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password, rememberMe, deviceInfo }),
        });

        const data = await res.json();

        if (!res.ok) {
          if (data.requirePasswordChange) {
            router.push("/reset-password?required=true");
          } else {
            setError(data.error || "Login failed");
          }
          setLoading(false);
          return;
        }

        router.push("/dashboard");
      }
    } catch (err) {
      setError("An unexpected error occurred");
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center flex flex-col items-center">
          <div className="mb-2">
            <Image
              src="/logo.png"
              alt="CRM Hub Logo"
              width={64}
              height={64}
              className="object-contain rounded-md"
              priority
            />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">Welcome back</CardTitle>
          <CardDescription>
            Choose your login method and access your account.
          </CardDescription>
        </CardHeader>
        
        {/* Toggle Login Method Tabs */}
        <div className="px-6">
          <div className="flex border-b border-gray-200 mb-6">
            <button
              type="button"
              className={`flex-1 pb-3 text-sm font-semibold border-b-2 transition-colors ${
                loginMethod === "password"
                  ? "border-indigo-600 text-indigo-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
              onClick={() => {
                setLoginMethod("password");
                setError("");
                setSuccessMsg("");
              }}
            >
              Password Login
            </button>
            <button
              type="button"
              className={`flex-1 pb-3 text-sm font-semibold border-b-2 transition-colors ${
                loginMethod === "otp"
                  ? "border-indigo-600 text-indigo-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
              onClick={() => {
                setLoginMethod("otp");
                setError("");
                setSuccessMsg("");
              }}
            >
              OTP Login
            </button>
          </div>
        </div>

        <form onSubmit={handleLogin}>
          <CardContent className="space-y-4">
            {error && (
              <div className="bg-red-50 text-red-500 p-3 rounded-md text-sm">
                {error}
              </div>
            )}
            {successMsg && (
              <div className="bg-green-50 text-green-600 p-3 rounded-md text-sm">
                {successMsg}
              </div>
            )}
            {debugOtp && (
              <div className="bg-blue-50 text-blue-700 p-3 rounded-md text-sm font-mono text-center">
                DEBUG OTP: <span className="font-bold text-base">{debugOtp}</span>
              </div>
            )}

            {loginMethod === "password" ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input 
                    id="email" 
                    type="email" 
                    placeholder="m@example.com" 
                    required={loginMethod === "password"}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Password</Label>
                    <a href="/forgot-password" className="text-sm font-medium text-blue-600 hover:underline">
                      Forgot password?
                    </a>
                  </div>
                  <Input 
                    id="password" 
                    type="password" 
                    required={loginMethod === "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              </>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="phone">Mobile Number</Label>
                  <div className="flex space-x-2">
                    <Input 
                      id="phone" 
                      type="tel" 
                      placeholder="+919876543210" 
                      required={loginMethod === "otp"}
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      disabled={otpSent && loading}
                      className="flex-1"
                    />
                    <Button 
                      type="button" 
                      variant="outline"
                      onClick={handleSendOtp}
                      disabled={loading || !phone}
                    >
                      {otpSent ? "Resend" : "Send OTP"}
                    </Button>
                  </div>
                </div>

                {otpSent && (
                  <div className="space-y-2 animate-in fade-in duration-200">
                    <Label htmlFor="otp">Enter 6-Digit OTP</Label>
                    <Input 
                      id="otp" 
                      type="text" 
                      maxLength={6} 
                      placeholder="123456" 
                      required={loginMethod === "otp" && otpSent}
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                    />
                  </div>
                )}
              </>
            )}

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="rememberMe"
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              />
              <Label htmlFor="rememberMe" className="font-normal cursor-pointer text-sm">
                Remember me for 7 days
              </Label>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-3">
            <Button type="submit" className="w-full" disabled={loading || (loginMethod === "otp" && !otpSent)}>
              {loading ? "Processing..." : "Sign in"}
            </Button>

            <div className="text-center text-xs text-zinc-500 pt-2 border-t w-full">
              Are you an Investor?{" "}
              <a href="/investor-register" className="text-blue-600 hover:underline font-semibold">
                Register Investor Account
              </a>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
