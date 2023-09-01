const AWS = require("aws-sdk");
const { handler } = require("../index");
const { handlers } = require("../sendEmail");

jest.mock("aws-sdk");

describe("Lambda Function for sending SMS Notification", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should process SQS message and publish to SNS", async () => {
    const mockMessage = {
      Messages: [
        {
          Body: JSON.stringify({
            phoneNumber: "+1234567890",
            message: "Test Message",
          }),
          ReceiptHandle: "testReceiptHandle",
        },
      ],
    };

    AWS.SQS.prototype.receiveMessage = jest.fn().mockReturnValueOnce({
      promise: jest.fn().mockResolvedValueOnce(mockMessage),
    });

    AWS.SNS.prototype.publish = jest.fn().mockReturnValueOnce({
      promise: jest.fn().mockResolvedValueOnce({}),
    });

    AWS.SQS.prototype.deleteMessage = jest.fn().mockReturnValueOnce({
      promise: jest.fn().mockResolvedValueOnce({}),
    });

    await handler();

    expect(AWS.SQS.prototype.receiveMessage).toHaveBeenCalledWith({
      QueueUrl: process.env.AWS_QUEUE_URL,
      MaxNumberOfMessages: 1,
      WaitTimeSeconds: 20,
    });

    expect(AWS.SNS.prototype.publish).toHaveBeenCalledWith({
      Message: `Message for ${
        JSON.parse(mockMessage.Messages[0].Body).phoneNumber
      } from SQS: Test Message`,
      TopicArn: process.env.AWS_TOPIC_ARN,
    });

    expect(AWS.SQS.prototype.deleteMessage).toHaveBeenCalledWith({
      QueueUrl: process.env.AWS_QUEUE_URL,
      ReceiptHandle: "testReceiptHandle",
    });
  });

  it("should handle no messages in SQS queue", async () => {
    const mockMessage = {
      Messages: [],
    };

    AWS.SQS.prototype.receiveMessage = jest.fn().mockReturnValueOnce({
      promise: jest.fn().mockResolvedValueOnce(mockMessage),
    });

    await handler();

    expect(AWS.SNS.prototype.publish).not.toHaveBeenCalled();
  });

  it("should handle errors", async () => {
    const mockError = new Error("Mocked error");

    AWS.SQS.prototype.receiveMessage = jest.fn().mockReturnValueOnce({
      promise: jest.fn().mockRejectedValueOnce(mockError),
    });

    await expect(handler()).rejects.toThrow(mockError);
  });
});

describe("Lambda Function for Sending Email", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should process SQS message and send email via SES", async () => {
    const mockMessage = {
      Messages: [
        {
          Body: JSON.stringify({
            recipientEmail: "recipient@example.com",
            emailContent: "Test email content",
          }),
          ReceiptHandle: "testReceiptHandle",
        },
      ],
    };

    AWS.SQS.prototype.receiveMessage = jest.fn().mockReturnValueOnce({
      promise: jest.fn().mockResolvedValueOnce(mockMessage),
    });

    AWS.SQS.prototype.deleteMessage = jest.fn().mockReturnValueOnce({
      promise: jest.fn().mockResolvedValueOnce({}),
    });

    AWS.SES.prototype.sendEmail = jest.fn().mockReturnValueOnce({
      promise: jest.fn().mockResolvedValueOnce({}),
    });

    await handlers();

    expect(AWS.SQS.prototype.receiveMessage).toHaveBeenCalledWith({
      QueueUrl: process.env.AWS_QUEUE_URL,
      MaxNumberOfMessages: 1,
      WaitTimeSeconds: 20,
    });

    expect(AWS.SES.prototype.sendEmail).toHaveBeenCalledWith({
      Destination: {
        ToAddresses: ["recipient@example.com"],
      },
      Message: {
        Body: {
          Html: {
            Charset: "UTF-8",
            Data: expect.stringContaining("Test email content"),
          },
        },
        Subject: {
          Charset: "UTF-8",
          Data: "Notification from SQS",
        },
      },
      Source: process.env.AWS_SES_SENDER,
    });

    expect(AWS.SQS.prototype.deleteMessage).toHaveBeenCalledWith({
      QueueUrl: process.env.AWS_QUEUE_URL,
      ReceiptHandle: "testReceiptHandle",
    });
  });

  it("should handle no messages inside SQS queue", async () => {
    const mockMessage = {
      Messages: [],
    };

    AWS.SQS.prototype.receiveMessage = jest.fn().mockReturnValueOnce({
      promise: jest.fn().mockResolvedValueOnce(mockMessage),
    });

    await handlers();

    expect(AWS.SES.prototype.sendEmail).not.toHaveBeenCalled();
  });

  it("should handle the errors", async () => {
    const mockError = new Error("Mocked error");

    AWS.SQS.prototype.receiveMessage = jest.fn().mockReturnValueOnce({
      promise: jest.fn().mockRejectedValueOnce(mockError),
    });

    await expect(handlers()).rejects.toThrow(mockError);
  });
});
