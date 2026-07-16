"use client";

import { useEffect, useState, ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, Users, Clock, LogOut, Settings, CalendarRange, Umbrella, IndianRupee, Wallet, Target, LineChart, RadioTower, Brain, User as UserIcon } from "lucide-react";
import { cn } from "@/lib/utils";

import Image from "next/image";
import { useTheme } from "../theme-provider";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [role, setRole] = useState<string | null>(null);
  const [modules, setModules] = useState<string[]>([]);
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    fetch("/api/auth/me")
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setRole(data.role);
          setModules(data.accessibleModules || []);
        }
      });
  }, []);

  const handleLogout = async () => {
    try {
      const res = await fetch("/api/auth/logout", { method: "POST" });
      if (res.ok) {
        router.push("/login");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const navItems = [
    { name: "Overview", href: "/dashboard", icon: LayoutDashboard, roles: ["ADMIN", "KEY_ADMIN", "Employee"] },
    { name: "Wallet", href: "/dashboard/wallet", icon: Wallet, roles: ["ADMIN", "KEY_ADMIN"] },
    { name: "Payroll", href: "/dashboard/payroll", icon: IndianRupee, roles: ["ADMIN", "KEY_ADMIN", "Employee"] },
    { name: "Attendance", href: "/dashboard/attendance", icon: Clock, roles: ["ADMIN", "KEY_ADMIN", "Employee"] },
    { name: "Leave", href: "/dashboard/leave", icon: Umbrella, roles: ["ADMIN", "KEY_ADMIN", "Employee"] },
    { name: "Holidays", href: "/dashboard/holidays", icon: CalendarRange, roles: ["ADMIN", "KEY_ADMIN", "Employee"] },
    { name: "Employees", href: "/dashboard/employees", icon: Users, roles: ["ADMIN", "KEY_ADMIN"] },
    { name: "Leads", href: "/dashboard/leads", icon: Target, roles: ["ADMIN", "KEY_ADMIN", "Employee"] },
    { name: "Reports", href: "/dashboard/reports", icon: LineChart, roles: ["ADMIN", "KEY_ADMIN", "Employee"] },
    { name: "Notifications", href: "/dashboard/reports/notifications", icon: RadioTower, roles: ["ADMIN", "KEY_ADMIN"] },
    { name: "Settings", href: "/dashboard/settings", icon: Settings, roles: ["ADMIN", "KEY_ADMIN"] },
    { name: "Profile", href: "/dashboard/profile", icon: UserIcon, roles: ["Employee"] },
  ];

  const visibleNavItems = navItems.filter(item => {
    if (!role) return false;
    if (role === "Employee") return modules.includes(item.name);
    return item.roles.includes(role);
  });

  return (
    <div className="flex h-screen bg-white dark:bg-gray-900">
      {/* Sidebar */}
      <aside className="w-64 border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 flex flex-col">
        <div className="flex h-16 items-center px-6 border-b border-zinc-200 dark:border-zinc-800">
          <Link href="/dashboard" className="flex items-center space-x-2 font-bold text-xl tracking-tight text-zinc-900 dark:text-zinc-50">
            <Image
              src="/logo.png"
              alt="CRM Hub Logo"
              width={32}
              height={32}
              className="rounded-md object-contain"
            />
            <span>CRM Hub</span>
          </Link>
        </div>

        <nav className="flex-1 space-y-1 p-4">
          {visibleNavItems.map((item) => {
            const isActive = pathname === item.href || (pathname.startsWith("/dashboard/employees") && item.href === "/dashboard/employees");
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center space-x-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
                  isActive
                    ? "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50"
                    : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-50"
                )}
              >
                <item.icon className={cn("h-4 w-4", isActive ? "text-zinc-900 dark:text-zinc-50" : "text-zinc-500 dark:text-zinc-400")} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-zinc-200 dark:border-zinc-800">
          <div className="flex flex-col space-y-0">
            {/* <button
              onClick={toggleTheme}
              className="flex w-full items-center justify-center space-x-3 px-3 py-2.5 rounded-md text-sm font-medium text-zinc-500 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 dark:text-gray-200 transition-colors"
            >
              {theme === "dark" ? "Light Mode" : "Dark Mode"}
            </button> */}
            <button
              onClick={handleLogout}
              className="flex w-full items-center space-x-3 px-3 py-2.5 rounded-md text-sm font-medium text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-50 transition-colors"
            >
              <LogOut className="h-4 w-4" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
