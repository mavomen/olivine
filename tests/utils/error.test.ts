import { handleError } from '../../src/utils/error';

describe('handleError', () => {
  let exitSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;

  beforeEach(() => {
    exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => undefined as never);
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should log an error with the message prefix and stack trace', () => {
    handleError('Review failed', new Error('something broke'));
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('[ERROR] Review failed: Error: something broke'));
    const call = errorSpy.mock.calls[0][0] as string;
    expect(call).toContain('\n    at ');
  });

  it('should handle string errors', () => {
    handleError('Config error', 'invalid value');
    expect(errorSpy).toHaveBeenCalledWith('[ERROR] Config error: invalid value');
  });

  it('should handle unknown error types', () => {
    handleError('Unexpected', 42);
    expect(errorSpy).toHaveBeenCalledWith('[ERROR] Unexpected: 42');
  });

  it('should call process.exit(1)', () => {
    handleError('Fatal', 'something went wrong');
    expect(exitSpy).toHaveBeenCalledWith(1);
  });
});
