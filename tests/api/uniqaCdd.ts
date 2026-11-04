import fs from 'fs';
import path from 'path';
import { test, expect } from '../fixtures';
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

type ListRow = {
  code?: string;
  low?: number;
  high?: number | null;
  customerType?: 'P' | 'C';
  description: string;
  orgUnit: string;
  weight: number;
};

/** `OrgUnitCode` of the baseline template and of the collection requests. */
export const ORG_UNIT = 'UQ_AUT';
type Contributor = { name: string; dataLabel: string; group: string; riskFactorWeight: number };
type Level = { level: string; low: number; high: number; generateAlert: boolean; reviewPeriod: number };
type OrgUnit = { id: number; name: string; levels: Level[]; transitions: Record<string, Record<string, boolean>> };

function readJson<T>(file: string): T {
  return JSON.parse(fs.readFileSync(path.resolve(process.cwd(), DATA_DIR, file), 'utf8')) as T;
}

export const infoLists = readJson<{ lists: Record<string, ListRow[]> }>('info-lists.json').lists;
export const contributors = readJson<{ contributors: Contributor[] }>('risk-contributors.json').contributors;
export const riskModel = readJson<{ orgUnits: Record<string, OrgUnit> }>('risk-model.json');
/**
 * Row of a value-lookup code: the customer's org unit row first, else the default `SHA` row. This
 * holds for every risk factor (Gert, 4 Nov 2026); on QA, nationality AT scores the UQ_AUT row 0, not
 * the SHA row 30.
 */
export function codeRow(list: string, code: string, orgUnit = ORG_UNIT): ListRow {
  const rows = infoLists[list]?.filter((r) => r.code === code) ?? [];
  const row = rows.find((r) => r.orgUnit === orgUnit) ?? rows.find((r) => r.orgUnit === 'SHA');
  if (!row) throw new Error(`test data: no ${orgUnit} or SHA row for code "${code}" in ${list}`);
  return row;
}

export function codeWeight(list: string, code: string, orgUnit = ORG_UNIT): number {
  return codeRow(list, code, orgUnit).weight;
}

/**
 * Weight of a range lookup, `low <= value < high` (a null `high` is an open top row): the customer's
 * org unit row first, else the default `SHA` row, as for codes.
 */
export function rangeWeight(list: string, value: number, orgUnit = ORG_UNIT): number {
  const rows = (infoLists[list] ?? []).filter(
    (r) => r.low !== undefined && r.low <= value && (r.high == null || value < r.high),
  );
  const row = rows.find((r) => r.orgUnit === orgUnit) ?? rows.find((r) => r.orgUnit === 'SHA');
  if (!row) throw new Error(`test data: no ${orgUnit} or SHA range row for ${value} in ${list}`);
  return row.weight;
}

type SheetRow = { customerType: 'P' | 'C'; low: number; high: number | null; description: string; weight: number };
const totalSinglePremium = readJson<{ rows: SheetRow[] }>('total-single-premium-payments.json').rows;

/** UNIQA sheet weight of a total single premium: RANGE_HIGH inclusive, open top row (finding F10). */
export function singlePremiumWeight(customerType: SheetRow['customerType'], value: number): number {
  const row = totalSinglePremium.find(
    (r) => r.customerType === customerType && r.low <= value && (r.high === null || value <= r.high),
  );
  if (!row) throw new Error(`test data: no ${customerType} single premium row for ${value}`);
  return row.weight;
}

