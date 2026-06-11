import { logger, setLogLevel } from '../../src/utils/logger';

describe('logger', () => {
  let infoSpy: jest.SpyInstance;
  let warnSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;
  let debugSpy: jest.SpyInstance;

  beforeEach(() => {
    infoSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    debugSpy = jest.spyOn(console, 'debug').mockImplementation(() => {});
    setLogLevel('info');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('default level (info)', () => {
    it('should log info messages', () => {
      logger.info('test message');
      expect(infoSpy).toHaveBeenCalledWith('[INFO] test message');
    });

    it('should log warn messages', () => {
      logger.warn('test warning');
      expect(warnSpy).toHaveBeenCalledWith('[WARN] test warning');
    });

    it('should log error messages', () => {
      logger.error('test error');
      expect(errorSpy).toHaveBeenCalledWith('[ERROR] test error');
    });

    it('should not log debug messages at info level', () => {
      logger.debug('test debug');
      expect(debugSpy).not.toHaveBeenCalled();
    });
  });

  describe('setLogLevel debug', () => {
    beforeEach(() => {
      setLogLevel('debug');
    });

    it('should log debug messages at debug level', () => {
      logger.debug('test debug');
      expect(debugSpy).toHaveBeenCalled();
    });

    it('should include timestamp in debug messages', () => {
      logger.debug('test debug');
      const msg = debugSpy.mock.calls[0][0] as string;
      expect(msg).toMatch(/^\[DEBUG\] \d{4}-\d{2}-\d{2}T/);
      expect(msg).toContain('test debug');
    });
  });

  describe('setLogLevel error', () => {
    beforeEach(() => {
      setLogLevel('error');
    });

    it('should log error messages at error level', () => {
      logger.error('test error');
      expect(errorSpy).toHaveBeenCalled();
    });

    it('should not log info messages at error level', () => {
      logger.info('test info');
      expect(infoSpy).not.toHaveBeenCalled();
    });

    it('should not log warn messages at error level', () => {
      logger.warn('test warn');
      expect(warnSpy).not.toHaveBeenCalled();
    });
  });
});
