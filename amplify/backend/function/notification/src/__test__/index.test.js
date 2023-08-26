const AWS = require("aws-sdk");
const { handler } = require("../index");
const dotenv = require("dotenv");
dotenv.config();

jest.mock("aws-sdk");

describe("Lambda Function", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockMessage = {
    Messages: [
      {
        Body: JSON.stringify({
          phoneNumber: "+2349074084999",
          messageContent: "Notification Message",
        }),
        ReceiptHandle: "testReceiptHandle",
      },
    ],
  };

  const mockEmail = {
    Source: process.env.SENDER_EMAIL,
    Destination: {
      ToAddresses: ["olawale@gmail.com"],
    },
    Message: {
      Subject: {
        Data: `email subject`,
      },
      Body: {
        Text: {
          Data: "Message: Notification Message",
        },
      },
    },
  };
  it("should process SQS message and publish to SNS", async () => {
    AWS.SQS.prototype.receiveMessage = jest.fn().mockReturnValueOnce({
      promise: jest.fn().mockResolvedValueOnce(mockMessage),
    });

    AWS.SNS.prototype.publish = jest.fn().mockReturnValueOnce({
      promise: jest.fn().mockResolvedValueOnce({}),
    });

    AWS.SQS.prototype.deleteMessage = jest.fn().mockReturnValueOnce({
      promise: jest.fn().mockResolvedValueOnce({}),
    });

    await handler({ notificationType: "+234805939022" });

    expect(AWS.SQS.prototype.receiveMessage).toHaveBeenCalledWith({
      QueueUrl: process.env.AWS_QUEUE_URL,
      MaxNumberOfMessages: 1,
      WaitTimeSeconds: 30,
    });

    expect(AWS.SNS.prototype.publish).toHaveBeenCalledWith({
      Message: `Message: Notification Message`,
      PhoneNumber: "+234805939022",
    });

    expect(AWS.SQS.prototype.deleteMessage).toHaveBeenCalledWith({
      QueueUrl: process.env.AWS_QUEUE_URL,
      ReceiptHandle: "testReceiptHandle",
    });
  });

  it("should process SQS message and publish to SES", async () => {
    AWS.SQS.prototype.receiveMessage = jest.fn().mockReturnValueOnce({
      promise: jest.fn().mockResolvedValueOnce(mockMessage),
    });

    AWS.SES.prototype.sendEmail = jest.fn().mockReturnValueOnce({
      promise: jest.fn().mockResolvedValueOnce({}),
    });
    AWS.SQS.prototype.deleteMessage = jest.fn().mockReturnValueOnce({
      promise: jest.fn().mockResolvedValueOnce({}),
    });

    await handler({
      notificationType: "olawale@gmail.com",
      emailSubject: "email subject",
    });

    expect(AWS.SQS.prototype.receiveMessage).toHaveBeenCalledWith({
      QueueUrl: process.env.AWS_QUEUE_URL,
      MaxNumberOfMessages: 1,
      WaitTimeSeconds: 30,
    });

    expect(AWS.SES.prototype.sendEmail).toHaveBeenCalledWith(mockEmail);

    expect(AWS.SQS.prototype.deleteMessage).toHaveBeenCalledWith({
      QueueUrl: process.env.AWS_QUEUE_URL,
      ReceiptHandle: "testReceiptHandle",
    });
  });

  it("should handle no messages in SQS queue and message not sent through SNS", async () => {
    const mockMessage = {
      Messages: [],
    };

    AWS.SNS.prototype.publish = jest.fn().mockReturnValueOnce({
      promise: jest.fn().mockResolvedValueOnce({}),
    });

    AWS.SQS.prototype.deleteMessage = jest.fn().mockReturnValueOnce({
      promise: jest.fn().mockResolvedValueOnce({}),
    });

    AWS.SQS.prototype.receiveMessage = jest.fn().mockReturnValueOnce({
      promise: jest.fn().mockResolvedValueOnce(mockMessage),
    });

    const result = await handler({ notificationType: "+234958594003" });

    expect(AWS.SNS.prototype.publish).not.toHaveBeenCalled();
    expect(AWS.SQS.prototype.deleteMessage).not.toHaveBeenCalled();
    expect(result.statusCode).toBe(404);
    expect(result.body).toBe("No messages found in SQS queue.");
  });

  it("should handle no messages in SQS queue and message not sent through SES", async () => {
    const mockMessage = {
      Messages: [],
    };

    AWS.SQS.prototype.receiveMessage = jest.fn().mockReturnValueOnce({
      promise: jest.fn().mockResolvedValueOnce(mockMessage),
    });
    AWS.SES.prototype.sendEmail = jest.fn().mockReturnValueOnce({
      promise: jest.fn().mockResolvedValueOnce({}),
    });
    AWS.SQS.prototype.deleteMessage = jest.fn().mockReturnValueOnce({
      promise: jest.fn().mockResolvedValueOnce({}),
    });

    const result = await handler({ notificationType: "+234958594003" });

    expect(AWS.SES.prototype.sendEmail).not.toHaveBeenCalled();
    expect(AWS.SQS.prototype.deleteMessage).not.toHaveBeenCalled();
    expect(result.statusCode).toBe(404);
    expect(result.body).toBe("No messages found in SQS queue.");
  });

  it("should handle errors", async () => {
    const mockError = new Error("Mocked error");
    AWS.SQS.prototype.receiveMessage = jest.fn().mockReturnValueOnce({
      promise: jest.fn().mockRejectedValueOnce(mockError),
    });
    try {
      await handler("");
    } catch (error) {
      expect(error.statusCode).toBe(500);
      if (error.message) {
        expect(error.message).toBe("Mocked error");
      }
    }
  });

  it("should handle invalid email", async () => {
    AWS.SQS.prototype.receiveMessage = jest.fn().mockReturnValueOnce({
      promise: jest.fn().mockResolvedValueOnce(mockMessage),
    });
    AWS.SES.prototype.sendEmail = jest.fn().mockReturnValueOnce({
      promise: jest.fn().mockResolvedValueOnce({}),
    });
    AWS.SQS.prototype.deleteMessage = jest.fn().mockReturnValueOnce({
      promise: jest.fn().mockResolvedValueOnce({}),
    });
    const result = await handler({ notificationType: "rteteetegmail.com" });

    expect(AWS.SQS.prototype.receiveMessage).not.toHaveBeenCalled();
    expect(AWS.SES.prototype.sendEmail).not.toHaveBeenCalled();
    expect(AWS.SQS.prototype.deleteMessage).not.toHaveBeenCalled();
    expect(result.statusCode).toBe(400);
    expect(result.body).toBe("Invalid email or phone number.");
  });

  it("should handle invalid phonenumber", async () => {
    AWS.SQS.prototype.receiveMessage = jest.fn().mockReturnValueOnce({
      promise: jest.fn().mockResolvedValueOnce(mockMessage),
    });
    AWS.SES.prototype.sendEmail = jest.fn().mockReturnValueOnce({
      promise: jest.fn().mockResolvedValueOnce({}),
    });
    AWS.SQS.prototype.deleteMessage = jest.fn().mockReturnValueOnce({
      promise: jest.fn().mockResolvedValueOnce({}),
    });
    const result = await handler({ notificationType: "09085675575" });

    expect(AWS.SQS.prototype.receiveMessage).not.toHaveBeenCalled();
    expect(AWS.SES.prototype.sendEmail).not.toHaveBeenCalled();
    expect(AWS.SQS.prototype.deleteMessage).not.toHaveBeenCalled();
    expect(result.statusCode).toBe(400);
    expect(result.body).toBe("Invalid email or phone number.");
  });
});
