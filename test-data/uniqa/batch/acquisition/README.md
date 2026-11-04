# Acquisition feed row templates (project `batch`)

One feed row per file, GS-delimited (`0x1D`), no newline — IFS §6.7 layout: the 119 numbered
fields. The unnumbered `INTERNAL_CUSTOMER_ID` row after field 119 is not in the templates; the spec
appends it as column 120 where a case needs it (UNIQA-81).

| File | Source | Placeholders (IFS field) |
|---|---|---|
| `CUSTOMERS_CORPORATE.txt` | UNIQA QA, envelope 20200609 (Anna, 4 Nov 2026): a corporate `UQ_BGR` row known to load | `${RUN_TIMESTAMP}` (1), `${CUSTOMER_ID}` (2 `CUSTOMER_SOURCE_UNIQUE_ID`), `${CUSTOMER_REF_ID}` (4 `CUSTOMER_SOURCE_REF_ID`), `${CUSTOMER_NAME}` (10), `${NATIONALITY_CODE}` (28) |
| `CUSTOMERS_PERSONAL.txt` | Derived from `CUSTOMERS_CORPORATE.txt`: `CUSTOMER_TYPE_CODE` (40) `P`, segments (42–44) `PERS`, the Corporate fields of IFS v2.0 (11–18) emptied | same |

Every other field is sent as in the source row. Re-key every row with a `NAT…` ID: the envelope
lands on the shared QA environment.
