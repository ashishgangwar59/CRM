"use client";

import { useEffect, useState } from "react";
import { AdminDashboard } from "./components/AdminDashboard";
import { EmployeeDashboard } from "./components/EmployeeDashboard";

export default function DashboardPage() {
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkRole = async () => {
      try {
        const res = await fetch("/api/auth/me");
        const data = await res.json();
        if (data.success) {
          setRole(data.role);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    checkRole();
  }, []);

  if (loading) return <div className="p-8">Authenticating workspace...</div>;
  if (!role) return <div className="p-8 text-rose-500">Unauthorized. Please log in.</div>;

  return role === "Super Admin" ? <AdminDashboard /> : <EmployeeDashboard />;
}
