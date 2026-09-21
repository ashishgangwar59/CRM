import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { Team } from "@/lib/models/Team";
import { User } from "@/lib/models/User";
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

// GET: Fetch teams based on role
export async function GET(req: Request) {
  try {
    await connectToDatabase();
    const token = getToken(req);
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const payload = verifyAccessToken(token);
    const role = (payload.role || "").toUpperCase();
    const userId = payload.userId;

    let teams = [];
    if (role === "ADMIN" || role === "KEY_ADMIN") {
      // Admins see all teams
      teams = await Team.find({}).populate("owner", "email role").populate("members", "email role");
    } else {
      // Regular users or Team Owners only see teams they are part of or own
      teams = await Team.find({ $or: [{ owner: userId }, { members: userId }] })
        .populate("owner", "email role")
        .populate("members", "email role");
    }

    return NextResponse.json({ success: true, data: teams });
  } catch (error: any) {
    console.error("GET Teams Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST: Create a team (Admin only)
export async function POST(req: Request) {
  try {
    await connectToDatabase();
    const token = getToken(req);
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const payload = verifyAccessToken(token);
    const role = (payload.role || "").toUpperCase();

    if (role !== "ADMIN" && role !== "KEY_ADMIN") {
      return NextResponse.json({ error: "Forbidden: Only admins can create teams" }, { status: 403 });
    }

    const { name, owner, members, department } = await req.json();

    if (!name || !owner) {
      return NextResponse.json({ error: "Team name and owner are required" }, { status: 400 });
    }

    const newTeam = new Team({
      name,
      owner,
      department: department || "General",
      members: members || [],
    });

    await newTeam.save();

    return NextResponse.json({ success: true, data: newTeam });
  } catch (error: any) {
    console.error("POST Team Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
