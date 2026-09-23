/**
 * DEBUG: Inspect Groups administration to understand actual group names and structure.
 */
import { test } from '../../fixtures';
import { resolveBaseUrl } from '../../../src/ui/browserManager';

test.describe('DEBUG: Groups administration inspection', () => {
  test('Inspect Groups list and print group names', async ({ page, mainMenu }) => {
    await page.goto(resolveBaseUrl(), { waitUntil: 'domcontentloaded' });
    await mainMenu.assertNotOnLoginPage();

    // Navigate to Groups
    const groupsLeafId = 'home_administration_home_administration_authentication_base_grouplist_caption';
    try {
      await mainMenu.openLeaf(groupsLeafId, 'Groups');
    } catch (e) {
      console.error('Failed to open Groups:', e);
      throw e;
    }

    // Wait for page to load
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'test-results/groups-page.png' });

    // Try to find any text that looks like a group
    const allText = await page.textContent('body');
    console.log('=== PAGE TEXT CONTENT (first 2000 chars) ===');
    console.log(allText?.substring(0, 2000));
    console.log('\n=== LOOKING FOR "CDD" OR "Investigation" ===');
    const hasCDD = allText?.includes('CDD');
    const hasInvestigation = allText?.includes('Investigation');
    const hasSupervision = allText?.includes('Supervision');
    console.log(`Contains "CDD": ${hasCDD}`);
    console.log(`Contains "Investigation": ${hasInvestigation}`);
    console.log(`Contains "Supervision": ${hasSupervision}`);

    // Try to extract group names from a table/grid
    const rows = page.locator('tbody tr, [role="row"]');
    const rowCount = await rows.count();
    console.log(`\n=== Found ${rowCount} rows ===`);
    for (let i = 0; i < Math.min(rowCount, 10); i++) {
      const row = rows.nth(i);
      const text = await row.textContent();
      console.log(`Row ${i}: ${text?.substring(0, 100)}`);
    }

    // Try to find visible group names via getByText with partial match
    const cddElements = page.getByText(/cdd/i);
    const cddCount = await cddElements.count();
    console.log(`\n=== Found ${cddCount} elements with "CDD" ===`);
    for (let i = 0; i < Math.min(cddCount, 20); i++) {
      const text = await cddElements.nth(i).textContent();
      console.log(`CDD element ${i}: ${text}`);
    }

    // Check for OU-specific group names
    console.log(`\n=== Checking for OU-specific names (Austria, Hungary, etc.) ===`);
    const ouNames = ['Austria', 'Hungary', 'Ukraine', 'Bulgaria', 'Bosnia', 'Croatia', 'Poland', 'Montenegro', 'Serbia', 'Shared'];
    for (const ou of ouNames) {
      const ouElement = page.getByText(new RegExp(ou, 'i'));
      const ouCount = await ouElement.count();
      if (ouCount > 0) {
        const text = await ouElement.first().textContent();
        console.log(`Found "${ou}": ${text?.substring(0, 100)}`);
      }
    }
  });
});
