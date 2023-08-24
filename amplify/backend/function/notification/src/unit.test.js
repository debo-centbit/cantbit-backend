const { SQS, SNS } = require("aws-sdk");
const { handler } = require("./index");

jest.mock("aws-sdk");

describe("Lambda Function", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should process SQS message and publish to SNS", async () => {
    const mockMessage = {
      Messages: [
        {
          Body: JSON.stringify({
            phoneNumber: "+0123456789",
            message: "Test Message",
          }),
          ReceiptHandle: "testReceiptHandle",
        },
      ],
    };

    SQS.prototype.getMessage = jest.fn().mockReturnValueOnce({
      promise: jest.fn().mockResolvedValueOnce(mockMessage),
    });

    SNS.prototype.publish = jest.fn().mockReturnValueOnce({
      promise: jest.fn().mockResolvedValueOnce({}),
    });

    SQS.prototype.removeMessage = jest.fn().mockReturnValueOnce({
      promise: jest.fn().mockResolvedValueOnce({}),
    });

    await handler();

    expect(SQS.prototype.getMessage).toHaveBeenCalledWith({
      QueueUrl: process.env.AWS_QUEUE_URL,
      MaxNumberOfMessages: 1,
      WaitTimeSeconds: 20,
    });

    expect(SNS.prototype.publish).toHaveBeenCalledWith({
      Message: `Message for ${
        JSON.parse(mockMessage.Messages[0].Body).phoneNumber
      } from SQS: Test Message`,
      TopicArn: process.env.AWS_TOPIC_ARN,
    });

    expect(SQS.prototype.removeMessage).toHaveBeenCalledWith({
      QueueUrl: process.env.AWS_QUEUE_URL,
      ReceiptHandle: "testReceiptHandle",
    });
  });

  it("should handle no messages in SQS queue", async () => {
    const mockMessage = {
      Messages: [],
    };

    SQS.prototype.getMessage = jest.fn().mockReturnValueOnce({
      promise: jest.fn().mockResolvedValueOnce(mockMessage),
    });

    await handler();

    expect(SNS.prototype.publish).not.toHaveBeenCalled();
  });

  it("should handle errors", async () => {
    const mockError = new Error("Mocked error");

    SQS.prototype.getMessage = jest.fn().mockReturnValueOnce({
      promise: jest.fn().mockRejectedValueOnce(mockError),
    });

    await expect(handler()).rejects.toThrow(mockError);
  });
});
