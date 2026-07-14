"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Users, Clock, Wallet, IndianRupee, Target, UserCheck, UserX, AlertCircle, CalendarDays, TrendingUp } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell, Legend } from "recharts";

const PIE_COLORS = ['#10b981', '#f43f5e', '#3b82f6'];

export function AdminDashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAdminDashboard = async () => {
      try {
        const res = await fetch("/api/dashboard/admin");
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
    fetchAdminDashboard();
  }, []);

  if (loading) return <div className="p-8">Loading Super Admin Command Center...</div>;
  if (!data) return <div className="p-8">Failed to load admin dashboard.</div>;

  const k = data.kpis;
  const c = data.charts;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-24">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Command Center</h1>
        <p className="text-zinc-500 dark:text-zinc-400">Super Admin overview of financials, HR, and sales.</p>
      </div>

      {/* Row 1: Global KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-zinc-950 text-white">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-zinc-400">Total Employees</p>
                <h3 className="text-3xl font-bold mt-1">{k.totalEmployees}</h3>
              </div>
              <div className="p-2 bg-zinc-800 rounded-lg text-zinc-300"><Users className="w-5 h-5" /></div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-indigo-950 text-white border-indigo-900 shadow-lg shadow-indigo-900/20">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-indigo-300">Wallet Balance</p>
                <h3 className="text-3xl font-bold mt-1 flex items-center">
                  <IndianRupee className="w-6 h-6 mr-1 text-indigo-400" />
                  {k.walletBalance.toLocaleString()}
                </h3>
              </div>
              <div className="p-2 bg-indigo-900 rounded-lg text-indigo-300"><Wallet className="w-5 h-5" /></div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-zinc-500">Revenue (Won Leads)</p>
                <h3 className="text-3xl font-bold text-emerald-600 mt-1 flex items-center">
                  <IndianRupee className="w-6 h-6 mr-1" />
                  {k.revenue.toLocaleString()}
                </h3>
              </div>
              <div className="p-2 bg-emerald-100 rounded-lg text-emerald-600"><TrendingUp className="w-5 h-5" /></div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 flex flex-col justify-between h-full">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-zinc-500">Monthly Salary Status</span>
              <IndianRupee className="w-4 h-4 text-zinc-400" />
            </div>
            <div>
              <div className="flex justify-between items-end mb-1">
                <span className="text-xs text-emerald-600 font-bold">Paid</span>
                <span className="text-sm font-bold">₹{k.salaryPaid.toLocaleString()}</span>
              </div>
              <div className="w-full bg-zinc-100 h-1.5 rounded-full overflow-hidden mb-3">
                <div className="bg-emerald-500 h-full" style={{width: `${(k.salaryPaid / (k.salaryPaid + k.salaryPending || 1)) * 100}%`}}></div>
              </div>
              
              <div className="flex justify-between items-end mb-1">
                <span className="text-xs text-rose-500 font-bold">Pending</span>
                <span className="text-sm font-bold">₹{k.salaryPending.toLocaleString()}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Row 2: Today's Operations */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        
        <Card className="col-span-2 md:col-span-1 bg-zinc-50 border-dashed border-zinc-300">
          <CardContent className="p-4 flex flex-col items-center justify-center h-full text-center">
            <Clock className="w-6 h-6 text-zinc-400 mb-2" />
            <h4 className="font-bold text-zinc-700">Today's<br/>Attendance</h4>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 flex items-center space-x-4">
            <div className="p-2 bg-emerald-100 text-emerald-600 rounded-full"><UserCheck className="w-5 h-5" /></div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-zinc-500">Present</p>
              <h3 className="text-xl font-black text-zinc-900">{k.attendanceStats.present}</h3>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 flex items-center space-x-4">
            <div className="p-2 bg-rose-100 text-rose-600 rounded-full"><UserX className="w-5 h-5" /></div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-zinc-500">Absent</p>
              <h3 className="text-xl font-black text-zinc-900">{k.attendanceStats.absent}</h3>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 flex items-center space-x-4">
            <div className="p-2 bg-amber-100 text-amber-600 rounded-full"><AlertCircle className="w-5 h-5" /></div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-zinc-500">Late</p>
              <h3 className="text-xl font-black text-zinc-900">{k.attendanceStats.late}</h3>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center space-x-4">
            <div className="p-2 bg-blue-100 text-blue-600 rounded-full"><CalendarDays className="w-5 h-5" /></div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-zinc-500">On Leave</p>
              <h3 className="text-xl font-black text-zinc-900">{k.attendanceStats.leave}</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Row 3: Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm font-bold uppercase tracking-wider text-zinc-500">6-Month Trend: Attendance & Salary</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={c.monthlyData}>
                <defs>
                  <linearGradient id="colorSalary" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis yAxisId="left" fontSize={12} tickLine={false} axisLine={false} hide />
                <YAxis yAxisId="right" orientation="right" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${(v/1000)}k`} />
                <Tooltip cursor={{stroke: '#e4e4e7', strokeWidth: 1, strokeDasharray: '4 4'}} />
                <Legend />
                <Area yAxisId="right" type="monotone" dataKey="salary" name="Salary Payout" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorSalary)" />
                <Bar yAxisId="left" dataKey="present" name="Avg Present" fill="#6366f1" radius={[4, 4, 0, 0]} maxBarSize={40} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-sm font-bold uppercase tracking-wider text-zinc-500">Lead Conversion Rate</CardTitle>
          </CardHeader>
          <CardContent className="h-72 flex flex-col items-center justify-center relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={c.leadConversion} innerRadius={60} outerRadius={85} paddingAngle={2} dataKey="value">
                  {c.leadConversion.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
            {/* Center metric */}
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center -mt-4">
              <span className="block text-2xl font-black text-zinc-900">
                {k.openLeads + k.wonLeads > 0 ? Math.round((k.wonLeads / (k.openLeads + k.wonLeads)) * 100) : 0}%
              </span>
              <span className="block text-[10px] uppercase font-bold text-zinc-400 tracking-widest">Won</span>
            </div>
          </CardContent>
        </Card>

      </div>

    </div>
  );
}
