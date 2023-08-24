const { generateSMSTemplate, publishSmsToPhoneNumber } = require('../index');
const { SNSClient, PublishCommand } = require("@aws-sdk/client-sns");

// Mock the SNSClient and PublishCommand
jest.mock('@aws-sdk/client-sns', () => ({
  SNSClient: jest.fn().mockImplementation(() => ({
    send: jest.fn(),
  })),
  PublishCommand: jest.fn(),
}));

describe('generateSMSTemplate', () => {
  it('should generate the correct SMS template', () => {
    const messageBody = {
      name: 'John',
      content: 'Hello world',
    };
    const expectedSmsTemplate = 'Hello John! Here\'s the message content: Hello world.';
    expect(generateSMSTemplate(messageBody)).toEqual(expectedSmsTemplate);
  });
});

describe('publishSmsToPhoneNumber', () => {
  it('should send an SMS with the correct parameters', async () => {
    const phoneNumber = '+1234567890';
    const message = 'This is a test SMS';
    const expectedParams = {
      PhoneNumber: phoneNumber,
      Message: message,
    };

    const snsClient = new SNSClient({});
    await publishSmsToPhoneNumber(phoneNumber, message);

    expect(PublishCommand).toHaveBeenCalledWith(expectedParams);
   
  });
});
