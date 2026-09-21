"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Loader2, Printer, Phone, Mail, Globe, MapPin } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

const Header = () => (
  <div className="px-10 pt-5 pb-5 z-11 flex items-center justify-between relative mb-6 shrink-0">
    <div className="absolute bottom-0 left-10 right-10 h-[3px] bg-gradient-to-r from-[#134086] via-[#D4AF37] to-[#134086]"></div>
    <div className="flex items-center gap-6">
      <img src="/logo.png" alt="Niventra Logo" className="h-24 object-contain drop-shadow-md" />
    </div>
    <div className="text-right flex flex-col justify-center">
      <h1 className="text-[26px] font-serif font-black text-[#134086] tracking-wider uppercase leading-tight drop-shadow-md">
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
);

const Footer = ({ address = "The Nukleus Centre, Mezzanine Level, Shivaji Stadium Metro Station,\nAirport Metro Line, Connaught Place, New Delhi 110001" }: { address?: string }) => (
  <div className="mt-auto z-10 relative shrink-0">
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
          <span className="leading-relaxed whitespace-pre-wrap">{address}</span>
        </div>
      </div>
      <div className="w-[72px] h-[72px] p-1.5 bg-white border border-zinc-200 shadow-sm rounded-md shrink-0 flex items-center justify-center">
        <QRCodeSVG value="https://www.niventracapitaladvisory.com" size={60} fgColor="#134086" />
      </div>
    </div>
  </div>
);

const Watermark = () => (
  <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-5 z-0">
    <img src="/logo.png" alt="Watermark" className="w-[500px] " />
  </div>
);

