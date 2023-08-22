module.exports = {
  mockSQS: jest.fn(() => ({
    receiveMessage: jest.fn().mockReturnValue({
      promise: jest.fn(),
    }),
    deleteMessage: jest.fn().mockReturnValue({
      promise: jest.fn(),
    }),
  })),
  mockSNS: jest.fn(() => ({
    publish: jest.fn().mockReturnValue({
      promise: jest.fn(),
    }),
    setTopicAttributes: jest.fn().mockReturnValue({
      promise: jest.fn(),
    }),
    subscribe: jest.fn().mockReturnValue({
      promise: jest.fn(),
    }),
  })),
};
