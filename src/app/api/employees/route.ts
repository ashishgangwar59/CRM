import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { Employee } from "@/lib/models/Employee";
import { User } from "@/lib/models/User";
import { Counter } from "@/lib/models/Counter";
import bcrypt from "bcryptjs";
import { verifyAccessToken } from "@/lib/auth";

// Helper function to auto-generate employee/admin code
async function getNextEmployeeCode(systemRole?: string) {
  const roleUpper = (systemRole || "").toUpperCase().replace("_", "");
  const isAdmin = roleUpper === "ADMIN" || roleUpper === "KEYADMIN" || roleUpper === "MANAGER";
  const counterId = isAdmin ? "adminCode" : "employeeCode";
  const prefix = isAdmin ? "Admin" : "EMP";

  const counter = await Counter.findByIdAndUpdate(
    { _id: counterId },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  
  return `${prefix}-${counter.seq.toString().padStart(4, "0")}`;
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
    let createdBy: string | undefined = undefined;
    if (token) {
      try {
        const payload = verifyAccessToken(token);
        createdBy = payload.userId;
      } catch (e) {
        // Ignore token errors
      }
    }

    const systemRole = data.systemRole === "ADMIN" || data.role === "ADMIN" ? "ADMIN" : "Employee";

    // Auto-generate code using Admin-0001 or EMP-0001 format
    const employeeCode = data.employeeCode || (await getNextEmployeeCode(systemRole));

    const newEmployee = await Employee.create({
      ...data,
      employeeCode,
      createdBy,
    });

    // Create a User account for the employee to log in
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

    function getToken(req: Request): string | null {
      const cookieHeader = req.headers.get("cookie");
      if (cookieHeader) {
        const match = cookieHeader.match(/accessToken=([^;]+)/);
        if (match) return match[1];
      }
      const authHeader = req.headers.get("authorization");
      if (authHeader) {
        if (authHeader.startsWith("Bearer ")) return authHeader.substring(7).trim();
        return authHeader.trim();
      }
      return null;
    }

    const token = getToken(req);
    if (token) {
      try {
        const payload = verifyAccessToken(token);
        if (payload.role === "ADMIN") {
          query.createdBy = payload.userId;
        }
      } catch (e) {
        return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
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
