import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { Employee } from "@/lib/models/Employee";
import { User } from "@/lib/models/User";
import { Counter } from "@/lib/models/Counter";
import bcrypt from "bcryptjs";
import { verifyAccessToken } from "@/lib/auth";

// Helper function to auto-generate employee code
async function getNextEmployeeCode() {
  const counter = await Counter.findByIdAndUpdate(
    { _id: "employeeCode" },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  
  // Format as EMP-0001, EMP-0002, etc.
  return `EMP-${counter.seq.toString().padStart(4, "0")}`;
}

export async function POST(req: Request) {
  try {
    await connectToDatabase();
    const data = await req.json();

    // Pre-check to ensure email is not already used in User or Employee collection
    const existingUser = await User.findOne({ email: data.email });
    if (existingUser) {
      return NextResponse.json({ error: "Email is already registered as a User" }, { status: 400 });
    }

    const existingEmployee = await Employee.findOne({ email: data.email });
    if (existingEmployee) {
      return NextResponse.json({ error: "Email is already registered as an Employee" }, { status: 400 });
    }

    const token = req.headers.get("cookie")?.match(/accessToken=([^;]+)/)?.[1];
    let createdBy = null;
    if (token) {
      try {
        const payload = verifyAccessToken(token);
        createdBy = payload.userId;
      } catch (e) {
        // Ignore token errors for creation if it's somehow public, though it shouldn't be
      }
    }

    // Auto-generate employee code
    const employeeCode = await getNextEmployeeCode();

    const newEmployee = await Employee.create({
      ...data,
      employeeCode,
      createdBy,
    });

    // Create a User account for the employee to log in
    const systemRole = data.systemRole === "ADMIN" ? "ADMIN" : "Employee";
    const rawPassword = data.password || (systemRole === "ADMIN" ? "Admin@123" : "Employee@123");
    const hashedPassword = await bcrypt.hash(rawPassword, 10);
    const accessibleModules = data.accessibleModules || ["Overview", "Attendance", "Leads", "Reports", "Profile"];
    
    await User.create({
      email: data.email,
      password: hashedPassword,
      role: systemRole,
      accessibleModules,
    });

    // Send Welcome Email containing credentials and login URL
    try {
      const origin = req.headers.get("origin") || "http://localhost:3000";
      const loginUrl = `${origin}/login`;
      
      const { sendWelcomeEmail } = require("@/lib/mail");
      await sendWelcomeEmail({
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        password: rawPassword,
        loginUrl
      });
    } catch (mailError) {
      console.error("Welcome email delivery failed:", mailError);
    }

    return NextResponse.json({ success: true, data: newEmployee }, { status: 201 });
  } catch (error: any) {
    console.error("Create Employee Error:", error);
    if (error.code === 11000) {
       return NextResponse.json({ error: "Email or Employee Code already exists" }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    await connectToDatabase();
    
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const department = searchParams.get("department") || "";
    const status = searchParams.get("status") || "";

    const query: any = {};

    const token = req.headers.get("cookie")?.match(/accessToken=([^;]+)/)?.[1];
    if (token) {
      try {
        const payload = verifyAccessToken(token);
        if (payload.role === "ADMIN") {
          query.createdBy = payload.userId;
        }
      } catch (e) {
        return NextResponse.json({ error: "Invalid token" }, { status: 401 });
      }
    } else {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: "i" } },
        { lastName: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { employeeCode: { $regex: search, $options: "i" } },
      ];
    }

    if (department) {
      query.department = department;
    }

    if (status) {
      query.status = status;
    }

    const employees = await Employee.find(query).sort({ createdAt: -1 });

    return NextResponse.json({ success: true, data: employees });
  } catch (error) {
    console.error("Fetch Employees Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
