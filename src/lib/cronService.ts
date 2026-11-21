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

// Short-lived / regenerable collections left out of the EMAILED backup to keep it small.
// (The manual "Download Backup" still contains everything.)
const EMAIL_SKIP_COLLECTIONS = new Set(["Otp", "Session"]);

// Gmail / most SMTP servers reject mails above ~25 MB. Attachments are base64-encoded
// (+~37%), so keep each email's raw attachment size well below that.
const MAX_ATTACHMENT_BYTES = Number(process.env.BACKUP_MAX_ATTACHMENT_MB || 15) * 1024 * 1024;

// The server runs in UTC (Docker); the backup time in Settings is office (IST) time.
const BACKUP_TIMEZONE = process.env.BACKUP_TIMEZONE || "Asia/Kolkata";

export function getZonedNow(timeZone = BACKUP_TIMEZONE) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(new Date());
  const get = (type: string) => parts.find(p => p.type === type)?.value || "00";
  return { date: `${get("year")}-${get("month")}-${get("day")}`, time: `${get("hour")}:${get("minute")}` };
}

function formatMb(bytes: number) {
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function listFilesRecursive(dir: string): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listFilesRecursive(full));
    else if (entry.isFile()) out.push(full);
  }
  return out;
}

type BackupAttachment = { filename: string; content: Buffer };

/** Splits a too-large ZIP into raw pieces (.001, .002 …) – rejoin by opening the .001 file in 7-Zip. */
function splitIfTooLarge(filename: string, content: Buffer): BackupAttachment[] {
  if (content.length <= MAX_ATTACHMENT_BYTES) return [{ filename, content }];
  const chunks: BackupAttachment[] = [];
  for (let offset = 0, i = 1; offset < content.length; offset += MAX_ATTACHMENT_BYTES, i++) {
    chunks.push({
      filename: `${filename}.${String(i).padStart(3, "0")}`,
      content: content.subarray(offset, offset + MAX_ATTACHMENT_BYTES),
    });
  }
  return chunks;
}

/**
 * Builds compressed ZIP attachments, each small enough for email:
 *  - crm_backup_<date>_database.zip        → database.json (restorable via Settings → Import)
 *  - crm_backup_<date>_uploads_partN.zip   → uploads/ files, grouped so each ZIP stays under the limit
 */
async function buildBackupAttachments(dateStr: string) {
  const AdmZip = require("adm-zip");
  const attachments: BackupAttachment[] = [];

  // 1. Database
  const backupData: Record<string, any[]> = {};
  let recordCount = 0;
  for (const [name, model] of Object.entries(collections)) {
    if (EMAIL_SKIP_COLLECTIONS.has(name)) continue;
    backupData[name] = await model.find({}).lean();
    recordCount += backupData[name].length;
  }
  const dbJson = Buffer.from(JSON.stringify(backupData), "utf8");
  const dbZip = new AdmZip();
  // Must be named "database.json" so Settings → Import can restore it.
  dbZip.addFile("database.json", dbJson);
  const dbZipBuffer: Buffer = dbZip.toBuffer();
  console.log(`[Backup] Database: ${recordCount} records, JSON ${formatMb(dbJson.length)} -> ZIP ${formatMb(dbZipBuffer.length)}`);
  attachments.push(...splitIfTooLarge(`crm_backup_${dateStr}_database.zip`, dbZipBuffer));

  // 2. Uploaded files (KYC etc.), packed into several ZIPs if needed
  const uploadDir = path.join(process.cwd(), "public/uploads");
  let fileCount = 0;
  if (fs.existsSync(uploadDir)) {
    const files = listFilesRecursive(uploadDir);
    fileCount = files.length;
    let part = 1;
    let zip = new AdmZip();
    let currentSize = 0;

    const flush = () => {
      if (currentSize === 0) return;
      const buffer: Buffer = zip.toBuffer();
      attachments.push(...splitIfTooLarge(`crm_backup_${dateStr}_uploads_part${part}.zip`, buffer));
      part++;
      zip = new AdmZip();
      currentSize = 0;
    };

    for (const file of files) {
      const size = fs.statSync(file).size;
      if (currentSize > 0 && currentSize + size > MAX_ATTACHMENT_BYTES) flush();
      const relDir = path.relative(uploadDir, path.dirname(file)).split(path.sep).join("/");
      zip.addLocalFile(file, relDir ? `uploads/${relDir}` : "uploads");
      currentSize += size;
    }
    flush();
  }

  return { attachments, recordCount, fileCount };
}

async function getTransport() {
  const settings = await SystemSettings.findOne();
  const smtp = settings?.integrations?.smtp;
  if (!smtp?.host || !smtp?.user || !smtp?.pass) {
    throw new Error("SMTP settings not configured. Fill Settings → Integrations → SMTP first.");
  }
  const port = parseInt(smtp.port || "587");
  const transporter = nodemailer.createTransport({
    host: smtp.host,
    port,
    secure: port === 465,
    auth: { user: smtp.user, pass: smtp.pass },
    connectionTimeout: 30_000,
    greetingTimeout: 30_000,
    socketTimeout: 5 * 60_000, // large attachments take time to upload
  });
  const from = smtp.from || `"CRM Backup" <${smtp.user}>`;
  return { settings, transporter, from };
}

