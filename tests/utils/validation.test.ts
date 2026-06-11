import { validateVaultPath, validateConfig } from '../../src/utils/validation';

jest.mock('../../src/utils/fs', () => ({
  directoryExists: jest.fn(),
}));

import { directoryExists } from '../../src/utils/fs';
const mockDirectoryExists = directoryExists as jest.MockedFunction<typeof directoryExists>;

describe('validateVaultPath', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should reject empty path', async () => {
    await expect(validateVaultPath('')).rejects.toThrow('Vault path is required');
  });

  it('should reject whitespace-only path', async () => {
    await expect(validateVaultPath('   ')).rejects.toThrow('Vault path is required');
  });

  it('should reject non-existent directory', async () => {
    mockDirectoryExists.mockResolvedValue(false);
    await expect(validateVaultPath('/nonexistent/path')).rejects.toThrow(
      'Vault path does not exist or is not a directory',
    );
  });

  it('should accept existing directory', async () => {
    mockDirectoryExists.mockResolvedValue(true);
    await expect(validateVaultPath('/valid/path')).resolves.toBeUndefined();
  });

  it('should call directoryExists with the path', async () => {
    mockDirectoryExists.mockResolvedValue(true);
    await validateVaultPath('/some/path');
    expect(mockDirectoryExists).toHaveBeenCalledWith('/some/path');
  });
});

describe('validateConfig', () => {
  it('should reject null config', () => {
    expect(() => validateConfig(null)).toThrow('Config must be an object');
  });

  it('should reject non-object config', () => {
    expect(() => validateConfig('string')).toThrow('Config must be an object');
  });

  it('should reject config without vaultPath', () => {
    expect(() => validateConfig({})).toThrow('Config vaultPath must be a string');
  });

  it('should reject config with non-string vaultPath', () => {
    expect(() => validateConfig({ vaultPath: 123 })).toThrow('Config vaultPath must be a string');
  });

  it('should reject config with non-string cardsDir', () => {
    expect(() => validateConfig({ vaultPath: '/vault', cardsDir: 123 })).toThrow(
      'Config cardsDir must be a string',
    );
  });

  it('should accept valid config without cardsDir', () => {
    expect(() => validateConfig({ vaultPath: '/vault' })).not.toThrow();
  });

  it('should accept valid config with string cardsDir', () => {
    expect(() => validateConfig({ vaultPath: '/vault', cardsDir: 'cards' })).not.toThrow();
  });
});
