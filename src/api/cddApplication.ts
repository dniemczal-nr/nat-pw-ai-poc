import fs from 'fs';
import path from 'path';
import { DOMParser } from '@xmldom/xmldom';
import * as xpath from 'xpath';
import { applyPlaceholders } from './rtMessages';

export type ScoreContribution = { name: string; info: string; score: number; dimension: string };

/** CDD application response (IFS §7.1.7 / §7.1.9): either a score or an ErrorMessage. */
export type CddResponse = {
  customerId: string | undefined;
  risk: string | undefined;
  score: number | undefined;
  edd: boolean | undefined;
  error: string | undefined;
  contributions: ScoreContribution[];
  request: string;
  response: string;
};

export type CddApplication = {
  customerId: string;
  policyId: string;
  /** Fills `${PARTY_ID}` (connected party key) in templates that carry one. */
  partyId?: string;
  /** Payload tags to set, e.g. `{ NationalityCode: 'CN,DE' }`. Tags missing from the template are appended. */
  fields?: Record<string, string>;
};

export function loadCddTemplate(relativePath: string): string {
  return fs.readFileSync(path.resolve(process.cwd(), relativePath), 'utf8');
}

/** Fills the template placeholders and overrides payload tags. The txn schema is `xs:all`, so tag order is free. */
export function buildCddApplication(template: string, application: CddApplication): string {
  let message = applyPlaceholders(template, {
    CUSTOMER_ID: application.customerId,
    POLICY_ID: application.policyId,
    ...(application.partyId ? { PARTY_ID: application.partyId } : {}),
    RUN_TIMESTAMP: new Date().toISOString().replace(/\D/g, '').slice(0, 14),
  });
  for (const [tag, value] of Object.entries(application.fields ?? {})) {
    const element = new RegExp(`<${tag}>[^<]*</${tag}>|<${tag}/>`);
    const filled = `<${tag}>${value}</${tag}>`;
    message = element.test(message)
      ? message.replace(element, () => filled)
      : message.replace('</txn>', () => `${filled}\n</txn>`);
  }
  return message;
}

export function parseCddResponse(body: string): Omit<CddResponse, 'request' | 'response'> {
  // The IFS example wraps objectGraph in CDATA; QA returns it as child elements. Accept both.
  const value = xpath.select1("/results//property[normalize-space(key)='objectGraph']/value", parseXml(body)) as
    | Node
    | undefined;
  const inline = value && (xpath.select1('.//ApplicationResponse', value) as Node | undefined);
  const graph = value?.textContent?.trim();
  const app = inline ?? (graph ? (xpath.select1('//ApplicationResponse', parseXml(graph)) as Node | undefined) : undefined);
  if (!app) throw new Error(`CDD response has no ApplicationResponse: ${body.slice(0, 500)}`);

  const items = xpath.select('./ScoreContributions/ScoreContributions-array-item', app) as Node[];
  const score = selectText(app, './CDDRiskScore');
  const edd = selectText(app, './EDDFlag');
  return {
    customerId: selectText(app, './CustomerSourceUniqueId'),
    risk: selectText(app, './CDDRisk'),
    score: score ? Number(score) : undefined,
    edd: edd ? edd === 'true' : undefined,
    error: selectText(app, './ErrorMessage'),
    contributions: items.map((item) => ({
      name: selectText(item, './Name') ?? '',
      info: selectText(item, './Info') ?? '',
      score: Number(selectText(item, './Score') ?? NaN),
      dimension: selectText(item, './Dimension') ?? '',
    })),
  };
}

/** Sends one CDD application over `processMessage` and parses the ApplicationResponse. */
export async function sendCddApplication(
  rt: { processMessage(xml: string): Promise<string> },
  request: string,
): Promise<CddResponse> {
  const response = await rt.processMessage(request);
  return { ...parseCddResponse(response), request, response };
}

function parseXml(xml: string): Node {
  return new DOMParser().parseFromString(xml.trim(), 'text/xml') as unknown as Node;
}

function selectText(node: Node, expression: string): string | undefined {
  const match = xpath.select1(expression, node) as Node | undefined;
  return match?.textContent?.trim();
}
