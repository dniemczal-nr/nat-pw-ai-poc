# UNIQA Jira 69–72 — Test Plan

## Application Overview

Scope: the customer-screen changes deployed to UNIQA QA in October/November 2026.

- **UNIQA-69**: read-only field *Legal Entity Type* (`CUSTOMERS.LEGAL_ENTITY_TYPE`) in the Main
  KYC/CDD Risk Factors block of the customer summary, and on CDD/ODD Alert Details.
- **UNIQA-70, 71, 72**: three override flags in the CDD Risk section. Each one has a pop-up and a
  workflow action that writes `CUSTOMER_DYNAMIC`. While a flag is `Y`, its risk contributor scores 0.

The UI part (§1–§3) is implemented. The scoring part (§4) needs REST and is planned. See
"REST extension".

**Seed:** `tests/seed.spec.ts`. UI specs run in project `chromium` with the shared storageState.

**Environment:** UNIQA QA. The specs only write to customers created by NAT REST sends (key prefix
`NAT`), and each write restores its value. Reload Configuration and change-password flows are never
triggered (CLAUDE.md).

**Data:** `test-data/uniqa/ui-customers.json` lists the test customers and their expected Legal
Entity Type. Specs read the expected values from that file, never from literals.

## Reference documentation

- Jira UNIQA-69, 70, 71, 72: user story, acceptance criteria and the implementation summary comment
  (Anna Maria Rybacka-Kieruj, 29 Oct and 2 Nov 2026).
- Screens on QA: `EIM__PersonalCustomerSummary` (section `EIM_BiographicalSummaryNew`),
  `EIM__CorporateCustomerSummaryExtended` (section `EIM_CompanyOverviewNew`) and
  `CDD_Customer_Risk` (section `CDD_CustRiskHead`).

## Scope by ticket

| Ticket | Summary | Jira status (3 Nov) | Project | Plan |
|---|---|---|---|---|
| UNIQA-69 | Legal Entity Type on customer details and CDD Alert Details | Awaiting Merge | chromium | §1 |
| UNIQA-70 | Override Income-to-Ongoing Premium Mismatch (`A_UNIQA_CU_001`) | In Progress (Services) | chromium, api | §2, §3, §4 |
| UNIQA-71 | Override Source of Funds Amount-to-Single Premium Mismatch (`A_UNIQA_CU_002`) | In Progress (Services) | chromium, api | §2, §3, §4 |
| UNIQA-72 | Override Employment Status-to-Ongoing Premium Mismatch (`A_UNIQA_CU_003`) | In Progress (Services) | chromium, api | §2, §3, §4 |

All four are visible on QA even though Jira does not show them as done (finding D5).

## Implementation status

| Section | File | State |
|---|---|---|
| §1 | `tests/ui/customer/customer-cdd-fields.spec.ts` | 1.1–1.4 pass on QA. 1.5 is `fixme` (no CDD alert on QA). |
| §2 | same | 2.1, 2.2 pass for all three flags. 2.3 is `fixme` (D1, D2). |
| §3 | same | 3.1 passes for all three flags (writes, then restores No). |
| §4 | same | `fixme` stubs. Blocked on the CDD service (SRV-30025) and the scoring logic marked [TO CONFIRM]. |

Last run: 3 Nov 2026, 14 passed and 10 skipped (`fixme`), in two consecutive runs.

Page objects:
- `src/ui/pages/CustomerSearchPage.ts`: Back Office → Customers, search by Customer ID.
- `src/ui/pages/CustomerDetailsPage.ts`: summary fields, CDD Risk tab and override pop-ups.

Both are registered in `tests/fixtures.ts` as `customerSearch` and `customerDetails`.

## Execution constraints

**One worker per file.** Parallel workers share one NetReveal session, and the server keeps the
Customer search form in that session. A search in one worker overwrote the results in another. The
spec therefore runs with `test.describe.configure({ mode: 'default' })` at file level: in order, on
one worker. `serial` is not used, so one failure does not skip the rest.

