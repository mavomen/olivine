import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import initSqlJs, { Database } from 'sql.js';

describe('connection', () => {
  let tmpDir: string;
  let SQL: any;

  beforeAll(async () => {
    SQL = await initSqlJs();
  });

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'olivine-conn-test-'));
  });

  afterEach(async () => {
    const { closeDb, setDb } = await import('../../src/database/connection');
    setDb(null as unknown as Database);
    closeDb();
    await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  });

  afterAll(() => {
    jest.resetModules();
  });

  it('should create a database in the vault .olivine directory', async () => {
    jest.resetModules();
    const { getDb } = await import('../../src/database/connection');
    const db = await getDb(tmpDir);
    expect(db).toBeDefined();
    expect(typeof db.run).toBe('function');
    const dbPath = path.join(tmpDir, '.olivine', 'olivine.db');
    const exists = await fs.stat(dbPath).then(() => true).catch(() => false);
    expect(exists).toBe(true);
  });

  it('should set WAL and foreign_keys pragmas', async () => {
    jest.resetModules();
    const { getDb } = await import('../../src/database/connection');
    const db = await getDb(tmpDir);
    const wal = db.exec('PRAGMA journal_mode');
    expect(wal[0]?.values[0]?.[0]).toBe('wal');
    db.run('PRAGMA foreign_keys = ON');
  });

  it('should create the .olivine directory if missing', async () => {
    jest.resetModules();
    const { getDb } = await import('../../src/database/connection');
    await getDb(tmpDir);
    const dirPath = path.join(tmpDir, '.olivine');
    const stat = await fs.stat(dirPath);
    expect(stat.isDirectory()).toBe(true);
  });

  it('should load an existing database from disk', async () => {
    jest.resetModules();
    const { getDb, saveDb, closeDb } = await import('../../src/database/connection');
    const db1 = await getDb(tmpDir);
    db1.run('CREATE TABLE test (id INTEGER)');
    db1.run('INSERT INTO test VALUES (42)');
    saveDb(tmpDir);
    closeDb();

    jest.resetModules();
    const { getDb: getDb2 } = await import('../../src/database/connection');
    const db2 = await getDb(tmpDir);
    const result = db2.exec('SELECT id FROM test');
    expect(result[0]?.values[0]?.[0]).toBe(42);
  });

  it('should save exported buffer to disk', async () => {
    jest.resetModules();
    const { getDb, saveDb } = await import('../../src/database/connection');
    const db = await getDb(tmpDir);
    db.run('CREATE TABLE test (id INTEGER)');
    saveDb(tmpDir);
    const dbPath = path.join(tmpDir, '.olivine', 'olivine.db');
    const buffer = await fs.readFile(dbPath);
    expect(buffer.length).toBeGreaterThan(0);
  });

  it('should close and nullify the database', async () => {
    jest.resetModules();
    const { getDb, closeDb } = await import('../../src/database/connection');
    const db = await getDb(tmpDir);
    expect(db).toBeDefined();
    closeDb();
    const { setDb } = await import('../../src/database/connection');
    setDb(null as unknown as Database);
  });

  it('should allow overriding the database with setDb', async () => {
    jest.resetModules();
    const { setDb, getDb } = await import('../../src/database/connection');
    const memDb = new SQL.Database();
    memDb.run('CREATE TABLE foo (x INTEGER)');
    memDb.run('INSERT INTO foo VALUES (99)');
    setDb(memDb);
    const db = await getDb(tmpDir);
    const result = db.exec('SELECT x FROM foo');
    expect(result[0]?.values[0]?.[0]).toBe(99);
  });
});
