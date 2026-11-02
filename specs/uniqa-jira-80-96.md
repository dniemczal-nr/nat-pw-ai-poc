# UNIQA Jira 81, 83, 85, 86, 90–94 — Test Plan

## Application Overview

Scope of this plan: the UNIQA tickets that can be implemented as automated tests now — customer
identifiers and nationality list (81, 85), multivalue Source of Funds (86), policies in REST
requests and policy-derived risk factors (91, 92), info lists / risk contributions (83, 90, 93,
94 in part), and the per-org-unit risk model.

Tickets 80, 82, 84, 87, 88, 89, 95 and 96 are out of this plan. Reasons are in "Out of scope".

**Seed:** `tests/seed.spec.ts` (UI reference). REST specs run in project `api`
(`specs/rt-rest-messaging.md`); UI specs run in project `chromium` with the shared storageState.

**Environment:** UNIQA QA (`uniqa-qa`). Every RT message writes customer and policy data to a shared
environment. Every customer and policy key is unique per send (`NAT<RUN_ID><tag>`, ≤ 32
characters). No spec triggers Reload Configuration or changes shared admin credentials (CLAUDE.md).

**Secrets:** REST, DB and MinIO credentials are read from config/ENV only (`.env`, `uniqa.env`).
Nothing secret goes into a spec, plan or tracked file.

**Data:** expected weights and code sets come from the UNIQA risk-weights sheet (*UNIQA CDD risk
contributors 23.10.xlsx*), provided by Anna or Gert. Each set is stored as a data file in
`test-data/uniqa/` on `project/uniqa` — never on `main`. Until a list arrives from the sheet, the
spec's Appendix A values (marked "TBC by UNIQA") are used, from `info-lists.json`. Specs read
every expected value from these files, never from literals.

## Reference documentation

*CDD-KYC Risk Scoring Detection Specification for UNIQA*, software 9.6, document v1.3
(11 Aug 2026, with tracked changes by G. Pauwels, Oct 2026). Confidential — referenced here by
section number only; the document is not committed.

| Spec section | Content | Used in |
|---|---|---|
| §4.1.1 | Customer data source fields and source columns | §1, §3 |
| §4.2.2 / §4.2.3 | Value and range lookup info lists | §5 |
| §4.6 | Dimension weights (Channel 5, Customer 45, Geography 35, Behaviour 10, Product 5; Override, RelatedParties 100) | §5.3 |
| §4.7 table | 47 individual contributors: data label, group, risk factor weight | §1–§3, §5.3 |
| §4.7.x | Scenario condition, score information, score weight per contributor | §2, §3, §5 |
| §5.1 | Risk levels: Standard 0–20, Low 20–40, Medium 40–70, High 70–100 (EDD); lookup `Low < score <= High` | §6 |
| §7 (Appendix A) | Info list contents | §1–§3, §5 |
| §8.4 | Fingerprint fields (`Fingerprint_Customer`, `Fingerprint_Customer_WLM`) | §7 findings |

*UNIQA IFS NetReveal 9.6 (CDD + C4I)*, v1.6. Confidential, not committed.

| IFS section | Content | Used in |
|---|---|---|
| §6.7 / §6.9 | CUSTOMERS / POLICIES batch columns | `batch/README.md` |
| §7.1.4 | REST input message (`CDDSI_ApplicationRequestProcessor`) and its XSD | §0, §1–§3 |
| §7.1.7 / §7.1.9 | REST application response and error response | §0 |

Further UNIQA inputs (confidential, not committed; extracted values live in `test-data/uniqa/`):

