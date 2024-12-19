const nodemailer = require('nodemailer');

// Create nodemailer transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

// Email templates
const templates = {
  'message-notification': {
    subject: 'New Message',
    html: (data) => `
      <h2>Hello ${data.username},</h2>
      <p>You have a new message from ${data.notification.sender.username}:</p>
      <p>${data.notification.message}</p>
      <p>Click <a href="${data.notification.metadata?.url}">here</a> to view the message.</p>
    `
  },
  'call-notification': {
    subject: 'Missed Call',
    html: (data) => `
      <h2>Hello ${data.username},</h2>
      <p>You missed a ${data.notification.metadata?.type} call from ${data.notification.sender.username}.</p>
      <p>The call was at ${new Date(data.notification.createdAt).toLocaleString()}</p>
    `
  },
  'group-notification': {
    subject: 'Group Update',
    html: (data) => `
      <h2>Hello ${data.username},</h2>
      <p>${data.notification.message}</p>
      <p>Click <a href="${data.notification.metadata?.url}">here</a> to view the group.</p>
    `
  },
  'timetable-notification': {
    subject: 'Timetable Update',
    html: (data) => `
      <h2>Hello ${data.username},</h2>
      <p>There has been an update to your timetable:</p>
      <p>${data.notification.message}</p>
      <p>Click <a href="${data.notification.metadata?.url}">here</a> to view the updated timetable.</p>
    `
  },
  'lecture-notification': {
    subject: 'Lecture Update',
    html: (data) => `
      <h2>Hello ${data.username},</h2>
      <p>${data.notification.message}</p>
      <p><strong>Course:</strong> ${data.notification.metadata?.courseUnit?.name}</p>
      <p><strong>Time:</strong> ${data.notification.metadata?.startTime}</p>
      <p><strong>Room:</strong> ${data.notification.metadata?.room}</p>
      <p>Click <a href="${data.notification.metadata?.url}">here</a> to join the lecture.</p>
    `
  },
  'assignment-notification': {
    subject: 'New Assignment',
    html: (data) => `
      <h2>Hello ${data.username},</h2>
      <p>A new assignment has been posted:</p>
      <p><strong>Title:</strong> ${data.notification.title}</p>
      <p><strong>Due Date:</strong> ${new Date(data.notification.metadata?.dueDate).toLocaleString()}</p>
      <p>${data.notification.message}</p>
      <p>Click <a href="${data.notification.metadata?.url}">here</a> to view the assignment.</p>
    `
  },
  'announcement-notification': {
    subject: 'New Announcement',
    html: (data) => `
      <h2>Hello ${data.username},</h2>
      <p><strong>${data.notification.title}</strong></p>
      <p>${data.notification.message}</p>
      ${data.notification.metadata?.url ? 
        `<p>Click <a href="${data.notification.metadata.url}">here</a> for more information.</p>` : 
        ''}
    `
  },
  'default-notification': {
    subject: 'Notification',
    html: (data) => `
      <h2>Hello ${data.username},</h2>
      <p>${data.notification.message}</p>
    `
  }
};

// Send email function
const sendEmail = async ({ to, subject, template, data }) => {
  try {
    const emailTemplate = templates[template] || templates['default-notification'];
    
    const mailOptions = {
      from: `"MRU Chat" <${process.env.SMTP_FROM}>`,
      to,
      subject: subject || emailTemplate.subject,
      html: emailTemplate.html(data)
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent:', info.messageId);
    return info;

  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
};

// Send bulk emails
const sendBulkEmails = async (recipients, { subject, template, data }) => {
  try {
    const results = await Promise.allSettled(
      recipients.map(recipient =>
        sendEmail({
          to: recipient.email,
          subject,
          template,
          data: {
            ...data,
            username: recipient.username
          }
        })
      )
    );

    return results.map((result, index) => ({
      email: recipients[index].email,
      status: result.status,
      error: result.reason
    }));

  } catch (error) {
    console.error('Error sending bulk emails:', error);
    throw error;
  }
};

// Verify email configuration
const verifyEmailConfig = async () => {
  try {
    await transporter.verify();
    console.log('Email configuration verified');
    return true;
  } catch (error) {
    console.error('Email configuration error:', error);
    return false;
  }
};

module.exports = {
  sendEmail,
  sendBulkEmails,
  verifyEmailConfig
};
