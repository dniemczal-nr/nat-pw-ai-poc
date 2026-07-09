'use strict';

const { setWorldConstructor } = require('@cucumber/cucumber');
const config = require('../config');

/**
 * Custom Cucumber World implementation.
 *
 * A new instance of this World is created for every scenario.
 * It exposes configuration and placeholder capabilities that can be
 * extended in later phases (UI, REST, DB, SSH, MQ, etc.).
 */
class World {
  constructor(options) {
    // Raw Cucumber world options (contains parameters, attach, log, etc.)
    this._options = options || {};

    // Configuration facade
    this.config = {
      get: (...args) => config.get(...args),
      has: (...args) => config.has(...args),
      getOrDefault: (...args) => config.getOrDefault(...args),
      all: () => (typeof config._all === 'function' ? config._all() : {}),
      // Expose underlying module in case advanced access is needed later
      _raw: config,
    };

    // Scenario-level metadata (populated by hooks)
    this.scenarioName = undefined;
    this.tags = [];
    this.environment = this.config.get('application.environment');

    // Derived flags (set in hooks based on tags)
    this.isUiScenario = false;
    this.isApiScenario = false;

    // Capability placeholders (to be wired to real clients in later phases)
    this.ui = undefined;   // e.g. browser/page/controller wrapper
    this.rest = undefined; // e.g. REST API client
    this.db = undefined;   // e.g. database client/connection
    this.ssh = undefined;  // e.g. SSH client/session
    this.mq = undefined;   // e.g. message queue client

    // UI domain capabilities
    this.adminAuth = undefined;

     // Scenario-scoped attachments, e.g. screenshots or logs
     // Each entry is expected to be an object with at least a `type` field.
     this.attachments = [];

     // Per-scenario logger (tee to console and file)
     this.logger = null;
   }
 }


setWorldConstructor(World);

module.exports = World;
