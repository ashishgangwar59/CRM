"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Target, Trophy, Clock, AlertTriangle, ArrowRight, User, Activity } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

const PIE_COLORS = ['#3b82f6', '#10b981', '#f43f5e'];

export default function LeadReportsPage() {
  const [report, setReport] = useState<any>(null);
  const [timeline, setTimeline] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [repRes, timeRes] = await Promise.all([
          fetch("/api/reports/leads"),
          fetch("/api/reports/leads/timeline")
        ]);
        const repData = await repRes.json();
        const timeData = await timeRes.json();
        
        if (repData.success) setReport(repData.data);
        if (timeData.success) setTimeline(timeData.data);
      } catch (e) {
        console.error("Failed to load reports", e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) return <div className="p-8">Loading analytics...</div>;
  if (!report) return <div className="p-8 text-rose-500">Failed to load reports. Are you a KEY_ADMIN?</div>;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-24">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Lead Analytics</h1>
        <p className="text-zinc-500 dark:text-zinc-400">KEY_ADMIN monitoring and conversion tracking.</p>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6 flex items-center space-x-4">
            <div className="p-3 bg-blue-100 text-blue-700 rounded-lg"><Target className="w-6 h-6" /></div>
            <div>
              <p className="text-sm font-medium text-zinc-500">Total Leads</p>
              <h3 className="text-2xl font-bold">{report.kpis.totalLeads} <span className="text-sm font-normal text-zinc-400">({report.kpis.todaysLeads} today)</span></h3>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 flex items-center space-x-4">
            <div className="p-3 bg-emerald-100 text-emerald-700 rounded-lg"><Trophy className="w-6 h-6" /></div>
            <div>
              <p className="text-sm font-medium text-zinc-500">Converted (Won)</p>
              <h3 className="text-2xl font-bold">{report.kpis.totalWon}</h3>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-indigo-950 text-white">
          <CardContent className="p-6 flex items-center space-x-4">
            <div className="p-3 bg-indigo-800 text-indigo-300 rounded-lg"><Activity className="w-6 h-6" /></div>
            <div>
              <p className="text-sm font-medium text-indigo-300">Conversion Rate</p>
              <h3 className="text-3xl font-black text-indigo-100">{report.kpis.conversionRate}%</h3>
            </div>
          </CardContent>
        </Card>
        <Card className={report.kpis.missedFollowUpsCount > 0 ? "bg-rose-50 border-rose-200" : ""}>
          <CardContent className="p-6 flex items-center space-x-4">
            <div className={`p-3 rounded-lg ${report.kpis.missedFollowUpsCount > 0 ? 'bg-rose-200 text-rose-700' : 'bg-zinc-100 text-zinc-700'}`}>
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <p className={`text-sm font-medium ${report.kpis.missedFollowUpsCount > 0 ? 'text-rose-600' : 'text-zinc-500'}`}>Missed Follow Ups</p>
              <h3 className={`text-2xl font-bold ${report.kpis.missedFollowUpsCount > 0 ? 'text-rose-700' : ''}`}>{report.kpis.missedFollowUpsCount}</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-sm font-bold uppercase tracking-wider text-zinc-500">Lead Status</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={report.statusWise} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                  {report.statusWise.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm font-bold uppercase tracking-wider text-zinc-500">Employee Performance (Won vs Lost)</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={report.employeeWise}>
                <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip cursor={{fill: '#f4f4f5'}} />
                <Legend />
                <Bar dataKey="won" name="Won" stackId="a" fill="#10b981" radius={[0, 0, 4, 4]} />
                <Bar dataKey="lost" name="Lost" stackId="a" fill="#f43f5e" />
                <Bar dataKey="open" name="Open" stackId="a" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Tables Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Missed Follow Ups */}
        <Card className="border-rose-200 shadow-sm">
          <CardHeader className="bg-rose-50 border-b border-rose-100 pb-4">
            <CardTitle className="text-sm font-bold text-rose-800 flex items-center">
              <AlertTriangle className="mr-2 h-4 w-4" /> 
              Requires Immediate Action: Missed Follow Ups
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Lead</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead className="text-right">Missed Date</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {report.missedFollowUps.map((lead: any) => (
                  <TableRow key={lead._id}>
                    <TableCell className="font-medium">{lead.firstName} {lead.lastName}</TableCell>
                    <TableCell>{lead.ownerId?.firstName} {lead.ownerId?.lastName}</TableCell>
                    <TableCell className="text-right font-medium text-rose-600">
                      {new Date(lead.nextFollowUp).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <Link href={`/dashboard/leads/${lead._id}`}>
                        <Button variant="ghost" size="sm" className="text-indigo-600"><ArrowRight className="h-4 w-4" /></Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
                {report.missedFollowUps.length === 0 && (
                  <TableRow><TableCell colSpan={4} className="text-center py-6 text-zinc-500">All follow ups are on track!</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Global Timeline */}
        <Card>
          <CardHeader className="pb-4 border-b border-zinc-100">
            <CardTitle className="text-sm font-bold text-zinc-700 flex items-center">
              <Clock className="mr-2 h-4 w-4" /> Global Lead Activity
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 h-96 overflow-y-auto">
            <div className="space-y-4">
              {timeline.map((act) => (
                <div key={act._id} className="flex space-x-3 text-sm border-b border-zinc-50 pb-3 last:border-0">
                  <div className={`mt-0.5 p-1.5 rounded-full h-fit ${
                    act.type === 'StatusChange' ? 'bg-indigo-100 text-indigo-600' : 'bg-emerald-100 text-emerald-600'
                  }`}>
                    {act.type === 'StatusChange' ? <Activity className="w-3 h-3" /> : <User className="w-3 h-3" />}
                  </div>
                  <div className="flex-1">
                    <p className="text-zinc-900">
                      <span className="font-bold">{act.createdBy?.firstName}</span> on <Link href={`/dashboard/leads/${act.leadId?._id}`} className="font-bold text-indigo-600 hover:underline">{act.leadId?.firstName} {act.leadId?.lastName}</Link>
                    </p>
                    <p className="text-zinc-600 mt-1">{act.content}</p>
                    <p className="text-xs text-zinc-400 mt-1 font-mono">{new Date(act.createdAt).toLocaleString()}</p>
                  </div>
                </div>
              ))}
              {timeline.length === 0 && (
                <p className="text-center text-zinc-500 italic py-4">No recent activity.</p>
              )}
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
