"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Building, Users, Briefcase, Clock, Umbrella, Mail, MessageSquare, Shield, Settings, Plug, Database, Download, Upload, AlertTriangle } from "lucide-react";

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("Company Profile");
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [users, setUsers] = useState<any[]>([]);

  // Backup states
  const [backupFile, setBackupFile] = useState<File | null>(null);
  const [restoreMode, setRestoreMode] = useState<"merge" | "overwrite">("merge");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [backupLoading, setBackupLoading] = useState(false);
  const [backupMsg, setBackupMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [backupStats, setBackupStats] = useState<{ collections: number; files: number; sizeMb: string } | null>(null);
  
  // Selection checkboxes
  const [exportDb, setExportDb] = useState(true);
  const [exportFiles, setExportFiles] = useState(true);
  const [importDb, setImportDb] = useState(true);
  const [importFiles, setImportFiles] = useState(true);

  const TABS = [
    { name: "Company Profile", icon: Building },
    { name: "Departments", icon: Users },
    { name: "Designations", icon: Briefcase },
    { name: "Office Locations", icon: Building },
    { name: "Policies", icon: Umbrella },
    { name: "Investor Bond Agreement", icon: Shield },
    { name: "Email Templates", icon: Mail },
    { name: "SMS Templates", icon: MessageSquare },
    { name: "Integrations", icon: Plug },
    { name: "Access Control", icon: Shield },
    { name: "Database Backup", icon: Database }
  ];

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch("/api/settings");
        const json = await res.json();
        if (json.success) setSettings(json.data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  useEffect(() => {
    if (activeTab === "Access Control" && users.length === 0) {
      fetch("/api/users").then(res => res.json()).then(data => {
        if (data.success) setUsers(data.data);
      });
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === "Database Backup") {
      fetch("/api/settings/backup/status")
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            setBackupStats({
              collections: data.collections,
              files: data.files,
              sizeMb: data.sizeMb
            });
          }
        })
        .catch(console.error);
    }
  }, [activeTab]);

  const handleRoleChange = async (email: string, newRole: string) => {
    try {
      const res = await fetch("/api/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, role: newRole })
      });
      const data = await res.json();
      if (data.success) {
        setUsers(users.map(u => u.email === email ? { ...u, role: newRole } : u));
        alert("Role updated successfully!");
      } else {
        alert(data.error || "Failed to update role");
      }
    } catch (e) {
      alert("Error updating role");
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings)
      });
      if (res.ok) {
        alert("Settings saved successfully!");
      } else {
        alert("Failed to save settings.");
      }
    } catch (e) {
      alert("Error saving settings.");
    } finally {
      setSaving(false);
    }
  };

  const handleArrayChange = (field: string, value: string) => {
    const arr = value.split(',').map(s => s.trim()).filter(s => s);
    setSettings({ ...settings, [field]: arr });
  };

  const handleExportBackup = async () => {
    if (!exportDb && !exportFiles) {
      setBackupMsg({ type: "error", text: "Please select at least one option (Database or KYC Documents) to export" });
      return;
    }
    setBackupLoading(true);
    setBackupMsg(null);
    try {
      const res = await fetch(`/api/settings/backup?includeDb=${exportDb}&includeFiles=${exportFiles}`);
      if (!res.ok) throw new Error("Failed to export backup");
      
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const dateStr = new Date().toISOString().split("T")[0];
      a.download = `crm_backup_${dateStr}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      setBackupMsg({ type: "success", text: "Database backup downloaded successfully!" });
    } catch (e: any) {
      setBackupMsg({ type: "error", text: e.message || "Failed to download backup" });
    } finally {
      setBackupLoading(false);
    }
  };

  const handleImportBackup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!backupFile) {
      setBackupMsg({ type: "error", text: "Please select a backup file first" });
      return;
    }
    if (!importDb && !importFiles) {
      setBackupMsg({ type: "error", text: "Please select at least one option (Database or KYC Documents) to restore" });
      return;
    }
    if (restoreMode === "overwrite" && !confirmDelete) {
      setBackupMsg({ type: "error", text: "You must confirm the data overwrite checkbox" });
      return;
    }

    setBackupLoading(true);
    setBackupMsg(null);

    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const text = event.target?.result as string;
          const parsedData = JSON.parse(text);

          const res = await fetch("/api/settings/backup", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ mode: restoreMode, data: parsedData, restoreDb: importDb, restoreFiles: importFiles })
          });
          const json = await res.json();
          if (json.success) {
            setBackupMsg({ type: "success", text: "Backup restored successfully!" });
            setBackupFile(null);
            setConfirmDelete(false);
            
            // Refresh stats
            fetch("/api/settings/backup/status")
              .then(res => res.json())
              .then(data => {
                if (data.success) {
                  setBackupStats({
                    collections: data.collections,
                    files: data.files,
                    sizeMb: data.sizeMb
                  });
                }
              }).catch(console.error);
          } else {
            setBackupMsg({ type: "error", text: json.error || "Failed to restore backup" });
          }
        } catch (err: any) {
          setBackupMsg({ type: "error", text: "Invalid JSON format in backup file" });
        } finally {
          setBackupLoading(false);
        }
      };
      reader.readAsText(backupFile);
    } catch (err: any) {
      setBackupMsg({ type: "error", text: "Failed to read backup file" });
      setBackupLoading(false);
    }
  };

  if (loading) return <div className="p-8">Loading settings...</div>;
  if (!settings) return <div className="p-8 text-rose-500">Failed to load settings. Are you a KEY_ADMIN?</div>;

  return (
    <div className="space-y-6 w-full pb-24">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-200 pb-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 flex items-center">
            <Settings className="mr-3 h-8 w-8 text-zinc-400" /> Master Settings
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400">Configure global application parameters.</p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : "Save Changes"}
        </Button>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        
        {/* Sidebar Nav */}
        <div className="w-full md:w-64 shrink-0">
          <nav className="space-y-1">
            {TABS.map((tab) => (
              <button
                key={tab.name}
                onClick={() => setActiveTab(tab.name)}
                className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                  activeTab === tab.name 
                    ? "bg-indigo-50 text-indigo-700" 
                    : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
                }`}
              >
                <tab.icon className={`flex-shrink-0 -ml-1 mr-3 h-5 w-5 ${activeTab === tab.name ? "text-indigo-500" : "text-zinc-400"}`} />
                <span className="truncate">{tab.name}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Content Area */}
        <div className="flex-1">
          <Card className="shadow-sm border-zinc-200">
            <CardHeader className="bg-zinc-50/50 border-b border-zinc-100">
              <CardTitle className="text-lg">{activeTab}</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              
              {activeTab === "Company Profile" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Company Name</Label>
                      <Input value={settings.companyProfile.name} onChange={e => setSettings({...settings, companyProfile: {...settings.companyProfile, name: e.target.value}})} />
                    </div>
                    <div className="space-y-2">
                      <Label>Website</Label>
                      <Input value={settings.companyProfile.website} onChange={e => setSettings({...settings, companyProfile: {...settings.companyProfile, website: e.target.value}})} />
                    </div>
                    <div className="space-y-2">
                      <Label>Contact Email</Label>
                      <Input value={settings.companyProfile.email} onChange={e => setSettings({...settings, companyProfile: {...settings.companyProfile, email: e.target.value}})} />
                    </div>
                    <div className="space-y-2">
                      <Label>Contact Phone</Label>
                      <Input value={settings.companyProfile.phone} onChange={e => setSettings({...settings, companyProfile: {...settings.companyProfile, phone: e.target.value}})} />
                    </div>
                    <div className="space-y-2">
                      <Label>GST Number</Label>
                      <Input value={settings.companyProfile.gstNo || ""} onChange={e => setSettings({...settings, companyProfile: {...settings.companyProfile, gstNo: e.target.value}})} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>HQ Address</Label>
                    <textarea 
                      className="flex w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-[100px]"
                      value={settings.companyProfile.address} 
                      onChange={e => setSettings({...settings, companyProfile: {...settings.companyProfile, address: e.target.value}})} 
                    />
                  </div>
                </div>
              )}

              {activeTab === "Departments" && (
                <div className="space-y-4">
                  <p className="text-sm text-zinc-500 mb-4">Enter departments separated by commas.</p>
                  <div className="space-y-2">
                    <Label>Departments List</Label>
                    <textarea 
                      className="flex w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-[150px]"
                      value={settings.departments.join(", ")} 
                      onChange={e => handleArrayChange("departments", e.target.value)} 
                    />
                  </div>
                </div>
              )}

              {activeTab === "Designations" && (
                <div className="space-y-4">
                  <p className="text-sm text-zinc-500 mb-4">Enter job titles/designations separated by commas.</p>
                  <div className="space-y-2">
                    <Label>Designations List</Label>
                    <textarea 
                      className="flex w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-[150px]"
                      value={settings.designations.join(", ")} 
                      onChange={e => handleArrayChange("designations", e.target.value)} 
                    />
                  </div>
                </div>
              )}

              {activeTab === "Office Locations" && (
                <div className="space-y-4">
                  <p className="text-sm text-zinc-500 mb-4">Enter physical office locations separated by commas.</p>
                  <div className="space-y-2">
                    <Label>Locations List</Label>
                    <textarea 
                      className="flex w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-[150px]"
                      value={settings.officeLocations.join(", ")} 
                      onChange={e => handleArrayChange("officeLocations", e.target.value)} 
                    />
                  </div>
                </div>
              )}

              {activeTab === "Investor Bond Agreement" && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 border-b pb-2 mb-2">Investor Capital Bond Terms & Legal Agreement</h3>
                    <p className="text-xs text-zinc-500 mb-4">
                      Customize the legal bond terms presented to investors when signing their capital investment agreement.
                    </p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="font-bold">Bond Maturity Period (Months)</Label>
                      <select
                        className="flex h-10 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:focus:ring-zinc-300"
                        value={settings.investorMaturityPeriodMonths ?? 1}
                        onChange={e => setSettings({ ...settings, investorMaturityPeriodMonths: parseInt(e.target.value) || 1 })}
                      >
                        {[1, 3, 6, 9, 12, 18, 24, 36, 48, 60].map(m => (
                          <option key={m} value={m}>{m} {m === 1 ? 'Month' : 'Months'}</option>
                        ))}
                      </select>
                      <p className="text-xs text-zinc-500">Number of months after investment date when the bond matures. This will appear on the Payment Bond PDF.</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="font-bold">Legal Bond Agreement Text</Label>
                    <textarea 
                      className="flex w-full rounded-md border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono min-h-[260px]"
                      value={settings.investorLegalBondTemplate || ""} 
                      onChange={e => setSettings({ ...settings, investorLegalBondTemplate: e.target.value })} 
                      placeholder="Enter legal bond agreement terms..."
                    />
                  </div>
                </div>
              )}

              {activeTab === "Policies" && (
                <div className="space-y-8">
                  <div>
                    <h3 className="text-sm font-bold text-zinc-900 border-b pb-2 mb-4">Leave Policy (Annual Limits)</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label>Max Sick Leaves</Label>
                        <Input type="number" value={settings.leavePolicy.maxSickLeaves} onChange={e => setSettings({...settings, leavePolicy: {...settings.leavePolicy, maxSickLeaves: parseInt(e.target.value) || 0}})} />
                      </div>
                      <div className="space-y-2">
                        <Label>Max Casual Leaves</Label>
                        <Input type="number" value={settings.leavePolicy.maxCasualLeaves} onChange={e => setSettings({...settings, leavePolicy: {...settings.leavePolicy, maxCasualLeaves: parseInt(e.target.value) || 0}})} />
                      </div>
                      <div className="space-y-2">
                        <Label>Carry Forward Limit</Label>
                        <Input type="number" value={settings.leavePolicy.carryForwardLimit} onChange={e => setSettings({...settings, leavePolicy: {...settings.leavePolicy, carryForwardLimit: parseInt(e.target.value) || 0}})} />
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-zinc-900 border-b pb-2 mb-4">Attendance Policy</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label>Office Start Time</Label>
                        <Input type="time" value={settings.attendancePolicy.officeStartTime} onChange={e => setSettings({...settings, attendancePolicy: {...settings.attendancePolicy, officeStartTime: e.target.value}})} />
                      </div>
                      <div className="space-y-2">
                        <Label>Late Threshold (Mins)</Label>
                        <Input type="number" value={settings.attendancePolicy.lateThresholdMins} onChange={e => setSettings({...settings, attendancePolicy: {...settings.attendancePolicy, lateThresholdMins: parseInt(e.target.value) || 0}})} />
                      </div>
                      <div className="space-y-2">
                        <Label>Half Day Threshold (Mins)</Label>
                        <Input type="number" value={settings.attendancePolicy.halfDayThresholdMins} onChange={e => setSettings({...settings, attendancePolicy: {...settings.attendancePolicy, halfDayThresholdMins: parseInt(e.target.value) || 0}})} />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {(activeTab === "Email Templates" || activeTab === "SMS Templates") && (
                <div className="space-y-6">
                  <p className="text-sm text-zinc-500">Edit automated system responses. Use placeholders like {"{{employeeName}}"} where appropriate.</p>
                  
                  {activeTab === "Email Templates" ? (
                    settings.emailTemplates.map((t: any, idx: number) => (
                      <div key={idx} className="p-4 border border-zinc-200 rounded-lg space-y-3 bg-zinc-50/30">
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-sm text-indigo-700 bg-indigo-50 px-2 py-1 rounded">{t.triggerEvent}</span>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-zinc-500">Subject</Label>
                          <Input value={t.subject} onChange={e => {
                            const newTemplates = [...settings.emailTemplates];
                            newTemplates[idx].subject = e.target.value;
                            setSettings({...settings, emailTemplates: newTemplates});
                          }} />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-zinc-500">Body</Label>
                          <textarea className="flex w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm min-h-[80px]" value={t.body} onChange={e => {
                            const newTemplates = [...settings.emailTemplates];
                            newTemplates[idx].body = e.target.value;
                            setSettings({...settings, emailTemplates: newTemplates});
                          }} />
                        </div>
                      </div>
                    ))
                  ) : (
                    settings.smsTemplates.map((t: any, idx: number) => (
                      <div key={idx} className="p-4 border border-zinc-200 rounded-lg space-y-3 bg-zinc-50/30">
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-sm text-emerald-700 bg-emerald-50 px-2 py-1 rounded">{t.triggerEvent}</span>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-zinc-500">SMS Body (Keep under 160 chars)</Label>
                          <textarea className="flex w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm min-h-[80px]" value={t.body} onChange={e => {
                            const newTemplates = [...settings.smsTemplates];
                            newTemplates[idx].body = e.target.value;
                            setSettings({...settings, smsTemplates: newTemplates});
                          }} />
                        </div>
                      </div>
                    ))
                  )}

                  {(activeTab === "Email Templates" && settings.emailTemplates.length === 0) || (activeTab === "SMS Templates" && settings.smsTemplates.length === 0) ? (
                    <div className="text-sm italic text-zinc-400 p-4 text-center border border-dashed rounded-lg">No templates configured yet.</div>
                  ) : null}
                  
                </div>
              )}

              {activeTab === "Integrations" && settings.integrations && (
                <div className="space-y-8">
                  <div>
                    <h3 className="text-sm font-bold text-zinc-900 border-b pb-2 mb-4">SMTP Email Configuration</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>SMTP Host</Label>
                        <Input value={settings.integrations.smtp?.host || ""} onChange={e => setSettings({...settings, integrations: {...settings.integrations, smtp: {...settings.integrations.smtp, host: e.target.value}}})} placeholder="e.g. smtp.gmail.com" />
                      </div>
                      <div className="space-y-2">
                        <Label>SMTP Port</Label>
                        <Input value={settings.integrations.smtp?.port || ""} onChange={e => setSettings({...settings, integrations: {...settings.integrations, smtp: {...settings.integrations.smtp, port: e.target.value}}})} placeholder="e.g. 587" />
                      </div>
                      <div className="space-y-2">
                        <Label>SMTP User</Label>
                        <Input value={settings.integrations.smtp?.user || ""} onChange={e => setSettings({...settings, integrations: {...settings.integrations, smtp: {...settings.integrations.smtp, user: e.target.value}}})} />
                      </div>
                      <div className="space-y-2">
                        <Label>SMTP Password</Label>
                        <Input type="password" value={settings.integrations.smtp?.pass || ""} onChange={e => setSettings({...settings, integrations: {...settings.integrations, smtp: {...settings.integrations.smtp, pass: e.target.value}}})} />
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <Label>From Address</Label>
                        <Input value={settings.integrations.smtp?.from || ""} onChange={e => setSettings({...settings, integrations: {...settings.integrations, smtp: {...settings.integrations.smtp, from: e.target.value}}})} placeholder='e.g. "HR Team" <hr@company.com>' />
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-zinc-900 border-b pb-2 mb-4">Payment Gateway (Razorpay/Cashfree)</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Account Number</Label>
                        <Input value={settings.integrations.paymentGateway?.razorpayAccountNumber || ""} onChange={e => setSettings({...settings, integrations: {...settings.integrations, paymentGateway: {...settings.integrations.paymentGateway, razorpayAccountNumber: e.target.value}}})} />
                      </div>
                      <div className="space-y-2">
                        <Label>Key ID</Label>
                        <Input value={settings.integrations.paymentGateway?.razorpayKeyId || ""} onChange={e => setSettings({...settings, integrations: {...settings.integrations, paymentGateway: {...settings.integrations.paymentGateway, razorpayKeyId: e.target.value}}})} />
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <Label>Key Secret</Label>
                        <Input type="password" value={settings.integrations.paymentGateway?.razorpayKeySecret || ""} onChange={e => setSettings({...settings, integrations: {...settings.integrations, paymentGateway: {...settings.integrations.paymentGateway, razorpayKeySecret: e.target.value}}})} />
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-zinc-900 border-b pb-2 mb-4">SMS Gateway (Twilio / MSG91)</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Twilio Account SID</Label>
                        <Input value={settings.integrations.smsGateway?.twilioAccountSid || ""} onChange={e => setSettings({...settings, integrations: {...settings.integrations, smsGateway: {...settings.integrations.smsGateway, twilioAccountSid: e.target.value}}})} />
                      </div>
                      <div className="space-y-2">
                        <Label>Twilio Auth Token</Label>
                        <Input type="password" value={settings.integrations.smsGateway?.twilioAuthToken || ""} onChange={e => setSettings({...settings, integrations: {...settings.integrations, smsGateway: {...settings.integrations.smsGateway, twilioAuthToken: e.target.value}}})} />
                      </div>
                      <div className="space-y-2">
                        <Label>Twilio Phone Number</Label>
                        <Input value={settings.integrations.smsGateway?.twilioPhoneNumber || ""} onChange={e => setSettings({...settings, integrations: {...settings.integrations, smsGateway: {...settings.integrations.smsGateway, twilioPhoneNumber: e.target.value}}})} />
                      </div>
                      <div className="space-y-2">
                        <Label>Twilio Verify Service SID</Label>
                        <Input placeholder="VAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" value={(settings.integrations.smsGateway as any)?.twilioVerifyServiceSid || ""} onChange={e => setSettings({...settings, integrations: {...settings.integrations, smsGateway: {...settings.integrations.smsGateway, twilioVerifyServiceSid: e.target.value} as any}})} />
                        <p className="text-xs text-zinc-400">Required for Twilio Verify OTP (recommended over standard SMS)</p>
                      </div>
                      
                      <div className="space-y-2 md:col-span-2 border-t pt-4 mt-2">
                        <Label>MSG91 Auth Key</Label>
                        <Input type="password" value={settings.integrations.smsGateway?.msg91AuthKey || ""} onChange={e => setSettings({...settings, integrations: {...settings.integrations, smsGateway: {...settings.integrations.smsGateway, msg91AuthKey: e.target.value}}})} />
                      </div>
                      <div className="space-y-2">
                        <Label>MSG91 Sender ID</Label>
                        <Input value={settings.integrations.smsGateway?.msg91SenderId || ""} onChange={e => setSettings({...settings, integrations: {...settings.integrations, smsGateway: {...settings.integrations.smsGateway, msg91SenderId: e.target.value}}})} />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "Access Control" && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center mb-4">
                    <div>
                      <h3 className="text-sm font-bold text-zinc-900">Admin Roles & Permissions</h3>
                      <p className="text-sm text-zinc-500">Assign the ADMIN or KEY_ADMIN role to employees to give them access to Settings.</p>
                    </div>
                  </div>
                  
                  <div className="border border-zinc-200 rounded-lg overflow-hidden">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-zinc-50 text-zinc-500 font-medium border-b border-zinc-200">
                        <tr>
                          <th className="px-4 py-3">Email</th>
                          <th className="px-4 py-3">Current Role</th>
                          <th className="px-4 py-3">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-200">
                        {users.map(u => (
                          <tr key={u.email} className="bg-white hover:bg-zinc-50">
                            <td className="px-4 py-3 font-medium text-zinc-900">{u.email}</td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-1 rounded text-xs font-medium ${
                                u.role === "KEY_ADMIN" ? "bg-purple-100 text-purple-700" :
                                u.role === "ADMIN" ? "bg-indigo-100 text-indigo-700" :
                                "bg-zinc-100 text-zinc-700"
                              }`}>
                                {u.role}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <select 
                                className="block w-full text-sm border-zinc-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 bg-white px-3 py-1.5"
                                value={u.role}
                                onChange={(e) => handleRoleChange(u.email, e.target.value)}
                              >
                                <option value="Employee">Employee</option>
                                <option value="ADMIN">ADMIN (Gets Settings Access)</option>
                                <option value="KEY_ADMIN">KEY_ADMIN</option>
                              </select>
                            </td>
                          </tr>
                        ))}
                        {users.length === 0 && (
                          <tr>
                            <td colSpan={3} className="px-4 py-8 text-center text-zinc-500">Loading users...</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {activeTab === "Database Backup" && (
                <div className="space-y-8">
                  {backupMsg && (
                    <div className={`p-4 rounded-lg border text-sm font-bold flex items-center gap-2 ${
                      backupMsg.type === "success" 
                        ? "bg-emerald-50 border-emerald-200 text-emerald-800" 
                        : "bg-rose-50 border-rose-200 text-rose-800"
                    }`}>
                      {backupMsg.type === "success" ? "✔" : "⚠"} {backupMsg.text}
                    </div>
                  )}

                  {/* Status & Stats Panel */}
                  {backupStats && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="p-4 border rounded-xl bg-white dark:bg-zinc-950 dark:border-zinc-800 shadow-sm">
                        <p className="text-[10px] uppercase font-black text-zinc-400 tracking-wider">Database Tables</p>
                        <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1">{backupStats.collections} collections</p>
                      </div>
                      <div className="p-4 border rounded-xl bg-white dark:bg-zinc-950 dark:border-zinc-800 shadow-sm">
                        <p className="text-[10px] uppercase font-black text-zinc-400 tracking-wider">KYC & Document Uploads</p>
                        <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{backupStats.files} files</p>
                      </div>
                      <div className="p-4 border rounded-xl bg-white dark:bg-zinc-950 dark:border-zinc-800 shadow-sm">
                        <p className="text-[10px] uppercase font-black text-zinc-400 tracking-wider">Files Storage Size</p>
                        <p className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">{backupStats.sizeMb} MB</p>
                      </div>
                    </div>
                  )}

                  {/* Export Card */}
                  <div className="p-5 border rounded-xl bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800">
                    <h3 className="text-base font-bold text-zinc-950 dark:text-zinc-50 flex items-center gap-2 mb-2">
                      <Download className="w-5 h-5 text-indigo-600" /> Export CRM Data
                    </h3>
                    <p className="text-xs text-zinc-500 mb-4">
                      Choose which components to package into your JSON backup file.
                    </p>
                    
                    <div className="space-y-3 mb-4 bg-white dark:bg-zinc-950 p-4 rounded-lg border border-zinc-150 dark:border-zinc-850">
                      <label className="flex items-center gap-3 text-xs font-bold text-zinc-700 dark:text-zinc-300 cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={exportDb} 
                          onChange={(e) => setExportDb(e.target.checked)}
                          className="rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500" 
                        />
                        Include Database Tables ({backupStats?.collections || 0} collections)
                      </label>
                      <label className="flex items-center gap-3 text-xs font-bold text-zinc-700 dark:text-zinc-300 cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={exportFiles} 
                          onChange={(e) => setExportFiles(e.target.checked)}
                          className="rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500" 
                        />
                        Include KYC & Document Uploads ({backupStats?.files || 0} files - {backupStats?.sizeMb || "0"} MB)
                      </label>
                    </div>

                    <Button 
                      onClick={handleExportBackup} 
                      disabled={backupLoading || (!exportDb && !exportFiles)}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
                    >
                      {backupLoading ? "Generating..." : "Download Backup (.json)"}
                    </Button>
                  </div>

                  {/* Import Card */}
                  <div className="p-5 border rounded-xl bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800">
                    <h3 className="text-base font-bold text-zinc-950 dark:text-zinc-50 flex items-center gap-2 mb-2">
                      <Upload className="w-5 h-5 text-amber-600" /> Import & Restore Backup
                    </h3>
                    <p className="text-xs text-zinc-500 mb-4">
                      Upload a previously exported JSON backup and select which components to restore.
                    </p>

                    <form onSubmit={handleImportBackup} className="space-y-4">
                      <div className="space-y-2">
                        <Label>Select Backup File (.json)</Label>
                        <Input 
                          type="file" 
                          accept=".json"
                          required
                          onChange={(e) => setBackupFile(e.target.files?.[0] || null)}
                          className="bg-white border-zinc-300 dark:border-zinc-700 cursor-pointer"
                        />
                      </div>

                      <div className="space-y-3 bg-white dark:bg-zinc-950 p-4 rounded-lg border border-zinc-150 dark:border-zinc-850">
                        <Label className="text-xs font-black text-zinc-500 mb-1 block">SELECT COMPONENTS TO IMPORT</Label>
                        <label className="flex items-center gap-3 text-xs font-bold text-zinc-700 dark:text-zinc-300 cursor-pointer">
                          <input 
                            type="checkbox" 
                            checked={importDb} 
                            onChange={(e) => setImportDb(e.target.checked)}
                            className="rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500" 
                          />
                          Restore Database Tables
                        </label>
                        <label className="flex items-center gap-3 text-xs font-bold text-zinc-700 dark:text-zinc-300 cursor-pointer">
                          <input 
                            type="checkbox" 
                            checked={importFiles} 
                            onChange={(e) => setImportFiles(e.target.checked)}
                            className="rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500" 
                          />
                          Restore KYC & Document Uploads
                        </label>
                      </div>

                      <div className="space-y-2">
                        <Label>Restore Mode</Label>
                        <select 
                          value={restoreMode}
                          onChange={(e) => setRestoreMode(e.target.value as any)}
                          className="block w-full text-sm border border-zinc-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 bg-white px-3 py-2 dark:bg-zinc-950 dark:border-zinc-800"
                        >
                          <option value="merge">Merge / Append Data (safely adds records/files without deleting current ones)</option>
                          <option value="overwrite">Full Restore (wipes existing database tables and files first - DANGER)</option>
                        </select>
                      </div>

                      {restoreMode === "overwrite" && (
                        <div className="p-4 border border-rose-350 bg-rose-50/50 rounded-lg flex gap-3 text-rose-900 items-start">
                          <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                          <div className="space-y-2 text-xs">
                            <p className="font-extrabold">Warning: Destructive Action</p>
                            <p>This action will completely erase selected components (database collections and/or uploaded files). Make sure you have a safe copy of your data before proceeding.</p>
                            <label className="flex items-center gap-2 font-bold cursor-pointer mt-1">
                              <input 
                                type="checkbox" 
                                checked={confirmDelete}
                                onChange={(e) => setConfirmDelete(e.target.checked)}
                                className="rounded border-rose-300 text-rose-600 focus:ring-rose-500"
                              />
                              I understand this will overwrite current database records/files
                            </label>
                          </div>
                        </div>
                      )}

                      <Button 
                        type="submit" 
                        disabled={backupLoading || !backupFile || (!importDb && !importFiles) || (restoreMode === "overwrite" && !confirmDelete)}
                        className={`font-bold ${
                          restoreMode === "overwrite" 
                            ? "bg-rose-600 hover:bg-rose-700 text-white" 
                            : "bg-indigo-600 hover:bg-indigo-700 text-white"
                        }`}
                      >
                        {backupLoading ? "Restoring..." : "Run Database Import"}
                      </Button>
                    </form>
                  </div>
                </div>
              )}

            </CardContent>
          </Card>
        </div>
      </div>

    </div>
  );
}
