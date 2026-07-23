import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/db";
import { Investor } from "@/lib/models/Investor";
import { User } from "@/lib/models/User";
import { Counter } from "@/lib/models/Counter";
import { verifyAccessToken } from "@/lib/auth";
import bcrypt from "bcryptjs";

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

// GET profile (for investor self or list for Admin)
export async function GET(req: Request) {
  try {
    await connectToDatabase();
    const token = getToken(req);
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    let payload;
    try {
      payload = verifyAccessToken(token);
    } catch {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const user = await User.findById(payload.userId).lean();
    const userRole = (user?.role || payload?.role || "").toUpperCase().replace(/_/g, "");

    // If Admin / KeyAdmin / Manager / Employee: Return all investors with search
    if (userRole === "KEYADMIN" || userRole === "ADMIN" || userRole === "MANAGER" || userRole === "EMPLOYEE") {
      const { searchParams } = new URL(req.url);
      const search = searchParams.get("search") || "";
      const status = searchParams.get("status") || "";

      const query: any = {};
      if (search) {
        query.$or = [
          { fullName: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } },
          { phone: { $regex: search, $options: "i" } },
          { investorCode: { $regex: search, $options: "i" } },
        ];
      }
      if (status && status !== "ALL") query.status = status;

      const investors = await Investor.find(query).sort({ createdAt: -1 }).lean();
      return NextResponse.json({ success: true, data: investors });
    }

    // If Investor self login: Return their investor profile
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    let investor = await Investor.findOne({ userId: user._id });
    if (!investor) {
      investor = await Investor.findOne({ email: { $regex: `^${user.email}$`, $options: "i" } });
    }

    if (!investor) {
      return NextResponse.json({ error: "Investor profile not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: investor });
  } catch (error) {
    console.error("Get Investor Profile Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST: Create / Register new Investor
export async function POST(req: Request) {
  try {
    await connectToDatabase();
    const body = await req.json();
    const { fullName, email, phone, password, investmentAmount, monthlyGrowthPercentage, referralEmployeeName } = body;

    if (!fullName || !email) {
      return NextResponse.json({ error: "Full Name and Email are required" }, { status: 400 });
    }

    const cleanEmail = email.toLowerCase().trim();

    const existingUser = await User.findOne({ email: cleanEmail });
    if (existingUser) {
      return NextResponse.json({ error: "User account with this email already exists" }, { status: 400 });
    }

    const existingInvestor = await Investor.findOne({ email: cleanEmail });
    if (existingInvestor) {
      return NextResponse.json({ error: "Investor profile with this email already exists" }, { status: 400 });
    }

    const passToHash = password || "Investor@123";
    const hashedPassword = await bcrypt.hash(passToHash, 10);

    const user = await User.create({
      email: cleanEmail,
      password: hashedPassword,
      role: "INVESTOR",
      accessibleModules: ["Investor Details", "Profile"],
    });

    const counter = await Counter.findByIdAndUpdate(
      { _id: "investorCode" },
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );
    const investorCode = `INV-${counter.seq.toString().padStart(4, "0")}`;

    const investor = await Investor.create({
      investorCode,
      userId: user._id,
      fullName: fullName.trim(),
      email: cleanEmail,
      phone: phone ? phone.trim() : "",
      investmentAmount: Number(investmentAmount) || 0,
      monthlyGrowthPercentage: Number(monthlyGrowthPercentage) || 2.5,
      referralEmployeeName: referralEmployeeName ? referralEmployeeName.trim() : "Direct / Self",
      status: "Pending",
      kycDocs: {},
      bondAgreement: { accepted: false },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Investor created successfully",
        data: investor,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Create Investor Error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}

// PUT: Investor self-updates KYC / Bond or Admin updates Investment / Status
export async function PUT(req: Request) {
  try {
    await connectToDatabase();
    const token = getToken(req);
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    let payload;
    try {
      payload = verifyAccessToken(token);
    } catch {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const role = (payload.role || "").toUpperCase().replace("_", "");
    const body = await req.json();

    // If Admin/KeyAdmin verifying/editing an investor
    if (role === "KEYADMIN" || role === "ADMIN" || role === "MANAGER") {
      const { investorId, status, rejectionReason, investmentAmount, monthlyGrowthPercentage, fullName, phone, email, docVerifications } = body;

      const updateData: any = {};
      if (status) updateData.status = status;
      if (rejectionReason !== undefined) updateData.rejectionReason = rejectionReason;
      if (investmentAmount !== undefined) updateData.investmentAmount = Number(investmentAmount);
      if (monthlyGrowthPercentage !== undefined) updateData.monthlyGrowthPercentage = Number(monthlyGrowthPercentage);
      if (fullName) updateData.fullName = fullName;
      if (phone) updateData.phone = phone;
      if (email) updateData.email = email;

      const currentInvestor = await Investor.findById(investorId);
      if (!currentInvestor) return NextResponse.json({ error: "Investor not found" }, { status: 404 });

      if (docVerifications) {
        const currentDocVerifications = currentInvestor.docVerifications ? currentInvestor.toObject().docVerifications : {};
        const mergedDocs = {
          aadhar: "Pending",
          pan: "Pending",
          marksheet10th: "Pending",
          marksheet12th: "Pending",
          graduation: "Pending",
          postGraduation: "Pending",
          bankPassbook: "Pending",
          ...currentDocVerifications,
          ...docVerifications,
        };

        currentInvestor.docVerifications = mergedDocs;
        currentInvestor.markModified("docVerifications");

        // Auto check if mandatory docs (aadhar, pan, marksheet10th, marksheet12th, bankPassbook) are all Approved
        const mandatoryList = ["aadhar", "pan", "marksheet10th", "marksheet12th", "bankPassbook"];
        const anyRejected = mandatoryList.some(doc => mergedDocs[doc as keyof typeof mergedDocs] === "Rejected");
        const allApproved = mandatoryList.every(doc => mergedDocs[doc as keyof typeof mergedDocs] === "Approved");

        if (anyRejected) {
          currentInvestor.status = "Rejected";
        } else if (allApproved && currentInvestor.bondAgreement?.accepted) {
          currentInvestor.status = "Verified";
          currentInvestor.verifiedBy = new mongoose.Types.ObjectId(payload.userId);
          currentInvestor.verifiedAt = new Date();
        }
      }

      if (status) currentInvestor.status = status;
      if (rejectionReason !== undefined) currentInvestor.rejectionReason = rejectionReason;
      if (investmentAmount !== undefined) currentInvestor.investmentAmount = Number(investmentAmount);
      if (monthlyGrowthPercentage !== undefined) currentInvestor.monthlyGrowthPercentage = Number(monthlyGrowthPercentage);
      if (fullName) currentInvestor.fullName = fullName;
      if (phone) currentInvestor.phone = phone;
      if (email) currentInvestor.email = email;

      if (status === "Verified") {
        currentInvestor.verifiedBy = new mongoose.Types.ObjectId(payload.userId);
        currentInvestor.verifiedAt = new Date();
      }

      await currentInvestor.save();
      return NextResponse.json({ success: true, data: currentInvestor });
    }

    // Investor self-update (KYC Docs, Bond Agreement, Investment Amount request)
    const user = await User.findById(payload.userId);
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    let investor = await Investor.findOne({ userId: user._id });
    if (!investor) {
      investor = await Investor.findOne({ email: { $regex: `^${user.email}$`, $options: "i" } });
    }

    if (!investor) {
      return NextResponse.json({ error: "Investor profile not found" }, { status: 404 });
    }

    const { investmentAmount, kycDocs, bondAgreement } = body;

    if (investmentAmount !== undefined) {
      investor.investmentAmount = Number(investmentAmount);
    }

    if (kycDocs) {
      investor.kycDocs = { ...investor.kycDocs, ...kycDocs };
      
      // Initialize docVerifications if missing
      if (!investor.docVerifications) {
        investor.docVerifications = {
          aadhar: "Pending",
          pan: "Pending",
          marksheet10th: "Pending",
          marksheet12th: "Pending",
          graduation: "Pending",
          postGraduation: "Pending",
          bankPassbook: "Pending",
        };
      }
    }

    if (bondAgreement) {
      investor.bondAgreement = {
        accepted: !!bondAgreement.accepted,
        signatureText: bondAgreement.signatureText || investor.fullName,
        acceptedAt: new Date(),
      };
    }

    // When details are submitted by investor, ensure status is set to Pending for Admin review
    investor.status = "Pending";
    investor.markModified("kycDocs");
    investor.markModified("docVerifications");
    investor.markModified("bondAgreement");
    await investor.save();

    return NextResponse.json({ success: true, data: investor });
  } catch (error) {
    console.error("Update Investor Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE: Admin / KeyAdmin deletes investor profile and user account
export async function DELETE(req: Request) {
  try {
    await connectToDatabase();
    const token = getToken(req);
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    let payload;
    try {
      payload = verifyAccessToken(token);
    } catch {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const role = (payload.role || "").toUpperCase().replace("_", "");
    if (role !== "KEYADMIN" && role !== "ADMIN" && role !== "MANAGER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const investorId = searchParams.get("id");

    if (!investorId) {
      return NextResponse.json({ error: "Investor ID is required" }, { status: 400 });
    }

    const investor = await Investor.findById(investorId);
    if (!investor) {
      return NextResponse.json({ error: "Investor not found" }, { status: 404 });
    }

    // Delete associated user account if present
    if (investor.userId) {
      await User.findByIdAndDelete(investor.userId);
    } else if (investor.email) {
      await User.findOneAndDelete({ email: investor.email });
    }

    // Delete investor record
    await Investor.findByIdAndDelete(investorId);

    return NextResponse.json({ success: true, message: "Investor deleted successfully" });
  } catch (error) {
    console.error("Delete Investor Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
