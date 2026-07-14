"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Plus, Filter, Calendar } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function LeadsDashboardPage() {
  const router = useRouter();
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [stage, setStage] = useState("");
  const [priority, setPriority] = useState("");

  const fetchLeads = async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams();
      if (search) query.append("search", search);
      if (status) query.append("status", status);
      if (stage) query.append("stage", stage);
      if (priority) query.append("priority", priority);

      const res = await fetch(`/api/leads?${query.toString()}`);
      const data = await res.json();
      if (data.success) {
        setLeads(data.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, [status, stage, priority]); // Search requires explicit submission to avoid spam

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchLeads();
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Lead Pipeline</h1>
          <p className="text-zinc-500 dark:text-zinc-400">Track, manage, and close your sales opportunities.</p>
        </div>
        <div>
          <Link href="/dashboard/leads/new">
            <Button><Plus className="mr-2 h-4 w-4" /> Add Lead</Button>
          </Link>
        </div>
      </div>

      <Card>
        <CardContent className="p-4">
          <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row gap-4 items-end">
            <div className="flex-1 space-y-1">
              <label className="text-xs font-semibold text-zinc-500 uppercase">Search</label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-500" />
                <Input 
                  placeholder="Search by name, company, email..." 
                  className="pl-9"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
            <div className="w-full md:w-48 space-y-1">
              <label className="text-xs font-semibold text-zinc-500 uppercase">Stage</label>
              <select className="flex h-10 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900" value={stage} onChange={e => setStage(e.target.value)}>
                <option value="">All Stages</option>
                <option value="New">New</option>
                <option value="Contacted">Contacted</option>
                <option value="Qualified">Qualified</option>
                <option value="Proposal">Proposal</option>
                <option value="Negotiation">Negotiation</option>
              </select>
            </div>
            <div className="w-full md:w-48 space-y-1">
              <label className="text-xs font-semibold text-zinc-500 uppercase">Status</label>
              <select className="flex h-10 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900" value={status} onChange={e => setStatus(e.target.value)}>
                <option value="">All Statuses</option>
                <option value="Open">Open</option>
                <option value="Closed Won">Closed Won</option>
                <option value="Closed Lost">Closed Lost</option>
              </select>
            </div>
            <Button type="submit" variant="secondary">Filter</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-zinc-50 dark:bg-zinc-900/50">
              <TableRow>
                <TableHead>Lead Name</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Stage</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Next Follow-Up</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8">Loading...</TableCell></TableRow>
              ) : leads.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-zinc-500">No leads found matching your criteria.</TableCell></TableRow>
              ) : (
                leads.map((lead) => (
                  <TableRow key={lead._id} className="hover:bg-zinc-50/50 cursor-pointer" onClick={() => router.push(`/dashboard/leads/${lead._id}`)}>
                    <TableCell>
                      <p className="font-bold text-zinc-900">{lead.firstName} {lead.lastName}</p>
                      <p className="text-xs text-zinc-500">{lead.email || lead.phone}</p>
                    </TableCell>
                    <TableCell className="font-medium text-zinc-700">{lead.company || "-"}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                        lead.stage === "New" ? "bg-blue-100 text-blue-700" :
                        lead.stage === "Qualified" ? "bg-emerald-100 text-emerald-700" :
                        "bg-amber-100 text-amber-700"
                      }`}>
                        {lead.stage}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className={`text-xs font-bold ${
                        lead.priority === "High" ? "text-rose-600" : 
                        lead.priority === "Medium" ? "text-amber-600" : "text-zinc-500"
                      }`}>
                        {lead.priority}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm">{lead.ownerId?.firstName} {lead.ownerId?.lastName}</TableCell>
                    <TableCell>
                      {lead.nextFollowUp ? (
                        <span className="flex items-center text-xs font-medium text-zinc-600">
                          <Calendar className="w-3 h-3 mr-1" />
                          {new Date(lead.nextFollowUp).toLocaleDateString()}
                        </span>
                      ) : (
                        <span className="text-xs text-zinc-400">Not set</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); router.push(`/dashboard/leads/${lead._id}`); }}>
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
