"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Download } from "lucide-react";

export default function AttendanceReportsPage() {
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    // In a real app, this would hit an API route that generates an Excel buffer using `xlsx`
    // and returns it with the correct headers, similar to the Employee export.
    alert("Export feature for Monthly Attendance will download an Excel sheet for: " + month);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-10">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Attendance Reports</h1>
        <p className="text-zinc-500 dark:text-zinc-400">Export and analyze company-wide attendance data.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Monthly Export</CardTitle>
          <CardDescription>Download a comprehensive Excel report containing daily attendance for all employees.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Select Month</label>
              <Input 
                type="month" 
                value={month} 
                onChange={(e) => setMonth(e.target.value)}
                className="w-48"
              />
            </div>
            <div className="space-y-2 mt-auto">
              <Button onClick={handleExport} disabled={loading} className="mt-6">
                <Download className="mr-2 h-4 w-4" /> Download Excel
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
