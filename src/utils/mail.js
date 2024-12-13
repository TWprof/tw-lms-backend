import nodemailer from "nodemailer";
import constants from "../constants/index.js";

const sendEmail = async (option, type) => {
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: parseInt(process.env.EMAIL_PORT, 10),
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    });

    let subject;

    if (constants.passwordReset === type) {
      subject = option.subject;
    } else if (constants.verifyEmail === type) {
      subject = option.subject;
    } else if (constants.setPassword === type) {
      subject = option.subject;
    }

    const emailOptions = {
      from: "TECHWARE SERVICES <info@techware.ng>",
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
    console.error("Failed to send email: ", error);
    throw error;
  }
};

export default sendEmail;
