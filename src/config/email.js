const nodemailer = require('nodemailer');
const dns = require('dns');

// Force Node.js to use IPv4 instead of IPv6 to fix ENETUNREACH on Render
if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder('ipv4first');
}

const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT, 10) || 465,
    secure: process.env.EMAIL_PORT ? parseInt(process.env.EMAIL_PORT, 10) === 465 : true,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
};

module.exports = createTransporter;
