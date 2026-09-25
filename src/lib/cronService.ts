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

// Singleton check to prevent multiple cron instances in development HMR
let isCronInitialized = false;

export function initCronJobs() {
  if (isCronInitialized) return;
  isCronInitialized = true;

  // Run at 10:00 AM every day
  cron.schedule("0 10 * * *", async () => {
    try {
      console.log("Running Daily Database & KYC Backup Cron Job...");
      await connectToDatabase();

      const backupData: Record<string, any[]> = {};

      for (const [name, model] of Object.entries(collections)) {
        backupData[name] = await model.find({}).lean();
      }

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

      const dateStr = new Date().toISOString().split("T")[0];
      const backupString = JSON.stringify(backupData);

      // Create a ZIP archive in memory
      const AdmZip = require("adm-zip");
      const zip = new AdmZip();
      zip.addFile(`crm_backup_${dateStr}.json`, Buffer.from(backupString, "utf8"));
      const zipBuffer = zip.toBuffer();

      // We have to send this via email to ak915066@gmail.com
      const settings = await SystemSettings.findOne();
      const smtp = settings?.integrations?.smtp;

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
          to: "ak915066@gmail.com",
          subject: `Niventra CRM Daily Backup - ${dateStr}`,
          text: `Please find attached the complete CRM database and KYC documents backup for ${dateStr}, compressed as a ZIP file.`,
          attachments: [
            {
              filename: `crm_backup_${dateStr}.zip`,
              content: zipBuffer,
              contentType: "application/zip"
            }
          ]
        });
        console.log("Daily Backup emailed successfully!");
      } else {
        console.warn("Daily Backup Failed: SMTP Settings not configured in System Settings.");
      }
    } catch (e) {
      console.error("Error during Daily Backup Cron Job:", e);
    }
  });

  console.log("CRON jobs initialized! Scheduled Daily Backup at 10 AM.");
}
