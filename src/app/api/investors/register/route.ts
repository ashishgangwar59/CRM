import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { User } from "@/lib/models/User";
import { Investor } from "@/lib/models/Investor";
import { Counter } from "@/lib/models/Counter";
import bcrypt from "bcryptjs";

async function getNextInvestorCode() {
  const counter = await Counter.findByIdAndUpdate(
    { _id: "investorCode" },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return `INV-${counter.seq.toString().padStart(4, "0")}`;
}

export async function POST(req: Request) {
  try {
    await connectToDatabase();
    const { fullName, email, phone, password } = await req.json();

    if (!fullName || !email || !phone || !password) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      return NextResponse.json({ error: "Email is already registered" }, { status: 400 });
    }

    const existingInvestor = await Investor.findOne({ email: email.toLowerCase().trim() });
    if (existingInvestor) {
      return NextResponse.json({ error: "Email is already registered as Investor" }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
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
      investmentAmount: 0,
      monthlyGrowthPercentage: 2.5, // Default monthly growth 2.5%
      status: "Pending",
      kycDocs: {},
      bondAgreement: { accepted: false },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Investor registered successfully. Please login to complete KYC & Bond agreement.",
        data: { user, investor },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Investor Register Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
