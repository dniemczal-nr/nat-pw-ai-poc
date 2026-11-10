/**
 * @plan specs/rt-rest-messaging.md §2
 * @seed tests/seed.spec.ts
 */
import { test, expect } from '../fixtures';

test.describe('Token', () => {
  test('configured client credentials yield an access token', async ({ rt }) => {
    rt.assertConfigured();
    expect(await rt.getToken()).not.toBe('');
  });
});
