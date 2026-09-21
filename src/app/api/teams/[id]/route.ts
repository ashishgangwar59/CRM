import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { Team } from "@/lib/models/Team";
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

// PUT: Update a team (Admins can do anything, Team Owner can add/remove members)
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectToDatabase();
    const token = getToken(req);
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const payload = verifyAccessToken(token);
    const role = (payload.role || "").toUpperCase();
    const userId = payload.userId;
    const { id } = await params;

    const team = await Team.findById(id);
    if (!team) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }

    if (role !== "ADMIN" && role !== "KEY_ADMIN" && team.owner.toString() !== userId) {
      return NextResponse.json({ error: "Forbidden: You do not have permission to edit this team" }, { status: 403 });
    }

    const updates = await req.json();

    // If not admin, don't allow changing owner, name, or department
    if (role !== "ADMIN" && role !== "KEY_ADMIN") {
      delete updates.owner;
      delete updates.name;
      delete updates.department;
    }

    const updatedTeam = await Team.findByIdAndUpdate(id, updates, { new: true })
      .populate("owner", "email role")
      .populate("members", "email role");

    return NextResponse.json({ success: true, data: updatedTeam });
  } catch (error: any) {
    console.error("PUT Team Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// DELETE: Delete a team (Admin only)
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectToDatabase();
    const token = getToken(req);
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const payload = verifyAccessToken(token);
    const role = (payload.role || "").toUpperCase();
    const { id } = await params;

    if (role !== "ADMIN" && role !== "KEY_ADMIN") {
      return NextResponse.json({ error: "Forbidden: Only admins can delete teams" }, { status: 403 });
    }

    await Team.findByIdAndDelete(id);

    return NextResponse.json({ success: true, message: "Team deleted successfully" });
  } catch (error: any) {
    console.error("DELETE Team Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