| Document | Content | Data file | Used in |
|---|---|---|---|
| *UNIQA CDD risk contributors 23.10* | TotalSinglePremiumPaymentsRisk split per customer type (the only tab received) | `total-single-premium-payments.json` | §5.4 |
| *UQ - Risk Model - Level Mapping* | Org units 1010–1018, risk levels per org unit × customer type, review periods, transition alerts | `risk-model.json` | §6 |
| Detection spec §4.6 / §4.7 table | Dimension weights, 47 contributors (data label, group, risk factor weight) | `risk-contributors.json` | §1–§3, §5.3 |
| Detection spec Appendix A | CountryRisk, SourceOfFundsRisk, OnOwnAccountRisk, LegalEntityTypeRisk, PolicyCountRisk, policy lists | `info-lists.json` | §1–§3, §5 |
| IFS §7.1.4 example | Baseline personal OB application, low risk, `UQ_AUT` | `rt/CDD_OB_PERSONAL.xml` | §0–§3, §6 |
| QA `PRODUCT_SOURCE_TYPE` (DB query, 2 Nov 2026) | Product source type codes loaded on QA | `qa-products.json` | §0–§3, §6, §8 |
| *UNIQA CDD Personal / Corporate - XSD valid risk factor requests - IDs 900* (Postman, 2 Nov 2026) | One OB application per risk factor, built for DEV (`uniqa_dev`); auth and IDs not copied | `rt/rf/personal/`, `rt/rf/corporate/` | §8 |
| Sample batch feed (`*_20160108.txt`, project SharePoint) | Generic NR insurance sample: 21 customers, 21 policies, products, policy statuses, branches | `batch/` (see `batch/README.md`) | §3 |

Range lookups use `RANGE_LOW <= value < RANGE_HIGH` (§4.7.32, §4.7.44, §4.7.46). Value lookups fall
back to `ORGUNIT_CODE = "SHA"` when the customer's org unit has no row. A contribution in the
response is `info-list weight × risk factor weight / 100` (IFS §7.1.7 example: Channel Risk
80 × 70 % = 56).

## Scope by ticket

| Ticket | Summary | Jira status | Project | Sections | Spec |
|---|---|---|---|---|---|
| UNIQA-81 | Additional customer ID (`InternalCustomerId`) | In Progress (Services) | api, chromium | §1 | — (not in spec) |
| UNIQA-85 | `nationality_code_list` in CUSTOMERS | Nowe | api | §1 | §4.1.1 Nationalities, §4.7.23 |
| UNIQA-86 | Source of Funds as multivalue factor | Nowe | api | §2 | §4.7.41, §7.10 |
| UNIQA-91 | Policy aggregations and intra-day persistence (OB) | In Progress (Services) | api, DB | §3, §4 | §4.1.1 policy fields |
| UNIQA-92 | Multiple policies per REST request | Nowe | api | §3 | §4.1.1 policy fields |
| UNIQA-90 | Investigate info list LegalEntityTypes | Analysis/Estimation | chromium | §5.1 | §4.7.21, §7.31 |
| UNIQA-93 | OnOwnAccountRisk codes and weights | In Progress (Services) | api, chromium | §3, §5.2 | §4.7.27, §7.25 |
| UNIQA-83 | Risk contribution configuration | Nowe | chromium | §5.3 | §4.6, §4.7 table |
| UNIQA-94 | Weight upload issues (part) | Nowe | chromium | §5.4 | §7.4, §7.15, §7.24, §7.34–7.36 |

## Implementation status

| Section | File | State |
|---|---|---|
| §0 | `tests/api/cdd-application.spec.ts` | Done; offline, passes (incl. the §8 templates) |
| §1 | `tests/api/uniqa-customer-ids.spec.ts` | 1.1, 1.3, 1.4 ready; 1.2 and the 1.3 DB check `fixme` (§4); 1.5 not started (UI) |
| §2 | `tests/api/uniqa-source-of-funds.spec.ts` | 2.1, 2.3–2.5 ready; 2.2 `fixme` (F1) |
| §3 | `tests/api/uniqa-policies.spec.ts` | 3.1, 3.3, 3.7 and third-party / own-account ready; 3.2 and 3.6 `fixme` (F13); 3.4, 3.5 `fixme` (§4); 3.8 `fixme` (F4) |
| §4 | — | Blocked: DB host and driver (open question 2) |
| §5 | — | Not started: needs Shared List Management / Scenario Manager locators |
| §6 | `tests/api/uniqa-risk-levels.spec.ts` | 6.2, 6.3 ready; 6.4 `fixme` (alerts not in response); 6.5 `fixme` (F11); 6.1 not started (UI) |
| §8 | `tests/api/uniqa-risk-factors.spec.ts` | Ready: 83 requests (46 personal, 37 corporate) |

