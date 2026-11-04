# Acquisition feed row templates (project `batch`)

One feed row per file, GS-delimited (`0x1D`), no newline — IFS v1.6 §6.7 layout.

| File | Source | Placeholders (IFS field) |
|---|---|---|
| `CUSTOMERS_CORPORATE.txt` | UNIQA QA, envelope 20200609 (Anna, 4 Nov 2026): a corporate `UQ_BGR` row known to load | `${RUN_TIMESTAMP}` (1), `${CUSTOMER_ID}` (2 `CUSTOMER_SOURCE_UNIQUE_ID`), `${CUSTOMER_REF_ID}` (4 `CUSTOMER_SOURCE_REF_ID`), `${CUSTOMER_NAME}` (10), `${NATIONALITY_CODE}` (28) |

Every other field is sent as in the source row. Re-key every row with a `NAT…` ID: the envelope
lands on the shared QA environment.
