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
    
    const employee = await Employee.findByIdAndUpdate(id, data, { new: true, runValidators: true });
    
    if (!employee) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }

    if (data.accessibleModules) {
      await User.findOneAndUpdate(
        { email: employee.email },
        { accessibleModules: data.accessibleModules }
      );
    }

    return NextResponse.json({ success: true, data: employee });
  } catch (error) {
    console.error("Update Employee Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
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