**Entity locks.** Opening a customer takes an optimistic entity lock (CFG-80017, "The Customer entity
with id … has been locked by user 'admin'"). Only toolbar navigation releases it (`clearLocks=true`).
A test that just closes the browser leaves the lock in place. The next session can still view the
customer, but its override pop-ups are disabled: flag, comment and Save.
- `afterEach` calls `customerDetails.leave()`, which clicks the toolbar Home button to release the lock.
- `openOverridePopup` asserts that the flag is enabled, with a message that points to the lock.
- Recovery: Administration → Operations → Lock Manager. Delete only the locks on `NAT…` customers
  held by the test user, never anyone else's.

**Intermittent system error.** One of about ten loads of the CDD Risk tab returned `CBP-10200 –
System Error`. A reload worked. No retry is built in. If it recurs, raise it with Services (finding D6).

## 1. Legal Entity Type (UNIQA-69)

Customer summary → Main KYC/CDD Risk Factors.

1.1 A corporate customer shows the caption "Legal Entity Type". Its value equals the
    `LegalEntityType` sent by REST, which is `ui-customers.json` → `corporate.legalEntityType`.
1.2 The field sits directly after "Next Review Date": the next caption in screen order.
1.3 The field is read-only. The value has class `ab-read-only`, and the field span holds no
    editable control.
1.4 A customer without a Legal Entity Type does not show the field (`hideBlankFields=true`). Next
    Review Date is still shown.
1.5 CDD/ODD Alert Details (`CDD_AlertSubjectDetails`) shows `UNIQA_AlertSubjectLegalEntityType`
    after the CDD risk factor block, with the caption "Legal Entity Type". `fixme`: QA has no alerts
    (All Alerts returns no CDD, CDD – Customer Acceptance or CDD – ODD alert). Needs an alert for a
    corporate customer. See §4.

Not automated: "styling matches existing KYC/CDD fields (with info icon)". On QA the field has no
icon, and neither do Bankrupt or Next Review Date on the personal screen. See open question 2.

## 2. Override fields and pop-ups (UNIQA-70, 71, 72)

Customer → CDD Risk tab → section `CDD_CustRiskHead`, row 2. Personal test customer.

| Flag | Field | Pop-up section | Combo datafield | Save button |
|---|---|---|---|---|
| UNIQA-70 | `UNIQA_CDD_Overr_Inc_Ong` | `UNIQA_CDD_Overr_Inc_OngFlag` | `OVRD_INC_ONG_MSMT_FLG` | `UNIQA_Overr_Inc_OngFlag_Save` |
| UNIQA-71 | `UNIQA_CDD_Overr_SourceOfFunds` | `UNIQA_CDD_OVERR_SourceOfFundsFlag` | `OVERR_SOF_FLAG` | `UNIQA_OverrSOFFlag_Save` |
| UNIQA-72 | `UNIQA_CDD_Overr_EmploymentStatus` | `UNIQA_CDD_Overr_EmplToOngoingPopUp` | `OVERR_EMPL_STATUS_FLAG` | `UNIQA_EmplStatusFlag_Save` |

2.1 The field shows its caption and a value of Yes or No.
2.2 Clicking the field opens the pop-up. The combo is labelled with the field caption, offers No and
    Yes, and is pre-filled with the current value. The comment field is editable. Cancel closes the
    pop-up and leaves the value unchanged.
2.3 The pop-up shows no resource keys, and the Save button reads "Save". `fixme`: D1, D2.

## 3. Override round trip (UNIQA-70, 71, 72)

Writes to the database. Only on a `NAT…` customer; the spec asserts the prefix before writing.

3.1 Set the flag to Yes with a comment. The field shows Yes, and reopening the pop-up shows Yes
    pre-filled. Then set it back to No (in `finally`), and the field shows No.

Each save also writes a Customer audit entry with the comment ("NAT automated test UNIQA-7x: …") and
sets `NEED_RESCORE_FLAG = 'Y'`. These side effects stay behind; they cannot be undone through the UI.

Not automated yet: the audit entry in Customer → Audit Log (AC "audited"). It needs Audit Log
locators.

## 4. Override effect on the risk score (UNIQA-70, 71, 72) — REST extension

AC: while the flag is Y, the contributor contributes 0; while it is N, the contributor is scored
normally.

| Flag | Contributor (`risk-contributors.json`) | RF request that scores it |
|---|---|---|
| UNIQA-70 | Income-to-Ongoing Premium Mismatch Risk | `rt/rf/*/RF11_IncometoOngoingPremiumMismatchRisk.xml` |
| UNIQA-71 | Source of Funds Amount-to-Single Premium Mismatch Risk (4.8.46) | `rt/rf/*/RF23_SourceofFundsAmounttoSinglePremiumMismatchRisk.xml` |
| UNIQA-72 | Employment Status-to-Ongoing Premium Mismatch Risk (4.8.47) | `rt/rf/personal/RF34_EmploymentStatustoOngoingPremiumMismatchRisk.xml` |

Planned flow per flag:
1. **REST** (`api`): send the RF request with a new `NAT…` key and assert that the contributor
   scores more than 0 (as in `uniqa-risk-factors.spec.ts`).
2. **UI** (`chromium`): open that customer and set the override to Yes (§3 page object).
3. Rescore: use the **Rescore** button in Customer CDD Risk History, or a second REST send for the
   same customer. Open question 3 decides which.
4. Assert the contributor is 0. Read it from Score Contributions on the CDD Risk tab, or from the
   REST response. Then set the override to No, rescore, and assert the contributor is above 0 again.

4.1 `<contributor>` is 0 while overridden. `fixme`.
4.2 `<contributor>` is scored normally when not overridden. `fixme`.

Blocked by:
- The CDD service does not answer: every `processMessage` times out with SRV-30025 (3 Nov 2026).
- The Jira implementation comments mark the scoring change and the new DB columns as [TO CONFIRM].
- Steps 1 and 2 cross projects (`api` → `chromium`). Either the REST send moves into the UI spec
  through the `rt` worker fixture, or a key is handed from one project to the other. Prefer the
  `rt` fixture: it is already available to every project.

The same REST step replaces `ui-customers.json`. Creating a corporate customer with a known
`LegalEntityType`, and a personal one with none, removes the dependency on customers from 2 Nov.
Creating a CDD alert for a corporate customer (risk level with `generateAlert`) would unblock 1.5.

## 5. Findings (to raise with Services)

| # | Where | Finding | Effect |
|---|---|---|---|
| D1 | All three override pop-ups | The comment label shows the resource key `field.UNIQA_CDD_CommentChangeStatus.caption`: the caption is missing from `messages.properties`. | 2.3 `fixme` |
| D2 | UNIQA-70 pop-up | The Save button shows `button.UNIQA_Overr_Inc_OngFlag_Save.caption`, and its tooltip `…tooltip`. The 71 and 72 pop-ups show "Save". | 2.3 `fixme`; the spec finds Save by id |
| D3 | CDD Risk section | The UNIQA-70 value has class `ab-read-only`; 71 and 72 have `ab-control`. The pop-ups behave the same; the AC asks for matching styling. | Not asserted. Confirm intent. |
| D4 | UNIQA-69 Jira comment | The Alert Details caption is cut off at `…caption=Lega`. Cannot be checked on QA without an alert. | Check with 1.5 |
| D5 | Jira | UNIQA-69 is "Awaiting Merge" and 70–72 are "In Progress (Services)", yet all four are on QA. | Confirm the build on QA is the release candidate. |
| D6 | CDD Risk tab | One of about ten loads returned `CBP-10200 – System Error`. | Watch |
| D7 | Customer screens | Closing the browser leaves an entity lock, and later sessions then get disabled pop-ups. This is standard NetReveal behaviour, but investigators who close tabs will see it too. | Constraint above |

UNIQA-70's Jira text names the field "Override Ongoing-Premium-Mismatch". The screen and the
implementation say "Override Income-to-Ongoing Premium Mismatch", and the spec follows the screen.

## Open questions

1. Is the scoring change (contributor = 0 while the flag is Y) deployed? Jira says [TO CONFIRM], with
   no sequence or rule name.
2. UNIQA-69 AC "with info icon": which icon is meant? No KYC field near it shows one.
3. How is a customer rescored after an override on QA: the Rescore button, a batch job, or the next
   REST application? And does the rescore run through the CDD service (and fail while it is down)?
4. Should the comment be mandatory in the override pop-ups? Whether Save accepts an empty comment has
   not been tested.

## Out of scope

- CDD/ODD Alert Details layout beyond the Legal Entity Type field.
- DB checks of `CUSTOMER_DYNAMIC.OVERRIDE_*_FLAG`. DB access is blocked (see
  `specs/uniqa-jira-80-96.md` §4).

## Next steps

1. Raise D1, D2 and D5 with Services before Thursday's release.
2. Once the CDD service answers: add the REST step (§4), replace `ui-customers.json` with
   REST-created customers, and implement 4.1 and 4.2.
3. Get a CDD alert on QA, then implement 1.5.
4. Add the audit-entry check to 3.1.
