import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { connectToDatabase } from "@/lib/db";
import { verifyAccessToken } from "@/lib/auth";
import { Employee } from "@/lib/models/Employee";
import { Payroll } from "@/lib/models/Payroll";
import { SalaryStructure } from "@/lib/models/SalaryStructure";
import { calculatePayrollForEmployee } from "@/lib/payrollEngine";

const salaryColumns = [
  "Basic",
  "HRA",
  "Travel Allowance",
  "Self Incentive",
  "Team Incentive",
  "Full Branch Incentive",
  "PF",
  "ESI",
  "Professional Tax",
  "Income Tax/TDS",
  "Advance Salary Drawn",
  "Remarks",
] as const;

type SalaryColumn = (typeof salaryColumns)[number];

function getToken(req: Request): string | null {
  const cookieToken = req.headers.get("cookie")?.match(/accessToken=([^;]+)/)?.[1];
  if (cookieToken) return cookieToken;

  const authHeader = req.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) return authHeader.substring(7).trim();
  return authHeader?.trim() || null;
}

function isValidMonthYear(monthYear: string | null): monthYear is string {
  if (!monthYear || !/^\d{4}-(0[1-9]|1[0-2])$/.test(monthYear)) return false;
  return true;
}

function getAuthorizedAdmin(req: Request) {
  const token = getToken(req);
  if (!token) return null;

  try {
    const payload = verifyAccessToken(token);
    return payload.role === "ADMIN" || payload.role === "KEY_ADMIN" ? payload : null;
  } catch {
    return null;
  }
}

function getWorkbookBuffer(data: Record<string, string | number>[], sheetName: string) {
  const worksheet = XLSX.utils.json_to_sheet(data, {
    header: ["Employee Code", "Employee Name", "Department", "Designation", ...salaryColumns],
  });
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
}

