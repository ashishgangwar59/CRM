"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, User, Trash2, Edit } from "lucide-react";
import Link from "next/link";

export default function EmployeeProfilePage() {
  const { id } = useParams();
  const router = useRouter();
  const [employee, setEmployee] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/employees/${id}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) setEmployee(data.data);
        setLoading(false);
      });
  }, [id]);

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this employee?")) return;
    try {
      const res = await fetch(`/api/employees/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        router.push("/dashboard/employees");
      }
    } catch (e) {
      alert("Error deleting employee");
    }
  };

  if (loading) return <div>Loading...</div>;
  if (!employee) return <div>Employee not found</div>;

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-10">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/dashboard/employees">
            <Button variant="outline" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="flex items-center space-x-4">
            <div className="h-16 w-16 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center overflow-hidden border-2 border-zinc-300 dark:border-zinc-700">
              {employee.profilePhotoUrl ? (
                <img src={employee.profilePhotoUrl} alt="Profile" className="h-full w-full object-cover" />
              ) : (
                <User className="h-8 w-8 text-zinc-500" />
              )}
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                {employee.firstName} {employee.lastName}
              </h1>
              <p className="text-zinc-500 dark:text-zinc-400 font-medium">
                {employee.employeeCode} • {employee.designation || "No Designation"}
              </p>
            </div>
          </div>
        </div>
        <div className="flex space-x-2">
          <Link href={`/dashboard/employees/${id}/edit`}>
            <Button variant="outline">
              <Edit className="mr-2 h-4 w-4" /> Edit Employee
            </Button>
          </Link>
          <Button variant="destructive" onClick={handleDelete}>
            <Trash2 className="mr-2 h-4 w-4" /> Delete Employee
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Personal Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-y-4 text-sm">
              <div>
                <p className="text-zinc-500">Email</p>
                <p className="font-medium">{employee.email}</p>
              </div>
              <div>
                <p className="text-zinc-500">Phone</p>
                <p className="font-medium">{employee.phone}</p>
              </div>
              <div>
                <p className="text-zinc-500">Status</p>
                <p className="font-medium">{employee.status}</p>
              </div>
              <div>
                <p className="text-zinc-500">Employee Type</p>
                <p className="font-medium">{employee.employeeType}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Official Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-y-4 text-sm">
              <div>
                <p className="text-zinc-500">Department</p>
                <p className="font-medium">{employee.department || "-"}</p>
              </div>
              <div>
                <p className="text-zinc-500">Designation</p>
                <p className="font-medium">{employee.designation || "-"}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>KYC & Bank Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-y-4 text-sm">
              <div>
                <p className="text-zinc-500">Aadhar Number</p>
                <p className="font-medium">{employee.kyc?.aadharNumber || "-"}</p>
              </div>
              <div>
                <p className="text-zinc-500">PAN Number</p>
                <p className="font-medium">{employee.kyc?.panNumber || "-"}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
