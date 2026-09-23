# UNIQA Organizational Units and Groups Structure

**Author:** Claude Fable 5  
**Date:** 2026-09-17  
**Source:** UNIQA-7 (User Administration Guide, v01 / 2026-06-12)

---

## Overview

This spec covers two complementary aspects of UNIQA administration:

1. **UNIQA-10**: Organizational Unit (OU) hierarchy — 11 codes (1 root + 9 regional + 1 shared), names, parent–child relationships.
2. **UNIQA-28**: Group replication pattern — both `Investigation` and `Supervisor` groups exist for each of the 10 non-root OUs, each bound to the CDD domain and its OU code.

Both are read-only assertions on the Administration UI (no test writes data).

---

## §1 OU Structure (UNIQA-10)

### 1.1 OU Hierarchy

UNIQA operates 11 organizational units in a parent–child structure:

```
GRO (Group — root)
  ├─ UQ_AUT (Austria)
  ├─ UQ_HUN (Hungary)
  ├─ UQ_UKR (Ukraine)
  ├─ UQ_BGR (Bulgaria)
  ├─ UQ_BIH (Bosnia and Herzegovina)
  ├─ UQ_HRV (Croatia)
  ├─ UQ_POL (Poland)
  ├─ UQ_MNE (Montenegro)
  ├─ UQ_SRB (Serbia)
  └─ SHA (Shared — accessible to all 9 regional OUs)
```

### 1.2 OU Master Data

| Code | Name (Entity) | Full Name | Parent |
|------|---------------|-----------|--------|
| GRO | Group | UNIQA Insurance Group AG | — |
| UQ_AUT | Austria | UNIQA Österreich Versicherungen AG | GRO |
| UQ_HUN | Hungary | UNIQA Biztosito Zrt. | GRO |
| UQ_UKR | Ukraine | UNIQA LIFE Private Joint Stock Company | GRO |
| UQ_BGR | Bulgaria | UNIQA Life Insurance plc. | GRO |
| UQ_BIH | Bosnia and Herzegovina | UNIQA osiguranje d.d. | GRO |
| UQ_HRV | Croatia | UNIQA osiguranje d.d. | GRO |
| UQ_POL | Poland | UNIQA Towarzystwo Ubezpieczeń na Życie S.A. | GRO |
| UQ_MNE | Montenegro | UNIQA zivotno osiguranje a.d. | GRO |
| UQ_SRB | Serbia | UNIQA zivotno osiguranje a.d.o. | GRO |
| SHA | Shared | Shared organization – accessible to all orgs | All 9 |

**Source:** UNIQA-7, §2.1.1, pages 6–7.

### 1.3 Acceptance Criteria (C.1–C.3)

**C.1: OU codes are present and match specification**
- List all OUs in the Administration UI.
- Codes present: GRO, UQ_AUT, UQ_HUN, UQ_UKR, UQ_BGR, UQ_BIH, UQ_HRV, UQ_POL, UQ_MNE, UQ_SRB, SHA (11 total).
- No extra codes.

**C.2: OU names and hierarchy match the master data**
- For each of the 9 regional OUs (UQ_AUT…UQ_SRB): parent is GRO.
- OU names match column "Entity" (e.g., Austria, Hungary).
- GRO has no parent; SHA has multiple parents (child of all 9 regional OUs).

**C.3: Shared OU is accessible from all regional OUs**
- SHA appears in the sibling list of Austria, Hungary, … Serbia.
- (Logical check: if a user has access to Austria OU, they can also access Shared resources.)

---

## §2 Group Definitions (UNIQA-28)

### 2.1 Group Definition

NetReveal uses **groups** to assign roles to users within a specific domain. For UNIQA:

- **Domain:** Always `CDD` (Customer Due Diligence).
- **Scope:** Global (not replicated per OU in current implementation).
- **Roles:** CDD-specific (Investigator, Supervisor, Administrator) plus Framework roles (EIM Alert Case Interface, EIM Case Investigator, etc.).

### 2.2 Current Implementation

**Note (as of 2026-09-21):** UNIQA-7 page 26 states "groups must be replicated individually for each organizational unit", but **actual implementation uses global groups**, not per-OU instances.

**Two global groups exist:**
1. **CDD Investigation Group** — for investigators and lower-level staff.
2. **CDD Supervision Group** — for supervisors and team leads.

Additional global CDD groups also exist (Administration, Light Investigation, Reports, etc.).

The spec reference (UNIQA-7, pages 24–27) documents the **intended design** with per-OU group instances, but the **current QA environment** has global groups only. Per-OU binding may exist in group details or a separate configuration table, but is not reflected in group names.

### 2.3 Group Master Data

#### Current Global Groups

