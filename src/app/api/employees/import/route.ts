import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { Employee } from "@/lib/models/Employee";
import { User } from "@/lib/models/User";
import { Counter } from "@/lib/models/Counter";
import * as XLSX from "xlsx";
import bcrypt from "bcryptjs";
import { verifyAccessToken } from "@/lib/auth";

async function getNextEmployeeCode() {
  const counter = await Counter.findByIdAndUpdate(
    { _id: "employeeCode" },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return `EMP-${counter.seq.toString().padStart(4, "0")}`;
}

export async function POST(req: Request) {
  try {
    await connectToDatabase();
    
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No Excel file provided" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    const rows: any[] = XLSX.utils.sheet_to_json(worksheet);

    let importedCount = 0;
    const errors = [];
    
    const token = req.headers.get("cookie")?.match(/accessToken=([^;]+)/)?.[1];
    let createdBy = null;
    if (token) {
      try {
        const payload = verifyAccessToken(token);
        createdBy = payload.userId;
      } catch (e) {
        // Ignore token errors for import, but it should be valid
      }
    }

    for (const row of rows) {
      try {
        const email = row["Email"];
        if (!email) {
          errors.push(`Row missing Email`);
          continue;
        }

        const existingUser = await User.findOne({ email });
        if (existingUser) {
          errors.push(`${email} already registered as User`);
          continue;
        }

        const existingEmployee = await Employee.findOne({ email });
        if (existingEmployee) {
          errors.push(`${email} already registered as Employee`);
          continue;
        }

        const employeeCode = await getNextEmployeeCode();

        await Employee.create({
          employeeCode,
          firstName: row["First Name"] || "Unknown",
          lastName: row["Last Name"] || "Unknown",
          email: email,
          phone: row["Phone"] || "0000000000",
          dateOfBirth: row["Date of Birth"] ? new Date(row["Date of Birth"]) : undefined,
          gender: row["Gender"],
          bloodGroup: row["Blood Group"],
          maritalStatus: row["Marital Status"],
          department: row["Department"],
          designation: row["Designation"],
          status: row["Status"] || "Active",
          employeeType: row["Employee Type"] || "Full-Time",
          dateOfJoining: row["Joined Date"] ? new Date(row["Joined Date"]) : undefined,
          workLocation: row["Work Location"],
          kyc: {
            aadharNumber: row["Aadhar"]?.toString(),
            panNumber: row["PAN"]?.toString(),
            passportNumber: row["Passport Number"]?.toString(),
          },
          bankDetails: {
            bankName: row["Bank Name"]?.toString(),
            accountNumber: row["Bank Account"]?.toString(),
            ifscCode: row["IFSC Code"]?.toString(),
            branchName: row["Bank Branch"]?.toString(),
          },
          emergencyContact: {
            name: row["Emergency Contact Name"],
            relationship: row["Emergency Contact Relation"],
            phone: row["Emergency Contact Phone"]?.toString(),
          },
          createdBy
        });

        // Generate User account so they can log in
        const rawPassword = "Employee@123";
        const hashedPassword = await bcrypt.hash(rawPassword, 10);
        
        await User.create({
          email,
          password: hashedPassword,
          role: "Employee",
          accessibleModules: ["Overview", "Attendance", "Leads", "Reports", "Profile"],
        });

        importedCount++;
      } catch (err: any) {
        errors.push(`Failed to import row: ${err.message}`);
      }
    }

    return NextResponse.json({ 
      success: true, 
      imported: importedCount, 
      errors 
    });
  } catch (error) {
    console.error("Import Employees Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
