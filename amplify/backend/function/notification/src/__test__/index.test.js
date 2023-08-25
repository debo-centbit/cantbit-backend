const AWS = require("aws-sdk");
const { handler } = require("../index");
const { messageTemplate, emailTemplate } = require("../utils/utils");

// Mock environment variables
process.env.AWS_QUEUE_URL = "your-queue-url";
process.env.AWS_TOPIC_ARN = "your-topic-arn";
process.env.REGION = "us-east-1";
process.env.PHONE_NUMBER = "+2349074084999";
process.env.SENDER_EMAIL_ADDRESS = "sender@example.com";
process.env.RECIPIENT_EMAIL = "recipient@example.com";

jest.mock("../utils/utils", () => ({
  messageTemplate: jest.fn(),
  emailTemplate: jest.fn(),
}));

// Mock AWS services and their methods
jest.mock("aws-sdk", () => {
  const mSQS = {
    receiveMessage: jest.fn().mockReturnThis(),
    deleteMessage: jest.fn().mockReturnThis(),
  };
  const mSNS = {
    publish: jest.fn().mockReturnThis(),
  };
  const mSES = {
    sendEmail: jest.fn().mockImplementation((params, callback) => {
      callback(null, { /* your response here */ });
    }),
  };
  return {
    SQS: jest.fn(() => mSQS),
    SNS: jest.fn(() => mSNS),
    SES: jest.fn(() => mSES),
  };
});

// Rest of your test code...

describe("lambda handler", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should send email when notificationType is an email", async () => {
    // Define the emailParams you expect emailTemplate to return
    const expectedEmailParams = {
      Source: process.env.SENDER_EMAIL_ADDRESS,
      Destination: {
        ToAddresses: [process.env.RECIPIENT_EMAIL],
      },
      Message: {
        Subject: {
          Data: "Hello, there", // Replace with your expected subject
        },
        Body: {
          Text: {
            Data: "This is the subject",
          },
        },
      },
    };

    // Mock the emailTemplate function to return the expectedEmailParams
    emailTemplate.mockResolvedValue(expectedEmailParams);

    // Call your handler function
    const result = await handler("test@example.com");

    // Assert that messageTemplate and emailTemplate were called
    expect(messageTemplate).toHaveBeenCalled();
    expect(emailTemplate).toHaveBeenCalledWith(
      process.env.SENDER_EMAIL_ADDRESS,
      "test@example.com"
    );

     // Assert that AWS.SES.sendEmail was called with the expected emailParams
     expect(AWS.SES().sendEmail).toHaveBeenCalledWith(expectedEmailParams);

     // Assert the result
     expect(result.statusCode).toBe(200);
   });

   it("should delete message from SQS queue", async () => {
    const result = await handler("test@example.com");

    expect(AWS.SQS().deleteMessage).toHaveBeenCalled();
    expect(result.statusCode).toBe(200);
  });

  it("should handle errors and return a 500 status code", async () => {
    const mockError = new Error("Test error");
    messageTemplate.mockRejectedValue(mockError);
  
    const result = await handler("paul7jakintayo@gmail.com"); // Provide a valid email address
  
    expect(console.error).toHaveBeenCalledWith("Error:", mockError);
    expect(result.statusCode).toBe(500);
    expect(result.body).toBe(JSON.stringify({ error: mockError.message }));
  });
});
