import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { Employee } from "@/lib/models/Employee";
import * as XLSX from "xlsx";

export async function GET(req: Request) {
  try {
    await connectToDatabase();
    
    // Parse filters
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const department = searchParams.get("department") || "";
    const status = searchParams.get("status") || "";

    const query: any = {};
    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: "i" } },
        { lastName: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { employeeCode: { $regex: search, $options: "i" } },
      ];
    }
    if (department) query.department = department;
    if (status) query.status = status;

    const employees = await Employee.find(query).sort({ createdAt: -1 }).lean();

    // Flatten data for Excel
    const data = employees.map((emp: any) => ({
      "Employee Code": emp.employeeCode,
      "First Name": emp.firstName,
      "Last Name": emp.lastName,
      "Email": emp.email,
      "Phone": emp.phone,
      "Department": emp.department || "",
      "Designation": emp.designation || "",
      "Status": emp.status,
      "Employee Type": emp.employeeType,
      "Aadhar": emp.kyc?.aadharNumber || "",
      "PAN": emp.kyc?.panNumber || "",
      "Joined Date": emp.dateOfJoining ? new Date(emp.dateOfJoining).toLocaleDateString() : "",
    }));

    // Generate Excel File
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Employees");
    
    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Disposition": 'attachment; filename="employees.xlsx"',
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      },
    });

  } catch (error) {
    console.error("Export Employees Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
