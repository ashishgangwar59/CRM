"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminDashboard } from "./components/AdminDashboard";
import { EmployeeDashboard } from "./components/EmployeeDashboard";

export default function DashboardPage() {
  const [role, setRole] = useState<string | null>(null);
  const [modules, setModules] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const checkRole = async () => {
      try {
        const res = await fetch("/api/auth/me");
        const data = await res.json();
        if (data.success) {
          setRole(data.role);
          setModules(data.accessibleModules || []);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    checkRole();
  }, []);

  useEffect(() => {
    if (!loading && role === "Employee" && !modules.includes("Overview")) {
      router.push("/dashboard/attendance");
    }
  }, [loading, role, modules, router]);

  if (loading) return <div className="p-8">Authenticating workspace...</div>;
  if (!role) return <div className="p-8 text-rose-500">Unauthorized. Please log in.</div>;

  if (role === "Employee" && !modules.includes("Overview")) {
    return <div className="p-8">Redirecting to Attendance...</div>;
  }

  return (role === "Super Admin" || role === "ADMIN") ? <AdminDashboard /> : <EmployeeDashboard />;
}
