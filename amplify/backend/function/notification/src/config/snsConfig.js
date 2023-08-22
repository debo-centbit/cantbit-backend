const AWS = require("aws-sdk");

const { REGION, ACCOUNT_ID, AWS_TOPIC_ARN, AWS_QUEUE_URL } = process.env;

const sns = new AWS.SNS({ region: REGION });

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
    http: {
      defaultHealthyRetryPolicy: {
        minDelayTarget: 10,
        maxDelayTarget: 600,
        numRetries: 2,
      },
    },
  }),
};

const subscribeAttributes = {
  Protocol: "sms",
  TopicArn: AWS_TOPIC_ARN,
};

module.exports = {
  sns,
  snsTopicAttributes,
  subscribeAttributes,
};