"Ready" means compiled and listed, not yet passing: QA returns "Enrichment service failed" for
every application (open question 10).

Shared helpers live in `tests/api/uniqaCdd.ts` (data loaders, expected-weight lookups, keyed send).
The message builder and response parser live in `src/api/cddApplication.ts`.

## 0. CDD application message and response

Project `api`. File: `tests/api/cdd-application.spec.ts` (offline, no environment).

Request (IFS §7.1.4): `<Message>` with `Type` = `CDDSI_XMLObjectGraph`, `Sequence` =
`CDDSI_ApplicationRequestProcessor` and a `<txn>` payload in CDATA. `<txn>` is an `xs:all`, so tag
order is free and each tag occurs at most once. Mandatory tags: `RunTimestamp`,
`CustomerSourceUniqueId` (max 32), `OrgUnitCode`, `CustomerSourceRefId`, `CustomerName`,
`CountryOfResidence`, `CountryOfOrigin`, `NationalityCode`, `CustomerTypeCode`, `CustomerStatusCode`.

Response (IFS §7.1.7): `objectGraph` holds `<ApplicationResponse>` with `CDDRisk`, `CDDRiskScore`,
`EDDFlag` and `ScoreContributions` (`Name`, `Info`, `Score`, `Dimension` per contributor). An error
(§7.1.9) carries `ErrorMessage` instead. Neither returns `InternalCustomerId`.

0.1 Builder fills `${CUSTOMER_ID}`, `${POLICY_ID}`, `${RUN_TIMESTAMP}` and overrides or appends
    payload tags.
0.2 Parser reads risk, score, EDD flag and contributions.
0.3 Parser reads an error response.
0.4 A body without `ApplicationResponse` is rejected with a readable error.

## 1. Customer identifiers and nationality list (UNIQA-81, UNIQA-85)

Project `api`. File: `tests/api/uniqa-customer-ids.spec.ts`.

1.1 OB REST message with `InternalCustomerId` ≠ `CustomerSourceUniqueId` → accepted: no
    `ErrorMessage`, the response names our customer and carries a `CDDRisk`.
1.2 OB REST message without `InternalCustomerId` → `InternalCustomerId` equals the
    `CustomerSourceUniqueId` written by the system. Checked through §4 DB read (the response does
    not expose the ID).
1.3 `NationalityCode` as comma list (`CN,DE`) → accepted. Stored in `nationality_code_list`, with
    the first code in `nationality_code` (DB read, §4).
1.4 Nationality Risk (spec §4.7.23, Personal, multivalue MAX over `CountryRisk`): `CN,DE`
    (60 / 30) → contribution uses the higher weight; `DE` alone → the lower one. Score information
    lists both countries (soft check).
1.5 UI negative (UNIQA-81 AC3): `InternalCustomerId` is not shown on EIM investigation screens.
    Customer found by `CustomerSourceUniqueId`; the ID field must be absent. File:
    `tests/ui/cdd/uniqa-customer-ids.spec.ts` (not started — needs customer-details locators).

The batch-bridge variant of UNIQA-81 (IFS, UNIQA-87) is not covered here; it needs the batch client.

## 2. Source of Funds multivalue (UNIQA-86)

Project `api`. File: `tests/api/uniqa-source-of-funds.spec.ts`.

Spec v1.3 still defines Source of Funds Risk as a single-value **Condition** scenario (§4.7.41) on
`CUSTOMERS.SOURCE_OF_FUNDS`. The multivalue behaviour below is what UNIQA-86 asks for; the spec has
to be updated before these cases can pass (finding F1).

2.1 Single code → contribution equals `RISK_WEIGHT` for that code × 10 %.
2.2 Comma-separated codes (`Returns from investments,Funds received as a loan`) → contribution is
    the MAX of the weights. The pair is chosen to fit the 50-character `SourceOfFunds` limit
    (finding F15). `test.fixme()` until F1 is resolved.
2.3 The test customer's org unit (`UQ_AUT`) has no rows → default lookup (`ORGUNIT_CODE = "SHA"`)
    is used. Covered by 2.1.
2.4 Score information text names the value (soft check).
2.5 Dimension is Customer.

