import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { User } from "@/lib/models/User";
import { Investor } from "@/lib/models/Investor";
import { Counter } from "@/lib/models/Counter";
import { Otp } from "@/lib/models/Otp";
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
    const { fullName, email, phone, password, otp } = await req.json();

    if (!fullName || !email || !phone || !password || !otp) {
      return NextResponse.json({ error: "All fields including verification OTP are required" }, { status: 400 });
    }

    // Verify OTP code
    const otpRecord = await Otp.findOne({ phone: phone.trim() });
    if (!otpRecord) {
      return NextResponse.json({ error: "Verification OTP not found or expired. Please request a new code." }, { status: 400 });
    }

    const isMockBypass = process.env.NODE_ENV !== "production" && otp === "123456";
    if (otpRecord.otp !== otp.trim() && !isMockBypass) {
      return NextResponse.json({ error: "Incorrect verification code. Please check your phone." }, { status: 400 });
    }

    // Delete OTP on successful verification
    await Otp.deleteOne({ _id: otpRecord._id });

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
