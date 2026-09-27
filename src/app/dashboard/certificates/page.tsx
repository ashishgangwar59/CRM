"use client";

import { useEffect, useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Printer, Trophy, Award, Medal, Star } from "lucide-react";

export default function CertificatesPage() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");
  const [certType, setCertType] = useState<string>("Employee of the Month");
  const [certPeriod, setCertPeriod] = useState<string>(
    new Date().toLocaleString("default", { month: "long", year: "numeric" })
  );
  const [customMessage, setCustomMessage] = useState<string>(
    "In recognition of your outstanding dedication, hard work, and excellent performance. Your contributions have been invaluable to our team's success."
  );
  const [authName, setAuthName] = useState<string>("Ram Mohan");
  const [issueDate, setIssueDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const res = await fetch("/api/employees");
        const data = await res.json();
        if (data.success) {
          setEmployees(data.data.filter((e: any) => e.status === "Active"));
        }

        const settingsRes = await fetch("/api/settings");
        const settingsData = await settingsRes.json();
        if (settingsData.success) {
          setSettings(settingsData.data);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchEmployees();
  }, []);

  const selectedEmployee = employees.find((e) => e._id === selectedEmployeeId);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 w-full pb-10 print:bg-white print:p-0">
      {/* Configuration UI (Hidden in Print) */}
      <div className="print:hidden space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 flex items-center gap-3">
            <Award className="w-8 h-8 text-[#c9972f]" />
            Certificate Generator
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400">Generate professional awards and certificates for employees.</p>
        </div>

        <Card className="border-zinc-200 dark:border-zinc-800 shadow-md">
          <CardHeader className="bg-zinc-50 dark:bg-zinc-900/50 border-b border-zinc-200 dark:border-zinc-800">
            <CardTitle>Certificate Details</CardTitle>
            <CardDescription>Select an employee and customize the award text.</CardDescription>
          </CardHeader>
          <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-semibold">Select Employee</label>
              <select
                className="w-full p-2.5 border rounded-lg dark:bg-zinc-900 dark:border-zinc-700 focus:ring-2 focus:ring-[#c9972f] outline-none transition"
                value={selectedEmployeeId}
                onChange={(e) => setSelectedEmployeeId(e.target.value)}
              >
                <option value="">-- Choose Employee --</option>
                {employees.map((emp) => (
                  <option key={emp._id} value={emp._id}>
                    {emp.firstName} {emp.lastName} ({emp.employeeCode})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold">Award Title</label>
              <select
                className="w-full p-2.5 border rounded-lg dark:bg-zinc-900 dark:border-zinc-700 focus:ring-2 focus:ring-[#c9972f] outline-none transition"
                value={certType}
                onChange={(e) => setCertType(e.target.value)}
              >
                <option value="Employee of the Month">Employee of the Month</option>
                <option value="Employee of the Year">Employee of the Year</option>
                <option value="Outstanding Performance Award">Outstanding Performance Award</option>
                <option value="Certificate of Appreciation">Certificate of Appreciation</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold">Period / Date</label>
              <input
                type="text"
                className="w-full p-2.5 border rounded-lg dark:bg-zinc-900 dark:border-zinc-700 focus:ring-2 focus:ring-[#c9972f] outline-none transition"
                value={certPeriod}
                onChange={(e) => setCertPeriod(e.target.value)}
                placeholder="e.g., September 2026 or For the year 2026"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-semibold">Custom Appreciation Message</label>
              <textarea
                className="w-full p-2.5 border rounded-lg dark:bg-zinc-900 dark:border-zinc-700 focus:ring-2 focus:ring-[#c9972f] outline-none transition min-h-[80px]"
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold">Authorized Signatory</label>
              <input
                type="text"
                className="w-full p-2.5 border rounded-lg dark:bg-zinc-900 dark:border-zinc-700 focus:ring-2 focus:ring-[#c9972f] outline-none transition"
                value={authName}
                onChange={(e) => setAuthName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold">Issue Date</label>
              <input
                type="date"
                className="w-full p-2.5 border rounded-lg dark:bg-zinc-900 dark:border-zinc-700 focus:ring-2 focus:ring-[#c9972f] outline-none transition"
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
              />
            </div>

            <div className="md:col-span-2 pt-4 border-t dark:border-zinc-800 flex justify-end">
              <Button
                size="lg"
                onClick={handlePrint}
                disabled={!selectedEmployee}
                className="bg-[#c9972f] hover:bg-[#b08328] text-white shadow-xl shadow-[#c9972f]/20 font-bold"
              >
                <Printer className="w-5 h-5 mr-2" /> Print Certificate (Landscape PDF)
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actual Certificate for Printing */}
      {selectedEmployee && (
        <div className="mt-10 print:mt-0 print:absolute print:inset-0 w-full flex justify-center items-center overflow-x-auto print:overflow-visible">
          <style dangerouslySetInnerHTML={{
            __html: `
            @media print {
              @page { size: A4 landscape; margin: 0; }
              body { -webkit-print-color-adjust: exact; print-color-adjust: exact; background: white; }
              #header, #sidebar, .sidebar { display: none !important; }
              main { margin: 0 !important; padding: 0 !important; }
            }
            @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700;900&family=Great+Vibes&family=Playfair+Display:ital,wght@0,400;0,700;1,400&display=swap');
          `}} />

          <div
            ref={printRef}
            className="relative text-black w-[1123px] h-[794px] shrink-0 overflow-hidden print:w-[297mm] print:h-[210mm] shadow-2xl print:shadow-none"
            style={{
              background: "radial-gradient(ellipse at 20% 20%, rgba(207, 178, 101, .15), transparent 38%), radial-gradient(ellipse at 80% 75%, rgba(207, 178, 101, .12), transparent 35%), repeating-linear-gradient(0deg, rgba(132, 98, 30, .03) 0 1px, transparent 1px 4px), #fffdf2",
              border: "12px solid #134086",
              boxShadow: "inset 0 0 0 2px #c9972f, inset 0 0 0 6px #f7e9b9, inset 0 0 0 8px #c9972f"
            }}
          >
            {/* Inner Gold Borders */}
            <div className="absolute inset-[15px] border border-[#c9972f] pointer-events-none z-10"></div>
            <div className="absolute inset-[19px] border border-dashed border-[#c9972f]/60 pointer-events-none z-10"></div>

            {/* Watermark Logo */}
            <div className="absolute inset-0 flex items-center justify-center opacity-[0.04] pointer-events-none z-0">
              <img src="/logo.png" alt="Company Logo Watermark" className="w-[500px] h-[500px] object-contain grayscale" />
            </div>

            {/* Corner Ornaments (CSS pseudo elements representation) */}
            <div className="absolute top-[25px] left-[25px] w-12 h-12 border-t-4 border-l-4 border-[#c9972f] pointer-events-none z-20"></div>
            <div className="absolute top-[25px] right-[25px] w-12 h-12 border-t-4 border-r-4 border-[#c9972f] pointer-events-none z-20"></div>
            <div className="absolute bottom-[25px] left-[25px] w-12 h-12 border-b-4 border-l-4 border-[#c9972f] pointer-events-none z-20"></div>
            <div className="absolute bottom-[25px] right-[25px] w-12 h-12 border-b-4 border-r-4 border-[#c9972f] pointer-events-none z-20"></div>



            {/* Content Container */}
            <div className="relative z-10 h-full flex flex-col items-center justify-center px-24 text-center">

              {settings?.companyProfile?.name && (
                <div
                  className="text-2xl font-bold tracking-[0.2em] text-[#c9972f] uppercase mb-4 mt-5"
                  style={{ fontFamily: "'Cinzel', serif" }}
                >
                  {settings.companyProfile.name}
                </div>
              )}

              <h1
                className="text-[3rem] text-[#134086] font-black uppercase tracking-[0.2em] mb-4 mt-2"
                style={{ fontFamily: "'Cinzel', serif" }}
              >
                Certificate
              </h1>
              <h2
                className="text-3xl text-[#c9972f] font-semibold italic tracking-wider mb-8"
                style={{ fontFamily: "'Playfair Display', serif" }}
              >
                Of {certType.replace("Employee of the ", "").replace("Certificate of ", "")}
              </h2>

              <p className="text-zinc-600 text-lg uppercase tracking-[0.3em] mb-5 font-semibold">
                This is proudly presented to
              </p>

              <div
                className="text-[2rem] font-bold text-[#134086] leading-none mb-8 mt-4 border-b-[3px] border-zinc-300 pb-4 px-20 inline-block tracking-wide capitalize"
                style={{ fontFamily: "'Playfair Display', serif" }}
              >
                {selectedEmployee.firstName} {selectedEmployee.lastName}
              </div>

              <p className="text-zinc-600 text-lg max-w-3xl mx-auto leading-relaxed mb-6 font-medium italic" style={{ fontFamily: "'Playfair Display', serif" }}>
                {customMessage}
              </p>

              <div className="bg-[#c9972f] text-white px-8 py-2 rounded-full text-xl font-bold tracking-wider shadow-lg mb-12">
                {certPeriod}
              </div>

              {/* Signatures */}
              <div className="w-full flex justify-between items-end px-16 mt-2 mb-10">
                <div className="flex flex-col items-center">
                  <div className="w-48 border-b-2 border-zinc-400 mb-2 h-12 flex items-end justify-center pb-2">
                    <span className="text-xl font-bold tracking-widest text-[#134086]">{new Date(issueDate).toLocaleDateString("en-GB", { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                  </div>
                  <span className="text-[12px] font-bold text-zinc-500 uppercase tracking-widest">Date Issued</span>
                </div>


                <div className="flex flex-col items-center">
                  <div className="w-48 border-b-2 border-zinc-400 mb-2 h-12 flex items-end justify-center pb-2">
                    <span className="text-xl pr-4" style={{ fontFamily: "'Great Vibes', cursive", color: "#134086" }}>{authName}</span>
                  </div>
                  <span className="text-[12px] font-bold text-zinc-500 uppercase tracking-widest">Authorized Signature</span>
                </div>
              </div>

              {/* Company Footer */}
              {settings && (
                <div className="absolute bottom-[32px] left-0 w-full flex justify-center items-center gap-6 text-[#134086]/70 text-xs font-semibold tracking-wider">
                  {settings?.companyProfile && (
                    <>
                      <span>{settings?.companyProfile?.website}</span>
                      {/* <span>{settings?.companyProfile?.phone}</span> */}
                    </>
                  )}
                  {settings?.companyProfile?.email && (
                    <>
                      {/* <span>•</span> */}
                      <span>{settings?.companyProfile?.email}</span>
                    </>
                  )}
                  {settings?.companyProfile?.phone && (
                    <>
                      {/* <span>•</span> */}
                      <span>{settings?.companyProfile?.phone}</span>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