Expected weights come from `info-lists.json` → `SourceOfFundsRisk`. Spec §7.10 codes are long
descriptions ("Regular income from employment"); the codes UNIQA sends must be confirmed against
the sheet.

## 3. Policies in a REST request (UNIQA-91, UNIQA-92)

Project `api`. File: `tests/api/uniqa-policies.spec.ts`.

Test policies use product source type `0017` (Insurance, product `AT017`), loaded on QA and not on
the PolicyTypeRisk list (`qa-products.json`, open question 6). The
baseline message has one policy, paid by the holder, on own account, by bank transfer through a
branch. Each case overrides only the fields it tests.

3.1 One policy → accepted. `CASH` / `ONLINE` / `WEALTH_TRANSFER` give Policy Payment Method,
    Sales Channel and Business Purpose contributions equal to their list weights × 50 %.
    Same test file: payor ≠ holder → Third Party Premium Payer Risk (`Y`);
    `OnOwnAccountFlag = N` → On Own Account Risk (`N`, UNIQA-93).
3.2 Two or more policies in one request → each processed (UNIQA-92). `test.fixme()`: the IFS v1.6
    `<txn>` is `xs:all` with one set of policy tags, so a second policy cannot be sent (finding F13).
3.3 Same customer and policy sent twice, single premium 1 000 then 30 000 → the second response
    scores the second value (Total Single Premium Payments Risk changes band).
3.4 Multivalue output: codes sent as `A,B` are stored as `A,B`. No `", "`, spaces inside a code
    survive (`TRIM` only). DB read (§4), `test.fixme()`.
3.5 Retention: `KeepFlag=Y` or `RetainPolicyDataFlag=Y` → row in `apps.cdd_policy_intra_day` with
    `expiry_timestamp` ≈ now + 24 h. Neither flag → no row. DB read (§4), `test.fixme()`.
3.6 Aggregations across two policies (spec §4.1.1), checked in the view (§4.2) and the score.
    `test.fixme()`: needs two policies per customer (F13) and §4.
    - `TotalOngoingPremium` = sum of annualised premiums (M ×12, Q ×4, S ×2, Y ×1).
    - `TotalSinglePremium` = sum of `TOTAL_SINGLE_PREMIUM_TD` over active policies.
    - `PolicyCount` = number of active policies.
    - `IsPremiumPayerThirdParty` = `Y` when payor name ≠ holder name on at least one policy.
    - `MaxSourceOfFundsAmountToSinglePremiumRatio` = MAX(`LAST_SINGLE_PREMIUM_AMOUNT` × 100 /
      `SOURCE_OF_FUNDS_AMOUNT`) over policies held by the customer with `SOURCE_OF_FUNDS_AMOUNT` > 0;
      a policy with amount 0 or null is skipped.
    - Multivalue policy fields (payment method, sales channel, business purpose, premium and benefit
      bank countries) → contribution is the MAX of the per-value weights.
3.7 Range boundaries (half-open `[LOW, HIGH)`): `TotalSinglePremiumToDate` on the first boundary
    of TotalSinglePremiumPaymentsRisk (25 000 → the 25 000 row, not the 0 row); single premium /
    source of funds ratio exactly 100 → the 100 row. `TotalOngoingPremium` is not covered: the
    RT message has no payment-frequency tag (finding F14).
3.8 `PolicyCount` = 1 (finding F4): with the spec ranges `0–1`, `2–3`, `4–9999` and `[LOW, HIGH)`
    lookup, no row matches. Expected per UNIQA intent: the "Single active life insurance policy"
    row. `test.fixme()` until the list or the comparison is fixed.

## 4. Database read access (UNIQA-91, UNIQA-85, UNIQA-81)

Approved: a read-only `DbClient` capability (SELECT only, no DDL/DML). It lives in
`src/capabilities/dbClient.ts`, is registered as a fixture (`db`, worker scope), and reads
`DB_*` values from config. `uniqa.env` has `DB_NAME`, `DB_USER` and `DB_PASSWORD`, but no host,
port or driver — `DB_ADMIN_URL` is the Adminer web UI, not a DB endpoint. Host and driver are a
prerequisite to confirm with Anna or Gert before this section can run.

