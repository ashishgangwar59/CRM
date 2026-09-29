"use client";

import { useEffect, useState, ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, Users, Clock, LogOut, Settings, CalendarRange, Umbrella, IndianRupee, Wallet, Target, LineChart, RadioTower, Brain, User as UserIcon, DollarSign, FileText, ChevronLeft, ChevronRight, ChevronDown, Calculator, AlertCircle, X, UserCircle, Briefcase, Landmark, Receipt, Mail, Award } from "lucide-react";
import { cn } from "@/lib/utils";

import Image from "next/image";
import { useTheme } from "../theme-provider";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [role, setRole] = useState<string | null>(null);
  const [modules, setModules] = useState<string[]>([]);
  const [empCode, setEmpCode] = useState<string>("");
  const [userName, setUserName] = useState<string>("");
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [hoveredTooltip, setHoveredTooltip] = useState<{ name: string, top: number, left: number } | null>(null);
  const { theme, toggleTheme } = useTheme();
  
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    "Main": true,
    "HR & Team": true,
    "Finance & Payroll": false,
    "Business & Operations": false,
  });

  const [toastMsg, setToastMsg] = useState<{ title: string, desc: string } | null>(null);

  useEffect(() => {
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const response = await originalFetch(...args);
      if (response.status === 401 || response.status === 403) {
        setToastMsg({
          title: "Unauthorized Access",
          desc: "You do not have permission to perform this action or access this resource."
        });
        setTimeout(() => setToastMsg(null), 5000);
      }
      return response;
    };
    return () => {
      window.fetch = originalFetch;
    };
  }, []);

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
          if (data.employee?.profilePhotoUrl) {
            setProfilePhoto(data.employee.profilePhotoUrl);
          }
          if (data.employee?.firstName) {
            setUserName(`${data.employee.firstName} ${data.employee.lastName || ""}`.trim());
          } else if (data.investor?.firstName) {
            setUserName(`${data.investor.firstName} ${data.investor.lastName || ""}`.trim());
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

  const navGroups = [
    {
      title: "Main",
      items: [
        { name: "Overview", href: "/dashboard", icon: LayoutDashboard, roles: ["ADMIN", "KEY_ADMIN", "Employee"] },
        { name: "Investor Details", href: "/dashboard", icon: UserCircle, roles: ["INVESTOR"] },
        { name: "Profile", href: "/dashboard/profile", icon: UserIcon, roles: ["Employee", "INVESTOR"] },
      ]
    },
    {
      title: "HR & Team",
      items: [
        { name: "Teams", href: "/dashboard/teams", icon: Users, roles: ["ADMIN", "KEY_ADMIN", "Employee"] },
        { name: "Employees", href: "/dashboard/employees", icon: Briefcase, roles: ["ADMIN", "KEY_ADMIN", "Employee"] },
        { name: "Attendance", href: "/dashboard/attendance", icon: Clock, roles: ["ADMIN", "KEY_ADMIN", "Employee"] },
        { name: "Attendance List", href: "/dashboard/attendance-list", icon: Clock, roles: ["ADMIN", "KEY_ADMIN", "Employee"] },
        { name: "Leave", href: "/dashboard/leave", icon: Umbrella, roles: ["ADMIN", "KEY_ADMIN", "Employee"] },
        { name: "Holidays", href: "/dashboard/holidays", icon: CalendarRange, roles: ["ADMIN", "KEY_ADMIN", "Employee"] },
      ]
    },
    {
      title: "Finance & Payroll",
      items: [
        { name: "Wallet", href: "/dashboard/wallet", icon: Wallet, roles: ["ADMIN", "KEY_ADMIN"] },
        { name: "Payroll", href: "/dashboard/payroll", icon: IndianRupee, roles: ["ADMIN", "KEY_ADMIN", "Employee"] },
        { name: "Incentive Management", href: "/dashboard/incentives", icon: Award, roles: ["ADMIN", "KEY_ADMIN"] },
        { name: "Payroll Rules", href: "/dashboard/payroll/config", icon: Calculator, roles: ["ADMIN", "KEY_ADMIN"] },
        { name: "Invoice Form", href: "/dashboard/invoice", icon: Receipt, roles: ["ADMIN", "KEY_ADMIN", "Employee"] },
        { name: "Cash Memo", href: "/dashboard/expenses", icon: DollarSign, roles: ["ADMIN", "KEY_ADMIN", "Employee"] },
        { name: "Calculator", href: "/dashboard/calculator", icon: Calculator, roles: ["ADMIN", "KEY_ADMIN", "Employee", "INVESTOR"] },
      ]
    },
    {
      title: "Business & Operations",
      items: [
        { name: "Investors", href: "/dashboard/investors", icon: Landmark, roles: ["ADMIN", "KEY_ADMIN", "Employee"] },
        { name: "Leads", href: "/dashboard/leads", icon: Target, roles: ["ADMIN", "KEY_ADMIN", "Employee"] },
        { name: "Reports", href: "/dashboard/reports", icon: LineChart, roles: ["ADMIN", "KEY_ADMIN", "Employee"] },
        { name: "Debenture Form", href: debentureHref, icon: FileText, roles: ["ADMIN", "KEY_ADMIN", "Employee"] },
        { name: "Certificates", href: "/dashboard/certificates", icon: Award, roles: ["ADMIN", "KEY_ADMIN"] },
        { name: "Letter Register", href: "/dashboard/letters", icon: Mail, roles: ["ADMIN", "KEY_ADMIN", "Employee"] },
        { name: "Settings", href: "/dashboard/settings", icon: Settings, roles: ["ADMIN", "KEY_ADMIN"] },
      ]
    }
  ];

  const visibleGroups = navGroups.map(group => ({
    ...group,
    items: group.items.filter(item => {
      if (!role) return false;
      if (role === "INVESTOR") return item.roles.includes("INVESTOR");
      if (role === "Employee") {
        if (item.name === "Debenture Form" || item.name === "Calculator") return true;
        return modules.includes(item.name);
      }
      return item.roles.includes(role);
    })
  })).filter(group => group.items.length > 0);

  const toggleGroup = (title: string) => {
    if (isCollapsed) {
      setIsCollapsed(false);
      setOpenGroups(prev => ({ ...prev, [title]: true }));
    } else {
      setOpenGroups(prev => ({ ...prev, [title]: !prev[title] }));
    }
  };

  return (
    <div className="flex h-screen bg-white dark:bg-gray-900 print:h-auto print:bg-white">
      {/* Sidebar */}
      <aside className={cn("relative border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 flex flex-col transition-all duration-300 shrink-0 print:hidden", isCollapsed ? "w-16" : "w-64")}>
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
              alt="CRM  Logo"
              width={32}
              height={32}
              loading="lazy"
              className="rounded-md object-contain shrink-0"
            />
            {!isCollapsed && <span className="transition-opacity duration-300">CRM</span>}
          </Link>
        </div>

        <nav className="flex-1 overflow-y-auto px-2 py-4 space-y-4">
          {visibleGroups.map((group, groupIdx) => {
            const isOpen = openGroups[group.title];
            return (
              <div key={group.title} className={cn(
                "transition-all duration-200",
                isCollapsed ? "bg-zinc-50 dark:bg-zinc-900/40 p-1.5 rounded-2xl mb-3 border border-zinc-100 dark:border-zinc-800/60" : "space-y-1"
              )}>
                {/* Group Header (only visible when expanded) */}
                {!isCollapsed && (
                  <button
                    onClick={() => toggleGroup(group.title)}
                    className={cn(
                      "w-full flex items-center justify-between px-3 py-2 mb-1 rounded-lg transition-colors group",
                      isOpen ? "bg-zinc-50/80 dark:bg-zinc-900/40" : "hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                    )}
                  >
                    <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 group-hover:text-zinc-800 dark:group-hover:text-zinc-200 transition-colors">
                      {group.title}
                    </span>
                    <ChevronDown className={cn("w-3.5 h-3.5 text-zinc-400 transition-transform duration-200", isOpen ? "" : "-rotate-90")} />
                  </button>
                )}

                {/* Items */}
                <div className={cn(
                  !isCollapsed && !isOpen ? "hidden" : "block",
                  !isCollapsed ? "pl-1 ml-4 border-l-[1.5px] border-zinc-200/80 dark:border-zinc-800 space-y-0.5 mt-1 relative pb-1 animate-in slide-in-from-top-1 fade-in duration-200" : "space-y-1"
                )}>
                  {group.items.map((item, itemIdx) => {
                    const isActive = pathname === item.href || (pathname.startsWith("/dashboard/employees") && item.href === "/dashboard/employees");
                    const isLast = itemIdx === group.items.length - 1;
                    return (
                      <Link
                        key={item.name}
                        href={item.href}
                        onMouseEnter={(e) => {
                          if (!isCollapsed) return;
                          const rect = e.currentTarget.getBoundingClientRect();
                          setHoveredTooltip({ name: item.name, top: rect.top + 4, left: rect.right + 8 });
                        }}
                        onMouseLeave={() => setHoveredTooltip(null)}
                        className={cn(
                          "relative flex items-center rounded-lg text-[13px] font-medium transition-all duration-200",
                          isCollapsed ? "justify-center p-2.5 mb-1 last:mb-0" : "space-x-3 px-3 py-2 ml-2",
                          isActive
                            ? "bg-indigo-50/80 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400 font-semibold shadow-sm border border-indigo-100/50 dark:border-indigo-500/20"
                            : "text-zinc-600 hover:bg-zinc-100/80 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800/60 dark:hover:text-zinc-100"
                        )}
                      >
                        {!isCollapsed && (
                          <div className={cn(
                            "absolute -left-[14px] top-1/2 w-3 border-t-[1.5px] border-zinc-200/80 dark:border-zinc-800 pointer-events-none transition-colors",
                            isActive ? "border-indigo-200 dark:border-indigo-500/40" : ""
                          )} />
                        )}
                        {/* Cover the vertical line overflow for the last item to create an L shape */}
                        {!isCollapsed && isLast && (
                          <div className="absolute -left-[15.5px] top-1/2 h-full w-[3px] bg-white dark:bg-zinc-950 pointer-events-none" />
                        )}

                        <item.icon className={cn("h-[16px] w-[16px] shrink-0", isActive ? "text-indigo-600 dark:text-indigo-400" : "text-zinc-400 dark:text-zinc-500")} />
                        {!isCollapsed && <span className="truncate transition-opacity duration-300">{item.name}</span>}
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>

        <div className="p-3 border-t border-zinc-200 dark:border-zinc-800">
          <div className="flex flex-col space-y-0">
            <button
              onClick={handleLogout}
              onMouseEnter={(e) => {
                if (!isCollapsed) return;
                const rect = e.currentTarget.getBoundingClientRect();
                setHoveredTooltip({ name: "Logout", top: rect.top + 4, left: rect.right + 8 });
              }}
              onMouseLeave={() => setHoveredTooltip(null)}
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

        {hoveredTooltip && (
          <div
            className="fixed z-50 flex items-center pointer-events-none"
            style={{ top: hoveredTooltip.top, left: hoveredTooltip.left }}
          >
            <div className="bg-zinc-900 text-white text-xs font-semibold rounded py-1.5 px-3 shadow-md dark:bg-zinc-100 dark:text-zinc-900">
              {hoveredTooltip.name}
            </div>
          </div>
        )}
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden print:h-auto print:overflow-visible print:block">
        {/* Top Header */}
        <header className="h-16 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 flex items-center justify-between px-8 shrink-0 print:hidden">
          <div>
            <span className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
              Welcome back, <span className="text-zinc-900 dark:text-zinc-50 font-semibold">{empCode || role || "User"}</span>
            </span>
          </div>
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-3">
              <div className="flex flex-col items-end mr-1">
                {userName && <span className="text-sm font-bold text-zinc-900 dark:text-zinc-50">{userName}</span>}
                <span className="inline-flex items-center rounded-full bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 text-[10px] font-medium text-zinc-800 dark:text-zinc-200 uppercase tracking-wider">
                  {role}
                </span>
              </div>
              <div className="h-9 w-9 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center overflow-hidden border border-zinc-300 dark:border-zinc-700 shrink-0">
                {profilePhoto ? (
                  <img src={profilePhoto} alt="Profile" className="h-full w-full object-cover" />
                ) : (
                  <UserIcon className="h-5 w-5 text-zinc-500" />
                )}
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center space-x-2 text-sm font-medium text-zinc-500 hover:text-red-600 dark:text-zinc-400 dark:hover:text-red-400 transition-colors"
            >
              <LogOut className="h-4 w-4" />
              <span>Logout</span>
            </button>
          </div>
        </header>

        {/* Scrollable Middle Part */}
        <main className={cn("flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-6 print:overflow-visible print:p-0", role === "INVESTOR" ? "bg-white dark:bg-zinc-950" : "bg-zinc-50 dark:bg-zinc-900/40")}>
          {children}
        </main>
        {/* Global Toast Notification */}
        {toastMsg && (
          <div className="fixed bottom-4 right-4 z-[9999] bg-rose-600 text-white p-4 rounded-xl shadow-2xl flex items-start gap-3 w-80 animate-in slide-in-from-bottom-5">
            <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="font-bold text-sm">{toastMsg.title}</h4>
              <p className="text-xs mt-1 opacity-90">{toastMsg.desc}</p>
            </div>
            <button onClick={() => setToastMsg(null)} className="ml-auto opacity-70 hover:opacity-100">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
