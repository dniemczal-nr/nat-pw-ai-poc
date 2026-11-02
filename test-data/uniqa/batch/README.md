# UNIQA sample batch files (`*_20160108.txt`)

Source: UNIQA project SharePoint. Pipe-delimited, no header row, UTF-8. Stored verbatim (trailing
spaces included) — do not reformat.

These are the generic NetReveal insurance sample feed (`norkom.com` contacts, 2016 dates), not a
UNIQA extract. Column layout is not documented here; map columns against the batch IFS before
relying on a position.

| File | Rows | Fields | Content |
|---|---|---|---|
| `CUSTOMERS_20160108.txt` | 21 | 115 | `CUST_INS01_1` … `CUST_INS31_1` (gaps 17–20, 23, 26–30), all segment `PERS`, category `INSURANCE` |
| `POLICIES_20160108.txt` | 21 | 39 | One policy per customer (`POL_INSnn_1`), all `IN_FORCE`, branch `422180`, product `238` except `POL_INS31_1` → `999` |
| `CUSTOMER_POLICY_LINK_20160108.txt` | 21 | 7 | Policy → customer, role `POL_HOLDER` only |
| `BRANCH_20160108.txt` | 20 | 27 | Branches; channel codes `DIRECT`, `ONLINE`, `CALLCENTER` |
| `PRODUCT_20160108.txt` | 12 | 5 | Product code, name, description, class (`LIFE` / `P&C`) |
| `PRODUCT_SOURCE_TYPE_20160108.txt` | 12 | 3 | Product → source type (identity mapping) |
| `POLICY_STATUS_20160108.txt` | 18 | 2 | Policy status codes (`IN_FORCE`, `PAID_UP`, `SURRENDERED`, …) |
| `CUSTOMER_CATEGORY_20160108.txt` | 1 | 2 | `INSURANCE` |

## Edge cases already in the data

- `CUST_INS16_1`: customer type `C` while segment is `PERS`, plus an extra `Y` flag.
- `CUST_INS16/21/22/24/25/31_1`: country `JE` (Jersey) in a field empty for the others.
- `CUST_INS13_1`: date of birth 1933 (age-based factors).
- `CUST_INS08_1` / `POL_INS08_1`: `RAFAëLE` — lower-case `ë` inside an upper-case name.
- `CUST_INS24/25/31_1`: mixed-case names (`Gadson Eugene`).
- `POL_INS14_1`, `POL_INS15/16/21/22/24/25/31_1`: later policy dates (2016) than the rest (2007).
- `BRANCH`: trailing spaces in codes (`ONLINE ` vs `ONLINE`, `Casino/Card club `) — `TRIM` check.
- `BRANCH` `973020` / `974540`: same address and contact, different branch.

## Gaps for the test plan

- No customer holds more than one policy; no third-party payor; no `C` (corporate) segment.
  Multi-policy aggregation and `IsPremiumPayerThirdParty` cases must be built as RT messages.
- No UNIQA org units (`1010`–`1018`), no v1.3 fields (`InternalCustomerId`,
  `nationality_code_list`, `SourceOfFundsAmount`, `KeepFlag`).
- Keys are fixed (`CUST_INS01_1`). Anything sent to shared QA must re-key them with `${RUN_ID}`.
