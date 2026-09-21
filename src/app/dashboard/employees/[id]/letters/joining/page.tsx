"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Loader2, Printer, Phone, Mail, Globe, MapPin } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

export default function JoiningLetterPage() {
  const { id } = useParams();
  const [employee, setEmployee] = useState<any>(null);
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(`/api/employees/${id}`).then(res => res.json()),
      fetch(`/api/settings`).then(res => res.json())
    ])
      .then(([empData, settingsData]) => {
        if (empData.success) {
          setEmployee(empData.data);
        }
        if (settingsData && settingsData.companyProfile) {
          setSettings(settingsData);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="flex justify-center items-center h-screen"><Loader2 className="w-8 h-8 animate-spin" /></div>;
  if (!employee) return <div className="text-center p-12 text-rose-500 font-bold text-xl">Employee not found.</div>;

  const handlePrint = () => {
    window.print();
  };

  const today = new Date().toLocaleDateString('en-IN', {
    day: 'numeric', month: 'long', year: 'numeric'
  });

  const joiningDate = employee.dateOfJoining
    ? new Date(employee.dateOfJoining).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
    : "[Joining Date]";

  return (
    <>
      <style dangerouslySetInnerHTML={{
        __html: `
        @media print {
          @page { margin: 0; size: A4; }
          body { 
            -webkit-print-color-adjust: exact; 
            print-color-adjust: exact; 
            background: white !important;
          }
        }
      `}} />
      <div className="min-h-screen bg-gray-100 py-8 print:py-0 print:bg-white">
        {/* Non-printable header */}
        <div className="max-w-4xl mx-auto mb-4 flex justify-end print:hidden">
          <button
            onClick={handlePrint}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md shadow flex items-center gap-2 font-medium"
          >
            <Printer className="w-4 h-4" /> Print / Save PDF
          </button>
        </div>

        {/* Printable Letter Sheet */}
        <div className="max-w-[800px] mx-auto bg-white shadow-lg print:shadow-none print:w-full min-h-[1122px] text-zinc-900 text-[13px] leading-relaxed font-sans relative flex flex-col">

          {/* Watermark Background */}
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-5 z-0">
            <img src="/logo.png" alt="Watermark" className="w-[500px]" />
          </div>

          {/* HEADER */}
          <div className="px-10 pt-12 pb-6 z-10 flex items-center justify-between relative mb-6">
            <div className="absolute bottom-0 left-10 right-10 h-[3px] bg-gradient-to-r from-[#134086] via-[#D4AF37] to-[#134086]"></div>
            <div className="flex items-center gap-6">
              <img src="/logo.png" alt="Niventra Logo" className="h-24 object-contain drop-shadow-sm" />
            </div>
            <div className="text-right flex flex-col justify-center">
              <h1 className="text-[26px] font-serif font-black text-[#134086] tracking-wider uppercase leading-tight drop-shadow-sm">
                Niventra Capital Advisory
              </h1>
              <h2 className="text-[20px] font-serif font-bold text-[#134086] tracking-widest uppercase leading-snug">
                India Private Limited
              </h2>
              <div className="w-full flex justify-end mt-2">
                <div className="bg-[#134086] px-4 py-1 rounded-sm shadow-sm inline-block">
                  <p className="text-[#D4AF37] font-bold tracking-[0.25em] text-[10px] uppercase">
                    Invest Today Prosper Tomorrow
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* CONTENT WRAPPER */}
          <div className="px-10 flex-1 z-10">
            {/* METADATA BLOCK */}
            <div className="mb-8 space-y-1">
              <div className="flex"><span className="w-48 font-bold">JOINING LETTER NO.</span><span>: NIV/HR/{new Date().getFullYear()}/JL-{employee.employeeCode || "NEW"}</span></div>
              <div className="flex"><span className="w-48 font-bold">EMPLOYEE ID</span><span>: {employee.employeeCode || `NIV/EMP/${new Date().getFullYear()}/NEW`}</span></div>
              <div className="flex"><span className="w-48 font-bold">DATE</span><span>: {today}</span></div>
              <div className="flex"><span className="w-48 font-bold">DESIGNATION</span><span>: {employee.designation || "__________________"}</span></div>
            </div>

            <div className="mb-8">
              <p className="font-bold">To,</p>
              <p className="font-bold">{employee.firstName} {employee.lastName}</p>
              <p>Emp Code: {employee.employeeCode || "N/A"}</p>
            </div>

            <h2 className="text-xl font-bold text-center underline mb-8 uppercase tracking-wide">Joining & Appointment Letter</h2>

            <p className="mb-4">Dear <strong>{employee.firstName}</strong>,</p>

            <p className="mb-4">
              Further to your acceptance of our offer letter, we are pleased to confirm your appointment with us as <strong>{employee.designation || "[Designation]"}</strong> in the <strong>{employee.department || "[Department]"}</strong> department, effective from your date of joining on <strong>{joiningDate}</strong>.
            </p>

            <p className="mb-4">
              Your employment will be governed by the standard policies, rules, and regulations of the company, which may be amended from time to time. You will be on a probation period of 3 months, during which your performance will be evaluated.
            </p>

            <p className="mb-4">
              Please note that your employment is strictly governed by a confidentiality clause, meaning you shall not disclose any sensitive company information, trade secrets, or client data to any unauthorized third parties during or after your tenure with the company.
            </p>

            <p className="mb-8">
              We are excited to have you on board and are confident that you will make a significant contribution to the company. Please sign the duplicate copy of this appointment letter to signify your acceptance of the terms of employment.
            </p>

            <p className="mb-12 font-medium">Welcome to the team!</p>

            <div className="flex justify-between mt-12">
              <div>
                <p className="font-bold border-t border-zinc-900 pt-2 w-48 text-center">Authorized Signatory</p>
                <p className="text-sm text-center text-zinc-600 mt-1">Human Resources</p>
              </div>
              <div>
                <p className="font-bold border-t border-zinc-900 pt-2 w-48 text-center">Accepted By</p>
                <p className="text-sm text-center text-zinc-600 mt-1">{employee.firstName} {employee.lastName}</p>
                <p className="text-xs text-center text-zinc-500 mt-1">Date: ______________</p>
              </div>
            </div>
          </div>

          {/* FOOTER */}
          <div className="mt-auto z-10 relative">
            <div className="absolute top-0 left-10 right-10 h-[2px] bg-gradient-to-r from-[#134086] via-[#D4AF37] to-[#134086]"></div>
            <div className="px-10 pt-4 pb-8 flex justify-between items-center text-[#134086] text-[11px] font-medium">
              <div className="flex-1 flex flex-col justify-center space-y-3">
                <div className="flex items-center gap-6 text-[12px]">
                  <span className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" /> +91 11-40515660</span>
                  <span className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" /> info@niventracapitaladvisory.com</span>
                  <span className="flex items-center gap-1.5"><Globe className="w-3.5 h-3.5" /> www.niventracapitaladvisory.com</span>
                </div>
                <div className="flex items-start gap-1.5 text-zinc-600">
                  <MapPin className="w-4 h-4 shrink-0 text-[#134086]" />
                  <span className="leading-relaxed whitespace-pre-wrap">{settings?.companyProfile?.address || "The Nukleus Centre, Mezzanine Level, Shivaji Stadium Metro Station,\nAirport Metro Line, Connaught Place, New Delhi 110001"}</span>
                </div>
              </div>
              <div className="w-[72px] h-[72px] p-1.5 bg-white border border-zinc-200 shadow-sm rounded-md shrink-0 flex items-center justify-center">
                <QRCodeSVG value="https://www.niventracapitaladvisory.com" size={60} fgColor="#134086" />
              </div>
            </div>
          </div>

        </div>
      </div>
    </>
  );
}
