import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { LoginHistory } from "@/lib/models/LoginHistory";
import { User } from "@/lib/models/User";
import { Employee } from "@/lib/models/Employee";
import { Investor } from "@/lib/models/Investor";
import { verifyAccessToken } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    await connectToDatabase();
    const token = req.headers.get("cookie")?.match(/accessToken=([^;]+)/)?.[1];
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const payload = verifyAccessToken(token);
    const userRole = (payload?.role || "").toUpperCase();

    if (userRole !== "ADMIN" && userRole !== "KEY_ADMIN" && userRole !== "KEYADMIN" && userRole !== "SUPERADMIN") {
      return NextResponse.json({ error: "Forbidden. Admins only." }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "";
    const date = searchParams.get("date") || "";

    const query: any = {};

    if (status && status !== "ALL") {
      query.status = status;
    }

    if (date) {
      const start = new Date(`${date}T00:00:00.000Z`);
      const end = new Date(`${date}T23:59:59.999Z`);
      query.createdAt = { $gte: start, $lte: end };
    }

    let userIdsToFilter = null;
    if (search) {
      // Find users matching search
      const userSearchQuery = { $regex: search, $options: "i" };
      const matchedUsers = await User.find({ email: userSearchQuery }).select("_id");
      userIdsToFilter = matchedUsers.map(u => u._id);
    }

    if (userIdsToFilter) {
      query.userId = { $in: userIdsToFilter };
    }

    const skip = (page - 1) * limit;

    const total = await LoginHistory.countDocuments(query);
    const history = await LoginHistory.find(query)
      .populate("userId", "email role")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Map user names (from Employee or Investor collections)
    const enrichedHistory = await Promise.all(history.map(async (record: any) => {
      let name = "Unknown";
      let userType = "Unknown";
      
      if (record.userId) {
        if (record.userId.role === "INVESTOR") {
          const inv = await Investor.findOne({ userId: record.userId._id });
          name = inv ? inv.fullName : record.userId.email;
          userType = "Investor";
        } else {
          const emp = await Employee.findOne({ $or: [{ email: record.userId.email }, { officeEmail: record.userId.email }] });
          name = emp ? `${emp.firstName} ${emp.lastName}` : record.userId.email;
          userType = "Employee";
        }
      }

      return {
        ...record,
        userName: name,
        userType,
      };
    }));

    return NextResponse.json({
      success: true,
      data: enrichedHistory,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      }
    });

  } catch (error) {
    console.error("Login History GET Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
