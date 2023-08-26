const dotenv = require("dotenv");
dotenv.config();
const { AWS_QUEUE_URL, REGION } = process.env;

const AWS = require("aws-sdk");
const sqs = new AWS.SQS({ region: REGION });
const sns = new AWS.SNS({ region: REGION });
const ses = new AWS.SES({ region: REGION });

const notificationTemplate = async () => {
  const receiveParams = {
    QueueUrl: AWS_QUEUE_URL,
    MaxNumberOfMessages: 1,
    WaitTimeSeconds: 30,
  };
  const { Messages } = await sqs.receiveMessage(receiveParams).promise();
  if (!Messages || Messages.length === 0) {
    return "No messages found in SQS queue.";
  }
  const message = Messages[0];
  const messageBody = JSON.parse(message.Body);
  const { messageContent } = messageBody;
  const template = `Message: ${messageContent}`;
  return { template, message };
};

exports.messageTemplate = async (notificationType) => {
  const result = await notificationTemplate();

  const { template, message } = result;

  if (!message) {
    return {
      statusCode: 404,
      body: "No messages found in SQS queue.",
    };
  } else {
    const smsParams = {
      Message: template,
      PhoneNumber: notificationType,
    };

    await sns.publish(smsParams).promise();

    const deleteParams = {
      QueueUrl: AWS_QUEUE_URL,
      ReceiptHandle: message.ReceiptHandle,
    };

    await sqs.deleteMessage(deleteParams).promise();

    return {
      statusCode: 200,
      body: "Message processed and sent via sms.",
    };
  }
};

exports.emailTemplate = async (senderEmail, receipientEmail, emailSubject) => {
  const { template, message } = await notificationTemplate();

  if (!message) {
    return {
      statusCode: 404,
      body: "No messages found in SQS queue.",
    };
  }

  const emailParams = {
    Source: senderEmail,
    Destination: {
      ToAddresses: [receipientEmail],
    },
    Message: {
      Subject: {
        Data: `${emailSubject}`,
      },
      Body: {
        Text: {
          Data: template,
        },
      },
    },
  };

  await ses.sendEmail(emailParams).promise();

  const deleteParams = {
    QueueUrl: AWS_QUEUE_URL,
    ReceiptHandle: message.ReceiptHandle,
  };

  await sqs.deleteMessage(deleteParams).promise();

  return {
    statusCode: 200,
    body: "Message processed and sent via email.",
  };
};