4.1 `apps.cdd_policy_intra_day`: row exists for a retained policy; `is_deleted='N'`; expiry set.
4.2 Aggregation view (`apps.v_cdd_customer_policy_summary`) returns `TotalOngoingPremium`,
    `TotalSinglePremium`, `PolicyCount`, `LinkedPolicyTypes`, `IsPremiumPayerThirdParty`, bank
    countries and `SourceOfFunds*` for a known test customer (uniquely keyed).
4.3 Precedence in the view: intra-day row overrides `apps.policies` for the same
    `policy_source_unique_id`.
4.4 Score storage: per-contributor rows in `CDD_CUSTOMER_SCORE_CONTRIB` (`GROUP_NAME` = dimension)
    and group totals in `CDD_CUSTOMER_SCORE_GROUPS` (spec §2.4–§2.5).

## 5. Info lists and risk contributions (UNIQA-83, 90, 93, 94)

Project `chromium`, read-only: no list is changed by a test. File:
`tests/ui/cdd/uniqa-info-lists.spec.ts`. Locators in `src/ui/pages/InfoListsPage.ts` (new; the
screen is not in the repo yet). Lists are read through Shared List Management; contributors and
weights through Scenario Manager (spec §3). Not started: the screens have to be explored for
locators first.

5.1 LegalEntityTypes (UNIQA-90): the list holds the UNIQA expected codes. Spec §7.31 has
    `STANDARD_CORPORATION`, `NGO`, `NPO`, `NOMINEE_STRUCTURE`, `BEARER_SHARES`; the ticket expects
    no Y/N codes. Whether `NGO`/`NPO` stay is open (finding F6). Expected set:
    `info-lists.json` → `LegalEntityTypeRisk`.
5.2 OnOwnAccountRisk (UNIQA-93): each code and weight equals `info-lists.json` →
    `OnOwnAccountRisk` (`Y` = 0, `N` = 75; scenario §4.7.27: All, Behaviour, 50 %). Assert-only.
    The scored side is covered by §3.1.
5.3 Risk contributions (UNIQA-83): every contributor in `risk-contributors.json` exists, is enabled
    and has the expected data label, group and risk factor weight; dimension weights match §4.6.
    Assert-only. Where the spec table and the scenario detail disagree (finding F3), the sheet
    decides.
5.4 Weight upload (UNIQA-94), decided part: BusinessSegment descriptions longer than the field are
    truncated (decision: truncate). Test asserts that every stored description fits the field
    length and that the truncated value matches the sheet prefix.
    Still open, marked `test.fixme()` with the ticket reference:
    - LegalEntityType code too long (change code vs. extend table) — `STANDARD_CORPORATION` is
      20 characters
    - decimal weights (`55.01`) in SinglePremiumMisMatch, OngoingPremiumMismatch,
      EmploymentStatusOngoing (risk factor change); EmploymentStatusToOngoingPremiumMismatchRisk is a
      custom table (`CDD_LOOKUP_RANGE_EMPL_STATUS`, comment GP30), not a standard range list
    - TotalSinglePremiumPayments and BusinessSegment split per customer type ('Person' column).
      Sheet values (`total-single-premium-payments.json`): P 0 / 100k / 200k / 300k+ → 1 / 21 / 41 /
      71; C 0 / 50k / 100k / 500k+ → 1 / 21 / 41 / 71. Spec §7.24 still has one unsplit list
      (0 / 25k / 100k → 20 / 60 / 90). Once split, test P and C at 99 999, 100 000, 299 999,
      300 000 and C at 49 999, 50 000, 499 999, 500 000 (finding F10). §3.3 and §3.7 then switch to
      the sheet file.
    - GeographicRisk postal code ranges (varchar vs. numeric comparison); spec §7.15 rows use org
      units `EUR`/`NA`/`APAC`, not `SHA`

## 6. Risk model per org unit

Expected data: `test-data/uniqa/risk-model.json` (from *UQ - Risk Model - Level Mapping*). Nine org
units: `UQ_AUT` 1010, `UQ_HUN` 1011, `UQ_UKR` 1012, `UQ_BGR` 1013, `UQ_BIH` 1014, `UQ_HRV` 1015,
`UQ_POL` 1016, `UQ_MNE` 1017, `UQ_SRB` 1018. Levels and transitions are the same for customer
types P and C. These org-unit codes replace `SHA` as `OrgUnitCode` in RT test messages.

