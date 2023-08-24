const { SQS, SNS } = require("aws-sdk");


// CREATE INSTANCE OF THE SQS AND SNS USING AWS SDK
const sqs = new SQS({ region: process.env.REGION });
const sns = new SNS({ region: process.env.REGION });
const sqsQueueUrl = process.env.AWS_QUEUE_URL;
const snsTopicArn = process.env.AWS_TOPIC_ARN;

// RECEIVE MESSAGE FROM SQS QUEUE
const getMessage = async () => {
  const receiveParams = {
    QueueUrl: sqsQueueUrl,
    MaxNumberOfMessages: 1,
    WaitTimeSeconds: 20,
  };
  const sqsResponse = await sqs.getMessage(receiveParams).promise();
  return sqsResponse.Messages || [];
};

// PROCESS RECEIVED MESSAGE, EXTRACT INFO FROM IT, AND SEND FORMATTED MESSAGE TO AN SNS TOPIC 
const handleMessage = async (message) => {
  const messageBody = JSON.parse(message.Body);
  const formattedPhoneNumber = messageBody.phoneNumber;
  const smsTemplate = `Message for ${formattedPhoneNumber} from SQS: ${messageBody.message}`;
  const snsParams = {
    Message: smsTemplate,
    TopicArn: snsTopicArn,
  };
  await sns.publish(snsParams).promise();
};

// MESSAGE IS REMOVED FROM THE SQS QUEUE ONCE HANDLED 
const removeMessage = async (message) => {
  const deleteParams = {
    QueueUrl: sqsQueueUrl,
    ReceiptHandle: message.ReceiptHandle,
  };
  await sqs.removeMessage(deleteParams).promise();
};

exports.handler = async (event, context) => {
  try {
    const messages = await getMessage();
    if (messages.length === 0) {
      console.log("No messages found in SQS queue.");
      return;
    }

    const message = messages[0];
    await handleMessage(message);
    await removeMessage(message);

    console.log("Message processed and sent via SNS.");
  } catch (error) {
    console.error("Error:", error);
    throw error;
  }
};
