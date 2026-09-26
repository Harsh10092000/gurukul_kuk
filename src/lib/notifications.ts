import nodemailer from 'nodemailer';

export interface NotificationPayload {
  to: string;
  name: string;
  type:
  | 'APPLICATION_SUBMITTED'
  | 'PAYMENT_SUCCESS'
  | 'CORRECTION_REQUIRED'
  | 'APPLICATION_APPROVED'
  | 'APPLICATION_REJECTED'
  | 'ADMIT_CARD_RELEASED'
  | 'RESULT_DECLARED'
  | 'REGISTRATION_OTP'
  | 'REGISTRATION_CONFIRMATION'
  | 'FORGOT_REGISTRATION_RECOVERY'
  | 'FEE_PAYMENT_RECEIPT'
  | 'ADMIN_NEW_REGISTRATION_ALERT';
  data: Record<string, string | number>;
}

// Configure real Gmail SMTP with provided credentials
const SMTP_USER = (process.env.SMTP_USER || process.env.CMAIL || 'anshumiglaniji08@gmail.com').trim();
const SMTP_PASS = (process.env.SMTP_PASS || process.env.CPASS || '').replace(/\s+/g, '');
const FROM_EMAIL = (process.env.FROM_EMAIL || `"THE GURUKUL NILOKHERI" <${SMTP_USER}>`).trim();

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: SMTP_USER,
    pass: SMTP_PASS,
  },
});

