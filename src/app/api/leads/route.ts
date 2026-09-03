import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { verifyAccessToken } from "@/lib/auth";
import { Lead } from "@/lib/models/Lead";
import { LeadActivity } from "@/lib/models/LeadActivity";
import { User } from "@/lib/models/User";
import { Employee } from "@/lib/models/Employee";

async function getEmployeeIdFromUserId(userId: string): Promise<string | null> {
  const user = await User.findById(userId).lean();
  if (!user) return null;
  const employee = await Employee.findOne({ email: user.email }).lean();
  return employee ? (employee._id as any).toString() : null;
}

export async function GET(req: Request) {
  try {
    await connectToDatabase();
    const token = req.headers.get("cookie")?.match(/accessToken=([^;]+)/)?.[1];
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    let payload;
    try { payload = verifyAccessToken(token); } 
    catch { return NextResponse.json({ error: "Invalid token" }, { status: 401 }); }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search");
    const status = searchParams.get("status");
    const stage = searchParams.get("stage");
    const source = searchParams.get("source");
    const priority = searchParams.get("priority");
    const employeeIdFilter = searchParams.get("employeeId"); // Added for employee-wise view
    const dateFilter = searchParams.get("dateFilter"); // today, yesterday, this_week, custom

    let query: any = {};
    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: "i" } },
        { lastName: { $regex: search, $options: "i" } },
        { company: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } }
      ];
    }
    if (status) query.status = status;
    if (stage) query.stage = stage;
    if (source) query.source = source;
    if (priority) query.priority = priority;

    if (dateFilter) {
      const now = new Date();
      if (dateFilter === "today") {
        const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
        query.$or = [{ createdAt: { $gte: start, $lte: end } }, { nextFollowUp: { $gte: start, $lte: end } }];
      } else if (dateFilter === "yesterday") {
        const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
        const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59, 999);
        query.$or = [{ createdAt: { $gte: start, $lte: end } }, { nextFollowUp: { $gte: start, $lte: end } }];
      } else if (dateFilter === "this_week") {
        const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
        query.$or = [{ createdAt: { $gte: start } }, { nextFollowUp: { $gte: start } }];
      } else if (dateFilter.includes("-")) {
        // Custom date YYYY-MM-DD
        const targetDate = new Date(dateFilter);
        if (!isNaN(targetDate.getTime())) {
          const start = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
          const end = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 23, 59, 59, 999);
          query.$or = [{ createdAt: { $gte: start, $lte: end } }, { nextFollowUp: { $gte: start, $lte: end } }];
        }
      }
    }

    if (payload.role === "Employee") {
      const employeeId = await getEmployeeIdFromUserId(payload.userId);
      if (employeeId) {
        query.ownerId = employeeId;
      }
    } else if (employeeIdFilter) {
      // For Admin/KeyAdmin viewing employee-wise
      query.ownerId = employeeIdFilter;
    }

    const page = parseInt(searchParams.get("page") || "0");
    const limit = parseInt(searchParams.get("limit") || "0");

    let leads;
    let total = 0;
    if (page > 0 && limit > 0) {
      total = await Lead.countDocuments(query);
      leads = await Lead.find(query)
        .populate("ownerId", "firstName lastName")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean();
    } else {
      leads = await Lead.find(query)
        .populate("ownerId", "firstName lastName")
        .sort({ createdAt: -1 })
        .lean();
    }

    return NextResponse.json({ 
      success: true, 
      data: leads,
      pagination: page > 0 && limit > 0 ? {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      } : null
    });
  } catch (error) {
    console.error("Fetch Leads Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await connectToDatabase();
    const token = req.headers.get("cookie")?.match(/accessToken=([^;]+)/)?.[1];
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    let payload;
    try { payload = verifyAccessToken(token); } 
    catch { return NextResponse.json({ error: "Invalid token" }, { status: 401 }); }

    const body = await req.json();
    const currentEmployeeId = await getEmployeeIdFromUserId(payload.userId);

    // Support Bulk Insert
    if (Array.isArray(body)) {
      if (body.length === 0) {
        return NextResponse.json({ error: "Empty array provided" }, { status: 400 });
      }

      const leadsToCreate = body.map(lead => ({
        ...lead,
        status: "Open",
        stage: "New",
        ownerId: lead.ownerId || currentEmployeeId || payload.userId
      }));

      const newLeads = await Lead.insertMany(leadsToCreate);

      // Auto-create initial activity for all
      const activities = newLeads.map(lead => ({
        leadId: lead._id,
        type: "StatusChange",
        content: "Lead created and marked as New.",
        createdBy: payload.userId
      }));
      await LeadActivity.insertMany(activities);

      return NextResponse.json({ success: true, message: `${newLeads.length} Leads created successfully`, data: newLeads });
    }

    // Single Insert Fallback
    const newLead = await Lead.create({
      ...body,
      status: "Open",
      stage: "New",
      ownerId: body.ownerId || currentEmployeeId || payload.userId
    });

    // Auto-create initial activity
    await LeadActivity.create({
      leadId: newLead._id,
      type: "StatusChange",
      content: "Lead created and marked as New.",
      createdBy: payload.userId
    });

    return NextResponse.json({ success: true, message: "Lead created successfully", data: newLead });
  } catch (error) {
    console.error("Create Lead Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
