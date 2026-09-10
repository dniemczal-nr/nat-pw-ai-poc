import { test, expect } from '../fixtures';

/**
 * Migrated from features/ssh/batch-status.feature (Cucumber @SSH).
 * Runs in Playwright project `ssh` (no auth.setup / storageState dependency).
 */
test.describe('Batch service status over SSH', () => {
  test('batch service is ACTIVE on the configured host', async ({ ssh }) => {
    const { host, user, keyFile, port } = ssh.assertConfigured();

    // eslint-disable-next-line no-console
    console.log('SSH:', { host, port, user, keyFile });

    const service = process.env.BATCH_SERVICE_NAME;
    if (!service) {
      throw new Error(
        'Set BATCH_SERVICE_NAME (remote systemd unit name) before running SSH batch status tests.',
      );
    }

    const result = await ssh.exec(`sudo systemctl status ${service}`);

    // eslint-disable-next-line no-console
    console.log('SSH stdout:\n', result.stdout);
    // eslint-disable-next-line no-console
    console.log('SSH stderr:\n', result.stderr);
    // eslint-disable-next-line no-console
    console.log('Exit code:', result.code);

    expect(result.stdout.length, 'expected non-empty SSH stdout').toBeGreaterThan(0);
    expect(result.stdout.toLowerCase()).toContain('active');
  });
});
