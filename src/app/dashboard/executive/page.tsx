"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Brain, TrendingUp, IndianRupee, Users, AlertTriangle, Target, LineChart as LineChartIcon } from "lucide-react";
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";

export default function ExecutiveDashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAI = async () => {
      try {
        const res = await fetch("/api/dashboard/executive");
        const json = await res.json();
        if (json.success) setData(json.data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchAI();
  }, []);

  if (loading) return <div className="p-8">Initializing AI Prediction Engine...</div>;
  if (!data) return <div className="p-8 text-rose-500">Failed to load AI data. Are you a Super Admin?</div>;

  const { kpis, projectedData, topPerformers, lowPerformers, attritionWatchlist, conversionRate } = data;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-24">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 flex items-center">
          <Brain className="mr-3 h-8 w-8 text-purple-600" /> Executive AI Dashboard
        </h1>
        <p className="text-zinc-500 dark:text-zinc-400">Predictive analytics and heuristic forecasting.</p>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-purple-950 text-white border-purple-900">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-purple-300">Predicted Future Revenue</p>
                <h3 className="text-3xl font-bold mt-1 flex items-center">
                  <IndianRupee className="w-6 h-6 mr-1" />
                  {kpis.predictedRevenue.toLocaleString()}
                </h3>
              </div>
              <div className="p-2 bg-purple-900 rounded-lg"><TrendingUp className="w-5 h-5 text-purple-300" /></div>
            </div>
            <p className="text-xs text-purple-400 mt-4">Based on open pipeline & {conversionRate}% win rate</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-zinc-500">Projected Monthly Salary</p>
                <h3 className="text-2xl font-bold mt-1 flex items-center text-zinc-900">
                  <IndianRupee className="w-5 h-5 mr-1" />
                  {kpis.projectedMonthlyRunRate.toLocaleString()}
                </h3>
              </div>
              <div className="p-2 bg-rose-50 rounded-lg"><LineChartIcon className="w-5 h-5 text-rose-500" /></div>
            </div>
            <p className="text-xs text-zinc-500 mt-4">Current HR run-rate</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-zinc-500">High Attrition Risk</p>
                <h3 className="text-2xl font-bold mt-1 text-zinc-900">{kpis.highAttritionRiskEmployees} Employees</h3>
              </div>
              <div className="p-2 bg-amber-50 rounded-lg"><AlertTriangle className="w-5 h-5 text-amber-500" /></div>
            </div>
            <p className="text-xs text-zinc-500 mt-4">Based on attendance & performance models</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-zinc-500">Pipeline Forecast</p>
                <div className="mt-1 flex items-center space-x-2">
                  <span className="text-xl font-bold text-emerald-600">{kpis.predictedWinLeads} Wins</span>
                  <span className="text-zinc-300">|</span>
                  <span className="text-xl font-bold text-rose-600">{kpis.predictedLossLeads} Losses</span>
                </div>
              </div>
              <div className="p-2 bg-blue-50 rounded-lg"><Target className="w-5 h-5 text-blue-500" /></div>
            </div>
            <p className="text-xs text-zinc-500 mt-4">Predicted outcomes of Open Leads</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-bold uppercase tracking-wider text-zinc-500">6-Month Financial Forecast (Revenue vs Expense)</CardTitle>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={projectedData}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorExp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" />
                <XAxis dataKey="month" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${(v/1000)}k`} />
                <Tooltip cursor={{stroke: '#e4e4e7', strokeWidth: 1}} />
                <Legend />
                <Area type="monotone" dataKey="projectedRevenue" name="Est. Revenue" stroke="#10b981" fillOpacity={1} fill="url(#colorRev)" strokeWidth={3} />
                <Area type="monotone" dataKey="projectedExpense" name="Est. Salary Expense" stroke="#ef4444" fillOpacity={1} fill="url(#colorExp)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-bold uppercase tracking-wider text-amber-600 flex items-center">
              <AlertTriangle className="w-4 h-4 mr-2" /> Attrition Risk Watchlist
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6 mt-2">
              {attritionWatchlist.map((emp: any) => (
                <div key={emp.id} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="font-bold text-sm">{emp.name}</span>
                      <span className="text-xs text-zinc-500 ml-2">Leads: {emp.won}W / {emp.lost}L</span>
                    </div>
                    <span className={`text-xs font-bold px-2 py-1 rounded ${
                      emp.attritionRisk > 65 ? "bg-rose-100 text-rose-700" :
                      emp.attritionRisk > 40 ? "bg-amber-100 text-amber-700" :
                      "bg-emerald-100 text-emerald-700"
                    }`}>
                      {emp.attritionRisk}% Risk
                    </span>
                  </div>
                  <div className="w-full bg-zinc-100 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${emp.attritionRisk > 65 ? "bg-rose-500" : emp.attritionRisk > 40 ? "bg-amber-500" : "bg-emerald-500"}`} 
                      style={{ width: `${emp.attritionRisk}%` }}
                    ></div>
                  </div>
                </div>
              ))}
              {attritionWatchlist.length === 0 && (
                <p className="text-sm text-zinc-500 italic text-center py-4">No high-risk employees detected.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-emerald-200 shadow-sm shadow-emerald-100">
          <CardHeader className="bg-emerald-50/50 border-b border-emerald-100">
            <CardTitle className="text-sm font-bold uppercase tracking-wider text-emerald-800">Top Performers</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-emerald-100">
              {topPerformers.map((emp: any, idx: number) => (
                <div key={emp.id} className="flex justify-between items-center p-4">
                  <div className="flex items-center space-x-3">
                    <span className="text-emerald-300 font-black text-xl w-6">#{idx + 1}</span>
                    <span className="font-medium text-sm text-zinc-900">{emp.name}</span>
                  </div>
                  <span className="text-emerald-600 font-bold text-sm">{emp.won} Won Deals</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-rose-200 shadow-sm shadow-rose-100">
          <CardHeader className="bg-rose-50/50 border-b border-rose-100">
            <CardTitle className="text-sm font-bold uppercase tracking-wider text-rose-800">Low Performers</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-rose-100">
              {lowPerformers.map((emp: any, idx: number) => (
                <div key={emp.id} className="flex justify-between items-center p-4">
                  <div className="flex items-center space-x-3">
                    <span className="text-rose-300 font-black text-xl w-6">!</span>
                    <span className="font-medium text-sm text-zinc-900">{emp.name}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-rose-600 font-bold text-sm">{emp.won} Won Deals</p>
                    <p className="text-xs text-zinc-400">({emp.lost} Lost / {emp.open} Open)</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

    </div>
  );
}
