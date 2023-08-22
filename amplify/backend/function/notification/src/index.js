const AWS = require("aws-sdk");

const { AWS_QUEUE_URL, AWS_TOPIC_ARN, REGION, PHONE_NUMBER, ACCOUNT_ID } = process.env;
const sqs = new AWS.SQS({ region: REGION });
const sns = new AWS.SNS({ region: REGION });

exports.handler = async (event, context) => {
  try {
    const snsTopicAttributes = {
        DisplayName: "NotificationSnsTopic",
        Policy: JSON.stringify({
          Version: "2008-10-17",
          Id: "NotificationPolicy",
          Statement: [
            {
              Sid: "AllowSmsPublish",
              Effect: "Allow",
              Principal: "*",
              Action: "SNS:Publish",
              Resource: AWS_TOPIC_ARN,
              Condition: {
                StringEquals: {
                  "aws:SourceOwner": ACCOUNT_ID,
                },
                "aws:SourceArn": {
                  "Fn:Join": [
                    "",
                    [
                      "arn:aws:sqs:",
                      REGION,
                      ":",
                      ACCOUNT_ID,
                      ":",
                      AWS_QUEUE_URL,
                    ],
                  ],
                },
              },
            },
          ],
        }),
      DeliveryPolicy: JSON.stringify({
        "http": {
          "defaultHealthyRetryPolicy": {
            "minDelayTarget": 10,
            "maxDelayTarget": 600,
            "numRetries": 2,
          },
        },
      }),
    };
    
    await sns.setTopicAttributes({
      TopicArn: AWS_TOPIC_ARN,
      AttributeName: "NotificationSnsTopic",
      AttributeValue: snsTopicAttributes.DisplayName,
    }).promise();
    
    await sns.setTopicAttributes({
      TopicArn: AWS_TOPIC_ARN,
      AttributeName: "Policy",
      AttributeValue: snsTopicAttributes.Policy,
    }).promise();
    
    await sns.setTopicAttributes({
      TopicArn: AWS_TOPIC_ARN,
      AttributeName: "DeliveryPolicy",
      AttributeValue: snsTopicAttributes.DeliveryPolicy,
    }).promise();


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
