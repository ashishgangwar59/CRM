import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { IncentiveConfiguration } from "@/lib/models/IncentiveConfiguration";
import { verifyAccessToken } from "@/lib/auth";
import { User } from "@/lib/models/User";
import { Team } from "@/lib/models/Team";
import { Employee } from "@/lib/models/Employee";

export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();
    const token = req.headers.get("cookie")?.match(/accessToken=([^;]+)/)?.[1];
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const payload = verifyAccessToken(token);
    const userId = payload.userId;
    const role = (payload.role || "").toUpperCase().replace(/_/g, "");

    const searchParams = req.nextUrl.searchParams;
    const targetType = searchParams.get("targetType");
    const targetId = searchParams.get("targetId");

    let query: any = {};
    if (targetType) query.targetType = targetType;
    if (targetId) query.targetId = targetId;

    if (role !== "ADMIN" && role !== "KEYADMIN") {
      const myTeams = await Team.find({ owner: userId });
      if (myTeams.length > 0) {
        // I am a team owner. Collect my members' user IDs + my own ID.
        let allowedUserIds = [userId];
        myTeams.forEach(t => {
          allowedUserIds.push(...t.members.map((id: any) => id.toString()));
        });
        
        // Fetch emails of these users
        const users = await User.find({ _id: { $in: allowedUserIds } });
        const emails = users.map(u => u.email);
        
        // Fetch Employee IDs matching these emails
        const employees = await Employee.find({ email: { $in: emails } });
        const empIds = employees.map(e => e._id.toString());
        
        // If a specific targetId was requested, make sure it is in our allowed list
        if (query.targetId) {
          if (!empIds.includes(query.targetId.toString())) {
            return NextResponse.json({ error: "Unauthorized to view this incentive" }, { status: 403 });
          }
        } else {
          // Can only view these specific employees OR system defaults (if applicable)
          query.$or = [
            { targetId: { $in: empIds } },
            { targetType: "Designation" },
            { targetType: "Default" }
          ];
        }
      } else {
         // Not an admin and not a team owner. Can't see specific people's incentives.
         return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
      }
    }

    const incentives = await IncentiveConfiguration.find(query)
      .populate("targetId", "firstName lastName employeeCode")
      .populate("createdBy", "firstName lastName")
      .sort({ createdAt: -1 });

    return NextResponse.json(incentives);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();
    const token = req.headers.get("cookie")?.match(/accessToken=([^;]+)/)?.[1];
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const payload = verifyAccessToken(token);
    const userId = payload.userId;
    const role = (payload.role || "").toUpperCase().replace(/_/g, "");

    const body = await req.json();

    if (role !== "ADMIN" && role !== "KEYADMIN") {
      const myTeams = await Team.find({ owner: userId });
      if (myTeams.length > 0) {
        if (body.targetType !== "Employee" && body.targetType !== "TeamOwner") {
          return NextResponse.json({ error: "Team owners can only assign incentives to specific employees" }, { status: 403 });
        }
        
        let allowedUserIds = [userId];
        myTeams.forEach(t => {
          allowedUserIds.push(...t.members.map((id: any) => id.toString()));
        });
        
        const users = await User.find({ _id: { $in: allowedUserIds } });
        const emails = users.map(u => u.email);
        
        const employees = await Employee.find({ email: { $in: emails } });
        const empIds = employees.map(e => e._id.toString());
        
        if (!body.targetId || !empIds.includes(body.targetId.toString())) {
          return NextResponse.json({ error: "Unauthorized to assign incentive to this employee" }, { status: 403 });
        }
        
        // Enforce Budget Constraint (Option A)
        const ownerUser = users.find(u => u._id.toString() === userId.toString());
        const ownerEmployee = ownerUser ? employees.find(e => e.email === ownerUser.email) : null;
        const ownerEmpId = ownerEmployee ? ownerEmployee._id : null;
        
        let ownerConfig = null;
        if (ownerEmpId) {
          ownerConfig = await IncentiveConfiguration.findOne({ targetType: "TeamOwner", targetId: ownerEmpId, isActive: true });
        }
        if (!ownerConfig) {
           ownerConfig = await IncentiveConfiguration.findOne({ targetType: "TeamOwner", targetId: { $exists: false }, isActive: true });
        }
        const maxBudget = ownerConfig?.value || 0;
        
        if (body.incentiveType === "Percentage" && Number(body.value) > maxBudget) {
          return NextResponse.json({ error: `Cannot assign percentage higher than your own team budget (${maxBudget}%)` }, { status: 400 });
        }
        
      } else {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
      }
    }
    
    // Deactivate existing rule of same condition to prevent duplicate
    const query: any = { targetType: body.targetType, isActive: true };
    if (body.targetType === "Employee" || body.targetType === "TeamOwner") {
       if (body.targetId) query.targetId = body.targetId;
       else query.targetId = { $exists: false }; // Global team owner rule
    } else if (body.targetType === "Designation") {
       query.designationName = body.designationName;
    }

    // Inactivate any overlapping active rule
    await IncentiveConfiguration.updateMany(query, { $set: { isActive: false } });

    const newIncentive = await IncentiveConfiguration.create({
      ...body,
      createdBy: userId,
    });

    return NextResponse.json(newIncentive, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