export async function generateAndEmailBackup(targetEmail?: string) {
  console.log("[Backup] Running database & uploads backup...");
  await connectToDatabase();

  const { settings, transporter, from } = await getTransport();

  const configuredEmail = settings?.backupConfig?.email?.trim();
  const sendTo = targetEmail || (configuredEmail && configuredEmail !== "admin@example.com" ? configuredEmail : "");
  if (!sendTo) {
    throw new Error("Backup recipient email is not set. Enter it under Settings → Database Backup and click Save Changes.");
  }

  // Fail fast with a clear message if the server can't reach the SMTP host (e.g. port blocked).
  try {
    await transporter.verify();
  } catch (e: any) {
    throw new Error(`Cannot connect to SMTP server: ${e.message || e}`);
  }

  const { date: dateStr } = getZonedNow();
  const { attachments, recordCount, fileCount } = await buildBackupAttachments(dateStr);

  // Group attachments into emails, each under the size limit.
  const emails: BackupAttachment[][] = [];
  let current: BackupAttachment[] = [];
  let currentSize = 0;
  for (const att of attachments) {
    if (current.length > 0 && currentSize + att.content.length > MAX_ATTACHMENT_BYTES) {
      emails.push(current);
      current = [];
      currentSize = 0;
    }
    current.push(att);
    currentSize += att.content.length;
  }
  if (current.length > 0) emails.push(current);

  const totalBytes = attachments.reduce((sum, a) => sum + a.content.length, 0);
  const hasSplitFiles = attachments.some(a => /\.\d{3}$/.test(a.filename));

  for (let i = 0; i < emails.length; i++) {
    const partLabel = emails.length > 1 ? ` (Part ${i + 1} of ${emails.length})` : "";
    const fileList = emails[i].map(a => `  - ${a.filename} (${formatMb(a.content.length)})`).join("\n");
    await transporter.sendMail({
      from,
      to: sendTo,
      subject: `CRM Backup - ${dateStr}${partLabel}`,
      text:
        `CRM backup for ${dateStr}${partLabel}.\n\n` +
        `Database records: ${recordCount}\nUploaded files: ${fileCount}\n` +
        `Total compressed size: ${formatMb(totalBytes)} in ${emails.length} email(s).\n\n` +
        `Attachments in this email:\n${fileList}\n\n` +
        `To restore: Settings → Database Backup → Import, upload the *_database.zip and then each *_uploads_partN.zip.` +
        (hasSplitFiles ? `\n\nFiles ending in .001, .002 ... are pieces of one ZIP. Put them in one folder and open the .001 file with 7-Zip to rebuild the ZIP before importing.` : ""),
      attachments: emails[i].map(a => ({ filename: a.filename, content: a.content, contentType: "application/zip" })),
    });
    console.log(`[Backup] Sent email ${i + 1}/${emails.length} to ${sendTo}`);
  }

  console.log(`[Backup] Done – ${formatMb(totalBytes)} sent to ${sendTo} in ${emails.length} email(s).`);
  return { sendTo, emails: emails.length, totalMb: (totalBytes / 1024 / 1024).toFixed(2) };
}

/**
 * Sends the automatic backup once per day at/after the configured time (office timezone).
 * If the server was down/busy at that exact minute it catches up later the same day.
 * The day is "claimed" atomically in the DB so several workers/containers never send duplicates.
 */
async function runScheduledBackupCheck() {
  await connectToDatabase();
  const settings: any = await SystemSettings.findOne().select("backupConfig").lean();
  if (!settings) return;

  const configured = settings.backupConfig?.backupTime || "";
  const backupTime = /^\d{2}:\d{2}$/.test(configured) ? configured : "10:00";
  const { date, time } = getZonedNow();
  if (time < backupTime) return;
  if (settings.backupConfig?.lastAutoBackupDate === date) return;

  const claimed = await SystemSettings.findOneAndUpdate(
    { _id: settings._id, "backupConfig.lastAutoBackupDate": { $ne: date } },
    { $set: { "backupConfig.lastAutoBackupDate": date } },
    { new: true }
  );
  if (!claimed) return; // another worker already took today's run

  console.log(`[Backup] Scheduled time ${backupTime} (${BACKUP_TIMEZONE}) reached – sending daily backup...`);
  try {
    await generateAndEmailBackup();
  } catch (e) {
    // Release the claim so it is retried later.
    await SystemSettings.updateOne({ _id: settings._id }, { $set: { "backupConfig.lastAutoBackupDate": "" } });
    throw e;
  }
}

const cronGlobal = globalThis as any;

export function initCronJobs() {
  // Next.js bundles this module into several chunks; a process-wide flag ensures only ONE cron runs.
  if (cronGlobal.__crmCronInitialized) return;
  cronGlobal.__crmCronInitialized = true;
  let running = false;

  cron.schedule("* * * * *", async () => {
    if (running) return;
    running = true;
    try {
      await runScheduledBackupCheck();
    } catch (e) {
      console.error("[Backup] Scheduled backup failed, retrying in 30 minutes:", e);
      // Don't hammer the SMTP server every minute on a persistent error.
      await new Promise(r => setTimeout(r, 30 * 60_000));
    } finally {
      running = false;
    }
  });

  console.log(`[Backup] Cron initialized – daily backup checked every minute (${BACKUP_TIMEZONE}).`);
}

