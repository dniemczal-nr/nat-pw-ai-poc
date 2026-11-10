/**
 * Offline checks of the acquisition envelope helpers and the read-only SQL guard: no environment needed.
 * @seed tests/seed.spec.ts
 */
import { test, expect } from '../fixtures';
import { assertReadOnly } from '../../src/capabilities/adminerDbClient';
import { feedFile, FIELD_SEPARATOR, nextEnvelopeDate, unzip, zip } from '../../src/api/acquisitionEnvelope';

test.describe('Acquisition envelope helpers', () => {
  test('a zip written by zip() reads back with unzip()', () => {
    const files = { 'CUSTOMERS_20200612.txt': feedFile([['A', 'B'], ['C', '']]), 'empty.txt': Buffer.alloc(0) };
    const read = unzip(zip(files));

    expect(Object.keys(read)).toEqual(Object.keys(files));
    expect(read['CUSTOMERS_20200612.txt'].toString('utf8')).toBe(`A${FIELD_SEPARATOR}B\nC${FIELD_SEPARATOR}`);
    expect(read['empty.txt']).toHaveLength(0);
  });

  test('the next envelope date is the day after the latest one, across months', () => {
    const keys = [
      'landing/acquisition/waiting/envelope_20200530.zip.log',
      'landing/acquisition/waiting/envelope_20200531.zip.flag.log',
      'landing/acquisition/feedback/acq_bad_20200529.zip',
    ];
    expect(nextEnvelopeDate(keys)).toBe('20200601');
    expect(() => nextEnvelopeDate(['landing/acquisition/waiting/'])).toThrow(/No envelope/);
  });
});

test.describe('Read-only SQL guard', () => {
  test('a single SELECT or WITH passes', () => {
    expect(() => assertReadOnly('select 1')).not.toThrow();
    expect(() => assertReadOnly("WITH x AS (select 1) SELECT * FROM x;")).not.toThrow();
    expect(() => assertReadOnly("select created_at, update_flag from t where note = 'delete me'")).not.toThrow();
  });

  test('writes and second statements are refused', () => {
    for (const sql of ['delete from t', 'select 1; delete from t', 'with d as (delete from t returning *) select * from d', 'update t set a = 1']) {
      expect(() => assertReadOnly(sql), sql).toThrow();
    }
  });
});
