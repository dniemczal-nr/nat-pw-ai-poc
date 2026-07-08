// scripts/printConfig.js
// Simple validation script to print resolved configuration

/* eslint-disable no-console */

const path = require('path');

// Ensure we can require src/config/index.js relative to this script
const config = require(path.join(__dirname, '../src/config'));

const applicationEnvOverride = process.env.APPLICATION_ENVIRONMENT || '(not set)';
const applicationEnvResolved = config.get('application.environment');

console.log('=== Config Print ===');
console.log(`APPLICATION_ENVIRONMENT (ENV): ${applicationEnvOverride}`);
console.log(`application.environment (resolved): ${applicationEnvResolved}`);
console.log('app.baseUrl:', config.get('app.baseUrl'));
console.log('api.baseUrl:', config.get('api.baseUrl'));
console.log('db.host:', config.get('db.host'));
console.log('db.port:', config.get('db.port'));
console.log('db.user:', config.get('db.user'));
console.log('db.name:', config.get('db.name'));
console.log('ssh.host:', config.get('ssh.host'));
console.log('ssh.port:', config.get('ssh.port'));
console.log('ssh.user:', config.get('ssh.user'));
console.log('mq.host:', config.get('mq.host'));
console.log('mq.port:', config.get('mq.port'));
console.log('mq.topic:', config.get('mq.topic'));

console.log('====================');
