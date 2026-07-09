# jsFramework

NodeJS + Cucumber test framework (Phase 1 scaffold)

## Prerequisites

- Node.js (LTS recommended)
- npm
- Access to the target SSH host (e.g. `batch.qa2.reyl.fs.caws.local`)
- Private key file for SSH (e.g. `config/PRJ-ISP-Key.ppk` or converted OpenSSH key)

## Installation

From the project root:

```bash
npm install
```

This installs:

- `@cucumber/cucumber` for BDD
- `properties-reader` for config
- `ssh2` for SSH capability

## Configuration

Configuration is properties-based with ENV overrides.

### Environments

Properties files live under `config/`:

- `config/default.properties`
- `config/dev.properties`
- `config/stage.properties`
- `config/prod.properties`
- `config/qa.properties`

Phase 2 uses a single baseline configuration (`config/default.properties`) and overlays environment-specific values from shell ENV variables.

The primary environment selector for BEAST-style setups is:

- `APPLICATION_ENVIRONMENT` (e.g. `QA1`)

Resolution order:

1. `config/default.properties` (baseline)
2. `process.env` overrides matching keys
3. `APPLICATION_ENVIRONMENT` is explicitly mapped to the `application.environment` property

Example BEAST-related properties in `config/default.properties`:

```properties
########## ENVIRONMENTS ##########
ProjectName=BEAST

######## Common ########
application.port=24200
application.environment=dev
application.hostname=ui-lb.${application.environment}.reyl.fs.caws.local
kafkaRestUrl=http://kafka.hub.reyl.fs.caws.local:8082/v3/clusters/MkU3OEVBNTcwNTJENDM2Qk/topics/${application.environment}_nr-applications/records

######## Database ########
DbConnectionString=jdbc:oracle:thin:@db.reyl.fs.caws.local:1521/ORA190DV
DbUsername=REYL_${application.environment}
DbPassword=${DB_PASSWORD}
DbDriverName=oracle.jdbc.driver.OracleDriver

########## USER_DATA ##########
userDataAdminPassword=${USERDATA_ADMIN_PASSWORD}
userDataDefaultPassword=${USERDATA_DEFAULT_PASSWORD}
userDataPassword1=${USERDATA_PASSWORD1}
```

At runtime, you can override `application.environment` by setting `APPLICATION_ENVIRONMENT` in the shell. The config loader maps `APPLICATION_ENVIRONMENT` directly to the `application.environment` key.

### QA SSH configuration example

`config/qa.properties` includes SSH settings for the batch QA host (legacy Phase 1 example):

```properties
# Phase 1 scaffold - QA environment overrides

# Application URLs
app.baseUrl=https://ui-lb.qa1.reyl.fs.caws.local:24200/
api.baseUrl=https://api.qa.myapp.local/

# Auth (password comes from process.env.AUTH_PASSWORD)
auth.username=qaUser
auth.password=${AUTH_PASSWORD}

# SSH configuration for batch.qa2.reyl.fs.caws.local test
# ssh.keyFile can be overridden via environment variable SSH_KEYFILE if needed
ssh.host=batch.qa2.reyl.fs.caws.local
ssh.port=22
ssh.user=ec2-user
ssh.keyFile=/Users/konrad.dynowski/IdeaProjects/jsFramework/config/PRJ-ISP-Key.ppk
```

You can change these values as needed for your environment.

> Note: The key file itself should **not** be committed to git. Place it locally under `config/` or another secure path, and point `ssh.keyFile` (or `SSH_KEYFILE` ENV) to it.

## UI Phase 3: Admin login (Playwright)

A Phase 3 UI smoke test is implemented using Playwright and the Page Object Model to validate admin login into the NetReveal UI.

### Feature

`features/ui/admin-login.feature`:

```gherkin
@ui @phase3
Feature: Admin UI login
  As an authenticated admin user
  I want to log into the admin UI
  So that I can access the shell header

  Scenario: Admin can log in successfully
    Given I am on the login page
    When I log in as an "admin" admin user with password "password"
    Then I should see the admin shell header
```

### Steps and capabilities

- Step definitions: `src/steps/uiSteps.js`
  - Use the `AdminAuthCapability` to drive login and shell/header checks.
- Capability: `src/capabilities/adminAuthCapability.js`
  - Composes:
    - `LoginPage` (`src/ui/pages/LoginPage.js`) for username/password/submit interactions.
    - `ShellHeaderPage` (`src/ui/pages/ShellHeaderPage.js`) for user-menu presence and logout.
