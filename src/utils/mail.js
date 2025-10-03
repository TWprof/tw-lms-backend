import nodemailer from "nodemailer";
import constants from "../constants/index.js";

const sendEmail = async (option, type) => {
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: parseInt(process.env.EMAIL_PORT, 10),
      secure: true,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
      tls: {
        rejectUnauthorized: false,
      },
    });

    let subject;

    if (constants.passwordReset === type) {
      subject = option.subject;
    } else if (constants.verifyEmail === type) {
      subject = option.subject;
    } else if (constants.setPassword === type) {
      subject = option.subject;
    } else if (constants.notifyPurchase === type) {
      subject = option.subject;
    }

    const emailOptions = {
      from: `"Techware Academy" <${process.env.EMAIL_USER}>`,
      to: option.to,
      subject,
      html: option.message,
    };

    if (!option.message) {
      console.warn("Email message content is missing.");
    }

    const info = await transporter.sendMail(emailOptions);
    console.log("Message sent: %s", info.messageId);
    return info;
  } catch (error) {
    console.error("Failed to send email: ", error.message);
    console.error(error);
  }
};

export default sendEmail;
