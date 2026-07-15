"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Building, Users, Briefcase, Clock, Umbrella, Mail, MessageSquare, Shield, Settings } from "lucide-react";

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("Company Profile");
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const TABS = [
    { name: "Company Profile", icon: Building },
    { name: "Departments", icon: Users },
    { name: "Designations", icon: Briefcase },
    { name: "Office Locations", icon: Building },
    { name: "Policies", icon: Umbrella },
    { name: "Email Templates", icon: Mail },
    { name: "SMS Templates", icon: MessageSquare }
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

  if (loading) return <div className="p-8">Loading settings...</div>;
  if (!settings) return <div className="p-8 text-rose-500">Failed to load settings. Are you a Super Admin?</div>;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-24">
      <div className="flex justify-between items-center border-b border-zinc-200 pb-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 flex items-center">
            <Settings className="mr-3 h-8 w-8 text-zinc-400" /> Master Settings
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400">Configure global application parameters.</p>
        </div>
        <Button onClick={handleSave} disabled={saving} className="bg-zinc-900 text-white">
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

            </CardContent>
          </Card>
        </div>
      </div>

    </div>
  );
}