- Browser lifecycle and navigation: `src/ui/browserManager.js`
  - Launches Playwright (`chromium` by default).
  - Navigates to the login URL based on config (`ui.basePath` / `ui.baseUrl`).

### Configuration for UI

UI-related config lives in `config/default.properties`:

```properties
# UI (Phase 3)
ui.basePath=/netreveal/loginPerform.do
ui.baseUrl=https://ui-lb.${application.environment}.reyl.fs.caws.local:${application.port}${ui.basePath}
ui.browser=chromium
ui.headless=true
```

At runtime, `application.environment` is driven by `APPLICATION_ENVIRONMENT` in the shell, and `application.port` by the properties file. If `ui.baseUrl` still contains `${...}` placeholders, the browser manager will reconstruct the URL from these values.

### Running the Phase 3 UI scenario

Example local run for QA2 admin login:

```bash
export APPLICATION_ENVIRONMENT=qa2

# Install dependencies (including Playwright) if not already done
npm install
npm install --save-dev playwright
npx playwright install

# Run only Phase 3 UI scenarios
npx cucumber-js --tags "@ui and @phase3"
```

This will:

- Use `config/default.properties` as baseline.
- Resolve `application.environment` to `qa2` via `APPLICATION_ENVIRONMENT`.
- Navigate to `https://ui-lb.qa2.reyl.fs.caws.local:24200/netreveal/loginPerform.do`.
- Fill in the admin username and password fields using the POM.
- Assert that the user menu dropdown (`#menu_0`) is present post-login.

### How to expand UI coverage

To add more UI tests (e.g. logout, change password, home page navigation) while keeping the architecture consistent:

1. **Add new feature scenarios under `features/ui/`**
   - Example: `features/ui/admin-logout.feature`:

     ```gherkin
     @ui @phase3 @logout @smoke
     Feature: Admin logout
       Scenario: Admin can log out and return to login page
         Given I am on the login page
         When I log in as an "admin" admin user with password "password"
         And I log out from the application
         Then I should see the login page again
     ```

2. **Reuse existing steps where possible**
   - The login step phrase is reusable across features.
   - For logout and post-logout assertions, add new step definitions to `src/steps/uiSteps.js`:

     ```js
     When('I log out from the application', async function () {
       await this.adminAuth.shellHeaderPage.logout();
     });

     Then('I should see the login page again', async function () {
       // Implement a LoginPage assertion for login screen visibility
     });
     ```

   - Keep step phrases business-readable (no selectors or technical detail in Gherkin).

3. **Extend Page Objects and capabilities, not steps, for new interactions**
   - When you need new UI interactions (e.g. open Home Page, Change Password):
     - Add methods to `ShellHeaderPage` (e.g. `openHomePage()`, `openChangePassword()`) using the relevant link IDs (`home_page`, `change_password`).
     - Add corresponding convenience methods in `AdminAuthCapability` (e.g. `goToHomePage()`).
   - Steps should call these capability methods, not Playwright directly.

4. **Use tags to control execution**
   - Tag new scenarios with:
     - `@ui` – all UI tests.
     - `@phase3` – Phase 3 scope.
     - Domain tags like `@logout`, `@home`, `@password` for filtering.
     - `@smoke` for fast, high-value checks suitable for CI.
   - Example Jenkins run for UI smoke tests:

     ```bash
     export APPLICATION_ENVIRONMENT=qa2

     npx cucumber-js --tags "@ui and @smoke"
     ```

5. **Keep configuration environment-driven**
   - Do not hardcode hostnames or ports in features or steps.
   - Use `APPLICATION_ENVIRONMENT` and properties (`application.environment`, `application.port`, `ui.basePath`) to derive URLs.
   - Store credentials and other secrets in environment variables or secure configuration, not in `.feature` files.

6. **Leverage logging and screenshots for debugging**
   - Each scenario uses a per-scenario logger (`reports/logs/*.log`) that tees to console and file.
   - On UI failures, screenshots are captured in `reports/screenshots/`.
   - Use these to debug selector issues or environment misconfigurations before changing feature files.

---

## SSH batch status feature

A simple BDD feature is provided to verify a batch service over SSH.

### Feature file

`features/ssh/batch-status.feature`:

