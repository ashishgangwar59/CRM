import { NotificationLog } from "./models/NotificationLog";
import { Employee } from "./models/Employee";
import mongoose from "mongoose";

class NotificationEngine {
  
  // --- LOW LEVEL TRANSPORT MOCKS ---
  
  private async mockSendEmail(to: string, subject: string, body: string): Promise<boolean> {
    console.log(`\n[EMAIL DISPATCHED] To: ${to}\n[SUBJECT] ${subject}\n[BODY] ${body}\n`);
    // NOTE: In production, integrate SendGrid or AWS SES here.
    return true;
  }

  private async mockSendSMS(phone: string, message: string): Promise<boolean> {
    console.log(`\n[SMS DISPATCHED] To: ${phone}\n[MESSAGE] ${message}\n`);
    // NOTE: In production, integrate Twilio or Plivo here.
    return true;
  }

  private async mockSendPush(userId: string, title: string, payload: string): Promise<boolean> {
    console.log(`\n[PUSH DISPATCHED] User: ${userId}\n[TITLE] ${title}\n[PAYLOAD] ${payload}\n`);
    // NOTE: In production, integrate Firebase Cloud Messaging (FCM) or OneSignal here.
    return true;
  }

  private async logNotification(recipientId: string | mongoose.Types.ObjectId, channel: "Email" | "SMS" | "Push", triggerEvent: string, message: string, status: "Sent" | "Failed") {
    try {
      await NotificationLog.create({ recipientId, channel, triggerEvent, message, status });
    } catch (e) {
      console.error("Failed to write to NotificationLog", e);
    }
  }

  // --- HIGH LEVEL TRIGGERS ---

  async notifySalaryGenerated(employeeId: string, monthYear: string, netAmount: number) {
    const emp = await Employee.findById(employeeId).lean();
    if (!emp) return;

    const message = `Dear ${emp.firstName}, your salary slip for ${monthYear} (Net Pay: ₹${netAmount.toLocaleString()}) has been generated and is ready for review.`;
    
    // Send Email
    if (emp.email) {
      const ok = await this.mockSendEmail(emp.email, "Salary Slip Generated", message);
      await this.logNotification(employeeId, "Email", "Salary Generated", message, ok ? "Sent" : "Failed");
    }

    // Send Push
    const ok2 = await this.mockSendPush(employeeId, "Salary Generated", message);
    await this.logNotification(employeeId, "Push", "Salary Generated", message, ok2 ? "Sent" : "Failed");
  }

  async notifySalaryPaid(employeeId: string, monthYear: string, netAmount: number) {
    const emp = await Employee.findById(employeeId).lean();
    if (!emp) return;

    const message = `Good news! Your salary for ${monthYear} (₹${netAmount.toLocaleString()}) has been paid and credited to your account.`;
    
    // Send Email
    if (emp.email) {
      const ok = await this.mockSendEmail(emp.email, "Salary Paid", message);
      await this.logNotification(employeeId, "Email", "Salary Paid", message, ok ? "Sent" : "Failed");
    }

    // Send SMS
    if (emp.phone) {
      const ok2 = await this.mockSendSMS(emp.phone, message);
      await this.logNotification(employeeId, "SMS", "Salary Paid", message, ok2 ? "Sent" : "Failed");
    }
  }

  async notifyLeaveApproved(employeeId: string, leaveType: string, totalDays: number) {
    const emp = await Employee.findById(employeeId).lean();
    if (!emp) return;

    const message = `Your request for ${totalDays} days of ${leaveType} has been officially Approved.`;
    
    // Send Push
    const ok = await this.mockSendPush(employeeId, "Leave Approved", message);
    await this.logNotification(employeeId, "Push", "Leave Approved", message, ok ? "Sent" : "Failed");
    
    // Send Email
    if (emp.email) {
      const ok2 = await this.mockSendEmail(emp.email, "Leave Approved", message);
      await this.logNotification(employeeId, "Email", "Leave Approved", message, ok2 ? "Sent" : "Failed");
    }
  }

  async notifyLeadFollowUpReminder(employeeId: string, leadName: string, dateStr: string) {
    const emp = await Employee.findById(employeeId).lean();
    if (!emp) return;

    const message = `Reminder: You have a scheduled follow-up with Lead "${leadName}" on ${dateStr}. Please check your CRM dashboard.`;
    
    // Send Push
    const ok = await this.mockSendPush(employeeId, "Lead Follow Up Reminder", message);
    await this.logNotification(employeeId, "Push", "Lead Follow Up Reminder", message, ok ? "Sent" : "Failed");
  }

}

export const notificationService = new NotificationEngine();