export async function sendNotification(payload: NotificationPayload) {
  const { to, name, type, data } = payload;
  const cleanTo = (to || '').trim().toLowerCase();
  if (!cleanTo || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanTo)) {
    console.warn(`[Notification] Invalid or empty recipient email rejected: ${cleanTo}`);
    return { success: false, error: 'Invalid recipient email' };
  }
  console.log(`[Notification] Dispatching ${type} to ${cleanTo} (${name}) via Nodemailer`);

  let subject = 'The Gurukul Nilokheri - Notification';
  let message = '';
  let htmlContent = '';

  switch (type) {
    case 'REGISTRATION_OTP':
      subject = `The Gurukul Nilokheri - Your Registration OTP: ${data.otp}`;
      message = `Dear ${name || 'Candidate'}, your one-time verification code (OTP) for The Gurukul Entrance Registration is ${data.otp}. Valid for 10 minutes. Do not share with anyone.`;
      htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px; color: #1e293b; }
            .container { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
            .header { background: #0b192c; padding: 24px; text-align: center; border-bottom: 3px solid #f59e0b; }
            .header h1 { color: #ffffff; margin: 0 0 4px 0; font-size: 22px; letter-spacing: 0.5px; font-weight: 800; }
            .header p { color: #f59e0b; margin: 0; font-size: 12px; font-weight: bold; letter-spacing: 1px; }
            .content { padding: 32px 28px; }
            .greeting { font-size: 15px; font-weight: 600; color: #0f172a; margin-bottom: 12px; }
            .text { font-size: 14px; line-height: 1.6; color: #475569; margin: 0 0 20px 0; }
            .otp-box { background: #fffbeb; border: 2px dashed #f59e0b; border-radius: 12px; padding: 20px; text-align: center; margin: 24px 0; }
            .otp-label { font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 800; color: #92400e; margin-bottom: 6px; }
            .otp-code { font-family: 'Courier New', monospace; font-size: 38px; font-weight: 900; letter-spacing: 8px; color: #0b192c; margin: 6px 0; }
            .otp-validity { font-size: 12px; color: #b45309; font-weight: 500; }
            .footer { background: #f1f5f9; padding: 18px 24px; text-align: center; font-size: 11px; color: #64748b; border-top: 1px solid #e2e8f0; line-height: 1.5; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>THE GURUKUL NILOKHERI</h1>
              <p>ENTRANCE EXAMINATION • SESSION 2027-28</p>
            </div>
            <div class="content">
              <div class="greeting">Dear ${name || 'Candidate'},</div>
              <p class="text">
                Thank you for beginning your registration for The Gurukul. Please use the following One-Time Password (OTP) to verify your registration:
              </p>
              
              <div class="otp-box">
                <div class="otp-label">One-Time Verification Code</div>
                <div class="otp-code">${data.otp}</div>
                <div class="otp-validity">Valid for 10 minutes • Do not disclose to anyone</div>
              </div>

              <p class="text">
                If you did not initiate this request, please disregard this email or contact the Admission Helpdesk at <strong>+91 7027849858 / 59</strong>.
              </p>
            </div>
            <div class="footer">
              The Gurukul Nilokheri (Haryana)<br>
              CBSE Affiliated Institutional Network
            </div>
          </div>
        </body>
        </html>
      `;
      break;

    case 'FEE_PAYMENT_RECEIPT':
      subject = `Official Payment Receipt: The Gurukul Entrance Registration (${data.registrationNumber})`;
      message = `Dear ${name}, your application fee of Rs. ${data.amount || 800} for The Gurukul Entrance Examination (Session 2027-28) has been successfully received. Permanent Registration ID: ${data.registrationNumber}. Transaction ID: ${data.transactionId}. Please retain this receipt for candidate login and downloading your Admit Card with Registration ID: ${data.registrationNumber}.`;
      htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; margin: 0; padding: 24px 12px; color: #1e293b; }
            .container { max-width: 620px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #cbd5e1; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.07); }
            .header { background: #0b192c; padding: 26px 20px; text-align: center; border-bottom: 4px solid #f59e0b; }
            .header h1 { color: #ffffff; margin: 0 0 6px 0; font-size: 22px; font-weight: 800; letter-spacing: 0.5px; }
            .header p { color: #f59e0b; margin: 0; font-size: 12px; font-weight: 700; letter-spacing: 1px; }
            .header .sub { color: #94a3b8; font-size: 11px; margin-top: 4px; }
            .badge-box { background: #f0fdf4; border-bottom: 1px solid #bbf7d0; padding: 12px 20px; text-align: center; font-size: 13px; font-weight: 700; color: #166534; }
            .content { padding: 28px 24px; }
            .reg-box { background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); border: 2px dashed #0b192c; border-radius: 12px; padding: 20px; text-align: center; margin: 18px 0 24px 0; }
            .reg-label { font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 800; color: #475569; margin-bottom: 4px; }
            .reg-code { font-family: 'Courier New', Courier, monospace; font-size: 32px; font-weight: 900; letter-spacing: 3px; color: #0b192c; margin: 4px 0; }
            .reg-sub { font-size: 12px; color: #166534; font-weight: 600; }
            .receipt-title { font-size: 14px; font-weight: 800; color: #0f172a; margin-bottom: 12px; border-left: 4px solid #f59e0b; padding-left: 10px; text-transform: uppercase; letter-spacing: 0.5px; }
            .receipt-table { width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 13px; }
            .receipt-table td { padding: 9px 12px; border-bottom: 1px solid #e2e8f0; }
            .receipt-table td:first-child { color: #64748b; font-weight: 600; width: 42%; }
            .receipt-table td:last-child { color: #0f172a; font-weight: 700; }
            .notice-box { background: #eff6ff; border-left: 4px solid #3b82f6; padding: 14px 16px; border-radius: 0 8px 8px 0; font-size: 12px; line-height: 1.6; color: #1e40af; margin-bottom: 20px; }
            .footer { background: #f8fafc; padding: 20px; text-align: center; font-size: 11px; color: #64748b; border-top: 1px solid #e2e8f0; line-height: 1.6; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>THE GURUKUL NILOKHERI</h1>
              <p>OFFICIAL ENTRANCE EXAMINATION FEE RECEIPT (2027-28)</p>
              <div class="sub">CBSE Affiliated • Nilokheri, Haryana</div>
            </div>
            <div class="badge-box">
              ✓ FEE PAYMENT RECEIVED &amp; REGISTRATION NUMBER ASSIGNED
            </div>
            <div class="content">
              <p style="font-size: 15px; font-weight: 600; color: #0f172a; margin-top: 0;">Dear ${name},</p>
              <p style="font-size: 13.5px; line-height: 1.6; color: #334155; margin-bottom: 16px;">
                Thank you for applying to The Gurukul Nilokheri. Your online entrance examination application fee has been confirmed. Below is your official fee receipt and permanent registration details:
              </p>
              
              <div class="reg-box">
                <div class="reg-label">Permanent Registration Number</div>
                <div class="reg-code">${data.registrationNumber}</div>
                <div class="reg-sub">Use this number &amp; your password to sign in to the candidate portal</div>
              </div>

              <div class="receipt-title">Payment &amp; Candidate Particulars</div>
              <table class="receipt-table">
                <tr><td>Official Receipt Number</td><td>${data.receiptNumber}</td></tr>
                <tr><td>Candidate Full Name</td><td>${name}</td></tr>
                <tr><td>Class Applying For</td><td>${data.classApplying || 'Entrance Exam 2027-28'}</td></tr>
                <tr><td>Fee Amount Paid</td><td style="color: #166534; font-size: 14px;">₹${data.amount || 800} (Paid - Verified)</td></tr>
                <tr><td>Payment Mode</td><td>Online Netbanking / UPI / Cards</td></tr>
                <tr><td>Transaction ID / Reference</td><td>${data.transactionId || 'TXN_CONFIRMED'}</td></tr>
                <tr><td>Payment Date &amp; Time</td><td>${data.paymentDate || new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</td></tr>
                <tr><td>Application Status</td><td>Registered &amp; Confirmed</td></tr>
              </table>

              <div class="notice-box">
                <strong>Important Instructions:</strong>
                <ul style="margin: 6px 0 0 0; padding-left: 18px;">
                  <li>Log in to the portal using your <strong>Registration ID (${data.registrationNumber})</strong> and <strong>Password</strong>.</li>
                  <li>Download your official <strong>Admit Card</strong> using this <strong>Registration Number (${data.registrationNumber})</strong>.</li>
                </ul>
              </div>

              <p style="font-size: 12px; color: #64748b; line-height: 1.5; margin: 0;">
                For queries regarding entrance examination, please contact the Admission Helpdesk at <strong>+91 7027849858 / 59</strong> or email <strong>admissions@thegurukulnilokheri.com</strong>.
              </p>
            </div>
            <div class="footer">
              GURUKUL Institutional Network (Haryana)<br>
              This is a computer-generated official receipt. No physical signature is required.
            </div>
          </div>
        </body>
        </html>
      `;
      break;

    case 'ADMIN_NEW_REGISTRATION_ALERT':
      subject = `New Member Registered & Fee Paid: ${data.fullName} (${data.registrationNumber})`;
      message = `New candidate registration alert: ${data.fullName} has registered for ${data.classApplying} with Registration ID ${data.registrationNumber}. Fee of Rs. ${data.amountPaid || 800} received (Txn: ${data.transactionId}). Candidate Email: ${data.candidateEmail}, Mobile: ${data.candidateMobile}, Father: ${data.fatherName} (${data.fatherPhone}).`;
      htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; margin: 0; padding: 24px 12px; color: #1e293b; }
            .container { max-width: 620px; margin: 0 auto; background: #ffffff; border-radius: 14px; overflow: hidden; border: 1px solid #cbd5e1; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
            .header { background: #0b192c; padding: 20px 24px; border-bottom: 3px solid #f59e0b; }
            .header h2 { color: #ffffff; margin: 0 0 4px 0; font-size: 18px; font-weight: 800; }
            .header p { color: #f59e0b; margin: 0; font-size: 11px; font-weight: 700; letter-spacing: 1px; }
            .alert-banner { background: #eff6ff; border-bottom: 1px solid #bfdbfe; padding: 12px 24px; font-size: 13px; font-weight: 700; color: #1e40af; }
            .content { padding: 24px; }
            .info-table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 13px; }
            .info-table td { padding: 9px 12px; border-bottom: 1px solid #e2e8f0; }
            .info-table td:first-child { color: #64748b; font-weight: 600; width: 38%; }
            .info-table td:last-child { color: #0f172a; font-weight: 700; }
            .footer { background: #f8fafc; padding: 16px 24px; text-align: center; font-size: 11px; color: #64748b; border-top: 1px solid #e2e8f0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2>GURUKUL</h2>
              <p>ADMISSIONS & ENTRANCE EXAMINATION CELL - ADMIN ALERT</p>
            </div>
            <div class="alert-banner">
              📢 NEW CANDIDATE REGISTERED & APPLICATION FEE RECEIVED
            </div>
            <div class="content">
              <p style="font-size: 14px; color: #334155; margin-top: 0; line-height: 1.5;">
                A new member/candidate has registered on the entrance portal and completed the application fee payment. The candidate's particulars are as follows:
              </p>
              <table class="info-table">
                <tr><td>Registration Number</td><td style="color: #0b192c; font-size: 14px;">${data.registrationNumber}</td></tr>
                <tr><td>Application Number</td><td>${data.applicationNumber}</td></tr>
                <tr><td>Receipt Number</td><td>${data.receiptNumber}</td></tr>
                <tr><td>Candidate Name</td><td>${data.fullName}</td></tr>
                <tr><td>Class Applying</td><td>${data.classApplying}</td></tr>
                <tr><td>Candidate Email</td><td><a href="mailto:${data.candidateEmail}">${data.candidateEmail}</a></td></tr>
                <tr><td>Candidate Mobile</td><td>${data.candidateMobile}</td></tr>
                <tr><td>Father's Name</td><td>${data.fatherName}</td></tr>
                <tr><td>Father's Mobile</td><td>${data.fatherPhone}</td></tr>
                <tr><td>Mother's Name</td><td>${data.motherName}</td></tr>
                <tr><td>Date of Birth</td><td>${data.dob}</td></tr>
                <tr><td>Gender & Category</td><td>${data.gender} / ${data.category}</td></tr>
                <tr><td>Aadhaar Number</td><td>${data.aadhaarNumber}</td></tr>
                <tr><td>Address / Location</td><td>${data.address}</td></tr>
                <tr><td>Previous School</td><td>${data.previousSchool}</td></tr>
                <tr><td>Marks / Percentage</td><td>${data.previousMarks}</td></tr>
                <tr><td>Fee Amount Paid</td><td style="color: #166534;">₹${data.amountPaid} (Paid)</td></tr>
                <tr><td>Transaction ID</td><td>${data.transactionId}</td></tr>
                <tr><td>Registration Time</td><td>${data.registrationTime}</td></tr>
              </table>
              <p style="font-size: 12px; color: #64748b; margin-top: 20px; line-height: 1.5;">
                You can view the uploaded documents, verify eligibility, and allot Roll Number in the <a href="http://localhost:3000/admin/dashboard" style="color: #2563eb; font-weight: 600;">Admin Management Portal</a>.
              </p>
            </div>
            <div class="footer">
              Automated Administrative Notification • The Gurukul Nilokheri Portal System • Nilokheri, Haryana
            </div>
          </div>
        </body>
        </html>
      `;
      break;

    case 'REGISTRATION_CONFIRMATION':
      subject = `The Gurukul Nilokheri - Fee Paid & Registration Confirmed: ${data.registrationNumber}`;
      message = `Dear ${name}, congratulations! Fee payment of Rs. ${data.amount || 1200} received (Txn: ${data.transactionId || 'Confirmed'}). Your permanent Registration Number is ${data.registrationNumber}. Please keep this safe for accessing candidate services and your Admit Card.`;
      htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px; color: #1e293b; }
            .container { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
            .header { background: #0b192c; padding: 24px; text-align: center; border-bottom: 3px solid #f59e0b; }
            .header h1 { color: #ffffff; margin: 0 0 4px 0; font-size: 22px; font-weight: 800; letter-spacing: 0.5px; }
            .header p { color: #f59e0b; margin: 0; font-size: 12px; font-weight: bold; letter-spacing: 1px; }
            .content { padding: 32px 28px; }
            .reg-box { background: #f0fdf4; border: 2px solid #86efac; border-radius: 12px; padding: 20px; text-align: center; margin: 24px 0; }
            .reg-label { font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 800; color: #166534; margin-bottom: 6px; }
            .reg-code { font-family: 'Courier New', monospace; font-size: 34px; font-weight: 900; letter-spacing: 3px; color: #15803d; margin: 6px 0; }
            .receipt-table { width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 13px; }
            .receipt-table td { padding: 8px 12px; border-bottom: 1px solid #e2e8f0; }
            .receipt-table td:first-child { color: #64748b; font-weight: 600; width: 40%; }
            .receipt-table td:last-child { color: #0f172a; font-weight: 700; }
            .footer { background: #f1f5f9; padding: 18px 24px; text-align: center; font-size: 11px; color: #64748b; border-top: 1px solid #e2e8f0; line-height: 1.5; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>THE GURUKUL NILOKHERI</h1>
              <p>OFFICIAL E-RECEIPT & REGISTRATION CONFIRMATION (2027-28)</p>
            </div>
            <div class="content">
              <p style="font-size: 15px; font-weight: 600; color: #0f172a;">Dear ${name || 'Candidate'},</p>
              <p style="font-size: 14px; line-height: 1.6; color: #475569;">
                Congratulations! Your entrance examination application fee has been received and your permanent <strong>Registration Number</strong> has been officially generated.
              </p>
              
              <div class="reg-box">
                <div class="reg-label">Permanent Registration Number</div>
                <div class="reg-code">${data.registrationNumber}</div>
                <div style="font-size: 12px; color: #166534; font-weight: 500;">Please save this number for portal sign-in and Admit Card download</div>
              </div>

              <table class="receipt-table">
                <tr><td>Class Applied</td><td>${data.classApplying || 'Entrance 2027-28'}</td></tr>
                <tr><td>Fee Amount Paid</td><td>₹${data.amount || 1200} (Confirmed)</td></tr>
                <tr><td>Transaction ID</td><td>${data.transactionId || 'TXN_GK_CONFIRMED'}</td></tr>
                <tr><td>Payment Date</td><td>${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</td></tr>
              </table>

              <p style="font-size: 13px; line-height: 1.6; color: #64748b;">
                <strong>Next Step:</strong> Your application is now under review by the Examination Cell. Examination Roll Numbers and Admit Cards will be issued prior to the written entrance exam.
              </p>
            </div>
            <div class="footer">
              The Gurukul Nilokheri, Haryana<br>
              CBSE Affiliated • Admissions Portal: admissions.thegurukulnilokheri.com
            </div>
          </div>
        </body>
        </html>
      `;
      break;

    case 'FORGOT_REGISTRATION_RECOVERY':
      subject = `The Gurukul Nilokheri - Your Registration Number: ${data.registrationNumber}`;
      message = `Dear ${name || 'Candidate'}, as requested, your permanent Registration Number for The Gurukul Nilokheri Entrance Examination (Session 2027-28) is ${data.registrationNumber}. Please use this Registration Number and your password to sign in to the portal at http://localhost:3000/.`;
      htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px 12px; color: #1e293b; }
            .container { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
            .header { background: #0b192c; padding: 24px; text-align: center; border-bottom: 3px solid #f59e0b; }
            .header h1 { color: #ffffff; margin: 0 0 4px 0; font-size: 22px; font-weight: 800; letter-spacing: 0.5px; }
            .header p { color: #f59e0b; margin: 0; font-size: 12px; font-weight: bold; letter-spacing: 1px; }
            .content { padding: 32px 28px; }
            .reg-box { background: #eff6ff; border: 2px dashed #2563eb; border-radius: 14px; padding: 22px; text-align: center; margin: 20px 0; }
            .reg-label { font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 800; color: #1e40af; margin-bottom: 6px; }
            .reg-code { font-family: 'Courier New', monospace; font-size: 34px; font-weight: 900; letter-spacing: 4px; color: #0b192c; margin: 6px 0; }
            .btn { display: inline-block; background: #0b192c; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 10px; font-weight: 800; font-size: 13px; margin-top: 16px; }
            .footer { background: #f1f5f9; padding: 18px 24px; text-align: center; font-size: 11px; color: #64748b; border-top: 1px solid #e2e8f0; line-height: 1.5; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>THE GURUKUL NILOKHERI</h1>
              <p>ACCOUNT RECOVERY & REGISTRATION DETAILS (2027-28)</p>
            </div>
            <div class="content">
              <p style="font-size: 15px; font-weight: 600; color: #0f172a;">Dear ${name || 'Candidate'},</p>
              <p style="font-size: 14px; line-height: 1.6; color: #475569;">
                You recently requested to retrieve your forgotten Registration Number for the <strong>The Gurukul Nilokheri Entrance Examination 2027-28</strong>.
              </p>
              
              <div class="reg-box">
                <div class="reg-label">Your Permanent Registration Number</div>
                <div class="reg-code">${data.registrationNumber}</div>
                <div style="font-size: 12px; color: #2563eb; font-weight: 600; margin-top: 4px;">
                  Class: ${data.className || 'Entrance 2027-28'}
                </div>
              </div>

              <p style="font-size: 13px; line-height: 1.6; color: #475569;">
                Please use this Registration Number along with your password to log in to the candidate portal.
              </p>

              <div style="text-align: center; margin: 24px 0 10px 0;">
                <a href="http://localhost:3000/" class="btn" style="color: #ffffff;">Sign In to Candidate Portal →</a>
              </div>
            </div>
            <div class="footer">
              The Gurukul Nilokheri, Haryana<br>
              Helpline: +91 7027849858 / 59 • Email: admissions@thegurukulnilokheri.com
            </div>
          </div>
        </body>
        </html>
      `;
      break;

    case 'APPLICATION_SUBMITTED':
      subject = 'The Gurukul Nilokheri – Application Submitted Successfully';
      message = `Dear ${name || 'Candidate'},\n\nYour application for Entrance Examination 2027-28 has been successfully submitted.\n\nRegistration Number:\n${data.registrationNumber || data.applicationNumber}\n\nPlease keep this registration number safe for future reference.\n\nRegards,\nThe Gurukul Nilokheri\nAdmissions / Examination Department`;
      htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px 12px; color: #1e293b; }
            .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
            .header { background: #0b192c; padding: 24px 20px; text-align: center; border-bottom: 3px solid #f59e0b; }
            .header h1 { color: #ffffff; margin: 0 0 4px 0; font-size: 20px; font-weight: 800; letter-spacing: 0.5px; }
            .header p { color: #f59e0b; margin: 0; font-size: 11px; font-weight: bold; letter-spacing: 1px; }
            .content { padding: 32px 28px; }
            .reg-box { background: #f0fdf4; border: 2px dashed #16a34a; border-radius: 12px; padding: 20px; text-align: center; margin: 24px 0; }
            .reg-label { font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 800; color: #166534; margin-bottom: 6px; }
            .reg-code { font-family: 'Courier New', monospace; font-size: 32px; font-weight: 900; letter-spacing: 3px; color: #0b192c; margin: 6px 0; }
            .footer { background: #f1f5f9; padding: 18px 24px; text-align: center; font-size: 11px; color: #64748b; border-top: 1px solid #e2e8f0; line-height: 1.5; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>THE GURUKUL NILOKHERI</h1>
              <p>ENTRANCE EXAMINATION (SESSION 2027-28)</p>
            </div>
            <div class="content">
              <p style="font-size: 15px; font-weight: 600; color: #0f172a; margin-top: 0;">Dear ${name || 'Candidate'},</p>
              <p style="font-size: 14px; line-height: 1.6; color: #334155;">
                Your application for Entrance Examination 2027-28 has been successfully submitted.
              </p>
              
              <div class="reg-box">
                <div class="reg-label">Registration Number</div>
                <div class="reg-code">${data.registrationNumber || data.applicationNumber}</div>
                <div style="font-size: 12px; color: #166534; font-weight: 600; margin-top: 4px;">
                  Class: ${data.classApplying || 'Entrance Examination'}
                </div>
              </div>

              <p style="font-size: 13.5px; line-height: 1.6; color: #334155;">
                Please keep this registration number safe for future reference. You will require it along with your password to access the candidate portal, track document scrutiny, and download your Admit Card.
              </p>

              <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 13px; color: #475569;">
                Regards,<br>
                <strong>The Gurukul Nilokheri</strong><br>
                Admissions / Examination Department
              </div>
            </div>
            <div class="footer">
              The Gurukul Nilokheri, Haryana<br>
              Helpline: +91 7027849858 / 59 • Email: admissions@thegurukulnilokheri.com
            </div>
          </div>
        </body>
        </html>
      `;
      break;

    case 'PAYMENT_SUCCESS':
      subject = `The Gurukul Nilokheri - Payment Receipt (Txn: ${data.transactionId})`;
      message = `Dear ${name}, entrance examination fee of Rs. ${data.amount} received (Txn: ${data.transactionId}). Your Registration No is ${data.registrationNumber}. Your application is confirmed.`;
      htmlContent = `<p>${message}</p>`;
      break;

    case 'CORRECTION_REQUIRED':
      subject = `The Gurukul Nilokheri - Action Required: Documents / Details Demanded (${data.applicationNumber})`;
      message = `Dear ${name}, the Admissions & Scrutiny Committee has requested additional details/documents for your application ${data.applicationNumber}. Remarks: "${data.remarks}". Please log in to your candidate dashboard to upload the demanded documents or submit clarifications.`;
      htmlContent = `
        <div style="font-family: sans-serif; padding: 20px; color: #1e293b; background: #fffbeb; border: 1px solid #fef08a; border-radius: 12px;">
          <h2 style="color: #854d0e; margin-top: 0;">⚠️ Action Required: Documents / Details Demanded</h2>
          <p>Dear <strong>${name}</strong>,</p>
          <p>The Admissions Committee at The Gurukul Nilokheri has reviewed your application (<strong>${data.applicationNumber}</strong>) and requested additional details or document revisions:</p>
          <div style="background: #ffffff; padding: 15px; border-left: 4px solid #eab308; margin: 15px 0; border-radius: 4px;">
            <strong>Officer Remarks:</strong> ${data.remarks || 'Please upload clear verification documents.'}
          </div>
          <p>Please log in to your <a href="http://localhost:3000/login" style="color: #2563eb; font-weight: bold;">Candidate Dashboard</a> to upload the requested documents directly.</p>
        </div>
      `;
      break;

    case 'APPLICATION_APPROVED':
      subject = `The Gurukul Nilokheri - Application Dossier Approved: ${data.applicationNumber}`;
      message = `Dear ${name}, congratulations! Your application dossier (${data.applicationNumber}) for The Gurukul Nilokheri Entrance Examination (Session 2027-28) has been officially approved and verified by the Admissions Committee. You can log in to view entrance examination schedule updates and download your Admit Card once released.`;
      htmlContent = `
        <div style="font-family: sans-serif; padding: 20px; color: #1e293b; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px;">
          <h2 style="color: #166534; margin-top: 0;">🎉 Application Dossier Approved & Verified!</h2>
          <p>Dear <strong>${name}</strong>,</p>
          <p>Congratulations! Your entrance examination application (<strong>${data.applicationNumber}</strong>) has been verified and approved by the The Gurukul Nilokheri Admissions Committee.</p>
          <p>Remarks: <em>${data.remarks || 'All submitted documents verified successfully.'}</em></p>
          <p>You can now log in to the portal to track your application status and download your Admit Card once released.</p>
        </div>
      `;
      break;

    case 'APPLICATION_REJECTED':
      subject = `Official Notice: Application Rejected / Disqualified - The Gurukul Nilokheri Entrance 2027-28 (${data.applicationNumber})`;
      message = `Dear ${name}, this is an official notification that your entrance examination application (${data.applicationNumber}) has been REJECTED by the Admissions & Scrutiny Committee. Reason for Rejection: "${data.remarks || 'Documentation or eligibility criteria mismatch'}". As per guidelines, all previous details submitted under this dossier have been annulled. You may log in to the candidate portal at http://localhost:3000/login to refill a fresh Admission form or raise an official query before the application window closes.`;
      htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px 12px; color: #1e293b; }
            .container { max-width: 620px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.07); }
            .header { background: #0b192c; padding: 26px 20px; text-align: center; border-bottom: 4px solid #ef4444; }
            .header h1 { color: #ffffff; margin: 0 0 4px 0; font-size: 22px; font-weight: 800; letter-spacing: 0.5px; }
            .header p { color: #f87171; margin: 0; font-size: 12px; font-weight: 700; letter-spacing: 1px; }
            .header .sub { color: #94a3b8; font-size: 11px; margin-top: 4px; }
            .alert-banner { background: #fef2f2; border-bottom: 2px solid #fecaca; padding: 14px 20px; text-align: center; font-size: 13px; font-weight: 800; color: #991b1b; letter-spacing: 0.5px; }
            .content { padding: 28px 24px; }
            .info-table { width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 13px; }
            .info-table td { padding: 9px 12px; border-bottom: 1px solid #f1f5f9; }
            .info-table td:first-child { color: #64748b; font-weight: 600; width: 40%; }
            .info-table td:last-child { color: #0f172a; font-weight: 700; }
            .rejection-box { background: #fff5f5; border: 2px solid #fca5a5; border-radius: 12px; padding: 18px; margin: 20px 0; }
            .rejection-title { font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 800; color: #b91c1c; margin-bottom: 6px; }
            .rejection-reason { font-size: 14px; font-weight: 700; color: #7f1d1d; line-height: 1.5; }
            .instruction-box { background: #f8fafc; border-left: 4px solid #0b192c; padding: 14px 16px; border-radius: 0 8px 8px 0; font-size: 12px; line-height: 1.6; color: #334155; margin-bottom: 24px; }
            .btn-row { text-align: center; margin: 20px 0 10px 0; }
            .btn-primary { display: inline-block; background: #0b192c; color: #ffffff !important; text-decoration: none; padding: 12px 28px; border-radius: 10px; font-weight: 800; font-size: 13px; }
            .footer { background: #f8fafc; padding: 20px; text-align: center; font-size: 11px; color: #64748b; border-top: 1px solid #e2e8f0; line-height: 1.6; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>THE GURUKUL NILOKHERI</h1>
              <p>ADMISSIONS & ENTRANCE EXAMINATION CELL (SESSION 2027-28)</p>
              <div class="sub">CBSE Affiliated • Nilokheri, Haryana</div>
            </div>
            <div class="alert-banner">
              ⚠️ OFFICIAL NOTICE: Admission FORM REJECTED / DISQUALIFIED
            </div>
            <div class="content">
              <p style="font-size: 15px; font-weight: 600; color: #0f172a; margin-top: 0;">Dear ${name || 'Candidate'},</p>
              <p style="font-size: 13px; line-height: 1.6; color: #475569;">
                This is to officially inform you that following scrutiny by the Admissions & Examination Committee, your application dossier for the <strong>The Gurukul Nilokheri Entrance Examination (2027-28)</strong> has been <strong>REJECTED</strong>.
              </p>

              <table class="info-table">
                <tr><td>Application Number</td><td style="font-family: monospace; font-size: 14px; color: #0b192c;">${data.applicationNumber}</td></tr>
                <tr><td>Candidate Name</td><td>${name || 'Candidate'}</td></tr>
                <tr><td>Class Applied</td><td>${data.classApplying || 'Entrance Examination'}</td></tr>
                <tr><td>Scrutiny Outcome</td><td style="color: #dc2626; font-weight: 800;">REJECTED</td></tr>
                <tr><td>Date of Scrutiny</td><td>${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</td></tr>
              </table>

              <div class="rejection-box">
                <div class="rejection-title">Official Ground / Reason for Rejection</div>
                <div class="rejection-reason">${data.remarks || 'Document mismatch, incomplete particulars, or failure to satisfy prescribed eligibility criteria.'}</div>
              </div>

              <div class="instruction-box">
                <strong>Next Steps & Redressal Options:</strong>
                <ul style="margin: 6px 0 0 0; padding-left: 20px;">
                  <li><strong>Refill Application:</strong> As per examination bylaws, your previous particulars have been annulled. You may sign in to your portal account to <strong>Refill a fresh Admission form</strong> before the closing date.</li>
                  <li><strong>Raise Grievance:</strong> If you believe this rejection was made in error, you may submit an official query / grievance directly through the candidate portal.</li>
                </ul>
              </div>

              <div class="btn-row">
                <a href="http://localhost:3000/login" class="btn-primary">Sign In to Candidate Portal →</a>
              </div>
            </div>
            <div class="footer">
              Examination Control Division • The Gurukul Nilokheri, Haryana - 132117<br>
              Helpline: +91 7027849858 / 59 • Email: admissions@thegurukulnilokheri.com
            </div>
          </div>
        </body>
        </html>
      `;
      break;

    case 'ADMIT_CARD_RELEASED':
      // Under strict policy: Do not send any email to users when admit cards are declared
      console.log('[Notification] Suppressed email for ADMIT_CARD_RELEASED (admit card emails are disabled).');
      return {
        success: true,
        channels: [],
        message: 'Admit card email dispatch disabled per policy.',
      };

    case 'RESULT_DECLARED':
      subject = 'The Gurukul Nilokheri - Entrance Examination Result Declared';
      message = 'Dear Candidate, The Entrance Examination Result has been declared. Please visit the official portal to check your result.';
      htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px 12px; color: #1e293b; }
            .container { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
            .header { background: #0b192c; padding: 24px; text-align: center; border-bottom: 3px solid #f59e0b; }
            .header h1 { color: #ffffff; margin: 0 0 4px 0; font-size: 22px; font-weight: 800; letter-spacing: 0.5px; }
            .header p { color: #f59e0b; margin: 0; font-size: 12px; font-weight: bold; letter-spacing: 1px; }
            .content { padding: 32px 28px; text-align: center; }
            .status-badge { display: inline-block; background: #ecfdf5; color: #065f46; font-size: 12px; font-weight: 700; padding: 6px 16px; border-radius: 9999px; border: 1px solid #a7f3d0; margin-bottom: 18px; }
            .title { font-size: 20px; font-weight: 800; color: #0f172a; margin: 0 0 14px 0; }
            .message { font-size: 14px; line-height: 1.6; color: #475569; margin: 0 0 24px 0; }
            .btn { display: inline-block; background: #0b192c; color: #ffffff !important; text-decoration: none; padding: 12px 28px; border-radius: 10px; font-weight: 700; font-size: 13px; }
            .footer { background: #f1f5f9; padding: 18px 24px; text-align: center; font-size: 11px; color: #64748b; border-top: 1px solid #e2e8f0; line-height: 1.5; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>THE GURUKUL NILOKHERI</h1>
              <p>ENTRANCE EXAMINATION • SESSION 2027-28</p>
            </div>
            <div class="content">
              <div class="status-badge">Official Announcement</div>
              <h2 class="title">Result Has Been Declared</h2>
              <p class="message">
                The entrance examination result has been declared. You may visit the official admission portal to check your result status.
              </p>
              <div>
                <a href="http://localhost:3000/result" class="btn">Check Result on Portal →</a>
              </div>
            </div>
            <div class="footer">
              The Gurukul Nilokheri, Haryana<br>
              Admissions &amp; Examination Cell • admissions@thegurukulnilokheri.com
            </div>
          </div>
        </body>
        </html>
      `;
      break;
  }

  // If the recipient looks like an email address, send real email via Nodemailer
  if (to && to.includes('@')) {
    try {
      const info = await transporter.sendMail({
        from: FROM_EMAIL,
        to,
        subject,
        text: message,
        html: htmlContent,
      });

      console.log(`[Nodemailer] Successfully sent email to ${to}. MessageId: ${info.messageId}`);
      return {
        success: true,
        channels: ['Email'],
        messageId: info.messageId,
        deliveredAt: new Date().toISOString(),
        message,
      };
    } catch (err: any) {
      console.error(`[Nodemailer] Error sending email to ${to}:`, err);
      return {
        success: false,
        error: err.message,
        channels: ['Email'],
        deliveredAt: new Date().toISOString(),
        message,
      };
    }
  }

  // Fallback for SMS/WhatsApp
  return {
    success: true,
    channels: ['SMS', 'WhatsApp'],
    deliveredAt: new Date().toISOString(),
    message,
  };
}

