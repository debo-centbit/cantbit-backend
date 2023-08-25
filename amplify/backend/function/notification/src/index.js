const AWS = require("aws-sdk");
const { messageTemplate, emailTemplate } = require("./utils/utils");

const {
  AWS_QUEUE_URL,
  AWS_TOPIC_ARN,
  REGION,
  PHONE_NUMBER,
  SENDER_EMAIL_ADDRESS,
  RECIPIENT_EMAIL
} = process.env;

const sqs = new AWS.SQS({ region: REGION });
const sns = new AWS.SNS({ region: REGION });

const phoneNumberPattern = /^\+\d{1,4}\s?\d+$/;
const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

exports.handler = async (notificationType) => {
  try {
    if (emailPattern.test(notificationType)) {
      template = await messageTemplate();

      const emailParams = await emailTemplate(SENDER_EMAIL_ADDRESS, RECIPIENT_EMAIL);

      await AWS.SES.sendEmail(emailParams).promise();

      console.log(
        "Message processed and sent via Email."
      );
    } 
    else if (phoneNumberPattern.test(notificationType)) {
      template = await messageTemplate();

      const smsParams = {
        Message: template,
        PhoneNumber: PHONE_NUMBER,
      };

      await sns.publish(smsParams).promise();

      if (AWS_TOPIC_ARN) {
        const snsTopicParams = {
          Message: smsTemplate,
          TopicArn: AWS_TOPIC_ARN,
        };

        await sns.publish(snsTopicParams).promise();
      }
    }

    const deleteParams = {
      QueueUrl: AWS_QUEUE_URL,
      ReceiptHandle: message.ReceiptHandle,
    };
    await sqs.deleteMessage(deleteParams).promise();

    console.log(
      "Message processed and sent via SMS and optionally published to an SNS topic."
    );

    return {
      statusCode: 200,
      body: "Message processed and sent.",
    };
  } catch (error) {
    console.error("Error:", error);

    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
