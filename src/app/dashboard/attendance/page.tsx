"use client";

import { useEffect, useState, useRef } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, MapPin, CheckCircle, AlertTriangle } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function AttendancePage() {
  const [todayStatus, setTodayStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [punching, setPunching] = useState(false);
  const [monthlyRecords, setMonthlyRecords] = useState<any[]>([]);
  const [isFieldEmployee, setIsFieldEmployee] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

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

    // Check if field employee
    fetch("/api/auth/me")
      .then(res => res.json())
      .then(data => {
        if (data.employee?.isFieldEmployee) {
          setIsFieldEmployee(true);
          // Start Camera
          if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            navigator.mediaDevices.getUserMedia({ video: true })
              .then(stream => {
                if (videoRef.current) {
                  videoRef.current.srcObject = stream;
                  videoRef.current.play();
                }
              })
              .catch(err => console.error("Camera error:", err));
          }
        }
      })
      .catch(console.error);

    // Stop camera on unmount
    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(t => t.stop());
      }
    };
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
          let livePhotoUrl = undefined;

          if (isFieldEmployee && videoRef.current) {
            try {
              const canvas = document.createElement("canvas");
              canvas.width = videoRef.current.videoWidth || 640;
              canvas.height = videoRef.current.videoHeight || 480;
              canvas.getContext("2d")?.drawImage(videoRef.current, 0, 0);
              const dataUrl = canvas.toDataURL("image/jpeg", 0.7);

              const req = await fetch(dataUrl);
              const blob = await req.blob();
              const formData = new FormData();
              formData.append("file", blob, "live_photo.jpg");

              const uploadRes = await fetch("/api/employees/upload", { method: "POST", body: formData });
              const uploadJson = await uploadRes.json();
              if (uploadJson.success) {
                livePhotoUrl = uploadJson.url;
              }
            } catch (err) {
              console.error("Live photo error:", err);
              alert("Failed to capture live photo.");
              setPunching(false);
              return;
            }
          }

          const res = await fetch("/api/attendance/punch", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action,
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              livePhotoUrl
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
    <div className="space-y-6 w-full pb-10">
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
              <div className="text-4xl font-bold tracking-tight mb-2 dark:text-zinc-100">
                {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
              <p className="text-sm text-zinc-500 mb-6">{new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>

              {isFieldEmployee && !hasPunchedOut && (
                <div className="w-full mb-6 flex flex-col items-center">
                  <span className="text-xs font-bold text-red-500 uppercase mb-2">Live Camera Active (Required)</span>
                  <video ref={videoRef} className="w-full h-48 object-cover rounded-lg border-2 border-zinc-200 dark:border-zinc-700 bg-black" playsInline muted />
                </div>
              )}

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
                  <span className="text-zinc-500 flex items-center"><MapPin className="h-4 w-4 mr-1" /> Punch In</span>
                  <span className="font-medium">{new Date(todayStatus.punchIn.time).toLocaleTimeString()}</span>
                </div>
                {todayStatus.punchOut && (
                  <div className="flex justify-between p-3 bg-zinc-100 dark:bg-zinc-800 rounded-lg">
                    <span className="text-zinc-500 flex items-center"><MapPin className="h-4 w-4 mr-1" /> Punch Out</span>
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
                    <TableCell className="dark:text-zinc-100">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${record.status === "Present" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" :
                        "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400"
                        }`}>
                        {record.status}
                      </span>
                      {record.metrics.isLate && <span className="ml-2 text-xs text-amber-600">Late</span>}
                    </TableCell>
                    <TableCell className="dark:text-zinc-100">{record.punchIn ? new Date(record.punchIn.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "-"}</TableCell>
                    <TableCell className="dark:text-zinc-100">{record.punchOut ? new Date(record.punchOut.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "-"}</TableCell>
                    <TableCell className="dark:text-zinc-100">{record.metrics.workingHours > 0 ? `${record.metrics.workingHours}h` : "-"}</TableCell>
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
