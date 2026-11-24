"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Building, Users, Briefcase, Clock, Umbrella, Mail, MessageSquare, Shield, Settings, Plug, Database, Download, Upload, AlertTriangle, Smartphone } from "lucide-react";
import { APP_HOME_ICONS, DEFAULT_APP_HOME_CONTENT, resolveAppHomeContent } from "@/lib/appHomeContent";

const RichEditor = ({ defaultValue, onChange }: { defaultValue: string, onChange: (v: string) => void }) => {
  return (
    <div className="border border-zinc-300 rounded-md focus-within:ring-2 focus-within:ring-emerald-500 overflow-hidden bg-white">
      <div className="bg-zinc-50 border-b border-zinc-200 px-2 py-1 text-xs text-zinc-500 flex gap-2 font-medium">
        <span>Visual Editor</span>
        <span className="text-zinc-400">|</span>
        <span>Supports standard keyboard shortcuts (Ctrl+B, Ctrl+I)</span>
      </div>
      <div
        className="w-full text-sm p-4 min-h-[200px] max-h-[400px] overflow-y-auto focus:outline-none prose prose-sm max-w-none"
        contentEditable
        suppressContentEditableWarning
        dangerouslySetInnerHTML={{ __html: defaultValue }}
        onBlur={(e) => onChange(e.currentTarget.innerHTML)}
      />
    </div>
  );
};

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
  const [exportLoading, setExportLoading] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [backupMsg, setBackupMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [backupStats, setBackupStats] = useState<{ collections: number; files: number; sizeMb: string } | null>(null);

  // Selection checkboxes
  const [exportDb, setExportDb] = useState(true);
  const [exportFiles, setExportFiles] = useState(true);
  const [importDb, setImportDb] = useState(true);
  const [importFiles, setImportFiles] = useState(true);

  const TABS = [
    { name: "Company Profile", icon: Building },
    { name: "Mobile App Home", icon: Smartphone },
    { name: "Invoice Bank Accounts", icon: Building },
    { name: "Departments", icon: Users },
    { name: "Designations", icon: Briefcase },
    { name: "Office Locations", icon: Building },
    { name: "Policies", icon: Umbrella },
    { name: "Investor Bond Agreement", icon: Shield },
    { name: "Letter Templates", icon: Mail },
    { name: "Email Templates", icon: Mail },
    { name: "SMS Templates", icon: MessageSquare },
    { name: "Integrations", icon: Plug },
    { name: "Access Control", icon: Shield },
    { name: "Database Backup", icon: Database }
  ];

  // Tabs visible only to KEY_ADMIN (hidden for ADMIN and regular users)
  const KEY_ADMIN_ONLY_TABS = ["Email Templates", "SMS Templates", "Integrations", "Access Control", "Database Backup"];
  const [role, setRole] = useState("");
  const isKeyAdmin = role === "KEY_ADMIN" || role === "KEYADMIN";
  const visibleTabs = TABS.filter(tab => isKeyAdmin || !KEY_ADMIN_ONLY_TABS.includes(tab.name));

  useEffect(() => {
    fetch("/api/auth/me")
      .then(res => res.json())
      .then(data => { if (data.success) setRole(data.role || ""); })
      .catch(console.error);
  }, []);

  // If a restricted tab is active and the user isn't KEY_ADMIN, fall back to the first tab
  useEffect(() => {
    if (!isKeyAdmin && KEY_ADMIN_ONLY_TABS.includes(activeTab)) {
      setActiveTab("Company Profile");
    }
  }, [isKeyAdmin, activeTab]);

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
    if (activeTab === "Access Control" && isKeyAdmin && users.length === 0) {
      fetch("/api/users").then(res => res.json()).then(data => {
        if (data.success) setUsers(data.data);
      });
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === "Database Backup" && isKeyAdmin) {
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
        const json = await res.json().catch(() => ({}));
        alert(json.error || "Failed to save settings.");
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
    setExportLoading(true);
    setBackupMsg(null);
    try {
      window.location.href = `/api/settings/backup?includeDb=${exportDb}&includeFiles=${exportFiles}`;

      setTimeout(() => {
        setExportLoading(false);
        setBackupMsg({ type: "success", text: "Database backup download started!" });
      }, 1500);
    } catch (e: any) {
      setBackupMsg({ type: "error", text: e.message || "Failed to download backup" });
      setExportLoading(false);
    }
  };

  const handleSendBackupEmail = async () => {
    if (!settings?.backupConfig?.email) {
      setBackupMsg({ type: "error", text: "Enter the recipient email and click Save Changes first." });
      return;
    }
    setSendingEmail(true);
    setBackupMsg(null);
    try {
      const res = await fetch("/api/settings/backup/send", { method: "POST" });
      const json = await res.json();
      if (res.ok && json.success) {
        setBackupMsg({ type: "success", text: json.message || "Backup generated and emailed successfully!" });
      } else {
        setBackupMsg({ type: "error", text: json.error || "Failed to send backup email" });
      }
    } catch (e: any) {
      setBackupMsg({ type: "error", text: "Network error while sending email" });
    } finally {
      setSendingEmail(false);
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

    setImportLoading(true);
    setBackupMsg(null);

    try {
      const arrayBuffer = await backupFile.arrayBuffer();
      const res = await fetch(`/api/settings/backup/import?mode=${restoreMode}&restoreDb=${importDb}&restoreFiles=${importFiles}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/octet-stream"
        },
        body: arrayBuffer
      });

      const json = await res.json();
      if (res.ok && json.success) {
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
      setBackupMsg({ type: "error", text: err.message || "Failed to restore backup" });
    } finally {
      setImportLoading(false);
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
            {visibleTabs.map((tab) => (
              <button
                key={tab.name}
                onClick={() => setActiveTab(tab.name)}
                className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md ${activeTab === tab.name
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
                  <div className="rounded-lg border border-indigo-100 bg-indigo-50/50 p-4">
                    <h3 className="font-semibold text-zinc-900">Payroll Visibility</h3>
                    <label className="mt-3 flex items-start gap-3 text-sm text-zinc-700">
                      <input
                        type="checkbox"
                        className="mt-1 rounded border-zinc-300"
                        checked={settings.payrollVisibility?.employeeCanViewSalarySlip ?? true}
                        onChange={e => setSettings({
                          ...settings,
                          payrollVisibility: {
                            ...settings.payrollVisibility,
                            employeeCanViewSalarySlip: e.target.checked,
                          },
                        })}
                      />
                      <span>
                        Show Salary History in the employee dashboard (including view and download).
                        <span className="block text-xs text-zinc-500">Admin and Key Admin users can always access salary slips.</span>
                      </span>
                    </label>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Company Name</Label>
                      <Input value={settings.companyProfile.name} onChange={e => setSettings({ ...settings, companyProfile: { ...settings.companyProfile, name: e.target.value } })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Website</Label>
                      <Input value={settings.companyProfile.website} onChange={e => setSettings({ ...settings, companyProfile: { ...settings.companyProfile, website: e.target.value } })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Contact Email</Label>
                      <Input value={settings.companyProfile.email} onChange={e => setSettings({ ...settings, companyProfile: { ...settings.companyProfile, email: e.target.value } })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Contact Phone</Label>
                      <Input value={settings.companyProfile.phone} onChange={e => setSettings({ ...settings, companyProfile: { ...settings.companyProfile, phone: e.target.value } })} />
                    </div>
                    <div className="space-y-2">
                      <Label>GST Number</Label>
                      <Input value={settings.companyProfile.gstNo || ""} onChange={e => setSettings({ ...settings, companyProfile: { ...settings.companyProfile, gstNo: e.target.value } })} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>HQ Address</Label>
                    <textarea
                      className="flex w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-[100px]"
                      value={settings.companyProfile.address}
                      onChange={e => setSettings({ ...settings, companyProfile: { ...settings.companyProfile, address: e.target.value } })}
                    />
                  </div>
                </div>
              )}

              {activeTab === "Mobile App Home" && (() => {
                const home = resolveAppHomeContent(settings.appHomeContent);
                const setHome = (patch: Partial<typeof home>) =>
                  setSettings({ ...settings, appHomeContent: { ...home, ...patch } });
                const taClass = "flex w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500";
                const updateSection = (si: number, patch: any) =>
                  setHome({ sections: home.sections.map((s, i) => (i === si ? { ...s, ...patch } : s)) });
                const updateCard = (si: number, ci: number, patch: any) =>
                  updateSection(si, { cards: home.sections[si].cards.map((c, i) => (i === ci ? { ...c, ...patch } : c)) });

                return (
                  <div className="space-y-8">
                    <p className="text-sm text-zinc-500">
                      This content appears on the mobile app&apos;s first screen, before login. Contact details (address, email, phone) come from the Company Profile tab. Click <strong>Save Changes</strong>; the app shows updates the next time it opens.
                    </p>

                    <section className="space-y-4">
                      <h3 className="font-semibold text-zinc-900">Hero</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2"><Label>Badge</Label><Input value={home.heroBadge} onChange={e => setHome({ heroBadge: e.target.value })} /></div>
                        <div className="space-y-2"><Label>Tagline</Label><Input value={home.heroTagline} onChange={e => setHome({ heroTagline: e.target.value })} /></div>
                        <div className="space-y-2"><Label>Title</Label><Input value={home.heroTitle} onChange={e => setHome({ heroTitle: e.target.value })} /></div>
                        <div className="space-y-2"><Label>Subtitle</Label><Input value={home.heroSubtitle} onChange={e => setHome({ heroSubtitle: e.target.value })} /></div>
                      </div>
                      <div className="space-y-2">
                        <Label>Description</Label>
                        <textarea className={`${taClass} min-h-[80px]`} value={home.heroDescription} onChange={e => setHome({ heroDescription: e.target.value })} />
                      </div>
                    </section>

                    <section className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-zinc-900">Highlight stats</h3>
                        <Button variant="outline" size="sm" onClick={() => setHome({ highlights: [...home.highlights, { value: "", label: "" }] })}>+ Add stat</Button>
                      </div>
                      {home.highlights.map((h, i) => (
                        <div key={i} className="flex gap-2 items-center">
                          <Input className="w-36" placeholder="11.5%" value={h.value} onChange={e => setHome({ highlights: home.highlights.map((x, j) => j === i ? { ...x, value: e.target.value } : x) })} />
                          <Input placeholder="NCD yield p.a." value={h.label} onChange={e => setHome({ highlights: home.highlights.map((x, j) => j === i ? { ...x, label: e.target.value } : x) })} />
                          <Button variant="outline" size="sm" onClick={() => setHome({ highlights: home.highlights.filter((_, j) => j !== i) })}>Remove</Button>
                        </div>
                      ))}
                    </section>

                    <section className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-zinc-900">Tabs &amp; cards</h3>
                        <Button variant="outline" size="sm" onClick={() => setHome({ sections: [...home.sections, { title: "New tab", cards: [] }] })}>+ Add tab</Button>
                      </div>
                      {home.sections.map((section, si) => (
                        <div key={si} className="rounded-lg border border-zinc-200 p-4 space-y-3">
                          <div className="flex gap-2 items-center">
                            <Label className="shrink-0">Tab name</Label>
                            <Input value={section.title} onChange={e => updateSection(si, { title: e.target.value })} />
                            <Button variant="outline" size="sm" onClick={() => setHome({ sections: home.sections.filter((_, j) => j !== si) })}>Delete tab</Button>
                          </div>
                          {section.cards.map((card, ci) => (
                            <div key={ci} className="rounded-md bg-zinc-50 border border-zinc-100 p-3 space-y-2">
                              <div className="flex gap-2 items-center">
                                <select
                                  className="h-9 rounded-md border border-zinc-300 bg-white px-2 text-sm"
                                  value={card.icon}
                                  onChange={e => updateCard(si, ci, { icon: e.target.value })}
                                >
                                  {APP_HOME_ICONS.map(ic => <option key={ic} value={ic}>{ic}</option>)}
                                </select>
                                <Input placeholder="Card title" value={card.title} onChange={e => updateCard(si, ci, { title: e.target.value })} />
                                <Button variant="outline" size="sm" onClick={() => updateSection(si, { cards: section.cards.filter((_, j) => j !== ci) })}>Remove</Button>
                              </div>
                              <textarea className={`${taClass} min-h-[60px]`} placeholder="Card description" value={card.description} onChange={e => updateCard(si, ci, { description: e.target.value })} />
                            </div>
                          ))}
                          <Button variant="outline" size="sm" onClick={() => updateSection(si, { cards: [...section.cards, { icon: "building", title: "", description: "" }] })}>+ Add card</Button>
                        </div>
                      ))}
                    </section>

                    <section className="space-y-4">
                      <h3 className="font-semibold text-zinc-900">Links &amp; footer</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2"><Label>Book consultation URL</Label><Input value={home.consultUrl} onChange={e => setHome({ consultUrl: e.target.value })} /></div>
                        <div className="space-y-2"><Label>Talk to expert URL</Label><Input value={home.contactUrl} onChange={e => setHome({ contactUrl: e.target.value })} /></div>
                        <div className="space-y-2"><Label>Company profile PDF URL</Label><Input placeholder="https://.../profile.pdf" value={home.profilePdfUrl} onChange={e => setHome({ profilePdfUrl: e.target.value })} /></div>
                        <div className="space-y-2"><Label>Footer note</Label><Input value={home.footerNote} onChange={e => setHome({ footerNote: e.target.value })} /></div>
                      </div>
                    </section>

                    <div>
                      <Button variant="outline" size="sm" onClick={() => { if (confirm("Reset the mobile home page to the default content?")) setHome(DEFAULT_APP_HOME_CONTENT); }}>
                        Reset to default content
                      </Button>
                    </div>
                  </div>
                );
              })()}

              {activeTab === "Invoice Bank Accounts" && (
                <div className="space-y-5">
                  <div>
                    <h3 className="font-semibold text-zinc-900">Invoice Bank Transfer Details</h3>
                    <p className="mt-1 text-sm text-zinc-500">Add the company bank accounts available when creating an invoice. The selected account is printed in Bank Transfer Details.</p>
                  </div>
                  <div className="space-y-4">
                    {(settings.invoiceBankAccounts || []).map((account: any, index: number) => (
                      <div key={account.id || index} className="rounded-lg border border-zinc-200 p-4">
                        <div className="mb-3 flex items-center justify-between">
                          <p className="font-medium text-zinc-800">Bank Account {index + 1}</p>
                          <Button
                            type="button"
                            variant="outline"
                            className="h-8 border-rose-200 text-xs text-rose-600 hover:bg-rose-50"
                            onClick={() => setSettings({ ...settings, invoiceBankAccounts: settings.invoiceBankAccounts.filter((_: any, itemIndex: number) => itemIndex !== index) })}
                          >
                            Remove
                          </Button>
                        </div>
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                          {[
                            ["Bank Name", "bankName"], ["A/c Name", "accountName"], ["A/C Number", "accountNumber"], ["IFSC Code", "ifscCode"], ["Branch", "branch"],
                          ].map(([label, field]) => (
                            <div className={field === "branch" ? "md:col-span-2" : ""} key={field}>
                              <Label>{label}</Label>
                              <Input
                                value={account[field] || ""}
                                onChange={e => setSettings({
                                  ...settings,
                                  invoiceBankAccounts: settings.invoiceBankAccounts.map((item: any, itemIndex: number) => itemIndex === index ? { ...item, [field]: e.target.value } : item),
                                })}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setSettings({
                      ...settings,
                      invoiceBankAccounts: [...(settings.invoiceBankAccounts || []), {
                        id: `bank-${Date.now()}`,
                        bankName: "",
                        accountName: "",
                        accountNumber: "",
                        ifscCode: "",
                        branch: "",
                      }],
                    })}
                  >
                    Add Bank Account
                  </Button>
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
                <div className="space-y-6">
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

                  <div>
                    <h3 className="text-sm font-bold text-zinc-900 border-b pb-2 mb-4">Attendance Geofencing (Primary Office)</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label>Office Latitude</Label>
                        <Input type="number" step="any" value={settings.attendancePolicy?.latitude || 0} onChange={e => setSettings({ ...settings, attendancePolicy: { ...settings.attendancePolicy, latitude: parseFloat(e.target.value) || 0 } })} />
                      </div>
                      <div className="space-y-2">
                        <Label>Office Longitude</Label>
                        <Input type="number" step="any" value={settings.attendancePolicy?.longitude || 0} onChange={e => setSettings({ ...settings, attendancePolicy: { ...settings.attendancePolicy, longitude: parseFloat(e.target.value) || 0 } })} />
                      </div>
                      <div className="space-y-2">
                        <Label>Allowed Radius (Meters)</Label>
                        <Input type="number" value={settings.attendancePolicy?.radiusMeters || 100} onChange={e => setSettings({ ...settings, attendancePolicy: { ...settings.attendancePolicy, radiusMeters: parseInt(e.target.value) || 0 } })} />
                      </div>
                    </div>
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
                      <Label className="font-bold text-zinc-500">Bond Maturity Configuration</Label>
                      <p className="text-sm text-zinc-500">Bond start and maturity dates are now explicitly set per investor in the Investor form.</p>
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
                        <Input type="number" value={settings.leavePolicy.maxSickLeaves} onChange={e => setSettings({ ...settings, leavePolicy: { ...settings.leavePolicy, maxSickLeaves: parseInt(e.target.value) || 0 } })} />
                      </div>
                      <div className="space-y-2">
                        <Label>Max Casual Leaves</Label>
                        <Input type="number" value={settings.leavePolicy.maxCasualLeaves} onChange={e => setSettings({ ...settings, leavePolicy: { ...settings.leavePolicy, maxCasualLeaves: parseInt(e.target.value) || 0 } })} />
                      </div>
                      <div className="space-y-2">
                        <Label>Carry Forward Limit</Label>
                        <Input type="number" value={settings.leavePolicy.carryForwardLimit} onChange={e => setSettings({ ...settings, leavePolicy: { ...settings.leavePolicy, carryForwardLimit: parseInt(e.target.value) || 0 } })} />
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-zinc-900 border-b pb-2 mb-4">Attendance Policy</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label>Office Start Time</Label>
                        <Input type="time" value={settings.attendancePolicy?.officeStartTime || "10:00"} onChange={e => setSettings({ ...settings, attendancePolicy: { ...settings.attendancePolicy, officeStartTime: e.target.value } })} />
                      </div>
                      <div className="space-y-2">
                        <Label>Office End Time</Label>
                        <Input type="time" value={settings.attendancePolicy?.officeEndTime || "18:00"} onChange={e => setSettings({ ...settings, attendancePolicy: { ...settings.attendancePolicy, officeEndTime: e.target.value } })} />
                      </div>
                      <div className="space-y-2">
                        <Label>Late Threshold (Mins)</Label>
                        <Input type="number" value={settings.attendancePolicy?.lateThresholdMins || 15} onChange={e => setSettings({ ...settings, attendancePolicy: { ...settings.attendancePolicy, lateThresholdMins: parseInt(e.target.value) || 0 } })} />
                      </div>
                      <div className="space-y-2">
                        <Label>Early Leave Threshold (Mins)</Label>
                        <Input type="number" value={settings.attendancePolicy?.earlyLeaveThresholdMins || 15} onChange={e => setSettings({ ...settings, attendancePolicy: { ...settings.attendancePolicy, earlyLeaveThresholdMins: parseInt(e.target.value) || 0 } })} />
                      </div>
                      <div className="space-y-2">
                        <Label>Half Day Threshold (Mins)</Label>
                        <Input type="number" value={settings.attendancePolicy?.halfDayThresholdMins || 240} onChange={e => setSettings({ ...settings, attendancePolicy: { ...settings.attendancePolicy, halfDayThresholdMins: parseInt(e.target.value) || 0 } })} />
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
                            setSettings({ ...settings, emailTemplates: newTemplates });
                          }} />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-zinc-500">Body</Label>
                          <textarea className="flex w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm min-h-[80px]" value={t.body} onChange={e => {
                            const newTemplates = [...settings.emailTemplates];
                            newTemplates[idx].body = e.target.value;
                            setSettings({ ...settings, emailTemplates: newTemplates });
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
                            setSettings({ ...settings, smsTemplates: newTemplates });
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
                        <Input value={settings.integrations.smtp?.host || ""} onChange={e => setSettings({ ...settings, integrations: { ...settings.integrations, smtp: { ...settings.integrations.smtp, host: e.target.value } } })} placeholder="e.g. smtp.gmail.com" />
                      </div>
                      <div className="space-y-2">
                        <Label>SMTP Port</Label>
                        <Input value={settings.integrations.smtp?.port || ""} onChange={e => setSettings({ ...settings, integrations: { ...settings.integrations, smtp: { ...settings.integrations.smtp, port: e.target.value } } })} placeholder="e.g. 587" />
                      </div>
                      <div className="space-y-2">
                        <Label>SMTP User</Label>
                        <Input value={settings.integrations.smtp?.user || ""} onChange={e => setSettings({ ...settings, integrations: { ...settings.integrations, smtp: { ...settings.integrations.smtp, user: e.target.value } } })} />
                      </div>
                      <div className="space-y-2">
                        <Label>SMTP Password</Label>
                        <Input type="password" value={settings.integrations.smtp?.pass || ""} onChange={e => setSettings({ ...settings, integrations: { ...settings.integrations, smtp: { ...settings.integrations.smtp, pass: e.target.value } } })} />
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <Label>From Address</Label>
                        <Input value={settings.integrations.smtp?.from || ""} onChange={e => setSettings({ ...settings, integrations: { ...settings.integrations, smtp: { ...settings.integrations.smtp, from: e.target.value } } })} placeholder='e.g. "HR Team" <hr@company.com>' />
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-zinc-900 border-b pb-2 mb-4">Payment Gateway (Razorpay) – Investment Payments</h3>
                    {(() => {
                      const pg = settings.integrations.paymentGateway || {};
                      const setPg = (patch: any) => setSettings({ ...settings, integrations: { ...settings.integrations, paymentGateway: { ...pg, ...patch } } });
                      const keyId = String(pg.razorpayKeyId || "");
                      const webhookUrl = typeof window !== "undefined" ? `${window.location.origin}/api/payments/razorpay/webhook` : "/api/payments/razorpay/webhook";
                      return (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <label className="md:col-span-2 flex items-center gap-2 text-sm font-semibold">
                            <input type="checkbox" checked={!!pg.enabled} onChange={e => setPg({ enabled: e.target.checked })} />
                            Enable investment payments (investor dashboard &amp; after Debenture Application)
                          </label>
                          <label className="flex items-center gap-2 text-sm">
                            <input type="checkbox" checked={pg.allowOnline !== false} onChange={e => setPg({ allowOnline: e.target.checked })} />
                            Allow online payment (Razorpay: UPI / card / net-banking)
                          </label>
                          <label className="flex items-center gap-2 text-sm">
                            <input type="checkbox" checked={pg.allowManual !== false} onChange={e => setPg({ allowManual: e.target.checked })} />
                            Allow bank transfer with Transaction / UTR No. + screenshot
                          </label>
                          <div className="space-y-2">
                            <Label>Key ID</Label>
                            <Input value={keyId} onChange={e => setPg({ razorpayKeyId: e.target.value.trim() })} placeholder="rzp_test_… or rzp_live_…" />
                            {keyId && (
                              <p className={`text-xs font-semibold ${keyId.startsWith("rzp_live_") ? "text-emerald-600" : "text-amber-600"}`}>
                                {keyId.startsWith("rzp_live_") ? "LIVE mode – real payments" : "TEST mode – no real money"}
                              </p>
                            )}
                          </div>
                          <div className="space-y-2">
                            <Label>Key Secret</Label>
                            <Input type="password" autoComplete="off" value={pg.razorpayKeySecret || ""} onChange={e => setPg({ razorpayKeySecret: e.target.value.trim() })} />
                          </div>
                          <div className="space-y-2">
                            <Label>Webhook Secret</Label>
                            <Input type="password" autoComplete="off" value={pg.razorpayWebhookSecret || ""} onChange={e => setPg({ razorpayWebhookSecret: e.target.value.trim() })} placeholder="Set the same secret in Razorpay → Webhooks" />
                          </div>
                          <div className="space-y-2">
                            <Label>Account Number (optional)</Label>
                            <Input value={pg.razorpayAccountNumber || ""} onChange={e => setPg({ razorpayAccountNumber: e.target.value })} />
                          </div>
                          <div className="md:col-span-2 rounded-md border border-zinc-200 bg-zinc-50 p-3 text-xs text-zinc-600 space-y-1">
                            <p><b>Razorpay webhook URL:</b> <span className="font-mono">{webhookUrl}</span></p>
                            <p>In Razorpay Dashboard → Settings → Webhooks, add this URL with events <b>payment.captured</b>, <b>payment.failed</b> and <b>order.paid</b>, using the Webhook Secret above.</p>
                          </div>
                          {pg.enabled && pg.allowOnline !== false && (!keyId || !pg.razorpayKeySecret) && (
                            <p className="md:col-span-2 text-xs font-semibold text-rose-600">Online payment needs both Key ID and Key Secret.</p>
                          )}
                          {pg.enabled && pg.allowOnline !== false && keyId && !pg.razorpayWebhookSecret && (
                            <p className="md:col-span-2 text-xs font-semibold text-amber-600">Recommended: add a Webhook Secret so payments are recorded even if the investor closes the browser.</p>
                          )}
                        </div>
                      );
                    })()}
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-zinc-900 border-b pb-2 mb-4">SMS Gateway (Twilio / MSG91)</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Twilio Account SID</Label>
                        <Input value={settings.integrations.smsGateway?.twilioAccountSid || ""} onChange={e => setSettings({ ...settings, integrations: { ...settings.integrations, smsGateway: { ...settings.integrations.smsGateway, twilioAccountSid: e.target.value } } })} />
                      </div>
                      <div className="space-y-2">
                        <Label>Twilio Auth Token</Label>
                        <Input type="password" value={settings.integrations.smsGateway?.twilioAuthToken || ""} onChange={e => setSettings({ ...settings, integrations: { ...settings.integrations, smsGateway: { ...settings.integrations.smsGateway, twilioAuthToken: e.target.value } } })} />
                      </div>
                      <div className="space-y-2">
                        <Label>Twilio Phone Number</Label>
                        <Input value={settings.integrations.smsGateway?.twilioPhoneNumber || ""} onChange={e => setSettings({ ...settings, integrations: { ...settings.integrations, smsGateway: { ...settings.integrations.smsGateway, twilioPhoneNumber: e.target.value } } })} />
                      </div>
                      <div className="space-y-2">
                        <Label>Twilio Verify Service SID</Label>
                        <Input placeholder="VAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" value={(settings.integrations.smsGateway as any)?.twilioVerifyServiceSid || ""} onChange={e => setSettings({ ...settings, integrations: { ...settings.integrations, smsGateway: { ...settings.integrations.smsGateway, twilioVerifyServiceSid: e.target.value } as any } })} />
                        <p className="text-xs text-zinc-400">Required for Twilio Verify OTP (recommended over standard SMS)</p>
                      </div>

                      <div className="space-y-2 md:col-span-2 border-t pt-4 mt-2">
                        <Label>MSG91 Auth Key</Label>
                        <Input type="password" value={settings.integrations.smsGateway?.msg91AuthKey || ""} onChange={e => setSettings({ ...settings, integrations: { ...settings.integrations, smsGateway: { ...settings.integrations.smsGateway, msg91AuthKey: e.target.value } } })} />
                      </div>
                      <div className="space-y-2">
                        <Label>MSG91 Sender ID</Label>
                        <Input value={settings.integrations.smsGateway?.msg91SenderId || ""} onChange={e => setSettings({ ...settings, integrations: { ...settings.integrations, smsGateway: { ...settings.integrations.smsGateway, msg91SenderId: e.target.value } } })} />
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-zinc-900 border-b pb-2 mb-4">Aadhaar & PAN Verification (KYC)</h3>
                    <p className="text-xs text-zinc-500 mb-4">
                      When enabled, the Debenture Application form and the investor KYC step stay locked until the applicant verifies Aadhaar (OTP) and PAN with government records through the KYC provider, and the uploaded cards match.
                    </p>
                    {(() => {
                      const kyc = settings.integrations.kyc || {};
                      const setKyc = (patch: any) => setSettings({ ...settings, integrations: { ...settings.integrations, kyc: { ...kyc, ...patch } } });
                      return (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <label className="md:col-span-2 flex items-center gap-2 text-sm font-semibold">
                            <input type="checkbox" checked={!!kyc.enabled} onChange={e => setKyc({ enabled: e.target.checked })} />
                            Enable KYC verification (required before submitting the forms)
                          </label>
                          <div className="space-y-2">
                            <Label>Provider</Label>
                            <select
                              className="block w-full text-sm border border-zinc-300 rounded-md bg-white px-3 py-2"
                              value={kyc.provider || "mock"}
                              onChange={e => setKyc({ provider: e.target.value })}
                            >
                              <option value="mock">Test mode (no real check – OTP 123456)</option>
                              <option value="surepass">Surepass</option>
                            </select>
                          </div>
                          <div className="space-y-2">
                            <Label>Environment</Label>
                            <select
                              className="block w-full text-sm border border-zinc-300 rounded-md bg-white px-3 py-2"
                              value={kyc.mode || "sandbox"}
                              onChange={e => setKyc({ mode: e.target.value })}
                              disabled={(kyc.provider || "mock") === "mock"}
                            >
                              <option value="sandbox">Sandbox (testing)</option>
                              <option value="live">Live</option>
                            </select>
                          </div>
                          <div className="space-y-2 md:col-span-2">
                            <Label>API Token</Label>
                            <Input
                              type="password"
                              autoComplete="off"
                              value={kyc.apiToken || ""}
                              onChange={e => setKyc({ apiToken: e.target.value.trim() })}
                              placeholder="Paste the API token from your Surepass dashboard"
                            />
                            {kyc.provider === "surepass" && !kyc.apiToken && (
                              <p className="text-xs font-semibold text-rose-600">
                                API token is required for Surepass – paste it here and click Save Changes.
                              </p>
                            )}
                            {kyc.provider === "surepass" && kyc.apiToken && (
                              <p className="text-xs text-emerald-600">Token entered ({kyc.apiToken.length} characters). Click Save Changes to apply.</p>
                            )}
                          </div>
                          <div className="space-y-2">
                            <Label>Name match threshold (%)</Label>
                            <Input
                              type="number"
                              min={50}
                              max={100}
                              value={kyc.nameMatchThreshold ?? 80}
                              onChange={e => setKyc({ nameMatchThreshold: Math.min(100, Math.max(50, parseInt(e.target.value) || 80)) })}
                            />
                            <p className="text-xs text-zinc-400">How closely the names on Aadhaar, PAN and the uploaded cards must match. 80 is recommended.</p>
                          </div>
                          <div className="space-y-3 pt-1">
                            <label className="flex items-start gap-2 text-sm">
                              <input type="checkbox" className="mt-1" checked={kyc.requireDocumentMatch !== false} onChange={e => setKyc({ requireDocumentMatch: e.target.checked })} />
                              <span>Require uploaded Aadhaar & PAN cards to match (OCR)</span>
                            </label>
                            <label className="flex items-start gap-2 text-sm">
                              <input type="checkbox" className="mt-1" checked={!!kyc.allowManualReviewFallback} onChange={e => setKyc({ allowManualReviewFallback: e.target.checked })} />
                              <span>Allow submission without verification (marked &quot;Needs Review&quot; for admin)</span>
                            </label>
                          </div>
                          {kyc.enabled && (kyc.provider || "mock") === "mock" && (
                            <div className="md:col-span-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-xs font-semibold text-amber-800">
                              ⚠ Test mode is active – no real government verification happens. Switch to a real provider before going live.
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              )}

              {activeTab === "Letter Templates" && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-sm font-bold text-zinc-900 border-b pb-2 mb-4">Offer Letter Templates</h3>
                    <div className="space-y-4">
                      {Object.keys(settings.letterTemplates?.offerLetter || {})
                        .filter(key => key.startsWith('page'))
                        .sort()
                        .map((pageKey, index) => (
                        <div key={pageKey} className="space-y-2 p-4 border border-zinc-200 rounded-lg bg-zinc-50">
                          <div className="flex justify-between items-center mb-2">
                            <Label className="text-base font-semibold">Page {index + 1}</Label>
                          </div>
                          <RichEditor
                            defaultValue={settings.letterTemplates?.offerLetter?.[pageKey] || ""}
                            onChange={v => setSettings({ ...settings, letterTemplates: { ...settings.letterTemplates, offerLetter: { ...settings.letterTemplates?.offerLetter, [pageKey]: v } } })}
                          />
                        </div>
                      ))}
                      
                      <Button 
                        onClick={() => {
                          const currentKeys = Object.keys(settings.letterTemplates?.offerLetter || {}).filter(k => k.startsWith('page'));
                          const nextNum = currentKeys.length > 0 
                            ? Math.max(...currentKeys.map(k => parseInt(k.replace('page', '')) || 0)) + 1 
                            : 1;
                          setSettings({ 
                            ...settings, 
                            letterTemplates: { 
                              ...settings.letterTemplates, 
                              offerLetter: { 
                                ...settings.letterTemplates?.offerLetter, 
                                [`page${nextNum}`]: "" 
                              } 
                            } 
                          });
                        }}
                        className="w-full"
                        variant="outline"
                      >
                        + Add New Page
                      </Button>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-zinc-900 border-b pb-2 mb-4">Joining Letter Templates</h3>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Main Content</Label>
                        <RichEditor
                          defaultValue={settings.letterTemplates?.joiningLetter?.page1 || ""}
                          onChange={v => setSettings({ ...settings, letterTemplates: { ...settings.letterTemplates, joiningLetter: { ...settings.letterTemplates?.joiningLetter, page1: v } } })}
                        />
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
                              <span className={`px-2 py-1 rounded text-xs font-medium ${u.role === "KEY_ADMIN" ? "bg-purple-100 text-purple-700" :
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
                    <div className={`p-4 rounded-lg border text-sm font-bold flex items-center gap-2 ${backupMsg.type === "success"
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
                      Choose which components to package into your ZIP backup file.
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
                      disabled={exportLoading || (!exportDb && !exportFiles)}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
                    >
                      {exportLoading ? "Generating..." : "Download Backup (.zip)"}
                    </Button>
                  </div>

                  {/* Automated Backup Config Card */}
                  <div className="p-5 border rounded-xl bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800">
                    <h3 className="text-base font-bold text-zinc-950 dark:text-zinc-50 flex items-center gap-2 mb-2">
                      <Mail className="w-5 h-5 text-purple-600" /> Automated Email Backup
                    </h3>
                    <p className="text-xs text-zinc-500 mb-4">
                      Configure the daily scheduled time and recipient email for the automated ZIP backup.
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 bg-white dark:bg-zinc-950 p-4 rounded-lg border border-zinc-150 dark:border-zinc-850">
                      <div className="space-y-2">
                        <Label>Recipient Email Address</Label>
                        <Input 
                          type="email" 
                          value={settings.backupConfig?.email || ""} 
                          onChange={e => setSettings({ ...settings, backupConfig: { ...settings.backupConfig, email: e.target.value } })} 
                          placeholder="admin@example.com"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Daily Schedule Time (IST)</Label>
                        <Input 
                          type="time" 
                          value={settings.backupConfig?.backupTime || "10:00"} 
                          onChange={e => setSettings({ ...settings, backupConfig: { ...settings.backupConfig, backupTime: e.target.value } })} 
                        />
                      </div>
                    </div>

                    <Button
                      onClick={handleSendBackupEmail}
                      disabled={sendingEmail}
                      className="bg-purple-600 hover:bg-purple-700 text-white font-bold"
                    >
                      {sendingEmail ? "Generating & Sending..." : "Send Backup to Email Now"}
                    </Button>
                  </div>

                  {/* Import Card */}
                  <div className="p-5 border rounded-xl bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800">
                    <h3 className="text-base font-bold text-zinc-950 dark:text-zinc-50 flex items-center gap-2 mb-2">
                      <Upload className="w-5 h-5 text-amber-600" /> Import & Restore Backup
                    </h3>
                    <p className="text-xs text-zinc-500 mb-4">
                      Upload a previously exported ZIP backup and select which components to restore.
                    </p>

                    <form onSubmit={handleImportBackup} className="space-y-4">
                      <div className="space-y-2">
                        <Label>Select Backup File (.zip or .json)</Label>
                        <Input
                          type="file"
                          accept=".json,.zip"
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
                        disabled={importLoading || !backupFile || (!importDb && !importFiles) || (restoreMode === "overwrite" && !confirmDelete)}
                        className={`font-bold ${restoreMode === "overwrite"
                          ? "bg-rose-600 hover:bg-rose-700 text-white"
                          : "bg-indigo-600 hover:bg-indigo-700 text-white"
                          }`}
                      >
                        {importLoading ? "Restoring..." : "Run Database Import"}
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