export async function GET(req: Request) {
  try {
    const payload = getAuthorizedAdmin(req);
    if (!payload) return NextResponse.json({ error: "Unauthorized or forbidden" }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const monthYear = searchParams.get("monthYear");
    if (!isValidMonthYear(monthYear)) {
      return NextResponse.json({ error: "A valid month is required (YYYY-MM)." }, { status: 400 });
    }

    await connectToDatabase();
    const employees = await Employee.find({ status: "Active" })
      .select("_id employeeCode firstName lastName department designation")
      .sort({ employeeCode: 1 })
      .lean();
    const structures = await SalaryStructure.find({
      employeeId: { $in: employees.map(employee => employee._id) },
    }).sort({ createdAt: -1 }).lean();

    const structuresByEmployee = new Map<string, typeof structures>();
    for (const structure of structures) {
      const employeeId = structure.employeeId.toString();
      const employeeStructures = structuresByEmployee.get(employeeId) || [];
      employeeStructures.push(structure);
      structuresByEmployee.set(employeeId, employeeStructures);
    }

    const rows = employees.map(employee => {
      const employeeStructures = structuresByEmployee.get(employee._id.toString()) || [];
      const structure = employeeStructures.find(item => item.monthYear === monthYear) || employeeStructures[0];

      return {
        "Employee Code": employee.employeeCode,
        "Employee Name": `${employee.firstName} ${employee.lastName}`.trim(),
        "Department": employee.department || "",
        "Designation": employee.designation || "",
        "Basic": structure?.basic || 0,
        "HRA": structure?.hra || 0,
        "Travel Allowance": structure?.travelAllowance ?? structure?.metroAllowance ?? structure?.specialAllowance ?? 0,
        "Self Incentive": structure?.incentive || 0,
        "Team Incentive": structure?.teamIncentive || 0,
        "Full Branch Incentive": structure?.fullBranchIncentive || 0,
        "PF": structure?.pf || 0,
        "ESI": structure?.esi || 0,
        "Professional Tax": structure?.professionalTax || 0,
        "Income Tax/TDS": structure?.incomeTax || 0,
        "Advance Salary Drawn": structure?.advanceSalaryDrawn || 0,
        "Remarks": structure?.remarks || "",
      };
    });

    const buffer = getWorkbookBuffer(rows, monthYear);
    return new NextResponse(buffer, {
      headers: {
        "Content-Disposition": `attachment; filename="salary-structures-${monthYear}.xlsx"`,
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      },
    });
  } catch (error) {
    console.error("Export Salary Structures Error:", error);
    return NextResponse.json({ error: "Failed to export salary structures." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const payload = getAuthorizedAdmin(req);
    if (!payload) return NextResponse.json({ error: "Unauthorized or forbidden" }, { status: 403 });

    const formData = await req.formData();
    const monthYear = formData.get("monthYear");
    const file = formData.get("file");
    if (typeof monthYear !== "string" || !isValidMonthYear(monthYear)) {
      return NextResponse.json({ error: "A valid month is required (YYYY-MM)." }, { status: 400 });
    }
    if (typeof file === "string" || !file || typeof file !== "object" || !("arrayBuffer" in file) || !("size" in file) || file.size === 0) {
      return NextResponse.json({ error: "Please select a non-empty Excel file." }, { status: 400 });
    }
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "The Excel file must be 10 MB or smaller." }, { status: 400 });
    }

    await connectToDatabase();
    const workbook = XLSX.read(Buffer.from(await file.arrayBuffer()), { type: "buffer" });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = firstSheetName ? workbook.Sheets[firstSheetName] : undefined;
    if (!worksheet) {
      return NextResponse.json({ error: "The Excel file does not contain a worksheet." }, { status: 400 });
    }

    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, { defval: null });
    if (rows.length === 0) {
      return NextResponse.json({ error: "The Excel worksheet has no employee rows." }, { status: 400 });
    }
    if (rows.length > 5000) {
      return NextResponse.json({ error: "The Excel worksheet cannot contain more than 5,000 rows." }, { status: 400 });
    }

    const requiredColumns = ["Employee Code", ...salaryColumns.filter(column => column !== "Remarks")];
    const missingColumns = requiredColumns.filter(column => !Object.prototype.hasOwnProperty.call(rows[0], column));
    if (missingColumns.length > 0) {
      return NextResponse.json({
        error: `Missing required Excel columns: ${missingColumns.join(", ")}.`,
      }, { status: 400 });
    }

    const errors: string[] = [];
    const importedRows: Array<{
      rowNumber: number;
      employeeCode: string;
        amounts: Record<SalaryColumn, number | string>;
    }> = [];
    const seenEmployeeCodes = new Set<string>();

    rows.forEach((row, index) => {
      const rowNumber = index + 2;
      const employeeCode = String(row["Employee Code"] ?? "").trim();
      if (!employeeCode) {
        errors.push(`Row ${rowNumber}: Employee Code is required.`);
        return;
      }
      if (seenEmployeeCodes.has(employeeCode)) {
        errors.push(`Row ${rowNumber}: Employee Code ${employeeCode} appears more than once.`);
        return;
      }
      seenEmployeeCodes.add(employeeCode);

      const amounts = {} as Record<SalaryColumn, number>;
      let validAmounts = true;
      for (const column of salaryColumns) {
        const value = row[column];
        if (column === "Remarks") {
          amounts[column] = value == null ? "" : String(value).trim();
          continue;
        }
        const amount = typeof value === "number" ? value : value === null || value === "" ? NaN : Number(value);
        if (!Number.isFinite(amount) || amount < 0) {
          errors.push(`Row ${rowNumber}: ${column} must be a non-negative number.`);
          validAmounts = false;
        } else {
          amounts[column] = amount;
        }
      }
      if (validAmounts) importedRows.push({ rowNumber, employeeCode, amounts });
    });

    const employees = await Employee.find({
      employeeCode: { $in: importedRows.map(row => row.employeeCode) },
      status: "Active",
    }).select("_id employeeCode");
    const employeeByCode = new Map(employees.map(employee => [employee.employeeCode, employee]));

    for (const row of importedRows) {
      if (!employeeByCode.has(row.employeeCode)) {
        errors.push(`Row ${row.rowNumber}: Active employee ${row.employeeCode} was not found.`);
      }
    }
    if (errors.length > 0) {
      return NextResponse.json({ error: "Import validation failed.", errors }, { status: 400 });
    }

    const structureOperations = importedRows.map(row => {
      const employee = employeeByCode.get(row.employeeCode)!;
      const travelAllowance = row.amounts["Travel Allowance"];
      return {
        updateOne: {
          // Salary structures are unique per employee. Match on employeeId
          // so importing a new month updates the existing structure instead
          // of attempting to insert a duplicate employeeId.
          filter: { employeeId: employee._id },
          update: {
            $set: {
              employeeId: employee._id,
              monthYear,
              basic: row.amounts.Basic,
              hra: row.amounts.HRA,
              travelAllowance,
              metroAllowance: travelAllowance,
              specialAllowance: travelAllowance,
              incentive: row.amounts["Self Incentive"],
              teamIncentive: row.amounts["Team Incentive"],
              fullBranchIncentive: row.amounts["Full Branch Incentive"],
              pf: row.amounts.PF,
              esi: row.amounts.ESI,
              professionalTax: row.amounts["Professional Tax"],
              incomeTax: row.amounts["Income Tax/TDS"],
              advanceSalaryDrawn: row.amounts["Advance Salary Drawn"],
              remarks: row.amounts.Remarks,
              effectiveDate: new Date(`${monthYear}-01T00:00:00.000Z`),
            },
          },
          upsert: true,
        },
      };
    });
    await SalaryStructure.bulkWrite(structureOperations, { ordered: true });

    let refreshedPayrolls = 0;
    const payrollRefreshFailures: string[] = [];
    for (const row of importedRows) {
      const employee = employeeByCode.get(row.employeeCode)!;
      try {
        const existingPayroll = await Payroll.findOne({ employeeId: employee._id, monthYear });
        if (existingPayroll && existingPayroll.status !== "Draft") continue;

        const result = await calculatePayrollForEmployee(
          employee._id.toString(),
          monthYear,
          0,
          0,
          30,
          0,
          false,
          payload.userId
        );
        await Payroll.findOneAndUpdate(
          { employeeId: employee._id, monthYear },
          {
            paidDays: result.paidDays,
            totalDays: result.totalDays,
            earnings: result.earnings,
            deductions: result.deductions,
            grossSalary: result.grossSalary,
            totalDeductions: result.totalDeductions,
            netSalary: result.netSalary,
            status: "Draft",
          },
          { new: true, upsert: true }
        );
        refreshedPayrolls++;
      } catch (error) {
        console.error(`Failed to refresh draft payroll for ${row.employeeCode} (${monthYear}):`, error);
        payrollRefreshFailures.push(row.employeeCode);
      }
    }

    return NextResponse.json({
      success: true,
      imported: importedRows.length,
      refreshedPayrolls,
      skippedLockedPayrolls: importedRows.length - refreshedPayrolls - payrollRefreshFailures.length,
      payrollRefreshFailures,
    });
  } catch (error) {
    console.error("Import Salary Structures Error:", error);
    return NextResponse.json({
      error: "Failed to import salary structures.",
      details: error instanceof Error ? error.message : "Unexpected import error.",
    }, { status: 500 });
  }
}
