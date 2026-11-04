import fs from 'fs';
import path from 'path';

/**
 * UI test customers on UNIQA QA (specs/uniqa-jira-69-72.md). Expected values come from
 * test-data/uniqa/ui-customers.json — never from literals in a spec.
 */
type UiCustomer = { customerId: string; legalEntityType: string };

export const uiCustomers = JSON.parse(
  fs.readFileSync(path.resolve(process.cwd(), 'test-data/uniqa/ui-customers.json'), 'utf8'),
) as Record<'corporate' | 'personal', UiCustomer>;
