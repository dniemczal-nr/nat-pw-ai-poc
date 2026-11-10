import { DOMParser } from '@xmldom/xmldom';
import * as xpath from 'xpath';

export type RtResult = {
  trxId: string | undefined;
  hitCode: string | undefined;
  request: string;
  response: string;
};

// Optional prolog + one <Message> block: covers one-message-per-line files and multi-line (SWIFT) messages.
const MESSAGE_BLOCK = /(?:<\?xml[^>]*\?>\s*)?<Message>[\s\S]*?<\/Message>/g;
const PLACEHOLDER = /\$\{(\w+)\}/g;

export function splitMessages(content: string): string[] {
  return content.match(MESSAGE_BLOCK) ?? [];
}

export function applyPlaceholders(template: string, values: Record<string, string>): string {
  return template.replace(PLACEHOLDER, (match, key: string) => {
    if (!(key in values)) {
      throw new Error(`RT message template: unknown placeholder ${match} (known: ${Object.keys(values).join(', ')})`);
    }
    return values[key];
  });
}

export function messageId(message: string): string {
  const id = selectText(parseXml(message), '//Message/Id');
  if (!id) throw new Error(`RT message has no <Id>: ${message.slice(0, 200)}`);
  return id;
}

/** Reads a field from the XML payload carried in <Data> (CDATA), e.g. `expected_response`. */
export function payloadField(message: string, field: string): string | undefined {
  const data = selectText(parseXml(message), '//Message/Data');
  return data ? selectText(parseXml(data), `//${field}`) : undefined;
}

export function parseRtResponse(body: string): Pick<RtResult, 'trxId' | 'hitCode'> {
  const doc = parseXml(body);
  const trxId = selectText(doc, "/results//key[text()='trxId']/following-sibling::value");
  const value = xpath.select1("/results//function[@name='ADD-TO-RESPONSE']//value", doc) as Node | undefined;
  return { trxId, hitCode: value ? hitCodeOf(value) : undefined };
}

// The WLM result sits in <value> either as child elements or as escaped XML text.
function hitCodeOf(value: Node): string | undefined {
  const direct = selectText(value, './/code');
  if (direct !== undefined) return direct;
  const text = value.textContent?.trim();
  return text ? selectText(parseXml(text), '//code') : undefined;
}

function parseXml(xml: string): Node {
  return new DOMParser().parseFromString(xml.trim(), 'text/xml') as unknown as Node;
}

function selectText(node: Node, expression: string): string | undefined {
  const match = xpath.select1(expression, node) as Node | undefined;
  return match?.textContent?.trim();
}
