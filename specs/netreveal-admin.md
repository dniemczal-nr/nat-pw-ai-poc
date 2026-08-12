# NetReveal Admin Shell — Test Plan

## Application Overview

NetReveal admin UI is the authenticated shell used by operations users after login.
This plan covers **admin shell chrome** and **logout** for an already authenticated
admin session.

**Seed:** `tests/seed.spec.ts`

**Session model:**
- Auth is established once by `tests/auth.setup.ts` → `.auth/user.json` (`storageState`).
- Seed and scenarios in this plan **must not** re-login unless the scenario explicitly
  verifies login/logout boundaries.
- Credentials stay in config / ENV (`userDataAdminUsername`, `userDataAdminPassword`).
  Do **not** hardcode passwords in plans or generated specs.

**Implementation conventions (for Generator):**
- Import `test` / `expect` from `tests/fixtures.ts` (not raw `@playwright/test`).
- Prefer fixtures / capabilities / POM:
  - `shellHeader` → `src/ui/pages/ShellHeaderPage.js`
  - `netRevealAuth` → `src/capabilities/netRevealAuthCapability.js`
  - `homePage` → `src/ui/pages/HomePage.js`
  - `adminAuth` → `src/capabilities/adminAuthCapability.js`
- Put new locators in `src/ui/pages/*.js` (or a new page object). Do **not** duplicate
  CSS selectors in the spec.
- Prefer role / label / `data-testid` when available; otherwise extend existing POM
  selectors (`#menu_0`, `[id="menu_0.li0"]`, `#cbp_logout`, header Home span).
- Do not weaken business oracles (header visible, login page after logout).
- Do not rewrite secrets in `config/*.properties`.

**Suggested output paths (Generator):**
- `tests/ui/admin-shell-header.spec.ts`
- `tests/ui/admin-logout.spec.ts`

**Explicitly deferred — Change password:**
- Do **not** generate or run change-password specs in this iteration.
- Shared **QA admin** password must stay stable; mutating it is out of scope.
- If a change-password scenario appears later, mark it `test.skip` for QA admin
  (reason: shared admin credential) until a dedicated lab user exists.

---

## Test Scenarios

### 1. Authenticated admin shell

**Seed:** `tests/seed.spec.ts`

Assumptions:
- Chromium project depends on `setup` and loads `storageState` from `.auth/user.json`.
- Starting URL is the resolved NetReveal base URL (`ui.baseUrl` / `resolveBaseUrl()`).

#### 1.1 Shell header and user menu are visible

**Steps:**
1. Navigate to the NetReveal application base URL (same entry as seed).
2. Wait for the authenticated admin shell to finish loading.
3. Assert the admin shell user menu container is visible (user is logged in).
4. Assert the Home header label in the shell is visible.

**Expected Results:**
- User menu (shell header) is visible — session from `storageState` is valid.
- Home header text/span is visible in the page header.
- No redirect to the login page occurs.

**POM / capability hints:**
- `shellHeader.isUserMenuVisible()`
- `homePage.isHomeHeaderAvailable()` / fixture `homePage`
- Do not call `loginAs` / `loginAsAdmin` in this scenario.

#### 1.2 User menu opens and exposes logout

**Steps:**
1. Start from the authenticated shell (same as 1.1).
2. Open the user menu from the shell header.
3. Inspect available account actions in the open menu.

**Expected Results:**
- User menu opens without error.
- Logout action is present in the menu.
- Menu remains usable (items clickable / visible).
- Do **not** open or exercise Change password for QA admin.

**POM / capability hints:**
- Extend `ShellHeaderPage` with `openUserMenu()` if missing; keep selectors in POM.
- Known NAT-oriented anchors: user menu trigger `[id="menu_0.li0"]`, logout `#cbp_logout`.

---

### 2. Logout from admin shell

**Seed:** `tests/seed.spec.ts`

Assumptions:
- Session starts authenticated via `storageState`.
- After logout, the login page is shown and protected shell chrome is gone.

#### 2.1 Admin can log out successfully

**Steps:**
1. Navigate to the NetReveal application base URL as an authenticated admin.
2. Confirm the shell user menu is visible (precondition).
3. Open the user menu.
4. Click Logout.
5. Wait for navigation / UI to settle on the login page.

**Expected Results:**
- User is redirected (or lands) on the NetReveal login page.
- Login form submit control is visible and identified as Login.
- Authenticated shell user menu is no longer available as a logged-in session.

**POM / capability hints:**
- Prefer `netRevealAuth.logout()` then `netRevealAuth.assertOnLoginPage()`,
  or `shellHeader.logout()` + `LoginPage.assertOnLoginPage()`.
- Align with existing coverage in `tests/ui/check-login.spec.ts`, but this scenario
  starts from `storageState` (no fresh login) unless Generator must clear state for
  isolation after logout side effects.

#### 2.2 Logged-out user cannot see admin shell chrome

**Steps:**
1. Perform logout as in 2.1.
2. Attempt to open / observe the previous admin shell URL or header area.
3. Assert login page remains the effective gate.

**Expected Results:**
- Shell user menu for an authenticated session is not visible.
- Login page remains presented (or unauthenticated users are sent back to login).
- No authenticated Home header state remains from the previous session.

**Notes:**
- Keep assertions business-level (login visible / shell absent). Do not assert on
  ephemeral toast copy unless it is a stable product oracle.

---

## Out of scope

- **Change password** for shared QA admin — skip / do not implement now.
- Fresh login happy-path already covered by `tests/ui/admin-login.spec.ts` and
  `tests/ui/check-login.spec.ts` (those clear `storageState` on purpose).
- SSH / batch flows (`@SSH` / Cucumber) — unchanged.
- SAML / IdP edge cases beyond what `auth.setup` already establishes for QA.

## Traceability

| Scenario | Suggested spec file | Primary POM / capability |
|---|---|---|
| 1.1 Shell header visible | `tests/ui/admin-shell-header.spec.ts` | `shellHeader`, `homePage` |
| 1.2 User menu + logout item | `tests/ui/admin-shell-header.spec.ts` | `ShellHeaderPage` |
| 2.1 Logout | `tests/ui/admin-logout.spec.ts` | `netRevealAuth` / `shellHeader` |
| 2.2 Post-logout gate | `tests/ui/admin-logout.spec.ts` | `LoginPage`, `shellHeader` |
| Change password | — (deferred / `test.skip` for QA admin) | — |
