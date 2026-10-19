/**
 * @plan specs/rt-rest-messaging.md §3
 * @seed tests/seed.spec.ts
 */
import { test, expect } from '../fixtures';
import { payloadField } from '../../src/api/rtMessages';

const MESSAGES_FILE = 'REST_MSG_WLM_DELTA_CHECKS_NEW.txt';

test.describe('WLM subject delta checks over RT', () => {
  test('every subject message returns a trxId and its expected response', async ({ rt }) => {
    test.setTimeout(10 * 60_000);

    const results = await rt.sendMessagesFile(MESSAGES_FILE);

    for (const [id, result] of results) {
      expect.soft(result.trxId, `${id}: trxId`).toBeTruthy();
      expect.soft(result.hitCode, `${id}: hit code`).toBe(payloadField(result.request, 'expected_response'));
    }
  });
});
