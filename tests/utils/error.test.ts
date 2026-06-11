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

  it('should log an error with the message prefix', () => {
    handleError('Review failed', new Error('something broke'));
    expect(errorSpy).toHaveBeenCalledWith('[ERROR] Review failed: Error: something broke');
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
