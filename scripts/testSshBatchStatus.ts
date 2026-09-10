#!/usr/bin/env npx tsx
/* eslint-disable no-console */
import * as config from '../src/config';
import { sshClient } from '../src/capabilities/sshClient';

async function main(): Promise<void> {
  const testEnv = process.env.TEST_ENV || '';

  console.log('=== SSH Batch Status Test ===');
  console.log('TEST_ENV:', testEnv || '(not set)');
  console.log('ssh.host:', config.get('ssh.host'));
  console.log('ssh.port:', config.get('ssh.port'));
  console.log('ssh.user:', config.get('ssh.user'));
  console.log('ssh.keyFile:', config.get('ssh.keyFile'));

  try {
    sshClient.assertConfigured();
  } catch (err) {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  }

  try {
    const command = process.env.BATCH_STATUS_COMMAND || 'batch_status';
    console.log('\nExecuting SSH command:', command);

    const result = await sshClient.exec(command);

    console.log('\n--- SSH Command Result ---');
    console.log('STDOUT:\n', result.stdout);
    console.log('STDERR:\n', result.stderr);
    console.log('Exit code:', result.code);

    if (result.stdout && result.stdout.toUpperCase().includes('ACTIVE')) {
      console.log('\nBatch status is ACTIVE. Test succeeded.');
      process.exit(0);
    }

    console.error('\nBatch status is not ACTIVE (or could not be determined).');
    process.exit(1);
  } catch (err) {
    console.error('Error while executing batch status via SSH:');
    console.error(err instanceof Error ? err.stack : err);
    process.exit(1);
  }
}

void main();