```gherkin
@SSH @SMOKE @BATCH
Feature: Batch service status over SSH

  Background:
    Given I have SSH configuration for the batch QA host

  Scenario: Batch service is ACTIVE on batch.qa2.reyl.fs.caws.local
    When I execute "sudo systemctl status $BATCH_SERVICE_NAME" over SSH
    Then the batch service status output should contain "ACTIVE"
```

This scenario:

- Connects to the QA batch host via SSH.
- Executes `sudo systemctl status $BATCH_SERVICE_NAME` on the remote VM.
- Expects the output to contain `ACTIVE`.

The service name is defined on the VM (via `$BATCH_SERVICE_NAME`); the framework does **not** resolve it locally.

### Step definitions

`src/steps/sshSteps.js` implements the steps using the SSH capability:

- Reads SSH config from `src/config` / `config/qa.properties`.
- Uses `src/capabilities/sshClient.js` (ssh2-based) to run the command.
- Logs stdout, stderr, and exit code to the console.

## Running locally

### Print resolved configuration

To check configuration resolution for a given environment:

```bash
APPLICATION_ENVIRONMENT=QA1 npm run config:print
```

This prints key values (e.g. `application.environment`, `app.baseUrl`, `db.host`, `ssh.host`).

### Run SSH batch-status feature

Example local run for QA:

```bash
export APPLICATION_ENVIRONMENT=QA1
export SSH_KEYFILE=/Users/konrad.dynowski/IdeaProjects/jsFramework/config/PRJ-ISP-Key.ppk

npm run test:e2e -- --tags "@SSH"
```

This will:

- Use `config/default.properties` as baseline.
- Resolve `application.environment` to `QA1` via `APPLICATION_ENVIRONMENT`.
- Connect to the configured SSH host as `ec2-user` using the private key.
- Execute `sudo systemctl status $BATCH_SERVICE_NAME` on the VM.
- Check that the output contains `ACTIVE`.

### Example: BEAST QA1 UI tests

For BEAST-style QA1 UI scenarios tagged with `@ENV_QA`, use:

```bash
export APPLICATION_ENVIRONMENT=QA1

npx cucumber-js --tags "@ENV_QA"
```

Here:

- `APPLICATION_ENVIRONMENT=QA1` sets the logical environment.
- The loader maps it to `application.environment` in config.
- Hostnames/topics that depend on `application.environment` can be resolved in capabilities.

## Jenkins setup (bash job)

Below is an example of how to set up a Jenkins Freestyle job (using a bash build step) to run the SSH batch-status feature.

### Example Jenkins bash step

```bash
#!/usr/bin/env bash
set -euo pipefail

# Navigate to workspace (Jenkins sets $WORKSPACE)
cd "$WORKSPACE/jsFramework"

# Install dependencies (CI-friendly)
npm install

# Set environment
export APPLICATION_ENVIRONMENT=QA1

# Point to the SSH key file (ensure the key is present on the Jenkins agent)
export SSH_KEYFILE="$WORKSPACE/jsFramework/config/PRJ-ISP-Key.ppk"

# Optionally set other ENV variables (e.g. AUTH_PASSWORD, DB_PASSWORD, USERDATA_* ) if needed
# export AUTH_PASSWORD="dummy-password"
# export DB_PASSWORD="dummy-db-password"

# Run only SSH-tagged scenarios
npm run test:e2e -- --tags "@SSH"
```

Notes:

- Ensure the SSH key file (`PRJ-ISP-Key.ppk` or its OpenSSH equivalent) is available on the Jenkins agent and **not** stored in source control.
- Adjust `ssh.host`, `ssh.user`, and `ssh.keyFile` in `config/default.properties` or other properties files as needed for your environment.
- You can add more SSH scenarios under `features/ssh/` and tag them with `@SSH` for selective execution.

## Editing configuration and features

- To change SSH host/user/key:
  - Edit the relevant properties file (e.g. `config/default.properties`) (`ssh.host`, `ssh.port`, `ssh.user`, `ssh.keyFile`).
- To change the command or expected status:
  - Edit `features/ssh/batch-status.feature`:
    - Update the `When I execute "..." over SSH` line.
    - Update the expected text in `Then the batch service status output should contain "..."`.
- To add new SSH tests:
  - Create additional feature files under `features/ssh/`.
  - Implement corresponding steps in `src/steps/sshSteps.js` or new step files under `src/steps/`.

This README should give you a quick reference for running and editing the SSH batch-status check locally and in Jenkins, and for using `APPLICATION_ENVIRONMENT` to drive BEAST-style environments.
