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
    <div className="space-y-6 max-w-7xl mx-auto pb-24">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">My Hub</h1>
        <p className="text-zinc-500 dark:text-zinc-400">Welcome back! Here is your overview for today.</p>
      </div>

      {/* Top Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6 flex items-center space-x-4">
            <div className="p-3 bg-indigo-100 text-indigo-700 rounded-lg"><Clock className="w-6 h-6" /></div>
            <div>
              <p className="text-sm font-medium text-zinc-500">Today's Attendance</p>
              <h3 className="text-xl font-bold">{data.todaysAttendance}</h3>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-emerald-950 text-white">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-emerald-300">Latest Salary</p>
              <h3 className="text-2xl font-bold flex items-center">
                <IndianRupee className="w-5 h-5 mr-1" />
                {data.latestSalary ? data.latestSalary.netSalary.toLocaleString() : "N/A"}
              </h3>
            </div>
            {data.latestSalary && (
              <Link href={`/dashboard/payroll/${data.latestSalary._id}`}>
                <Button variant="secondary" size="sm" className="bg-emerald-800 text-white hover:bg-emerald-700 border-none"><Download className="w-4 h-4" /></Button>
              </Link>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6 flex items-center space-x-4">
            <div className="p-3 bg-amber-100 text-amber-700 rounded-lg"><CheckSquare className="w-6 h-6" /></div>
            <div>
              <p className="text-sm font-medium text-zinc-500">Pending Tasks</p>
              <h3 className="text-xl font-bold">{data.tasks?.length || 0}</h3>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 flex items-center space-x-4">
            <div className="p-3 bg-rose-100 text-rose-700 rounded-lg"><Cake className="w-6 h-6" /></div>
            <div>
              <p className="text-sm font-medium text-zinc-500">Upcoming Birthdays</p>
              <h3 className="text-xl font-bold">{data.upcomingBirthdays?.length || 0}</h3>
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
                    <Tooltip cursor={{fill: '#f4f4f5'}} />
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
                      <div className="w-3 h-3 rounded-full mr-1" style={{backgroundColor: COLORS[index % COLORS.length]}}></div>
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
