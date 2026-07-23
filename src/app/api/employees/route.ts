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

export async function POST(req: Request) {
  try {
    await connectToDatabase();
    const data = await req.json();

    if (!data.email || !data.email.trim()) {
      return NextResponse.json({ error: "Email address is required." }, { status: 400 });
    }
    if (!data.firstName || !data.firstName.trim()) {
      return NextResponse.json({ error: "First Name is required." }, { status: 400 });
    }
    if (!data.lastName || !data.lastName.trim()) {
      return NextResponse.json({ error: "Last Name is required." }, { status: 400 });
    }

    const cleanEmail = data.email.toLowerCase().trim();

    // Pre-check to ensure email is not already used in User or Employee collection
    const existingUser = await User.findOne({ email: cleanEmail });
    if (existingUser) {
      return NextResponse.json({ error: "Email is already registered as a User" }, { status: 400 });
    }

    const existingEmployee = await Employee.findOne({ email: cleanEmail });
    if (existingEmployee) {
      return NextResponse.json({ error: "Email is already registered as an Employee" }, { status: 400 });
    }

    const token = getToken(req);
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

    // Sanitize empty strings for dates & ObjectIds
    const cleanData = { ...data, email: cleanEmail };

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

    const newEmployee = await Employee.create({
      ...cleanData,
      employeeCode,
      createdBy,
    });

    // Create a User account for the employee to log in
    const rawPassword = cleanData.password || (systemRole === "ADMIN" ? "Admin@123" : "Employee@123");
    const hashedPassword = await bcrypt.hash(rawPassword, 10);
    const accessibleModules = cleanData.accessibleModules || cleanData.moduleAccess || ["Overview", "Attendance", "Leads", "Reports", "Profile"];
    
    await User.create({
      email: cleanEmail,
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
        email: cleanEmail,
        firstName: cleanData.firstName,
        lastName: cleanData.lastName,
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
    return NextResponse.json({ error: error.message || "Failed to create employee" }, { status: 400 });
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
