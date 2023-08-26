const { messageTemplate, emailTemplate } = require("./utils/utils");
const dotenv = require("dotenv");
dotenv.config();
const { SENDER_EMAIL } = process.env;

const senderEmail = SENDER_EMAIL;

const phoneNumberPattern = /^\+\d{1,4}\s?\d+$/;
const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

exports.handler = async (input) => {
  const { notificationType, emailSubject } = input;
  try {
    if (emailPattern.test(notificationType)) {
      const result = await emailTemplate(
        senderEmail,
        notificationType,
        emailSubject
      );

      return result;
    } else if (phoneNumberPattern.test(notificationType)) {
      const result = await messageTemplate(notificationType);

      return result;
    }

    return {
      statusCode: 400,
      body: "Invalid email or phone number.",
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
