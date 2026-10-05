import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { verifyAccessToken } from "@/lib/auth";
import { User } from "@/lib/models/User";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    await connectToDatabase();
    const token = req.headers.get("cookie")?.match(/accessToken=([^;]+)/)?.[1];
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const payload = verifyAccessToken(token);
    
    // Use aggregation to join with Employee and Investor to get firstName and lastName
    // Exclude users with the INVESTOR role from this API completely
    const users = await User.aggregate([
      {
        $match: {
          role: { $ne: "INVESTOR" }
        }
      },
      {
        $lookup: {
          from: "employees",
          localField: "email",
          foreignField: "email",
          as: "employeeData"
        }
      },
      {
        $lookup: {
          from: "investors",
          localField: "email",
          foreignField: "email",
          as: "investorData"
        }
      },
      {
        $addFields: {
          firstName: {
            $cond: {
              if: { $gt: [{ $size: "$employeeData" }, 0] },
              then: { $arrayElemAt: ["$employeeData.firstName", 0] },
              else: {
                $cond: {
                  if: { $gt: [{ $size: "$investorData" }, 0] },
                  then: { $arrayElemAt: ["$investorData.firstName", 0] },
                  else: ""
                }
              }
            }
          },
          lastName: {
            $cond: {
              if: { $gt: [{ $size: "$employeeData" }, 0] },
              then: { $arrayElemAt: ["$employeeData.lastName", 0] },
              else: {
                $cond: {
                  if: { $gt: [{ $size: "$investorData" }, 0] },
                  then: { $arrayElemAt: ["$investorData.lastName", 0] },
                  else: ""
                }
              }
            }
          }
        }
      },
      {
        $project: {
          password: 0,
          employeeData: 0,
          investorData: 0
        }
      },
      { $sort: { createdAt: -1 } }
    ]);
    
    return NextResponse.json({ success: true, data: users });
  } catch (error) {
    console.error("Users GET Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    await connectToDatabase();
    const token = req.headers.get("cookie")?.match(/accessToken=([^;]+)/)?.[1];
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const payload = verifyAccessToken(token);
    // Only KEY_ADMIN can assign ADMIN roles
    if (payload.role !== "KEY_ADMIN") {
      return NextResponse.json({ error: "Forbidden: Only Key Admin can update roles" }, { status: 403 });
    }

    const { email, role } = await req.json();
    if (!email || !role) {
      return NextResponse.json({ error: "Email and role required" }, { status: 400 });
    }

    const updatedUser = await User.findOneAndUpdate(
      { email },
      { role },
      { new: true }
    ).select("-password").lean();

    if (!updatedUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "User role updated", data: updatedUser });
  } catch (error) {
    console.error("Users PUT Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
