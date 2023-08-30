const AWS = require("aws-sdk");

const sqsQueueUrl = process.env.AWS_QUEUE_URL;
const snsTopicArn = process.env.AWS_TOPIC_ARN;

const sqs = new AWS.SQS({ region: process.env.REGION });
const sns = new AWS.SNS({ region: process.env.REGION });

exports.handler = async (event, context) => {
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

    const PhoneNumber = messageBody.phoneNumber;

    // Generate SMS template
    const smsTemplate = `Message for ${PhoneNumber} from SQS: ${messageBody.message}`;

    // Publish message to SNS
    const snsParams = {
      Message: smsTemplate,
      TopicArn: snsTopicArn,
    };
    await sns.publish(snsParams).promise();

    // Delete processed message from SQS
    const deleteParams = {
      QueueUrl: sqsQueueUrl,
      ReceiptHandle: message.ReceiptHandle,
    };
    await sqs.deleteMessage(deleteParams).promise();

    console.log("Message processed and sent via SNS.");
  } catch (error) {
    console.log("Error:", error);
    throw error;
  }
};


// const AWS = require("aws-sdk");

// const sqsQueueUrl = process.env.AWS_QUEUE_URL;
// const sqs = new AWS.SQS({ region: process.env.REGION });
// const sns = new AWS.SNS({ region: process.env.REGION });
// const ses = new AWS.SES({ region: process.env.REGION });

// async function processSmsNotification(messageBody) {
//   // Generate SMS template
//   const smsTemplate = `Message for ${messageBody.phoneNumber} from SQS: ${messageBody.message}`;

//   // Publish message to SNS
//   const snsParams = {
//     Message: smsTemplate,
//     TopicArn: process.env.AWS_TOPIC_ARN,
//   };
//   await sns.publish(snsParams).promise();
// }

// async function processEmailNotification(messageBody) {
//   // Generate email template
//   const emailTemplate = `
//     <h1>Hello!</h1>
//     <p>${messageBody.emailContent}</p>
//   `;

//   // Send email
//   const emailParams = {
//     Destination: {
//       ToAddresses: [messageBody.recipientEmail],
//     },
//     Message: {
//       Body: {
//         Html: {
//           Charset: "UTF-8",
//           Data: emailTemplate,
//         },
//       },
//       Subject: {
//         Charset: "UTF-8",
//         Data: "Notification from SQS",
//       },
//     },
//     Source: process.env.AWS_SES_SENDER,
//   };

//   await ses.sendEmail(emailParams).promise();
// }

// exports.handler = async (event, context) => {
//   try {
//     // Poll message from SQS
//     const receiveParams = {
//       QueueUrl: sqsQueueUrl,
//       MaxNumberOfMessages: 1,
//       WaitTimeSeconds: 20,
//     };
//     const sqsResponse = await sqs.receiveMessage(receiveParams).promise();

//     if (!sqsResponse.Messages || sqsResponse.Messages.length === 0) {
//       console.log("No messages found in SQS queue.");
//       return;
//     }

//     const message = sqsResponse.Messages[0];
//     const messageBody = JSON.parse(message.Body);

//     await processSmsNotification(messageBody);
//     await processEmailNotification(messageBody);

//     // Delete processed message from SQS
//     const deleteParams = {
//       QueueUrl: sqsQueueUrl,
//       ReceiptHandle: message.ReceiptHandle,
//     };
//     await sqs.deleteMessage(deleteParams).promise();

//     console.log("Message processed and sent via SNS and email.");
//   } catch (error) {
//     console.log("Error:", error);
//     throw error;
//   }
// };
