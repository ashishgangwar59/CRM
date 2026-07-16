import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { User } from "@/lib/models/User";

export async function GET() {
  await connectToDatabase();
  const res1 = await User.updateMany({ role: "KEY_ADMIN" }, { $set: { role: "KEY_ADMIN" } });
  const res2 = await User.updateMany({ role: "SUPER_ADMIN" }, { $set: { role: "KEY_ADMIN" } });
  
  const allUsers = await User.find({}).select("email role");
  
  return NextResponse.json({ 
    migratedSuperAdmin: res1.modifiedCount,
    migratedSUPER_ADMIN: res2.modifiedCount,
    users: allUsers 
  });
}
