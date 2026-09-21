"use client";

import { useState, useEffect } from "react";
import { Users, Plus, Edit2, Trash2, Shield, User as UserIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function TeamsPage() {
  const [teams, setTeams] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [role, setRole] = useState("");
  const [userId, setUserId] = useState("");
  const [loading, setLoading] = useState(true);
  const [departments, setDepartments] = useState<string[]>([]);

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<any>(null);

  const [formName, setFormName] = useState("");
  const [formOwner, setFormOwner] = useState("");
  const [formDepartment, setFormDepartment] = useState("");
  const [formMembers, setFormMembers] = useState<string[]>([]);

  const [activeTab, setActiveTab] = useState("list"); // 'list' | 'hierarchy'

  useEffect(() => {
    fetchAuth();
    fetchUsers();
    fetchSettings();
  }, []);

  useEffect(() => {
    if (role) {
      fetchTeams();
    }
  }, [role]);

  const fetchSettings = async () => {
    try {
      const res = await fetch("/api/settings");
      const json = await res.json();
      if (json.success && json.data?.departments) {
        setDepartments(json.data.departments);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchAuth = async () => {
    try {
      const res = await fetch("/api/auth/me");
      const data = await res.json();
      if (data.success) {
        setRole(data.role || "");
        setUserId(data.user?._id || data.employee?._id || "");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/users");
      const data = await res.json();
      if (data.success) {
        setUsers(data.data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchTeams = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/teams");
      const data = await res.json();
      if (data.success) {
        setTeams(data.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: formName, owner: formOwner, department: formDepartment, members: formMembers }),
      });
      const data = await res.json();
      if (data.success) {
        setShowAddModal(false);
        fetchTeams();
      } else {
        alert(data.error || "Failed to create team");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeam) return;
    try {
      const res = await fetch(`/api/teams/${selectedTeam._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: formName, owner: formOwner, department: formDepartment, members: formMembers }),
      });
      const data = await res.json();
      if (data.success) {
        setShowEditModal(false);
        fetchTeams();
      } else {
        alert(data.error || "Failed to update team");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteTeam = async (id: string) => {
    if (!confirm("Are you sure you want to delete this team?")) return;
    try {
      const res = await fetch(`/api/teams/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        fetchTeams();
      } else {
        alert(data.error || "Failed to delete team");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const toggleMember = (uid: string) => {
    if (formMembers.includes(uid)) {
      setFormMembers(formMembers.filter(id => id !== uid));
    } else {
      setFormMembers([...formMembers, uid]);
    }
  };

  const isAdmin = role === "ADMIN" || role === "KEY_ADMIN";

  return (
    <div className="space-y-6 pb-24">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Team Management</h1>
          <p className="text-zinc-500">Manage teams and employee access restrictions.</p>
        </div>
        {isAdmin && (
          <Button onClick={() => {
            setFormName("");
            setFormOwner("");
            setFormMembers([]);
            setShowAddModal(true);
          }}>
            <Plus className="w-4 h-4 mr-2" /> Create Team
          </Button>
        )}
      </div>

      <div className="flex border-b border-zinc-200 dark:border-zinc-800 gap-4 mb-6">
        <button
          onClick={() => setActiveTab("list")}
          className={`pb-2 text-sm font-semibold border-b-2 ${activeTab === "list" ? "border-indigo-600 text-indigo-600" : "border-transparent text-zinc-500 hover:text-zinc-700"
            }`}
        >
          List View
        </button>
        <button
          onClick={() => setActiveTab("hierarchy")}
          className={`pb-2 text-sm font-semibold border-b-2 ${activeTab === "hierarchy" ? "border-indigo-600 text-indigo-600" : "border-transparent text-zinc-500 hover:text-zinc-700"
            }`}
        >
          Department Hierarchy
        </button>
      </div>

      {loading ? (
        <p>Loading teams...</p>
      ) : teams.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-zinc-900 rounded-xl border">
          <Users className="w-12 h-12 text-zinc-300 mx-auto mb-3" />
          <p className="text-zinc-500">No teams found. {isAdmin ? "Create one to get started." : ""}</p>
        </div>
      ) : activeTab === "list" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {teams.map(team => (
            <div key={team._id} className="bg-white dark:bg-zinc-900 border rounded-xl p-5 shadow-sm space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-lg">{team.name}</h3>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 px-2 py-0.5 rounded-full font-medium">
                      {team.department || "Unassigned"}
                    </span>
                    <div className="flex items-center text-xs text-indigo-600 font-medium">
                      <Shield className="w-3 h-3 mr-1" /> Owner: {team.owner?.email || "Unknown"}
                    </div>
                  </div>
                </div>
                {(isAdmin || team.owner?._id === userId) && (
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => {
                      setSelectedTeam(team);
                      setFormName(team.name);
                      setFormDepartment(team.department || "");
                      setFormOwner(team.owner?._id || "");
                      setFormMembers(team.members?.map((m: any) => m._id) || []);
                      setShowEditModal(true);
                    }}>
                      <Edit2 className="w-4 h-4 text-zinc-500" />
                    </Button>
                    {isAdmin && (
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => handleDeleteTeam(team._id)}>
                        <Trash2 className="w-4 h-4 text-rose-500" />
                      </Button>
                    )}
                  </div>
                )}
              </div>
              <div>
                <p className="text-xs font-semibold text-zinc-500 mb-2 uppercase tracking-wider">Members ({team.members?.length || 0})</p>
                <div className="space-y-2">
                  {team.members?.map((member: any) => (
                    <div key={member._id} className="flex items-center gap-2 text-sm bg-zinc-50 dark:bg-zinc-800 p-2 rounded">
                      <UserIcon className="w-4 h-4 text-zinc-400" />
                      {member.email}
                    </div>
                  ))}
                  {(!team.members || team.members.length === 0) && (
                    <p className="text-xs text-zinc-400 italic">No members assigned.</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Hierarchy View */}
      {activeTab === "hierarchy" && !loading && teams.length > 0 && (
        <div className="space-y-8">
          {Object.entries(
            teams.reduce((acc, team) => {
              const dept = team.department || "Unassigned";
              if (!acc[dept]) acc[dept] = [];
              acc[dept].push(team);
              return acc;
            }, {} as Record<string, any[]>)
          ).map(([dept, deptTeams]: [string, any]) => (
            <div key={dept} className="bg-zinc-50 dark:bg-zinc-900/50 p-6 rounded-2xl border dark:border-zinc-800">
              <h2 className="text-xl font-bold mb-4 flex items-center text-zinc-800 dark:text-zinc-100">
                <span className="w-2 h-6 bg-indigo-600 rounded-full mr-3"></span>
                {dept} Department
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 ml-5 border-l-2 border-indigo-100 dark:border-indigo-900/50 pl-4 py-2">
                {deptTeams.map((team: any) => (
                  <div key={team._id} className="bg-white dark:bg-zinc-900 border rounded-xl p-4 shadow-sm relative before:absolute before:w-4 before:h-2 before:border-b-2 before:border-l-2 before:border-indigo-100 dark:before:border-indigo-900/50 before:-left-4 before:top-6 before:rounded-bl-lg">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-bold text-md">{team.name}</h3>
                      {(isAdmin || team.owner?._id === userId) && (
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => {
                            setSelectedTeam(team);
                            setFormName(team.name);
                            setFormDepartment(team.department || "");
                            setFormOwner(team.owner?._id || "");
                            setFormMembers(team.members?.map((m: any) => m._id) || []);
                            setShowEditModal(true);
                          }}>
                            <Edit2 className="w-3 h-3 text-zinc-500" />
                          </Button>
                          {isAdmin && (
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => handleDeleteTeam(team._id)}>
                              <Trash2 className="w-3 h-3 text-rose-500" />
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center text-xs text-indigo-600 font-medium mb-3">
                      <Shield className="w-3 h-3 mr-1" /> Owner: {team.owner?.email || "Unknown"}
                    </div>
                    <p className="text-xs font-semibold text-zinc-500 mb-2 uppercase tracking-wider">Members ({team.members?.length || 0})</p>
                    <div className="space-y-1.5">
                      {team.members?.map((member: any) => (
                        <div key={member._id} className="flex items-center gap-2 text-xs bg-zinc-50 dark:bg-zinc-800 p-1.5 rounded text-zinc-600 dark:text-zinc-300">
                          <UserIcon className="w-3 h-3 text-zinc-400" />
                          {member.email}
                        </div>
                      ))}
                      {(!team.members || team.members.length === 0) && (
                        <p className="text-[10px] text-zinc-400 italic">No members assigned.</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Modal */}
      {(showAddModal || showEditModal) && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-xl w-full max-w-md p-6 border shadow-2xl">
            <h2 className="text-xl font-bold mb-4">{showAddModal ? "Create New Team" : "Edit Team"}</h2>
            <form onSubmit={showAddModal ? handleCreateTeam : handleUpdateTeam} className="space-y-4">

              <div className="space-y-1">
                <Label>Team Name</Label>
                <Input required value={formName} onChange={e => setFormName(e.target.value)} disabled={!isAdmin} />
              </div>

              <div className="space-y-1">
                <Label>Department</Label>
                <select
                  className="flex h-10 w-full items-center justify-between rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-950 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-800 dark:bg-zinc-950 dark:ring-offset-zinc-950 dark:placeholder:text-zinc-400 dark:focus:ring-zinc-300"
                  required
                  value={formDepartment}
                  onChange={(e) => setFormDepartment(e.target.value)}
                  disabled={!isAdmin}
                >
                  <option value="" disabled>Select Department</option>
                  {departments.map(dept => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <Label>Team Owner</Label>
                <select
                  className="flex h-10 w-full items-center justify-between rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-950 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-800 dark:bg-zinc-950 dark:ring-offset-zinc-950 dark:placeholder:text-zinc-400 dark:focus:ring-zinc-300"
                  value={formOwner}
                  onChange={(e) => setFormOwner(e.target.value)}
                  disabled={!isAdmin}
                >
                  <option value="" disabled>Select Owner</option>
                  {users.filter(u => u.role !== "ADMIN" && u.role !== "KEY_ADMIN").map(u => (
                    <option key={u._id} value={u._id}>{u.email} ({u.role})</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label>Assign Members</Label>
                <div className="border rounded-md max-h-48 overflow-y-auto p-2 space-y-1 bg-zinc-50 dark:bg-zinc-950">
                  {users.filter(u => u._id !== formOwner && u.role !== "ADMIN" && u.role !== "KEY_ADMIN").map(u => (
                    <label key={u._id} className="flex items-center gap-2 text-sm p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formMembers.includes(u._id)}
                        onChange={() => toggleMember(u._id)}
                      />
                      <span>{u.email} ({u.role})</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button type="button" variant="ghost" onClick={() => { setShowAddModal(false); setShowEditModal(false); }}>Cancel</Button>
                <Button type="submit">{showAddModal ? "Create Team" : "Save Changes"}</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
