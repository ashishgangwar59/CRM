"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, MapPin, CheckCircle, AlertTriangle } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function AttendancePage() {
  const [todayStatus, setTodayStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [punching, setPunching] = useState(false);
  const [monthlyRecords, setMonthlyRecords] = useState<any[]>([]);
  
  const currentMonth = new Date().toISOString().slice(0, 7);

  const fetchStatus = async () => {
    try {
      const res = await fetch("/api/attendance/today");
      const data = await res.json();
      if (data.success) {
        setTodayStatus(data.data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchMonthly = async () => {
    try {
      const res = await fetch(`/api/attendance/monthly?month=${currentMonth}`);
      const data = await res.json();
      if (data.success) {
        setMonthlyRecords(data.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    fetchMonthly();
  }, []);

  const handlePunch = async (action: "IN" | "OUT") => {
    setPunching(true);
    
    // Get GPS
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      setPunching(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const res = await fetch("/api/attendance/punch", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action,
              latitude: position.coords.latitude,
              longitude: position.coords.longitude
            })
          });
          const data = await res.json();
          if (data.success) {
            alert(`Punched ${action} successfully!`);
            fetchStatus();
            fetchMonthly();
          } else {
            alert(data.error);
          }
        } catch (e) {
          alert("Network error while punching in/out");
        }
        setPunching(false);
      },
      (error) => {
        alert("Unable to retrieve your location. Please allow location access.");
        setPunching(false);
      }
    );
  };

  if (loading) return <div className="p-8">Loading attendance data...</div>;

  const hasPunchedIn = !!todayStatus?.punchIn;
  const hasPunchedOut = !!todayStatus?.punchOut;

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-10">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Attendance Dashboard</h1>
        <p className="text-zinc-500 dark:text-zinc-400">Track your daily punches and review monthly history.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>Action Center</CardTitle>
            <CardDescription>Record your daily attendance</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-col items-center justify-center p-6 bg-zinc-50 dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800">
              <div className="text-4xl font-bold tracking-tight mb-2">
                {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
              <p className="text-sm text-zinc-500 mb-6">{new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>

              {!hasPunchedIn && (
                <Button 
                  size="lg" 
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                  onClick={() => handlePunch("IN")}
                  disabled={punching}
                >
                  <Clock className="mr-2 h-5 w-5" /> Punch In
                </Button>
              )}
              {hasPunchedIn && !hasPunchedOut && (
                <Button 
                  size="lg" 
                  className="w-full bg-rose-600 hover:bg-rose-700 text-white"
                  onClick={() => handlePunch("OUT")}
                  disabled={punching}
                >
                  <Clock className="mr-2 h-5 w-5" /> Punch Out
                </Button>
              )}
              {hasPunchedIn && hasPunchedOut && (
                <div className="flex items-center text-emerald-600 font-medium bg-emerald-50 dark:bg-emerald-900/30 px-4 py-2 rounded-full">
                  <CheckCircle className="mr-2 h-5 w-5" /> Shift Completed
                </div>
              )}
            </div>

            {hasPunchedIn && (
              <div className="space-y-3 text-sm">
                <div className="flex justify-between p-3 bg-zinc-100 dark:bg-zinc-800 rounded-lg">
                  <span className="text-zinc-500 flex items-center"><MapPin className="h-4 w-4 mr-1"/> Punch In</span>
                  <span className="font-medium">{new Date(todayStatus.punchIn.time).toLocaleTimeString()}</span>
                </div>
                {todayStatus.punchOut && (
                  <div className="flex justify-between p-3 bg-zinc-100 dark:bg-zinc-800 rounded-lg">
                    <span className="text-zinc-500 flex items-center"><MapPin className="h-4 w-4 mr-1"/> Punch Out</span>
                    <span className="font-medium">{new Date(todayStatus.punchOut.time).toLocaleTimeString()}</span>
                  </div>
                )}
                {todayStatus.metrics.isLate && (
                  <div className="flex items-center text-amber-600 font-medium">
                    <AlertTriangle className="h-4 w-4 mr-1" /> You were marked Late today.
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Monthly History ({new Date().toLocaleString('default', { month: 'long' })})</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Punch In</TableHead>
                  <TableHead>Punch Out</TableHead>
                  <TableHead>Hours</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {monthlyRecords.map((record) => (
                  <TableRow key={record._id}>
                    <TableCell className="font-medium">{record.date}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        record.status === "Present" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" :
                        "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400"
                      }`}>
                        {record.status}
                      </span>
                      {record.metrics.isLate && <span className="ml-2 text-xs text-amber-600">Late</span>}
                    </TableCell>
                    <TableCell>{record.punchIn ? new Date(record.punchIn.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "-"}</TableCell>
                    <TableCell>{record.punchOut ? new Date(record.punchOut.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "-"}</TableCell>
                    <TableCell>{record.metrics.workingHours > 0 ? `${record.metrics.workingHours}h` : "-"}</TableCell>
                  </TableRow>
                ))}
                {monthlyRecords.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-zinc-500 py-8">
                      No attendance records found for this month.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
