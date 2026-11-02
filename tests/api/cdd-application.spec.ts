/**
 * @plan specs/uniqa-jira-80-96.md §0
 * @seed tests/seed.spec.ts
 */
import { test, expect } from '../fixtures';
import { buildCddApplication, loadCddTemplate, parseCddResponse } from '../../src/api/cddApplication';
import { messageId, payloadField } from '../../src/api/rtMessages';
import { riskFactorRequests } from './uniqaCdd';

const TEMPLATE =
  '<Message><Id>${CUSTOMER_ID}</Id><Type>CDDSI_XMLObjectGraph</Type><Sequence>CDDSI_ApplicationRequestProcessor</Sequence>' +
  '<Data><![CDATA[<txn><RunTimestamp>${RUN_TIMESTAMP}</RunTimestamp><CustomerSourceUniqueId>${CUSTOMER_ID}</CustomerSourceUniqueId>' +
  '<NationalityCode>AT</NationalityCode><PolicyID>${POLICY_ID}</PolicyID></txn>]]></Data></Message>';

// Shapes from the IFS v1.6 §7.1.7 / §7.1.9 examples, trimmed.
const graph = (inner: string) =>
  '<results><result recordNumber="0"><function name="KAFKA-REQUEST-RESPONSE" order="20"><resultItem type="result">' +
  `<property><key><![CDATA[objectGraph]]></key><value><![CDATA[<data json-technical-node="data"><ApplicationResponse>${inner}</ApplicationResponse></data>]]></value></property>` +
  '</resultItem></function><function name="ADD-TO-RESPONSE" order="30"><resultItem type="result"><property>' +
  '<key><![CDATA[requestMessageId]]></key><value><![CDATA[1234]]></value></property></resultItem></function></result></results>';

test.describe('CDD application message and response handling', () => {
  test('fills keys and overrides payload tags', () => {
    const message = buildCddApplication(TEMPLATE, {
      customerId: 'C1',
      policyId: 'P1',
      fields: { NationalityCode: 'CN,DE', InternalCustomerId: 'X$1' },
    });
    expect(messageId(message)).toBe('C1');
    expect(payloadField(message, 'CustomerSourceUniqueId')).toBe('C1');
    expect(payloadField(message, 'PolicyID')).toBe('P1');
    expect(payloadField(message, 'NationalityCode')).toBe('CN,DE');
    expect(payloadField(message, 'InternalCustomerId')).toBe('X$1');
    expect(payloadField(message, 'RunTimestamp')).toMatch(/^\d{14}$/);
  });

  test('parses risk, score, EDD flag and contributions', () => {
    const parsed = parseCddResponse(
      graph(
        '<CustomerSourceUniqueId>CUST-TEST-002</CustomerSourceUniqueId><CDDRisk>High</CDDRisk><ScoreContributions>' +
          '<ScoreContributions-array-item><Name>Channel Risk</Name><Info>Registration channel: Internet-based services</Info>' +
          '<Score>56.0</Score><Dimension>Channel</Dimension></ScoreContributions-array-item>' +
          '<ScoreContributions-array-item><Name>Manual Risk Adjustment</Name><Info node-value=""></Info>' +
          '<Score>0.0</Score><Dimension>Override</Dimension></ScoreContributions-array-item>' +
          '</ScoreContributions><EDDFlag>true</EDDFlag><CDDRiskScore>262.0</CDDRiskScore>',
      ),
    );
    expect(parsed).toEqual({
      customerId: 'CUST-TEST-002',
      risk: 'High',
      score: 262,
      edd: true,
      error: undefined,
      contributions: [
        { name: 'Channel Risk', info: 'Registration channel: Internet-based services', score: 56, dimension: 'Channel' },
        { name: 'Manual Risk Adjustment', info: '', score: 0, dimension: 'Override' },
      ],
    });
  });

  test('parses an error response', () => {
    const parsed = parseCddResponse(
      graph('<CustomerSourceUniqueId>102030405060</CustomerSourceUniqueId><ErrorMessage>Enrichment service failed</ErrorMessage>'),
    );
    expect(parsed.error).toBe('Enrichment service failed');
    expect(parsed.risk).toBeUndefined();
    expect(parsed.contributions).toEqual([]);
  });

  test('parses an objectGraph returned as elements instead of CDATA', () => {
    // UNIQA QA, 2 Nov 2026: same graph as the IFS example, but not wrapped in CDATA.
    const parsed = parseCddResponse(
      graph('<CustomerSourceUniqueId>C9</CustomerSourceUniqueId><ErrorMessage>Enrichment service failed</ErrorMessage>')
        .replace('<value><![CDATA[<data', '<value><data')
        .replace('</data>]]></value>', '</data></value>'),
    );
    expect(parsed.customerId).toBe('C9');
    expect(parsed.error).toBe('Enrichment service failed');
  });

  test('rejects a response without ApplicationResponse', () => {
    expect(() => parseCddResponse('<results/>')).toThrow(/no ApplicationResponse/);
  });

  test('fills every risk factor request template', () => {
    // Plan §8: catches a placeholder or key left over from the Postman extraction, without sending.
    const requests = [...riskFactorRequests('personal'), ...riskFactorRequests('corporate')];
    expect(requests).toHaveLength(83);
    for (const request of requests) {
      const message = buildCddApplication(loadCddTemplate(request.file), { customerId: 'C1', policyId: 'P1', partyId: 'CP1' });
      expect(message, request.file).not.toMatch(/\$\{|POSTINO|POL-UQ/);
      expect(messageId(message), request.file).toBe('C1');
      expect(payloadField(message, 'CustomerSourceUniqueId'), request.file).toBe('C1');
      expect(payloadField(message, 'PolicySourceUniqueID'), request.file).toBe('P1');
      expect(message, request.file).toContain('<CustomerSourceUniqueId>CP1</CustomerSourceUniqueId>');
    }
  });
});
