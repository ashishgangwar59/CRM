import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { User } from "@/lib/models/User";
import { Employee } from "@/lib/models/Employee";
import { verifyAccessToken } from "@/lib/auth";

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
    const token = getToken(req);
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const payload = verifyAccessToken(token);
    const role = (payload.role || "").toUpperCase().replace("_", "");
    if (role !== "KEYADMIN" && role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { employeeIds, modules, action } = await req.json();

    if (!employeeIds || !Array.isArray(employeeIds) || employeeIds.length === 0) {
      return NextResponse.json({ error: "No employees selected" }, { status: 400 });
    }

    if (!modules || !Array.isArray(modules) || modules.length === 0) {
      return NextResponse.json({ error: "No modules selected" }, { status: 400 });
    }

    // Find emails for these employees to update their Users
    const employees = await Employee.find({ _id: { $in: employeeIds } }).lean();
    const emails = employees.map(e => e.email);

    if (action === "add") {
      await User.updateMany(
        { email: { $in: emails } },
        { $addToSet: { accessibleModules: { $each: modules } } }
      );
    } else if (action === "remove") {
      await User.updateMany(
        { email: { $in: emails } },
        { $pullAll: { accessibleModules: modules } }
      );
    } else if (action === "set") {
      await User.updateMany(
        { email: { $in: emails } },
        { $set: { accessibleModules: modules } }
      );
    } else {
      return NextResponse.json({ error: "Invalid action. Use 'add', 'remove', or 'set'." }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: `Successfully updated permissions for ${emails.length} employees.` });
  } catch (error: any) {
    console.error("Bulk Permission Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
