import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { Investor } from "@/lib/models/Investor";
import { User } from "@/lib/models/User";
import { Counter } from "@/lib/models/Counter";
import bcrypt from "bcryptjs";
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

async function getNextInvestorCode() {
  const counter = await Counter.findByIdAndUpdate(
    { _id: "investorCode" },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return `INV-${counter.seq.toString().padStart(4, "0")}`;
}

// POST: Admin manually adds investor
export async function POST(req: Request) {
  try {
    await connectToDatabase();
    const token = getToken(req);
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const payload = verifyAccessToken(token);
    const role = (payload.role || "").toUpperCase().replace("_", "");
    if (role !== "KEYADMIN" && role !== "ADMIN" && role !== "MANAGER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const data = await req.json();
    const { fullName, email, phone, investmentAmount, monthlyGrowthPercentage, status } = data;

    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      return NextResponse.json({ error: "Email is already registered" }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash("Investor@123", 10);
    const user = await User.create({
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      role: "INVESTOR",
      accessibleModules: ["Investor Details", "Profile"],
    });

    const investorCode = await getNextInvestorCode();
    const investor = await Investor.create({
      investorCode,
      userId: user._id,
      fullName,
      email: email.toLowerCase().trim(),
      phone,
      investmentAmount: Number(investmentAmount || 0),
      monthlyGrowthPercentage: Number(monthlyGrowthPercentage || 2.5),
      status: "Pending",
      kycDocs: {},
      docVerifications: {
        aadhar: "Pending",
        pan: "Pending",
        marksheet10th: "Pending",
        marksheet12th: "Pending",
        graduation: "Pending",
        postGraduation: "Pending",
        bankPassbook: "Pending",
      },
      bondAgreement: { accepted: false },
    });

    return NextResponse.json({ success: true, data: investor }, { status: 201 });
  } catch (error: any) {
    console.error("Admin Create Investor Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
