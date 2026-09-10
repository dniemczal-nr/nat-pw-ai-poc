'use strict';

const { setWorldConstructor } = require('@cucumber/cucumber');
const config = require('../config');

/**
 * Cucumber World for non-UI scenarios (SSH, etc.).
 */
class World {
  constructor(options) {
    this._options = options || {};

    this.config = {
      get: (...args) => config.get(...args),
      has: (...args) => config.has(...args),
      getOrDefault: (...args) => config.getOrDefault(...args),
      all: () => (typeof config._all === 'function' ? config._all() : {}),
      _raw: config,
    };

    this.scenarioName = undefined;
    this.tags = [];
    this.environment = this.config.get('application.environment');

    this.isApiScenario = false;

    this.rest = undefined;
    this.db = undefined;
    this.ssh = undefined;
    this.mq = undefined;

    this.attachments = [];
    this.logger = null;
  }
}

setWorldConstructor(World);

module.exports = World;
