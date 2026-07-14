"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Download, FileText, FileSpreadsheet, Filter } from "lucide-react";
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const PIE_COLORS = ['#3b82f6', '#10b981', '#f43f5e', '#f59e0b', '#8b5cf6', '#06b6d4'];

const REPORT_TYPES = [
  "Attendance", "Leave", "Salary", "Wallet", "Employee", "Department", "Lead"
];

export default function UniversalReportsPage() {
  const [type, setType] = useState("Salary");
  const [dateFilter, setDateFilter] = useState("month"); // 'month' or 'year'
  const [monthYear, setMonthYear] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [year, setYear] = useState(new Date().getFullYear().toString()); // YYYY
  
  const [summary, setSummary] = useState<any[]>([]);
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasRun, setHasRun] = useState(false);

  const fetchReport = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoading(true);
    setHasRun(true);
    try {
      const query = new URLSearchParams({ type });
      if (dateFilter === "month") query.append("month", monthYear);
      if (dateFilter === "year") query.append("year", year);

      const res = await fetch(`/api/reports/generator?${query.toString()}`);
      const data = await res.json();
      if (data.success) {
        setSummary(data.data.summary);
        setRows(data.data.rows);
      } else {
        alert(data.error);
      }
    } catch (err) {
      console.error(err);
      alert("Error generating report");
    } finally {
      setLoading(false);
    }
  };

  const exportExcel = () => {
    if (rows.length === 0) return alert("No data to export");
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Report");
    XLSX.writeFile(wb, `${type}_Report_${dateFilter === 'month' ? monthYear : year}.xlsx`);
  };

  const exportPDF = () => {
    if (rows.length === 0) return alert("No data to export");
    const doc = new jsPDF();
    
    // Add Title
    doc.setFontSize(18);
    doc.text(`${type} Report`, 14, 22);
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 30);
    
    // Extract headers dynamically from the first row object keys
    const headers = Object.keys(rows[0]);
    // Extract data arrays
    const data = rows.map(row => headers.map(header => String(row[header])));

    autoTable(doc, {
      head: [headers],
      body: data,
      startY: 40,
      theme: 'grid',
      styles: { fontSize: 8 },
      headStyles: { fillColor: [79, 70, 229] } // Indigo 600
    });

    doc.save(`${type}_Report_${dateFilter === 'month' ? monthYear : year}.pdf`);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-24">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Report Generator</h1>
        <p className="text-zinc-500 dark:text-zinc-400">Generate, visualize, and export data across all modules.</p>
      </div>

      {/* Control Panel */}
      <Card className="bg-indigo-950 text-white border-indigo-900 shadow-xl">
        <CardContent className="p-6">
          <form onSubmit={fetchReport} className="flex flex-col md:flex-row gap-4 items-end">
            <div className="w-full md:w-64 space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-indigo-300">Report Type</label>
              <select className="flex h-10 w-full rounded-md border-0 bg-indigo-900/50 text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" value={type} onChange={e => setType(e.target.value)}>
                {REPORT_TYPES.map(t => <option key={t} value={t} className="bg-indigo-950">{t} Report</option>)}
              </select>
            </div>
            
            <div className="w-full md:w-48 space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-indigo-300">Date Filter</label>
              <select className="flex h-10 w-full rounded-md border-0 bg-indigo-900/50 text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" value={dateFilter} onChange={e => setDateFilter(e.target.value)}>
                <option value="month" className="bg-indigo-950">Monthly</option>
                <option value="year" className="bg-indigo-950">Yearly</option>
              </select>
            </div>

            {dateFilter === "month" ? (
              <div className="w-full md:w-48 space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-indigo-300">Month</label>
                <input 
                  type="month" 
                  value={monthYear} 
                  onChange={e => setMonthYear(e.target.value)} 
                  className="flex h-10 w-full rounded-md border-0 bg-indigo-900/50 text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 [color-scheme:dark]"
                />
              </div>
            ) : (
              <div className="w-full md:w-48 space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-indigo-300">Year</label>
                <input 
                  type="number" 
                  value={year} 
                  onChange={e => setYear(e.target.value)} 
                  className="flex h-10 w-full rounded-md border-0 bg-indigo-900/50 text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </div>
            )}

            <Button type="submit" disabled={loading} className="bg-indigo-500 hover:bg-indigo-600 text-white border-0 h-10 px-8">
              {loading ? "Generating..." : <><Filter className="w-4 h-4 mr-2" /> Generate</>}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Results Area */}
      {hasRun && !loading && rows.length > 0 && (
        <div className="space-y-6">
          <div className="flex justify-end space-x-3">
            <Button variant="outline" className="text-emerald-700 border-emerald-200 hover:bg-emerald-50" onClick={exportExcel}>
              <FileSpreadsheet className="w-4 h-4 mr-2" /> Export to Excel
            </Button>
            <Button variant="outline" className="text-rose-700 border-rose-200 hover:bg-rose-50" onClick={exportPDF}>
              <FileText className="w-4 h-4 mr-2" /> Export to PDF
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            
            {/* Chart */}
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle className="text-sm font-bold uppercase tracking-wider text-zinc-500">Data Summary</CardTitle>
              </CardHeader>
              <CardContent className="h-64 flex flex-col justify-center items-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={summary} innerRadius={50} outerRadius={70} paddingAngle={2} dataKey="value">
                      {summary.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Data Grid */}
            <Card className="lg:col-span-3">
              <CardContent className="p-0 max-h-[500px] overflow-auto">
                <Table>
                  <TableHeader className="bg-zinc-50 sticky top-0 z-10 shadow-sm">
                    <TableRow>
                      {Object.keys(rows[0]).map(key => (
                        <TableHead key={key} className="whitespace-nowrap font-bold text-zinc-900">{key}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((row, idx) => (
                      <TableRow key={idx}>
                        {Object.values(row).map((val: any, vIdx) => (
                          <TableCell key={vIdx} className="whitespace-nowrap">
                            {val}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {hasRun && !loading && rows.length === 0 && (
        <div className="text-center py-16 bg-white rounded-xl border border-dashed border-zinc-300">
          <FileText className="w-12 h-12 text-zinc-300 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-zinc-700">No Data Found</h3>
          <p className="text-zinc-500 mt-1">There are no records matching your selected report type and date range.</p>
        </div>
      )}

    </div>
  );
}
