// src/steps/sshSteps.js
// SSH-related step definitions using the sshClient capability

const path = require('path');
const { Given, When, Then } = require('@cucumber/cucumber');

// For now, we pull config and capability directly.
// Later phases will inject these via World.
const config = require(path.join(__dirname, '../config'));
const sshClient = require(path.join(__dirname, '../capabilities/sshClient'));

let lastBatchStatusOutput = '';

Given('I have SSH configuration for the batch QA host', async function () {
  const host = config.get('ssh.host');
  const user = config.get('ssh.user');
  const keyFile = config.get('ssh.keyFile');
  const port = config.getOrDefault('ssh.port', 22);

  if (!host || !user || !keyFile) {
    throw new Error(
      `Missing SSH configuration. ssh.host=${host}, ssh.user=${user}, ssh.keyFile=${keyFile}`,
    );
  }

  /* eslint-disable no-console */
  console.log('SSH configuration for batch QA host:');
  console.log('  APPLICATION_ENVIRONMENT:', process.env.APPLICATION_ENVIRONMENT || '(not set)');
  console.log('  application.environment:', config.get('application.environment'));
  console.log('  host:', host);
  console.log('  port:', port);
  console.log('  user:', user);
  console.log('  keyFile:', keyFile);
  console.log('====================================');
  /* eslint-enable no-console */
});

// Step: When I execute "sudo systemctl status <service>" over SSH
When('I execute {string} over SSH', async function (command) {
  if (!command || typeof command !== 'string') {
    throw new Error('SSH command must be a non-empty string from the feature file');
  }

  /* eslint-disable no-console */
  console.log('Executing SSH command from feature:', command);
  /* eslint-enable no-console */

  const result = await sshClient.exec(command);

  lastBatchStatusOutput = result.stdout || '';

  /* eslint-disable no-console */
  console.log('--- SSH command output ---');
  console.log(lastBatchStatusOutput);
  console.log('---------------------------');
  console.log('Exit code:', result.code);
  console.log('STDERR:');
  console.log(result.stderr || '');
  /* eslint-enable no-console */

  if (!lastBatchStatusOutput) {
    throw new Error('No output received from SSH command');
  }
});

Then(
  'the batch service status output should contain {string}',
  function (expected) {
    if (!lastBatchStatusOutput.includes(expected)) {
      /* eslint-disable no-console */
      console.error(
        `Expected batch service status output to contain "${expected}", but it did not.`,
      );
      console.error('Full output:\n', lastBatchStatusOutput);
      /* eslint-enable no-console */
      throw new Error(
        `Batch service status output does not contain "${expected}".`,
      );
    }
  },
);