/** Lowest RANGE_LOW above zero in the sheet: the first band boundary a single premium can sit on. */
export function singlePremiumBoundary(customerType: SheetRow['customerType']): number {
  return Math.min(...totalSinglePremium.filter((r) => r.customerType === customerType && r.low > 0).map((r) => r.low));
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

type CustomerType = 'personal' | 'corporate';

export type RiskFactorRequest = {
  customerType: CustomerType;
  id: string;
  factor: string;
  file: string;
  /** Tags sent on top of the collection request so that it triggers its factor (rules.json `fields`). */
  fields: Record<string, string>;
  /** The UNIQA contributor this request is checked against, if any. */
  contributor?: string;
  /** contributes: score above 0 · present: returned, any score · accepted: CDDRisk returned only. */
  check: 'contributes' | 'present' | 'accepted';
  /** Why the check is weaker than `contributes` (rules.json). */
  reason?: string;
  /** Set when the check waits on UNIQA (rules.json `pending`): the test is `fixme` with this reason. */
  pending?: string;
};

type RiskFactorRules = {
  fields: Record<string, Record<string, string>>;
  presentOnly: Record<string, string>;
  acceptedOnly: Record<string, string>;
  pending: Record<string, string>;
};
const rfRules = readJson<RiskFactorRules>('rt/rf/rules.json');

/**
 * UNIQA's "XSD valid risk factor requests" (Postman collections, IDs 900), one OB application per
 * risk factor, extracted to rt/rf/<customerType>/RFnn_<Factor>.xml. The files are XSD-valid samples
 * that do not all trigger their factor; rt/rf/rules.json says how each one is sent and checked.
 */
export function riskFactorRequests(customerType: CustomerType): RiskFactorRequest[] {
  const dir = `${DATA_DIR}/rt/rf/${customerType}`;
  return fs
    .readdirSync(path.resolve(process.cwd(), dir))
    .filter((file) => file.endsWith('.xml'))
    .sort()
    .map((file) => {
      const [id, factor] = file.replace(/\.xml$/, '').split('_');
      const contributor = contributorFor(factor, customerType);
      const base = {
        customerType,
        id,
        factor,
        file: `${dir}/${file}`,
        fields: rfRules.fields[factor] ?? {},
        pending: rfRules.pending[factor],
      };
      if (!contributor) return { ...base, check: 'accepted' as const };
      if (rfRules.acceptedOnly[factor]) return { ...base, check: 'accepted' as const, reason: rfRules.acceptedOnly[factor] };
      if (rfRules.presentOnly[factor]) {
        return { ...base, contributor, check: 'present' as const, reason: rfRules.presentOnly[factor] };
      }
      return { ...base, contributor, check: 'contributes' as const };
    });
}

const DATA_LABEL: Record<CustomerType, string> = { personal: 'Personal', corporate: 'Corporate' };

/**
 * Contributor whose name matches a request's factor ignoring case, spaces and hyphens, if UNIQA has
 * one for this customer type (data label `All` or the type's own).
 */
export function contributorFor(factor: string, customerType: CustomerType): string | undefined {
  const key = (name: string) => name.toLowerCase().replace(/[^a-z]/g, '');
  return contributors.find(
    (c) => key(c.name) === key(factor) && (c.dataLabel === 'All' || c.dataLabel === DATA_LABEL[customerType]),
  )?.name;
}

type CddKeys = { customerId: string; policyId: string; partyId?: string };
type RtSender = { processMessage(xml: string): Promise<string> };

/**
 * Sends the baseline personal OB application (or `templateFile`) with `fields` overridden and
 * returns the response as it is, ErrorMessage included (for negative cases).
 */
export async function sendCddResponse(
  rt: RtSender,
  keys: CddKeys,
  fields: Record<string, string> = {},
  templateFile?: string,
): Promise<CddResponse> {
  const source = templateFile ? loadCddTemplate(templateFile) : template;
  // Names the scored customer in the report, so it can be looked up in the UI.
  test.info().annotations.push({ type: 'customer', description: `${keys.customerId} (policy ${keys.policyId})` });
  const result = await sendCddApplication(rt, buildCddApplication(source, { ...keys, fields }));
  test.info().annotations.push({
    type: 'cdd',
    description: result.error
      ? `${keys.customerId}: ErrorMessage ${result.error}`
      : `${keys.customerId}: CDDRisk ${result.risk ?? '-'}, score ${result.score ?? '-'}`,
  });
  return result;
}

/** As `sendCddResponse`, but fails on an ErrorMessage. */
export async function sendCdd(
  rt: RtSender,
  keys: CddKeys,
  fields: Record<string, string> = {},
  templateFile?: string,
): Promise<CddResponse> {
  const result = await sendCddResponse(rt, keys, fields, templateFile);
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
