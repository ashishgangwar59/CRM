import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { verifyAccessToken } from "@/lib/auth";
import fs from "fs";
import path from "path";
import AdmZip from "adm-zip";

export const maxDuration = 60; // 60 seconds
export const dynamic = "force-dynamic";

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

    const zip = new AdmZip();

    if (includeDb) {
      const backupData: Record<string, any[]> = {};
      for (const [name, model] of Object.entries(collections)) {
        backupData[name] = await model.find({}).lean();
      }
      zip.addFile("database.json", Buffer.from(JSON.stringify(backupData)));
    }

    if (includeFiles) {
      // Export uploaded files as a local folder in the zip
      const uploadDir = path.join(process.cwd(), "public/uploads");
      if (fs.existsSync(uploadDir)) {
        zip.addLocalFolder(uploadDir, "uploads");
      }
    }

    const zipBuffer = zip.toBuffer();
    
    // Verify zip
    try {
      new AdmZip(zipBuffer);
      console.log("Zip successfully verified before export. Size:", zipBuffer.length);
    } catch (e: any) {
      console.error("Generated zip is corrupted!", e.message);
      return NextResponse.json({ error: "Failed to generate a valid ZIP file on the server" }, { status: 500 });
    }

    const dateStr = new Date().toISOString().split("T")[0];
    const filename = `crm_backup_${dateStr}_${Date.now()}.zip`;

    return new NextResponse(zipBuffer as any, {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
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

    const { searchParams } = new URL(req.url);
    const mode = searchParams.get("mode") || "merge";
    const restoreDb = searchParams.get("restoreDb") === "true";
    const restoreFiles = searchParams.get("restoreFiles") === "true";

    const chunks = [];
    let totalLength = 0;
    
    if (req.body) {
      const reader = req.body.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          chunks.push(value);
          totalLength += value.length;
        }
      }
    }

    if (totalLength === 0) {
      return NextResponse.json({ error: "No backup file uploaded" }, { status: 400 });
    }

    const buffer = Buffer.concat(chunks);

    let zip: AdmZip | null = null;
    let isZip = false;

    console.log("Received backup file. ByteLength:", totalLength);

    try {
      zip = new AdmZip(buffer);
      isZip = true;
      console.log("Successfully parsed as ZIP file");
    } catch (e: any) {
      // Not a valid zip file, maybe it's a JSON file
      isZip = false;
      console.error("AdmZip failed to parse buffer:", e.message || e);
    }

    let dbData: any = null;
    if (restoreDb) {
      if (isZip && zip) {
        const dbEntry = zip.getEntry("database.json");
        if (dbEntry) {
          try {
            dbData = JSON.parse(zip.readAsText(dbEntry));
          } catch (e) {
            return NextResponse.json({ error: "database.json inside zip is corrupted" }, { status: 400 });
          }
        } else {
          return NextResponse.json({ error: "No database.json found inside zip" }, { status: 400 });
        }
      } else {
        try {
          dbData = JSON.parse(buffer.toString("utf8"));
          console.log("Successfully parsed as JSON file");
        } catch (e: any) {
          console.error("JSON.parse failed on buffer:", e.message || e);
          
          const size = buffer.length;
          const hex = buffer.subarray(0, 50).toString('hex');
          
          return NextResponse.json({ 
            error: `Uploaded file is invalid. Size: ${size} bytes. Header: ${hex}` 
          }, { status: 400 });
        }
      }

      if (dbData) {
        if (mode === "overwrite") {
          for (const [name, model] of Object.entries(collections)) {
            if (dbData[name]) {
              await model.deleteMany({});
              if (Array.isArray(dbData[name]) && dbData[name].length > 0) {
                await model.insertMany(dbData[name], { ordered: false });
              }
            }
          }
        } else if (mode === "merge") {
          for (const [name, model] of Object.entries(collections)) {
            if (Array.isArray(dbData[name]) && dbData[name].length > 0) {
              const ops = dbData[name].map((doc: any) => ({
                updateOne: {
                  filter: { _id: doc._id },
                  update: { $set: doc },
                  upsert: true
                }
              }));
              await model.bulkWrite(ops, { ordered: false });
            }
          }
        }
      }
    }

    if (restoreFiles) {
      const uploadDir = path.join(process.cwd(), "public/uploads");

      if (mode === "overwrite") {
        if (fs.existsSync(uploadDir)) {
          const files = fs.readdirSync(uploadDir);
          for (const f of files) {
            const filePath = path.join(uploadDir, f);
            if (fs.statSync(filePath).isFile()) {
              fs.unlinkSync(filePath);
            }
          }
        }
      }

      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      if (isZip && zip) {
        // Check for uploads/ folder in zip
        const zipEntries = zip.getEntries();
        for (const entry of zipEntries) {
          if (entry.entryName.startsWith("uploads/") && !entry.isDirectory) {
            zip.extractEntryTo(entry, uploadDir, false, true);
          }
        }
      }

      // Compatibility for older backups that had `_uploaded_files` as base64 inside JSON
      if (dbData && Array.isArray(dbData._uploaded_files) && dbData._uploaded_files.length > 0) {
        for (const f of dbData._uploaded_files) {
          const filePath = path.join(uploadDir, f.filename);
          fs.writeFileSync(filePath, Buffer.from(f.content, "base64"));
        }
      }
    }

    return NextResponse.json({ success: true, message: "Database and files restored successfully" });
  } catch (error: any) {
    console.error("Backup Restore Error:", error);
    if (error.code === 11000 || (error.name === 'BulkWriteError' && error.code === 11000) || (error.message && error.message.includes('E11000'))) {
      console.warn("Ignored some duplicate key errors during restore");
      return NextResponse.json({ success: true, message: "Restored with some duplicate keys skipped" });
    }
    return NextResponse.json({ error: error.message || "Internal server error", stack: error.stack }, { status: 500 });
  }
}
