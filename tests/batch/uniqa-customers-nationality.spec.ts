/**
 * @plan specs/uniqa-jira-80-96.md §1.11
 * @seed tests/seed.spec.ts
 */
import fs from 'fs';
import path from 'path';
import { test, expect } from '../fixtures';
import * as config from '../../src/config';
import { applyPlaceholders } from '../../src/api/rtMessages';
import {
  envelopeKey,
  FIELD_SEPARATOR,
  feedbackKey,
  feedFile,
  flagKey,
  nextEnvelopeDate,
  unzip,
  zip,
} from '../../src/api/acquisitionEnvelope';
import type { DbRow } from '../../src/capabilities/adminerDbClient';
import { newRunId } from '../../src/capabilities/rtRestClient';

const TEMPLATE = 'test-data/uniqa/batch/acquisition/CUSTOMERS_CORPORATE.txt';
/** QA, 4 Nov 2026: rows in the DB after 6–8 minutes, the feedback archive after up to 10. */
const LOAD_TIMEOUT = 20 * 60_000;
const CODES = ['DE', 'FR', 'IT', 'BE', 'PL', 'CN', 'AT', 'ES', 'PT', 'NL', 'SE', 'DK', 'FI', 'IE', 'LU', 'CZ', 'SK'];

/** Field 28 NATIONALITY_CODE of each customer in the envelope. */
const CASES = [
  { tag: 'L', title: 'a list in NATIONALITY_CODE is stored in nationality_code_list', nationality: 'DE,CN,BE' },
  { tag: 'S', title: 'a single code is stored in nationality_code_list too', nationality: 'DE' },
  { tag: 'M', title: 'a list of 20 characters (IFS field length) is stored whole', nationality: CODES.slice(0, 7).join(',') },
  // IFS v1.6 §6.7 still says STRING (20); QA stores up to the 50 of nationality_code_list (envelope 20200613).
  { tag: 'X', title: 'a list longer than the IFS 20 characters is stored whole', nationality: CODES.slice(0, 8).join(',') },
  { tag: 'F', title: 'a list of 50 characters is stored whole', nationality: CODES.join(',') },
];
/** One code over the 50 characters of nationality_code_list: the row is rejected by the database. */
const TOO_LONG = { tag: 'T', nationality: [...CODES, 'HU'].join(',') };

test.describe.configure({ mode: 'serial' });

test.describe('UNIQA-85 nationality list through the CUSTOMERS batch feed', () => {
  test.skip(
    config.getOrDefault('BATCH_ENABLED', 'false') !== 'true',
    'Uploads an envelope to the shared acquisition folder and uses up an envelope date: run with BATCH_ENABLED=true (npm run test:batch)',
  );

  const run = newRunId();
  const customerId = (tag: string) => `NAT${run}B85${tag}`;
  let loaded = new Map<string, DbRow>();
  let rejected = '';

  test.beforeAll(async ({ minio, db }) => {
    test.setTimeout(LOAD_TIMEOUT + 5 * 60_000);
    const prefix = config.get('minio.acquisitionPrefix')!;
    const date = nextEnvelopeDate([...(await minio.list(`${prefix}/waiting/`)), ...(await minio.list(`${prefix}/feedback/`))]);
    const template = fs.readFileSync(path.resolve(process.cwd(), TEMPLATE), 'utf8');
    const timestamp = new Date().toISOString().replace(/\D/g, '').slice(0, 14);
    const rows = [...CASES, TOO_LONG].map(({ tag, nationality }) =>
      applyPlaceholders(template, {
        RUN_TIMESTAMP: timestamp,
        CUSTOMER_ID: customerId(tag),
        CUSTOMER_REF_ID: `NATR${run}B85${tag}`,
        CUSTOMER_NAME: `NAT Batch UNIQA-85 ${tag}`,
        NATIONALITY_CODE: nationality,
      }).split(FIELD_SEPARATOR),
    );
    test.info().annotations.push({
      type: 'envelope',
      description: `envelope_${date}.zip: ${[...CASES, TOO_LONG].map((c) => customerId(c.tag)).join(', ')}`,
    });

    await minio.put(envelopeKey(prefix, date), zip({ [`CUSTOMERS_${date}.txt`]: feedFile(rows) }));
    await minio.put(flagKey(prefix, date), Buffer.alloc(0));

    const select =
      'select customer_source_unique_id, nationality_code, nationality_code_list from apps.customers ' +
      `where customer_source_unique_id like 'NAT${run}B85%'`;
    // The too-long row is always rejected, so the feedback archive marks the end of the load. It can
    // come minutes after the accepted rows are in the DB (envelope 20200614).
    await expect
      .poll(() => minio.exists(feedbackKey(prefix, date)), {
        message: `feedback for envelope_${date}.zip`,
        timeout: LOAD_TIMEOUT,
        intervals: [30_000],
      })
      .toBe(true);
    await expect
      .poll(
        async () => {
          loaded = new Map((await db.query(select)).map((row) => [row.customer_source_unique_id!, row]));
          return loaded.size;
        },
        { timeout: 3 * 60_000, intervals: [20_000] },
      )
      .toBe(CASES.length)
      .catch(() => {});
    const feedback = await minio.get(feedbackKey(prefix, date));
    rejected = Object.entries(feedback ? unzip(feedback) : {})
      .filter(([name]) => name.endsWith('_reason'))
      .map(([, reason]) => reason.toString('utf8'))
      .join('\n');
  });

  for (const { tag, title, nationality } of CASES) {
    test(title, async () => {
      const row = loaded.get(customerId(tag));
      expect(row, `${customerId(tag)} loaded; rejects: ${rejected.slice(0, 500) || 'none'}`).toBeDefined();
      expect(row!.nationality_code, 'first code in nationality_code').toBe(nationality.split(',')[0]);
      expect(row!.nationality_code_list, 'whole list in nationality_code_list').toBe(nationality);
    });
  }

  test('a list longer than 50 characters rejects the row', async () => {
    expect(loaded.has(customerId(TOO_LONG.tag)), `${customerId(TOO_LONG.tag)} not loaded`).toBe(false);
    expect(rejected, 'feedback reason names the customer').toContain(customerId(TOO_LONG.tag));
    // QA, 4 Nov 2026: a DB error, not a validation message as over REST (XSD maxLength 50). Known batch-feed
    // issue, fixed only by a core upgrade (Gert): expect this text to change then.
    expect(rejected, 'feedback reason').toContain('value too long for type character varying(50)');
  });
});
