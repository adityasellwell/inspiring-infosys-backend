import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: Number(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

console.log('Testing Gmail SMTP connection...');
console.log('Host:', process.env.SMTP_HOST);
console.log('User:', process.env.SMTP_USER);

try {
  await transporter.verify();
  console.log('✅ Gmail SMTP connection SUCCESSFUL!');
  
  const info = await transporter.sendMail({
    from: `"Inspiring Infosys" <${process.env.SMTP_FROM}>`,
    to: process.env.ADMIN_EMAIL,
    subject: 'Test Email from Gmail App Password',
    text: 'If you receive this email, Gmail App Password configuration works perfectly!',
  });
  console.log('✅ Message sent successfully! MessageId:', info.messageId);
} catch (error) {
  console.error('❌ Gmail SMTP Error:', error.message);
}
