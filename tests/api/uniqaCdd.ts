import fs from 'fs';
import path from 'path';
import { expect } from '../fixtures';
import { newRunId } from '../../src/capabilities/rtRestClient';
import {
  buildCddApplication,
  loadCddTemplate,
  sendCddApplication,
  type CddResponse,
  type ScoreContribution,
} from '../../src/api/cddApplication';

/**
 * Shared data and send helpers for the UNIQA CDD specs (specs/uniqa-jira-80-96.md).
 * Expected values come from test-data/uniqa — never from literals in a spec.
 */

const DATA_DIR = 'test-data/uniqa';
const TEMPLATE = `${DATA_DIR}/rt/CDD_OB_PERSONAL.xml`;

type ListRow = { code?: string; low?: number; high?: number; description: string; orgUnit: string; weight: number };
type Contributor = { name: string; dataLabel: string; group: string; riskFactorWeight: number };
type Level = { level: string; low: number; high: number; generateAlert: boolean; reviewPeriod: number };
type OrgUnit = { id: number; name: string; levels: Level[]; transitions: Record<string, Record<string, boolean>> };

function readJson<T>(file: string): T {
  return JSON.parse(fs.readFileSync(path.resolve(process.cwd(), DATA_DIR, file), 'utf8')) as T;
}

export const infoLists = readJson<{ lists: Record<string, ListRow[]> }>('info-lists.json').lists;
export const contributors = readJson<{ contributors: Contributor[] }>('risk-contributors.json').contributors;
export const riskModel = readJson<{ orgUnits: Record<string, OrgUnit> }>('risk-model.json');
/** Product source type codes loaded on QA; anything else fails data-integrity validation. */
export const qaProducts = readJson<{ baseline: string; policyTypeRisk: string; codes: Record<string, string> }>(
  'qa-products.json',
);

/** Default-org-unit weight of a value-lookup code (spec: rows fall back to ORGUNIT_CODE = "SHA"). */
export function codeWeight(list: string, code: string): number {
  const row = infoLists[list]?.find((r) => r.code === code && r.orgUnit === 'SHA');
  if (!row) throw new Error(`test data: no SHA row for code "${code}" in ${list}`);
  return row.weight;
}

/** Default-org-unit weight of a range lookup, `low <= value < high`. */
export function rangeWeight(list: string, value: number): number {
  const row = infoLists[list]?.find((r) => r.orgUnit === 'SHA' && r.low! <= value && value < r.high!);
  if (!row) throw new Error(`test data: no SHA range row for ${value} in ${list}`);
  return row.weight;
}

/** Lowest RANGE_LOW above zero: the first boundary a value can sit on. */
export function firstBoundary(list: string): number {
  return Math.min(...(infoLists[list] ?? []).map((r) => r.low!).filter((low) => low > 0));
}

/** Contribution as returned in the response: list weight × risk factor weight. */
export function weighted(contributor: string, weight: number): number {
  const factor = contributors.find((c) => c.name === contributor);
  if (!factor) throw new Error(`test data: unknown contributor "${contributor}"`);
  return (weight * factor.riskFactorWeight) / 100;
}

/** Unique per call, within the 32-character CustomerSourceUniqueId / PolicySourceUniqueID limit. */
export function newKeys(tag: string): { customerId: string; policyId: string; partyId: string } {
  const runId = newRunId();
  return {
    customerId: `NAT${runId}${tag}`.slice(0, 32),
    policyId: `NATP${runId}${tag}`.slice(0, 32),
    partyId: `NATC${runId}${tag}`.slice(0, 32),
  };
}

const template = loadCddTemplate(TEMPLATE);

export type RiskFactorRequest = { customerType: 'personal' | 'corporate'; id: string; factor: string; file: string };

/**
 * UNIQA's "XSD valid risk factor requests" (Postman collections, IDs 900), one OB application per
 * risk factor, extracted to rt/rf/<customerType>/RFnn_<Factor>.xml.
 */
export function riskFactorRequests(customerType: RiskFactorRequest['customerType']): RiskFactorRequest[] {
  const dir = `${DATA_DIR}/rt/rf/${customerType}`;
  return fs
    .readdirSync(path.resolve(process.cwd(), dir))
    .filter((file) => file.endsWith('.xml'))
    .sort()
    .map((file) => {
      const [id, factor] = file.replace(/\.xml$/, '').split('_');
      return { customerType, id, factor, file: `${dir}/${file}` };
    });
}

/** Contributor whose name matches a request's factor ignoring case, spaces and hyphens, if UNIQA has one. */
export function contributorFor(factor: string): string | undefined {
  const key = (name: string) => name.toLowerCase().replace(/[^a-z]/g, '');
  return contributors.find((c) => key(c.name) === key(factor))?.name;
}

/**
 * Sends the baseline personal OB application (or `templateFile`) with `fields` overridden; fails on an
 * ErrorMessage. The product code is always set to the QA baseline unless `fields` names another.
 */
export async function sendCdd(
  rt: { processMessage(xml: string): Promise<string> },
  keys: { customerId: string; policyId: string; partyId?: string },
  fields: Record<string, string> = {},
  templateFile?: string,
): Promise<CddResponse> {
  const source = templateFile ? loadCddTemplate(templateFile) : template;
  const application = { ...keys, fields: { ProductSourceTypeCode: qaProducts.baseline, ...fields } };
  const result = await sendCddApplication(rt, buildCddApplication(source, application));
  expect(result.error, `${keys.customerId}: ErrorMessage`).toBeUndefined();
  expect(result.customerId, `${keys.customerId}: CustomerSourceUniqueId in response`).toBe(keys.customerId);
  return result;
}

export function contribution(result: CddResponse, name: string): ScoreContribution {
  const found = result.contributions.find((c) => c.name === name);
  if (!found) {
    throw new Error(`no "${name}" in response; got: ${result.contributions.map((c) => c.name).join(', ')}`);
  }
  return found;
}
