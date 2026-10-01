import type { NextApiRequest, NextApiResponse } from "next";
import { connectToDatabase } from "@/lib/db";
import fs from "fs";
import path from "path";
import AdmZip from "adm-zip";
import jwt from "jsonwebtoken";

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

export const config = {
  api: {
    bodyParser: false, // Bypass Next.js 10MB limit!
    sizeLimit: '100mb',
  },
};

function checkAuth(req: NextApiRequest) {
  const token = req.cookies?.accessToken;
  if (!token) return null;

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || "your-secret-key") as any;
    if (!payload || !payload.userId) return null;

    const role = (payload.role || "").toUpperCase().replace("_", "");
    if (role !== "KEYADMIN" && role !== "ADMIN") return null;

    return payload;
  } catch (e) {
    return null;
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();

  const authorized = checkAuth(req);
  if (!authorized) {
    return res.status(403).json({ error: "Forbidden" });
  }

  try {
    await connectToDatabase();

    // Stream the raw upload directly to disk to bypass NextJS 10MB memory limits
    const tempZipPath = path.join(process.cwd(), "public", `upload_${Date.now()}.zip`);
    const writeStream = fs.createWriteStream(tempZipPath);
    
    await new Promise((resolve, reject) => {
      req.pipe(writeStream);
      writeStream.on("close", resolve);
      writeStream.on("error", reject);
      req.on("error", reject);
    });

    const buffer = fs.readFileSync(tempZipPath);
    // Clean up temp file immediately after reading
    fs.unlinkSync(tempZipPath);

    if (buffer.length === 0) {
      return res.status(400).json({ error: "No backup file uploaded" });
    }

    const mode = req.query.mode as string || "merge";
    const restoreDb = req.query.restoreDb === "true";
    const restoreFiles = req.query.restoreFiles === "true";

    let zip: AdmZip | null = null;
    let isZip = false;

    console.log("Pages Router received file. ByteLength:", buffer.length);

    try {
      zip = new AdmZip(buffer);
      isZip = true;
    } catch (e: any) {
      isZip = false;
    }

    let dbData: any = null;
    if (restoreDb) {
      if (isZip && zip) {
        const dbEntry = zip.getEntry("database.json");
        if (dbEntry) {
          try {
            dbData = JSON.parse(zip.readAsText(dbEntry));
          } catch (e) {
            return res.status(400).json({ error: "database.json inside zip is corrupted" });
          }
        } else {
          return res.status(400).json({ error: "No database.json found inside zip" });
        }
      } else {
        try {
          dbData = JSON.parse(buffer.toString("utf8"));
        } catch (e: any) {
          const hex = buffer.subarray(0, 50).toString('hex');
          return res.status(400).json({
            error: `Uploaded file is invalid. Size: ${buffer.length} bytes. Header: ${hex}`
          });
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
        const zipEntries = zip.getEntries();
        for (const entry of zipEntries) {
          if (entry.entryName.startsWith("uploads/") && !entry.isDirectory) {
            zip.extractEntryTo(entry, uploadDir, false, true);
          }
        }
      }

      if (dbData && Array.isArray(dbData._uploaded_files) && dbData._uploaded_files.length > 0) {
        for (const f of dbData._uploaded_files) {
          const filePath = path.join(uploadDir, f.filename);
          fs.writeFileSync(filePath, Buffer.from(f.content, "base64"));
        }
      }
    }

    return res.status(200).json({ success: true, message: "Database and files restored successfully" });
  } catch (error: any) {
    console.error("Backup Restore Error:", error);
    if (error.code === 11000 || (error.name === 'BulkWriteError' && error.code === 11000) || (error.message && error.message.includes('E11000'))) {
      return res.status(200).json({ success: true, message: "Restored with some duplicate keys skipped" });
    }
    return res.status(500).json({ error: error.stack || error.message || "Internal server error" });
  }
}
