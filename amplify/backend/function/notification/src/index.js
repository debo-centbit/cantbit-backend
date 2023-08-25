const AWS = require("aws-sdk");
const dotenv = require("dotenv");
dotenv.config()

const {
  AWS_QUEUE_URL,
  AWS_TOPIC_ARN,
  REGION,
  PHONE_NUMBER,
} = process.env;



const createAWSInstanceWithRegion = (Service, region) => {
  return new Service({ region });
};

const sqs = createAWSInstanceWithRegion(AWS.SQS, REGION);
const sns = createAWSInstanceWithRegion(AWS.SNS, REGION);

exports.handler = async () => {

  try {
  
    if (!PHONE_NUMBER) {
      console.log("No phone number provided.");
      return {
        statusCode: 200,
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
      console.log("No messages found in SQS queue.");
      return {
        statusCode: 200,
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
    // if (AWS_TOPIC_ARN) {
    //   const snsTopicParams = {
    //     Message: smsTemplate,
    //     TopicArn: AWS_TOPIC_ARN,
    //   };

    //   await sns.publish(snsTopicParams).promise();
    // }

    const deleteParams = {
      QueueUrl: AWS_QUEUE_URL,
      ReceiptHandle: message.ReceiptHandle,
    };
    await sqs.deleteMessage(deleteParams).promise();

   // console.log("Message processed and sent via SMS and optionally published to an SNS topic.");

    return {
      statusCode: 200,
      body: "Message processed and sent via SMS and optionally published to an SNS topic.",
    };
  } catch (error) {
    console.error("Error:", error);

    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};

