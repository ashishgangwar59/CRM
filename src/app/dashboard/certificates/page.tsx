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
    "In recognition and appreciation of your dedication, commitment, discipline\\nand valuable contribution towards the organization.\\n\\nYour consistent efforts, positive attitude and professional approach have\\ncontributed meaningfully to the growth and success of the team.\\n\\nWe sincerely appreciate your contribution and encourage you to continue\\nachieving excellence in your professional journey."
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
            className="relative bg-[#fcfaf5] text-black w-[1123px] h-[794px] shrink-0 overflow-hidden print:w-[297mm] print:h-[210mm] shadow-2xl print:shadow-none font-sans"
            style={{ boxSizing: 'border-box' }}
          >
            {/* Outer and Inner Borders */}
            <div className="absolute inset-4 border-[1px] border-[#134086] pointer-events-none z-10">
              <div className="absolute inset-1 border-[1px] border-[#c9972f] pointer-events-none"></div>
            </div>

            {/* Top Left Corner SVG */}
            <svg className="absolute top-0 left-0 w-64 h-64 pointer-events-none z-20" viewBox="0 0 100 100" preserveAspectRatio="none">
              <polygon points="0,0 100,0 0,100" fill="#0f2e60" />
              <polygon points="0,0 90,0 0,90" fill="#c9972f" />
              <polygon points="0,0 86,0 0,86" fill="#134086" />
            </svg>

            {/* Bottom Right Corner SVG */}
            <svg className="absolute bottom-0 right-0 w-64 h-64 pointer-events-none z-20" viewBox="0 0 100 100" preserveAspectRatio="none">
              <polygon points="100,100 0,100 100,0" fill="#0f2e60" />
              <polygon points="100,100 10,100 100,10" fill="#c9972f" />
              <polygon points="100,100 14,100 100,14" fill="#134086" />
            </svg>

            {/* Content Container */}
            <div className="relative z-10 h-full flex flex-col items-center justify-between px-24 py-16 text-center">

              {/* Header: Logo and Tagline */}
              <div className="w-full flex justify-between items-start pt-2">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 flex items-center justify-center font-serif text-[#c9972f] text-4xl font-black bg-white border border-gray-200 shadow-sm relative overflow-hidden">
                    <span className="absolute left-[-15px] top-1/2 -translate-y-1/2 w-4 h-[70px] bg-gradient-to-r from-transparent to-white skew-x-[-20deg]"></span>
                    N
                  </div>
                  <div className="text-left flex flex-col justify-center">
                    <h2 className="text-[28px] font-black text-[#134086] tracking-widest m-0 leading-none">
                      NIVENTRA<sup className="text-sm font-normal">®</sup>
                    </h2>
                    <p className="text-[14px] text-[#134086] tracking-[0.4em] mt-1 mb-0 font-medium">CAPITAL ADVISORY</p>
                    <div className="flex items-center justify-center w-full gap-2 mt-1">
                      <div className="h-[1px] flex-1 bg-[#c9972f]"></div>
                      <p className="text-[10px] text-zinc-500 tracking-[0.2em] font-bold m-0">INDIA PVT LTD</p>
                      <div className="h-[1px] flex-1 bg-[#c9972f]"></div>
                    </div>
                  </div>
                </div>
                <div className="text-right text-[#134086] font-medium italic mt-2 text-lg leading-tight" style={{ fontFamily: "'Playfair Display', serif" }}>
                  <p>Building Wealth</p>
                  <p>Creating a Brighter Future</p>
                </div>
              </div>

              {/* Title Section */}
              <div className="mt-8 flex flex-col items-center w-full">
                <h1 className="text-3xl font-black text-[#134086] tracking-[0.3em] mb-2" style={{ fontFamily: "'Cinzel', serif" }}>
                  CERTIFICATE OF
                </h1>
                <h2 className="text-[5rem] font-bold text-[#c9972f] uppercase tracking-wider leading-none mb-4" style={{ fontFamily: "'Cinzel', serif", textShadow: "1px 1px 1px rgba(0,0,0,0.05)" }}>
                  APPRECIATION
                </h2>
                
                {/* Decorative Divider */}
                <div className="flex items-center justify-center w-full mb-8">
                  <svg width="300" height="20" viewBox="0 0 300 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M0 10H120" stroke="#c9972f" strokeWidth="1"/>
                    <path d="M180 10H300" stroke="#c9972f" strokeWidth="1"/>
                    <path d="M150 2 C155 2, 155 10, 160 10 C155 10, 155 18, 150 18 C145 18, 145 10, 140 10 C145 10, 145 2, 150 2 Z" fill="none" stroke="#c9972f" strokeWidth="1"/>
                    <circle cx="150" cy="10" r="2" fill="#c9972f"/>
                    <circle cx="135" cy="10" r="1.5" fill="#c9972f"/>
                    <circle cx="165" cy="10" r="1.5" fill="#c9972f"/>
                  </svg>
                </div>
                
                <p className="text-[#134086] font-black uppercase tracking-[0.2em] mb-6 text-sm">
                  THIS CERTIFICATE IS PROUDLY PRESENTED TO
                </p>

                <div
                  className="text-[5rem] text-[#134086] leading-none mb-8"
                  style={{ fontFamily: "'Great Vibes', cursive" }}
                >
                  {selectedEmployee.firstName} {selectedEmployee.lastName}
                </div>

                <div className="text-[#1a2b4c] text-[15px] max-w-4xl mx-auto leading-loose mb-10 font-bold px-12 whitespace-pre-wrap">
                  {customMessage}
                </div>

                <div className="flex items-center justify-center gap-4 w-full mb-3">
                  <div className="h-[1px] w-24 bg-[#c9972f]"></div>
                  <p className="text-3xl text-[#c9972f] italic" style={{ fontFamily: "'Great Vibes', cursive" }}>
                    With Best Wishes for Continued Success
                  </p>
                  <div className="h-[1px] w-24 bg-[#c9972f]"></div>
                </div>

                <p className="text-[12px] font-black text-[#134086] tracking-widest uppercase">
                  NIVENTRA CAPITAL ADVISORY INDIA PVT LTD
                </p>
              </div>

              {/* Footer Section (Signatures & Seal) */}
              <div className="w-full flex justify-between items-end mt-auto relative px-8">
                
                {/* Left: Date & Cert No */}
                <div className="flex flex-col items-start gap-4 text-[13px] font-bold text-zinc-700 z-10 pb-4">
                  <div className="flex items-end gap-2">
                    <span className="w-24">Date:</span>
                    <div className="w-32 border-b border-zinc-400 text-center pb-1">{new Date(issueDate).toLocaleDateString("en-GB")}</div>
                  </div>
                  <div className="flex items-end gap-2">
                    <span className="w-24">Certificate No.:</span>
                    <div className="w-32 border-b border-zinc-400 text-center pb-1">CERT-{new Date().getFullYear()}-{Math.floor(Math.random() * 1000).toString().padStart(3, '0')}</div>
                  </div>
                </div>

                {/* Center Seal */}
                <div className="absolute left-1/2 -translate-x-1/2 bottom-0 flex flex-col items-center">
                  <div className="relative w-32 h-32 flex items-center justify-center z-10">
                    
                    {/* Ribbon Tails (SVG) */}
                    <svg className="absolute -bottom-6 w-20 h-24 z-[-1]" viewBox="0 0 100 120" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M20 0 L0 120 L25 100 L50 120 L30 0 Z" fill="#aa771c" />
                      <path d="M80 0 L100 120 L75 100 L50 120 L70 0 Z" fill="#d4af37" />
                    </svg>

                    {/* Gold Outer Ring */}
                    <div className="absolute top-2 w-[6.5rem] h-[6.5rem] bg-gradient-to-br from-[#f3db7a] via-[#c9972f] to-[#aa771c] rounded-full flex items-center justify-center shadow-2xl border-[1px] border-[#aa771c]">
                      
                      {/* Inner Jagged Edge (Approximated with CSS dashed border) */}
                      <div className="w-[5.8rem] h-[5.8rem] rounded-full flex items-center justify-center border-2 border-dashed border-[#855711] bg-gradient-to-br from-[#2a3855] to-[#0f1b33]">
                        
                        {/* Inner Laurel and N */}
                        <div className="relative w-full h-full flex items-center justify-center">
                          <span className="text-[2.5rem] font-bold text-[#f3db7a]" style={{ fontFamily: "'Cinzel', serif" }}>
                            N
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right: Signature */}
                <div className="flex flex-col items-center text-zinc-700 z-10 pb-4">
                  <div className="w-48 border-b border-zinc-400 h-16 flex items-end justify-center pb-2 relative">
                    <span className="text-4xl pr-4 transform -rotate-12 absolute bottom-2 text-[#2a3855]" style={{ fontFamily: "'Great Vibes', cursive" }}>{authName}</span>
                  </div>
                  <span className="text-[11px] font-bold mt-1 text-black">Authorized Signatory</span>
                  <span className="text-[11px] text-zinc-600">Niventra Capital Advisory India Pvt Ltd</span>
                </div>
              </div>

              {/* Bottom Edge Text */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-4 text-[9px] font-bold tracking-[0.2em] text-zinc-600 uppercase w-full justify-center">
                <span>Recognizing Excellence</span>
                <span className="text-[#c9972f] text-lg leading-none">•</span>
                <span>Appreciating Commitment</span>
                <span className="text-[#c9972f] text-lg leading-none">•</span>
                <span>Celebrating Success</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
