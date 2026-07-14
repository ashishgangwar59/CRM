"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Phone, Mail, Building, Target, Calendar, User, FileText, UploadCloud, MessageSquare, Activity } from "lucide-react";
import Link from "next/link";

export default function LeadDetailsPage() {
  const params = useParams();
  const router = useRouter();
  
  const [lead, setLead] = useState<any>(null);
  const [activities, setActivities] = useState<any[]>([]);
  const [attachments, setAttachments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [noteContent, setNoteContent] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchLeadData = async () => {
    try {
      const res = await fetch(`/api/leads/${params.id}`);
      const data = await res.json();
      if (data.success) {
        setLead(data.data.lead);
        setActivities(data.data.activities);
        setAttachments(data.data.attachments);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeadData();
  }, [params.id]);

  const handleUpdateStage = async (newStage: string) => {
    try {
      const res = await fetch(`/api/leads/${params.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage: newStage })
      });
      if (res.ok) fetchLeadData();
    } catch (e) {
      alert("Failed to update stage");
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteContent) return;
    try {
      const res = await fetch(`/api/leads/${params.id}/activity`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "Note", content: noteContent })
      });
      if (res.ok) {
        setNoteContent("");
        fetchLeadData();
      }
    } catch (e) {
      alert("Failed to add note");
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch(`/api/leads/${params.id}/upload`, {
        method: "POST",
        body: formData
      });
      if (res.ok) {
        fetchLeadData();
      }
    } catch (e) {
      alert("Failed to upload file");
    }
  };

  if (loading) return <div className="p-8">Loading lead...</div>;
  if (!lead) return <div className="p-8 text-rose-500">Lead not found!</div>;

  const STAGES = ["New", "Contacted", "Qualified", "Proposal", "Negotiation"];
  const currentStageIndex = STAGES.indexOf(lead.stage);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-24">
      <div className="flex items-center space-x-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">{lead.firstName} {lead.lastName}</h1>
          <p className="text-zinc-500 dark:text-zinc-400">Lead Details & Timeline</p>
        </div>
      </div>

      {/* Stage Tracker */}
      <Card className="bg-zinc-950 text-white dark:bg-zinc-900 border-zinc-800">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            {STAGES.map((stage, index) => (
              <div key={stage} className="flex flex-col items-center flex-1 relative cursor-pointer" onClick={() => handleUpdateStage(stage)}>
                <div className={`h-8 w-8 rounded-full flex items-center justify-center font-bold text-sm z-10 ${
                  index <= currentStageIndex ? 'bg-indigo-500 text-white ring-4 ring-indigo-500/30' : 'bg-zinc-800 text-zinc-500'
                }`}>
                  {index + 1}
                </div>
                <p className={`mt-2 text-xs font-semibold uppercase tracking-wider ${index <= currentStageIndex ? 'text-indigo-400' : 'text-zinc-500'}`}>
                  {stage}
                </p>
                {index < STAGES.length - 1 && (
                  <div className={`absolute top-4 left-1/2 w-full h-1 -z-10 ${index < currentStageIndex ? 'bg-indigo-500' : 'bg-zinc-800'}`}></div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Col - Details */}
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <CardHeader className="pb-4 border-b border-zinc-100">
              <CardTitle className="text-lg flex items-center"><User className="mr-2 h-5 w-5 text-indigo-500" /> Contact Info</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              {lead.company && (
                <div className="flex items-center text-sm"><Building className="h-4 w-4 mr-3 text-zinc-400" /> <span className="font-medium">{lead.company}</span></div>
              )}
              {lead.email && (
                <div className="flex items-center text-sm"><Mail className="h-4 w-4 mr-3 text-zinc-400" /> <a href={`mailto:${lead.email}`} className="text-indigo-600 hover:underline">{lead.email}</a></div>
              )}
              {lead.phone && (
                <div className="flex items-center text-sm"><Phone className="h-4 w-4 mr-3 text-zinc-400" /> <a href={`tel:${lead.phone}`} className="text-indigo-600 hover:underline">{lead.phone}</a></div>
              )}
              <div className="flex items-center text-sm"><Target className="h-4 w-4 mr-3 text-zinc-400" /> Source: <span className="ml-1 font-medium">{lead.source}</span></div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-4 border-b border-zinc-100 flex flex-row items-center justify-between">
              <CardTitle className="text-lg flex items-center"><FileText className="mr-2 h-5 w-5 text-emerald-500" /> Attachments</CardTitle>
              <Button size="sm" variant="outline" onClick={() => fileInputRef.current?.click()}><UploadCloud className="h-4 w-4" /></Button>
              <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} />
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-zinc-100">
                {attachments.length > 0 ? attachments.map(att => (
                  <div key={att._id} className="p-4 flex items-center justify-between hover:bg-zinc-50">
                    <div className="truncate max-w-[200px]">
                      <a href={att.fileUrl} target="_blank" rel="noreferrer" className="text-sm font-medium text-indigo-600 hover:underline truncate block">{att.fileName}</a>
                      <p className="text-xs text-zinc-400 mt-0.5">By {att.uploadedBy?.firstName}</p>
                    </div>
                  </div>
                )) : (
                  <div className="p-6 text-center text-zinc-400 text-sm">No attachments uploaded yet.</div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Col - Timeline */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardContent className="p-4 bg-zinc-50/50">
              <form onSubmit={handleAddNote} className="flex space-x-2">
                <Input 
                  placeholder="Log a call, write a note, or set a reminder..." 
                  value={noteContent}
                  onChange={e => setNoteContent(e.target.value)}
                  className="flex-1 bg-white"
                />
                <Button type="submit">Post Note</Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-4 border-b border-zinc-100">
              <CardTitle className="text-lg flex items-center"><Activity className="mr-2 h-5 w-5 text-rose-500" /> Lead Activity Timeline</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-zinc-200 before:to-transparent">
                {activities.map((act) => (
                  <div key={act._id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    <div className={`flex items-center justify-center w-10 h-10 rounded-full border-4 border-white shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-sm ${
                      act.type === 'Note' ? 'bg-amber-100 text-amber-600' :
                      act.type === 'StatusChange' ? 'bg-indigo-100 text-indigo-600' :
                      'bg-emerald-100 text-emerald-600'
                    }`}>
                      {act.type === 'Note' ? <MessageSquare className="w-4 h-4" /> : <Activity className="w-4 h-4" />}
                    </div>
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-zinc-100 bg-white shadow-sm">
                      <div className="flex items-center justify-between space-x-2 mb-1">
                        <div className="font-bold text-zinc-900 text-sm">{act.createdBy?.firstName} {act.createdBy?.lastName}</div>
                        <time className="font-mono text-[10px] text-zinc-500">{new Date(act.createdAt).toLocaleString()}</time>
                      </div>
                      <div className={`text-sm ${act.type === 'StatusChange' ? 'text-indigo-600 font-medium' : 'text-zinc-600'}`}>
                        {act.content}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
}
