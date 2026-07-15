import nodemailer from "nodemailer";
import fs from "fs";
import path from "path";

// Setup transporter using env config
const getTransporter = () => {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || "587");
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (host && user && pass) {
    return nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass }
    });
  }
  return null;
};

export async function sendWelcomeEmail({
  email,
  firstName,
  lastName,
  password,
  loginUrl
}: {
  email: string;
  firstName: string;
  lastName: string;
  password: string;
  loginUrl: string;
}) {
  const subject = "Welcome to Niventra Capital - Your CRM Account Details";
  const textContent = `Hi ${firstName} ${lastName},\n\nYour CRM employee portal account has been created successfully!\n\nHere are your login credentials:\n\nLogin Link: ${loginUrl}\nUsername (Email): ${email}\nPassword: ${password}\n\nPlease change your password after logging in.\n\nBest regards,\nHR Administration Team`;

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; padding: 24px; border-radius: 8px;">
      <h2 style="color: #312e81; border-bottom: 2px solid #312e81; padding-bottom: 12px; margin-top: 0;">Welcome to Niventra Capital</h2>
      <p>Hi <strong>${firstName} ${lastName}</strong>,</p>
      <p>Your CRM employee portal account has been successfully created. You can now log in to manage your attendance, payroll, leaves, and modules.</p>
      
      <div style="background-color: #f3f4f6; border-left: 4px solid #312e81; padding: 16px; margin: 20px 0; border-radius: 4px;">
        <p style="margin: 0 0 8px 0;"><strong>Portal Login Details:</strong></p>
        <p style="margin: 0 0 4px 0;"><strong>Login Link:</strong> <a href="${loginUrl}" style="color: #4f46e5; text-decoration: underline;">${loginUrl}</a></p>
        <p style="margin: 0 0 4px 0;"><strong>Username:</strong> ${email}</p>
        <p style="margin: 0;"><strong>Password:</strong> <span style="font-family: monospace; background: #e5e7eb; padding: 2px 4px; border-radius: 2px;">${password}</span></p>
      </div>

      <p style="color: #dc2626; font-size: 13px;"><em>* For security reasons, please update your password immediately after logging in.</em></p>
      
      <p style="margin-top: 30px; border-top: 1px solid #e5e7eb; padding-top: 16px; font-size: 13px; color: #6b7280;">
        Best regards,<br/>
        <strong>HR Administration Team</strong><br/>
        Niventra Capital Advisory India Capital Pvt. Ltd.
      </p>
    </div>
  `;

  const transporter = getTransporter();

  if (transporter) {
    try {
      await transporter.sendMail({
        from: process.env.SMTP_FROM || `"Niventra CRM" <${process.env.SMTP_USER}>`,
        to: email,
        subject,
        text: textContent,
        html: htmlContent
      });
      console.log(`Welcome email successfully sent to ${email}`);
    } catch (err) {
      console.error("Nodemailer send welcome email failed:", err);
      saveEmailLocally(email, subject, textContent);
    }
  } else {
    // If SMTP is not configured, write welcome details to local workspace so they can see/test it
    saveEmailLocally(email, subject, textContent);
  }
}

function saveEmailLocally(email: string, subject: string, content: string) {
  try {
    const dir = path.join(process.cwd(), "scratch", "emails");
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const filename = `${email.replace(/[@.]/g, "_")}_welcome.txt`;
    fs.writeFileSync(path.join(dir, filename), `Subject: ${subject}\n\n${content}`);
    console.log(`[SIMULATED EMAIL] Welcoming credentials written to: scratch/emails/${filename}`);
  } catch (err) {
    console.error("Failed to save simulated email locally:", err);
  }
}
