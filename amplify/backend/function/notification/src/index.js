const AWS = require("aws-sdk");
const { sns } = require("./config/snsConfig");

const { AWS_QUEUE_URL, AWS_TOPIC_ARN, REGION, PHONE_NUMBER, ACCOUNT_ID } = process.env;
const sqs = new AWS.SQS({ region: REGION });

exports.handler = async (event, context) => {
  try {

    const phoneNumberSubscriptions = PHONE_NUMBER;

    for (const phoneNumber of phoneNumberSubscriptions) {
      const subscriptionAttributes = {
        Protocol: "sms",
        TopicArn: AWS_TOPIC_ARN,
        Endpoint: phoneNumber,
      };

      await sns.subscribe(subscriptionAttributes).promise();
    }

    const receiveParams = {
      QueueUrl: AWS_QUEUE_URL,
      MaxNumberOfMessages: 1,
      WaitTimeSeconds: 30,
    };

    const { Messages } = await sqs.receiveMessage(receiveParams).promise();

    if (!Messages || Messages.length === 0) {
      console.log("No messages found in SQS queue.");
      return {
        statusCode: 200,
        body: "No messages found in SQS queue.",
      };
    }

    const message = Messages[0];
    const messageBody = JSON.parse(message.Body);
    const { phoneNumber, message: messageText } = messageBody;

    const smsTemplate = `Message for ${phoneNumber} from SQS: ${messageText}`;

    const snsParams = {
      Message: smsTemplate,
      TopicArn: AWS_TOPIC_ARN,
    };

    await sns.publish(snsParams).promise();

    const deleteParams = {
      QueueUrl: AWS_QUEUE_URL,
      ReceiptHandle: message.ReceiptHandle,
    };

    await sqs.deleteMessage(deleteParams).promise();

    console.log("Message processed and sent via SNS.");

    return {
      statusCode: 200,
      body: "Message processed and sent via SNS.",
    };
  } catch (error) {
    console.log("Error:", error);

    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
