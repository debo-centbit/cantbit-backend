const AWS = require("aws-sdk");

const sqsQueueUrl = process.env.AWS_QUEUE_URL;
const sqs = new AWS.SQS({ region: process.env.REGION });
const ses = new AWS.SES({ region: process.env.REGION });

exports.handlers = async (event, context) => {
  try {
    // Poll message from SQS
    const receiveParams = {
      QueueUrl: sqsQueueUrl,
      MaxNumberOfMessages: 1,
      WaitTimeSeconds: 20,
    };
    const sqsResponse = await sqs.receiveMessage(receiveParams).promise();

    if (!sqsResponse.Messages || sqsResponse.Messages.length === 0) {
      console.log("No messages found in SQS queue.");
      return;
    }

    const message = sqsResponse.Messages[0];
    const messageBody = JSON.parse(message.Body);

    const recipientEmail = messageBody.recipientEmail;
    const emailContent = messageBody.emailContent;

    // Generate email template
    const emailTemplate = `
      <h1>Hello!</h1>
      <p>${emailContent}</p>
    `;

    // Send email
    const emailParams = {
      Destination: {
        ToAddresses: [recipientEmail],
      },
      Message: {
        Body: {
          Html: {
            Charset: "UTF-8",
            Data: emailTemplate,
          },
        },
        Subject: {
          Charset: "UTF-8",
          Data: "Notification from SQS",
        },
      },
      Source: process.env.AWS_SES_SENDER,
    };

    await ses.sendEmail(emailParams).promise();

    // Delete processed message from SQS
    const deleteParams = {
      QueueUrl: sqsQueueUrl,
      ReceiptHandle: message.ReceiptHandle,
    };
    await sqs.deleteMessage(deleteParams).promise();

    console.log("Message processed and email sent via Amazon SES.");
  } catch (error) {
    console.log("Error:", error);
    throw error;
  }
};
