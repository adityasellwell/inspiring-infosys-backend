import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: 'smtp.hostinger.com',
  port: 465,
  secure: true,
  auth: {
    user: 'info@inspiringinfosys.com',
    pass: 'wrongpassword'
  }
});

transporter.verify(function (error, success) {
  if (error) {
    console.log('Hostinger Error:', error.message);
  } else {
    console.log('Server is ready');
  }
});
