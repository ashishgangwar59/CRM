import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { Attendance } from "@/lib/models/Attendance";
import { verifyAccessToken } from "@/lib/auth";
import { getOwnedEmployeeIds } from "@/lib/teamUtils";

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

export async function GET(req: Request) {
  try {
    await connectToDatabase();
    
    const token = getToken(req);
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    
    let payload;
    try {
      payload = verifyAccessToken(token);
    } catch {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date");
    const status = searchParams.get("status");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");

    let query: any = {};
    
    if (date) {
      query.date = date;
    }
    if (status) {
      query.status = status;
    }

    // Role-based filtering
    const role = (payload.role || "").toUpperCase();
    if (role !== "ADMIN" && role !== "KEY_ADMIN") {
      const allowedEmployeeIds = await getOwnedEmployeeIds(payload.userId);
      if (allowedEmployeeIds.length > 0) {
        query.employeeId = { $in: allowedEmployeeIds };
      } else {
        // If not admin/keyadmin and not in any team, return empty. Or maybe just their own?
        // Let's just return their own if they have no team.
        const userEmails = await (await import("@/lib/models/User")).User.findById(payload.userId).lean();
        if (userEmails) {
          const emp = await (await import("@/lib/models/Employee")).Employee.findOne({ email: userEmails.email }).lean();
          if (emp) {
            query.employeeId = emp._id;
          }
        }
      }
    }

    const total = await Attendance.countDocuments(query);
    const records = await Attendance.find(query)
      .populate("employeeId", "firstName lastName employeeCode email department designation")
      .sort({ date: -1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    return NextResponse.json({
      success: true,
      data: records,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });

  } catch (error: any) {
    console.error("Attendance List Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
