const AWS = require("aws-sdk");
const dotenv = require("dotenv");
dotenv.config()

const {
  AWS_QUEUE_URL,
  REGION,
  PHONE_NUMBER,
} = process.env;

const createAWSInstanceWithRegion = (Service, region) => {
  return new Service({ region });
};

const sqs = createAWSInstanceWithRegion(AWS.SQS, REGION);
const sns = createAWSInstanceWithRegion(AWS.SNS, REGION);

exports.handler = async (phoneNumber) => {

  try {

    if (!phoneNumber) {
      return {
        statusCode: 404,
        body: "No phone number provided.",
      };
    }

    const receiveParams = {
      QueueUrl: AWS_QUEUE_URL,
      MaxNumberOfMessages: 1,
      WaitTimeSeconds: 30,
    };
    
    const { Messages } = await sqs.receiveMessage(receiveParams).promise();

    if (!Messages || Messages.length === 0) {
      return {
        statusCode: 404,
        body: "No messages found in SQS queue.",
      };
    }

    const message = Messages[0];
    const messageBody = JSON.parse(message.Body);
    const { messageContent } = messageBody; 

    const smsTemplate = `Message: ${messageContent}`;

    const smsParams = {
      Message: smsTemplate,
      PhoneNumber: PHONE_NUMBER,
    };

    await sns.publish(smsParams).promise();

    const deleteParams = {
      QueueUrl: AWS_QUEUE_URL,
      ReceiptHandle: message.ReceiptHandle,
    };
    await sqs.deleteMessage(deleteParams).promise();
    return {
      statusCode: 200,
      body: "Message processed and sent via SMS and optionally published to an SNS topic.",
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};

