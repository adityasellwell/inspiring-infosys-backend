import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: 'info4inspiringinfosys@gmail.com',
    pass: 'kljdungfwtwzibzy'
  }
});

transporter.verify(function (error, success) {
  if (error) {
    console.log('Error:', error);
  } else {
    console.log('Server is ready to take our messages');
  }
});
