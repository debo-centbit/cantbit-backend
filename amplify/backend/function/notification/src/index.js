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
    console.error("Error:", error);
    throw error;
  }
};