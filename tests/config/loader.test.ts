import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { loadConfig, saveConfig, defaultConfig, OlivineConfig } from '../../src/config/loader';
import { OLIVINE_DIR, CONFIG_FILENAME, DEFAULT_ALGORITHM } from '../../src/config/constants';

describe('config loader', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'olivine-test-'));
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  describe('defaultConfig', () => {
    it('should return default values', () => {
      const config = defaultConfig();
      expect(config.vaultPath).toBe('');
      expect(config.cardsDir).toBe('');
      expect(config.algorithm).toBe(DEFAULT_ALGORITHM);
    });
  });

  describe('saveConfig', () => {
    it('should create .olivine directory and config.json', async () => {
      const config: OlivineConfig = { vaultPath: tmpDir, cardsDir: '', algorithm: DEFAULT_ALGORITHM };
      await saveConfig(tmpDir, config);
      const configPath = path.join(tmpDir, OLIVINE_DIR, CONFIG_FILENAME);
      const exists = await fs.stat(configPath).then(() => true, () => false);
      expect(exists).toBe(true);
    });
  });

  describe('loadConfig', () => {
    it('should return defaults when no config file exists', async () => {
      const config = await loadConfig(tmpDir);
      expect(config.vaultPath).toBe(tmpDir);
      expect(config.cardsDir).toBe('');
      expect(config.algorithm).toBe(DEFAULT_ALGORITHM);
    });

    it('should load saved config', async () => {
      const saved: OlivineConfig = { vaultPath: tmpDir, cardsDir: 'my-cards', algorithm: 'sm2' };
      await saveConfig(tmpDir, saved);
      const config = await loadConfig(tmpDir);
      expect(config).toEqual(saved);
    });

    it('should fill missing fields with defaults', async () => {
      await fs.mkdir(path.join(tmpDir, OLIVINE_DIR), { recursive: true });
      await fs.writeFile(
        path.join(tmpDir, OLIVINE_DIR, CONFIG_FILENAME),
        JSON.stringify({ vaultPath: tmpDir }),
        'utf-8',
      );
      const config = await loadConfig(tmpDir);
      expect(config.vaultPath).toBe(tmpDir);
      expect(config.cardsDir).toBe('');
      expect(config.algorithm).toBe(DEFAULT_ALGORITHM);
    });
  });
});
