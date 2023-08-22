const AWS = require("aws-sdk");
const { handler } = require("../index");


jest.mock("aws-sdk", () => {
  return {
    SQS: jest.fn(() => ({
      receiveMessage: jest.fn(() => ({
        promise: jest.fn().mockResolvedValueOnce({
          Messages: [
            {
              Body: JSON.stringify({
                phoneNumber: "+2349074084079",
                message: "Notification Message",
              }),
              ReceiptHandle: "testReceiptHandle",
            },
          ],
        }),
      })),
      deleteMessage: jest.fn(() => ({
        promise: jest.fn().mockResolvedValueOnce({}),
      })),
    })),
    SNS: jest.fn(() => ({
      publish: jest.fn(() => ({
        promise: jest.fn().mockResolvedValueOnce({
          ResponseMetadata: {
            RequestId: "mockRequestId",
          },
        }),
      })),
      setTopicAttributes: jest.fn(() => ({
        promise: jest.fn().mockResolvedValueOnce({}),
      })),
      subscribe: jest.fn(() => ({
        promise: jest.fn().mockResolvedValueOnce({}),
      })),
    })),
  };
});

describe("Notification Function", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should process SQS message and publish to SNS", async () => {
    const mockMessage = {
      Messages: [
        {
          Body: JSON.stringify({
            phoneNumber: "+2349074084079",
            message: "Notification Message",
          }),
          ReceiptHandle: "testReceiptHandle",
        },
      ],
    };

    const mockSNSPublishResponse = {
      ResponseMetadata: {
        RequestId: "mockRequestId",
      },
    };

    AWS.SQS.prototype.receiveMessage = jest.fn().mockReturnValue({
      promise: jest.fn().mockResolvedValueOnce(mockMessage),
    });

    AWS.SNS.prototype.publish = jest.fn().mockReturnValue({
      promise: jest.fn().mockResolvedValueOnce(mockSNSPublishResponse),
    });

    AWS.SQS.prototype.deleteMessage = jest.fn().mockReturnValue({
      promise: jest.fn().mockResolvedValueOnce({}),
    });

    AWS.SNS.prototype.setTopicAttributes = jest.fn().mockReturnValue({
      promise: jest.fn().mockResolvedValueOnce({}),
    });

    AWS.SNS.prototype.subscribe = jest.fn().mockReturnValue({
      promise: jest.fn().mockResolvedValueOnce({}),
    });

    const result = await handler({}, {});

    expect(AWS.SQS.prototype.receiveMessage).toHaveBeenCalledWith({
      QueueUrl: process.env.AWS_QUEUE_URL,
      MaxNumberOfMessages: 1,
      WaitTimeSeconds: 30,
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

    expect(result.statusCode).toBe(200);
    expect(result.body).toBe("Message processed and sent via SNS.");
  });

  it("should handle no messages in SQS queue", async () => {
    AWS.SQS.prototype.receiveMessage = jest.fn().mockReturnValueOnce({
      promise: jest.fn().mockResolvedValueOnce({ Messages: [] }),
    });

    try {
      await handler({}, {});
    } catch (error) {
      expect(error.statusCode).toBe(500);
      expect(error.message).toBe("No messages found in SQS queue.");
    }
  });

  it("should handle errors", async () => {
    const mockError = new Error("Mocked error");
    AWS.SQS.prototype.receiveMessage = jest.fn().mockReturnValueOnce({
      promise: jest.fn().mockRejectedValueOnce(mockError),
    });

    try {
      await handler({}, {});
    } catch (error) {
      expect(error.statusCode).toBe(500);
      if (error.message) {
        expect(error.message).toBe("Mocked error");
      }
    }
  });
});
