const AWS = require("aws-sdk");
const { handler } = require("../index");

// Mock the AWS SDK
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
    // Clear all mock calls before each test
    jest.clearAllMocks();
  });

  it("should process SQS message and publish to SNS", async () => {
    // Define mock SQS message and SNS publish response
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

    const mockSNSPublishResponse = {
      ResponseMetadata: {
        RequestId: "mockRequestId",
      },
    };

    // Mock SQS receiveMessage to return the mock message
    AWS.SQS.prototype.receiveMessage = jest.fn().mockReturnValue({
      promise: jest.fn().mockResolvedValueOnce(mockMessage),
    });

    // Mock SNS publish to return the mock response
    AWS.SNS.prototype.publish = jest.fn().mockReturnValue({
      promise: jest.fn().mockResolvedValueOnce(mockSNSPublishResponse),
    });

    // Mock SQS deleteMessage to return a resolved promise
    AWS.SQS.prototype.deleteMessage = jest.fn().mockReturnValue({
      promise: jest.fn().mockResolvedValueOnce({}),
    });

    // Mock SNS setTopicAttributes to return a resolved promise
    AWS.SNS.prototype.setTopicAttributes = jest.fn().mockReturnValue({
      promise: jest.fn().mockResolvedValueOnce({}),
    });

    // Mock SNS subscribe to return a resolved promise
    AWS.SNS.prototype.subscribe = jest.fn().mockReturnValue({
      promise: jest.fn().mockResolvedValueOnce({}),
    });

    // Call the handler function
    const result = await handler({}, {});

    // Assert that the expected AWS SDK methods were called with the correct parameters
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

    // Assert the expected result from the handler function
    expect(result.statusCode).toBe(200);
    expect(result.body).toBe("Message processed and sent via SNS.");
  });

  it("should handle no messages in SQS queue", async () => {
    // Mock SQS receiveMessage to return an empty Messages array
    AWS.SQS.prototype.receiveMessage = jest.fn().mockReturnValueOnce({
      promise: jest.fn().mockResolvedValueOnce({ Messages: [] }),
    });

    // Call the handler function
    try {
      await handler({}, {});
    } catch (error) {
      // Assert the expected error message and status code
      expect(error.statusCode).toBe(500);
      expect(error.message).toBe("No messages found in SQS queue.");
    }
  });

  it("should handle errors", async () => {
    // Mock SQS receiveMessage to throw an error
    const mockError = new Error("Mocked error");
    AWS.SQS.prototype.receiveMessage = jest.fn().mockReturnValueOnce({
      promise: jest.fn().mockRejectedValueOnce(mockError),
    });

    try {
      // Call handler with conditions that trigger the error
      await handler({}, {});
    } catch (error) {
      // Assert the expected error message and status code
      expect(error.statusCode).toBe(500);
      if (error.message) {
        expect(error.message).toBe("Mocked error");
      }
    }
  });
});
