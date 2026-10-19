import fs from 'fs';
import path from 'path';
import type { APIRequestContext, APIResponse } from '@playwright/test';
import * as config from '../config';
import { applyPlaceholders, messageId, parseRtResponse, splitMessages, type RtResult } from '../api/rtMessages';

export type RtRestSettings = {
  tokenUrl: string;
  clientId: string;
  clientSecret: string;
  processUrl: string;
  messagesDir: string;
};

function requireConfigValue(key: string): string {
  const value = config.get(key);
  if (!value || value.includes('${')) {
    throw new Error(
      `REST config error: missing or unresolved "${key}" (got: "${value}"). ` +
        'Set via config/local.properties or ENV (OAUTH_TOKEN_URL, OAUTH_CLIENT_ID, OAUTH_CLIENT_SECRET, CDD_ENDPOINT_URL).',
    );
  }
  return value;
}

/** Unique per send: fills `${RUN_ID}` so messages stay uniquely keyed on shared environments. */
export function newRunId(): string {
  const stamp = new Date().toISOString().replace(/\D/g, '').slice(0, 17);
  return stamp + String(Math.floor(1000 + Math.random() * 9000));
}

/** Sends real-time messages to NetReveal Services Manager over REST (OAuth client-credentials token). */
export class RtRestClient {
  private token: string | undefined;

  constructor(private readonly api: APIRequestContext) {}

  assertConfigured(): RtRestSettings {
    return {
      tokenUrl: requireConfigValue('rest.tokenUrl'),
      clientId: requireConfigValue('rest.clientId'),
      clientSecret: requireConfigValue('rest.clientSecret'),
      processUrl: requireConfigValue('rest.rt.processUrl'),
      messagesDir: requireConfigValue('rest.rt.messagesDir'),
    };
  }

  async getToken(): Promise<string> {
    this.token ??= await this.requestToken();
    return this.token;
  }

  async processMessage(xml: string): Promise<string> {
    const { processUrl } = this.assertConfigured();
    let response = await this.postMessage(processUrl, xml);
    if (response.status() === 401) {
      this.token = undefined;
      response = await this.postMessage(processUrl, xml);
    }
    const body = await response.text();
    if (!response.ok()) {
      throw new Error(`RT processMessage: HTTP ${response.status()} ${response.statusText()}: ${body.slice(0, 1000)}`);
    }
    return body;
  }

  /** Sends every <Message> in `<rest.rt.messagesDir>/<fileName>` in order; results keyed by message Id. */
  async sendMessagesFile(fileName: string): Promise<Map<string, RtResult>> {
    const filePath = path.resolve(process.cwd(), this.assertConfigured().messagesDir, fileName);
    const templates = splitMessages(fs.readFileSync(filePath, 'utf8'));
    if (templates.length === 0) throw new Error(`RT messages file has no <Message> blocks: ${filePath}`);

    const placeholders = { RUN_ID: newRunId() };
    const results = new Map<string, RtResult>();
    for (const template of templates) {
      const request = applyPlaceholders(template, placeholders);
      const response = await this.processMessage(request);
      results.set(messageId(request), { ...parseRtResponse(response), request, response });
    }
    return results;
  }

  private async requestToken(): Promise<string> {
    const { tokenUrl, clientId, clientSecret } = this.assertConfigured();
    const response = await this.api.post(tokenUrl, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
      },
    });
    const body = await response.text();

    let json: { access_token?: unknown; error?: string; error_description?: string };
    try {
      json = JSON.parse(body);
    } catch {
      throw new Error(`RT token: HTTP ${response.status()}, non-JSON body: ${body.slice(0, 500)}`);
    }
    if (json.error) throw new Error(`RT token error: ${json.error_description ?? json.error}`);
    if (!response.ok() || typeof json.access_token !== 'string') {
      throw new Error(`RT token: HTTP ${response.status()}, no access_token in response`);
    }
    return json.access_token;
  }

  private async postMessage(url: string, xml: string): Promise<APIResponse> {
    return this.api.post(url, {
      headers: { 'Content-Type': 'application/xml', Accept: '*/*', Authorization: `Bearer ${await this.getToken()}` },
      data: xml,
    });
  }
}
