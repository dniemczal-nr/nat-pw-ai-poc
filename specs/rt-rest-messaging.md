# Real-Time Messages over REST — Test Plan

## Application Overview

NetReveal Services Manager accepts real-time (RT) messages on its REST `processMessage`
endpoint. A message is an XML `<Message>` envelope (`Id`, `Type`, `Sequence`, payload in
`<Data>` CDATA). The response is XML; for WLM it carries the transaction id (`trxId`) and the
screening result code inside the `ADD-TO-RESPONSE` function.

**Seed:** `tests/seed.spec.ts` (UI reference only — this plan runs in project `api`, no browser,
no `storageState`).

**Flow (`src/capabilities/rtRestClient.ts`, fixture `rt`):**
1. Token: `POST rest.tokenUrl`, `Authorization: Basic base64(clientId:clientSecret)`, no body →
   JSON `access_token`. One token per worker; refreshed once on HTTP 401.
2. Send: `POST rest.rt.processUrl`, `Content-Type: application/xml`, `Bearer <token>`, body =
   one `<Message>`.
3. Parse (`src/api/rtMessages.ts`):
   - `trxId` — `/results//key[text()='trxId']/following-sibling::value`
   - `hitCode` — `//code` inside `/results//function[@name='ADD-TO-RESPONSE']//value`

**Message files:** `rest.rt.messagesDir` (default `test-data/rt`). A file holds any number of
`<Message>` blocks, one per line or spread over several lines (SWIFT). `${RUN_ID}` in a message is
replaced with a value unique to each file send.

**Config / secrets:** `OAUTH_TOKEN_URL`, `OAUTH_CLIENT_ID`, `OAUTH_CLIENT_SECRET`,
`CDD_ENDPOINT_URL` via `.env` / `<name>.env`. Never in specs or tracked files.

**Shared environments:** every sent message creates or updates data. Prefer `${RUN_ID}`-keyed
messages; there is no cleanup over RT.

## 1. Message file handling (offline)

`tests/api/rt-messages.spec.ts` — no environment needed.

1.1 Splits one-per-line files (each line with its own XML prolog) into messages.
1.2 Splits a multi-line `<Message>` block as one message.
1.3 Fills `${RUN_ID}` and rejects unknown placeholders.
1.4 Reads the message `Id` and a payload field (`expected_response`) from `<Data>`.
1.5 Parses `trxId` and `hitCode` from a response, whether the WLM result is nested XML or escaped
    text.

## 2. Token (live, read-only)

`tests/api/rt-token.spec.ts`

2.1 Configured client credentials yield a non-empty access token.

## 3. Message processing (live, writes data) — per project

Project branches add specs that send their message files with `rt.sendMessagesFile(<file>)` and
assert per message: `trxId` present, `hitCode` equals the payload's `expected_response`.