| Org units | Levels (low–high) | Review period (days) |
|---|---|---|
| AUT, HUN, POL | Low 0–20, Standard 20–40, Medium 40–70, High 70–100 | 360 / 360 / 360 / 180 |
| UKR | Low 0–20, Medium 21–60, High 61–99 | 360 / 360 / 90 |
| BGR | Low 0–20, Medium 20–80, High 80–100 | 360 / 270 / 180 |
| BIH, HRV, MNE, SRB | Low 0–40, Medium 41–80, High 81–100 | 360 / 270 / 180 |

EDD alert on initial score: High only, in every org unit.

6.1 Configuration (chromium, read-only, Risk Model Manager): for every org unit × customer type
    the levels, boundaries, review periods and transition flags equal `risk-model.json`.
    File: `tests/ui/cdd/uniqa-risk-model.spec.ts`. Not started (locators).
6.2 Level assignment (api, `tests/api/uniqa-risk-levels.spec.ts`): one org unit per distinct
    level set (AUT, UKR, BGR, BIH). A baseline customer is sent with `OverallScoreAdjustment` 0; for
    each level, customers at `low + 1` and `high` get adjustment = target − baseline score
    (Override, unweighted). Expect `CDDRiskScore` ≈ target and `CDDRisk` = the level.
6.3 Initial-score EDD: `EDDFlag` is `true` exactly on High (checked in 6.2). The CDD alert itself
    (domain *CDD - Customer Acceptance*) is not in the response.
6.4 Transitions (two messages per customer): rescore across a transition and assert alert /
    no alert from the matrix. `test.fixme()`: alerts are not in the response; needs §4 or a UI
    check. Priority rows — the ones that differ between org units:
    - HUN Standard → High: **no** alert (every other org unit alerts on → High; finding F12).
    - BGR High → High: **no** alert; BGR Low → Medium and Medium → Low: alert.
    - AUT Low → Medium and Medium → Low: alert; POL and HUN: no alert.
    Only one active CDD alert per customer (spec §6.1): a second alerting rescore updates the
    existing alert.
6.5 Gap scores (finding F11): with `low < score <= high`, UKR 21 and 61 and BIH 41 and 81 match no
    level. Each is sent once; the expected level is the next band up (Medium, High).
    `test.fixme()` until the boundaries are fixed.

## 7. Spec findings (to raise with Gert / Jakub)

Found while mapping the plan to spec v1.3 and IFS v1.6. Each one blocks or changes an expected
value above.

