import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { verifyAccessToken } from "@/lib/auth";
import { Lead } from "@/lib/models/Lead";
import { Employee } from "@/lib/models/Employee";

export async function GET(req: Request) {
  try {
    await connectToDatabase();
    const token = req.headers.get("cookie")?.match(/accessToken=([^;]+)/)?.[1];
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const payload = verifyAccessToken(token);
    if (payload.role !== "Super Admin" && payload.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 1. Global KPIs
    const totalLeads = await Lead.countDocuments();
    const totalWon = await Lead.countDocuments({ status: "Closed Won" });
    const totalLost = await Lead.countDocuments({ status: "Closed Lost" });
    const totalOpen = await Lead.countDocuments({ status: "Open" });
    const conversionRate = totalLeads > 0 ? ((totalWon / totalLeads) * 100).toFixed(1) : 0;

    const todaysLeads = await Lead.countDocuments({ createdAt: { $gte: today } });

    // 2. Status Distribution for Pie Chart
    const statusWise = [
      { name: "Open", value: totalOpen },
      { name: "Converted (Won)", value: totalWon },
      { name: "Lost", value: totalLost }
    ];

    // 3. Employee Wise Performance
    const employeeAggregation = await Lead.aggregate([
      {
        $group: {
          _id: "$ownerId",
          totalAssigned: { $sum: 1 },
          won: { $sum: { $cond: [{ $eq: ["$status", "Closed Won"] }, 1, 0] } },
          lost: { $sum: { $cond: [{ $eq: ["$status", "Closed Lost"] }, 1, 0] } },
          open: { $sum: { $cond: [{ $eq: ["$status", "Open"] }, 1, 0] } }
        }
      }
    ]);

    const employees = await Employee.find({ _id: { $in: employeeAggregation.map(e => e._id) } }, "firstName lastName department").lean();

    const employeeWise = employeeAggregation.map(agg => {
      const emp = employees.find(e => e._id.toString() === agg._id.toString());
      return {
        name: emp ? `${emp.firstName} ${emp.lastName}` : "Unknown",
        department: emp ? emp.department : "Unknown",
        won: agg.won,
        lost: agg.lost,
        open: agg.open,
        total: agg.totalAssigned
      };
    });

    // 4. Department Wise (Mocking Branch-wise)
    const departmentWise = employeeWise.reduce((acc: any, curr) => {
      const dept = curr.department || "Unassigned";
      if (!acc[dept]) {
        acc[dept] = { name: dept, won: 0, lost: 0, open: 0, total: 0 };
      }
      acc[dept].won += curr.won;
      acc[dept].lost += curr.lost;
      acc[dept].open += curr.open;
      acc[dept].total += curr.total;
      return acc;
    }, {});

    // 5. Missed Follow Ups
    const now = new Date();
    const missedFollowUps = await Lead.find({
      status: "Open",
      nextFollowUp: { $lt: now }
    }).populate("ownerId", "firstName lastName").sort({ nextFollowUp: 1 }).lean();

    return NextResponse.json({
      success: true,
      data: {
        kpis: {
          totalLeads,
          todaysLeads,
          totalWon,
          conversionRate,
          missedFollowUpsCount: missedFollowUps.length
        },
        statusWise,
        employeeWise,
        departmentWise: Object.values(departmentWise),
        missedFollowUps
      }
    });
  } catch (error) {
    console.error("Lead Reports Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
