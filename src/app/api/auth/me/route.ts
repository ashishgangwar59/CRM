import { NextResponse } from "next/server";
import { verifyAccessToken } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { User } from "@/lib/models/User";
/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Get current authenticated user details
 *     tags: [Auth]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: User profile data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 role:
 *                   type: string
 *                 accessibleModules:
 *                   type: array
 *                   items:
 *                     type: string
 *                 employee:
 *                   type: object
 *       401:
 *         description: Unauthorized
 */
export async function GET(req: Request) {
  try {
    await connectToDatabase();
    const token = req.headers.get("cookie")?.match(/accessToken=([^;]+)/)?.[1];
    if (!token) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const payload = verifyAccessToken(token);
    
    // Fetch latest user data for permissions
    const user = await User.findById(payload.userId).lean();
    const accessibleModules = user?.accessibleModules || ["Overview", "Attendance", "Leads", "Reports", "Profile"];

    // Also fetch the corresponding employee record
    let employeeData = null;
    if (user) {
      // Import Employee here if needed or at the top
      const { Employee } = await import("@/lib/models/Employee");
      employeeData = await Employee.findOne({ email: user.email }).lean();
    }

    return NextResponse.json({ 
      success: true, 
      role: payload.role, 
      accessibleModules,
      employee: employeeData
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Invalid token" }, { status: 401 });
  }
}
/**
 * @swagger
 * /api/auth/me:
 *   put:
 *     summary: Update user profile
 *     tags: [Auth]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               profilePhotoUrl:
 *                 type: string
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *       400:
 *         description: No fields to update
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal server error
 */
export async function PUT(req: Request) {
  try {
    await connectToDatabase();
    const token = req.headers.get("cookie")?.match(/accessToken=([^;]+)/)?.[1];
    if (!token) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const payload = verifyAccessToken(token);
    const user = await User.findById(payload.userId).lean();
    if (!user) return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });

    const body = await req.json();
    if (body.profilePhotoUrl) {
      const { Employee } = await import("@/lib/models/Employee");
      await Employee.findOneAndUpdate(
        { email: user.email },
        { profilePhotoUrl: body.profilePhotoUrl }
      );
      return NextResponse.json({ success: true, message: "Profile photo updated successfully" });
    }

    return NextResponse.json({ success: false, error: "No fields to update" }, { status: 400 });
  } catch (error) {
    console.error("Update Profile Error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
