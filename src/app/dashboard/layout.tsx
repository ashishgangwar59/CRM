"use client";

import { useEffect, useState, ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, Users, Clock, LogOut, Settings, CalendarRange, Umbrella, IndianRupee, Wallet, Target, LineChart, RadioTower, Brain, User as UserIcon, DollarSign, FileText, ChevronLeft, ChevronRight, Calculator } from "lucide-react";
import { cn } from "@/lib/utils";

import Image from "next/image";
import { useTheme } from "../theme-provider";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [role, setRole] = useState<string | null>(null);
  const [modules, setModules] = useState<string[]>([]);
  const [empCode, setEmpCode] = useState<string>("");
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    fetch("/api/auth/me")
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setRole(data.role);
          setModules(data.accessibleModules || []);
          if (data.employee?.employeeCode) {
            setEmpCode(data.employee.employeeCode);
          } else if (data.employee?.email) {
            setEmpCode(data.employee.email);
          }
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

  const debentureHref = empCode ? `/debenture-application?ref=${encodeURIComponent(empCode)}` : "/debenture-application";

  const navItems = [
    { name: "Overview", href: "/dashboard", icon: LayoutDashboard, roles: ["ADMIN", "KEY_ADMIN", "Employee"] },
    { name: "Investor Details", href: "/dashboard", icon: LayoutDashboard, roles: ["INVESTOR"] },
    { name: "Wallet", href: "/dashboard/wallet", icon: Wallet, roles: ["ADMIN", "KEY_ADMIN"] },
    { name: "Payroll", href: "/dashboard/payroll", icon: IndianRupee, roles: ["ADMIN", "KEY_ADMIN", "Employee"] },
    { name: "Attendance", href: "/dashboard/attendance", icon: Clock, roles: ["ADMIN", "KEY_ADMIN", "Employee"] },
    { name: "Leave", href: "/dashboard/leave", icon: Umbrella, roles: ["ADMIN", "KEY_ADMIN", "Employee"] },
    { name: "Holidays", href: "/dashboard/holidays", icon: CalendarRange, roles: ["ADMIN", "KEY_ADMIN", "Employee"] },
    { name: "Investors", href: "/dashboard/investors", icon: DollarSign, roles: ["ADMIN", "KEY_ADMIN", "Employee"] },
    { name: "Employees", href: "/dashboard/employees", icon: Users, roles: ["ADMIN", "KEY_ADMIN", "Employee"] },
    { name: "Leads", href: "/dashboard/leads", icon: Target, roles: ["ADMIN", "KEY_ADMIN", "Employee"] },
    { name: "Reports", href: "/dashboard/reports", icon: LineChart, roles: ["ADMIN", "KEY_ADMIN", "Employee"] },
    { name: "Debenture Form", href: debentureHref, icon: FileText, roles: ["ADMIN", "KEY_ADMIN", "Employee"] },
    { name: "Invoice Form", href: "/dashboard/invoice", icon: FileText, roles: ["ADMIN", "KEY_ADMIN", "Employee"] },
    { name: "Calculator", href: "/dashboard/calculator", icon: Calculator, roles: ["ADMIN", "KEY_ADMIN", "Employee", "INVESTOR"] },
    { name: "Settings", href: "/dashboard/settings", icon: Settings, roles: ["ADMIN", "KEY_ADMIN"] },
    { name: "Profile", href: "/dashboard/profile", icon: UserIcon, roles: ["Employee", "INVESTOR"] },
  ];

  const visibleNavItems = navItems.filter(item => {
    if (!role) return false;
    if (role === "INVESTOR") return item.roles.includes("INVESTOR");
    if (role === "Employee") {
      if (item.name === "Debenture Form" || item.name === "Calculator") return true;
      return modules.includes(item.name);
    }
    return item.roles.includes(role);
  });

  return (
    <div className="flex h-screen bg-white dark:bg-gray-900">
      {/* Sidebar */}
      <aside className={cn("relative border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 flex flex-col transition-all duration-300 shrink-0", isCollapsed ? "w-16" : "w-64")}>
        {/* Toggle Button */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute -right-3 top-6 z-30 p-1 rounded-full border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 shadow-md transition-all hover:scale-110"
        >
          {isCollapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
        </button>

        <div className="flex h-16 items-center px-4 border-b border-zinc-200 dark:border-zinc-800 overflow-hidden">
          <Link href="/dashboard" className="flex items-center space-x-2 font-bold text-xl tracking-tight text-zinc-900 dark:text-zinc-50 shrink-0">
            <Image
              src="/logo.png"
              alt="CRM Hub Logo"
              width={32}
              height={32}
              loading="lazy"
              className="rounded-md object-contain shrink-0"
            />
            {!isCollapsed && <span className="transition-opacity duration-300">CRM Hub</span>}
          </Link>
        </div>

        <nav className="flex-1 space-y-1 p-3 overflow-y-auto">
          {visibleNavItems.map((item) => {
            const isActive = pathname === item.href || (pathname.startsWith("/dashboard/employees") && item.href === "/dashboard/employees");
            return (
              <Link
                key={item.name}
                href={item.href}
                title={isCollapsed ? item.name : undefined}
                className={cn(
                  "flex items-center rounded-md text-sm font-medium transition-all duration-200",
                  isCollapsed ? "justify-center p-2.5" : "space-x-3 px-3 py-2.5",
                  isActive
                    ? "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50"
                    : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-50"
                )}
              >
                <item.icon className={cn("h-4 w-4 shrink-0", isActive ? "text-zinc-900 dark:text-zinc-50" : "text-zinc-500 dark:text-zinc-400")} />
                {!isCollapsed && <span className="truncate transition-opacity duration-300">{item.name}</span>}
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-zinc-200 dark:border-zinc-800">
          <div className="flex flex-col space-y-0">
            <button
              onClick={handleLogout}
              title={isCollapsed ? "Logout" : undefined}
              className={cn(
                "flex w-full items-center rounded-md text-sm font-medium text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-50 transition-all duration-200",
                isCollapsed ? "justify-center p-2.5" : "space-x-3 px-3 py-2.5"
              )}
            >
              <LogOut className="h-4 w-4 shrink-0" />
              {!isCollapsed && <span>Logout</span>}
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Top Header */}
        <header className="h-16 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 flex items-center justify-between px-8 shrink-0">
          <div>
            <span className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
              Welcome back, <span className="text-zinc-900 dark:text-zinc-50 font-semibold">{empCode || role || "User"}</span>
            </span>
          </div>
          <div className="flex items-center space-x-4">
            <span className="inline-flex items-center rounded-full bg-zinc-100 dark:bg-zinc-800 px-3 py-1 text-xs font-medium text-zinc-800 dark:text-zinc-200">
              {role}
            </span>
          </div>
        </header>

        {/* Scrollable Middle Part */}
        <main className="flex-1 overflow-y-auto p-8 bg-zinc-50 dark:bg-zinc-900/40">
          {children}
        </main>
      </div>
    </div>
  );
}
