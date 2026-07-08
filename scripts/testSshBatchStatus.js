#!/usr/bin/env node

// scripts/testSshBatchStatus.js
// Simple script to verify SSH capability by running `batch_status` on batch.qa2.reyl.fs.caws.local

/* eslint-disable no-console */

const path = require('path');

// Load config loader (src/config/index.js)
const config = require(path.join(__dirname, '../src/config'));

let sshClient;
try {
  // Expecting src/capabilities/sshClient.js to export an async exec(command) function
  sshClient = require(path.join(__dirname, '../src/capabilities/sshClient'));
} catch (err) {
  console.error('Failed to load src/capabilities/sshClient.js. Ensure it exists and exports async exec(command).');
  console.error(err && err.stack ? err.stack : err);
  process.exit(1);
}

async function main() {
  const testEnv = process.env.TEST_ENV || '';

  // Prefer config values; fall back to ENV if needed
  const sshHost = config.get('ssh.host') || process.env.SSH_HOST;
  const sshPort = config.get('ssh.port') || process.env.SSH_PORT;
  const sshUser = config.get('ssh.user') || process.env.SSH_USER;
  const sshKeyFile = config.get('ssh.keyFile') || process.env.SSH_KEYFILE;

  console.log('=== SSH Batch Status Test ===');
  console.log('TEST_ENV:', testEnv || '(not set)');
  console.log('ssh.host:', sshHost);
  console.log('ssh.port:', sshPort);
  console.log('ssh.user:', sshUser);
  console.log('ssh.keyFile:', sshKeyFile);
  console.log('ENV SSH_KEYFILE:', process.env.SSH_KEYFILE || '(not set)');
  console.log('ENV SSH_HOST:', process.env.SSH_HOST || '(not set)');
  console.log('ENV SSH_USER:', process.env.SSH_USER || '(not set)');
  console.log('ENV SSH_PORT:', process.env.SSH_PORT || '(not set)');

  if (!sshHost || !sshUser || !sshKeyFile) {
    console.error('Missing required SSH configuration (ssh.host, ssh.user, ssh.keyFile / SSH_* ENV variables).');
    process.exit(1);
  }

  try {
    const command = 'batch_status';
    console.log('\nExecuting SSH command:', command);

    const result = await sshClient.exec(command);

    // Expecting result to have stdout, stderr, and code (or exitCode)
    const stdout = result && (result.stdout || result.out || '');
    const stderr = result && (result.stderr || result.err || '');
    const code = (result && (typeof result.code === 'number' ? result.code : result.exitCode)) ?? null;

    console.log('\n--- SSH Command Result ---');
    console.log('STDOUT:\n', stdout);
    console.log('STDERR:\n', stderr);
    console.log('Exit code:', code);

    if (stdout && stdout.includes('ACTIVE')) {
      console.log('\nBatch status is ACTIVE. Test succeeded.');
      process.exit(0);
    }

    console.error('\nBatch status is not ACTIVE (or could not be determined).');
    process.exit(1);
  } catch (err) {
    console.error('Error while executing batch_status via SSH:');
    console.error(err && err.stack ? err.stack : err);
    process.exit(1);
  }
}

main();
