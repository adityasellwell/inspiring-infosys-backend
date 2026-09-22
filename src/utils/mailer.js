import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

let transporter;

const initMailer = () => {
  dotenv.config(); // Reload .env dynamically on each request

  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!user || !pass) {
    console.warn('⚠️ Email configuration missing in .env.');
    return null;
  }

  const port = parseInt(process.env.SMTP_PORT || '465', 10);
  const secure = process.env.SMTP_SECURE === 'true' || port === 465;

  transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user,
      pass,
    },
    tls: {
      rejectUnauthorized: false
    }
  });

  return transporter;
};

export const sendContactFormEmail = async (name, email, phone, company, message) => {
  if (!transporter) transporter = initMailer();
  if (!transporter) return false;

  try {
    // Email to admin
    await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: process.env.ADMIN_EMAIL || 'admin@inspiringinfosys.com',
      subject: `New Contact Form Submission from ${name}`,
      html: `
        <h2>New Contact Form Submission</h2>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Phone:</strong> ${phone || 'Not provided'}</p>
        <p><strong>Company:</strong> ${company || 'Not provided'}</p>
        <p><strong>Message:</strong></p>
        <p>${message.replace(/\n/g, '<br>')}</p>
      `,
    });

    // Confirmation email to user
    await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: email,
      subject: 'We received your message - Inspiring Infosys',
      html: `
        <h2>Thank you for contacting us!</h2>
        <p>Hi ${name},</p>
        <p>We have received your message and will get back to you as soon as possible.</p>
        <p><strong>Your Details:</strong></p>
        <p>Email: ${email}</p>
        <p>Phone: ${phone || 'Not provided'}</p>
        <p><strong>Your Message:</strong></p>
        <p>${message.replace(/\n/g, '<br>')}</p>
        <hr>
        <p>Best regards,<br>Inspiring Infosys Team</p>
      `,
    });

    console.log('✅ Emails sent successfully for contact:', email);
    return true;
  } catch (error) {
    console.error('❌ Error sending email:', error.message);
    return false;
  }
};

