const AWS = require("aws-sdk");

exports.messageTemplate = async () => {
  const receiveParams = {
    QueueUrl: AWS_QUEUE_URL,
    MaxNumberOfMessages: 1,
    WaitTimeSeconds: 30,
  };

  const { Messages } = await sqs.receiveMessage(receiveParams).promise();

  if (!Messages || Messages.length === 0) {
    console.log("No messages found in SQS queue.");
    return {
      statusCode: 404,
      body: "No messages found in SQS queue.",
    };
  }

  const message = Messages[0];
  const messageBody = JSON.parse(message.Body);
  const { messageContent } = messageBody;

  const notificationTemplate = `Message: ${messageContent}`;

  return notificationTemplate;
};

exports.emailTemplate = async (SENDER_EMAIL_ADDRESS, RECIPIENT_EMAIL) => {
  const emailParams = {
    Source: SENDER_EMAIL_ADDRESS,
    Destination: {
      ToAddresses: [RECIPIENT_EMAIL],
    },
    Message: {
      Subject: {
        Data: `${subjectTemplate}`,
      },
      Body: {
        Text: {
          Data: template,
        },
      },
    },
  };
  return emailParams;
};