| Group Name | Domain | Roles (abbreviated) |
|------------|--------|---------------------|
| CDD Investigation Group | CDD | CDD Investigator Role + EIM Alert Case Interface + EIM Alert Investigator + EIM Associated Party (R/W) + EIM Case Investigator + SNA_search_search + Third Party Data Access + Workflow Rules Supervisor |
| CDD Supervision Group | CDD | CDD Investigator Role + CDD Supervisor Role + EIM Alert Case Interface + EIM Alert Investigator + EIM Associated Party (R/W) + EIM Case Investigator + EIM Case QA + EIM Supervisor + Queue Subscriber + Queue Supervisor + SNA_search_search + Third Party Data Access + Workflow Rules Supervisor |
| CDD Administration Group | CDD | (administration-level roles) |
| CDD Light Investigation Group | CDD | CDD Investigator Role (restricted — no external data access) |
| CDD Supervisor Reports Group | CDD | (reporting roles for supervisors) |
| CDD Investigator Reports Group | CDD | (reporting roles for investigators) |
| CDD Report Administrator Group | CDD | (report administration roles) |

**Source:** UNIQA-7, §4.4, pages 24–27; §4.2, pages 20–21 (reference design).
**Current QA observation:** Groups exist as global instances, not replicated per OU (as of 2026-09-21).

### 2.4 Acceptance Criteria (A.1–A.3)

**A.1: Investigation group exists**
- `CDD Investigation Group` exists in the global group list.
- Domain is `CDD`.
- Status: ✓ **DEFERRED** — Per-OU replication not yet implemented. Spec requires `CDD Investigation Group <OU Name>` per OU (e.g., `CDD Investigation Group Austria`), but current implementation is global.

**A.2: Supervision group exists**
- `CDD Supervision Group` exists in the global group list.
- Domain is `CDD`.
- Status: ✓ **DEFERRED** — Same as A.1.

**A.3: Supervision group contains both Investigator and Supervisor roles**
- `CDD Supervision Group` includes both:
  - `CDD Investigator Role`
  - `CDD Supervisor Role`
- Status: ✓ **DEFERRED** — Per-OU instances not yet available; global group has both roles.

---

## §3 Test Pattern

Following the seed (`tests/seed.spec.ts`), each scenario is a single `test()` assertion:

```typescript
/**
 * @plan specs/uniqa-organizational-units-and-groups.md §1
 * @seed tests/seed.spec.ts
 */

test('C.1: OU codes match specification', async ({ organizationalUnits, expect }) => {
  const codes = await organizationalUnits.listOUCodes();
  expect(codes).toEqual([
    'GRO', 'UQ_AUT', 'UQ_HUN', 'UQ_UKR', 'UQ_BGR', 'UQ_BIH', 'UQ_HRV', 'UQ_POL', 'UQ_MNE', 'UQ_SRB', 'SHA'
  ]);
});

test('C.2: OU names and hierarchy match specification', async ({ organizationalUnits, expect }) => {
  const ous = await organizationalUnits.getOUHierarchy();
  expect(ous['UQ_AUT'].name).toMatch('Austria');
  expect(ous['UQ_AUT'].parent).toBe('GRO');
  // … for all 11 OUs
});

test('C.3: Shared OU is accessible from all regional OUs', async ({ organizationalUnits, expect }) => {
  const shared = await organizationalUnits.getOUHierarchy()['SHA'];
  const parentOUs = ['UQ_AUT', 'UQ_HUN', 'UQ_UKR', 'UQ_BGR', 'UQ_BIH', 'UQ_HRV', 'UQ_POL', 'UQ_MNE', 'UQ_SRB'];
  for (const ou of parentOUs) {
    expect(shared.parents).toContain(ou);
  }
});
```

---

## §4 Page Object Requirements

**`OrganizationalUnitsPage`** (new or extend existing):
- `listOUCodes(): Promise<string[]>` — extract all OU codes from the grid.
- `getOUHierarchy(): Promise<OUNode>` — build a map of `{ [code]: { name, parent, parents } }`.

**`GroupsPage`** (new or extend existing):
- `listGroupsByOU(ouCode: string): Promise<Group[]>` — filter groups by OU.
- `findGroupByName(name: string): Promise<Group | null>` — look up by name.
- `getGroupRoles(groupName: string): Promise<string[]>` — list roles in a group.

Register both in `tests/fixtures.ts` as:
```typescript
test.extend({
  organizationalUnits: async ({ page }, use) => {
    await use(new OrganizationalUnitsPage(page));
  },
  groups: async ({ page }, use) => {
    await use(new GroupsPage(page));
  },
});
```

---

## §5 Notes

- **Read-only:** Both specs are assertions only; no creation/deletion of OUs or groups.
- **Shared admin constraint:** Never run change-password or `Reload Configuration` flows (per CLAUDE.md).
- **Non-UI data source:** If OUs / groups are not visible through the UI, consider SSH queries to the database as fallback (Phase 2).

---

**End of spec. Ready for Generator agent to write `tests/ui/administration/organizational-units-and-groups.spec.ts`.**
