const { SNSClient, PublishCommand } = require("@aws-sdk/client-sns");
const { SQSClient, ReceiveMessageCommand, DeleteMessageCommand } = require("@aws-sdk/client-sqs");
const dotenv = require("dotenv");
dotenv.config();

const awsConfig = {
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.ACCESS_KEY,
    secretAccessKey: process.env.SECRET_KEY,
  },
};

const sns = new SNSClient(awsConfig);
const sqs = new SQSClient(awsConfig);

exports.handler = async (event, context) => {
  try {
    const queueUrl = process.env.AWS_QUEUE_URL;
    const receiveParams = {
      QueueUrl: queueUrl,
      MaxNumberOfMessages: 1,
      WaitTimeSeconds: 15,
    };

    const { Messages } = await sqs.send(new ReceiveMessageCommand(receiveParams));

    if (Messages?.length > 0) {
      const message = Messages[0];
      const { Body: messageBody } = message;

      const smsTemplate = generateSMSTemplate(JSON.parse(messageBody));

      await publishSmsToPhoneNumber("+1234567890", smsTemplate);

      await sqs.send(new DeleteMessageCommand({
        QueueUrl: queueUrl,
        ReceiptHandle: message.ReceiptHandle,
      }));
    }

    return "Messages processed successfully.";
  } catch (error) {
    console.error("Lambda function error:", error);
    throw error;
  }
};

function generateSMSTemplate({ name, content }) {
  return `Hello ${name}! Here's the message content: ${content}.`;
}

async function publishSmsToPhoneNumber(phoneNumber, message) {
  try {
    const snsParams = { PhoneNumber: phoneNumber, Message: message };
    await sns.send(new PublishCommand(snsParams));
  } catch (error) {
    console.error("Error sending SMS to phone number:", error);
    throw error;
  }
}


module.exports = {
  generateSMSTemplate,
  publishSmsToPhoneNumber,
};