export const sendServiceExpiryWarningEmail = async ({
  clientName,
  clientEmail,
  serviceName,
  serviceType,
  provider,
  expiryDate,
  daysLeft,
  renewalAmount,
  notes
}) => {
  if (!transporter) transporter = initMailer();

  const formattedDate = new Date(expiryDate).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric'
  });

  const adminEmail = process.env.ADMIN_EMAIL || 'info@inspiringinfosys.com';
  const fromEmail = process.env.SMTP_FROM || process.env.SMTP_USER || 'notifications@inspiringinfosys.com';

  const isExpired = daysLeft !== null && daysLeft <= 0;
  const isOneDayLeft = daysLeft === 1;

  const daysText = isExpired
    ? 'EXPIRED'
    : isOneDayLeft
    ? '1 DAY REMAINING (EXPIRING TOMORROW!)'
    : `${daysLeft} DAYS REMAINING`;

  const statusBg = isExpired ? '#dc2626' : isOneDayLeft ? '#ef4444' : '#f97316';
  const subjectPrefix = isExpired ? '🚨 [EXPIRED NOTICE]' : isOneDayLeft ? '🔴 [FINAL NOTICE - 1 DAY LEFT]' : '⚠️ [RENEWAL NOTICE]';
  const subject = `${subjectPrefix} ${serviceType} (${serviceName}) Expiry Alert - ${daysText}`;

  const htmlBody = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; color: #1e293b;">
      <div style="background: #0f172a; padding: 24px; text-align: center; color: #ffffff;">
        <h2 style="margin: 0; font-size: 22px; font-weight: 800; letter-spacing: -0.5px;">INSPIRING INFOSYS</h2>
        <p style="margin: 4px 0 0; font-size: 13px; color: #94a3b8;">Client Service Renewal & Expiration Notice</p>
      </div>
      
      <div style="padding: 24px;">
        <div style="background: ${statusBg}; color: #ffffff; padding: 12px 16px; border-radius: 8px; font-weight: 800; text-align: center; font-size: 14px; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 20px;">
          ${isExpired ? '🚨 SERVICE HAS EXPIRED' : isOneDayLeft ? '🔴 URGENT: SERVICE EXPIRING TOMORROW (1 DAY REMAINING)' : `⚠️ SERVICE EXPIRING SOON: ${daysText}`}
        </div>
        
        <p style="font-size: 15px; margin: 0 0 16px;">Dear <strong>${clientName}</strong>,</p>
        <p style="font-size: 14px; color: #475569; line-height: 1.6; margin: 0 0 20px;">
          ${isOneDayLeft 
            ? `This is a <strong>FINAL URGENT NOTICE</strong>: your <strong>${serviceType}</strong> for <strong>${serviceName}</strong> will <strong>expire tomorrow</strong>! Please renew immediately to avoid service disconnection.`
            : `This is an official notice regarding your <strong>${serviceType}</strong> for <strong>${serviceName}</strong>. Please review the expiration details below to ensure unbroken service continuity.`}
        </p>

        <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 10px; padding: 16px; margin-bottom: 24px;">
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <tr>
              <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Service Name:</td>
              <td style="padding: 6px 0; text-align: right; font-weight: 800; color: #0f172a;">${serviceName}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Service Type:</td>
              <td style="padding: 6px 0; text-align: right; font-weight: 700; color: #0284c7;">${serviceType}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Provider / Registrar:</td>
              <td style="padding: 6px 0; text-align: right; font-weight: 700; color: #334155;">${provider || 'GoDaddy'}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Expiration Date:</td>
              <td style="padding: 6px 0; text-align: right; font-weight: 800; color: ${statusBg};">${formattedDate}</td>
            </tr>
            ${renewalAmount ? `
            <tr>
              <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Renewal Amount:</td>
              <td style="padding: 6px 0; text-align: right; font-weight: 800; color: #16a34a;">₹${Number(renewalAmount).toLocaleString('en-IN')}</td>
            </tr>` : ''}
          </table>
        </div>

        <p style="font-size: 14px; color: #475569; line-height: 1.6; margin: 0 0 20px;">
          To renew your service or avoid service interruption, please contact Inspiring Infosys support immediately.
        </p>

        <div style="text-align: center; margin: 24px 0;">
          <a href="mailto:${adminEmail}" style="background: #0284c7; color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 14px; display: inline-block;">
            Contact Support & Renew Now
          </a>
        </div>

        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 24px 0;" />

        <p style="font-size: 12px; color: #94a3b8; text-align: center; margin: 0;">
          Inspiring Infosys IT Solutions & Business Support<br>
          Website: <a href="https://inspiringinfosys.com" style="color: #0284c7; text-decoration: none;">inspiringinfosys.com</a> | Email: ${adminEmail}
        </p>
      </div>
    </div>
  `;

  try {
    transporter = initMailer();
    if (transporter) {
      const fromAddr = process.env.SMTP_FROM || process.env.SMTP_USER;

      const info1 = await transporter.sendMail({
        from: fromAddr,
        to: clientEmail,
        subject,
        html: htmlBody
      });
      console.log(`✅ [Nodemailer] Client email sent to ${clientEmail}! Message ID: ${info1.messageId} | Response: ${info1.response}`);

      if (adminEmail && adminEmail.toLowerCase() !== clientEmail.toLowerCase()) {
        const info2 = await transporter.sendMail({
          from: fromAddr,
          to: adminEmail,
          subject: `[ADMIN ALERT] ${subject} (${clientName})`,
          html: htmlBody
        });
        console.log(`✅ [Nodemailer] Admin email sent to ${adminEmail}! Message ID: ${info2.messageId} | Response: ${info2.response}`);
      }
      return { success: true, message: `Expiry notification email sent! (Message ID: ${info1.messageId})` };
    } else {
      console.log(`[SMTP Config Missing] Alert email for ${serviceName} (${clientEmail} & ${adminEmail})`);
      return { success: false, message: 'SMTP Configuration (SMTP_USER/SMTP_PASS) missing in server .env file.' };
    }
  } catch (error) {
    console.error('❌ Error sending service expiry email:', error);
    return { success: false, message: error.message || 'SMTP Email delivery failed' };
  }
};

export default initMailer;
