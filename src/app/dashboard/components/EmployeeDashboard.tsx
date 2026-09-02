"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, Megaphone, CheckSquare, Cake, Clock, IndianRupee } from "lucide-react";
import Link from "next/link";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const COLORS = ['#10b981', '#f59e0b', '#3b82f6', '#ef4444'];

export function EmployeeDashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const res = await fetch("/api/dashboard/employee");
        const json = await res.json();
        if (json.success) {
          setData(json.data);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, []);

  if (loading) return <div className="p-8">Loading your dashboard...</div>;
  if (!data) return <div className="p-8">Failed to load dashboard.</div>;

  return (
    <div className="space-y-6 w-full pb-24">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Dashboard</h1>
        <p className="text-zinc-500 dark:text-zinc-400">Welcome back! Here is your overview for today.</p>
      </div>

      {/* Top Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Today's Attendance</p>
                <h3 className="text-3xl font-bold mt-2 text-zinc-900 dark:text-zinc-50">{data.todaysAttendance}</h3>
              </div>
              <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-xl">
                <Clock className="w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Latest Salary</p>
                <h3 className="text-3xl font-bold mt-2 text-zinc-900 dark:text-zinc-50 flex items-center">
                  <IndianRupee className="w-6 h-6 mr-1 text-zinc-400" />
                  {data.latestSalary ? data.latestSalary.netSalary.toLocaleString() : "N/A"}
                </h3>
              </div>
              <div className="flex flex-col items-end space-y-2">
                <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-xl">
                  <IndianRupee className="w-6 h-6" />
                </div>
                {data.latestSalary && (
                  <Link href={`/dashboard/payroll/${data.latestSalary._id}`}>
                    <Button variant="outline" size="sm" className="h-7 text-xs border-zinc-200 dark:border-zinc-800"><Download className="w-3 h-3 mr-1" /> Slip</Button>
                  </Link>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Pending Tasks</p>
                <h3 className="text-3xl font-bold mt-2 text-zinc-900 dark:text-zinc-50">{data.tasks?.length || 0}</h3>
              </div>
              <div className="p-3 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 rounded-xl">
                <CheckSquare className="w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Upcoming Birthdays</p>
                <h3 className="text-3xl font-bold mt-2 text-zinc-900 dark:text-zinc-50">{data.upcomingBirthdays?.length || 0}</h3>
              </div>
              <div className="p-3 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 rounded-xl">
                <Cake className="w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left Column (Graphs) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-semibold uppercase tracking-wider text-zinc-500">Attendance (Last 7 Days)</CardTitle>
              </CardHeader>
              <CardContent className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.attendanceGraph}>
                    <XAxis dataKey="date" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip cursor={{ fill: '#f4f4f5' }} />
                    <Bar dataKey="hours" fill="#6366f1" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-semibold uppercase tracking-wider text-zinc-500">Leave Balance</CardTitle>
              </CardHeader>
              <CardContent className="h-64 flex flex-col items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={data.leaveBalances} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                      {data.leaveBalances.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap justify-center gap-2 mt-2">
                  {data.leaveBalances.map((entry: any, index: number) => (
                    <div key={entry.name} className="flex items-center text-xs">
                      <div className="w-3 h-3 rounded-full mr-1" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                      <span>{entry.name}: {entry.value}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-semibold uppercase tracking-wider text-zinc-500">Salary History</CardTitle>
              <Link href="/dashboard/payroll"><Button variant="link" size="sm">View All</Button></Link>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Month</TableHead>
                    <TableHead className="text-right">Net Salary</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.salaryHistory.map((s: any) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.month}</TableCell>
                      <TableCell className="text-right font-bold text-emerald-600">₹{s.amount.toLocaleString()}</TableCell>
                      <TableCell className="text-right">
                        <Link href={`/dashboard/payroll/${s.id}`}>
                          <Button variant="ghost" size="sm"><Download className="w-4 h-4" /></Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                  {data.salaryHistory.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-4 text-zinc-500">No salary history found.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        {/* Right Column (Social/Widgets) */}
        <div className="space-y-6">
          <Card className="bg-indigo-50 border-indigo-100">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold text-indigo-900 flex items-center"><Megaphone className="w-4 h-4 mr-2" /> Announcements</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {data.announcements?.length > 0 ? data.announcements.map((a: any) => (
                <div key={a._id} className="bg-white p-3 rounded-lg shadow-sm border border-indigo-100">
                  <h4 className="font-bold text-sm text-zinc-900">{a.title}</h4>
                  <p className="text-xs text-zinc-600 mt-1">{a.message}</p>
                </div>
              )) : (
                <p className="text-sm text-indigo-400 italic">No new announcements.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold text-zinc-700 flex items-center"><CheckSquare className="w-4 h-4 mr-2" /> My Tasks</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {data.tasks?.length > 0 ? data.tasks.map((t: any) => (
                  <div key={t._id} className="flex items-start space-x-3 p-2 hover:bg-zinc-50 rounded-lg">
                    <input type="checkbox" className="mt-1 rounded border-zinc-300" />
                    <div>
                      <p className="text-sm font-medium">{t.title}</p>
                      <p className="text-xs text-rose-500">Due: {new Date(t.dueDate).toLocaleDateString()}</p>
                    </div>
                  </div>
                )) : (
                  <p className="text-sm text-zinc-400 italic">You're all caught up!</p>
                )}
              </div>
            </CardContent>
          </Card>

          {data.upcomingBirthdays?.length > 0 && (
            <Card className="bg-rose-50 border-rose-100">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold text-rose-900 flex items-center"><Cake className="w-4 h-4 mr-2" /> Upcoming Birthdays</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {data.upcomingBirthdays.map((b: any, i: number) => (
                    <div key={i} className="flex justify-between items-center bg-white p-2 rounded border border-rose-100">
                      <span className="text-sm font-medium">{b.name}</span>
                      <span className="text-xs font-bold text-rose-600">{b.date}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
