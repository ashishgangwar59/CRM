import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { Employee } from "@/lib/models/Employee";
import { User } from "@/lib/models/User";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectToDatabase();
    
    const { id } = await params;
    const employee = await Employee.findById(id);
    
    if (!employee) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }

    const user = await User.findOne({ email: employee.email });
    const employeeData = employee.toObject() as any;
    if (user) {
      employeeData.accessibleModules = user.accessibleModules;
      employeeData.role = user.role;
    }

    return NextResponse.json({ success: true, data: employeeData });
  } catch (error) {
    console.error("Fetch Employee Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectToDatabase();
    
    const { id } = await params;
    const data = await req.json();
    
    const cleanData = { ...data };

    if (!cleanData.dateOfBirth || cleanData.dateOfBirth === "") delete cleanData.dateOfBirth;
    else if (typeof cleanData.dateOfBirth === "string") {
      const d = new Date(cleanData.dateOfBirth);
      if (isNaN(d.getTime())) delete cleanData.dateOfBirth;
      else cleanData.dateOfBirth = d;
    }

    if (!cleanData.dateOfJoining || cleanData.dateOfJoining === "") delete cleanData.dateOfJoining;
    else if (typeof cleanData.dateOfJoining === "string") {
      const d = new Date(cleanData.dateOfJoining);
      if (isNaN(d.getTime())) delete cleanData.dateOfJoining;
      else cleanData.dateOfJoining = d;
    }

    if (!cleanData.reportingManager || cleanData.reportingManager === "") delete cleanData.reportingManager;
    if (!cleanData.createdBy || cleanData.createdBy === "") delete cleanData.createdBy;

    const existingEmployee = await Employee.findById(id);
    if (!existingEmployee) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }

    const oldEmail = existingEmployee.email;
    const employee = await Employee.findByIdAndUpdate(id, cleanData, { new: true, runValidators: true });
    
    if (!employee) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }

    const accessibleModules = cleanData.accessibleModules || cleanData.moduleAccess;
    const systemRole = cleanData.systemRole || cleanData.role;

    if (accessibleModules || systemRole || cleanData.email) {
      const userUpdates: any = {};
      if (accessibleModules) userUpdates.accessibleModules = accessibleModules;
      if (systemRole) userUpdates.role = systemRole;
      if (cleanData.email) userUpdates.email = cleanData.email;

      await User.findOneAndUpdate(
        { email: oldEmail },
        userUpdates
      );
    }

    return NextResponse.json({ success: true, data: employee });
  } catch (error: any) {
    console.error("Update Employee Error:", error);
    if (error.code === 11000) {
      return NextResponse.json({ error: "Email or Employee Code already exists" }, { status: 400 });
    }
    return NextResponse.json({ error: error.message || "Failed to update employee" }, { status: 400 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectToDatabase();
    
    const { id } = await params;
    const employee = await Employee.findByIdAndDelete(id);
    
    if (!employee) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }

    // Also delete user account
    await User.findOneAndDelete({ email: employee.email });

    return NextResponse.json({ success: true, message: "Employee deleted successfully" });
  } catch (error) {
    console.error("Delete Employee Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
