import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { Employee } from "@/lib/models/Employee";
import { Counter } from "@/lib/models/Counter";
import * as XLSX from "xlsx";

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

    for (const row of rows) {
      try {
        const email = row["Email"];
        if (!email) {
          errors.push(`Row missing Email`);
          continue;
        }

        const existing = await Employee.findOne({ email });
        if (existing) {
          errors.push(`${email} already exists`);
          continue;
        }

        const employeeCode = await getNextEmployeeCode();

        await Employee.create({
          employeeCode,
          firstName: row["First Name"] || "Unknown",
          lastName: row["Last Name"] || "Unknown",
          email: email,
          phone: row["Phone"] || "0000000000",
          department: row["Department"],
          designation: row["Designation"],
          status: row["Status"] || "Active",
          employeeType: row["Employee Type"] || "Full-Time",
          kyc: {
            aadharNumber: row["Aadhar"],
            panNumber: row["PAN"],
          }
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
