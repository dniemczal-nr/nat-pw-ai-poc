'use strict';

class BasePage {
  constructor(page) {
    if (!page) {
      throw new Error('BasePage requires a Playwright page instance');
    }
    this.page = page;
  }

  async goto(path) {
    await this.page.goto(path);
  }

  async click(selector) {
    await this.page.click(selector);
  }

  async fill(selector, value) {
    await this.page.fill(selector, value);
  }

  async waitForVisible(selector, timeout) {
    await this.page.waitForSelector(selector, { state: 'visible', timeout });
  }
}

module.exports = BasePage;
