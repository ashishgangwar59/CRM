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
      typeSecured,
      typeNonConvertible,
      typeRedeemable,
      faceValue,
      noOfDebentures,
      numDebenturesWords,
      totalApplicationAmount,
      totalApplicationAmountWords,
      modeOfPayment,
      paymentModeOther,
      bankName,
      accountNo,
      ifscCode,
      chequeDdNo,
      chequeDdDate,
      transactionUtrNo,
      drawnOnBank,
      place,
      declDay,
      declMonth,
      declYear,
      passportPhotoUrl,
      panDocUrl,
      aadharDocUrl,
      bankPassbookUrl,
      refEmpCode,
      nomineeName,
      nomineeRelation,
      nomineeAge,
      nomineeDocUrl,
    } = data;

    // --- Validation Rules ---
    if (!fullName || !fullName.trim()) {
      return NextResponse.json({ error: "Full Name (Applicant) is required." }, { status: 400 });
    }

    if (!email || !email.trim()) {
      return NextResponse.json({ error: "Email Address is required." }, { status: 400 });
    }
    const cleanEmail = email.toLowerCase().trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
    }

    if (!phone || !phone.trim()) {
      return NextResponse.json({ error: "Mobile Phone Number is required." }, { status: 400 });
    }
    const cleanPhone = phone.trim().replace(/\D/g, "");
    if (cleanPhone.length < 10) {
      return NextResponse.json({ error: "Please enter a valid 10-digit mobile number." }, { status: 400 });
    }

    if (panNumber && panNumber.trim().length > 0 && panNumber.trim().length !== 10) {
      return NextResponse.json({ error: "PAN Number must be 10 characters." }, { status: 400 });
    }

    if (!noOfDebentures || Number(noOfDebentures) <= 0) {
      return NextResponse.json({ error: "No. of Debentures Applied must be greater than 0." }, { status: 400 });
    }

    const calculatedTotal = Number(faceValue || 1000) * Number(noOfDebentures || 1);

    // Check if user or investor already exists with this email
    const existingUser = await User.findOne({ email: cleanEmail });
    if (existingUser) {
      return NextResponse.json({ error: "This Email is already registered in the system." }, { status: 400 });
    }

    const existingInvestor = await Investor.findOne({ email: cleanEmail });
    if (existingInvestor) {
      return NextResponse.json({ error: "An application with this email already exists." }, { status: 400 });
    }

    // Resolve referral employee if provided
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

    // Create login User account for Investor (Default password: Investor@123)
    const hashedPassword = await bcrypt.hash("Investor@123", 10);
    const user = await User.create({
      email: cleanEmail,
      password: hashedPassword,
      role: "INVESTOR",
      accessibleModules: ["Investor Details", "Profile"],
    });

    const investorCode = await getNextInvestorCode();
    const applicationNo = data.applicationNo && data.applicationNo.trim() ? data.applicationNo.trim() : await getNextApplicationNo();

    const applicationDateStr = declDay && declMonth && declYear
      ? `${declYear}-${declMonth.padStart(2, '0')}-${declDay.padStart(2, '0')}`
      : new Date().toISOString().split("T")[0];

    const investor = await Investor.create({
      investorCode,
      userId: user._id,
      fullName: fullName.trim(),
      email: cleanEmail,
      phone: cleanPhone,
      investmentAmount: calculatedTotal,
      monthlyGrowthPercentage: 2.5,
      status: "Pending",
      referralEmployeeId,
      referralEmployeeName,
      debentureForm: {
        applicationNo,
        applicationDate: applicationDateStr,
        fatherSpouseName: fatherSpouseName ? fatherSpouseName.trim() : "",
        dob: dob || "",
        address: address ? address.trim() : "",
        city: city ? city.trim() : "",
        state: state ? state.trim() : "",
        pinCode: pinCode ? pinCode.trim() : "",
        occupation: occupation ? occupation.trim() : "",
        typeOfDebenture: typeOfDebenture || (typeSecured ? "Secured" : "Debenture"),
        typeSecured: Boolean(typeSecured),
        typeNonConvertible: Boolean(typeNonConvertible),
        typeRedeemable: Boolean(typeRedeemable),
        faceValue: Number(faceValue || 1000),
        noOfDebentures: Number(noOfDebentures || 1),
        numDebenturesWords: numDebenturesWords || "",
        totalApplicationAmount: calculatedTotal,
        totalApplicationAmountWords: totalApplicationAmountWords || "",
        modeOfPayment: modeOfPayment || "NEFT/RTGS",
        paymentModeOther: paymentModeOther || "",
        bankName: bankName || "",
        accountNo: accountNo || "",
        ifscCode: ifscCode || "",
        chequeDdNo: chequeDdNo || "",
        chequeDdDate: chequeDdDate || "",
        transactionUtrNo: transactionUtrNo || "",
        drawnOnBank: drawnOnBank || "",
        place: place || "",
        passportPhotoUrl: passportPhotoUrl || "",
        nomineeName: nomineeName ? nomineeName.trim() : "",
        nomineeRelation: nomineeRelation ? nomineeRelation.trim() : "",
        nomineeAge: nomineeAge ? nomineeAge.trim() : "",
        nomineeDocUrl: nomineeDocUrl || "",
      },
      nomineeName: nomineeName ? nomineeName.trim() : "",
      nomineeRelation: nomineeRelation ? nomineeRelation.trim() : "",
      nomineeAge: nomineeAge ? nomineeAge.trim() : "",
      nomineeDocUrl: nomineeDocUrl || "",
      kycDocs: {
        panNumber: panNumber ? panNumber.toUpperCase().trim() : "",
        panDocUrl: panDocUrl || "",
        aadharDocUrl: aadharDocUrl || "",
        bankPassbookUrl: bankPassbookUrl || "",
        bankName: bankName || "",
        accountNumber: accountNo || "",
        ifscCode: ifscCode || "",
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
        message: "Debenture Application submitted and stored in Database successfully!",
        data: { applicationNo, investorCode, investor },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Debenture Application API Error:", error);
    if (error.code === 11000) {
      return NextResponse.json({ error: "This Email or Application Number is already registered." }, { status: 400 });
    }
    return NextResponse.json({ error: error.message || "Failed to submit application." }, { status: 400 });
  }
}
