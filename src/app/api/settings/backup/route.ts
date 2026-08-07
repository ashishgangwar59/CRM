import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { verifyAccessToken } from "@/lib/auth";
import fs from "fs";
import path from "path";

import { Announcement } from "@/lib/models/Announcement";
import { Attendance } from "@/lib/models/Attendance";
import { AttendanceSettings } from "@/lib/models/AttendanceSettings";
import { AuditLog } from "@/lib/models/AuditLog";
import { CompanyWallet } from "@/lib/models/CompanyWallet";
import { Counter } from "@/lib/models/Counter";
import { Employee } from "@/lib/models/Employee";
import { EmployeeTask } from "@/lib/models/EmployeeTask";
import { EmployeeWallet } from "@/lib/models/EmployeeWallet";
import { EmployeeWalletTransaction } from "@/lib/models/EmployeeWalletTransaction";
import { Holiday } from "@/lib/models/Holiday";
import { Investor } from "@/lib/models/Investor";
import { Invoice } from "@/lib/models/Invoice";
import { Lead } from "@/lib/models/Lead";
import { LeadActivity } from "@/lib/models/LeadActivity";
import { LeadAttachment } from "@/lib/models/LeadAttachment";
import { Leave } from "@/lib/models/Leave";
import { LeaveBalance } from "@/lib/models/LeaveBalance";
import { LeaveLedger } from "@/lib/models/LeaveLedger";
import { LoginHistory } from "@/lib/models/LoginHistory";
import { NotificationLog } from "@/lib/models/NotificationLog";
import { Otp } from "@/lib/models/Otp";
import { Payroll } from "@/lib/models/Payroll";
import { SalaryPayment } from "@/lib/models/SalaryPayment";
import { SalaryStructure } from "@/lib/models/SalaryStructure";
import { Session } from "@/lib/models/Session";
import { SignatureSession } from "@/lib/models/SignatureSession";
import { SystemSettings } from "@/lib/models/SystemSettings";
import { User } from "@/lib/models/User";
import { WalletTransaction } from "@/lib/models/WalletTransaction";

const collections: Record<string, any> = {
  Announcement,
  Attendance,
  AttendanceSettings,
  AuditLog,
  CompanyWallet,
  Counter,
  Employee,
  EmployeeTask,
  EmployeeWallet,
  EmployeeWalletTransaction,
  Holiday,
  Investor,
  Invoice,
  Lead,
  LeadActivity,
  LeadAttachment,
  Leave,
  LeaveBalance,
  LeaveLedger,
  LoginHistory,
  NotificationLog,
  Otp,
  Payroll,
  SalaryPayment,
  SalaryStructure,
  Session,
  SignatureSession,
  SystemSettings,
  User,
  WalletTransaction
};

// Check if requester is ADMIN or KEY_ADMIN
async function checkAuth(req: Request) {
  const token = req.headers.get("cookie")?.match(/accessToken=([^;]+)/)?.[1];
  if (!token) return null;

  const payload = verifyAccessToken(token);
  if (!payload || !payload.userId) return null;

  const role = (payload.role || "").toUpperCase().replace("_", "");
  if (role !== "KEYADMIN" && role !== "ADMIN") return null;

  return payload;
}

export async function GET(req: Request) {
  try {
    await connectToDatabase();
    const authorized = await checkAuth(req);
    if (!authorized) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const includeDb = searchParams.get("includeDb") !== "false";
    const includeFiles = searchParams.get("includeFiles") !== "false";

    const backupData: Record<string, any[]> = {};
    
    if (includeDb) {
      for (const [name, model] of Object.entries(collections)) {
        backupData[name] = await model.find({}).lean();
      }
    }

    if (includeFiles) {
      // Export uploaded files too
      const uploadDir = path.join(process.cwd(), "public/uploads");
      const uploadedFiles: { filename: string; content: string }[] = [];
      if (fs.existsSync(uploadDir)) {
        const files = fs.readdirSync(uploadDir);
        for (const file of files) {
          const filePath = path.join(uploadDir, file);
          if (fs.statSync(filePath).isFile()) {
            const content = fs.readFileSync(filePath).toString("base64");
            uploadedFiles.push({ filename: file, content });
          }
        }
      }
      (backupData as any)._uploaded_files = uploadedFiles;
    }

    // Set filename headers for easy downloading
    const dateStr = new Date().toISOString().split("T")[0];
    return new NextResponse(JSON.stringify(backupData, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename=crm_backup_${dateStr}.json`
      }
    });
  } catch (error) {
    console.error("Backup Export Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await connectToDatabase();
    const authorized = await checkAuth(req);
    if (!authorized) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { mode, data, restoreDb, restoreFiles } = await req.json();
    if (!data || typeof data !== "object") {
      return NextResponse.json({ error: "Invalid backup data" }, { status: 400 });
    }

    // Default to true if not specified (for backward compatibility)
    const shouldRestoreDb = restoreDb !== false;
    const shouldRestoreFiles = restoreFiles !== false;

    if (mode === "overwrite") {
      if (shouldRestoreDb) {
        for (const [name, model] of Object.entries(collections)) {
          if (data[name]) {
            await model.deleteMany({});
            if (Array.isArray(data[name]) && data[name].length > 0) {
              await model.insertMany(data[name]);
            }
          }
        }
      }

      if (shouldRestoreFiles) {
        // Clear uploaded files on overwrite mode
        const uploadDir = path.join(process.cwd(), "public/uploads");
        if (fs.existsSync(uploadDir)) {
          const files = fs.readdirSync(uploadDir);
          for (const file of files) {
            const filePath = path.join(uploadDir, file);
            if (fs.statSync(filePath).isFile()) {
              fs.unlinkSync(filePath);
            }
          }
        }
      }
    } else if (mode === "merge") {
      if (shouldRestoreDb) {
        for (const [name, model] of Object.entries(collections)) {
          if (Array.isArray(data[name]) && data[name].length > 0) {
            const ops = data[name].map((doc: any) => ({
              updateOne: {
                filter: { _id: doc._id },
                update: { $set: doc },
                upsert: true
              }
            }));
            await model.bulkWrite(ops);
          }
        }
      }
    } else {
      return NextResponse.json({ error: "Invalid restore mode" }, { status: 400 });
    }

    // Restore uploaded files
    if (shouldRestoreFiles && Array.isArray(data._uploaded_files) && data._uploaded_files.length > 0) {
      const uploadDir = path.join(process.cwd(), "public/uploads");
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      for (const file of data._uploaded_files) {
        const filePath = path.join(uploadDir, file.filename);
        fs.writeFileSync(filePath, Buffer.from(file.content, "base64"));
      }
    }

    return NextResponse.json({ success: true, message: "Database restored successfully" });
  } catch (error) {
    console.error("Backup Restore Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
