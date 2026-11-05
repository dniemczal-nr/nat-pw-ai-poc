import fs from 'fs';
import path from 'path';
import * as config from '../config';
import type { SqlStatDelta } from '../perf/types';

type OracleDbModule = typeof import('oracledb');
type OracleConnection = Awaited<ReturnType<OracleDbModule['getConnection']>>;

let oracleDbModule: OracleDbModule | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  oracleDbModule = require('oracledb') as OracleDbModule;
} catch {
  oracleDbModule = null;
}

function ensureOracleDb(): OracleDbModule {
  if (!oracleDbModule) {
    throw new Error(
      'Oracle DB support is not installed. The optional DB perf tests require the "oracledb" package.',
    );
  }
  return oracleDbModule;
}

const ROOT_DIR = path.join(__dirname, '../..');
const TOP_SQL_SNAPSHOT = path.join(ROOT_DIR, 'perf/sql/top-sql-snapshot.sql');

type Row = Record<string, unknown>;

type SqlStat = {
  key: string;
  sqlId: string;
  childNumber: number;
  planHashValue: number;
  module: string;
  schema: string;
  executions: number;
  elapsedUs: number;
  cpuUs: number;
  bufferGets: number;
  diskReads: number;
  rowsProcessed: number;
  sqlText: string;
};

function resolved(key: string): string {
  const value = (config.get(key) || '').trim();
  return value.includes('${') ? '' : value;
}

/** NAT keeps the JDBC form (jdbc:oracle:thin:@host:1521/SERVICE); node-oracledb wants host:1521/SERVICE. */
function toConnectString(raw: string): string {
  return raw.replace(/^jdbc:oracle:thin:@/i, '').replace(/^\/\//, '');
}

function num(row: Row, column: string): number {
  return Number(row[column] ?? 0);
}

/** Read a SQL file relative to the repo root; strips a trailing `;` (not allowed by the driver). */
export function readSqlFile(file: string): string {
  const full = path.isAbsolute(file) ? file : path.join(ROOT_DIR, file);
  return fs.readFileSync(full, 'utf8').trim().replace(/;\s*$/, '');
}

/**
 * Read-only Oracle access for performance analysis (node-oracledb thin mode — no Oracle
 * client install). Uses the NAT keys DbConnectionString / DbUsername / DbPassword.
 */
export class OracleDb {
  private connection: OracleConnection | null = null;

  isConfigured(): boolean {
    return Boolean(resolved('DbConnectionString') && resolved('DbUsername') && resolved('DbPassword'));
  }

  private async connect(): Promise<OracleConnection> {
    const oracledb = ensureOracleDb();
    if (this.connection) return this.connection;
    if (!this.isConfigured()) {
      throw new Error(
        'DB config error: DbConnectionString / DbUsername / DbPassword are missing or unresolved. ' +
          'Set them via config/local.properties or ENV (DB_PASSWORD).',
      );
    }
    this.connection = await oracledb.getConnection({
      connectString: toConnectString(resolved('DbConnectionString')),
      user: resolved('DbUsername'),
      password: resolved('DbPassword'),
    });
    return this.connection;
  }

  async query(sql: string, binds: Record<string, unknown> = {}, maxRows = 0): Promise<Row[]> {
    const oracledb = ensureOracleDb();
    const connection = await this.connect();
    const result = await connection.execute<Row>(sql, binds, { outFormat: oracledb.OUT_FORMAT_OBJECT, maxRows });
    return result.rows || [];
  }

  /** Execute and fetch up to `maxRows` (time to first page of rows, like the UI list). */
  async timeQuery(sql: string, maxRows: number): Promise<{ durationMs: number; rows: number }> {
    const connection = await this.connect();
    const started = process.hrtime.bigint();
    const result = await connection.execute(sql, {}, { maxRows });
    const durationMs = Number(process.hrtime.bigint() - started) / 1e6;
    return { durationMs: Math.round(durationMs), rows: (result.rows || []).length };
  }

  /** Cumulative v$sql statistics (needs SELECT on V_$SQL). */
  async snapshotSqlStats(): Promise<SqlStat[]> {
    const rows = await this.query(readSqlFile(TOP_SQL_SNAPSHOT));
    return rows.map((row) => ({
      key: `${row.SQL_ID}:${row.CHILD_NUMBER}`,
      sqlId: String(row.SQL_ID),
      childNumber: num(row, 'CHILD_NUMBER'),
      planHashValue: num(row, 'PLAN_HASH_VALUE'),
      module: String(row.MODULE ?? ''),
      schema: String(row.PARSING_SCHEMA_NAME ?? ''),
      executions: num(row, 'EXECUTIONS'),
      elapsedUs: num(row, 'ELAPSED_TIME'),
      cpuUs: num(row, 'CPU_TIME'),
      bufferGets: num(row, 'BUFFER_GETS'),
      diskReads: num(row, 'DISK_READS'),
      rowsProcessed: num(row, 'ROWS_PROCESSED'),
      sqlText: String(row.SQL_TEXT ?? ''),
    }));
  }

  async close(): Promise<void> {
    if (this.connection) {
      await this.connection.close();
      this.connection = null;
    }
  }
}

/** Statements that ran between two snapshots, slowest total elapsed time first. */
export function diffSqlStats(before: SqlStat[], after: SqlStat[], limit: number): SqlStatDelta[] {
  const previous = new Map(before.map((s) => [s.key, s]));
  return after
    .map((s) => {
      const p = previous.get(s.key);
      const executions = s.executions - (p?.executions ?? 0);
      const elapsedMs = (s.elapsedUs - (p?.elapsedUs ?? 0)) / 1000;
      return {
        sqlId: s.sqlId,
        childNumber: s.childNumber,
        planHashValue: s.planHashValue,
        module: s.module,
        schema: s.schema,
        executions,
        elapsedMs: Math.round(elapsedMs),
        avgElapsedMs: executions > 0 ? Math.round(elapsedMs / executions) : Math.round(elapsedMs),
        cpuMs: Math.round((s.cpuUs - (p?.cpuUs ?? 0)) / 1000),
        bufferGets: s.bufferGets - (p?.bufferGets ?? 0),
        diskReads: s.diskReads - (p?.diskReads ?? 0),
        rowsProcessed: s.rowsProcessed - (p?.rowsProcessed ?? 0),
        sqlText: s.sqlText,
      };
    })
    .filter((d) => d.executions > 0 || d.elapsedMs > 0)
    .sort((a, b) => b.elapsedMs - a.elapsedMs)
    .slice(0, limit);
}
