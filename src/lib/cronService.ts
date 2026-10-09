import cron from "node-cron";
import fs from "fs";
import path from "path";
import { connectToDatabase } from "./db";
import { Announcement } from "./models/Announcement";
import { Attendance } from "./models/Attendance";
import { AttendanceSettings } from "./models/AttendanceSettings";
import { AuditLog } from "./models/AuditLog";
import { CompanyWallet } from "./models/CompanyWallet";
import { Counter } from "./models/Counter";
import { Employee } from "./models/Employee";
import { EmployeeTask } from "./models/EmployeeTask";
import { EmployeeWallet } from "./models/EmployeeWallet";
import { EmployeeWalletTransaction } from "./models/EmployeeWalletTransaction";
import { Holiday } from "./models/Holiday";
import { Investor } from "./models/Investor";
import { Invoice } from "./models/Invoice";
import { Lead } from "./models/Lead";
import { LeadActivity } from "./models/LeadActivity";
import { LeadAttachment } from "./models/LeadAttachment";
import { Leave } from "./models/Leave";
import { LeaveBalance } from "./models/LeaveBalance";
import { LeaveLedger } from "./models/LeaveLedger";
import { LoginHistory } from "./models/LoginHistory";
import { NotificationLog } from "./models/NotificationLog";
import { Otp } from "./models/Otp";
import { Payroll } from "./models/Payroll";
import { SalaryPayment } from "./models/SalaryPayment";
import { SalaryStructure } from "./models/SalaryStructure";
import { Session } from "./models/Session";
import { SignatureSession } from "./models/SignatureSession";
import { SystemSettings } from "./models/SystemSettings";
import { User } from "./models/User";
import { WalletTransaction } from "./models/WalletTransaction";
import nodemailer from "nodemailer";

const collections: Record<string, any> = {
  Announcement, Attendance, AttendanceSettings, AuditLog, CompanyWallet, Counter,
  Employee, EmployeeTask, EmployeeWallet, EmployeeWalletTransaction, Holiday, Investor,
  Invoice, Lead, LeadActivity, LeadAttachment, Leave, LeaveBalance, LeaveLedger,
  LoginHistory, NotificationLog, Otp, Payroll, SalaryPayment, SalaryStructure,
  Session, SignatureSession, SystemSettings, User, WalletTransaction
};

export async function generateAndEmailBackup(targetEmail?: string) {
  try {
    console.log("Running Database & KYC Backup...");
    await connectToDatabase();

    const backupData: Record<string, any[]> = {};
    for (const [name, model] of Object.entries(collections)) {
      backupData[name] = await model.find({}).lean();
    }

    const dateStr = new Date().toISOString().split("T")[0];
    const AdmZip = require("adm-zip");
    const zip = new AdmZip();
    
    zip.addFile(`database_${dateStr}.json`, Buffer.from(JSON.stringify(backupData), "utf8"));

    const uploadDir = path.join(process.cwd(), "public/uploads");
    if (fs.existsSync(uploadDir)) {
      zip.addLocalFolder(uploadDir, "uploads");
    }

    const zipBuffer = zip.toBuffer();

    const settings = await SystemSettings.findOne();
    const smtp = settings?.integrations?.smtp;
    
    const sendTo = targetEmail || settings?.backupConfig?.email || "ak915066@gmail.com";

    if (smtp && smtp.host && smtp.user && smtp.pass) {
      const port = parseInt(smtp.port || "587");
      const transporter = nodemailer.createTransport({
        host: smtp.host,
        port,
        secure: port === 465,
        auth: { user: smtp.user, pass: smtp.pass }
      });

      const from = smtp.from || `"Niventra CRM Backup" <${smtp.user}>`;

      await transporter.sendMail({
        from,
        to: sendTo,
        subject: `Niventra CRM Backup - ${dateStr}`,
        text: `Please find attached the complete CRM database and KYC documents backup for ${dateStr}, compressed as a ZIP file.`,
        attachments: [
          {
            filename: `crm_backup_${dateStr}.zip`,
            content: zipBuffer,
            contentType: "application/zip"
          }
        ]
      });
      console.log(`Backup emailed successfully to ${sendTo}!`);
    } else {
      console.warn("Backup Failed: SMTP Settings not configured in System Settings.");
      throw new Error("SMTP settings not configured");
    }
  } catch (e) {
    console.error("Error during Backup:", e);
    throw e;
  }
}

let isCronInitialized = false;

export function initCronJobs() {
  if (isCronInitialized) return;
  isCronInitialized = true;

  // Check every minute if it's the configured backup time
  cron.schedule("* * * * *", async () => {
    try {
      await connectToDatabase();
      const settings = await SystemSettings.findOne();
      const backupTime = settings?.backupConfig?.backupTime || "10:00"; // default 10:00 AM
      
      const now = new Date();
      // Format current time to HH:MM to compare
      const hours = now.getHours().toString().padStart(2, '0');
      const mins = now.getMinutes().toString().padStart(2, '0');
      const currentTime = `${hours}:${mins}`;

      if (currentTime === backupTime) {
        console.log(`Matched configured backup time (${backupTime}). Triggering backup...`);
        await generateAndEmailBackup();
      }
    } catch (e) {
      console.error("Error checking cron schedule:", e);
    }
  });

  console.log("CRON jobs initialized! Scheduled to check for daily backup time every minute.");
}
