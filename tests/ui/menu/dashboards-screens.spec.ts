/**
 * @plan specs/uniqa-admin-menu-screens.md §4
 * @seed tests/seed.spec.ts
 */
import { defineMenuSmokeSuite } from './menuTestUtils';
import { DASHBOARD_LEAVES } from './menuInventory';

defineMenuSmokeSuite('Menu smoke — Dashboards screens', DASHBOARD_LEAVES);
