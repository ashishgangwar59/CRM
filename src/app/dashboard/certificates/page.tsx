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
    "In recognition and appreciation of your dedication, commitment, disciplineand valuable contribution towards the organization.Your consistent efforts, positive attitude and professional approach havecontributed meaningfully to the growth and success of the team.We sincerely appreciate your contribution and encourage you to continueachieving excellence in your professional journey."
  );
  const [authName, setAuthName] = useState<string>("");
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

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
        <p className="text-zinc-500 dark:text-zinc-400 font-medium animate-pulse">Loading certificate data...</p>
      </div>
    );
  }

  return (
    <>
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
                  disabled={loading}
                >
                  <option value="">{loading ? "Loading employees..." : "-- Choose Employee --"}</option>
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


      </div>
      {/* Actual Certificate for Printing */}
      {selectedEmployee && (
        <div className="mt-10 print:mt-0 print:absolute print:inset-0 w-full overflow-x-auto flex justify-center print:overflow-hidden pb-10 print:pb-0 print:m-0">
          <style dangerouslySetInnerHTML={{
            __html: `
            @import url("https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600;700&family=Great+Vibes&display=swap");
            
            :root{
              --navy:#134086;
              --navy2:#134086;
              --gold:#bd922d;
              --gold2:#e2bd59;
              --paper:#f8f7f1;
            }
            
            @media print {
              @page { size: 15.36in 10.24in; margin: 0; }
              html, body { -webkit-print-color-adjust: exact; print-color-adjust: exact; padding:0; background:#fff; margin:0; overflow: hidden !important; width: 100%; height: 100%; }
              #header, #sidebar, .sidebar { display: none !important; }
              .certificate { width: 15.36in !important; height: 10.24in !important; box-shadow: none !important; transform: none !important; zoom: 1 !important; margin: 0 !important; }
              .certificate-container { overflow: hidden !important; padding: 0 !important; margin: 0 !important; }
              *::-webkit-scrollbar { display: none !important; }
            }
            
            .certificate-container {
               width: 100%;
               overflow-x: auto;
               display: flex;
               justify-content: center;
               background: transparent;
            }

            .certificate {
              position:relative;
              width:1536px;
              height:1024px;
              overflow:hidden;
              background: radial-gradient(ellipse at 52% 45%,rgba(255,255,255,.72),transparent 65%), linear-gradient(110deg,#f6f5ee,#fbfaf5 47%,#f6f5ee);
              box-shadow:0 8px 30px rgba(0,0,0,.15);
              color:var(--navy);
              font-family:Georgia,"Times New Roman",serif;
              transform-origin: top center;
            }

            @media screen and (max-width: 1600px) {
              .certificate {
                zoom: 0.6;
              }
            }
            @media screen and (max-width: 1000px) {
              .certificate {
                zoom: 0.4;
              }
            }

            .texture{position:absolute;inset:0;opacity:.22;pointer-events:none;background:repeating-linear-gradient(135deg,transparent 0 9px,rgba(190,159,91,.22) 10px 11px,transparent 12px 20px);clip-path:polygon(0 12%,20% 0,100% 0,100% 100%,0 100%);}
            .texture:after{content:"";position:absolute;inset:0;background:radial-gradient(ellipse at 0 45%,transparent 0 17%,rgba(191,160,95,.18) 17.1% 17.3%,transparent 17.4% 19%),radial-gradient(ellipse at 100% 63%,transparent 0 17%,rgba(191,160,95,.18) 17.1% 17.3%,transparent 17.4% 19%);}
            .border-1{position:absolute;z-index:20;pointer-events:none;inset:24px 28px;border:2px solid var(--gold)}
            .border-2{position:absolute;z-index:20;pointer-events:none;inset:31px 35px;border:1px solid rgba(189,146,45,.48)}
            .band{position:absolute;z-index:25;pointer-events:none}
            .band.tl{width:350px;height:23px;left:-65px;top:35px;transform:rotate(-35deg)}
            .band.br{width:350px;height:23px;right:-65px;bottom:35px;transform:rotate(-35deg)}
            .band.navy{background:var(--navy2)}
            .band.gold{background:linear-gradient(90deg,#d3aa45,#f0d17a,#b78925);height:16px}
            .band.tl.gold{left:-52px;top:58px}
            .band.br.gold{right:-52px;bottom:58px}
            .corner-mark{position:absolute;width:32px;height:32px;z-index:30}
            .corner-mark:before,.corner-mark:after{content:"";position:absolute;background:var(--gold)}
            .corner-mark.top-right{right:28px;top:25px}
            .corner-mark.top-right:before{right:0;top:0;width:3px;height:27px}
            .corner-mark.top-right:after{right:0;top:0;width:27px;height:3px}
            .corner-mark.top-right i{position:absolute;right:5px;top:5px;width:18px;height:18px;background:var(--navy);clip-path:polygon(100% 0,100% 100%,0 0)}
            .corner-mark.bottom-left{left:28px;bottom:25px}
            .corner-mark.bottom-left:before{left:0;bottom:0;width:3px;height:27px}
            .corner-mark.bottom-left:after{left:0;bottom:0;width:27px;height:3px}
            .corner-mark.bottom-left i{position:absolute;left:5px;bottom:5px;width:18px;height:18px;background:var(--navy);clip-path:polygon(0 0,100% 100%,0 100%)}
            .logo{position:absolute;left:296px;top:52px;height:105px;display:flex;z-index:40}
           
            .logo-name{font-family:Arial,Helvetica,sans-serif;font-size:53px;letter-spacing:5px;font-weight:500;line-height:48px}
            .logo-name sup{font-size:13px;vertical-align:top;position:relative;top:-8px;letter-spacing:0}
            .logo-title{font-family:Arial,Helvetica,sans-serif;font-size:20px;letter-spacing:7px;margin-top:9px;text-transform:uppercase}
            .logo-india{font-family:Arial,Helvetica,sans-serif;font-size:12px;letter-spacing:4px;text-align:center;margin-top:6px;display:flex;justify-content:center;gap:12px;align-items:center}
            .logo-india em{display:block;width:40px;height:1px;background:var(--gold)}
            .tagline{position:absolute;right:139px;top:88px;text-align:center;font-family:"Cormorant Garamond",Georgia,serif;font-size:25px;font-style:italic;line-height:1.25;z-index:40;}
            .tagline span{display:block;height:2px;background:var(--gold);width:233px;margin:16px auto 0}
            .cert-main{position:absolute;inset:0;z-index:35;margin:0!important;padding:177px 0 282px 0!important;display:flex;flex-direction:column;align-items:center;}
            .small-title{width:100%;text-align:center;font-size:40px;font-weight:600;letter-spacing:6px;text-transform:uppercase;}
            .main-title{width:100%;text-align:center;font-family:"Cormorant Garamond",Georgia,serif;color:var(--gold);font-size:80px;font-weight:700;letter-spacing:4px;line-height:1;text-transform:uppercase;margin-top:8px;}
            .title-ornament{width:666px;display:flex;align-items:center;gap:14px;margin-top:8px;}
            .title-ornament span{height:1px;background:var(--gold);flex:1}
            .title-ornament b{color:var(--gold);font-size:28px;font-family:serif;transform:scaleX(2)}
            .presented{width:100%;text-align:center;font-size:24px;font-weight:700;letter-spacing:2.3px;margin-top:10px;}
            .recipient{width:486px;text-align:center;margin-top:20px;}
            .recipient-name{font-size:69px;line-height:70px;white-space:nowrap;outline:0;}
            .recipient-line{height:1px;background:var(--gold);margin-top:8px;width:100%}
            .description{width:90%;max-width:1100px;text-align:center;font-size:17px;line-height:1.35;white-space:pre-wrap;margin-top:20px;}
            .description p{margin:0 0 11px}
            .wishes{width:635px;display:flex;align-items:center;gap:12px;margin-top:auto;}
            .wishes span{height:1px;background:var(--gold);flex:1}
            .wishes strong{font-family:"Great Vibes","Brush Script MT",cursive;color:var(--gold);font-size:30px;font-weight:400;white-space:nowrap}
            .company{width:100%;text-align:center;font-size:20px;font-weight:700;letter-spacing:1px;text-transform:uppercase;margin-top:18px;}
            .medal{position:absolute;bottom:143px;left:calc(50% - 48px);width:96px;height:112px}
            .medal-ribbon{position:absolute;top:67px;width:29px;height:48px;background:linear-gradient(90deg,#d8b14d,#a87820);clip-path:polygon(0 0,100% 0,78% 100%,50% 83%,20% 100%);}
            .medal-ribbon.left{left:17px;transform:rotate(8deg)}
            .medal-ribbon.right{right:17px;transform:rotate(-8deg)}
            .medal-disc{position:absolute;left:5px;top:0;width:86px;height:86px;border-radius:50%;padding:7px;background:linear-gradient(145deg,#e7c567,#98701d 58%,#e6bf58);box-shadow:0 3px 7px rgba(0,0,0,.28)}
            .medal-disc:before{content:"";position:absolute;inset:8px;border-radius:50%;background:var(--navy2);border:2px solid var(--gold)}
            .medal-disc:after{content:"";position:absolute;inset:14px;border-radius:50%;border:1px solid var(--gold)}
            .medal-n{position:absolute;z-index:3;left:0;right:0;top:21px;text-align:center;color:var(--gold);font:bold 42px Georgia}
            .laurel{position:absolute;z-index:3;top:22px;width:20px;height:39px;border-left:2px solid var(--gold);border-radius:50%}
            .left-laurel{left:17px;transform:rotate(28deg)}
            .right-laurel{right:17px;transform:rotate(-28deg)}
            .date-box{position:absolute;left:114px;bottom:130px;width:300px;font-size:19px;text-align:left;}
            .date-box>div{display:flex;align-items:end;height:38px}
            .date-box label{white-space:nowrap}
            .date-box span{display:block;flex:1;height:26px;border-bottom:1px solid var(--navy);margin-left:8px;outline:0;text-align:center;}
            .signatory{position:absolute;right:114px;bottom:170px;width:280px;text-align:center}
            .signature{height:85px;font-family:"Great Vibes","Brush Script MT",cursive;font-size:59px;color:var(--navy);outline:0;transform:rotate(-8deg);transform-origin:bottom center;display:flex;align-items:end;justify-content:center;padding-bottom:10px;}
            .sig-line{height:1px;background:var(--gold);margin-bottom:12px}
            .signatory b{font-size:17px}
            .signatory small{display:block;margin-top:4px;font-size:13px}
            .cert-footer{position:absolute;left:263px;right:263px;bottom:42px;height:25px;display:flex;align-items:center;gap:16px;font:12px Arial,Helvetica,sans-serif;letter-spacing:3px;z-index:40;white-space:nowrap}
            .cert-footer i{height:1px;background:var(--gold);flex:1}
            .cert-footer b{font-size:13px;color:var(--gold);font-weight:400}
            .cert-footer span{color:var(--navy)}
            `
          }} />

          <div className="certificate-container">
            <div ref={printRef} className="certificate">
              <div className="texture"></div>
              <div className="border-1"></div>
              <div className="border-2"></div>

              <div className="band tl navy"></div>
              <div className="band tl gold"></div>
              <div className="band br navy"></div>
              <div className="band br gold"></div>

              <div className="corner-mark top-right"><i></i><b></b></div>
              <div className="corner-mark bottom-left"><i></i><b></b></div>

              <div className="logo">
                {settings?.companyProfile?.logoUrl ? (
                  <img src={settings.companyProfile.logoUrl} alt="Logo" style={{ height: "105px", marginRight: "28px", objectFit: "contain" }} />
                ) : (
                  <div className="logo-symbol">
                    <img src="/logo.png" alt="Logo" style={{ height: "105px", marginRight: "28px", objectFit: "contain" }} />
                  </div>
                )}
                <div className="logo-copy">
                  <div className="logo-name">{settings?.companyProfile?.name?.split(" ")[0] || "NIVENTRA"}<sup>®</sup></div>
                  <div className="logo-title">{settings?.companyProfile?.name?.split(" ").slice(1, 3).join(" ") || "CAPITAL ADVISORY"}</div>
                  <div className="logo-india"><em></em> {settings?.companyProfile?.name?.split(" ").slice(3).join(" ") || "INDIA PVT LTD"} <em></em></div>
                </div>
              </div>

              <div className="tagline">
                <div>Building Wealth</div>
                <div>Creating a Brighter Future</div>
                <span></span>
              </div>

              <div className="cert-main">
                <div className="small-title">CERTIFICATE OF</div>
                <div className="main-title">{certType.replace("Employee of the ", "").replace("Certificate of ", "")}</div>
                <div className="title-ornament">
                  <span></span><b>⌁</b><span></span>
                </div>

                <div className="presented">THIS CERTIFICATE IS PROUDLY PRESENTED TO</div>

                <div className="recipient">
                  <div className="recipient-name">{selectedEmployee.firstName} {selectedEmployee.lastName}</div>
                  <div className="recipient-line"></div>
                </div>

                <div className="description">
                  {customMessage}
                </div>

                <div className="wishes"><span></span><strong>With Best Wishes for Continued Success</strong><span></span></div>
                <div className="company">{settings?.companyProfile?.name || "NIVENTRA CAPITAL ADVISORY INDIA PVT LTD"}</div>

                <div className="medal">
                  <div className="medal-ribbon left"></div>
                  <div className="medal-ribbon right"></div>
                  <div className="medal-disc">
                    <div className="laurel left-laurel"></div>
                    <div className="laurel right-laurel"></div>
                    <div className="medal-n">{(settings?.companyProfile?.name || "N")[0].toUpperCase()}</div>
                  </div>
                </div>

                <div className="date-box">
                  <div><label>Date:</label><span>{new Date(issueDate).toLocaleDateString("en-GB")}</span></div>
                  <div><label>Certificate No.:</label><span>CERT-{new Date().getFullYear()}-{Math.floor(Math.random() * 1000).toString().padStart(3, '0')}</span></div>
                </div>

                <div className="signatory">
                  <div className="signature">{authName}</div>
                  <div className="sig-line"></div>
                  <b>Authorized Signatory</b>
                  <small>{settings?.companyProfile?.name || "Niventra Capital Advisory India Pvt Ltd"}</small>
                </div>
              </div>

              <div className="cert-footer">
                <i></i><span>RECOGNIZING EXCELLENCE</span><b>•</b>
                <span>APPRECIATING COMMITMENT</span><b>•</b>
                <span>CELEBRATING SUCCESS</span><i></i>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}