/**
 * @plan specs/rt-rest-messaging.md §1
 * @seed tests/seed.spec.ts
 */
import { test, expect } from '../fixtures';
import { applyPlaceholders, messageId, parseRtResponse, payloadField, splitMessages } from '../../src/api/rtMessages';

const PROLOG = '<?xml version="1.0" encoding="UTF-8"?>';
const message = (id: string) =>
  `${PROLOG}<Message><Id>${id}</Id><Type>XML</Type><Sequence>WLMAGS_Subject_RT_REST</Sequence>` +
  `<Data><![CDATA[<txn><subject_id>${id}</subject_id><expected_response>HIT</expected_response></txn>]]></Data></Message>`;

test.describe('Message file handling', () => {
  test('splits one-per-line files into messages', () => {
    const messages = splitMessages(`${message('A')}\n${message('B')}\n`);
    expect(messages.map(messageId)).toEqual(['A', 'B']);
    expect(messages[0].startsWith(PROLOG)).toBe(true);
  });

  test('keeps a multi-line message together', () => {
    const multiLine = ['<Message>', '<Id>SWIFT_1</Id>', '<Data><![CDATA[{1:F01}\n{4:\n:20:REF\n-}]]></Data>', '</Message>'].join('\n');
    const messages = splitMessages(`${multiLine}\n${message('B')}`);
    expect(messages).toHaveLength(2);
    expect(messageId(messages[0])).toBe('SWIFT_1');
  });

  test('fills RUN_ID and rejects unknown placeholders', () => {
    expect(applyPlaceholders(message('S_${RUN_ID}'), { RUN_ID: '42' })).toContain('<Id>S_42</Id>');
    expect(() => applyPlaceholders('<Id>${NOPE}</Id>', { RUN_ID: '42' })).toThrow(/unknown placeholder \$\{NOPE\}/);
  });

  test('reads the message Id and a payload field', () => {
    expect(messageId(message('X1'))).toBe('X1');
    expect(payloadField(message('X1'), 'expected_response')).toBe('HIT');
    expect(payloadField(message('X1'), 'missing_field')).toBeUndefined();
  });

  test('parses trxId and hit code from a response', () => {
    const escaped =
      '<results><result><key>trxId</key><value>9001</value></result>' +
      '<function name="ADD-TO-RESPONSE"><param><value>&lt;wlm&gt;&lt;code&gt;HIT&lt;/code&gt;&lt;/wlm&gt;</value></param></function></results>';
    const nested =
      '<results><result><key>trxId</key><value>9002</value></result>' +
      '<function name="ADD-TO-RESPONSE"><value><wlm><code>NO_HIT</code></wlm></value></function></results>';

    expect(parseRtResponse(escaped)).toEqual({ trxId: '9001', hitCode: 'HIT' });
    expect(parseRtResponse(nested)).toEqual({ trxId: '9002', hitCode: 'NO_HIT' });
    expect(parseRtResponse('<results/>')).toEqual({ trxId: undefined, hitCode: undefined });
  });
});