export default function OfferLetterPage() {
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
    day: '2-digit', month: '2-digit', year: 'numeric'
  });

  const joiningDate = employee.dateOfJoining
    ? new Date(employee.dateOfJoining).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : "";

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

        {/* PAGE 1: Offer & Appointment Part 1 */}
        <div className="w-[210mm] h-[297mm] mx-auto bg-white shadow-lg print:shadow-none print:w-[210mm] print:h-[297mm] text-zinc-900 text-[13px] leading-relaxed font-sans relative flex flex-col mb-8 print:mb-0 overflow-hidden box-border pt-0">
          <Watermark />
          <Header />

          <div className="px-10 flex-1 z-10">
            {/* METADATA BLOCK */}
            <div className="mb-6 space-y-1">
              <div className="flex"><span className="w-48 font-bold">OFFER LETTER NO.</span><span>: NIV/HR/{new Date().getFullYear()}/OL-{employee.employeeCode || "NEW"}</span></div>
              <div className="flex"><span className="w-48 font-bold">EMPLOYEE ID</span><span>: {employee.employeeCode || `NIV/EMP/${new Date().getFullYear()}/NEW`}</span></div>
              <div className="flex"><span className="w-48 font-bold">DATE</span><span>: {today}</span></div>
              <div className="flex"><span className="w-48 font-bold">DESIGNATION</span><span>: {employee.designation || "__________________"}</span></div>
            </div>

            <h2 className="text-center font-bold underline uppercase text-lg mb-4">OFFER LETTER</h2>

            <p className="mb-2">
              Dear Mr./Ms. <strong>{employee.firstName} {employee.lastName}</strong>,
            </p>
            <p className="mb-4">
              We are pleased to offer you the position of <strong>{employee.designation || "__________________"}</strong> with {settings?.companyProfile?.name || "NIVENTRA CAPITAL ADVISORY INDIA PVT LTD"}, subject to this Offer Letter, applicable employment terms, Company policies and applicable law.
            </p>

            <h3 className="font-bold underline uppercase mb-2">EMPLOYEE DETAILS</h3>
            <table className="w-full mb-4">
              <tbody>
                <tr><td className="w-48 py-0.5">Candidate Name</td><td>: <strong>{employee.firstName} {employee.lastName}</strong></td></tr>
                <tr><td className="w-48 py-0.5">Father/Mother Name</td><td>: <strong>{employee.fatherOrMotherName || "__________________"}</strong></td></tr>
                <tr><td className="w-48 py-0.5">Designation</td><td>: <strong>{employee.designation || "__________________"}</strong></td></tr>
                <tr><td className="w-48 py-0.5">Date of Joining</td><td>: <strong>{joiningDate || "___ / ___ / 2026"}</strong></td></tr>
                {/* <tr><td className="w-48 py-0.5">Reporting Manager</td><td>: <strong>{employee.reportingManager || "__________________"}</strong></td></tr> */}
              </tbody>
            </table>

            <h3 className="font-bold underline uppercase mb-1">REPORTING LOCATION</h3>
            <p className="mb-3">The Nukleus Center, Mezzanine Level, Shivaji Stadium Metro Station, Airport Express Line, Connaught Place, New Delhi 110001</p>

            <h3 className="font-bold underline uppercase mb-1">PROBATION & CONFIRMATION</h3>
            <p className="mb-3">
              The initial probation period shall be 3 months unless otherwise communicated in writing. During probation, the Company may review performance, attendance, conduct, documentation, communication and role suitability.<br />
              Confirmation or extension will be communicated by the Company in accordance with applicable terms and law.
            </p>

            <h3 className="font-bold underline uppercase mb-1">ROLE & RESPONSIBILITIES</h3>
            <p className="mb-5">
              You shall perform assigned responsibilities diligently, maintain professional standards, follow approved business processes, submit required reports, protect Company information and comply with lawful instructions and applicable workplace policies.
            </p>

            <h3 className="font-bold underline uppercase mb-1">PERFORMANCE & INCENTIVES</h3>
            <p className="mb-5">
              Performance may be reviewed periodically on business/operational performance, quality of work, attendance, customer handling, reporting discipline, compliance and teamwork. Incentives, where applicable, are subject to the relevant policy, eligibility, verification and approval.
            </p>

          </div>
          <Footer address={settings?.companyProfile?.address} />
        </div>

        {/* PAGE BREAK 1 */}
        <div className="page-break print:break-before-page" />

        {/* PAGE 2: Offer & Appointment Part 2 */}
        <div className="w-[210mm] h-[297mm] mx-auto bg-white shadow-lg print:shadow-none print:w-[210mm] print:h-[297mm] text-zinc-900 text-[13px] leading-relaxed font-sans relative flex flex-col mb-8 print:mb-0 overflow-hidden box-border">
          <Watermark />
          <Header />

          <div className="px-10 flex-1 z-10">
            <h3 className="font-bold underline uppercase mb-1">ATTENDANCE & WORKING HOURS</h3>
            <p className="mb-5">
              You shall follow the working hours and attendance system communicated by HR. Repeated late attendance, unauthorised absence or failure to follow attendance procedures may result in action under applicable policy and law.
            </p>

            <h3 className="font-bold underline uppercase mb-1">LEAVE</h3>
            <p className="mb-5">
              Leave must be requested and approved through the prescribed process. Unauthorised absence may be treated in accordance with Company policy and applicable law.
            </p>

            <h3 className="font-bold underline uppercase mb-1">REVIEW & CAREER DEVELOPMENT</h3>
            <p className="mb-5">
              Role responsibilities, reporting structures, targets and compensation components may be reviewed from time to time based on business requirements, performance and applicable employment terms.
            </p>

            <h3 className="font-bold underline uppercase mb-2">CONFIDENTIALITY & COMPLIANCE</h3>
            <div className="space-y-3 mb-5">
              <p><strong>CONFIDENTIALITY:</strong> You shall protect confidential information relating to the Company, clients, investors, employees, business processes, commercial arrangements, databases, passwords, documents and proprietary information during and after employment.</p>
              <p><strong>COMPANY PROPERTY & ACCESS:</strong> All Company-issued devices, ID cards, documents, files, credentials, database access and other assets remain Company property and must be protected and returned upon request or separation.</p>
              <p><strong>FINANCIAL & CLIENT COMPLIANCE:</strong> You are not authorised to make unauthorised commitments regarding returns, approvals, refunds or Company obligations. Company/client/investor money must not be collected into personal bank accounts or personal payment instruments. All financial transactions must follow officially approved procedures.</p>
              <p><strong>PROFESSIONAL CONDUCT:</strong> Fraud, falsification, misuse of Company systems/property, unauthorised disclosure, harassment, misrepresentation, serious policy violations or unauthorised handling of funds may lead to appropriate action after following applicable process and law.</p>
              <p><strong>CONFLICT OF INTEREST:</strong> You shall disclose actual or potential conflicts of interest and shall not use your position, Company information or resources for unauthorised personal benefit.</p>
            </div>

            <h3 className="font-bold underline uppercase mb-1">DOCUMENT REQUIRED & VERIFICATION</h3>
            <ul className="list-disc pl-5 mb-1 space-y-0.5">
              <li>Certificate supporting education qualification.</li>
              <li>Certificate supporting employment from the present and previous organisation.</li>
              <li>02 passport size photograph.</li>
              <li>Aadhar card.</li>
              <li>Pan card.</li>
            </ul>
            <p className="mb-5">
              You need to carry the abovementioned documents in original with you on the day of joining for the cross verification. Employment is subject to verification of submitted information and documents. Materially false, misleading or incomplete information may result in appropriate action under applicable law and Company policy.
            </p>


          </div>
          <Footer address={settings?.companyProfile?.address} />
        </div>

        {/* PAGE 2: Offer & Appointment Part 2 */}
        <div className="w-[210mm] h-[297mm] mx-auto bg-white shadow-lg print:shadow-none print:w-[210mm] print:h-[297mm] text-zinc-900 text-[13px] leading-relaxed font-sans relative flex flex-col mb-8 print:mb-0 overflow-hidden box-border">
          <Watermark />
          <Header />

          <div className="px-10 flex-1 z-10">
            <h3 className="font-bold underline uppercase mb-1">INTELLECTUAL PROPERTY</h3>
            <p className="mb-3">
              Work product and business materials created in the course of employment for Company business shall be handled in accordance with applicable Company policies and law.
            </p>

            <h3 className="font-bold underline uppercase mb-1">SEPARATION & ACCEPTANCE</h3>
            <p className="mb-1"><strong>TRANSFER / REASSIGNMENT:</strong> Subject to applicable law and employment terms, the Company may assign you to another department, role, branch or work location according to business requirements and suitability.</p>
            <p className="mb-1"><strong>SEPARATION & NOTICE:</strong> Either party may terminate the employment relationship in accordance with applicable employment terms, notice requirements and law. Serious misconduct, fraud, unauthorised disclosure or major compliance violations may result in immediate action where legally permitted. Company property, documents and access credentials must be returned upon separation.</p>
            <p className="mb-3"><strong>COMPANY POLICIES:</strong> You agree to comply with applicable HR, attendance, information-security, confidentiality, workplace-conduct, compliance and operational policies issued by the Company from time to time, subject to applicable law.</p>

            <h3 className="font-bold underline uppercase mb-1">ACCEPTANCE</h3>
            <p className="mb-10">
              By signing below, you confirm that you have read and understood this Offer Letter, the information provided by you is accurate to the best of your knowledge, and you agree to comply with applicable Company policies and procedures.
            </p>

            <div className="flex justify-between items-end">
              <div>
                <p className="font-bold mb-4">AUTHORISED SIGNATORY</p>
                <p>Name: CS KATARIA</p>
                <p>Date: {today}</p>
                <p>Designation: HR HEAD</p>
              </div>
              <div className="text-center">
                <p className="font-bold mb-8">EMPLOYEE ACCEPTANCE</p>
                <p>___________________________</p>
                <p className="text-sm mt-1">{employee.firstName} {employee.lastName}</p>
              </div>
            </div>
          </div>
          <Footer address={settings?.companyProfile?.address} />
        </div>

        {/* PAGE BREAK 2 */}
        <div className="page-break print:break-before-page" />

        {/* PAGE 3: Salary Structure */}
        <div className="w-[210mm] h-[297mm] mx-auto bg-white shadow-lg print:shadow-none print:w-[210mm] print:h-[297mm] text-zinc-900 text-[13px] leading-relaxed font-sans relative flex flex-col mb- print:mb-0 overflow-hidden box-border">
          <Watermark />
          <Header />

          <div className="px-10 flex-1 z-10 mt-[-10px]">
            <h2 className="text-center font-bold underline uppercase text-lg mb-2">SALARY STRUCTURE</h2>
            <table className="w-full mb-3 ">
              <tbody>
                <tr><td className="w-48 py-1">Name</td><td>: <strong>{employee.firstName} {employee.lastName}</strong></td></tr>
                <tr><td className="w-48 py-1">Designation</td><td>: <strong>{employee.designation || "__________________"}</strong></td></tr>
                <tr><td className="w-48 py-1">Department</td><td>: <strong>{employee.department || "__________________"}</strong></td></tr>
                <tr><td className="w-48 py-1">CTC per Annum</td><td>: <strong>{employee.salaryStructure?.ctcPerAnnum ? `Rs. ${employee.salaryStructure.ctcPerAnnum}` : "__________________"}</strong></td></tr>
              </tbody>
            </table>

            <table className="w-full border-collapse mb-4 shadow-sm zoom-[0.65]">
              <thead>
                <tr>
                  <th className="bg-[#134086] text-white border border-[#134086] p-2 text-left font-semibold uppercase tracking-wider text-xs">Salary Breakup : Per Month</th>
                  <th className="bg-[#134086] text-white border border-[#134086] p-2 text-right font-semibold uppercase tracking-wider text-xs w-48">Amount (₹)</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                <tr className="hover:bg-zinc-50"><td className="border border-zinc-200 p-2 text-zinc-700">Basic Salary</td><td className="border border-zinc-200 p-2 text-right font-medium text-zinc-900">{employee.salaryStructure?.basic || "-"}</td></tr>
                <tr className="hover:bg-zinc-50"><td className="border border-zinc-200 p-2 text-zinc-700">HRA</td><td className="border border-zinc-200 p-2 text-right font-medium text-zinc-900">{employee.salaryStructure?.hra || "-"}</td></tr>
                <tr className="hover:bg-zinc-50"><td className="border border-zinc-200 p-2 text-zinc-700">Conveyance</td><td className="border border-zinc-200 p-2 text-right font-medium text-zinc-900">{employee.salaryStructure?.conveyance || "-"}</td></tr>
                <tr className="hover:bg-zinc-50"><td className="border border-zinc-200 p-2 text-zinc-700">Medical Allowance</td><td className="border border-zinc-200 p-2 text-right font-medium text-zinc-900">{employee.salaryStructure?.medicalAllowance || "-"}</td></tr>
                <tr className="hover:bg-zinc-50"><td className="border border-zinc-200 p-2 text-zinc-700">Special Allowance</td><td className="border border-zinc-200 p-2 text-right font-medium text-zinc-900">{employee.salaryStructure?.specialAllowance || "-"}</td></tr>
                <tr className="bg-zinc-100 font-bold"><td className="border border-zinc-200 p-2 text-[#134086]">A. Monthly Gross</td><td className="border border-zinc-200 p-2 text-right text-[#134086]"></td></tr>

                <tr><td className="border border-zinc-200 p-2 bg-zinc-50 text-xs text-zinc-500 uppercase tracking-wider font-bold" colSpan={2}>Benefits</td></tr>
                <tr className="hover:bg-zinc-50"><td className="border border-zinc-200 p-2 text-zinc-700 pl-4">P.F.</td><td className="border border-zinc-200 p-2 text-right font-medium text-zinc-900">{employee.salaryStructure?.pf || "-"}</td></tr>
                <tr className="hover:bg-zinc-50"><td className="border border-zinc-200 p-2 text-zinc-700 pl-4">E.S.I.</td><td className="border border-zinc-200 p-2 text-right font-medium text-zinc-900">{employee.salaryStructure?.esi || "-"}</td></tr>
                <tr className="hover:bg-zinc-50"><td className="border border-zinc-200 p-2 text-zinc-700 pl-4">Insurance</td><td className="border border-zinc-200 p-2 text-right font-medium text-zinc-900">{employee.salaryStructure?.insurance || "-"}</td></tr>
                <tr className="bg-zinc-100 font-bold"><td className="border border-zinc-200 p-2 text-[#134086]">B. Total Benefits</td><td className="border border-zinc-200 p-2 text-right text-[#134086]"></td></tr>

                <tr><td className="border border-zinc-200 p-2 bg-zinc-50 text-xs text-zinc-500 uppercase tracking-wider font-bold" colSpan={2}>Liabilities</td></tr>
                <tr className="hover:bg-zinc-50"><td className="border border-zinc-200 p-2 text-zinc-700 pl-4">Leaves</td><td className="border border-zinc-200 p-2 text-right font-medium text-zinc-900">{employee.salaryStructure?.leaves || "-"}</td></tr>
                <tr className="hover:bg-zinc-50"><td className="border border-zinc-200 p-2 text-zinc-700 pl-4">L.T.A.</td><td className="border border-zinc-200 p-2 text-right font-medium text-zinc-900">{employee.salaryStructure?.lta || "-"}</td></tr>
                <tr className="bg-zinc-100 font-bold"><td className="border border-zinc-200 p-2 text-[#134086]">C. Total Liabilities</td><td className="border border-zinc-200 p-2 text-right text-[#134086]"></td></tr>

                <tr className="bg-[#134086]/10 font-bold"><td className="border border-zinc-200 p-2 text-[#134086]">D. CTC per Annum (A + B + C)</td><td className="border border-zinc-200 p-2 text-right text-[#134086] text-base">{employee.salaryStructure?.ctcPerAnnum ? `Rs. ${employee.salaryStructure.ctcPerAnnum}` : "-"}</td></tr>

                <tr><td className="border border-zinc-200 p-2 bg-zinc-50 text-xs text-zinc-500 uppercase tracking-wider font-bold" colSpan={2}>Deductions</td></tr>
                <tr className="hover:bg-zinc-50"><td className="border border-zinc-200 p-2 text-rose-700 pl-4">P.F.</td><td className="border border-zinc-200 p-2 text-right font-medium text-rose-700">{employee.salaryStructure?.pf || "-"}</td></tr>
                <tr className="hover:bg-zinc-50"><td className="border border-zinc-200 p-2 text-rose-700 pl-4">Professional Tax</td><td className="border border-zinc-200 p-2 text-right font-medium text-rose-700">{employee.salaryStructure?.professionalTax || "-"}</td></tr>
                <tr className="hover:bg-zinc-50"><td className="border border-zinc-200 p-2 text-rose-700 pl-4">E.S.I.</td><td className="border border-zinc-200 p-2 text-right font-medium text-rose-700">{employee.salaryStructure?.esi || "-"}</td></tr>
                <tr className="hover:bg-zinc-50"><td className="border border-zinc-200 p-2 text-rose-700 pl-4">*Income Tax (TDS)</td><td className="border border-zinc-200 p-2 text-right font-medium text-rose-700">{employee.salaryStructure?.tds || "-"}</td></tr>
                <tr className="bg-rose-50 font-bold"><td className="border border-zinc-200 p-2 text-rose-800">E. Total Deductions</td><td className="border border-zinc-200 p-2 text-right text-rose-800"></td></tr>

                <tr className="bg-[#134086] font-bold text-white"><td className="border border-[#134086] p-3 text-lg uppercase tracking-wider">F. Net Take Home (A - E)</td><td className="border border-[#134086] p-3 text-right text-lg"></td></tr>
              </tbody>
            </table>

            <div className="text-sm space-y-1 mt-4">
              <p>• Income Tax (TDS) Applicable</p>
              <p>• Take home will reduce upon your Income Tax Savings</p>
            </div>
          </div>
          <Footer address={settings?.companyProfile?.address} />
        </div>

        {/* <div className="w-[210mm] h-[297mm] mx-auto bg-white shadow-lg print:shadow-none print:w-[210mm] print:h-[297mm] text-zinc-900 text-[13px] leading-relaxed font-sans relative flex flex-col mb-8 print:mb-0 overflow-hidden box-border">
          <Watermark />
          <Header />

          <div className="px-10 flex-1 z-10">
          

            <table className="w-full border-collapse mb-4 shadow-sm">

              <tbody>
                <tr className="bg-[#134086]/10 font-bold"><td className="border border-zinc-200 p-2 text-[#134086]">D. CTC per Annum (A + B + C)</td><td className="border border-zinc-200 p-2 text-right text-[#134086] text-base">{employee.salaryStructure?.ctcPerAnnum ? `Rs. ${employee.salaryStructure.ctcPerAnnum}` : "-"}</td></tr>

                <tr><td className="border border-zinc-200 p-2 bg-zinc-50 text-xs text-zinc-500 uppercase tracking-wider font-bold" colSpan={2}>Deductions</td></tr>
                <tr className="hover:bg-zinc-50"><td className="border border-zinc-200 p-2 text-rose-700 pl-4">P.F.</td><td className="border border-zinc-200 p-2 text-right font-medium text-rose-700">{employee.salaryStructure?.pf || "-"}</td></tr>
                <tr className="hover:bg-zinc-50"><td className="border border-zinc-200 p-2 text-rose-700 pl-4">Professional Tax</td><td className="border border-zinc-200 p-2 text-right font-medium text-rose-700">{employee.salaryStructure?.professionalTax || "-"}</td></tr>
                <tr className="hover:bg-zinc-50"><td className="border border-zinc-200 p-2 text-rose-700 pl-4">E.S.I.</td><td className="border border-zinc-200 p-2 text-right font-medium text-rose-700">{employee.salaryStructure?.esi || "-"}</td></tr>
                <tr className="hover:bg-zinc-50"><td className="border border-zinc-200 p-2 text-rose-700 pl-4">*Income Tax (TDS)</td><td className="border border-zinc-200 p-2 text-right font-medium text-rose-700">{employee.salaryStructure?.tds || "-"}</td></tr>
                <tr className="bg-rose-50 font-bold"><td className="border border-zinc-200 p-2 text-rose-800">E. Total Deductions</td><td className="border border-zinc-200 p-2 text-right text-rose-800"></td></tr>

                <tr className="bg-[#134086] font-bold text-white"><td className="border border-[#134086] p-3 text-lg uppercase tracking-wider">F. Net Take Home (A - E)</td><td className="border border-[#134086] p-3 text-right text-lg"></td></tr>
              </tbody>
            </table>

            <div className="text-sm space-y-1 mt-4">
              <p>• Income Tax (TDS) Applicable</p>
              <p>• Take home will reduce upon your Income Tax Savings</p>
            </div>

            <div className="mt-20 text-center font-medium text-zinc-500">
              <p>**This is a system generated document, no signature is required.**</p>
            </div>
          </div>
          <Footer address={settings?.companyProfile?.address} />
        </div> */}

      </div>
    </>
  );
}