| # | Where | Finding | Impact |
|---|---|---|---|
| F1 | §4.7.41 | Source of Funds Risk is still a single-value Condition scenario. | UNIQA-86 not specified; §2.2 has no agreed expected result. |
| F2 | §4.1.1, §4.7.14, §4.7.18, §7.34, §7.36 | `TotalOngoingPremium` is now an **annual** sum, but Income-to-Ongoing divides it by **monthly** income, and both lists and score texts talk about "monthly premiums". Ratios are ~12× too high; employment-status thresholds (e.g. Employed 0–2000) read as monthly. | Every customer with ongoing premium may land in the 100 % band. §3.6 expected values depend on the answer. |
| F3 | §4.7 table vs §4.7.x | Weight / label mismatches: Adverse Media 5 % vs 10 %; Complex Structure 10 % vs 5 %; Disclosure 20 % vs 25 %; On Other Watch List 5 % vs 10 %; SIE Risk All vs Personal; Income-to-Ongoing Personal vs All. | §5.3 needs one source of truth (the sheet). `risk-contributors.json` follows the table. |
| F4 | §7.33 | PolicyCountRisk ranges `0–1`, `2–3`, `4–9999` with `[LOW, HIGH)` leave 1 and 3 unmatched. | Customers with 1 or 3 policies get no Policy Count contribution (§3.8). |
| F5 | §8.4 | `Fingerprint_Customer` still lists `SourceOfFundsAmount` (moved to policy level in v1.3) and does not list `OnOwnAccountFlag`. | Changing On Own Account in the batch feed does not trigger a rescore. |
| F6 | §7.31 | LegalEntityTypeRisk holds `NGO` / `NPO`; UNIQA-90 questions these codes. | §5.1 expected set open. |
| F7 | §4.7.39 | SIE Risk default branch tests `Customer.PEPFlag` instead of `SIEFlag`. | SIE contribution wrong when the org-unit row is missing. |
| F8 | §4.7.18 | Comments GP7/GP8: `ROUND` and the bracketed ratio are not accepted by Scenario Manager; reworked syntax (GP9) is not in the document. | Score information text in §3.6 cannot be asserted exactly yet. |
| F9 | §4.7.42 | Field is named SourceOfFunds-**to**-SinglePremium but computes premium ÷ source of funds. | Naming only; tests follow the formula. |
| F10 | Contributors sheet vs §7.24 | TotalSinglePremiumPayments: the sheet splits by customer type with weights 1/21/41/71; the spec has one list with 20/60/90. The sheet's `RANGE_HIGH` is inclusive (99 999 → 100 000), so a `[LOW, HIGH)` lookup leaves exactly 99 999, 199 999, … unmatched; the top row has no `RANGE_HIGH`. | §5.4 expected values; boundary premiums get no contribution. |
| F11 | Level mapping vs §5.1 | Lookup is `low < score <= high`, but UKR (21–60, 61–99) and BIH/HRV/MNE/SRB (41–80, 81–100) start the next band at high+1: scores 21, 61, 41 and 81 get no level. UKR High also stops at 99. | §6.5. |
| F12 | Level mapping vs §5.1, §5.2 | Spec order is Standard 0–20, Low 20–40; UNIQA order is Low 0–20, Standard 20–40. Transition matrices differ per org unit: HUN Standard → High raises no alert, BGR High → High raises no alert. | §6.4; confirm these are intended. |
| F13 | IFS §7.1.4 XSD | `<txn>` is `xs:all` with one set of flat policy tags (`PolicySourceUniqueID`, `PaymentMethod`, …); there is no `<Policies>` / `<Policy>` repeat. | UNIQA-92 cannot be sent as specified; §3.2 and §3.6 blocked. |
| F14 | IFS §7.1.4 vs spec §4.1.1 | The RT message has `TotalOngoingPremiumToDate` and `TotalOngoingPremium` but no payment frequency, while the spec annualises premiums by frequency (M ×12, Q ×4 …). | Which value scenarios use for a REST customer is unclear; TotalOngoingPremium boundaries not tested. |
| F15 | IFS XSD vs spec §7.10 | `SourceOfFunds` is limited to 50 characters, but SourceOfFundsRisk codes are long descriptions (up to 49 characters each). | A multivalue Source of Funds (UNIQA-86) can carry at most two short codes. |
| F16 | Spec §7 PolicyTypeRisk vs product data | PolicyTypeRisk (Customer Policy Types Risk, Product 100 %) holds bank account types `AT022`–`AT051`; the product codes in the batch data (`238`, `999`, …) and the IFS example (`0002`) are not in it. | Customer Policy Types Risk contributes nothing for real UNIQA products. |

## 8. Risk factor requests (all contributors)

Project `api`. File: `tests/api/uniqa-risk-factors.spec.ts`.

Source: UNIQA's Postman collections *XSD valid risk factor requests* (personal 46, corporate 37),
one OB application per risk factor, each with one connected party and one policy, org unit
`UQ_AUT`. Extracted to `test-data/uniqa/rt/rf/<customerType>/RFnn_<Factor>.xml`. The fixed customer,
connected-party and policy IDs (`CUST-UQ-POSTINO-0009xx`, `POL-UQ-*`), `Message/Id` and
`RunTimestamp` are replaced with `${CUSTOMER_ID}`, `${PARTY_ID}`, `${POLICY_ID}` and
`${RUN_TIMESTAMP}`, so every send is uniquely keyed. The collections' OAuth settings point at DEV
and are not used; sends go to QA with the `uniqa.env` client.

8.1 Each request whose factor matches one of the 47 UNIQA contributors (name compared ignoring
    case, spaces and hyphens) is accepted and returns that contributor with a score above 0.
