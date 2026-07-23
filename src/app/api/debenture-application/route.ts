import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { User } from "@/lib/models/User";
import { Investor } from "@/lib/models/Investor";
import { Employee } from "@/lib/models/Employee";
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

async function getNextApplicationNo() {
  const counter = await Counter.findByIdAndUpdate(
    { _id: "debentureAppNo" },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return `APP-${counter.seq.toString().padStart(5, "0")}`;
}

export async function POST(req: Request) {
  try {
    await connectToDatabase();
    const data = await req.json();

    const {
      fullName,
      email,
      phone,
      fatherSpouseName,
      dob,
      address,
      city,
      state,
      pinCode,
      panNumber,
      occupation,
      typeOfDebenture,
      faceValue,
      noOfDebentures,
      totalApplicationAmount,
      modeOfPayment,
      chequeDdNo,
      chequeDdDate,
      transactionUtrNo,
      drawnOnBank,
      passportPhotoUrl,
      panDocUrl,
      aadharDocUrl,
      bankPassbookUrl,
      refEmpCode,
    } = data;

    if (!fullName || !email || !phone) {
      return NextResponse.json({ error: "Applicant Name, Email, and Mobile number are required." }, { status: 400 });
    }

    const cleanEmail = email.toLowerCase().trim();

    // Check if user already exists
    const existingUser = await User.findOne({ email: cleanEmail });
    if (existingUser) {
      return NextResponse.json({ error: "Email is already registered in the system." }, { status: 400 });
    }

    const existingInvestor = await Investor.findOne({ email: cleanEmail });
    if (existingInvestor) {
      return NextResponse.json({ error: "An application with this email already exists." }, { status: 400 });
    }

    // Resolve referral employee if employee code, ID, or email provided
    let referralEmployeeId = undefined;
    let referralEmployeeName = undefined;
    if (refEmpCode) {
      const cleanRef = refEmpCode.trim();
      const emp = await Employee.findOne({
        $or: [
          { employeeCode: cleanRef },
          { employeeId: cleanRef },
          { email: cleanRef.toLowerCase() },
          { officeEmail: cleanRef.toLowerCase() },
        ],
      });
      if (emp) {
        referralEmployeeId = emp._id;
        referralEmployeeName = `${emp.firstName} ${emp.lastName}`.trim();
      }
    }

    // Create login User account (Default password: Investor@123)
    const hashedPassword = await bcrypt.hash("Investor@123", 10);
    const user = await User.create({
      email: cleanEmail,
      password: hashedPassword,
      role: "INVESTOR",
      accessibleModules: ["Investor Details", "Profile"],
    });

    const investorCode = await getNextInvestorCode();
    const applicationNo = await getNextApplicationNo();

    const investor = await Investor.create({
      investorCode,
      userId: user._id,
      fullName: fullName.trim(),
      email: cleanEmail,
      phone: phone.trim(),
      investmentAmount: Number(totalApplicationAmount || 0),
      monthlyGrowthPercentage: 2.5,
      status: "Pending",
      referralEmployeeId,
      referralEmployeeName,
      debentureForm: {
        applicationNo,
        applicationDate: new Date().toISOString().split("T")[0],
        fatherSpouseName,
        dob,
        address,
        city,
        state,
        pinCode,
        occupation,
        typeOfDebenture: typeOfDebenture || "Secured",
        faceValue: Number(faceValue || 1000),
        noOfDebentures: Number(noOfDebentures || 1),
        totalApplicationAmount: Number(totalApplicationAmount || 0),
        modeOfPayment: modeOfPayment || "NEFT/RTGS",
        chequeDdNo,
        chequeDdDate,
        transactionUtrNo,
        drawnOnBank,
        passportPhotoUrl,
      },
      kycDocs: {
        panNumber,
        panDocUrl,
        aadharDocUrl,
        bankPassbookUrl,
      },
      docVerifications: {
        aadhar: aadharDocUrl ? "Pending" : "Pending",
        pan: panDocUrl ? "Pending" : "Pending",
        marksheet10th: "Pending",
        marksheet12th: "Pending",
        bankPassbook: bankPassbookUrl ? "Pending" : "Pending",
      },
      bondAgreement: { accepted: true, signatureText: fullName },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Debenture Application submitted successfully!",
        data: { applicationNo, investorCode, investor },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Debenture Application API Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