8.2 Requests with no UNIQA contributor are only checked for acceptance (`CDDRisk` returned, no
    `ErrorMessage`): personal RF01 ActiveAMLAlert, RF03 BankruptcyRisk, RF12 IndividualCustomerScore,
    RF32 EmployeeRisk, RF42 RCARisk, RF43 RCATypeRisk; corporate RF01, RF03, RF12 and RF37
    OperationalHistoryRisk. Whether these OOTB factors should score for UNIQA is open question 9.

Expected weights are not asserted here; §1–§3 and §5 cover exact values for the factors in scope.

## Out of scope

- **UNIQA-80** (export for model validation): assessment only, no defined format.
- **UNIQA-82** (dummy epic) and **UNIQA-88**, **UNIQA-89** (Odrzucono / rejected).
- **UNIQA-84** (share SFTP credentials): operations task; credentials must never appear in tests.
- **UNIQA-87** (IFS for 81): needs the batch client; covered later with §1.3.
- **UNIQA-95** (Adminerevo allowlist): infrastructure, not a test target from the runner.
- **UNIQA-96** (ODD enrichment): needs the batch client (MinIO) and §4.

## Open questions

1. **REST access**: resolved 2 Nov 2026. QA REST is on the UI host (`nr-qa-uniqa.symphonyai.dev`);
   token and `processMessage` work. QA returns `objectGraph` as elements, not CDATA as in IFS §7.1.7;
   the parser accepts both.
2. **DB connection**: host, port and driver for the read-only `DbClient` (owner: Anna or Gert).
3. **Data files**: UNIQA risk-weights sheet (all tabs), LegalEntityType codes and Source of Funds
   codes (owner: Anna or Gert). `info-lists.json` holds Appendix A values, "TBC by UNIQA".
4. **Decimal weights and split weights (UNIQA-94)**: risk factor change needed; owner TBD.
5. **Spec findings F1–F16** (§7): owner Gert Pauwels / Jakub Szczubelek.
6. **Product code in RT tests**: QA's `PRODUCT_SOURCE_TYPE` holds only OOTB bank account types
   `0001`–`0039` (products `AT001`–`AT039`), no UNIQA insurance products; `238` and the collections'
   DEV codes fail data-integrity validation. Tests use `0017` (Insurance) and `0039` (on
   PolicyTypeRisk) from `qa-products.json`. Are UNIQA products to be loaded on QA before release?
7. **Active policy statuses**: which of the 18 codes in `POLICY_STATUS_20160108.txt` count as
   "active" for `PolicyCount` and `TotalSinglePremium` (§3.6)? Only `IN_FORCE` is clear.
8. **Batch column layout**: the sample feed has no header; IFS §6.7 / §6.9 define the columns.
   The UNIQA-shaped `*_EXTENDED.txt` feed (GS-delimited) on SharePoint is not in the repo yet.
9. **OOTB factors outside the UNIQA contributor list** (§8.2): ActiveAMLAlert, Bankruptcy,
   IndividualCustomerScore, Employee, RCA, RCA Type, Operational History are in the risk factor
   collections but not in detection spec §4.7. Disabled for UNIQA, or missing from the spec?
10. **QA enrichment (blocker, 2 Nov 2026)**: once the product code passes validation, every CDD
    application returns `ErrorMessage` "Enrichment service failed" — the 83 risk factor requests,
    the baseline template and a message with only the XSD-mandatory tags (no policy). Server-side;
    owner: QA environment / Services. No api spec can pass until it is fixed.

## Next steps

1. Once QA enrichment works (open question 10), run `npx playwright test --project=api tests/api/uniqa-*.spec.ts`
   and heal any contributor name or Info format differences in `tests/api/uniqaCdd.ts`.
2. Add `DbClient` (read-only) once the DB endpoint is known, register it in `tests/fixtures.ts`
   and lift the §1/§3 DB `fixme`s.
3. Explore Shared List Management, Scenario Manager and Risk Model Manager for locators, then
   implement §5 and §6.1 in `tests/ui/cdd/`, starting with §5.1 (read-only).
4. Replace Appendix A values in `info-lists.json` list by list as the UNIQA sheet arrives.
